import {readEligibleAccountFoundation} from './account-foundation.js';
const INTERNAL='/api/v2/feedback/internal',BASE='/api/v2/feedback';
const encoder=new TextEncoder();
class FeedbackError extends Error{constructor(status,code){super(code);this.status=status;this.code=code}}
const fail=(status,code)=>{throw new FeedbackError(status,code)};
const response=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','vary':'*','x-content-type-options':'nosniff'}});
const sha=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?encoder.encode(value):value))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function boundedFeedbackJson(request,max=32768){
 const reader=request.body?.getReader();if(!reader)fail(400,'INVALID_INPUT');let size=0;const chunks=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max)fail(413,'INPUT_TOO_LARGE');chunks.push(value)}
 const data=new Uint8Array(size);let offset=0;for(const part of chunks){data.set(part,offset);offset+=part.length}return{bytes:data,value:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data))};
 }catch(error){if(error instanceof FeedbackError)throw error;fail(400,'INVALID_INPUT')}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}
const string=(value,max,min=0)=>{if(typeof value!=='string'||value.trim().length<min||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(400,'INVALID_INPUT');return value.trim()};
const identifier=value=>{const text=string(value,80);if(text&&!/^[a-zA-Z0-9._-]+$/.test(text))fail(400,'INVALID_INPUT');return text};
const searchable=value=>value.normalize('NFKC').toLocaleLowerCase('ru');
const object=value=>{if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'INVALID_INPUT');return value};
export function validateFeedbackInput(value){
 object(value);if(Object.keys(value).some(x=>!['kind','type','body','publicName','rating','courseId','consent','context','requestKey','version'].includes(x)))fail(400,'INVALID_INPUT');
 const kind=value.kind;if(!['message','review'].includes(kind))fail(400,'INVALID_INPUT');
 const type=kind==='review'?'review':value.type;if(!['bug','material','idea','impression','review'].includes(type)||kind==='message'&&type==='review')fail(400,'INVALID_INPUT');
 const context={};for(const [key,item] of Object.entries(object(value.context||{}))){if(!['courseId','lessonId','practicumId','templateId','uiLocale','version'].includes(key))fail(400,'INVALID_CONTEXT');context[key]=identifier(item)}
 const rating=value.rating??null;if(rating!==null&&(!Number.isInteger(rating)||rating<1||rating>5))fail(400,'INVALID_INPUT');
 if(value.consent!==undefined&&typeof value.consent!=='boolean')fail(400,'INVALID_INPUT');
 return{kind,type,body:string(value.body,4000,10),publicName:kind==='review'?string(value.publicName,80,1):'',rating:kind==='review'?rating:null,courseId:identifier(value.courseId||''),consent:kind==='review'&&value.consent===true,context};
}
const query=(db,sql,...values)=>db.prepare(sql).bind(...values);
const rows=async statement=>(await statement.all()).results||[];
const joined=`SELECT i.*, r.body, r.public_name, r.rating, r.course_id, r.consent, r.context_json FROM feedback_items i JOIN feedback_revisions r ON r.item_id=i.id AND r.revision=i.current_revision`;
const authorDto=row=>({id:row.id,kind:row.kind,type:row.type,revision:row.current_revision,version:row.version,status:row.status,featured:!!row.featured,body:row.body,publicName:row.public_name,rating:row.rating,courseId:row.course_id,consent:row.status!=='withdrawn'&&!!row.consent,context:JSON.parse(row.context_json),createdAt:row.created_at,updatedAt:row.updated_at});
async function item(db,id){return query(db,joined+' WHERE i.id=?1',id).first()}
async function rate(db,accountId){const result=await query(db,`INSERT INTO feedback_rate_limits(account_id,bucket,used) VALUES(?1,?2,1) ON CONFLICT(account_id,bucket) DO UPDATE SET used=used+1 WHERE used<20`,accountId,Math.floor(Date.now()/3600000)).run();if(result.meta.changes!==1)fail(429,'RATE_LIMITED')}
function event(db,id,revision,actor,action,reason,stamp){return query(db,`INSERT INTO feedback_events(id,item_id,revision,actor_id,action,reason,created_at) SELECT ?1,?2,?3,?4,?5,?6,?7 WHERE changes()=1`,crypto.randomUUID(),id,revision,actor,action,reason,stamp)}
async function publicReviews(db,params){
 const course=identifier(params.get('course')||''),featured=params.get('featured')==='1',limit=Math.min(20,Math.max(1,Number(params.get('limit'))||20)),offset=Math.min(10000,Math.max(0,Number(params.get('offset'))||0));
 const where=` WHERE i.kind='review' AND i.status='approved' AND r.consent=1 AND a.status='active' AND (?1='' OR r.course_id=?1) AND (?2=0 OR i.featured=1)`;
 const from=` FROM feedback_items i JOIN feedback_revisions r ON r.item_id=i.id AND r.revision=i.current_revision JOIN account_subjects a ON a.id=i.author_id`;
 const totals=await query(db,'SELECT COUNT(*) AS count,COUNT(r.rating) AS ratings,AVG(r.rating) AS average'+from+where,course,featured?1:0).first();
 const list=await rows(query(db,'SELECT i.id,r.body,r.public_name,r.rating,r.course_id,i.updated_at'+from+where+' ORDER BY i.updated_at DESC,i.id LIMIT ?3 OFFSET ?4',course,featured?1:0,Math.floor(limit),Math.floor(offset)));
 return{reviews:list.map(r=>({id:r.id,body:r.body,publicName:r.public_name,rating:r.rating,courseId:r.course_id,publishedAt:r.updated_at})),total:totals.count,ratings:totals.ratings,average:totals.average};
}
async function verifyEnvelope(request,env){
 if(typeof env.FEEDBACK_SERVICE_KEY!=='string'||env.FEEDBACK_SERVICE_KEY.length<32)fail(404,'FEEDBACK_UNAVAILABLE');
 if(request.method!=='POST'||request.headers.has('authorization')||request.headers.has('cookie')||request.headers.get('content-type')!=='application/json'||new URL(request.url).search)fail(401,'SERVICE_DENIED');
 const stamp=request.headers.get('x-nexus-service-timestamp'),nonce=request.headers.get('x-nexus-service-nonce'),signature=request.headers.get('x-nexus-service-signature');
 if(!/^\d{13}$/.test(stamp||'')||!/^[a-f0-9]{32}$/.test(nonce||'')||!/^[a-f0-9]{64}$/.test(signature||'')||Math.abs(Date.now()-Number(stamp))>30000)fail(401,'SERVICE_DENIED');
 const {bytes,value}=await boundedFeedbackJson(request),key=await crypto.subtle.importKey('raw',encoder.encode(env.FEEDBACK_SERVICE_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const canonical=`v1\nPOST\n${INTERNAL}\n${stamp}\n${nonce}\n${await sha(bytes)}`;
 if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g),x=>parseInt(x,16)),encoder.encode(canonical)))fail(401,'SERVICE_DENIED');
 object(value);const envelopeKeys=Object.keys(value).sort().join(','),hasExpectation=envelopeKeys==='expectedAccountId,method,path,payload,sessionHash';
 if(!(hasExpectation||envelopeKeys==='method,path,payload,sessionHash'&&env.FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED!=='true')||hasExpectation&&(typeof value.expectedAccountId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value.expectedAccountId))||!/^[a-f0-9]{64}$/.test(value.sessionHash||'')||!['GET','POST','PATCH'].includes(value.method)||typeof value.path!=='string'||!value.path.startsWith(BASE+'/')||value.path.length>512)fail(401,'SERVICE_DENIED');
 const added=await query(env.DB,'INSERT OR IGNORE INTO feedback_service_nonces(nonce,expires_at) VALUES(?1,?2)',nonce,new Date(Number(stamp)+30000).toISOString()).run();if(added.meta.changes!==1)fail(401,'SERVICE_DENIED');
 await query(env.DB,'DELETE FROM feedback_service_nonces WHERE expires_at<?1',new Date().toISOString()).run();
 const foundation=await readEligibleAccountFoundation(env.DB,value.sessionHash);if(!foundation)fail(401,'SESSION_REQUIRED');
 // Ожидание клиента не авторизует actor: actor всегда выводится из сессии.
 if(hasExpectation&&foundation.account.accountId!==value.expectedAccountId)fail(401,'SESSION_REQUIRED');
 return{...value,actor:foundation.account};
}
export async function feedbackOperation(db,{method,path,payload,actor}){
 const url=new URL(path,'https://nexus.invalid'),pathname=url.pathname;
 const permission=await query(db,'SELECT can_moderate FROM feedback_permissions WHERE account_id=?1',actor.accountId).first(),moderator=permission?.can_moderate===1;
 if(pathname===BASE+'/me'&&method==='GET'){
  const limit=Math.min(20,Math.max(1,Math.floor(Number(url.searchParams.get('limit'))||20))),offset=Math.min(10000,Math.max(0,Math.floor(Number(url.searchParams.get('offset'))||0)));
  const total=await query(db,'SELECT count(*) AS count FROM feedback_items WHERE author_id=?1',actor.accountId).first();
  return{account:{id:actor.accountId,displayName:actor.displayName},canModerate:moderator,total:total.count,offset,items:(await rows(query(db,joined+' WHERE i.author_id=?1 ORDER BY i.created_at DESC,i.id LIMIT ?2 OFFSET ?3',actor.accountId,limit,offset))).map(authorDto)};
 }
 if(pathname===BASE+'/items'&&method==='POST'){
  const input=validateFeedbackInput(payload),requestKey=string(payload.requestKey,80,10);if(!/^[a-zA-Z0-9-]+$/.test(requestKey))fail(400,'INVALID_INPUT');const digest=await sha(JSON.stringify(input));
  const duplicate=await query(db,joined+' WHERE i.author_id=?1 AND i.request_key=?2',actor.accountId,requestKey).first();if(duplicate){if(duplicate.request_hash!==digest)fail(409,'REQUEST_CONFLICT');return{item:authorDto(duplicate)}}
  await rate(db,actor.accountId);const id=crypto.randomUUID(),stamp=new Date().toISOString(),status=input.kind==='review'?'pending':'submitted';
  const insert=query(db,`INSERT INTO feedback_items(id,author_id,kind,type,status,request_key,request_hash,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?8)`,id,actor.accountId,input.kind,input.type,status,requestKey,digest,stamp);
  const revision=query(db,`INSERT INTO feedback_revisions(item_id,revision,body,public_name,rating,course_id,consent,context_json,created_at,search_text) VALUES(?1,1,?2,?3,?4,?5,?6,?7,?8,?9)`,id,input.body,input.publicName,input.rating,input.courseId,+input.consent,JSON.stringify(input.context),stamp,searchable(input.body));
  try{await db.batch([insert,revision,event(db,id,1,actor.accountId,'submitted','',stamp)])}catch(error){const retry=await query(db,joined+' WHERE i.author_id=?1 AND i.request_key=?2',actor.accountId,requestKey).first();if(retry&&retry.request_hash===digest)return{item:authorDto(retry)};throw error}
  return{item:authorDto(await item(db,id))};
 }
 const match=pathname.match(/^\/api\/v2\/feedback\/items\/([a-zA-Z0-9-]+)(?:\/(withdraw|moderate))?$/);
 if(match&&method==='PATCH'){
  object(payload);if(match[2]==='moderate'&&!moderator)fail(403,'MODERATOR_REQUIRED');const current=await item(db,match[1]);if(!current||match[2]!=='moderate'&&current.author_id!==actor.accountId)fail(404,'NOT_FOUND');if(!Number.isInteger(payload.version)||payload.version!==current.version)fail(409,'STALE_VERSION');
  const stamp=new Date().toISOString();let result;
  if(match[2]==='moderate'){
   if(!moderator)fail(403,'MODERATOR_REQUIRED');if(Object.keys(payload).some(x=>!['version','revision','action','reason','status'].includes(x))||payload.revision!==current.current_revision)fail(409,'STALE_REVISION');
   const reason=string(payload.reason||'',1000),action=payload.action;let status=current.status,featured=current.featured;
   if(action==='approve'&&current.kind==='review'&&current.status==='pending'&&current.consent){status='approved';featured=0}
   else if(action==='reject'&&current.kind==='review'&&current.status==='pending'&&reason){status='rejected';featured=0}
   else if(action==='remove'&&current.kind==='review'&&current.status==='approved'&&reason){status='rejected';featured=0}
   else if(['feature','unfeature'].includes(action)&&current.kind==='review'&&current.status==='approved'&&current.consent){featured=action==='feature'?1:0}
   else if(action==='triage'&&current.kind==='message'&&['triaged','in-progress','resolved'].includes(payload.status)){status=payload.status}
   else fail(409,'INVALID_TRANSITION');
   result=await db.batch([query(db,`UPDATE feedback_items SET status=?1,featured=?2,version=version+1,updated_at=?3 WHERE id=?4 AND version=?5 AND current_revision=?6`,status,featured,stamp,current.id,payload.version,payload.revision),event(db,current.id,current.current_revision,actor.accountId,action,reason,stamp)]);
  }else{
   if(current.author_id!==actor.accountId)fail(404,'NOT_FOUND');
   if(match[2]==='withdraw'){
    if(current.kind!=='review')fail(409,'INVALID_TRANSITION');result=await db.batch([query(db,`UPDATE feedback_items SET status='withdrawn',featured=0,version=version+1,updated_at=?1 WHERE id=?2 AND version=?3`,stamp,current.id,payload.version),event(db,current.id,current.current_revision,actor.accountId,'withdrawn','',stamp)]);
   }else{
    const input=validateFeedbackInput(payload);if(input.kind!==current.kind)fail(400,'INVALID_INPUT');await rate(db,actor.accountId);const revision=current.current_revision+1;
    result=await db.batch([query(db,`UPDATE feedback_items SET current_revision=?1,type=?2,status=?3,featured=0,version=version+1,updated_at=?4 WHERE id=?5 AND version=?6`,revision,input.type,input.kind==='review'?'pending':'submitted',stamp,current.id,payload.version),query(db,`INSERT INTO feedback_revisions(item_id,revision,body,public_name,rating,course_id,consent,context_json,created_at,search_text) SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10 WHERE changes()=1`,current.id,revision,input.body,input.publicName,input.rating,input.courseId,+input.consent,JSON.stringify(input.context),stamp,searchable(input.body)),event(db,current.id,revision,actor.accountId,'revised','',stamp)]);
   }
  }
  if(result[0].meta.changes!==1)fail(409,'STALE_VERSION');return{item:authorDto(await item(db,current.id))};
 }
 if(pathname===BASE+'/moderation'&&method==='GET'){
  if(!moderator)fail(403,'MODERATOR_REQUIRED');const kind=url.searchParams.get('kind')||'',status=url.searchParams.get('status')||'',course=identifier(url.searchParams.get('course')||'');
  const from=string(url.searchParams.get('from')||'',10),to=string(url.searchParams.get('to')||'',10),search=searchable(string(url.searchParams.get('search')||'',100)),offset=Math.min(10000,Math.max(0,Math.floor(Number(url.searchParams.get('offset'))||0)));
  if([from,to].some(x=>x&&!/^\d{4}-\d{2}-\d{2}$/.test(x)))fail(400,'INVALID_INPUT');
  const where=` WHERE (?1='' OR i.kind=?1) AND (?2='' OR i.status=?2) AND (?3='' OR r.course_id=?3) AND (?4='' OR substr(i.created_at,1,10)>=?4) AND (?5='' OR substr(i.created_at,1,10)<=?5) AND (?6='' OR instr(r.search_text,?6)>0)`;
  const list=await rows(query(db,joined.replace('SELECT i.*','SELECT a.display_name AS author_name,i.*')+' LEFT JOIN account_subjects a ON a.id=i.author_id'+where+' ORDER BY i.created_at DESC,i.id LIMIT 20 OFFSET ?7',kind,status,course,from,to,search,offset));
  const total=await query(db,'SELECT count(*) AS count FROM feedback_items i JOIN feedback_revisions r ON r.item_id=i.id AND r.revision=i.current_revision'+where,kind,status,course,from,to,search).first();
  return{items:list.map(r=>({...authorDto(r),authorId:r.author_id,authorName:r.author_name||''})),total:total.count,offset};
 }
 const events=pathname.match(/^\/api\/v2\/feedback\/items\/([a-zA-Z0-9-]+)\/events$/);
 if(events&&method==='GET'){const current=await item(db,events[1]);if(!current||!moderator&&current.author_id!==actor.accountId)fail(404,'NOT_FOUND');const list=await rows(query(db,'SELECT revision,actor_id,action,reason,created_at FROM feedback_events WHERE item_id=?1 ORDER BY created_at,id',current.id));return{events:list.map(r=>({revision:r.revision,action:r.action,reason:r.reason,createdAt:r.created_at,...(moderator?{actorId:r.actor_id}:{})}))}}
 fail(404,'NOT_FOUND');
}
export async function handleFeedbackRequest(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith(BASE+'/'))return null;
 try{if(env.FEEDBACK_ENABLED!=='true'||!env.DB)fail(503,'FEEDBACK_UNAVAILABLE');
  if(url.pathname===BASE+'/reviews'&&request.method==='GET')return response(await publicReviews(env.DB,url.searchParams));
  if(url.pathname!==INTERNAL)fail(404,'NOT_FOUND');
  const envelope=await verifyEnvelope(request,env);return response(await feedbackOperation(env.DB,envelope));
 }catch(error){return response({error:{code:error instanceof FeedbackError?error.code:'FEEDBACK_UNAVAILABLE'}},error instanceof FeedbackError?error.status:503)}
}
