// Только синтетическая SQLite и in-memory req/res/fetch. Сеть и listen() отсутствуют.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {Readable} from 'node:stream';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {createFeedbackHandler} from './bff/feedback.mjs';
import {handleFeedbackRequest} from './worker/feedback-service.js';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from './bff/account-read.mjs';

const db=new DatabaseSync(':memory:');
for(const path of ['../cloudflare/nexus-sync-worker/migrations/0001_sync_team_foundation.sql','../cloudflare/nexus-sync-worker/migrations/0002_nexus_account_tokens.sql','../cloudflare/nexus-sync-worker/migrations/0003_d1_only_project_snapshots.sql','../cloudflare/nexus-sync-worker/migrations/0004_identity_v2_session_foundation.sql','./migrations/0005_login_methods_registry.sql','./migrations/0006_account_lifecycle_hardening.sql','./migrations/0007_identity_owner_and_issuance_guards.sql','./migrations/0008_account_service_nonces.sql','./migrations/0010_feedback.sql'])db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
let feedbackReads=0,feedbackWrites=0;
const d1={prepare(sql){if(/(?:FROM|JOIN) feedback_(?!service_nonces)/i.test(sql))feedbackReads++;
  if(/(?:INSERT(?: OR IGNORE)? INTO|UPDATE|DELETE FROM) feedback_(?!service_nonces)/i.test(sql))feedbackWrites++;
  return {bind(...values){return {async first(){return db.prepare(sql).get(...values)||null},async all(){return {success:true,results:db.prepare(sql).all(...values)}},async run(){return this._run()},_run(){const r=db.prepare(sql).run(...values);return {success:true,meta:{changes:Number(r.changes)}}}}}}},
  async batch(statements){db.exec('BEGIN');try{const results=statements.map(s=>s._run());db.exec('COMMIT');return results}catch(error){db.exec('ROLLBACK');throw error}}};
const key='SYNTHETIC_FEEDBACK_SERVICE_KEY_NEVER_DEPLOY_20261019',INTERNAL='/api/v2/feedback/internal';
const sessions={a:'nxs_'+'A'.repeat(43),b:'nxs_'+'B'.repeat(43)};
const hash=value=>createHash('sha256').update(value).digest('hex');
const start=new Date(Date.now()-60000).toISOString(),future=new Date(Date.now()+3600000).toISOString();
for(const [id,secret] of Object.entries(sessions)){
  db.prepare("INSERT INTO account_subjects(id,display_name,status,created_at,updated_at) VALUES(?,?,'active',?,?)").run(id,'Synthetic '+id,start,start);
  db.prepare("INSERT INTO account_devices(id,subject_id,status,first_seen_at,last_seen_at) VALUES(?,?,'active',?,?)").run('device-'+id,id,start,start);
  db.prepare("INSERT INTO login_methods(id,account_id,kind,status,created_at) VALUES(?,?,'passkey','active',?)").run('method-'+id,id,start);
  db.prepare("INSERT INTO account_sessions(id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES(?,?,?,?,'active','account-method-v1',?,?,?,?)").run('session-'+id,id,'device-'+id,hash(secret),start,start,future,future);
  db.prepare('INSERT INTO session_login_methods(session_id,login_method_id,account_id,created_at) VALUES(?,?,?,?)').run('session-'+id,'method-'+id,id,start);
  db.prepare('INSERT INTO feedback_permissions(account_id,can_moderate) VALUES(?,1)').run(id);
}
const env={FEEDBACK_ENABLED:'true',FEEDBACK_SERVICE_KEY:key,FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED:'true',DB:d1};
const bffEnv={FEEDBACK_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',FEEDBACK_SERVICE_KEY:key,FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED:'true'};
let fetches=0,checks=0;
const bridge=async(url,options)=>{fetches++;assert.equal(new Headers(options.headers).has('cookie'),false);assert.equal(new Headers(options.headers).has('authorization'),false);assert.equal(options.redirect,'error');
  const req=new Request(url,options);return handleFeedbackRequest(req,env)};
function request({path='/api/v2/feedback/me',method='GET',session=sessions.a,expected='a',payload,headers={},rawHeaders}={}){
  const context=Buffer.from(JSON.stringify({accountReadContract:'v1',sessionCookie:session})).toString('base64');
  const all={host:new URL(GATEWAY_ORIGIN).host,'x-yc-apigateway-operation-context':context,...(expected===undefined?{}:{'x-nexus-feedback-account':expected}),...(method==='GET'?{}:{origin:GATEWAY_ORIGIN,'content-type':'application/json','x-nexus-feedback-write':'1'}),...headers};
  const req=Readable.from([Buffer.from(payload===undefined?'':JSON.stringify(payload))]);return Object.assign(req,{url:path,method,headers:all,rawHeaders:rawHeaders||Object.entries(all).flat()});
}
function v2Request(options={}){
  const req=request(options),cookieHeader='__Host-nexus_session='+(options.session||sessions.a)+'; __Host-nexus_oauth_flow=nof_'+'C'.repeat(43);
  req.headers.cookie=cookieHeader;req.headers['x-yc-apigateway-operation-context']=Buffer.from(JSON.stringify({accountReadContract:'v2',cookieHeader})).toString('base64');req.rawHeaders=Object.entries(req.headers).flat();return req;
}
async function run(req,{fetchImpl=bridge,...options}={}){const res={writeHead(status,headers){this.status=status;this.headers=headers},end(body){this.raw=String(body);this.body=JSON.parse(body)}};await createFeedbackHandler({env:bffEnv,fetchImpl,...options})(req,res);assert.equal(res.headers['cache-control'],'no-store');assert.equal(res.headers.vary,'*');for(const secret of [...Object.values(sessions),key])assert.equal(res.raw.includes(secret),false);return res}
const privateSnapshot=()=>JSON.stringify(['feedback_permissions','feedback_items','feedback_revisions','feedback_events','feedback_rate_limits'].map(table=>db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()));
const message={kind:'message',type:'idea',body:'Synthetic feedback message for account test.',context:{},requestKey:'synthetic-request-key-a'};
const review={kind:'review',publicName:'Synthetic',rating:5,consent:true,body:'Synthetic public review fixture.',context:{},requestKey:'synthetic-review-key-a'};
async function check(name,fn){await fn();checks++;console.log('PASS '+name)}
async function signed(value,{targetEnv=env,nonce=randomBytes(16).toString('hex'),signatureOverride,bodyOverride}={}){const body=bodyOverride||JSON.stringify(value),stamp=String(Date.now()),digest=hash(body),signature=signatureOverride||createHmac('sha256',key).update(`v1\nPOST\n${INTERNAL}\n${stamp}\n${nonce}\n${digest}`).digest('hex');return handleFeedbackRequest(new Request(WORKER_ORIGIN+INTERNAL,{method:'POST',body,headers:{'content-type':'application/json','x-nexus-service-timestamp':stamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature}}),targetEnv)}

await check('BFF требует единственное корректное account expectation до proxy',async()=>{
  const before=fetches;
  for(const expected of [null,'','a,b','x'.repeat(161),'../a'])assert.equal((await run(request({expected}))).status,401);
  const missing=request();delete missing.headers['x-nexus-feedback-account'];missing.rawHeaders=Object.entries(missing.headers).flat();assert.equal((await run(missing)).status,401);
  const duplicate=request();duplicate.rawHeaders.push('X-Nexus-Feedback-Account','a');assert.equal((await run(duplicate)).status,401);
  assert.equal(fetches,before);
});
await check('Staged BFF сохраняет Alpha3 envelope без header до cutover',async()=>{
  const options={env:{...bffEnv,FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED:'false'},fetchImpl:async(url,options)=>{
    const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body),['method','path','payload','sessionHash']);
    return handleFeedbackRequest(new Request(url,options),{...env,FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED:'false'});
  }};
  const old=request();delete old.headers['x-nexus-feedback-account'];old.rawHeaders=Object.entries(old.headers).flat();
  const result=await run(old,options);assert.equal(result.status,200);assert.equal(result.body.account.id,'a');
  const missingDefault=request();delete missingDefault.headers['x-nexus-feedback-account'];missingDefault.rawHeaders=Object.entries(missingDefault.headers).flat();
  const defaultEnv={...bffEnv};delete defaultEnv.FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED;
  assert.equal((await run(missingDefault,{...options,env:defaultEnv})).status,200);
});
await check('Staged BFF проверяет переданный header и mismatch даже при flag OFF',async()=>{
  const options={env:{...bffEnv,FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED:'false'},fetchImpl:async(url,options)=>{
    const body=JSON.parse(options.body);assert.equal(body.expectedAccountId,'a');
    return handleFeedbackRequest(new Request(url,options),{...env,FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED:'false'});
  }};
  assert.equal((await run(request({session:sessions.b,expected:'a'}),options)).status,401);
  for(const expected of [null,'','a,b'])assert.equal((await run(request({expected}),options)).status,401);
});
let item,reviewItem;
await check('Совпавший account/session создаёт отзыв под действительным actor',async()=>{
  let result=await run(request({path:'/api/v2/feedback/items',method:'POST',payload:message}));assert.equal(result.status,200);item=result.body.item;
  assert.equal(db.prepare('SELECT author_id FROM feedback_items WHERE id=?').get(item.id).author_id,'a');
  result=await run(request({path:'/api/v2/feedback/items',method:'POST',payload:review}));assert.equal(result.status,200);reviewItem=result.body.item;
  const me=await run(request());assert.equal(me.status,200);assert.equal(me.body.account.id,'a');assert.equal(me.body.items.length,2);
});
await check('Старая вкладка A с общей cookie B не читает private данные B',async()=>{
  const before=privateSnapshot(),reads=feedbackReads,writes=feedbackWrites;
  for(const path of ['/api/v2/feedback/me','/api/v2/feedback/moderation','/api/v2/feedback/items/'+item.id+'/events']){const result=await run(request({path,session:sessions.b,expected:'a'}));assert.equal(result.status,401);assert.deepEqual(result.body,{error:{code:'SESSION_REQUIRED'}});assert.equal(result.raw.includes('Synthetic b'),false)}
  assert.equal(privateSnapshot(),before);assert.equal(feedbackReads,reads);assert.equal(feedbackWrites,writes);
});
await check('Старая вкладка A с cookie B не создаёт, не редактирует и не модерирует',async()=>{
  const before=privateSnapshot(),reads=feedbackReads,writes=feedbackWrites;
  for(const [path,method,payload] of [['/api/v2/feedback/items','POST',{...message,requestKey:'must-not-insert-under-b'}],['/api/v2/feedback/items/'+item.id,'PATCH',{...message,version:1}],['/api/v2/feedback/items/'+reviewItem.id+'/withdraw','PATCH',{version:1}],['/api/v2/feedback/items/'+reviewItem.id+'/moderate','PATCH',{version:1,revision:1,action:'approve'}]])assert.equal((await run(request({path,method,payload,session:sessions.b,expected:'a'}))).status,401);
  assert.equal(privateSnapshot(),before);assert.equal(feedbackReads,reads);assert.equal(feedbackWrites,writes);
});
await check('Ожидание не выбирает actor: B с ожиданием B получает только B',async()=>{
  const me=await run(request({session:sessions.b,expected:'b'}));assert.equal(me.status,200);assert.equal(me.body.account.id,'b');assert.deepEqual(me.body.items,[]);
  const result=await run(request({path:'/api/v2/feedback/items',method:'POST',session:sessions.b,expected:'b',payload:{...message,requestKey:'synthetic-request-key-b'}}));assert.equal(result.status,200);assert.equal(db.prepare('SELECT author_id FROM feedback_items WHERE id=?').get(result.body.item.id).author_id,'b');
});
await check('Public reviews по-прежнему доступны без session/expectation',async()=>{
  const approved=await run(request({path:'/api/v2/feedback/items/'+reviewItem.id+'/moderate',method:'PATCH',payload:{version:1,revision:1,action:'approve'}}));assert.equal(approved.status,200);
  const req=request({path:'/api/v2/feedback/reviews?featured=0'});delete req.headers['x-nexus-feedback-account'];delete req.headers['x-yc-apigateway-operation-context'];req.rawHeaders=Object.entries(req.headers).flat();const result=await run(req);assert.equal(result.status,200);assert.equal(result.body.reviews.length,1);assert.equal(result.body.reviews[0].body,review.body);assert.equal('account' in result.body,false);
});
await check('Expected account входит в HMAC; неподписанная подмена отвергается',async()=>{
  const op={method:'GET',path:'/api/v2/feedback/me',payload:null,sessionHash:hash(sessions.b),expectedAccountId:'a'},before=privateSnapshot(),reads=feedbackReads;
  const result=await signed(op,{signatureOverride:'0'.repeat(64)});assert.equal(result.status,401);assert.equal((await result.json()).error.code,'SERVICE_DENIED');assert.equal(privateSnapshot(),before);assert.equal(feedbackReads,reads);
});
await check('Legacy envelope принимается только до явного cutover flag',async()=>{
  const old={method:'GET',path:'/api/v2/feedback/me',payload:null,sessionHash:hash(sessions.a)};
  let result=await signed(old);assert.equal(result.status,401);assert.equal((await result.json()).error.code,'SERVICE_DENIED');
  result=await signed(old,{targetEnv:{...env,FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED:'false'}});assert.equal(result.status,200);assert.equal((await result.json()).account.id,'a');
  result=await signed({...old,expectedAccountId:'b'},{targetEnv:{...env,FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED:'false'}});assert.equal(result.status,401);assert.equal((await result.json()).error.code,'SESSION_REQUIRED');
});
await check('Неизвестные/неверные envelope поля и replay не принимаются',async()=>{
  const op={method:'GET',path:'/api/v2/feedback/me',payload:null,sessionHash:hash(sessions.a),expectedAccountId:'a'};
  for(const value of [{...op,expectedAccountId:null},{...op,expectedAccountId:'a,b'},{...op,accountId:'a'}])assert.equal((await signed(value)).status,401);
  const nonce=randomBytes(16).toString('hex');assert.equal((await signed(op,{nonce})).status,200);assert.equal((await signed(op,{nonce})).status,401);
});
await check('Account expectation не заменяет active eligible session',async()=>{
  db.prepare("UPDATE account_sessions SET status='revoked',revoked_at=? WHERE id='session-b'").run(new Date().toISOString());
  const before=privateSnapshot(),reads=feedbackReads;const result=await run(request({session:sessions.b,expected:'b'}));assert.equal(result.status,401);assert.equal(privateSnapshot(),before);assert.equal(feedbackReads,reads);
});
await check('V2 raw Cookie context сохраняет verified actor и account expectation',async()=>{
  const me=await run(v2Request());assert.equal(me.status,200);assert.equal(me.body.account.id,'a');
  const before=privateSnapshot(),reads=feedbackReads;
  const mismatch=await run(v2Request({expected:'b'}));assert.equal(mismatch.status,401);assert.equal(privateSnapshot(),before);assert.equal(feedbackReads,reads);
});
await check('V2 private feedback отклоняет mismatch, missing raw и duplicate protected cookies до Worker',async()=>{
  const before=fetches;
  for(const kind of ['mismatch','missing-raw','duplicate-cookie','extra-context']){
    const req=v2Request(),cookieHeader=req.headers.cookie;
    if(kind==='mismatch')req.headers.cookie=cookieHeader.replace(sessions.a,sessions.b);
    if(kind==='missing-raw')delete req.headers.cookie;
    if(kind==='duplicate-cookie'){
      req.headers.cookie=cookieHeader+'; __Host-nexus_session='+sessions.a;
      req.headers['x-yc-apigateway-operation-context']=Buffer.from(JSON.stringify({accountReadContract:'v2',cookieHeader:req.headers.cookie})).toString('base64');
    }
    if(kind==='extra-context')req.headers['x-yc-apigateway-operation-context']=Buffer.from(JSON.stringify({accountReadContract:'v2',cookieHeader,extra:'forbidden'})).toString('base64');
    req.rawHeaders=Object.entries(req.headers).flat();const result=await run(req);assert.equal(result.status,401,kind);assert.deepEqual(result.body,{error:{code:'SESSION_REQUIRED'}});
  }
  assert.equal(fetches,before);
});
await check('V2 transport не продлевает expired session и не принимает неизвестный token',async()=>{
  const before=privateSnapshot(),reads=feedbackReads;
  db.prepare("UPDATE account_sessions SET idle_expires_at=? WHERE id='session-a'").run(new Date(Date.now()-10000).toISOString());
  try{assert.equal((await run(v2Request())).status,401);assert.equal((await run(v2Request({session:'nxs_'+'Z'.repeat(43)}))).status,401)}
  finally{db.prepare("UPDATE account_sessions SET idle_expires_at=? WHERE id='session-a'").run(future)}
  assert.equal(privateSnapshot(),before);assert.equal(feedbackReads,reads);
});
db.close();console.log(JSON.stringify({status:'PASS',checks,syntheticOnly:true,network:false,servers:false,browser:false,cutoverFlag:'FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED=true'}));
