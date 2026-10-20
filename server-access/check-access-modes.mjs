import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {controlFixture,sha} from '../tests/helpers/control-fixture.mjs';
import {handleOAuthService} from './worker/oauth-service.mjs';
const f=await controlFixture(),base='/api/v2/account/control';let checks=0;
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
const post=(path,payload,actor)=>f.call(base+path,{method:'POST',actor,payload:{requestId:crypto.randomUUID(),...payload}});
const settings=async changes=>{const current=(await f.call(base+'/users')).body.settings;return post('/settings',{version:current.version,maxTesters:current.maxTesters,limitEnabled:current.limitEnabled,registrationMode:current.registrationMode,...changes})};
async function service(data){
 const path='/api/v2/account/internal/oauth',body=JSON.stringify(data),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
 const signature=createHmac('sha256',f.env.OAUTH_SERVICE_KEY).update(['v1','POST',path,timestamp,nonce,sha(body)].join('\n')).digest('hex');
 const r=await handleOAuthService(new Request('https://synthetic.invalid'+path,{method:'POST',body,headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature}}),f.env);
 return {status:r.status,body:await r.json()};
}
async function login(provider,subject){
 const flowHash=sha(randomBytes(16)),stateHash=sha(randomBytes(16));
 assert.equal((await service({op:'begin',provider,intent:'login',flowHash,stateHash,codeVerifier:'V'.repeat(43),nonce:'N'.repeat(43)})).status,200);
 const claim=await service({op:'claim',provider,flowHash,stateHash});assert.equal(claim.status,200);
 return service({op:'complete',txId:claim.body.txId,flowHash,profile:{issuer:{google:'https://accounts.google.com',yandex:'https://login.yandex.ru',vk:'https://id.vk.ru'}[provider],subject,email:null,emailVerified:false,displayName:'Synthetic user'}});
}
const count=()=>f.db.prepare('SELECT count(*) n FROM nexus_alpha_occupied').get().n;
try{
 await check('default is testing with a bounded capacity and no automatically granted administrators',async()=>{
  const s=(await f.call(base+'/users')).body.settings;assert.equal(s.registrationMode,'invite_only');assert.equal(s.limitEnabled,true);assert.equal(s.maxTesters,10);assert.equal(count(),0);
 });
 await check('open mode enforces the last available place',async()=>{
  assert.equal((await settings({registrationMode:'open',maxTesters:1})).status,200);
  assert.equal((await login('google','synthetic-first')).status,200);
  assert.equal((await login('yandex','synthetic-second')).body.error.code,'ALPHA_CAPACITY_REACHED');assert.equal(count(),1);
 });
 await check('unlimited open mode admits distinct Google Yandex VK users beyond the remembered limit',async()=>{
  assert.equal((await settings({limitEnabled:false})).status,200);
  for(const provider of ['google','yandex','vk'])assert.equal((await login(provider,'synthetic-'+provider)).status,200);
  assert.equal(count(),4);const s=(await f.call(base+'/users')).body.settings;assert.equal(s.limitEnabled,false);assert.equal(s.maxTesters,1);
 });
 await check('unlimited admission retains block enforcement and cannot replace a blocked identity',async()=>{
  const id=f.db.prepare("SELECT account_id FROM oauth_identities WHERE provider='google' AND provider_subject='synthetic-first'").get().account_id;
  assert.equal((await post('/users/'+id+'/action',{version:1,action:'block'})).status,200);
  assert.equal((await login('google','synthetic-first')).body.error.code,'ALPHA_ACCESS_CLOSED');assert.equal(count(),3);
 });
 await check('testing mode still denies new OAuth users when capacity is unlimited; admitted identities can sign in',async()=>{
  assert.equal((await settings({registrationMode:'invite_only'})).status,200);
  for(const provider of ['google','yandex','vk'])assert.equal((await login(provider,'synthetic-uninvited-'+provider)).body.error.code,'ALPHA_INVITATION_REQUIRED');
  assert.equal((await login('yandex','synthetic-yandex')).status,200);assert.equal(count(),3);
 });
 await check('testing retains invitation creation and revocation without a capacity limit',async()=>{
  const invite=await post('/invites',{ttlMinutes:60});assert.equal(invite.status,200);assert.equal(count(),4);
  assert.equal((await post('/users/'+invite.body.accountId+'/action',{version:1,action:'revoke-invite'})).status,200);assert.equal(count(),3);
 });
 await check('restoring a finite limit below occupied places fails atomically; an adequate limit succeeds',async()=>{
  const version=(await f.call(base+'/users')).body.settings.version;
  assert.equal((await settings({limitEnabled:true,maxTesters:1})).body.error.code,'ALPHA_LIMIT_BELOW_OCCUPIED');
  let s=(await f.call(base+'/users')).body.settings;assert.equal(s.limitEnabled,false);assert.equal(s.version,version);
  assert.equal((await settings({limitEnabled:true,maxTesters:4})).status,200);assert.equal((await post('/invites',{ttlMinutes:60})).status,200);
  assert.equal((await post('/invites',{ttlMinutes:60})).body.error.code,'ALPHA_CAPACITY_REACHED');
 });
 await check('invalid Boolean, stale settings and ordinary users cannot change access policy',async()=>{
  assert.equal((await settings({limitEnabled:'false'})).body.error.code,'INVALID_INPUT');
  assert.equal((await settings({version:1})).body.error.code,'CONTROL_CONFLICT');
  const logged=await login('vk','synthetic-vk');assert.equal(logged.status,200);
  const user={id:f.db.prepare('SELECT subject_id FROM account_sessions WHERE secret_hash=?').get(sha(logged.body.sessionSecret)).subject_id,secret:logged.body.sessionSecret};
  const s=(await f.call(base+'/users')).body.settings;
  assert.equal((await post('/settings',{version:s.version,maxTesters:20,registrationMode:'open',limitEnabled:false},user)).status,403);
 });
 console.log(JSON.stringify({status:'PASS',checks,syntheticOnly:true,cloudRequests:0}));
}finally{f.close()}
