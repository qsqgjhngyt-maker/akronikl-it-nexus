// Real Worker/SQLite and production migrations; all identities/data are synthetic.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes,createHmac,createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {handleOAuthService} from '../server-access/worker/oauth-service.mjs';
import {handleAdminService} from '../server-access/worker/admin-service.mjs';
import {createAccountControlHandler} from '../server-access/bff/account-control.mjs';
import {GATEWAY_ORIGIN} from '../server-access/bff/account-read.mjs';
import {controlFixture} from './helpers/control-fixture.mjs';
const BASE='/api/v2/account/control/';
async function fixture(){const f=await controlFixture();for(const name of ['0016_blog_media_parts','0018_course_final','0019_akronikl'])f.db.exec(await readFile('server-access/migrations/'+name+'.sql','utf8'));f.env.ACCOUNT_SELF_DELETE_ENABLED='true';return f}
const preview=(f,a,extra={})=>f.call(BASE+'self-delete-preview',{actor:a,method:'POST',payload:{requestId:randomUUID(),version:1,...extra}});
const execute=(f,a,p,extra={})=>f.call(BASE+'self-delete',{actor:a,method:'POST',payload:{requestId:randomUUID(),version:1,approvalToken:p.approvalToken,confirmation:p.confirmation,...extra}});
function seedState(f,a){for(const slot of ['key:qwen','chat','settings'])f.db.prepare('INSERT INTO nexus_akronikl_state VALUES(?,?,1,?)').run(a.id,slot,'SYNTHETIC_ENCRYPTED_ONLY_'.repeat(3));}
const exists=(f,a)=>!!f.db.prepare('SELECT 1 FROM account_subjects WHERE id=?').get(a.id);
test('own passkey deletion removes account/history/API keys; second account and admin remain; no self admin-audit',async()=>{
 const f=await fixture();try{const a=f.seed('self-a',{username:'self.a'}),b=f.seed('self-b');seedState(f,a);seedState(f,b);
  const caps=await f.call(BASE+'self-delete-capabilities',{actor:a});assert.equal(caps.status,200);assert.equal(caps.body.freshLogin,true);assert.equal(caps.body.canDelete,true);
  const p=await preview(f,a);assert.equal(p.status,200);assert.equal(p.body.counts.assistantApiKeys,1);assert.match(p.body.approvalToken,/^nps_/);
  const r=await execute(f,a,p.body);assert.equal(r.status,200);assert.equal(r.body.deletedServerData,true);assert.equal(exists(f,a),false);assert.equal(exists(f,b),true);assert.equal(exists(f,f.owner),true);
  assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_akronikl_state WHERE account_id=?').get(a.id).n,0);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_akronikl_state WHERE account_id=?').get(b.id).n,3);
  assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_admin_audit').get().n,0);assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(),[]);
  assert.equal((await execute(f,a,p.body)).status,401);
 }finally{f.close()}
});
test('authority rejects other targets, extra body fields, stale method sessions, admin accounts and feature-off',async()=>{
 const f=await fixture();try{const a=f.seed('self-a'),b=f.seed('self-b');for(const field of ['accountId','targetId','self']){const p=await preview(f,a,{[field]:b.id});assert.equal(p.status,400);assert.equal(exists(f,a),true);assert.equal(exists(f,b),true)}
  const admin=await f.call(BASE+'self-delete-capabilities');assert.equal(admin.body.protected,true);assert.equal(admin.body.canDelete,false);assert.equal((await preview(f,f.owner)).status,403);
  const p=await preview(f,a);assert.equal((await execute(f,b,p.body)).status,409);assert.equal((await execute(f,a,p.body,{approvalToken:p.body.approvalToken.replace('nps_','npa_')})).status,400);
  f.db.prepare("UPDATE account_sessions SET created_at=? WHERE id=?").run(new Date(Date.now()-301000).toISOString(),a.session);assert.equal((await preview(f,a)).body.error.code,'SELF_DELETE_FRESH_LOGIN_REQUIRED');
  f.env.ACCOUNT_SELF_DELETE_ENABLED='false';assert.equal((await preview(f,b)).status,503);
 }finally{f.close()}
});
test('only latest own preview is valid; invalid phrase and expired approval preserve all data',async()=>{
 const f=await fixture();try{const a=f.seed('self-a');const p=await preview(f,a),p2=await preview(f,a);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_admin_purge_approvals WHERE actor_id=?').get(a.id).n,1);
  assert.equal((await execute(f,a,p.body)).status,409);assert.equal((await execute(f,a,p2.body,{confirmation:'DELETE WRONG'})).status,400);
  f.db.exec("UPDATE nexus_admin_purge_approvals SET expires_at='2000-01-01T00:00:00.000Z'");assert.equal((await execute(f,a,p2.body)).status,409);assert.equal(exists(f,a),true);
 }finally{f.close()}
});
test('transaction rechecks session, method, device, membership, admin protection, expiry and state snapshot',async()=>{
 const cases=[
  f=>f.db.exec("UPDATE account_sessions SET status='revoked',revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE subject_id='self-a'"),
  f=>f.db.exec("UPDATE login_methods SET status='disabled',disabled_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE account_id='self-a'"),
  f=>f.db.exec("UPDATE account_devices SET status='revoked' WHERE subject_id='self-a'"),
  f=>f.db.exec("UPDATE nexus_alpha_members SET state='blocked',version=version+1 WHERE account_id='self-a'"),
  f=>f.db.prepare("INSERT INTO nexus_admin_grants(account_id,status,created_at) VALUES('self-a','active',?)").run(new Date().toISOString()),
  f=>f.db.prepare("UPDATE account_sessions SET created_at=? WHERE subject_id='self-a'").run(new Date(Date.now()-301000).toISOString()),
  f=>f.db.exec("UPDATE nexus_admin_purge_approvals SET expires_at='2000-01-01T00:00:00.000Z'"),
  f=>f.db.exec("UPDATE nexus_akronikl_state SET revision=revision+1 WHERE account_id='self-a'")
 ];
 for(const mutate of cases){const f=await fixture();try{const a=f.seed('self-a'),b=f.seed('self-b');seedState(f,a);seedState(f,b);const p=await preview(f,a);assert.equal(p.status,200);f.beforeBatch(()=>mutate(f));const r=await execute(f,a,p.body);assert.equal(r.status,409,JSON.stringify(r.body));assert.equal(exists(f,a),true);assert.equal(exists(f,b),true);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_akronikl_state WHERE account_id=?').get(a.id).n,3);assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(),[])}finally{f.close()}}
});
test('OAuth method name without verified identity/receipt is insufficient',async()=>{
 const f=await fixture();try{const a=f.seed('self-oauth',{kind:'oauth'});assert.equal((await f.call(BASE+'self-delete-capabilities',{actor:a})).body.freshLogin,false);assert.equal((await preview(f,a)).body.error.code,'SELF_DELETE_FRESH_LOGIN_REQUIRED')}finally{f.close()}
});
test('unknown schema and cross-purpose admin approval do not permit own deletion',async()=>{
 const f=await fixture();try{const a=f.seed('self-a');const r=await execute(f,a,{approvalToken:'npa_'+'x'.repeat(43),confirmation:'DELETE self-a'});assert.equal(r.status,400);f.db.exec('CREATE TABLE future_private_data(account_id TEXT)');assert.equal((await preview(f,a)).body.error.code,'PURGE_SCHEMA_REVIEW_REQUIRED');assert.equal(exists(f,a),true)}finally{f.close()}
});
test('method/path matrix never executes deletion on capabilities or GET endpoints',async()=>{
 const f=await fixture();try{const a=f.seed('self-a'),p=await preview(f,a),payload={requestId:randomUUID(),version:1,approvalToken:p.body.approvalToken,confirmation:p.body.confirmation};
  assert.equal((await f.call(BASE+'self-delete-capabilities',{actor:a,method:'POST',payload})).status,404);
  for(const path of ['self-delete','self-delete-preview'])assert.equal((await f.call(BASE+path,{actor:a,method:'GET'})).status,404);
  assert.equal(exists(f,a),true);assert.equal((await execute(f,a,p.body)).status,200);
 }finally{f.close()}
});
async function oauthAccount(f){
 const hash=v=>createHash('sha256').update(v).digest('hex'),path='/api/v2/account/internal/oauth';
 const call=async data=>{const body=JSON.stringify(data),stamp=String(Date.now()),nonce=randomBytes(16).toString('hex'),sig=createHmac('sha256',f.env.OAUTH_SERVICE_KEY).update(['v1','POST',path,stamp,nonce,hash(body)].join('\n')).digest('hex');const r=await handleOAuthService(new Request('https://synthetic.invalid'+path,{method:'POST',body,headers:{'content-type':'application/json','x-nexus-service-timestamp':stamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':sig}}),f.env);const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));return value};
 f.db.exec("UPDATE nexus_alpha_settings SET registration_mode='open' WHERE id=1");
 const stateHash=hash(randomUUID()),flowHash=hash(randomUUID());await call({op:'begin',provider:'yandex',intent:'login',stateHash,flowHash,codeVerifier:'A'.repeat(43),nonce:'B'.repeat(43)});
 const claimed=await call({op:'claim',provider:'yandex',stateHash,flowHash});const complete=await call({op:'complete',txId:claimed.txId,flowHash,profile:{issuer:'https://login.yandex.ru',subject:'synthetic-own-oauth',email:null,emailVerified:false,displayName:'Synthetic OAuth'}});
 const session=f.db.prepare('SELECT id,subject_id FROM account_sessions WHERE secret_hash=?').get(hash(complete.sessionSecret));return {id:session.subject_id,session:session.id,secret:complete.sessionSecret};
}
test('verified OAuth flow can delete own account; receipt removal between preview and commit rolls back',async()=>{
 for(const race of [false,true]){const f=await fixture();try{const a=await oauthAccount(f),b=f.seed('self-b');seedState(f,a);const caps=await f.call(BASE+'self-delete-capabilities',{actor:a});assert.equal(caps.body.freshLogin,true);assert.deepEqual(caps.body.providers,['yandex']);assert.equal(caps.body.hasPasskey,false);const p=await preview(f,a);assert.equal(p.status,200);
  if(race)f.beforeBatch(()=>f.db.prepare('DELETE FROM nexus_oauth_receipts WHERE account_id=?').run(a.id));const r=await execute(f,a,p.body);assert.equal(r.status,race?409:200);assert.equal(exists(f,a),race);assert.equal(exists(f,b),true);assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{f.close()}}
});
test('actual BFF validates own deletion response, revokes runtime owner and never clears another tab’s session cookie',async()=>{
 const f=await fixture();try{const a=f.seed('self-a'),b=f.seed('self-b'),revoked=[];
  Object.assign(f.env,{ACCOUNT_CONTROL_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',COOKIE_INGRESS_V3_ENABLED:'true'});
  const handler=createAccountControlHandler({env:f.env,onAccountDeleted:id=>revoked.push(id),fetchImpl:async(url,options)=>handleAdminService(new Request(url,options),f.env)});
  const request=async(path,{method='GET',body,session=a.secret}={})=>{const headers={host:new URL(GATEWAY_ORIGIN).host,cookie:'__Host-nexus_session='+session,'x-nexus-account-expectation':a.id,'x-yc-apigateway-operation-context':Buffer.from(JSON.stringify({accountControlContract:'v3'})).toString('base64'),...(method==='POST'?{origin:GATEWAY_ORIGIN,'content-type':'application/json','x-nexus-account-control':'1'}:{})};const req=Readable.from(body?[JSON.stringify(body)]:[]);Object.assign(req,{url:BASE+path,method,headers,rawHeaders:Object.entries(headers).flat()});let result;await handler(req,{writeHead(status,headers){result={status,headers}},end(data){result.body=JSON.parse(data)}});return result};
  assert.equal((await request('self-delete-capabilities')).body.canDelete,true);
  const p=await request('self-delete-preview',{method:'POST',body:{requestId:randomUUID(),version:1}});assert.equal(p.status,200);assert.equal(p.headers['set-cookie'],undefined);
  const bad=await request('self-delete',{method:'POST',body:{requestId:randomUUID(),version:1,approvalToken:p.body.approvalToken,confirmation:'WRONG'}});assert.equal(bad.status,400);assert.equal(bad.headers['set-cookie'],undefined);assert.deepEqual(revoked,[]);
  const done=await request('self-delete',{method:'POST',body:{requestId:randomUUID(),version:1,approvalToken:p.body.approvalToken,confirmation:p.body.confirmation}});assert.equal(done.status,200);assert.deepEqual(revoked,[a.id]);assert.equal(done.headers['set-cookie'],undefined);assert.equal((await request('self-delete-capabilities')).status,401);assert.equal((await f.call(BASE+'self-delete-capabilities',{actor:b})).body.canDelete,true);assert.equal(exists(f,a),false);assert.equal(exists(f,b),true);
 }finally{f.close()}
});
