// Только синтетические in-memory SQLite, req/res и fetch. Нет listen(), браузера или сети.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {Readable} from 'node:stream';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {createCloudSessionHandler} from './bff/cloud-session.mjs';
import {createCloudSessionService,CLOUD_INTERNAL_PATH,cloudOperationPath} from './worker/cloud-session-service.mjs';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from './bff/account-read.mjs';

const db=new DatabaseSync(':memory:');
for(const path of [
  '../cloudflare/nexus-sync-worker/migrations/0001_sync_team_foundation.sql',
  '../cloudflare/nexus-sync-worker/migrations/0002_nexus_account_tokens.sql',
  '../cloudflare/nexus-sync-worker/migrations/0003_d1_only_project_snapshots.sql',
  '../cloudflare/nexus-sync-worker/migrations/0004_identity_v2_session_foundation.sql',
  './migrations/0005_login_methods_registry.sql','./migrations/0006_account_lifecycle_hardening.sql',
  './migrations/0007_identity_owner_and_issuance_guards.sql','./migrations/0008_account_service_nonces.sql'
])db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
const d1={prepare(sql){return{bind(...values){return{
  async first(){return db.prepare(sql).get(...values)||null},
  async all(){return{success:true,results:db.prepare(sql).all(...values)}},
  async run(){return this._run()},
  _run(){const result=db.prepare(sql).run(...values);return{success:true,meta:{changes:Number(result.changes)}}}
}}}},async batch(statements){db.exec('BEGIN');try{const results=statements.map(x=>x._run());db.exec('COMMIT');return results}
  catch(error){db.exec('ROLLBACK');throw error}}};
const key='SYNTHETIC_CLOUD_SERVICE_ONLY_NEVER_DEPLOY_20261019';
const sessions={a:'nxs_'+'A'.repeat(43),b:'nxs_'+'B'.repeat(43),c:'nxs_'+'C'.repeat(43)};
const start=new Date(Date.now()-60000).toISOString(),future=new Date(Date.now()+3600000).toISOString();
const hash=value=>createHash('sha256').update(value).digest('hex');
for(const [id,session] of Object.entries(sessions)){
  db.prepare(`INSERT INTO account_subjects(id,display_name,status,created_at,updated_at) VALUES(?,?,'active',?,?)`).run(id,'Synthetic '+id,start,start);
  db.prepare(`INSERT INTO account_devices(id,subject_id,status,first_seen_at,last_seen_at) VALUES(?,?,'active',?,?)`).run('device-'+id,id,start,start);
  db.prepare(`INSERT INTO login_methods(id,account_id,kind,status,created_at) VALUES(?,?,?,'active',?)`).run('method-'+id,id,id==='c'?'oauth':'passkey',start);
  db.prepare(`INSERT INTO account_sessions(id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at)
    VALUES(?,?,?,?,'active','account-method-v1',?,?,?,?)`).run('session-'+id,id,'device-'+id,hash(session),start,start,future,future);
  db.prepare(`INSERT INTO session_login_methods(session_id,login_method_id,account_id,created_at) VALUES(?,?,?,?)`).run('session-'+id,'method-'+id,id,start);
}
const env={CLOUD_SESSION_ENABLED:'true',CLOUD_SERVICE_KEY:key,DB:d1,AUTH_MODE:'nexus-token',
  FIRST_PARTY_SESSION_ENABLED:'false',FIRST_PARTY_DEPLOYMENT_CONFIRMED:'false'};
const bffEnv={CLOUD_SESSION_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',CLOUD_SERVICE_KEY:key};
const worker=createCloudSessionService();let calls=0,tests=0;
const bridge=async(url,options)=>{
  calls++;assert.equal(url,WORKER_ORIGIN+CLOUD_INTERNAL_PATH);
  assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');
  assert.ok(options.signal instanceof AbortSignal);
  const headers=new Headers(options.headers);assert.equal(headers.has('cookie'),false);assert.equal(headers.has('authorization'),false);
  return worker(new Request(url,options),env);
};
function request({path='/api/v2/cloud/me',method='GET',session=sessions.a,payload,headers={},rawHeaders,body}={}){
  const context=Buffer.from(JSON.stringify({accountReadContract:'v1',sessionCookie:session})).toString('base64');
  const normalized={host:new URL(GATEWAY_ORIGIN).host,'x-yc-apigateway-operation-context':context,
    'x-nexus-cloud-account':Object.entries(sessions).find(([,value])=>value===session)?.[0]||'a',
    ...(method==='PUT'?{origin:GATEWAY_ORIGIN,'content-type':'application/json','x-nexus-cloud-request':'1'}:{}),...headers};
  const req=Readable.from([Buffer.from(body??(payload===undefined?'':JSON.stringify(payload)))]);
  Object.assign(req,{url:path,method,headers:normalized,rawHeaders:rawHeaders||Object.entries(normalized).flat()});return req;
}
async function run(req,{fetchImpl=bridge,...options}={}){
  const res={writeHead(status,headers){this.status=status;this.headers=headers},end(body){this.raw=String(body);this.body=JSON.parse(body)}};
  const handled=await createCloudSessionHandler({env:bffEnv,fetchImpl,...options})(req,res);
  if(handled){assert.equal(res.headers['cache-control'],'no-store');assert.equal(res.headers.vary,'*');
    for(const secret of [...Object.values(sessions),key])assert.equal(res.raw.includes(secret),false)}
  return{handled,...res};
}
async function check(name,fn){await fn();tests++;console.log('PASS '+name)}
const project={id:'existing-stable-id',title:'Синтетический проект',languageId:'cpp',
  workspace:{files:[{path:'src/main.cpp',content:'int main(){return 0;}',language:'cpp'}],entryFile:'src/main.cpp'},
  access:{ownerId:'a',workspaceId:'existing-workspace-id',workspaceKind:'personal',
    members:[{subjectId:'a',role:'owner',status:'active'}],policies:[]},
  progress:{completed:['cpp-stable-lesson-id']},checkpoints:[{id:'checkpoint-unchanged'}]};

await check('bridge выключен по умолчанию; неподтверждённая сессия не вызывает Cloud',async()=>{
  const before=calls;let result=await run(request(),{env:{...bffEnv,CLOUD_SESSION_PROXY_ENABLED:'false'}});
  assert.equal(result.status,503);
  result=await run(request({session:'-'}));assert.equal(result.status,401);assert.equal(calls,before);
  const outside=await run(request({path:'/api/v1/bootstrap'}));assert.equal(outside.handled,false);
  const disabled=await worker(new Request(WORKER_ORIGIN+CLOUD_INTERNAL_PATH),{...env,CLOUD_SESSION_ENABLED:'false'});
  assert.equal(disabled.status,404);
});
await check('одна существующая Passkey/OAuth session даёт Cloud subject без второго token',async()=>{
  for(const id of ['a','b','c']){const result=await run(request({session:sessions[id]}));assert.equal(result.status,200);
    assert.deepEqual(result.body,{subject:{id,displayName:'Synthetic '+id},authMode:'nexus-session'})}
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM account_tokens').get().count,0);
});
await check('создание и pull сохраняют stable IDs, owner, workspace, прогресс и файлы',async()=>{
  const result=await run(request({path:'/api/v2/cloud/projects/'+project.id,method:'PUT',payload:{project,baseRevision:null}}));
  assert.equal(result.status,200);assert.equal(result.body.projectId,project.id);assert.equal(result.body.revision,1);
  const pulled=await run(request({path:'/api/v2/cloud/projects/'+project.id}));assert.equal(pulled.status,200);
  assert.deepEqual(pulled.body.project,project);
  const row=db.prepare('SELECT * FROM projects WHERE id=?').get(project.id);
  assert.equal(row.owner_subject_id,'a');assert.equal(row.workspace_id,project.access.workspaceId);
});
await check('другой аккаунт не получает проект и не может переписать owner',async()=>{
  const before=db.prepare('SELECT snapshot_json FROM project_snapshots WHERE project_id=?').get(project.id).snapshot_json;
  const list=await run(request({path:'/api/v2/cloud/projects',session:sessions.b}));assert.equal(list.status,200);assert.deepEqual(list.body.projects,[]);
  for(const method of ['GET','PUT']){const result=await run(request({path:'/api/v2/cloud/projects/'+project.id,session:sessions.b,method,
    ...(method==='PUT'?{payload:{project:{...project,access:{...project.access,ownerId:'b'}},baseRevision:1}}:{})}));assert.equal(result.status,403);assert.equal(result.body.error.code,'FORBIDDEN')}
  assert.equal(db.prepare('SELECT owner_subject_id FROM projects WHERE id=?').get(project.id).owner_subject_id,'a');
  assert.equal(db.prepare('SELECT snapshot_json FROM project_snapshots WHERE project_id=?').get(project.id).snapshot_json,before);
});
await check('revision conflict и audit используют неизменённый legacy engine',async()=>{
  const result=await run(request({path:'/api/v2/cloud/projects/'+project.id,method:'PUT',payload:{project,baseRevision:0}}));
  assert.equal(result.status,409);assert.equal(result.body.error.code,'REVISION_CONFLICT');assert.deepEqual(result.body.error.details,{serverRevision:1,baseRevision:0});
  const audit=await run(request({path:'/api/v2/cloud/projects/'+project.id+'/audit'}));assert.equal(audit.status,200);
  assert.equal(audit.body.events.length,1);assert.equal(audit.body.events[0].actor_subject_id,'a');
});
await check('старая вкладка A с новой общей cookie B не вызывает legacy list/pull/put',async()=>{
  let legacyCalls=0;
  const guarded=createCloudSessionService({fetchLegacy:async()=>{legacyCalls++;throw Error('MUST_NOT_RUN')}});
  const before=db.prepare('SELECT snapshot_json FROM project_snapshots WHERE project_id=?').get(project.id).snapshot_json;
  const fetchImpl=(url,options)=>guarded(new Request(url,options),env);
  for(const [path,method] of [
    ['/api/v2/cloud/me','GET'],['/api/v2/cloud/projects','GET'],
    ['/api/v2/cloud/projects/'+project.id,'GET'],['/api/v2/cloud/projects/'+project.id+'/audit','GET'],
    ['/api/v2/cloud/projects/'+project.id,'PUT']
  ]){
    const result=await run(request({path,method,session:sessions.b,headers:{'x-nexus-cloud-account':'a'},
      ...(method==='PUT'?{payload:{project,baseRevision:1}}:{})}),{fetchImpl});
    assert.equal(result.status,409);assert.equal(result.body.error.code,'ACCOUNT_SESSION_CHANGED');
    assert.deepEqual(Object.keys(result.body),['error']);
  }
  assert.equal(legacyCalls,0);
  assert.equal(db.prepare('SELECT snapshot_json FROM project_snapshots WHERE project_id=?').get(project.id).snapshot_json,before);
});
await check('same-origin/CSRF, raw cookie disagreement и запрет произвольных proxy paths',async()=>{
  const before=calls;
  for(const options of [
    {headers:{host:'attacker.invalid'}},{headers:{origin:'https://attacker.invalid'}},
    {headers:{'sec-fetch-site':'cross-site'}},{headers:{authorization:'Bearer synthetic'}},
    {headers:{cookie:'__Host-nexus_session='+sessions.b}},
    {method:'PUT',path:'/api/v2/cloud/projects/id',payload:{project},headers:{'x-nexus-cloud-request':'0'}},
    {path:'/api/v2/cloud/internal'},{path:'/api/v2/cloud/projects/id?x=1'},
    {path:'/api/v2/cloud/projects/..'},{path:'/api/v2/cloud/projects/%2F'},
    {path:'/api/v2/cloud/projects/%61'},{path:'/api/v2/cloud/projects/id%5Cother'},
    {path:'/api/v2/cloud/projects/id/audit',method:'PUT',payload:{}},
    {path:'/api/v2/cloud/bootstrap',method:'PUT',payload:{}}
  ]){const result=await run(request(options));assert.ok([401,403,404].includes(result.status))}
  for(const header of [undefined,'','../escape','a,b','a'.repeat(161)]){
    const result=await run(request({headers:{'x-nexus-cloud-account':header}}));assert.equal(result.status,400);
    assert.equal(result.body.error.code,'ACCOUNT_EXPECTATION_REQUIRED');
  }
  assert.equal(calls,before);
  assert.equal(cloudOperationPath('GET','/api/v1/projects/'+encodeURIComponent('импорт:проект')),
    '/api/v1/projects/'+encodeURIComponent('импорт:проект'));
});
function signed({payload={method:'GET',path:'/api/v1/me',payload:null,sessionCookie:sessions.a,expectedAccountId:'a'},
  nonce=randomBytes(16).toString('hex'),stamp=String(Date.now()),path=CLOUD_INTERNAL_PATH,headers={},wrongKey=false}={}){
  const body=JSON.stringify(payload);const signature=createHmac('sha256',wrongKey?'wrong-synthetic-key':key)
    .update(`v1\nPOST\n${CLOUD_INTERNAL_PATH}\n${stamp}\n${nonce}\n${hash(body)}`).digest('hex');
  return new Request(WORKER_ORIGIN+path,{method:'POST',body,headers:{'content-type':'application/json',
    'x-nexus-service-timestamp':stamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature,...headers}})
}
await check('HMAC закрывает tamper, replay, expiry, cookie/bearer и accountId injection',async()=>{
  const fixed=randomBytes(16).toString('hex');assert.equal((await worker(signed({nonce:fixed}),env)).status,200);
  assert.equal((await worker(signed({nonce:fixed}),env)).status,401);
  for(const options of [{wrongKey:true},{stamp:String(Date.now()-31000)},
    {headers:{cookie:'synthetic=only'}},{headers:{authorization:'Bearer synthetic'}},
    {path:CLOUD_INTERNAL_PATH+'?x=1'},
    {payload:{method:'GET',path:'/api/v1/me',payload:null,sessionCookie:sessions.a,expectedAccountId:'a',accountId:'b'}},
    {payload:{method:'POST',path:'/api/v1/bootstrap',payload:{},sessionCookie:sessions.a,expectedAccountId:'a'}},
    {payload:{method:'GET',path:'/api/v1/me',payload:null,sessionCookie:'nxs_'+'X'.repeat(43),expectedAccountId:'a'}}
  ])assert.equal((await worker(signed(options),env)).status,401);
});
await check('отключённый method/device, legacy bridge и истёкшая session отвергаются до legacy.fetch',async()=>{
  let legacyCalls=0;const guarded=createCloudSessionService({fetchLegacy:async()=>{legacyCalls++;throw Error()}});
  db.prepare(`UPDATE account_sessions SET auth_strength='legacy-bridge' WHERE id='session-a'`).run();
  assert.equal((await guarded(signed(),env)).status,401);
  db.prepare(`UPDATE account_sessions SET auth_strength='account-method-v1',idle_expires_at=? WHERE id='session-a'`).run(start);
  assert.equal((await guarded(signed(),env)).status,401);
  db.prepare(`UPDATE account_sessions SET idle_expires_at=? WHERE id='session-a'`).run(future);
  db.prepare(`UPDATE login_methods SET status='disabled',disabled_at=? WHERE id='method-b'`).run(new Date().toISOString());
  assert.equal((await guarded(signed({payload:{method:'GET',path:'/api/v1/me',payload:null,sessionCookie:sessions.b,expectedAccountId:'b'}}),env)).status,401);
  db.prepare(`UPDATE account_devices SET status='revoked' WHERE id='device-c'`).run();
  assert.equal((await guarded(signed({payload:{method:'GET',path:'/api/v1/me',payload:null,sessionCookie:sessions.c,expectedAccountId:'c'}}),env)).status,401);
  assert.equal(legacyCalls,0);
});
await check('нет credential echo, Set-Cookie/CORS от legacy и скрытых token полей в /me',async()=>{
  const injected=createCloudSessionService({fetchLegacy:async()=>Response.json({subject:{id:'a',displayName:'ignored'},
    token:'synthetic-token',sessionSecret:'synthetic-secret',bootstrapSecret:'synthetic-bootstrap'},
    {headers:{'set-cookie':'synthetic=hidden','access-control-allow-origin':'https://attacker.invalid'}})});
  const response=await injected(signed(),env);assert.equal(response.status,200);
  assert.equal(response.headers.has('set-cookie'),false);assert.equal(response.headers.has('access-control-allow-origin'),false);
  assert.deepEqual(await response.json(),{subject:{id:'a',displayName:'Synthetic a'},authMode:'nexus-session'});
  const echo=createCloudSessionService({fetchLegacy:async()=>Response.json({subject:{id:'a',displayName:sessions.a}})});
  const rejected=await echo(signed(),env);assert.equal(rejected.status,502);assert.equal((await rejected.text()).includes(sessions.a),false);
  const bffEcho=await run(request(),{fetchImpl:async()=>Response.json({cookie:sessions.a})});assert.equal(bffEcho.status,502);
});
await check('невалидный JSON/размер/ответ не дают частичную запись проекта',async()=>{
  const revisions=db.prepare('SELECT COUNT(*) AS count FROM project_revisions').get().count;
  const invalid=await run(request({method:'PUT',path:'/api/v2/cloud/projects/another',body:'{'}));assert.equal(invalid.status,400);
  const huge=await run(request({method:'PUT',path:'/api/v2/cloud/projects/another',body:' '.repeat(1_550_001)}));assert.equal(huge.status,413);
  const failed=await run(request(),{fetchImpl:async()=>new Response('<html>gateway error</html>',{status:503,headers:{'content-type':'text/html'}})});assert.equal(failed.status,502);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM project_revisions').get().count,revisions);
});
db.close();
console.log(JSON.stringify({status:'PASS',checks:tests,network:false,browser:false,production:false,
  syntheticDataOnly:true,legacySourceUnmodified:true},null,2));
