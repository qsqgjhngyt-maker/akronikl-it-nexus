import {loadLocalIdentity,activePrincipalId,personalWorkspaceId} from '../core/identity.js';
import {createPrivateAccessModel,accessSummary} from '../collaboration/access-control.js';
import {appendAuditEvent,listAuditEvents} from '../collaboration/audit-log.js';
import {queueProjectSync} from '../sync/sync-queue.js';

const PROJECTS_KEY='akronikl:it-nexus:projects:v1';
const DB_SCHEMA_VERSION=2;

const now=()=>new Date().toISOString();
const clone=value=>JSON.parse(JSON.stringify(value));
const safeId=value=>String(value||'project').trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'project';
const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
function storage(){return globalThis.localStorage||null}
function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch{return fallback}}
function defaultDb(){return{schemaVersion:DB_SCHEMA_VERSION,projects:{},updatedAt:null}}

function normalizeAccess(project){
  if(project?.access?.ownerId&&project?.access?.workspaceId)return clone(project.access);
  const identity=loadLocalIdentity();
  return createPrivateAccessModel({ownerId:identity.accountSubjectId||identity.localPrincipalId,workspaceId:identity.personalWorkspaceId,createdAt:project?.createdAt||now()});
}
function normalizeSync(project){
  const old=project?.sync||{};
  const localRevision=Number(old.localRevision??old.revision??0);
  return{
    schemaVersion:1,
    strategy:'local-first',
    mode:old.mode==='cloud'?'cloud':'local-only',
    provider:old.provider||'none',
    status:old.status||'local',
    revision:localRevision,
    localRevision,
    serverRevision:old.serverRevision??null,
    baseServerRevision:old.baseServerRevision??null,
    lastLocalChangeAt:old.lastLocalChangeAt||project?.updatedAt||null,
    lastSyncedAt:old.lastSyncedAt||null,
    conflict:old.conflict||null
  };
}
function normalizeProject(project){
  const next=clone(project||{});
  next.schemaVersion=2;
  next.access=normalizeAccess(next);
  next.sync=normalizeSync(next);
  next.manifest={schemaVersion:1,...(next.manifest||{}),sync:{strategy:'local-first',cloud:'foundation',...(next.manifest?.sync||{})}};
  return next;
}
function migrateDb(raw){
  const source={...defaultDb(),...(raw||{}),projects:{...(raw?.projects||{})}};
  const projects={};let changed=Number(source.schemaVersion||1)!==DB_SCHEMA_VERSION;
  for(const [id,item] of Object.entries(source.projects)){
    const normalized=normalizeProject(item);projects[id]=normalized;
    if(!item?.access?.ownerId||!item?.sync?.localRevision&&item?.sync?.localRevision!==0||item?.schemaVersion!==2)changed=true;
  }
  return{db:{...source,schemaVersion:DB_SCHEMA_VERSION,projects},changed};
}

export function loadProjectDb(){
  const raw=parse(storage()?.getItem(PROJECTS_KEY),defaultDb());
  const {db,changed}=migrateDb(raw);
  if(changed)storage()?.setItem(PROJECTS_KEY,JSON.stringify({...db,updatedAt:db.updatedAt||now()}));
  return db;
}
export function saveProjectDb(db){const next={...db,schemaVersion:DB_SCHEMA_VERSION,updatedAt:now()};storage()?.setItem(PROJECTS_KEY,JSON.stringify(next));return next}
export function listProjects(){return Object.values(loadProjectDb().projects).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).map(clone)}
export function getProject(id){const item=loadProjectDb().projects?.[id];return item?clone(item):null}

export function updateProjectSyncState(projectId,patch={}){
  const db=loadProjectDb(),current=db.projects?.[projectId];if(!current)throw new Error(`Project not found: ${projectId}`);
  const next=normalizeProject({...current,sync:{...current.sync,...clone(patch)}});db.projects[projectId]=next;saveProjectDb(db);return clone(next);
}

export function linkProjectOwnerToAccount(projectId,subjectId){
  const clean=String(subjectId||'').trim();if(!clean)throw new Error('Account subject id is required.');
  const current=getProject(projectId);if(!current)throw new Error(`Project not found: ${projectId}`);
  if(current.access?.workspaceKind==='team'&&current.access?.ownerId!==clean)return current;
  if(current.access?.ownerId===clean)return current;
  const previousOwner=current.access?.ownerId;const members=(current.access?.members||[]).map(member=>member.subjectId===previousOwner?{...member,subjectId:clean,role:'owner'}:member);
  if(!members.some(member=>member.subjectId===clean))members.unshift({subjectId:clean,role:'owner',status:'active',addedAt:now(),addedBy:clean});
  const before=current.sync?.localRevision||0;const updated=patchProject(projectId,{access:{...current.access,ownerId:clean,members}});
  appendAuditEvent(projectId,{actorId:clean,action:'identity.account-linked',scope:'/',revisionBefore:before,revisionAfter:updated.sync.localRevision,summary:`${previousOwner||'local'} → ${clean}`});return updated;
}

export function applyCloudProject(remoteProject,{serverRevision=0,syncedAt=now(),provider='cloudflare'}={}){
  if(!remoteProject?.id)throw new Error('Cloud project id is required.');
  const db=loadProjectDb();const existing=db.projects?.[remoteProject.id];
  const normalized=normalizeProject(clone(remoteProject));
  normalized.sync={...normalizeSync(normalized),mode:'cloud',provider,status:'synced',serverRevision:Number(serverRevision||0),baseServerRevision:Number(serverRevision||0),lastSyncedAt:syncedAt,conflict:null};
  normalized.createdAt=normalized.createdAt||existing?.createdAt||syncedAt;normalized.updatedAt=normalized.updatedAt||syncedAt;
  db.projects[normalized.id]=normalized;saveProjectDb(db);return clone(normalized);
}

export function putProject(project){
  if(!project?.id)throw new Error('Project id is required.');
  const db=loadProjectDb();const prev=db.projects[project.id];const stamp=now();
  const base=normalizeProject({...clone(project),access:project.access||prev?.access});
  const previousRevision=Number(prev?.sync?.localRevision??prev?.sync?.revision??0);
  const localRevision=previousRevision+1;
  const next={...base,createdAt:project.createdAt||prev?.createdAt||stamp,updatedAt:stamp};
  next.manifest={schemaVersion:1,...next.manifest,id:next.id,title:next.title,languageId:next.languageId||next.manifest?.languageId||'cpp',updatedAt:stamp,sync:{strategy:'local-first',cloud:'foundation',...(next.manifest?.sync||{})}};
  next.sync={...normalizeSync(prev||next),...normalizeSync(next),mode:next.sync?.mode||prev?.sync?.mode||'local-only',provider:next.sync?.provider||prev?.sync?.provider||'none',status:next.sync?.mode==='cloud'?'pending':'local',revision:localRevision,localRevision,lastLocalChangeAt:stamp};
  db.projects[next.id]=next;saveProjectDb(db);
  if(next.sync.mode==='cloud'&&next.sync.provider!=='none')queueProjectSync({projectId:next.id,localRevision,workspaceId:next.access?.workspaceId,ownerId:next.access?.ownerId});
  return clone(next);
}

export function patchProject(id,patch){
  const current=getProject(id);if(!current)throw new Error(`Project not found: ${id}`);
  const next={...current,...clone(patch)};
  if(patch?.manifest)next.manifest={...current.manifest,...clone(patch.manifest)};
  if(patch?.workspace)next.workspace=clone(patch.workspace);
  if(patch?.progress)next.progress={...current.progress,...clone(patch.progress)};
  if(patch?.release)next.release={...current.release,...clone(patch.release)};
  if(patch?.access)next.access={...current.access,...clone(patch.access)};
  if(patch?.sync)next.sync={...current.sync,...clone(patch.sync)};
  return putProject(next);
}

export function createProject(input={}){
  const title=String(input.title||'Новый проект').trim()||'Новый проект';const id=input.id||uid(safeId(title));const languageId=input.languageId||'cpp';const entryFile=input.entryFile||'src/main.cpp';
  const files=Array.isArray(input.files)&&input.files.length?input.files:[{path:entryFile,content:'#include <iostream>\n\nint main() {\n    std::cout << "Hello, Nexus!\\n";\n    return 0;\n}\n',languageId}];
  const identity=loadLocalIdentity();const ownerId=identity.accountSubjectId||identity.localPrincipalId;const workspaceId=identity.personalWorkspaceId;
  const project={id,schemaVersion:2,title,languageId,description:String(input.description||''),origin:clone(input.origin||{kind:'user'}),manifest:{schemaVersion:1,id,title,languageId,entryFile,sourceRoots:input.sourceRoots||['src'],includeRoots:input.includeRoots||['include'],testRoots:input.testRoots||['tests'],build:{profile:'wasm-debug',standard:languageId==='cpp'?'c++20':'default',runtime:'auto'},sync:{strategy:'local-first',cloud:'foundation'},release:{status:'draft'}},workspace:{languageId,entryFile,activeFile:input.activeFile||entryFile,revision:0,files:clone(files)},progress:{milestones:[],tests:{passed:0,total:0},stage:'draft'},checkpoints:[],access:clone(input.access||createPrivateAccessModel({ownerId,workspaceId})),sync:{schemaVersion:1,strategy:'local-first',mode:'local-only',provider:'none',status:'local',revision:0,localRevision:0,serverRevision:null,baseServerRevision:null,lastLocalChangeAt:null,lastSyncedAt:null,conflict:null},release:{status:'draft',artifacts:[]}};
  const created=putProject(project);
  appendAuditEvent(created.id,{actorId:ownerId,action:'project.created',scope:'/',revisionAfter:created.sync.localRevision,summary:`Project created: ${created.title}`});
  return created;
}

export function ensureTemplateProject({templateKey,title,description='',languageId='cpp',entryFile='src/main.cpp',files=[],origin={},manifest={},progress={}}={}){
  if(!templateKey)throw new Error('templateKey is required');const existing=listProjects().find(item=>item.origin?.templateKey===templateKey);if(existing)return existing;
  const created=createProject({id:`template-${safeId(templateKey)}`,title,description,languageId,entryFile,files,origin:{...origin,templateKey},sourceRoots:manifest.sourceRoots,includeRoots:manifest.includeRoots,testRoots:manifest.testRoots,activeFile:entryFile});
  return Object.keys(progress||{}).length?patchProject(created.id,{progress:{...created.progress,...clone(progress)}}):created;
}

export function renameProject(projectId,title){
  const current=getProject(projectId);if(!current)throw new Error(`Project not found: ${projectId}`);
  const clean=String(title||'').trim();if(!clean)return current;
  const before=current.sync?.localRevision||0;const updated=patchProject(projectId,{title:clean,manifest:{title:clean}});
  appendAuditEvent(projectId,{actorId:activePrincipalId(),action:'project.renamed',scope:'/',revisionBefore:before,revisionAfter:updated.sync.localRevision,summary:`${current.title} → ${clean}`});
  return updated;
}

export function deleteProject(id){
  const db=loadProjectDb();if(!db.projects[id])return false;const current=db.projects[id];
  appendAuditEvent(id,{actorId:activePrincipalId(),action:'project.deleted',scope:'/',revisionBefore:current.sync?.localRevision??null,summary:`Project deleted: ${current.title}`});
  delete db.projects[id];saveProjectDb(db);return true;
}

export function createCheckpoint(projectId,label='Checkpoint'){
  const project=getProject(projectId);if(!project)throw new Error(`Project not found: ${projectId}`);const before=project.sync?.localRevision||0;
  const checkpoint={id:uid('checkpoint'),label:String(label||'Checkpoint').trim()||'Checkpoint',createdAt:now(),workspace:clone(project.workspace),progress:clone(project.progress),release:clone(project.release)};
  const checkpoints=[checkpoint,...(project.checkpoints||[])].slice(0,30);const updated=patchProject(projectId,{checkpoints});
  appendAuditEvent(projectId,{actorId:activePrincipalId(),action:'checkpoint.created',scope:'/',entityType:'checkpoint',entityId:checkpoint.id,revisionBefore:before,revisionAfter:updated.sync.localRevision,summary:checkpoint.label});return updated;
}

export function restoreCheckpoint(projectId,checkpointId){
  const project=getProject(projectId);if(!project)throw new Error(`Project not found: ${projectId}`);const checkpoint=(project.checkpoints||[]).find(item=>item.id===checkpointId);if(!checkpoint)throw new Error(`Checkpoint not found: ${checkpointId}`);const before=project.sync?.localRevision||0;
  const updated=patchProject(projectId,{workspace:clone(checkpoint.workspace),progress:clone(checkpoint.progress),release:clone(checkpoint.release)});
  appendAuditEvent(projectId,{actorId:activePrincipalId(),action:'checkpoint.restored',scope:'/',entityType:'checkpoint',entityId:checkpoint.id,revisionBefore:before,revisionAfter:updated.sync.localRevision,summary:checkpoint.label});return updated;
}

export function toggleProjectMilestone(projectId,index,value){
  const project=getProject(projectId);if(!project)throw new Error(`Project not found: ${projectId}`);const done=new Set(project.progress?.milestones||[]);value?done.add(Number(index)):done.delete(Number(index));const before=project.sync?.localRevision||0;
  const updated=patchProject(projectId,{progress:{...project.progress,milestones:[...done].sort((a,b)=>a-b)}});
  appendAuditEvent(projectId,{actorId:activePrincipalId(),action:value?'milestone.completed':'milestone.reopened',scope:'/progress',entityType:'milestone',entityId:String(index),revisionBefore:before,revisionAfter:updated.sync.localRevision,summary:`Milestone ${index}`});return updated;
}

export function getProjectAccessSummary(projectId){const project=getProject(projectId);return project?accessSummary(project.access):null}
export function getProjectAudit(projectId,options){return listAuditEvents(projectId,options)}
export function projectStorageKey(){return PROJECTS_KEY}
export function projectDbSchemaVersion(){return DB_SCHEMA_VERSION}
export function currentLocalIdentity(){return loadLocalIdentity()}
export function currentPersonalWorkspaceId(){return personalWorkspaceId()}
