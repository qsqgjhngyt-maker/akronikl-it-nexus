// Actual local Cloudflare workerd + D1 binding. No credentials, remote resources or outbound fetch.
import {Miniflare} from 'miniflare';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHmac,randomBytes,createHash} from 'node:crypto';
import {controlFixture} from '../tests/helpers/control-fixture.mjs';
import jpeg from 'jpeg-js';
import {sanitizeAvatar} from './avatar-codec.mjs';
const f=await controlFixture(),checks=[];let outbound=0,phase='start',failure,migrationFile;
const compatibilityDate=process.env.NEXUS_COMPATIBILITY_DATE||'2026-09-23';
if(compatibilityDate!=='2026-09-23')throw Error('PRODUCTION_COMPATIBILITY_DATE_REQUIRED');
const resultFile=process.env.NEXUS_WORKERD_RESULT||process.argv[2];
if(!resultFile)throw Error('WORKERD_RESULT_PATH_REQUIRED');
const mf=new Miniflare({modules:true,scriptPath:fileURLToPath(new URL('worker-bundle/entry.mjs',import.meta.url)),compatibilityDate,compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'synthetic-control-d1'},bindings:{PUBLIC_PASSKEY_REGISTRATION_ENABLED:'true',COMMUNITY_ENABLED:'true',CONTENT_ENABLED:'true',FEEDBACK_ENABLED:'true',FEEDBACK_SERVICE_KEY:'SYNTHETIC_WORKERD_FEEDBACK_SERVICE_KEY_ONLY',ADMIN_CONTROL_ENABLED:'true',ALPHA_ADMISSION_ENABLED:'true',ADMIN_PURGE_ENABLED:'true',ADMIN_SERVICE_KEY:f.env.ADMIN_SERVICE_KEY,PASSKEY_ENABLED:'true',PASSKEY_SERVICE_KEY:'SYNTHETIC_WORKERD_PASSKEY_SERVICE_KEY_ONLY',PASSKEY_ORIGIN:'https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net',PASSKEY_RP_ID:'d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net'},outboundService:()=>{outbound++;return new Response('OUTBOUND_FORBIDDEN',{status:503})}});
const check=async(name,fn)=>{phase=name;const start=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-start)});console.log('PASS '+name)};
async function call(path,options={}){
 const req=f.signed(path,options),response=await mf.dispatchFetch(req.url,{method:'POST',headers:req.headers,body:await req.text()});
 return {status:response.status,body:await response.json()};
}
let db,tables;
async function passkey(op,input={},flowHash='c'.repeat(64)){
 const path='/api/v2/account/internal/passkey',body=JSON.stringify({op,input,flowHash,sessionHash:null,networkHash:'d'.repeat(64)}),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
 const signature=createHmac('sha256','SYNTHETIC_WORKERD_PASSKEY_SERVICE_KEY_ONLY').update(['v1','POST',path,timestamp,nonce,createHash('sha256').update(body).digest('hex')].join('\n')).digest('hex');
 const r=await mf.dispatchFetch('https://synthetic.invalid'+path,{method:'POST',body,headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature}});
 return {status:r.status,body:await r.json()};
}
try{
 db=await mf.getD1Database('DB');
 const migrations=['0001_sync_team_foundation','0002_nexus_account_tokens','0003_d1_only_project_snapshots','0004_identity_v2_session_foundation'].map(n=>'../cloudflare/nexus-sync-worker/migrations/'+n+'.sql');
 migrations.push(...['0005_login_methods_registry','0006_account_lifecycle_hardening','0007_identity_owner_and_issuance_guards','0008_account_service_nonces','0009_passkeys','0010_feedback','0011_oauth_service','0012_alpha_administration','0013_account_avatars','0014_community_content'].map(n=>'migrations/'+n+'.sql'));
 await check('actual D1 applies all additive candidate migrations locally',async()=>{
  // D1Database.exec splits on newlines; preserve SQL statements/triggers in one source-only line.
  for(const name of migrations){
   migrationFile=name;
   const sql=(await readFile(new URL(name,import.meta.url),'utf8')).split(/\r?\n/).filter(line=>!line.trimStart().startsWith('--')).join(' ');
   await db.exec(sql);
  }
  for(const table of ['account_subjects','login_methods','nexus_passkey_users','nexus_passkey_credentials','account_devices','account_sessions','session_login_methods','nexus_admin_grants']){
   for(const row of f.db.prepare('SELECT * FROM '+table).all()){
    const keys=Object.keys(row);await db.prepare('INSERT INTO '+table+'('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').bind(...Object.values(row)).run();
   }
  }
  await db.exec('UPDATE nexus_alpha_settings SET enforced=1 WHERE id=1');
  tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.map(x=>x.name);
 });
 await check('workerd verifies actual HMAC/session/admin bindings and blocks replay',async()=>{
  const requestNonce=randomBytes(16).toString('hex');
  const good=await call('/api/v2/account/control/users',{nonce:requestNonce});if(good.status!==200)throw Object.assign(Error(),{code:good.body.error?.code});
  assertArray(good.body.users,1);
  if((await call('/api/v2/account/control/users',{nonce:requestNonce})).status!==401)throw Error('REPLAY_NOT_REJECTED');
 });
 let invitation;
 await check('actual D1 creates a hash-only invitation and counts its reserved place',async()=>{
  const result=await call('/api/v2/account/control/invites',{method:'POST',payload:{requestId:crypto.randomUUID(),ttlMinutes:60}});
  if(result.status!==200)throw Object.assign(Error(),{code:result.body.error?.code});
  invitation=result.body;
  const listed=await call('/api/v2/account/control/users');if(listed.body.counts.occupied!==1)throw Error('RESERVATION_MISSING');
 });
 await check('workerd avatar storage is account-bound and accepts BFF-normalized JPEG',async()=>{
  const pixels=Buffer.alloc(128*128*4,150),raw=jpeg.encode({data:pixels,width:128,height:128},80).data;
  const result=await call('/api/v2/account/profile/avatar',{method:'POST',payload:{requestId:crypto.randomUUID(),version:0,jpegBase64:sanitizeAvatar(raw.toString('base64'))}});
  if(result.status!==200||result.body.accountId!==f.owner.id||!result.body.avatar?.startsWith('data:image/jpeg;base64,'))throw Object.assign(Error(),{code:result.body.error?.code||'AVATAR_NOT_SAVED'});
  const removed=await call('/api/v2/account/profile/avatar/remove',{method:'POST',payload:{requestId:crypto.randomUUID(),version:1}});
  if(removed.status!==200||removed.body.avatar!==null||removed.body.avatarVersion!==2)throw Error('AVATAR_REMOVE_VERSION_LOST');
  const stale=await call('/api/v2/account/profile/avatar',{method:'POST',payload:{requestId:crypto.randomUUID(),version:0,jpegBase64:sanitizeAvatar(raw.toString('base64'))}});
  if(stale.status!==409)throw Error('STALE_AVATAR_RESURRECTED');
 });
 await check('workerd/D1 execute archive + preview + atomic permanent deletion with no FK residue',async()=>{
  const action=await call('/api/v2/account/control/users/'+invitation.accountId+'/action',{method:'POST',payload:{requestId:crypto.randomUUID(),version:1,action:'remove'}});
  if(action.status!==200)throw Object.assign(Error(),{code:action.body.error?.code});
  const preview=await call('/api/v2/account/control/users/'+invitation.accountId+'/purge-preview',{method:'POST',payload:{requestId:crypto.randomUUID(),version:2}});
  if(preview.status!==200)throw Object.assign(Error(),{code:preview.body.error?.code});
  const result=await call('/api/v2/account/control/users/'+invitation.accountId+'/purge',{method:'POST',payload:{requestId:crypto.randomUUID(),version:2,approvalToken:preview.body.approvalToken,confirmation:preview.body.confirmation}});
  if(result.status!==200)throw Object.assign(Error(),{code:result.body.error?.code});
  if((await db.prepare('PRAGMA foreign_key_check').all()).results.length)throw Error('FOREIGN_KEY_RESIDUE');
 });
 await check('existing WebAuthn options execute inside actual workerd Node compatibility runtime',async()=>{
  const body=JSON.stringify({op:'authenticate-options',input:{},flowHash:'a'.repeat(64),sessionHash:null,networkHash:'b'.repeat(64)}),path='/api/v2/account/internal/passkey',timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
  const digest=createHash('sha256').update(body).digest('hex'),signature=createHmac('sha256','SYNTHETIC_WORKERD_PASSKEY_SERVICE_KEY_ONLY').update(['v1','POST',path,timestamp,nonce,digest].join('\n')).digest('hex');
  const response=await mf.dispatchFetch('https://synthetic-worker.invalid'+path,{method:'POST',headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature},body});
  const data=await response.json();
  if(response.status!==200||data.options?.userVerification!=='required')throw Object.assign(Error(),{code:data.error?.code||'WEBAUTHN_RUNTIME_FAILED'});
 });
 await check('actual workerd/D1 public registration respects testing and creates no session in open mode',async()=>{
  const refs=await db.prepare('PRAGMA foreign_key_list("nexus_alpha_members")').all();
  if(!refs.results.some(ref=>ref.table==='account_subjects'))throw Error('D1_REFERENCE_QUERY_UNAVAILABLE');
  if((await passkey('registration-policy')).body.available!==false)throw Error('TESTING_BYPASS');
  await db.exec("UPDATE nexus_alpha_settings SET registration_mode='open',version=version+1");
  const created=await passkey('register-options',{registration:'open',username:'workerd.person',displayName:'Synthetic workerd person'});
  if(created.status!==200||created.body.options?.authenticatorSelection.userVerification!=='required')throw Object.assign(Error(),{code:created.body.error?.code||'PUBLIC_OPTIONS_FAILED'});
  if((await db.prepare('SELECT count(*) n FROM account_sessions').first()).n!==1)throw Error('PREMATURE_SESSION');
  if((await passkey('cancel-public-registration',{challengeId:created.body.challengeId},'e'.repeat(64))).status!==200)throw Error('CANCEL_FAILED');
  if((await db.prepare('SELECT count(*) n FROM account_subjects').first()).n!==2)throw Error('FOREIGN_FLOW_DELETED');
  if((await passkey('cancel-public-registration',{challengeId:created.body.challengeId})).status!==200)throw Error('CANCEL_FAILED');
  if((await db.prepare('SELECT count(*) n FROM account_subjects').first()).n!==1)throw Error('CANCEL_NOT_COLLECTED');
 });
 await check('actual D1 cleans an expired public ceremony and its profile choice without blocking login',async()=>{
  const created=await passkey('register-options',{registration:'open',username:'workerd.retry',displayName:'Synthetic retry'});if(created.status!==200)throw Error('PUBLIC_OPTIONS_FAILED');
  const expired=new Date(Date.now()-1000).toISOString();
  await db.prepare('UPDATE nexus_passkey_challenges SET expires_at=? WHERE id=?').bind(expired,created.body.challengeId).run();
  await db.prepare("UPDATE nexus_passkey_invites SET expires_at=? WHERE account_id<>(SELECT account_id FROM nexus_admin_grants LIMIT 1)").bind(expired).run();
  await db.prepare("UPDATE nexus_alpha_members SET reserved_until=? WHERE state='invited'").bind(expired).run();
  if((await passkey('authenticate-options')).status!==200)throw Error('CANCELLED_ENROLLMENT_BLOCKED_LOGIN');
  const next=await passkey('register-options',{registration:'open',username:'workerd.retry',displayName:'Synthetic retry'});if(next.status!==200)throw Object.assign(Error(),{code:next.body.error?.code||'PUBLIC_RETRY_FAILED'});
  if((await db.prepare('SELECT count(*) n FROM account_subjects').first()).n!==2)throw Error('PUBLIC_PLACEHOLDER_LEAK');
  if((await db.prepare('PRAGMA foreign_key_check').all()).results.length)throw Error('FOREIGN_KEY_RESIDUE');
 });
 await check('actual workerd/D1 keeps blog drafts private and publishes only an explicit saved snapshot',async()=>{
  const id=crypto.randomUUID(),payload={requestId:crypto.randomUUID(),target:'post',id,slug:'workerd-local',version:0,action:'save',content:{title:'Synthetic workerd',summary:'Local only',body:'SYNTHETIC_POST_ONLY'}};
  const saved=await call('/api/v2/account/control/content',{method:'POST',payload});
  if(saved.status!==200)throw Object.assign(Error(),{code:saved.body.error?.code});
  let response=await mf.dispatchFetch('https://synthetic.invalid/api/v2/content/feed');
  if((await response.json()).posts.length!==0)throw Error('DRAFT_DISCLOSED');
  const published=await call('/api/v2/account/control/content',{method:'POST',payload:{...payload,requestId:crypto.randomUUID(),version:1,action:'publish',content:{}}});
  if(published.status!==200)throw Object.assign(Error(),{code:published.body.error?.code});
  response=await mf.dispatchFetch('https://synthetic.invalid/api/v2/content/feed?slug=workerd-local');
  if((await response.json()).posts[0]?.body!=='SYNTHETIC_POST_ONLY')throw Error('PUBLICATION_MISSING');
 });
 await check('actual workerd/D1 delivers a private team answer and erases the thread on author deletion',async()=>{
  async function feedback(path,method='GET',payload=null){
   const internal='/api/v2/feedback/internal',body=JSON.stringify({path:'/api/v2/feedback/'+path,method,payload,sessionHash:createHash('sha256').update(f.owner.secret).digest('hex'),expectedAccountId:f.owner.id}),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
   const signature=createHmac('sha256','SYNTHETIC_WORKERD_FEEDBACK_SERVICE_KEY_ONLY').update(['v1','POST',internal,timestamp,nonce,createHash('sha256').update(body).digest('hex')].join('\n')).digest('hex');
   const r=await mf.dispatchFetch('https://synthetic.invalid'+internal,{method:'POST',body,headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature}});
   return {status:r.status,body:await r.json()};
  }
  const created=await feedback('items','POST',{kind:'message',type:'idea',body:'SYNTHETIC_WORKERD_QUESTION_ONLY',context:{},requestKey:crypto.randomUUID()});
  if(created.status!==200)throw Object.assign(Error(),{code:created.body.error?.code});
  const id=created.body.item.id;
  if((await feedback('items/'+id+'/replies','POST',{requestId:crypto.randomUUID(),body:'SYNTHETIC_WORKERD_TEAM_ONLY'})).status!==200)throw Error('TEAM_REPLY_FAILED');
  const thread=await feedback('items/'+id+'/conversation');
  if(thread.body.replies[0]?.team!==true)throw Error('TEAM_PROOF_MISSING');
  const removed=await feedback('items/'+id+'/delete','POST',{requestId:crypto.randomUUID(),version:1});
  if(removed.status!==200||(await db.prepare('SELECT count(*) n FROM feedback_replies WHERE item_id=?').bind(id).first()).n!==0)throw Error('DELETE_THREAD_FAILED');
 });
 if(outbound!==0)throw Error('OUTBOUND_NOT_ZERO');
}catch(error){failure={phase,name:error.name,code:error.code||'LOCAL_RUNTIME_FAILURE',migrationFile,diagnostic:error.diagnostic||(checks.length===0?String(error.message).slice(0,1200):undefined)};console.log(JSON.stringify({status:'FAIL',...failure}))}
finally{
 await mf.dispose();f.close();
 const result={status:failure?'FAIL':'PASS',checks,failure,outboundRequests:outbound,cloudResourcesCreated:0,realCredentials:false,runtime:'local Cloudflare workerd / D1',compatibilityDate,tables};
 await writeFile(resultFile,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 if(failure)process.exitCode=1;
}
function assertArray(value,length){if(!Array.isArray(value)||value.length!==length)throw Error('WRONG_LIST')}
