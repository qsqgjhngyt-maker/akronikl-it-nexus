import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createRememberFreshProofResolver} from '../server-access/worker/remember-device-proof.mjs';
import {digestSecret} from '../server-access/worker/remember-device-core.mjs';
const at=Date.UTC(2026,9,23,12,0,0),token='nxs_'+randomBytes(32).toString('base64url');
const base={session_id:'synthetic-session',account_id:'synthetic-account-1',device_id:'synthetic-device-1',
 login_method_id:'synthetic-login-method',created_at:new Date(at-30000).toISOString()};
function fixture({rows=[base],allow=true}={}){
 let sql,params,alpha=0,queries=0;
 const db={prepare(query){sql=query;queries++;return {bind(...p){params=p;return {async all(){return {results:rows}}}}}}};
 const resolve=createRememberFreshProofResolver(db,{clock:()=>at,env:{},allowAccount:async()=>{alpha++;return allow}});
 return {resolve,get params(){return params},get sql(){return sql},get alpha(){return alpha},get queries(){return queries}};
}
test('fresh proof is derived solely from verified session hash / DB, never browser principal',async()=>{
 const f=fixture(),p=await f.resolve(token);assert.ok(p);
 assert.equal(p.sessionHash,await digestSecret(token));assert.equal(p.accountId,base.account_id);
 assert.equal(p.authStrength,'account-method-v1');assert.equal(p.recentProof,true);
 assert.equal(f.params[0],await digestSecret(token));assert.notEqual(f.params[0],token);
 assert.equal(f.params[1],new Date(at).toISOString());assert.equal(f.params[2],new Date(at-300000).toISOString());
 assert.match(f.sql,/JOIN account_subjects/);assert.match(f.sql,/JOIN account_devices/);
 assert.match(f.sql,/JOIN login_methods/);assert.match(f.sql,/s\.auth_strength='account-method-v1'/);
 assert.match(f.sql,/s\.created_at>\?3/);
});
test('missing or malformed credentials have zero D1 reads',async()=>{
 const f=fixture();for(const v of [null,'','synthetic','nxs_bad',7,'nxs_'+randomBytes(9).toString('hex')])assert.equal(await f.resolve(v),null);
 assert.equal(f.queries,0);
});
test('ambiguous login method mapping, disabled alpha or corrupted owner fails closed',async()=>{
 for(const opts of [{rows:[]},{rows:[base,base]},{allow:false},{rows:[{...base,account_id:'../unsafe'}]}]){
  const f=fixture(opts);assert.equal(await f.resolve(token),null);
 }
});
test('transient D1 errors return no user proof and never echo raw credential',async()=>{
 const f=createRememberFreshProofResolver({prepare(){throw Error('synthetic DB error')}},{clock:()=>at});
 assert.equal(await f(token),null);
});
