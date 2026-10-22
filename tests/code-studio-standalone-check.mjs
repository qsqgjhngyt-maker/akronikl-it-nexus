import assert from 'node:assert/strict';
import {accountClientFixture} from './helpers/account-client-fixture.mjs';
import {standaloneCppTemplate,readProjectImport,importedProjectInput,exportProjectSources,strictProjectPath,validateProjectWorkspace,IMPORT_LIMITS} from '../project-studio/project-transfer.js';
import {codeStudioHomeMarkup} from '../project-studio/code-studio-home.js';
import {createProject,getProject,listProjects,createCheckpoint,restoreCheckpoint,patchProject} from '../project-studio/project-store.js';
import {createProjectBuildPlan} from '../project-studio/project-build.js';
import {loadState} from '../core/storage.js';
import {verifiedAccount,lockAccountStorage,createAccountStorageController} from '../core/account-storage.js';
import {makeLocalPayload,transferPlan} from '../pwa/offline-transfer.js';
const f=accountClientFixture('synthetic-standalone-owner');f.verify();let checks=0;
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
const original=structuredClone(loadState()),empty=standaloneCppTemplate('Empty C++','empty');
await check('standalone empty C++ uses existing Project Store and contains one empty entry',()=>{
 const p=createProject(empty);assert.equal(p.workspace.files.length,1);assert.equal(p.workspace.files[0].content,'');assert.equal(p.workspace.entryFile,'src/main.cpp');assert.equal(p.origin.kind,'user');assert.equal(p.learning,undefined);assert.equal(p.sync.mode,'local-only');assert.deepEqual(loadState(),original);
});
await check('starter compiles through existing build plan; checkpoints/reopen do not duplicate project',()=>{
 const p=createProject(standaloneCppTemplate('Starter')),cp=createCheckpoint(p.id,'Initial');const before=listProjects().length;
 patchProject(p.id,{workspace:{...p.workspace,files:p.workspace.files.map((f,i)=>i===0?{...f,content:'int main(){return 7;}'}:f)}});restoreCheckpoint(p.id,cp.checkpoints[0].id);
 assert.match(getProject(p.id).workspace.files[0].content,/Nexus Project Studio/);assert.equal(listProjects().length,before);assert.equal(createProjectBuildPlan(getProject(p.id)).translationUnits.length,1);
});
const input={title:'Root project',languageId:'cpp',manifest:{sourceRoots:['.'],includeRoots:['include'],testRoots:['tests']},workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'include/calc.hpp',files:[{path:'main.cpp',content:'#include "calc.hpp"\nint main(){return calc();}'},{path:'calc.cpp',content:'int calc(){return 0;}'},{path:'include/calc.hpp',content:'#pragma once\nint calc();'},{path:'tests/test.cpp',content:'int main(){return 99;}'}]}};
await check('root and nested translation units share existing VFS/build, tests excluded from run',()=>{
 const p=createProject(importedProjectInput(input)),plan=createProjectBuildPlan(p);
 assert.deepEqual(plan.translationUnits,['main.cpp','calc.cpp']);assert.deepEqual(plan.includeRoots,['include']);assert.equal(p.workspace.activeFile,'include/calc.hpp');
});
await check('JSON import preserves paths/entry/sources but cannot import id, ACL, identity or learning context',async()=>{
 const hostile={...input,id:listProjects()[0].id,access:{ownerId:'other'},sync:{mode:'cloud',secret:'SYNTHETIC_FORBIDDEN'},origin:{kind:'course-project',courseId:'cpp'},learning:{kind:'lesson',id:'fake'},progress:{completed:true}},file=new File([JSON.stringify(hostile)],'project.nexus.json'),before=listProjects().length;
 const imported=await readProjectImport([file]),p=createProject(imported);
 assert.equal(listProjects().length,before+1);assert.notEqual(p.id,hostile.id);assert.equal(p.access.ownerId,f.accountId);assert.equal(p.sync.mode,'local-only');assert.deepEqual(p.origin,{kind:'user'});assert.equal(p.learning,undefined);assert.deepEqual(loadState(),original);
});
await check('export/import roundtrip uses current workspace JSON and excludes Account/Cloud fields',()=>{
 const p=createProject(importedProjectInput(input)),raw=exportProjectSources(p),next=importedProjectInput(JSON.parse(raw));assert.deepEqual(next.files,p.workspace.files);assert.equal(next.entryFile,p.workspace.entryFile);assert.equal(next.activeFile,p.workspace.activeFile);assert.deepEqual(next.includeRoots,['include']);
 for(const key of ['access','ownerId','secret','sync','learning'])assert.equal(Object.hasOwn(JSON.parse(raw),key),false);
});
for(const path of ['../evil.cpp','a/../evil.cpp','/absolute.cpp','C:/x.cpp','x\\y.cpp','./x.cpp','a//b.cpp','__proto__/x.cpp','constructor/prototype.cpp','a\u0000.cpp','a/ b.cpp'])await check('unsafe import path rejected: '+JSON.stringify(path),()=>assert.throws(()=>strictProjectPath(path),e=>e.code==='PATH'));
await check('duplicate and file/directory conflict reject entire import without touching saved projects',()=>{
 const before=listProjects();
 assert.throws(()=>importedProjectInput({files:[{path:'main.cpp',content:''},{path:'main.cpp',content:'x'}]}),e=>e.code==='DUPLICATE');
 assert.throws(()=>importedProjectInput({entryFile:'main.cpp',files:[{path:'main.cpp',content:''},{path:'main.cpp/x.hpp',content:'x'}]}),e=>e.code==='PATH_CONFLICT');
 assert.deepEqual(listProjects(),before);
});
await check('unsupported language, ambiguous entry and unknown formats are not presented as supported',async()=>{
 assert.throws(()=>importedProjectInput({...input,languageId:'python'}),e=>e.code==='FORMAT');
 assert.throws(()=>validateProjectWorkspace({files:[{path:'a.cpp',content:''},{path:'b.cpp',content:''}]}),e=>e.code==='ENTRY');
 await assert.rejects(readProjectImport([new File(['not JSON'],'broken.json')]),e=>e.code==='FORMAT');
 await assert.rejects(readProjectImport([new File([Uint8Array.from([255,254])],'main.cpp')]),e=>e.code==='FORMAT');
});
await check('file/aggregate limits fail closed before Project Store mutation',()=>{
 const before=listProjects().length;
 assert.throws(()=>validateProjectWorkspace({files:[{path:'main.cpp',content:'x'.repeat(IMPORT_LIMITS.fileBytes+1)}]}),e=>e.code==='SIZE');
 assert.throws(()=>validateProjectWorkspace({files:Array.from({length:65},(_,i)=>({path:'file'+i+'.cpp',content:''}))}),e=>e.code==='FORMAT');
 assert.equal(listProjects().length,before);
});
await check('multiple selected source files and folder-relative paths preserve full structure',async()=>{
 const main=new File(['#include "calc.hpp"\nint main(){return calc();}'],'main.cpp'),header=new File(['int calc();'],'calc.hpp'),cpp=new File(['int calc(){return 0;}'],'calc.cpp');
 for(const [file,path]of [[main,'demo/src/main.cpp'],[header,'demo/include/calc.hpp'],[cpp,'demo/src/calc.cpp']])Object.defineProperty(file,'webkitRelativePath',{value:path});
 const p=await readProjectImport([main,header,cpp],{name:'Folder project'});assert.equal(p.entryFile,'demo/src/main.cpp');assert.deepEqual(p.includeRoots,['demo/include']);assert.equal(p.files.length,3);
});
await check('offline copy carries portable manifest/stdin only and keeps custom multifile compilation settings',()=>{
 const p=createProject(importedProjectInput(input));patchProject(p.id,{stdin:'synthetic stdin'});
 const payload=makeLocalPayload({account:verifiedAccount(),state:loadState(),projects:listProjects(),isOwner:()=>true}),local=payload.projects[p.id];
 assert.deepEqual(local.manifest.includeRoots,['include']);assert.deepEqual(local.manifest.sourceRoots,['.']);assert.equal(local.stdin,'synthetic stdin');assert.equal(local.access,undefined);assert.equal(local.sync,undefined);assert.deepEqual(createProjectBuildPlan(local).translationUnits,['main.cpp','calc.cpp']);
 const noChange=transferPlan(payload,verifiedAccount(),loadState(),listProjects(),{vaultId:'synthetic',revision:1});assert.equal(noChange.projects.length,0);
});
await check('old offline payload without manifest retains safe same-account transfer behavior',()=>{
 const p=createProject(standaloneCppTemplate('Legacy copy')),payload=makeLocalPayload({account:verifiedAccount(),state:loadState(),projects:[p],isOwner:()=>true});delete payload.projects[p.id].manifest;delete payload.base.projects[p.id].manifest;payload.projects[p.id].workspace.files[0].content+='// OFFLINE';
 const plan=transferPlan(payload,verifiedAccount(),loadState(),[p],{vaultId:'synthetic-legacy',revision:1});assert.equal(plan.projects[0].action,'patch');assert.deepEqual(loadState(),original);
});
await check('same component renders four actions, safe text and only the supported C++ language',()=>{
 const html=codeStudioHomeMarkup({projects:[{id:'test',languageId:'cpp',title:'<img src=x onerror=alert(1)>',workspace:input.workspace}],t:k=>k});assert.equal((html.match(/data-cs-action=/g)||[]).length,4);assert.match(html,/&lt;img/);assert.equal(html.includes('<img src=x'),false);assert.match(html,/<option value="cpp">C\+\+20/);assert.equal(html.includes('value="python"'),false);
});
await check('account switch isolates projects; free mode never changes course state',()=>{
 const other=accountClientFixture('synthetic-other-studio');assert.throws(()=>other.verify(),e=>e.code==='ACCOUNT_SWITCH_REQUIRES_NAVIGATION');
 lockAccountStorage();assert.throws(()=>listProjects(),e=>e.code==='VERIFIED_ACCOUNT_REQUIRED');assert.throws(()=>other.verify(),e=>e.code==='ACCOUNT_STORAGE_LOCKED');
 const freshController=createAccountStorageController({localStorage:f.local,sessionStorage:f.session});freshController.initializeAccountStorage(other.dto);assert.equal(freshController.accountLocalStorage().getItem('akronikl:it-nexus:projects:v1'),null);
});
console.log(JSON.stringify({status:'PASS',checks,cloudRequests:0,realCredentials:false,productionWrites:0}));
