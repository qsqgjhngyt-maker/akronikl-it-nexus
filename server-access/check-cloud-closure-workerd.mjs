// Actual candidate BFF -> HMAC -> workerd/D1 -> unchanged legacy ACL/revision engine.
// All sessions are generated in a disposable in-memory fixture. No outbound network.
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import {controlFixture} from '../tests/helpers/control-fixture.mjs';
import {createCloudSessionHandler} from './bff/cloud-session.mjs';
import {GATEWAY_ORIGIN} from './bff/account-read.mjs';
const resultFile=process.argv[2];if(!resultFile)throw Error('RESULT_PATH_REQUIRED');
const f=await controlFixture(),a=f.owner,b=f.seed('synthetic-cloud-b'),checks=[];
let outbound=0,calls=0,failure;
const key='SYNTHETIC_CLOSURE_CLOUD_SERVICE_KEY_ONLY';
const mf=new Miniflare({modules:true,scriptPath:fileURLToPath(new URL('worker-bundle/entry.mjs',import.meta.url)),compatibilityDate:'2026-09-23',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'synthetic-cloud-closure'},bindings:{CLOUD_SESSION_ENABLED:'true',CLOUD_SERVICE_KEY:key,AUTH_MODE:'nexus-token',ALPHA_ADMISSION_ENABLED:'true'},outboundService:()=>{outbound++;return new Response('FORBIDDEN',{status:503})}});
const handler=createCloudSessionHandler({env:{CLOUD_SESSION_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',CLOUD_SERVICE_KEY:key},fetchImpl:async(url,options)=>{calls++;assert.equal(new Headers(options.headers).has('cookie'),false);return mf.dispatchFetch(url,options)}});
async function call(path,{method='GET',actor=a,expected=actor.id,project,baseRevision}={}){
 const cookie='lab_a=1; __Host-nexus_session='+actor.secret+'; lab_b=2';
 const headers={host:new URL(GATEWAY_ORIGIN).host,'x-nexus-cloud-account':expected,cookie,'x-yc-apigateway-operation-context':Buffer.from(JSON.stringify({accountReadContract:'v2',cookieHeader:cookie})).toString('base64'),...(method==='PUT'?{origin:GATEWAY_ORIGIN,'content-type':'application/json','x-nexus-cloud-request':'1'}:{})};
 const req=Readable.from(method==='PUT'?[Buffer.from(JSON.stringify({project,baseRevision}))]:[]);Object.assign(req,{url:'/api/v2/cloud/'+path,method,headers,rawHeaders:Object.entries(headers).flat()});
 const res={writeHead(status,headers){this.status=status;this.headers=headers},end(raw){this.body=JSON.parse(raw);assert.ok(!String(raw).includes(actor.secret))}};
 assert.equal(await handler(req,res),true);assert.equal(res.headers['cache-control'],'no-store');assert.equal(res.headers.vary,'*');return res;
}
const check=async(name,fn)=>{const start=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-start)});console.log('PASS '+name)};
let db;
try{
 db=await mf.getD1Database('DB');
 await check('reproducible production compatibility date applies exact SQL in actual local D1',async()=>{
  const migrations=['0001_sync_team_foundation','0002_nexus_account_tokens','0003_d1_only_project_snapshots','0004_identity_v2_session_foundation'].map(n=>'../cloudflare/nexus-sync-worker/migrations/'+n+'.sql');
  migrations.push(...['0005_login_methods_registry','0006_account_lifecycle_hardening','0007_identity_owner_and_issuance_guards','0008_account_service_nonces','0009_passkeys','0010_feedback','0011_oauth_service','0012_alpha_administration','0013_account_avatars','0014_community_content','0015_blog_media'].map(n=>'migrations/'+n+'.sql'));
  for(const name of migrations)await db.exec((await readFile(new URL(name,import.meta.url),'utf8')).split(/\r?\n/).filter(l=>!l.trimStart().startsWith('--')).join(' '));
  for(const table of ['account_subjects','login_methods','nexus_passkey_users','nexus_passkey_credentials','account_devices','account_sessions','session_login_methods','nexus_admin_grants','nexus_alpha_members'])for(const row of f.db.prepare('SELECT * FROM '+table).all()){
   const columns=Object.keys(row);await db.prepare('INSERT INTO '+table+'('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')').bind(...Object.values(row)).run();
  }
  await db.exec('UPDATE nexus_alpha_settings SET enforced=1 WHERE id=1');
 });
 const project={id:'closure-stable-project',title:'Synthetic original',languageId:'cpp',access:{ownerId:a.id,workspaceId:'closure-workspace',workspaceKind:'personal',members:[{subjectId:a.id,role:'owner',status:'active'}],policies:[]},workspace:{files:[{path:'main.cpp',content:'int main(){return 42;}',language:'cpp'}],entryFile:'main.cpp'},progress:{milestones:['stable']},checkpoints:[{id:'preserved'}]};
 await check('real BFF V2 cookie, private HMAC and D1 create/read exact stable project',async()=>{
  const put=await call('projects/'+project.id,{method:'PUT',project,baseRevision:null});assert.equal(put.status,200,JSON.stringify(put.body));assert.equal(put.body.revision,1);
  const get=await call('projects/'+project.id);assert.equal(get.status,200);assert.deepEqual(get.body.project,project);
 });
 await check('409 REVISION_CONFLICT preserves first writer, snapshot, revision and audit; corrected revision succeeds',async()=>{
  const before=await db.prepare('SELECT snapshot_json FROM project_snapshots WHERE project_id=?').bind(project.id).first();
  const changed={...project,title:'Synthetic conflict must not overwrite'};
  const conflict=await call('projects/'+project.id,{method:'PUT',project:changed,baseRevision:0});assert.equal(conflict.status,409);assert.deepEqual(conflict.body.error,{code:'REVISION_CONFLICT',details:{serverRevision:1,baseRevision:0}});
  assert.deepEqual(await db.prepare('SELECT snapshot_json FROM project_snapshots WHERE project_id=?').bind(project.id).first(),before);
  assert.equal((await call('projects/'+project.id+'/audit')).body.events.length,1);
  const retry=await call('projects/'+project.id,{method:'PUT',project:changed,baseRevision:1});assert.equal(retry.status,200);assert.equal(retry.body.revision,2);
  assert.deepEqual((await call('projects/'+project.id)).body.project,changed);
 });
 await check('account B cannot list, pull, overwrite or claim account A after a cookie switch',async()=>{
  assert.deepEqual((await call('projects',{actor:b})).body.projects,[]);
  for(const path of ['me','projects','projects/'+project.id,'projects/'+project.id+'/audit']){const r=await call(path,{actor:b,expected:a.id});assert.equal(r.status,409);assert.equal(r.body.error.code,'ACCOUNT_SESSION_CHANGED')}
  for(const method of ['GET','PUT']){const r=await call('projects/'+project.id,{actor:b,method,project:{...project,access:{...project.access,ownerId:b.id}},baseRevision:2});assert.equal(r.status,403)}
  const r=await call('projects/'+project.id,{actor:b,expected:a.id,method:'PUT',project,baseRevision:2});assert.equal(r.status,409);
  assert.equal((await call('projects/'+project.id)).body.meta.revision,2);
 });
 await check('logout/revocation makes old cookie unusable without modifying projects or the other account',async()=>{
  const before=await db.prepare('SELECT snapshot_json FROM project_snapshots WHERE project_id=?').bind(project.id).first();
  await db.prepare("UPDATE account_sessions SET status='revoked' WHERE id=?").bind(a.session).run();
  for(const path of ['me','projects','projects/'+project.id])assert.equal((await call(path)).status,401);
  assert.equal((await call('projects/'+project.id,{method:'PUT',project,baseRevision:2})).status,401);
  assert.deepEqual(await db.prepare('SELECT snapshot_json FROM project_snapshots WHERE project_id=?').bind(project.id).first(),before);
  assert.equal((await call('me',{actor:b})).status,200);assert.equal((await db.prepare('SELECT count(*) n FROM account_tokens').first()).n,0);
 });
 assert.equal(outbound,0);
}catch(error){failure={message:error.message,stack:String(error.stack).slice(0,4000)};console.error(error)}
finally{await mf.dispose();f.close();await writeFile(resultFile,JSON.stringify({status:failure?'FAIL':'PASS',checks,failure,bridgeRequests:calls,outboundRequests:outbound,compatibilityDate:'2026-09-23',runtime:'actual workerd/D1',realCredentials:false,production:false},null,2)+'\n',{flag:'wx'});if(failure)process.exitCode=1}
