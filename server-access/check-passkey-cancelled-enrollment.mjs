import assert from 'node:assert/strict';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {controlFixture,sha} from '../tests/helpers/control-fixture.mjs';
import {handlePasskeyService} from './worker/passkey-service.mjs';
const f=await controlFixture(),origin='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const env={...f.env,PASSKEY_ENABLED:'true',PASSKEY_SERVICE_KEY:'SYNTHETIC_CANCELLED_ENROLLMENT_SERVICE_KEY',PASSKEY_ORIGIN:origin,PASSKEY_RP_ID:new URL(origin).hostname};
const checks=[];
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name)};
async function call(op,input={}){
 const body=JSON.stringify({op,input,flowHash:sha('synthetic-flow'),sessionHash:null,networkHash:sha('synthetic-network')}),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex'),path='/api/v2/account/internal/passkey';
 const signature=createHmac('sha256',env.PASSKEY_SERVICE_KEY).update(['v1','POST',path,timestamp,nonce,sha(body)].join('\n')).digest('hex');
 const r=await handlePasskeyService(new Request('https://synthetic.invalid'+path,{method:'POST',body,headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature}}),env);
 return {status:r.status,body:await r.json()};
}
try{
 const invitation=await f.call('/api/v2/account/control/invites',{method:'POST',payload:{requestId:randomUUID(),ttlMinutes:60}});assert.equal(invitation.status,200);
 const input={inviteHash:sha(invitation.body.invitationToken),username:'cancelled.user',displayName:'Synthetic cancellation'};
 let original;
 await check('valid managed registration creates a profile-bound challenge without creating a session',async()=>{
  original=await call('register-options',input);assert.equal(original.status,200);assert.equal(original.body.options.authenticatorSelection.userVerification,'required');
  assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_invite_enrollments').get().n,1);
  assert.equal(f.db.prepare('SELECT count(*) n FROM account_sessions').get().n,1);
 });
 await check('another login request preserves the unexpired registration challenge and chosen profile',async()=>{
  assert.equal((await call('authenticate-options')).status,200);
  assert.ok(f.db.prepare('SELECT id FROM nexus_passkey_challenges WHERE id=?').get(original.body.challengeId));
  assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_invite_enrollments').get().n,1);
 });
 f.db.prepare('UPDATE nexus_passkey_challenges SET expires_at=? WHERE id=?').run(new Date(Date.now()-1000).toISOString(),original.body.challengeId);
 await check('cancelling and expiring a managed registration cannot block the next login options',async()=>{
  const next=await call('authenticate-options');assert.equal(next.status,200,'EXPIRED_MANAGED_ENROLLMENT_MUST_NOT_BLOCK_SIGN_IN');
  assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_invite_enrollments').get().n,0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_passkey_challenges WHERE id=?').get(original.body.challengeId).n,0);
 });
 await check('expired deleted challenge cannot authorize a registration or issue a session',async()=>{
  const result=await call('register-verify',{challengeId:original.body.challengeId,response:{}});assert.equal(result.status,401);assert.equal(result.body.error.code,'CHALLENGE_REJECTED');
  assert.equal(f.db.prepare('SELECT count(*) n FROM account_sessions').get().n,1);
  assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_account_profiles').get().n,0);
 });
 await check('cleanup preserves the account and one-use invitation for an explicit user retry',async()=>{
  assert.ok(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(invitation.body.accountId));
  assert.equal(f.db.prepare('SELECT state FROM nexus_admin_invites WHERE account_id=?').get(invitation.body.accountId).state,'ready');
  const retry=await call('register-options',input);assert.equal(retry.status,200);assert.notEqual(retry.body.challengeId,original.body.challengeId);
 });
 await check('revoking the invitation still denies enrollment after a cancellation',async()=>{
  assert.equal((await f.call('/api/v2/account/control/users/'+invitation.body.accountId+'/action',{method:'POST',payload:{requestId:randomUUID(),version:1,action:'remove'}})).status,200);
  const denied=await call('register-options',input);assert.equal(denied.status,403);assert.equal(denied.body.error.code,'ENROLLMENT_REQUIRED');
  assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length,0);
 });
 console.log(JSON.stringify({status:'PASS',checks:checks.length,realCredentials:false,externalRequests:0,productionWrites:0}));
}finally{f.close()}
