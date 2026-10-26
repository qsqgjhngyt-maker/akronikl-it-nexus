import test from 'node:test';
import assert from 'node:assert/strict';
import {createRememberD1Repository} from '../server-access/worker/remember-device-d1.mjs';
function mockDB(){
 const seen=[],db={
  prepare(sql){return {bind(...args){const record={sql,args};seen.push(record);return {
    async first(){return null},async run(){return {success:true,meta:{changes:1}}}
   };}}},
  async batch(statements){return statements.map(()=>({success:true,meta:{changes:1}}))}
 };
 return {db,seen};
}
const grant={id:'synthetic-id',accountId:'synthetic-account',deviceId:'synthetic-device',loginMethodId:'synthetic-method',
 currentHash:'a'.repeat(64),createdAt:'2026-10-23T00:00:00.000Z',expiresAt:'2026-11-22T00:00:00.000Z'};
const proof={sessionHash:'b'.repeat(64)};
const issue={grantId:grant.id,expectedHash:'a'.repeat(64),nextHash:'c'.repeat(64),
 nextGeneration:2,rotatedAt:'2026-10-23T00:00:00.000Z',grantExpiresAt:grant.expiresAt,
 sessionId:'synthetic-session',accountId:grant.accountId,deviceId:grant.deviceId,loginMethodId:grant.loginMethodId,
 sessionHash:'d'.repeat(64),sessionIdleExpiresAt:'2026-10-23T00:30:00.000Z',
 sessionAbsoluteExpiresAt:'2026-10-23T12:00:00.000Z',sessionAuthStrength:'remembered-device-v1'};
test('adapter requires real D1 batch and policy callback (default deny)',()=>{
 assert.throws(()=>createRememberD1Repository({}),/REMEMBER_DISABLED/);
 assert.throws(()=>createRememberD1Repository({prepare(){},batch(){}}),/REMEMBER_DISABLED/);
});
test('no grant creation without signed ingress session hash',async()=>{
 const m=mockDB(),r=createRememberD1Repository(m.db,{alphaAccess:async()=>true});
 assert.equal(await r.createGrant(grant,{sessionHash:'untrusted'}),false);
 assert.equal(m.seen.length,0);
});
test('grant insertion binds verified hashed prior session and checks fresh method',async()=>{
 const m=mockDB(),r=createRememberD1Repository(m.db,{alphaAccess:async()=>true});
 assert.equal(await r.createGrant(grant,proof),true);
 assert.equal(m.seen.length,1);assert.ok(m.seen[0].sql.includes('s.secret_hash=?8'));
 assert.ok(m.seen[0].sql.includes("s.auth_strength='account-method-v1'"));
 assert.ok(m.seen[0].sql.includes('BETWEEN 0 AND (5.0/1440)'));
 assert.ok(m.seen[0].args.includes(proof.sessionHash));
});
test('rotation is five SQL mutations inside one atomic D1 batch, weaker auth only',async()=>{
 const m=mockDB(),r=createRememberD1Repository(m.db,{alphaAccess:async()=>true});
 assert.equal(await r.atomicRotateAndCreateSession(issue),true);
 assert.equal(m.seen.length,5);
 assert.ok(m.seen[0].sql.includes('INSERT INTO nexus_remembered_spent'));
 assert.ok(m.seen[1].sql.includes('UPDATE nexus_remembered_grants'));
 assert.ok(m.seen[2].sql.includes("'remembered-device-v1'"));
 assert.ok(m.seen[3].sql.includes('INSERT INTO session_login_methods'));
 assert.ok(m.seen[4].sql.includes('INSERT INTO nexus_remembered_renewal_receipts'));
 for(const call of m.seen){assert.ok(!call.sql.includes('nxs_'));assert.ok(!call.args.some(x=>typeof x==='string'&&x.startsWith('nrd_')))}
});
test('rotation rejects attempt to elevate to fresh session',async()=>{
 const m=mockDB(),r=createRememberD1Repository(m.db,{alphaAccess:async()=>true});
 assert.equal(await r.atomicRotateAndCreateSession({...issue,sessionAuthStrength:'account-method-v1'}),false);
 assert.equal(m.seen.length,0);
});
test('alpha-denied account cannot rotate or create new device grants',async()=>{
 const m=mockDB(),r=createRememberD1Repository(m.db,{alphaAccess:async()=>false});
 assert.equal(await r.createGrant(grant,proof),false);
 assert.equal(await r.atomicRotateAndCreateSession(issue),false);
 assert.equal(m.seen.length,0);
});
