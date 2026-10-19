// Unified Cloud: реальные frontend modules, только синтетические Storage/fetch; без сети и браузера.
import assert from 'node:assert/strict';
import {initializeAccountStorage,verifiedAccount,lockAccountStorage,accountLocalStorage} from '../core/account-storage.js';
import {SERVER_ACCOUNT_ORIGIN} from '../core/server-account-origin.js';
import {serverCloudRequest,serverCloudSessionAvailable,cloudRoute} from '../sync/server-cloud-client.js';
import {loadCloudflareSyncConfig,saveCloudflareSyncConfig,cloudflareSyncConfigured} from '../sync/cloudflare-config.js';
import {cloudMe,cloudHealth,listCloudProjects,cloudSyncCredentialState,bootstrapCloudAccount,connectCloudAccount,
  disconnectCloudAccount,pushProjectNow,enableProjectCloud,pullProjectNow} from '../sync/cloud-sync.js';
import {createProject,getProject,putProject,projectStorageKey} from '../project-studio/project-store.js';

class MemoryStorage {
  constructor(entries=[]){this.data=new Map(entries)}
  get length(){return this.data.size}key(index){return [...this.data.keys()][index]??null}
  getItem(key){return this.data.get(String(key))??null}
  setItem(key,value){this.data.set(String(key),String(value))}
  removeItem(key){this.data.delete(String(key))}
}
const A='synthetic-unified-cloud-a',B='synthetic-unified-cloud-b';
const key=name=>'akronikl:it-nexus:'+name+':v1';
const identity={schemaVersion:1,localPrincipalId:'local-synthetic-owner',deviceId:'synthetic-device',
  personalWorkspaceId:'synthetic-workspace-preserved',accountSubjectId:A,accountState:'cloud-linked',createdAt:'original',updatedAt:'original'};
const originalProject={id:'local-stable-project-id',schemaVersion:2,title:'Сохранённый локальный проект',languageId:'cpp',
  access:{ownerId:identity.localPrincipalId,workspaceId:identity.personalWorkspaceId,workspaceKind:'personal',
    members:[{subjectId:identity.localPrincipalId,role:'owner',status:'active'}],policies:[]},
  sync:{localRevision:7,revision:7,mode:'local-only',provider:'none'},manifest:{entryFile:'src/main.cpp'},
  workspace:{files:[{path:'src/main.cpp',content:'int main(){return 17;}',languageId:'cpp'}]},
  progress:{milestones:['cpp-existing-stable-id']},checkpoints:[{id:'original-checkpoint'}]};
const originals=new Map([[key('identity'),JSON.stringify(identity)],
  [projectStorageKey(),JSON.stringify({schemaVersion:2,projects:{[originalProject.id]:originalProject},updatedAt:'original'})],
  [key('cloudflare-sync'),JSON.stringify({schemaVersion:1,baseUrl:'https://legacy-synthetic.invalid',subjectId:A,
    token:'nxk_SYNTHETIC_NEVER_USE_OR_TRANSMIT_123456789',displayName:'Old synthetic owner'})]]);
globalThis.localStorage=new MemoryStorage(originals);globalThis.sessionStorage=new MemoryStorage();
globalThis.location={origin:SERVER_ACCOUNT_ORIGIN};
let checks=0,calls=[];
const dto=()=>({account:{accountId:A,displayName:'Synthetic owner',status:'active'},loginMethods:[],enrollmentAvailable:false});
const clone=value=>JSON.parse(JSON.stringify(value));
let remote=new Map(),revision=0,replyMode='normal';
globalThis.fetch=async(url,options={})=>{
  const path=String(url);calls.push({path,options});
  assert.ok(path.startsWith('/api/v2/cloud/'),'Only canonical same-origin Cloud routes are permitted');
  assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');
  assert.ok(options.signal instanceof AbortSignal);assert.equal(options.signal.aborted,false);
  const headers=new Headers(options.headers);assert.equal(headers.has('authorization'),false);
  assert.equal(headers.get('x-nexus-cloud-account'),A,'Every Cloud read/write is bound to the verified document account expectation');
  assert.equal(headers.has('cookie'),false);assert.equal(headers.has('x-nexus-bootstrap-secret'),false);
  assert.equal(JSON.stringify(options).includes('nxk_SYNTHETIC'),false);
  if(options.method==='PUT'){
    assert.equal(headers.get('content-type'),'application/json');assert.equal(headers.get('x-nexus-cloud-request'),'1');
    const payload=JSON.parse(options.body);assert.ok(payload.project);assert.equal(payload.project.access.ownerId,A);
    if(replyMode==='forbidden')return Response.json({error:{code:'ACCESS_DENIED'}},{status:403});
    if(replyMode==='conflict')return Response.json({error:{code:'REVISION_CONFLICT',details:{serverRevision:9,baseRevision:payload.baseRevision}}},{status:409});
    const id=decodeURIComponent(path.slice('/api/v2/cloud/projects/'.length));assert.equal(payload.project.id,id);
    remote.set(id,clone(payload.project));revision++;
    return Response.json({ok:true,projectId:id,revision,updatedAt:'2026-10-19T00:00:00Z'});
  }
  if(path==='/api/v2/cloud/me')return Response.json({subject:{id:replyMode==='wrong-account'?B:A,displayName:'Synthetic owner'},authMode:'nexus-session'});
  if(path==='/api/v2/cloud/projects')return Response.json({projects:[...remote.values()].map(p=>({id:p.id,title:p.title,revision}))});
  if(path.endsWith('/audit'))return Response.json({events:[]});
  const match=/^\/api\/v2\/cloud\/projects\/([^/]+)$/.exec(path);
  if(match){const id=decodeURIComponent(match[1]);return Response.json({project:remote.get(id),meta:{id,revision}})}
  throw Error('Unexpected synthetic path');
};
async function check(name,fn){await fn();checks++;console.log('PASS '+name)}

await check('до подтверждённого server account ни одного Cloud запроса',async()=>{
  assert.equal(verifiedAccount(),null);assert.equal(serverCloudSessionAvailable(),false);
  await assert.rejects(serverCloudRequest('/api/v1/me'),/SERVER_SESSION_REQUIRED/);assert.equal(calls.length,0);
});
initializeAccountStorage(dto());
await check('canonical account автоматически получает Cloud без отдельного token/config',async()=>{
  const cfg=loadCloudflareSyncConfig();assert.equal(cfg.transport,'server-account');assert.equal(cfg.baseUrl,SERVER_ACCOUNT_ORIGIN);
  assert.equal(cfg.subjectId,A);assert.equal(cfg.token,'');assert.equal(cloudflareSyncConfigured(),true);
  assert.equal(cloudSyncCredentialState().mode,'nexus-cookie');assert.equal(cloudSyncCredentialState().rollbackAvailable,false);
  const who=await cloudMe();assert.equal(who.subject.id,A);assert.equal((await cloudHealth()).online,true);
  assert.equal(calls.every(c=>c.path==='/api/v2/cloud/me'),true);
});
await check('bootstrap, legacy token, relink и disconnect не обходят единый вход',async()=>{
  const before=calls.length;
  await assert.rejects(bootstrapCloudAccount({baseUrl:'https://legacy-synthetic.invalid',bootstrapSecret:'SYNTHETIC'}),/текущий вход/);
  await assert.rejects(connectCloudAccount({baseUrl:'https://legacy-synthetic.invalid',token:'nxk_SYNTHETIC'}),/текущий аккаунт/);
  await assert.rejects(disconnectCloudAccount(),/выход из Nexus/);
  assert.throws(()=>saveCloudflareSyncConfig({subjectId:B}),{code:'ACCOUNT_SUBJECT_MISMATCH'});
  assert.throws(()=>saveCloudflareSyncConfig({token:'nxk_SYNTHETIC'}),{code:'SEPARATE_CLOUD_CREDENTIAL_FORBIDDEN'});
  assert.equal(calls.length,before);assert.equal(getProject(originalProject.id).access.ownerId,identity.localPrincipalId);
});
await check('foreign origin не даёт выполнить session client request',async()=>{
  const before=calls.length;globalThis.location={origin:'https://foreign-synthetic.invalid'};
  assert.equal(serverCloudSessionAvailable(),false);await assert.rejects(serverCloudRequest('/api/v1/me'),/SERVER_SESSION_REQUIRED/);
  const cfg=loadCloudflareSyncConfig();assert.equal(cfg.token,'');assert.equal(cfg.subjectId,null);assert.equal(cloudflareSyncConfigured(),false);
  for(const operation of [cloudMe,listCloudProjects,()=>pushProjectNow(originalProject.id),cloudHealth,
    ()=>bootstrapCloudAccount({baseUrl:'https://legacy-synthetic.invalid',bootstrapSecret:'SYNTHETIC'}),
    ()=>connectCloudAccount({baseUrl:'https://legacy-synthetic.invalid',token:'nxk_SYNTHETIC'}),disconnectCloudAccount])
    await assert.rejects(operation());
  assert.throws(()=>saveCloudflareSyncConfig({subjectId:A}),{code:'SERVER_ORIGIN_REQUIRED'});
  assert.equal(calls.length,before);globalThis.location={origin:SERVER_ACCOUNT_ORIGIN};
});
await check('route/method bounds включают канонические Unicode stable IDs',async()=>{
  for(const id of ['old-project.id_1','импорт:сцена','x'.repeat(256)]){
    const encoded=encodeURIComponent(id);assert.equal(cloudRoute('/api/v1/projects/'+encoded),'/api/v2/cloud/projects/'+encoded);
    assert.equal(cloudRoute('/api/v1/projects/'+encoded+'/audit'),'/api/v2/cloud/projects/'+encoded+'/audit');
  }
  const before=calls.length;
  for(const path of ['/api/v1/bootstrap','/api/v1/projects/..','/api/v1/projects/.','/api/v1/projects/%2F',
    '/api/v1/projects/%61','/api/v1/projects/id?query=1','/api/v1/projects/id#hash','/api/v1/projects/id%5Cother',
    '/api/v1/projects/id/other','/api/v1/projects/'+'x'.repeat(257)])
    await assert.rejects(serverCloudRequest(path),/CLOUD_ROUTE_REJECTED/);
  for(const [path,method] of [['/api/v1/me','PUT'],['/api/v1/projects','PUT'],['/api/v1/projects/id/audit','PUT'],
    ['/api/v1/projects/id','POST'],['/api/v1/projects/id','DELETE']])
    await assert.rejects(serverCloudRequest(path,{method,body:{}}),/CLOUD_METHOD_REJECTED/);
  assert.equal(calls.length,before);
});
await check('обычный push не переносит legacy local owner автоматически',async()=>{
  const before=calls.length,project=getProject(originalProject.id);
  await assert.rejects(pushProjectNow(project.id),/Владелец проекта не совпадает/);
  assert.deepEqual(getProject(project.id).access,project.access);assert.deepEqual(getProject(project.id).sync,project.sync);
  assert.equal(calls.length,before);
});
await check('явное включение своего local project сохраняет IDs/данные и синхронизирует этим account',async()=>{
  await enableProjectCloud(originalProject.id);const local=getProject(originalProject.id);
  assert.equal(local.id,originalProject.id);assert.equal(local.access.ownerId,A);
  assert.equal(local.access.workspaceId,identity.personalWorkspaceId);assert.equal(local.sync.status,'synced');
  assert.deepEqual(local.workspace,originalProject.workspace);assert.deepEqual(local.progress,originalProject.progress);
  assert.deepEqual(local.checkpoints,originalProject.checkpoints);assert.equal(remote.get(local.id).access.ownerId,A);
  assert.equal((await listCloudProjects())[0].id,local.id);
});
await check('foreign owner/workspace и уже cloud local owner не усыновляются',async()=>{
  const before=calls.length;
  for(const [suffix,access,sync] of [
    ['foreign-owner',{...originalProject.access,ownerId:B},originalProject.sync],
    ['foreign-workspace',{...originalProject.access,workspaceId:'foreign-workspace'},originalProject.sync],
    ['already-cloud',originalProject.access,{...originalProject.sync,mode:'cloud',provider:'cloudflare'}]
  ]){
    const project=putProject({...originalProject,id:'reject-'+suffix,access,sync});
    await assert.rejects(enableProjectCloud(project.id),/другому аккаунту/);
    assert.deepEqual(getProject(project.id).access,access);
  }
  assert.equal(calls.length,before);
});
await check('новый Project Studio проект принадлежит server account и использует текущий cookie',async()=>{
  const created=createProject({id:'new-server-account-project',title:'Synthetic new project'});assert.equal(created.access.ownerId,A);
  await enableProjectCloud(created.id);assert.equal(getProject(created.id).sync.status,'synced');
  assert.equal(remote.get(created.id).access.ownerId,A);assert.equal(remote.get(created.id).id,created.id);
});
await check('Cloud 403/409 сохраняют status/details; конфликты не переписывают ownership',async()=>{
  const id=originalProject.id,access=getProject(id).access;
  replyMode='forbidden';await assert.rejects(pushProjectNow(id),error=>error.status===403&&error.code==='ACCESS_DENIED');
  assert.equal(getProject(id).sync.status,'error');assert.deepEqual(getProject(id).access,access);
  replyMode='conflict';await assert.rejects(pushProjectNow(id),error=>error.status===409&&error.code==='REVISION_CONFLICT');
  assert.equal(getProject(id).sync.status,'conflict');assert.equal(getProject(id).sync.conflict.serverRevision,9);
  assert.deepEqual(getProject(id).access,access);replyMode='normal';
});
await check('cloud pull сохраняет stable ID и данные под текущим account namespace',async()=>{
  const id=originalProject.id,changed=clone(remote.get(id));changed.title='Changed only in synthetic Cloud';
  changed.workspace.files[0].content='int main(){return 23;}';remote.set(id,changed);
  await pullProjectNow(id);const local=getProject(id);assert.equal(local.id,id);
  assert.equal(local.title,changed.title);assert.equal(local.workspace.files[0].content,changed.workspace.files[0].content);
  assert.equal(local.access.ownerId,A);assert.equal(local.sync.status,'synced');
});
await check('/me не принимает другой subject из успешного Cloud ответа',async()=>{
  replyMode='wrong-account';await assert.rejects(cloudMe(),/CLOUD_ACCOUNT_MISMATCH/);replyMode='normal';
});
await check('оригинальные legacy bytes и token остаются нетронутыми и не отправляются',async()=>{
  for(const [k,v] of originals)assert.equal(globalThis.localStorage.getItem(k),v);
  for(const call of calls){assert.equal(JSON.stringify(call).includes('nxk_SYNTHETIC'),false);
    assert.equal(call.path.includes('legacy-synthetic.invalid'),false);assert.equal(call.path.includes('bootstrap'),false)}
});
await check('ACCOUNT_SESSION_CHANGED закрывает вкладку A; late ответ не меняет account storage',async()=>{
  let finish;const promise=serverCloudRequest('/api/v1/projects',{},()=>new Promise(resolve=>{finish=resolve}));
  const before=new Map(globalThis.localStorage.data);let ended=0;
  globalThis.window=new EventTarget();
  window.addEventListener('nexus:session-ended',()=>{ended++;lockAccountStorage()});
  await assert.rejects(serverCloudRequest('/api/v1/projects',{},async()=>Response.json(
    {error:{code:'ACCOUNT_SESSION_CHANGED'}},{status:409})),error=>error.status===409&&error.code==='ACCOUNT_SESSION_CHANGED');
  assert.equal(ended,1);assert.equal(verifiedAccount(),null);
  finish(Response.json({projects:[{id:'late-project-from-old-account'}]}));
  await assert.rejects(promise,/CLOUD_ACCOUNT_CHANGED/);assert.deepEqual(globalThis.localStorage.data,before);
  await assert.rejects(serverCloudRequest('/api/v1/me'),/SERVER_SESSION_REQUIRED/);
  assert.throws(()=>accountLocalStorage(),{code:'VERIFIED_ACCOUNT_REQUIRED'});
  delete globalThis.window;
});
console.log(JSON.stringify({status:'PASS',checks,network:false,browser:false,production:false,
  syntheticStorageOnly:true,legacyOriginalsPreserved:true,secondLoginRequired:false},null,2));
