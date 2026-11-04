// Isolated domain tests: NO HTTP endpoints, NO production data, NO credentials in logs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRememberDeviceCore,digestSecret,REMEMBER_ABSOLUTE_MS,REMEMBER_RETRY_WINDOW_MS,REMEMBER_SESSION_IDLE_MS,REMEMBER_SESSION_ABSOLUTE_MS} from '../server-access/worker/remember-device-core.mjs';
const accountId='synthetic-account-1',deviceId='synthetic-device-1',loginMethodId='synthetic-method-1';
const proof={explicitOptIn:true,recentProof:true,authStrength:'account-method-v1',accountId,deviceId,loginMethodId,sessionHash:'a'.repeat(64)};
function fixture(){
 let clock=Date.UTC(2026,9,23,0,0,0),calls=[],forceCASFail=false;
 const rows=new Map(),spent=new Map(),sessions=new Map();
 const repository={
  async createGrant(row){
   if(rows.has(row.id))return false;
   rows.set(row.id,{...row});calls.push('grant:create');return true;
  },
  async getGrant(id){return rows.get(id)?{...rows.get(id)}:null},
  async spentTokenStatus(id,hash){const record=spent.get(hash);return record?.id===id?record:null},
  async getCurrentAuthority(row){
   calls.push('authority:read');
   const r=rows.get(row.id);
   return r?.authority||{accountId:r.accountId,deviceId:r.deviceId,loginMethodId:r.loginMethodId,
     accountStatus:'active',deviceStatus:'active',loginMethodStatus:'active',alphaAllowed:true};
  },
  async atomicRotateAndCreateSession(issue){
   calls.push('CAS:rotate');
   if(forceCASFail)return false;
   const r=rows.get(issue.grantId);
   // Model one atomic DB transaction, including post-query authorization verification.
   const auth=r.authority||{accountId:r.accountId,deviceId:r.deviceId,loginMethodId:r.loginMethodId,
    accountStatus:'active',deviceStatus:'active',loginMethodStatus:'active',alphaAllowed:true};
   if(!r||r.status!=='active'||r.currentHash!==issue.expectedHash||r.generation+1!==issue.nextGeneration||
      auth.accountStatus!=='active'||auth.deviceStatus!=='active'||auth.loginMethodStatus!=='active'||
      auth.alphaAllowed!==true||clock>=Date.parse(r.expiresAt))return false;
   assert.equal(issue.sessionAuthStrength,'remembered-device-v1');
   assert.equal(Date.parse(issue.sessionIdleExpiresAt)-clock,REMEMBER_SESSION_IDLE_MS);
   assert.equal(Date.parse(issue.sessionAbsoluteExpiresAt)-clock,REMEMBER_SESSION_ABSOLUTE_MS);
   assert.equal(spent.has(issue.expectedHash),false);
   spent.set(issue.expectedHash,{id:r.id,usedAt:issue.rotatedAt});
   r.currentHash=issue.nextHash;r.generation=issue.nextGeneration;r.lastRotatedAt=issue.rotatedAt;
   sessions.set(issue.sessionId,issue);
   return true;
  },
  async revokeGrant(id,reason){const row=rows.get(id);if(!row)return false;row.status='revoked';row.revokedAt=new Date(clock).toISOString();row.revokedReason=reason;calls.push('grant:revoke');return true},
  async revokeAllForAccount(id,reason){let total=0;for(const row of rows.values())if(row.accountId===id&&row.status==='active'){await this.revokeGrant(row.id,reason);total++}return total}
 };
 const api=createRememberDeviceCore({repository,clock:()=>clock});
 return {api,rows,spent,sessions,calls,advance:ms=>{clock+=ms},get now(){return clock},badCAS:()=>forceCASFail=true};
}

test('remember requires explicit opt-in, recent verified server auth',async()=>{
 const f=fixture();for(const invalid of [{...proof,explicitOptIn:false},{...proof,recentProof:false},{...proof,authStrength:'remembered-device-v1'},{...proof,accountId:'../../other'}])await assert.rejects(f.api.createGrant(invalid),/FRESH_PROOF_REQUIRED/);
 assert.equal(f.rows.size,0);
});
test('issue 30-day bounded token; database stores SHA256, not cookie',async()=>{
 const f=fixture(),result=await f.api.createGrant(proof);
 assert.equal(result.kind,'issued');assert.equal(Date.parse(result.expiresAt)-f.now,REMEMBER_ABSOLUTE_MS);
 const row=[...f.rows.values()][0];assert.equal(row.currentHash,await digestSecret(result.rememberCookieValue));
 assert.ok(!JSON.stringify(row).includes(result.rememberCookieValue));
 assert.ok(!JSON.stringify(row).includes('nxs_'));
});
test('renew atomically rotates persistent token and issues weaker server session',async()=>{
 const f=fixture(),issued=await f.api.createGrant(proof),renewed=await f.api.renew(issued.rememberCookieValue);
 assert.equal(renewed.kind,'renewed');assert.notEqual(renewed.rememberCookieValue,issued.rememberCookieValue);
 assert.equal(f.sessions.size,1);assert.equal(f.spent.size,1);
 const grant=[...f.rows.values()][0];assert.equal(grant.generation,2);
 assert.equal(grant.currentHash,await digestSecret(renewed.rememberCookieValue));
 assert.equal(f.sessions.values().next().value.sessionAuthStrength,'remembered-device-v1');
});
test('recent concurrent stale cookie cannot create second session',async()=>{
 const f=fixture(),issued=await f.api.createGrant(proof);
 assert.equal((await f.api.renew(issued.rememberCookieValue)).kind,'renewed');
 assert.equal((await f.api.renew(issued.rememberCookieValue)).kind,'wait-for-other-tab');
 assert.equal(f.sessions.size,1);assert.equal([...f.rows.values()][0].status,'active');
});
test('old token replay after short race window revokes grant',async()=>{
 const f=fixture(),issued=await f.api.createGrant(proof);
 await f.api.renew(issued.rememberCookieValue);
 f.advance(REMEMBER_RETRY_WINDOW_MS+1);
 assert.equal((await f.api.renew(issued.rememberCookieValue)).kind,'reauth');
 assert.equal([...f.rows.values()][0].status,'revoked');
 assert.equal(f.calls.at(-1),'grant:revoke');
});
test('unknown invalid token never revokes legitimate grant',async()=>{
 const f=fixture(),issued=await f.api.createGrant(proof);
 const invalid=issued.rememberCookieValue.slice(0,-2)+'AA';
 assert.equal((await f.api.renew(invalid)).kind,'reauth');
 assert.equal([...f.rows.values()][0].status,'active');
 assert.equal(f.sessions.size,0);
});
test('expired 30-day grant never issues new session',async()=>{
 const f=fixture(),issued=await f.api.createGrant(proof);f.advance(REMEMBER_ABSOLUTE_MS+1);
 assert.equal((await f.api.renew(issued.rememberCookieValue)).kind,'reauth');
 assert.equal(f.sessions.size,0);
});
test('revoked account, device, method, or alpha membership fails closed',async()=>{
 for(const invalid of [{accountStatus:'disabled'},{deviceStatus:'revoked'},{loginMethodStatus:'disabled'},{alphaAllowed:false},{accountId:'other-account'}]){
  const f=fixture(),issued=await f.api.createGrant(proof),row=[...f.rows.values()][0];
  row.authority={accountId,deviceId,loginMethodId,accountStatus:'active',deviceStatus:'active',loginMethodStatus:'active',alphaAllowed:true,...invalid};
  assert.equal((await f.api.renew(issued.rememberCookieValue)).kind,'reauth');
  assert.equal(f.sessions.size,0);assert.equal(row.status,'revoked');
 }
});
test('concurrent mutation rejecting CAS fails closed and issues no session',async()=>{
 const f=fixture(),issued=await f.api.createGrant(proof);f.badCAS();
 assert.equal((await f.api.renew(issued.rememberCookieValue)).kind,'retry-or-reauth');
 assert.equal(f.sessions.size,0);assert.equal([...f.rows.values()][0].generation,1);
});
test('device logout revokes current token without exposing database secrets',async()=>{
 const f=fixture(),issued=await f.api.createGrant(proof);
 assert.equal(await f.api.revokeByCookie(issued.rememberCookieValue),true);
 assert.equal((await f.api.renew(issued.rememberCookieValue)).kind,'reauth');
 assert.equal([...f.rows.values()][0].status,'revoked');
});
test('logout all requires fresh proof and revokes all device grants',async()=>{
 const f=fixture();await f.api.createGrant(proof);await f.api.createGrant({...proof,deviceId:'synthetic-device-2'});
 await assert.rejects(f.api.revokeAll({accountId,recentProof:false,authStrength:'account-method-v1'}),/FRESH_PROOF_REQUIRED/);
 assert.equal(await f.api.revokeAll({accountId,recentProof:true,authStrength:'account-method-v1'}),2);
 assert.ok([...f.rows.values()].every(r=>r.status==='revoked'));
});
test('malformed input cannot select another grant by URL or arbitrary principal',async()=>{
 const f=fixture(),issued=await f.api.createGrant(proof);
 for(const invalid of ['','nrd_invalid','https://evil.example/'+issued.rememberCookieValue,issued.rememberCookieValue+';foo=bar',123,undefined]){
  assert.equal((await f.api.renew(invalid)).kind,'reauth');
 }
 assert.equal(f.sessions.size,0);assert.equal([...f.rows.values()][0].status,'active');
});
test('no persistent token is written to browser JS storage',async()=>{
 const f=fixture(),issued=await f.api.createGrant(proof),result=await f.api.renew(issued.rememberCookieValue);
 assert.equal(result.kind,'renewed');
 assert.equal(typeof globalThis.localStorage,'undefined');
 assert.equal(typeof globalThis.indexedDB,'undefined');
 assert.ok(!JSON.stringify([...f.rows.values()]).includes(result.rememberCookieValue));
});
