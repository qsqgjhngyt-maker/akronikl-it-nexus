import fs from 'node:fs';
import {loadLocalIdentity,identityStorageKey} from '../core/identity.js';
import {createPrivateAccessModel,evaluateProjectAccess,accessSummary} from '../collaboration/access-control.js';
import {listAuditEvents,auditStorageKey} from '../collaboration/audit-log.js';
import {listQueuedProjectSync,syncQueueStorageKey} from '../sync/sync-queue.js';
import {createCloudflareSyncProvider} from '../sync/cloudflare-provider.js';
import {createProject,patchProject,createCheckpoint,renameProject,getProject,loadProjectDb,projectStorageKey,projectDbSchemaVersion} from '../project-studio/project-store.js';
import {projectStudioDashboardMarkup,projectStudioViewMarkup} from '../project-studio/project-studio.js';

const assert=(value,message)=>{if(!value)throw new Error(message)};
const mem=new Map();globalThis.localStorage={getItem:key=>mem.has(key)?mem.get(key):null,setItem:(key,value)=>mem.set(key,String(value)),removeItem:key=>mem.delete(key),clear:()=>mem.clear()};

assert(identityStorageKey()==='akronikl:it-nexus:identity:v1','identity key changed unexpectedly');
assert(auditStorageKey()==='akronikl:it-nexus:audit:v1','audit key changed unexpectedly');
assert(syncQueueStorageKey()==='akronikl:it-nexus:sync-queue:v1','sync queue key changed unexpectedly');
assert(projectStorageKey()==='akronikl:it-nexus:projects:v1','project key must remain backward compatible');
assert(projectDbSchemaVersion()===2,'project DB schema must be v2');

const identity1=loadLocalIdentity(),identity2=loadLocalIdentity();
assert(identity1.deviceId===identity2.deviceId,'device identity must be persistent');
assert(identity1.localPrincipalId===identity2.localPrincipalId,'local principal must be persistent');

const project=createProject({id:'team-foundation',title:'Team Foundation',languageId:'cpp',files:[{path:'src/main.cpp',content:'int main(){return 0;}\n',languageId:'cpp'},{path:'docs/architecture.md',content:'# Architecture\n',languageId:'markdown'}]});
assert(project.access.ownerId===identity1.localPrincipalId,'new local project owner mismatch');
assert(project.access.workspaceId===identity1.personalWorkspaceId,'personal workspace id mismatch');
assert(project.access.visibility==='private','new project must be private');
assert(project.sync.strategy==='local-first','local-first sync strategy missing');
assert(project.sync.mode==='local-only','cloud sync must not silently activate');

const guest='subject-docs-editor';
const access={...project.access,members:[...project.access.members,{subjectId:guest,role:'docs_editor',status:'active'}],policies:[{id:'deny-secrets',subjectId:guest,scope:'docs/private/**',effect:'deny',actions:['view','edit']}]};
patchProject(project.id,{access});
assert(evaluateProjectAccess(access,{subjectId:guest,path:'docs/architecture.md',action:'edit'}).allowed,'docs editor must edit docs scope');
assert(!evaluateProjectAccess(access,{subjectId:guest,path:'src/main.cpp',action:'edit'}).allowed,'docs editor must not edit source scope by role');
assert(!evaluateProjectAccess(access,{subjectId:guest,path:'docs/private/plan.md',action:'edit'}).allowed,'explicit DENY must override role-scoped allow');
const summary=accessSummary(access);assert(summary.memberCount===2&&summary.guestCount===1&&summary.policyCount===1,'access summary mismatch');

renameProject(project.id,'Team Foundation Renamed');createCheckpoint(project.id,'Before Sync');
const audit=listAuditEvents(project.id,{limit:20});
assert(audit.some(x=>x.action==='project.created'),'project creation audit missing');
assert(audit.some(x=>x.action==='project.renamed'),'rename audit missing');
assert(audit.some(x=>x.action==='checkpoint.created'),'checkpoint audit missing');

patchProject(project.id,{sync:{mode:'cloud',provider:'cloudflare'}});
const queued=listQueuedProjectSync();assert(queued.some(x=>x.projectId===project.id),'cloud-mode local change must coalesce into sync queue');

const provider=createCloudflareSyncProvider();const status=await provider.status();
assert(provider.id==='cloudflare'&&provider.supportsTeam&&provider.supportsAudit,'Cloudflare provider capability contract mismatch');
assert(status.configured===false&&status.online===false,'unconfigured provider must stay safely offline');

const dashboard=projectStudioDashboardMarkup({projects:[getProject(project.id)],courseProjects:[],locale:'ru'});
for(const token of ['Nexus Sync & Team','Команда · 2','ОБЛАКО'])assert(dashboard.includes(token),`dashboard missing sync/team token: ${token}`);
const detail=projectStudioViewMarkup({project:getProject(project.id),courseProject:null,locale:'ru'});
for(const token of ['ACCESS','SYNC','AUDIT','ACL READY','явный DENY'])assert(detail.includes(token),`project detail missing sync/team token: ${token}`);

// Backward migration: old schema-v1 project must receive access + sync v1 without changing storage namespace.
mem.clear();
mem.set(projectStorageKey(),JSON.stringify({schemaVersion:1,projects:{legacy:{id:'legacy',title:'Legacy',languageId:'cpp',manifest:{entryFile:'src/main.cpp'},workspace:{files:[{path:'src/main.cpp',content:'int main(){}',languageId:'cpp'}]},sync:{revision:7}}}}));
const migrated=loadProjectDb().projects.legacy;
assert(migrated.schemaVersion===2,'legacy project schema migration failed');
assert(migrated.access?.ownerId&&migrated.access?.workspaceId,'legacy project did not receive private access model');
assert(migrated.sync.localRevision===7,'legacy revision was not preserved');

const version=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8'));
assert(version.projectStudio?.features?.includes('role-and-path-scoped-acl'),'version metadata missing scoped ACL feature');
console.log('SYNC_TEAM_FOUNDATION_PASS',audit.length,queued.length);
