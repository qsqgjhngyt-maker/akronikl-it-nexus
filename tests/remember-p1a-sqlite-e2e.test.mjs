// Isolated P1A: real SQLite transaction/trigger + signed BFF<->Worker protocol.
// No live Gateway/Worker/Cloudflare, no network listeners or real credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {Readable} from 'node:stream';
import {randomBytes,createHash} from 'node:crypto';
import {createRememberBffHandler} from '../server-access/bff/remember-device-transport.mjs';
import {createRememberInternalHandler} from '../server-access/worker/remember-device-internal.mjs';
import {createRememberD1Repository} from '../server-access/worker/remember-device-d1.mjs';
import {createRememberDeviceCore} from '../server-access/worker/remember-device-core.mjs';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from '../server-access/bff/account-read.mjs';
import {REMEMBER_COOKIE,SESSION_COOKIE,REMEMBER_INTERNAL_PATH} from '../server-access/remember-device-transport-contract.mjs';
const date=()=>new Date().toISOString();
function make(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 sqlite.exec(`CREATE TABLE account_subjects(id TEXT PRIMARY KEY,status TEXT NOT NULL);
 CREATE TABLE account_devices(id TEXT PRIMARY KEY,subject_id TEXT,status TEXT NOT NULL);
 CREATE TABLE login_methods(id TEXT PRIMARY KEY,account_id TEXT,status TEXT NOT NULL);
 CREATE TABLE account_sessions(id TEXT PRIMARY KEY,subject_id TEXT,device_id TEXT,secret_hash TEXT UNIQUE,
 status TEXT NOT NULL,auth_strength TEXT NOT NULL,created_at TEXT,last_seen_at TEXT,idle_expires_at TEXT,absolute_expires_at TEXT,revoked_at TEXT,revoked_reason TEXT);
 CREATE TABLE session_login_methods(session_id TEXT PRIMARY KEY,login_method_id TEXT,account_id TEXT,created_at TEXT);
 CREATE TABLE nexus_alpha_members(account_id TEXT PRIMARY KEY,state TEXT NOT NULL);
 CREATE TABLE synthetic_private_projects(id TEXT PRIMARY KEY,payload TEXT NOT NULL);`);
 sqlite.exec(readFileSync(new URL('../server-access/migrations/0008_account_service_nonces.sql',import.meta.url),'utf8'));
 sqlite.exec(readFileSync(new URL('../docs/ru/identity/proposals/SESSION_REMEMBER_0017_D1_DRAFT.sql.txt',import.meta.url),'utf8'));
 // Node v22 node:sqlite positional parameters do not accept D1 numeric ?1 syntax.
 // This adapter expands repeated numbered placeholders, preserving exact D1 bindings.
 const adapt=(sql,args)=>{const actual=[];const statement=sql.replace(/\?(\d+)/g,(_,index)=>{
  const pos=Number(index)-1;if(pos<0||pos>=args.length)throw Error('D1_BIND_INVALID');
  actual.push(args[pos]);return '?';
 });return {statement,actual:actual.length?actual:args}};
 const D1={prepare(sql){return {bind(...args){const {statement,actual}=adapt(sql,args);return {
  async first(){return sqlite.prepare(statement).get(...actual)||null},
  async all(){return {results:sqlite.prepare(statement).all(...actual),success:true}},
  async run(){const r=sqlite.prepare(statement).run(...actual);return {success:true,meta:{changes:Number(r.changes)}}},
  _run(){const r=sqlite.prepare(statement).run(...actual);return {success:true,meta:{changes:Number(r.changes)}}}
 }}}},async batch(stmts){sqlite.exec('BEGIN');try{const out=stmts.map(x=>x._run());sqlite.exec('COMMIT');return out}
  catch(error){sqlite.exec('ROLLBACK');throw error}}};
 const account='synthetic-account',device='synthetic-device',method='synthetic-method',sessionId='synthetic-source-session';
 const rawSession='nxs_'+randomBytes(32).toString('base64url');
 const hash=createHash('sha256').update(rawSession).digest('hex');
 const now=Date.now(),iso=x=>new Date(x).toISOString();
 sqlite.prepare("INSERT INTO account_subjects VALUES(?,'active')").run(account);
 sqlite.prepare("INSERT INTO account_devices VALUES(?,?,'active')").run(device,account);
 sqlite.prepare("INSERT INTO login_methods VALUES(?,?,'active')").run(method,account);
 sqlite.prepare("INSERT INTO account_sessions(id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES(?,?,?,?,'active','account-method-v1',?,?,?,?)")
  .run(sessionId,account,device,hash,iso(now-5000),iso(now-5000),iso(now+1800000),iso(now+43200000));
 sqlite.prepare('INSERT INTO session_login_methods VALUES(?,?,?,?)').run(sessionId,method,account,iso(now-5000));
 sqlite.prepare('INSERT INTO synthetic_private_projects VALUES(?,?)').run('existing-project','byte-exact-original');
 const key=randomBytes(48).toString('hex');const env={REMEMBER_DEVICE_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',COOKIE_INGRESS_V3_ENABLED:'true',REMEMBER_SERVICE_KEY:key,DB:D1};
 const repository=createRememberD1Repository(D1,{alphaAccess:async()=>true});
 const core=createRememberDeviceCore({repository});
 const worker=createRememberInternalHandler({env,core});
 const bff=createRememberBffHandler({env,fetchImpl:async(url,options)=>{
  assert.equal(url,WORKER_ORIGIN+REMEMBER_INTERNAL_PATH);return worker(new Request(url,options));
 }});
 const marker=Buffer.from(JSON.stringify({rememberIngressContract:'v3'})).toString('base64');
 async function request(action,cookie,body=action==='enroll'?'{"remember":true}':'{}'){
  const raw=['Host',new URL(GATEWAY_ORIGIN).host,'Origin',GATEWAY_ORIGIN,
   'Sec-Fetch-Site','same-origin','X-Nexus-Remember-Write','1','Content-Type','application/json',
   'X-Yc-Apigateway-Operation-Context',marker,...(cookie?['Cookie',cookie]:[])];
  const headers={};for(let i=0;i<raw.length;i+=2)headers[raw[i].toLowerCase()]=raw[i+1];
  const req=Readable.from([Buffer.from(body)]);Object.assign(req,{method:'POST',url:'/api/v2/account/remember/'+action,rawHeaders:raw,headers});
  const res={writeHead(status,h){this.status=status;this.headers=h},end(value){this.body=String(value??'')}};
  await bff(req,res);return res;
 }
 return {sqlite,env,rawSession,request,dispose(){sqlite.close()}};
}
const value=(res,name)=>res.headers?.['set-cookie']?.find(x=>x.startsWith(name+'='))?.split(';')[0];
test('signed BFF to Worker + SQLite D1 transaction enroll/renew/revoke keeps existing project intact',async()=>{
 const f=make();try{
  const e=await f.request('enroll',SESSION_COOKIE+'='+f.rawSession);
  assert.equal(e.status,204);
  const remember=value(e,REMEMBER_COOKIE);assert.ok(remember);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM nexus_remembered_grants').get().n,1);
  const n=await f.request('renew',remember);assert.equal(n.status,204);
  const newRemember=value(n,REMEMBER_COOKIE),newSession=value(n,SESSION_COOKIE);
  assert.ok(newRemember&&newSession);
  const weak=f.sqlite.prepare("SELECT auth_strength FROM account_sessions WHERE auth_strength='remembered-device-v1'").get();
  assert.equal(weak?.auth_strength,'remembered-device-v1');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM nexus_remembered_renewal_receipts').get().n,1);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM nexus_remembered_spent').get().n,1);
  const retry=await f.request('renew',remember);assert.equal(retry.status,409);
  const logout=await f.request('revoke',newRemember);assert.equal(logout.status,204);
  assert.equal((await f.request('renew',newRemember)).status,401);
  assert.equal(f.sqlite.prepare("SELECT status FROM account_sessions WHERE auth_strength='remembered-device-v1'").get().status,'revoked');
  assert.equal(f.sqlite.prepare('SELECT payload FROM synthetic_private_projects').get().payload,'byte-exact-original');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM account_service_nonces').get().n,5);
 }finally{f.dispose()}
});
