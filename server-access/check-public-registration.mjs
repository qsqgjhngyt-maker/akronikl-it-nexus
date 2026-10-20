import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {controlFixture,sha} from '../tests/helpers/control-fixture.mjs';
import {handlePasskeyService} from './worker/passkey-service.mjs';
const f=await controlFixture(),origin='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const env={...f.env,PASSKEY_ENABLED:'true',PUBLIC_PASSKEY_REGISTRATION_ENABLED:'true',PASSKEY_SERVICE_KEY:'SYNTHETIC_PUBLIC_REGISTRATION_SERVICE_KEY',PASSKEY_ORIGIN:origin,PASSKEY_RP_ID:new URL(origin).hostname};
let checks=0,network='synthetic-public';
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
const count=table=>f.db.prepare('SELECT count(*) n FROM '+table).get().n;
const settings=changes=>{const allowed=new Set(['registration_mode','limit_enabled','max_testers']);for(const k of Object.keys(changes))assert.ok(allowed.has(k));f.db.prepare('UPDATE nexus_alpha_settings SET '+Object.keys(changes).map(k=>k+'=?').join(',')+',version=version+1 WHERE id=1').run(...Object.values(changes))};
async function call(op,input={},override=env,sessionHash=null,flowHash=sha('synthetic-public-flow')){
 const path='/api/v2/account/internal/passkey',body=JSON.stringify({op,input,flowHash,sessionHash,networkHash:sha(network)}),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
 const signature=createHmac('sha256',env.PASSKEY_SERVICE_KEY).update(['v1','POST',path,timestamp,nonce,sha(body)].join('\n')).digest('hex');
 const r=await handlePasskeyService(new Request('https://synthetic.invalid'+path,{method:'POST',body,headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature}}),override);
 return {status:r.status,body:await r.json()};
}
const input={registration:'open',username:'nexus.person',displayName:'Synthetic person'};let pending;
try{
 await check('testing denies public registration without creating an account, challenge or session',async()=>{
  assert.deepEqual((await call('registration-policy')).body,{available:false,reason:'invitation'});
  assert.equal((await call('register-options',input)).body.error.code,'REGISTRATION_CLOSED');assert.equal(count('account_subjects'),1);assert.equal(count('account_sessions'),1);assert.equal(count('nexus_passkey_challenges'),0);
 });
 settings({registration_mode:'open',max_testers:1});
 await check('open mode still requires independent enable flags and durable enforcement',async()=>{
  for(const override of [{PUBLIC_PASSKEY_REGISTRATION_ENABLED:'false'},{ALPHA_ADMISSION_ENABLED:'false'}]){
   assert.equal((await call('registration-policy',{}, {...env,...override})).body.available,false);
   assert.equal((await call('register-options',input,{...env,...override})).body.error.code,'REGISTRATION_CLOSED');
  }
  f.db.exec('UPDATE nexus_alpha_settings SET enforced=0');assert.equal((await call('register-options',input)).status,503);f.db.exec('UPDATE nexus_alpha_settings SET enforced=1');assert.equal(count('account_subjects'),1);
 });
 await check('mixed identity input and existing sessions cannot start a new public account',async()=>{
  for(const bad of [{...input,inviteHash:sha('fake')},{...input,accountId:f.owner.id},{...input,registration:true},{...input,username:'admin'},{...input,displayName:'bad\nname'}])assert.notEqual((await call('register-options',bad)).status,200);
  assert.equal((await call('register-options',input,env,sha(f.owner.secret))).body.error.code,'ALREADY_SIGNED_IN');assert.equal(count('account_subjects'),1);
 });
 await check('open mode reserves one finite place with UV-required options, no token and no session',async()=>{
  assert.deepEqual((await call('registration-policy')).body,{available:true,reason:'open'});
  pending=await call('register-options',input);assert.equal(pending.status,200);assert.deepEqual(Object.keys(pending.body).sort(),['challengeId','options']);assert.equal(pending.body.options.authenticatorSelection.userVerification,'required');assert.equal(pending.body.options.authenticatorSelection.residentKey,'required');
  assert.equal(count('nexus_alpha_occupied'),1);assert.equal(count('account_sessions'),1);assert.equal(count('nexus_account_profiles'),0);assert.equal(count('nexus_passkey_credentials'),1);
  const row=f.db.prepare('SELECT kind,created_by FROM nexus_admin_invites').get();assert.equal(row.kind,'public');assert.equal(row.created_by,'public-registration');
 });
 await check('capacity and invalid proof cannot create another account or authorize the pending one',async()=>{
  assert.deepEqual((await call('registration-policy')).body,{available:false,reason:'capacity'});
  assert.equal((await call('register-options',{...input,username:'nexus.other'})).body.error.code,'ALPHA_CAPACITY_REACHED');assert.equal(count('account_subjects'),2);
  const denied=await call('register-verify',{challengeId:pending.body.challengeId,response:{}});assert.equal(denied.status,401);assert.equal(count('account_sessions'),1);assert.equal(count('nexus_account_profiles'),0);
 });
 await check('cancellation cleanup removes only expired empty public placeholders and releases capacity',async()=>{
  const expired=new Date(Date.now()-1000).toISOString();
  f.db.prepare('UPDATE nexus_passkey_invites SET expires_at=? WHERE account_id<>?').run(expired,f.owner.id);
  f.db.prepare("UPDATE nexus_alpha_members SET reserved_until=? WHERE state='invited'").run(expired);
  f.db.prepare('UPDATE nexus_passkey_challenges SET expires_at=? WHERE id=?').run(expired,pending.body.challengeId);
  network='synthetic-cleanup';const next=await call('register-options',{...input,username:'nexus.retry'});assert.equal(next.status,200);
  assert.equal(count('account_subjects'),2);assert.equal(count('nexus_alpha_occupied'),1);assert.equal(count('nexus_admin_write_guards'),0);assert.ok(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(f.owner.id));assert.equal(count('account_sessions'),1);
  assert.equal((await call('register-verify',{challengeId:pending.body.challengeId,response:{}})).body.error.code,'CHALLENGE_REJECTED');
 });
 await check('unlimited mode retains rate limits; testing closes even an unlimited registration',async()=>{
  settings({limit_enabled:0});network='synthetic-rate';
  for(let n=0;n<5;n++)assert.equal((await call('register-options',{...input,username:'nexus.rate'+n})).status,200);
  const before=count('account_subjects');assert.equal((await call('register-options',input)).status,429);assert.equal(count('account_subjects'),before);
  settings({registration_mode:'invite_only'});assert.equal((await call('register-options',input)).body.error.code,'REGISTRATION_CLOSED');assert.equal(count('account_subjects'),before);
 });
 await check('cancellation is flow-bound and one explicit cancellation releases an empty reservation',async()=>{
  settings({registration_mode:'open'});network='synthetic-cancel';const before=count('account_subjects');
  const item=await call('register-options',input);assert.equal(item.status,200);const cancelled={challengeId:item.body.challengeId};
  assert.equal((await call('cancel-public-registration',cancelled,env,null,sha('foreign-flow'))).status,200);assert.equal(count('account_subjects'),before+1);
  assert.equal((await call('cancel-public-registration',cancelled)).status,200);assert.equal(count('account_subjects'),before);
  assert.equal((await call('cancel-public-registration',cancelled)).status,200);assert.equal(count('account_subjects'),before);
  assert.equal((await call('register-verify',{...cancelled,response:{}})).body.error.code,'CHALLENGE_REJECTED');
 });
 await check('cleanup and cancellation preserve dependent data, including a future CASCADE reference',async()=>{
  network='synthetic-protected';const item=await call('register-options',input);assert.equal(item.status,200);
  const id=f.db.prepare('SELECT account_id FROM nexus_passkey_challenges WHERE id=?').get(item.body.challengeId).account_id;
  f.db.exec('CREATE TABLE synthetic_future_data(account_id TEXT REFERENCES account_subjects(id) ON DELETE CASCADE, content TEXT)');f.db.prepare("INSERT INTO synthetic_future_data VALUES(?,'preserve')").run(id);
  assert.equal((await call('cancel-public-registration',{challengeId:item.body.challengeId})).status,200);assert.ok(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(id));
  const past=new Date(Date.now()-1000).toISOString();f.db.prepare('UPDATE nexus_passkey_challenges SET expires_at=? WHERE account_id=?').run(past,id);f.db.prepare('UPDATE nexus_passkey_invites SET expires_at=? WHERE account_id=?').run(past,id);f.db.prepare('UPDATE nexus_alpha_members SET reserved_until=? WHERE account_id=?').run(past,id);
  assert.equal((await call('register-options',{...input,username:'protected.other'})).status,200);assert.equal(f.db.prepare('SELECT content FROM synthetic_future_data').get().content,'preserve');
 });
 await check('a policy change racing reservation rolls the entire creation back',async()=>{
  settings({registration_mode:'open'});network='synthetic-race';const before=count('account_subjects');
  f.beforeBatch(()=>settings({registration_mode:'invite_only'}));
  assert.notEqual((await call('register-options',input)).status,200);assert.equal(count('account_subjects'),before);assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length,0);
 });
 console.log(JSON.stringify({status:'PASS',checks,externalRequests:0,realCredentials:false,productionWrites:0}));
}finally{f.close()}
