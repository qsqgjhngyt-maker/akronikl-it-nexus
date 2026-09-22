import {evaluateProjectAccess} from '../../../collaboration/access-control.js';

const VERSION='0.1.7-alpha.2.1';
class ApiError extends Error{constructor(status,code,message,details=null){super(message);this.status=status;this.code=code;this.details=details}}
const now=()=>new Date().toISOString();
const id=(prefix='id')=>`${prefix}-${crypto.randomUUID()}`;
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8',...headers}});

function corsHeaders(request,env){
  const origin=request.headers.get('origin');const allowed=String(env.ALLOWED_ORIGIN||'').trim();
  if(!origin||!allowed||origin!==allowed)return{};
  return{'access-control-allow-origin':origin,'access-control-allow-methods':'GET,PUT,POST,DELETE,OPTIONS','access-control-allow-headers':'authorization,content-type,if-match','access-control-max-age':'86400','vary':'Origin'};
}
function withCors(response,request,env){const headers=new Headers(response.headers);for(const [k,v] of Object.entries(corsHeaders(request,env)))headers.set(k,v);return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}

async function authenticate(request,env){
  const mode=String(env.AUTH_MODE||'disabled');
  if(mode==='disabled')throw new ApiError(503,'AUTH_NOT_CONFIGURED','Nexus account authentication is not configured yet.');
  if(mode==='dev'){
    if(String(env.ENVIRONMENT||'development')==='production')throw new ApiError(503,'DEV_AUTH_FORBIDDEN','Development authentication is disabled in production.');
    const raw=request.headers.get('authorization')||'';const match=/^Bearer\s+dev:([A-Za-z0-9._:@-]{3,160})$/i.exec(raw);
    if(!match)throw new ApiError(401,'UNAUTHORIZED','Development token required: Bearer dev:<subject>.');
    return{subjectId:match[1],authMode:'dev'};
  }
  throw new ApiError(503,'AUTH_ADAPTER_REQUIRED',`Unsupported AUTH_MODE: ${mode}. Add a verified production identity adapter before enabling cloud sync.`);
}

async function bodyJson(request){try{return await request.json()}catch{throw new ApiError(400,'INVALID_JSON','Request body must be valid JSON.')}}
async function sha256(text){const data=new TextEncoder().encode(text);const digest=await crypto.subtle.digest('SHA-256',data);return[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}

async function projectRow(env,projectId){return env.DB.prepare('SELECT * FROM projects WHERE id = ?1 LIMIT 1').bind(projectId).first()}
async function projectAccess(env,project,subjectId){
  if(!project)return null;
  const member=await env.DB.prepare('SELECT role,status FROM project_members WHERE project_id = ?1 AND subject_id = ?2 LIMIT 1').bind(project.id,subjectId).first();
  const role=project.owner_subject_id===subjectId?'owner':(member?.status==='active'?member.role:null);
  if(!role)return{schemaVersion:1,workspaceId:project.workspace_id,ownerId:project.owner_subject_id,members:[],policies:[]};
  const policies=(await env.DB.prepare('SELECT subject_id,role,scope,effect,actions_json FROM project_access_policies WHERE project_id = ?1').bind(project.id).all()).results||[];
  return{schemaVersion:1,workspaceId:project.workspace_id,ownerId:project.owner_subject_id,members:[{subjectId,role,status:'active'}],policies:policies.map(p=>({subjectId:p.subject_id||null,role:p.role||null,scope:p.scope,effect:p.effect,actions:JSON.parse(p.actions_json||'[]')}))};
}
async function requireAction(env,project,subjectId,action,path='/'){
  const access=await projectAccess(env,project,subjectId);const verdict=evaluateProjectAccess(access,{subjectId,path,action});
  if(!verdict.allowed)throw new ApiError(403,'FORBIDDEN',`Action ${action} is not allowed for ${path}.`,{reason:verdict.reason});
  return verdict;
}
function snapshotKey(workspaceId,projectId,revision){return`workspaces/${workspaceId}/projects/${projectId}/revisions/${revision}.json`}
function fileMap(project){return new Map((project?.workspace?.files||[]).map(file=>[String(file.path||''),String(file.content??'')]))}
function changedFiles(beforeProject,afterProject){
  const before=fileMap(beforeProject),after=fileMap(afterProject),paths=new Set([...before.keys(),...after.keys()]),changes=[];
  for(const path of paths){
    if(!before.has(path))changes.push({path,kind:'create'});
    else if(!after.has(path))changes.push({path,kind:'delete'});
    else if(before.get(path)!==after.get(path))changes.push({path,kind:'edit'});
  }
  return changes;
}
async function appendAudit(env,{workspaceId,projectId,actorId,action,scope='/',entityType='project',entityId=null,revisionBefore=null,revisionAfter=null,metadata={}}){
  await env.DB.prepare('INSERT INTO audit_events (id,workspace_id,project_id,actor_subject_id,action,scope,entity_type,entity_id,revision_before,revision_after,metadata_json,created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)').bind(id('audit'),workspaceId,projectId,actorId,action,scope,entityType,entityId,revisionBefore,revisionAfter,JSON.stringify(metadata),now()).run();
}

async function listProjects(env,actor){
  const result=await env.DB.prepare(`SELECT DISTINCT p.* FROM projects p LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.subject_id=?1 AND pm.status='active' WHERE p.owner_subject_id=?1 OR pm.subject_id=?1 ORDER BY p.updated_at DESC`).bind(actor.subjectId).all();
  return{projects:(result.results||[]).map(p=>({id:p.id,workspaceId:p.workspace_id,title:p.title,languageId:p.language_id,revision:p.current_revision,updatedAt:p.updated_at}))};
}
async function getProject(env,actor,projectId){
  const project=await projectRow(env,projectId);if(!project)throw new ApiError(404,'PROJECT_NOT_FOUND','Project not found.');await requireAction(env,project,actor.subjectId,'view','/');
  if(!project.latest_r2_key)return{project:null,meta:{id:project.id,revision:project.current_revision}};
  const object=await env.SNAPSHOTS.get(project.latest_r2_key);if(!object)throw new ApiError(500,'SNAPSHOT_MISSING','Project metadata points to a missing R2 snapshot.');
  return{project:JSON.parse(await object.text()),meta:{id:project.id,revision:project.current_revision,hash:project.latest_hash,updatedAt:project.updated_at}};
}
async function putProject(env,actor,projectId,payload){
  const incoming=payload?.project;if(!incoming||incoming.id!==projectId)throw new ApiError(400,'PROJECT_ID_MISMATCH','Body project.id must match the URL project id.');
  const existing=await projectRow(env,projectId);const baseRevision=payload?.baseRevision==null?null:Number(payload.baseRevision);
  let workspaceId=incoming.access?.workspaceId||incoming.workspaceId;let ownerId=incoming.access?.ownerId||actor.subjectId;
  let previousSnapshot=null;let fileChanges=[];
  if(existing){
    await requireAction(env,existing,actor.subjectId,'view','/');workspaceId=existing.workspace_id;ownerId=existing.owner_subject_id;
    if(baseRevision!==Number(existing.current_revision))throw new ApiError(409,'REVISION_CONFLICT','Cloud project changed since this client base revision.',{serverRevision:Number(existing.current_revision),baseRevision});
    if(existing.latest_r2_key){const object=await env.SNAPSHOTS.get(existing.latest_r2_key);if(object)previousSnapshot=JSON.parse(await object.text())}
    fileChanges=changedFiles(previousSnapshot,incoming);
    for(const change of fileChanges)await requireAction(env,existing,actor.subjectId,change.kind,change.path);
    const metadataChanged=!previousSnapshot||String(previousSnapshot.title||'')!==String(incoming.title||'')||String(previousSnapshot.languageId||'')!==String(incoming.languageId||'');
    if(metadataChanged)await requireAction(env,existing,actor.subjectId,'edit','/');
  }else{
    if(ownerId!==actor.subjectId)throw new ApiError(403,'OWNER_MISMATCH','A new project can only be created for the authenticated owner.');
    if(!workspaceId)throw new ApiError(400,'WORKSPACE_REQUIRED','workspaceId is required for a new project.');
  }
  const revision=(existing?Number(existing.current_revision):0)+1;const stamp=now();
  const serialized=JSON.stringify(incoming);const hash=await sha256(serialized);const key=snapshotKey(workspaceId,projectId,revision);
  await env.SNAPSHOTS.put(key,serialized,{httpMetadata:{contentType:'application/json'},customMetadata:{projectId,workspaceId,revision:String(revision),hash}});
  if(!existing){
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO workspaces (id,kind,name,owner_subject_id,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6)').bind(workspaceId,incoming.access?.workspaceKind==='team'?'team':'personal',incoming.workspaceName||'Nexus Workspace',ownerId,stamp,stamp),
      env.DB.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id,subject_id,role,status,joined_at,created_at) VALUES (?1,?2,?3,?4,?5,?6)').bind(workspaceId,ownerId,'owner','active',stamp,stamp),
      env.DB.prepare('INSERT INTO projects (id,workspace_id,owner_subject_id,title,language_id,current_revision,latest_r2_key,latest_hash,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)').bind(projectId,workspaceId,ownerId,String(incoming.title||projectId),String(incoming.languageId||'cpp'),revision,key,hash,stamp,stamp),
      env.DB.prepare('INSERT OR IGNORE INTO project_members (project_id,subject_id,role,status,joined_at,created_at) VALUES (?1,?2,?3,?4,?5,?6)').bind(projectId,ownerId,'owner','active',stamp,stamp)
    ]);
  }else{
    await env.DB.prepare('UPDATE projects SET title=?1,language_id=?2,current_revision=?3,latest_r2_key=?4,latest_hash=?5,updated_at=?6 WHERE id=?7 AND workspace_id=?8').bind(String(incoming.title||projectId),String(incoming.languageId||'cpp'),revision,key,hash,stamp,projectId,workspaceId).run();
  }
  await env.DB.prepare('INSERT INTO project_revisions (id,project_id,revision,r2_key,content_hash,created_by,created_at) VALUES (?1,?2,?3,?4,?5,?6,?7)').bind(id('rev'),projectId,revision,key,hash,actor.subjectId,stamp).run();
  await appendAudit(env,{workspaceId,projectId,actorId:actor.subjectId,action:existing?'project.synced':'project.cloud-created',revisionBefore:existing?Number(existing.current_revision):null,revisionAfter:revision,metadata:{hash,changedFiles:fileChanges,changeCount:fileChanges.length}});
  return{ok:true,projectId,revision,hash,updatedAt:stamp};
}
async function auditProject(env,actor,projectId){
  const project=await projectRow(env,projectId);if(!project)throw new ApiError(404,'PROJECT_NOT_FOUND','Project not found.');await requireAction(env,project,actor.subjectId,'audit_view','/');
  const result=await env.DB.prepare('SELECT id,actor_subject_id,action,scope,entity_type,entity_id,revision_before,revision_after,metadata_json,created_at FROM audit_events WHERE project_id=?1 ORDER BY created_at DESC LIMIT 200').bind(projectId).all();
  return{events:(result.results||[]).map(x=>({...x,metadata:JSON.parse(x.metadata_json||'{}'),metadata_json:undefined}))};
}

async function route(request,env){
  const url=new URL(request.url);const path=url.pathname.replace(/\/+$/,'')||'/';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(request,env)});
  if(path==='/api/v1/health')return json({ok:true,service:'akronikl-nexus-sync',version:VERSION,authMode:String(env.AUTH_MODE||'disabled'),d1:Boolean(env.DB),r2:Boolean(env.SNAPSHOTS)});
  if(!path.startsWith('/api/v1/'))throw new ApiError(404,'NOT_FOUND','Route not found.');
  const actor=await authenticate(request,env);
  if(path==='/api/v1/projects'&&request.method==='GET')return json(await listProjects(env,actor));
  const projectMatch=/^\/api\/v1\/projects\/([^/]+)$/.exec(path);
  if(projectMatch&&request.method==='GET')return json(await getProject(env,actor,decodeURIComponent(projectMatch[1])));
  if(projectMatch&&request.method==='PUT')return json(await putProject(env,actor,decodeURIComponent(projectMatch[1]),await bodyJson(request)));
  const auditMatch=/^\/api\/v1\/projects\/([^/]+)\/audit$/.exec(path);
  if(auditMatch&&request.method==='GET')return json(await auditProject(env,actor,decodeURIComponent(auditMatch[1])));
  throw new ApiError(404,'NOT_FOUND','Route not found.');
}

export default{async fetch(request,env){try{return withCors(await route(request,env),request,env)}catch(error){const status=Number(error?.status||500);const body={error:{code:error?.code||'INTERNAL_ERROR',message:error?.message||'Internal error',...(error?.details?{details:error.details}:{})}};return withCors(json(body,status),request,env)}}};
