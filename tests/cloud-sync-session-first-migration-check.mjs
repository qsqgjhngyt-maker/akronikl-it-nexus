import fs from 'node:fs';
import {
  saveCloudflareSyncConfig,
  clearCloudflareSyncConfig
} from '../sync/cloudflare-config.js';
import {
  listCloudProjects,
  enableProjectCloud,
  connectCloudAccount,
  disconnectCloudAccount
} from '../sync/cloud-sync.js';
import {
  saveIdentityV2SessionCredential,
  loadIdentityV2SessionCredential,
  clearIdentityV2SessionCredential,
  identityV2SessionStorageKey
} from '../sync/identity-v2-client.js';
import {
  createProject,
  getProject
} from '../project-studio/project-store.js';
import {
  projectStudioViewMarkup
} from '../project-studio/project-studio.js';

const assert=(value,message)=>{
  if(!value)throw new Error(message);
};

const local=new Map();
const session=new Map();

globalThis.localStorage={
  getItem:key=>local.has(key)?local.get(key):null,
  setItem:(key,value)=>local.set(key,String(value)),
  removeItem:key=>local.delete(key),
  clear:()=>local.clear()
};

globalThis.sessionStorage={
  getItem:key=>session.has(key)?session.get(key):null,
  setItem:(key,value)=>session.set(key,String(value)),
  removeItem:key=>session.delete(key),
  clear:()=>session.clear()
};

const baseUrl='https://sync.example';
const subjectId='user-session-first';
const legacy='nxk_'+'L'.repeat(32);
const serverSession='nxs_'+'S'.repeat(32);
const staleSession='nxs_'+'X'.repeat(32);

function configure(){
  saveCloudflareSyncConfig({
    baseUrl,
    token:legacy,
    subjectId,
    displayName:'Akronikl',
    connectedAt:'2026-09-29T00:00:00Z'
  });
}

configure();

let calls=[];
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;
  const auth=String(options.headers?.authorization||'');
  calls.push({path,auth,method:options.method||'GET'});

  if(path==='/api/v1/projects'){
    if(auth===`Bearer ${serverSession}`){
      return Response.json({projects:[{id:'session-first-project',title:'Session First'}]});
    }
    if(auth===`Bearer ${legacy}`){
      return Response.json({projects:[{id:'legacy-project',title:'Legacy'}]});
    }
  }

  return Response.json({error:{code:'UNEXPECTED_REQUEST',message:'unexpected'}},{status:500});
};

saveIdentityV2SessionCredential(serverSession);
let projects=await listCloudProjects();
assert(projects[0]?.id==='session-first-project','Cloud Sync did not use server session first');
assert(calls.length===1,'session-first success must not call legacy fallback');
assert(calls[0].auth===`Bearer ${serverSession}`,'first Cloud Sync bearer must be nxs session');

// Project Studio should surface the selected auth transport without exposing credentials.
const project=createProject({id:'session-first-ui',title:'Session First UI'});
let html=projectStudioViewMarkup({project:getProject(project.id),locale:'ru'});
assert(html.includes('auth transport: server session'),'Project Studio did not surface server-session transport');
assert(!html.includes(serverSession)&&!html.includes(legacy),'Project Studio rendered a raw credential');

// A stale session may fall back only after a 401 invalid-session response.
calls=[];
saveIdentityV2SessionCredential(staleSession);
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;
  const auth=String(options.headers?.authorization||'');
  calls.push({path,auth});

  if(path==='/api/v1/projects'&&auth===`Bearer ${staleSession}`){
    return Response.json(
      {error:{code:'INVALID_SESSION',message:'expired'}},
      {status:401}
    );
  }
  if(path==='/api/v1/projects'&&auth===`Bearer ${legacy}`){
    return Response.json({projects:[{id:'fallback-project',title:'Fallback'}]});
  }

  return Response.json({error:{code:'UNEXPECTED_REQUEST'}},{status:500});
};

projects=await listCloudProjects();
assert(projects[0]?.id==='fallback-project','legacy fallback did not recover Cloud Sync');
assert(calls.length===2,'invalid session must cause exactly one legacy retry');
assert(calls[0].auth===`Bearer ${staleSession}`&&calls[1].auth===`Bearer ${legacy}`,'credential fallback order is wrong');
assert(loadIdentityV2SessionCredential()==='','stale nxs session was not cleared');

// 403 is an authorization decision, not a signal to retry with legacy.
calls=[];
saveIdentityV2SessionCredential(serverSession);
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;
  const auth=String(options.headers?.authorization||'');
  calls.push({path,auth});
  return Response.json(
    {error:{code:'FORBIDDEN',message:'denied'}},
    {status:403}
  );
};

let forbidden=false;
try{
  await listCloudProjects();
}catch(error){
  forbidden=Number(error?.status)===403;
}
assert(forbidden,'403 must be returned to caller');
assert(calls.length===1&&calls[0].auth===`Bearer ${serverSession}`,'403 must not fall back to legacy');
assert(loadIdentityV2SessionCredential()===serverSession,'403 must not clear a valid session candidate');


// Revision conflict is a business/concurrency result and must never be
// hidden by retrying with the legacy token.
calls=[];
saveIdentityV2SessionCredential(serverSession);
const conflictProject=createProject({
  id:'session-first-conflict',
  title:'Session First Conflict',
  files:[{
    path:'src/main.cpp',
    content:'int main(){return 0;}\n',
    languageId:'cpp'
  }]
});

globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;
  const auth=String(options.headers?.authorization||'');
  calls.push({path,auth,method:options.method||'GET'});

  if(
    path==='/api/v1/projects/session-first-conflict' &&
    options.method==='PUT' &&
    auth===`Bearer ${serverSession}`
  ){
    return Response.json(
      {
        error:{
          code:'REVISION_CONFLICT',
          message:'stale',
          details:{serverRevision:9}
        }
      },
      {status:409}
    );
  }

  return Response.json(
    {error:{code:'UNEXPECTED_REQUEST'}},
    {status:500}
  );
};

let conflict=false;
try{
  await enableProjectCloud(conflictProject.id);
}catch(error){
  conflict=Number(error?.status)===409;
}
assert(conflict,'409 revision conflict must reach Cloud Sync caller');
assert(calls.length===1&&calls[0].auth===`Bearer ${serverSession}`,'409 must not retry with legacy credential');
assert(getProject(conflictProject.id)?.sync?.status==='conflict','revision conflict state was not preserved');

// Successful account relink clears an old session trust boundary.
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;
  const auth=String(options.headers?.authorization||'');

  if(path==='/api/v1/health')return Response.json({ok:true});

  if(path==='/api/v1/me'){
    assert(auth===`Bearer ${legacy}`,'relink must verify the supplied legacy token directly');
    return Response.json({subject:{id:subjectId,displayName:'Akronikl'},authMode:'nexus-token'});
  }

  if(path==='/api/v2/session'&&options.method==='DELETE'){
    assert(auth===`Bearer ${serverSession}`,'relink must retire the old server session with its own credential');
    return Response.json({ok:true,revoked:true});
  }

  return Response.json({error:{message:'not found'}},{status:404});
};

saveIdentityV2SessionCredential(serverSession);
const relinked=await connectCloudAccount({baseUrl,token:legacy});
assert(relinked.previousSessionRetirement?.attempted&&relinked.previousSessionRetirement?.revoked,'account relink did not retire the previous server session');
assert(loadIdentityV2SessionCredential()==='','account relink must clear an existing server session credential');

// Local disconnect retires the current server session before clearing local state.
saveIdentityV2SessionCredential(serverSession);
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;
  const auth=String(options.headers?.authorization||'');

  if(path==='/api/v2/session'&&options.method==='DELETE'){
    assert(auth===`Bearer ${serverSession}`,'disconnect must revoke the current server session before local cleanup');
    return Response.json({ok:true,revoked:true});
  }

  return Response.json({error:{code:'UNEXPECTED_REQUEST'}},{status:500});
};

const disconnected=await disconnectCloudAccount();
assert(disconnected.serverSessionAttempted&&disconnected.serverSessionRevoked,'disconnect did not retire the current server session');
assert(loadIdentityV2SessionCredential()==='','disconnect must clear the server session credential');
assert(!session.has(identityV2SessionStorageKey()),'formal nxs sessionStorage key must be removed');

const source=fs.readFileSync(new URL('../sync/cloud-sync.js',import.meta.url),'utf8');
assert(source.includes('authenticatedRequest:identityV2AuthenticatedRequest'),'Cloud Sync provider is not wired to Identity session-first request');
assert(source.includes('clearIdentityV2SessionCredential'),'account boundary hygiene is missing');

clearIdentityV2SessionCredential();
clearCloudflareSyncConfig();

console.log('CLOUD_SYNC_SESSION_FIRST_MIGRATION_PASS');
