import {verifiedAccount,accountLocalStorage} from '../../core/account-storage.js';
import {loadLocalIdentity,isCurrentProjectOwner} from '../../core/identity.js';
import {createPrivateAccessModel,evaluateProjectAccess} from '../../collaboration/access-control.js';
import {getProject,listProjects,putProject} from '../../project-studio/project-store.js';
import {STUDIO_PROFILE,title,validateOnecWorkspace,onecExportSources} from './studio-profile.mjs';
const clone=v=>JSON.parse(JSON.stringify(v));
const deny=()=>{throw Error('ONEC_PRIVATE_ACCESS_REQUIRED')};
const workspaceAccess=(p,w,action)=>{const subjectId=onecAccount();for(const f of w.files)if(!evaluateProjectAccess(p.access,{subjectId,path:f.path,action}).allowed)deny()};
export function onecAccount(){
 const a=verifiedAccount();if(!a)throw Error('VERIFIED_ACCOUNT_REQUIRED');
 // Старый store допускает fallback при parse error; S1 не записывает поверх повреждения.
 const raw=accountLocalStorage().getItem('akronikl:it-nexus:projects:v1');if(raw!==null){let db;try{db=JSON.parse(raw)}catch{throw Error('SAVED_DATA_UNREADABLE')}
 if(!db||![1,2].includes(db.schemaVersion)||!db.projects||typeof db.projects!=='object'||Array.isArray(db.projects)||Object.entries(db.projects).some(([k,v])=>['__proto__','constructor','prototype'].includes(k)||!v||typeof v!=='object'||Array.isArray(v)))throw Error('SAVED_DATA_INVALID');}
 return a.accountId;
}
export function ownedOnec(id,action='view'){
 const subjectId=onecAccount(),p=getProject(id);
 if(p?.languageId!=='onec'||p.manifest?.onec?.profile!==STUDIO_PROFILE||!isCurrentProjectOwner(p.access)||p.sync?.mode!=='local-only'||p.sync?.provider!=='none')deny();
 for(const path of ['/',...p.workspace.files.map(f=>f.path)])if(!evaluateProjectAccess(p.access,{subjectId,path,action}).allowed)deny();return p;
}
export function listOnecWorks(){onecAccount();return listProjects().filter(p=>{try{return !!ownedOnec(p.id)}catch{return false}})}
export function createOnecWork({title:label,workspace,origin={kind:'user'},metadataEditable=false}){
 const ownerId=onecAccount(),clean=validateOnecWorkspace(workspace,{metadataEditable}),id='onec-'+crypto.randomUUID();if(getProject(id))throw Error('PROJECT_EXISTS');
 const stamp=new Date().toISOString(),identity=loadLocalIdentity();
 return putProject({id,schemaVersion:2,title:title(label),languageId:'onec',description:'Учебные исходники 1С · редактор без исполнения BSL',createdAt:stamp,origin:{...clone(origin),credit:'none'},
 manifest:{schemaVersion:1,id,languageId:'onec',entryFile:clean.entryFile,sourceRoots:['.'],includeRoots:[],testRoots:[],build:{profile:'export-only',runtime:'unavailable',standard:'default'},onec:{profile:STUDIO_PROFILE,metadataEditable,executionAvailability:'unavailable'},sync:{strategy:'local-first',cloud:'disabled'},release:{status:'draft'}},
 workspace:clean,progress:{milestones:[],tests:{passed:0,total:0},stage:'draft'},checkpoints:[],access:createPrivateAccessModel({ownerId,workspaceId:identity.personalWorkspaceId,createdAt:stamp}),
 sync:{schemaVersion:1,strategy:'local-first',mode:'local-only',provider:'none',status:'local',localRevision:0,revision:0,serverRevision:null},release:{status:'draft',artifacts:[]}});
}
export function saveOnecWork(id,workspace){
 const p=ownedOnec(id,'edit'),clean=validateOnecWorkspace(workspace,{metadataEditable:p.manifest.onec.metadataEditable});
 workspaceAccess(p,clean,'edit');
 if(clean.entryFile!==p.workspace.entryFile)throw Error('ENTRY');
 for(const f of p.workspace.files.filter(f=>f.readOnly))if(!clean.files.some(n=>n.path===f.path&&n.content===f.content&&n.readOnly))throw Error('READ_ONLY');
 clean.revision=Math.max(p.workspace.revision+1,clean.revision);return putProject({...p,workspace:clean});
}
export function copyOnecWork(id,{workspace=null,targetBinding=null,metadataEditable=false}={}){
 const p=ownedOnec(id),input=workspace||p.workspace;
 workspaceAccess(p,validateOnecWorkspace(input,{metadataEditable}),'view');
 // Source и его checkpoint/progress остаются. Копия получает текущие права, без credit.
 return createOnecWork({title:p.title.slice(0,108)+' · копия',workspace:input,metadataEditable,origin:{...p.origin,...(targetBinding||{}),kind:'work-copy',sourceProjectId:p.id,sourceCourseId:p.origin.courseId||null,sourceRevision:p.workspace.revision,credit:'none'}});
}
export function checkpointOnecWork(id,label){const p=ownedOnec(id,'edit');return putProject({...p,checkpoints:[{id:crypto.randomUUID(),label:title(label),createdAt:new Date().toISOString(),workspace:clone(p.workspace)},...p.checkpoints]})}
export function copyOnecCheckpoint(id,checkpointId){const p=ownedOnec(id);const cp=p.checkpoints.find(c=>c.id===checkpointId);if(!cp)throw Error('CHECKPOINT');return copyOnecWork(id,{workspace:cp.workspace})}
export function exportOnecWork(id,workspace){const p=ownedOnec(id),w=workspace||p.workspace;workspaceAccess(p,validateOnecWorkspace(w,{metadataEditable:p.manifest.onec.metadataEditable}),'view');return onecExportSources(p,w)}
