import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {accountClientFixture} from './helpers/account-client-fixture.mjs';
import {lockAccountStorage,accountLocalStorage} from '../core/account-storage.js';
import {createProject,getProject,patchProject} from '../project-studio/project-store.js';
import {blankCppProjectTemplate} from '../project-studio/project-templates.js';
import {importedProjectInput,exportProjectSources} from '../project-studio/project-transfer.js';
import {createProjectBuildPlan} from '../project-studio/project-build.js';
import {validateOnecWorkspace,onecImportInput,readOnecImport,bindingFor} from '../courses/onec-education/studio-profile.mjs';
import {createOnecWork,ownedOnec,saveOnecWork,copyOnecWork,checkpointOnecWork,copyOnecCheckpoint,exportOnecWork} from '../courses/onec-education/studio-store.mjs';
import {verifyBootstrap,classifyContentChanges,SCOPE_FILE} from '../tools/content-publication-route.mjs';
const sample=()=>({languageId:'onec',entryFile:'Ext/Module.bsl',files:[{path:'Ext/Module.bsl',content:'Сообщить("Учебный стенд");'},{path:'Configuration.xml',content:'<Configuration/>'},{path:'Extra.os',content:'Сообщить(1);'}]});
let fixture,p,cpp,beforeCpp;const progressKeys=['akronikl:it-nexus:onec-candidate:v1:onec','akronikl:it-nexus:onec-candidate:v1:1c-enterprise'];
test('Без проверенного контекста аккаунта создание запрещено',()=>assert.throws(()=>createOnecWork({title:'A',workspace:sample()}),/VERIFIED_ACCOUNT_REQUIRED/));
test('Профиль создаёт личную работу 1С атомарно в прежнем account store, C++ не меняется',()=>{
 fixture=accountClientFixture('synthetic-onec-s1');fixture.verify();for(const key of progressKeys)fixture.local.setItem(key,'{"preserved":"attempts/projects/provenance"}');
 cpp=createProject(blankCppProjectTemplate('Сохранённый C++'));beforeCpp=getProject(cpp.id);
 p=createOnecWork({title:'Учебная служба',workspace:sample(),origin:{courseId:'onec',topicId:'onec.p2.topic-1',contentRevision:'0.3.0-a2p2'}});
 assert.equal(p.languageId,'onec');assert.equal(p.manifest.build.runtime,'unavailable');assert.equal(p.sync.mode,'local-only');assert.equal(p.sync.provider,'none');assert.equal(p.access.ownerId,fixture.accountId);assert.deepEqual(getProject(cpp.id),beforeCpp);
});
test('Редактирование и reopen сохраняют исходники; metadata защищены',()=>{
 const w=structuredClone(p.workspace);w.files[0].content='Сообщить(60);';saveOnecWork(p.id,w);assert.equal(ownedOnec(p.id).workspace.files[0].content,'Сообщить(60);');
 const prior=accountLocalStorage().getItem('akronikl:it-nexus:projects:v1');w.files[1].content='<changed/>';assert.throws(()=>saveOnecWork(p.id,w),/READ_ONLY/);assert.equal(accountLocalStorage().getItem('akronikl:it-nexus:projects:v1'),prior);
});
test('Копии и checkpoint создают новые ID без переноса completion и изменения источника',()=>{
 const source=ownedOnec(p.id);const cp=checkpointOnecWork(p.id,'Точка');const snap=ownedOnec(p.id);const copy=copyOnecWork(p.id,{targetBinding:{courseId:'1c-enterprise',topicId:'1c-enterprise.a2.topic-3'}});assert.notEqual(copy.id,p.id);assert.equal(copy.origin.sourceProjectId,p.id);assert.equal(copy.origin.credit,'none');assert.deepEqual(copy.progress.milestones,[]);
 const w=structuredClone(copy.workspace);w.files[0].content='Копия';saveOnecWork(copy.id,w);assert.deepEqual(ownedOnec(p.id),snap);const restored=copyOnecCheckpoint(p.id,cp.checkpoints[0].id);assert.notEqual(restored.id,p.id);assert.deepEqual(restored.workspace.files,source.workspace.files);
 const unlocked=copyOnecWork(p.id,{metadataEditable:true}),next=structuredClone(unlocked.workspace);next.files[1].content='<changed/>';saveOnecWork(unlocked.id,next);assert.equal(ownedOnec(p.id).workspace.files[1].content,'<Configuration/>');
});
test('Экспорт содержит только исходники; импорт не принимает owner/ACL/id/прогресс/sync',()=>{
 const raw=JSON.parse(exportOnecWork(p.id));for(const key of ['id','access','origin','sync','progress','checkpoints'])assert.equal(raw[key],undefined);
 const imported=onecImportInput({...raw,id:p.id,access:{ownerId:'foreign'},progress:{done:true},sync:{mode:'cloud'},origin:{courseId:'foreign'}});assert.equal(imported.id,undefined);assert.equal(imported.origin.kind,'user-import');const copy=createOnecWork(imported);assert.notEqual(copy.id,p.id);assert.equal(copy.access.ownerId,fixture.accountId);
});
test('Строгие пути, типы, XML entities, дубликаты, binary и лимиты отклоняются до записи',()=>{
 for(const path of ['../x.bsl','/x.bsl','C:/x.bsl','a\\x.bsl','a//x.bsl','__proto__/x.bsl','x.exe','x.dt','x.1CD']){const w=sample();w.files.push({path,content:''});assert.throws(()=>validateOnecWorkspace(w),path)}
 for(const content of ['\0','<x>\uFFFD</x>','<!DOCTYPE x SYSTEM "file:///a">','<!ENTITY a SYSTEM "http://invalid">']){const w=sample();w.files[1].content=content;assert.throws(()=>validateOnecWorkspace(w))}
 const duplicate=sample();duplicate.files.push(duplicate.files[0]);assert.throws(()=>validateOnecWorkspace(duplicate),/DUPLICATE/);
 const conflict=sample();conflict.files.push({path:'Configuration.xml/a.bsl',content:''});assert.throws(()=>validateOnecWorkspace(conflict),/PATH_CONFLICT/);
 const big=sample();big.files[0].content='x'.repeat(262145);assert.throws(()=>validateOnecWorkspace(big),/SIZE/);
 assert.throws(()=>validateOnecWorkspace({...sample(),files:Array.from({length:65},(_,i)=>({path:i+'.bsl',content:''}))}),/FORMAT/);
});
test('Невалидный UTF-8 и слишком большой import отклоняются',async()=>{await assert.rejects(()=>readOnecImport({size:1,arrayBuffer:async()=>new Uint8Array([255]).buffer}),/FORMAT/);await assert.rejects(()=>readOnecImport({size:2097153}),/SIZE/)});
test('Ошибка quota не записывает ложный результат и не меняет источник',()=>{
 const before=ownedOnec(p.id),set=fixture.local.setItem;fixture.local.setItem=()=>{throw Error('QuotaExceededError')};const w=sample();assert.throws(()=>saveOnecWork(p.id,w),/Quota/);assert.throws(()=>copyOnecWork(p.id),/Quota/);fixture.local.setItem=set;assert.deepEqual(ownedOnec(p.id),before);
});
test('Явный DENY проверяется также для новых несохранённых путей',()=>{const old=ownedOnec(p.id);patchProject(p.id,{access:{...old.access,policies:[{effect:'deny',scope:'private/**',actions:['view','edit']}]}});const next=sample();next.files.push({path:'private/extra.os',content:'Сообщить(1);'});assert.throws(()=>saveOnecWork(p.id,next),/PRIVATE_ACCESS/);assert.throws(()=>exportOnecWork(p.id,next),/PRIVATE_ACCESS/);assert.throws(()=>copyOnecWork(p.id,{workspace:next}),/PRIVATE_ACCESS/);patchProject(p.id,{access:{...old.access,policies:[{effect:'deny',scope:'Ext/**',actions:['view','edit']}]}});assert.throws(()=>exportOnecWork(p.id),/PRIVATE_ACCESS/);assert.throws(()=>saveOnecWork(p.id,sample()),/PRIVATE_ACCESS/);patchProject(p.id,{access:old.access});});
test('Bindings существуют в A2/P2; чужие и PLANNED ID не принимаются',()=>{for(const id of ['onec','1c-enterprise']){const c=JSON.parse(fs.readFileSync(`courses/${id}/curriculum.json`));const t=c.modules[1].topics[0];assert.equal(bindingFor(c,t.topicId).contentRevision,'0.3.0-a2p2');assert.throws(()=>bindingFor(c,c.modules[2].topics[0].topicId),/TOPIC/);}});
test('Старые C++ import/export/build и два course progress остаются прежними',()=>{assert.deepEqual(getProject(cpp.id),beforeCpp);const exported=exportProjectSources(getProject(cpp.id));assert.equal(importedProjectInput(JSON.parse(exported)).languageId,'cpp');assert.ok(createProjectBuildPlan(getProject(cpp.id)).translationUnits.includes('src/main.cpp'));assert.throws(()=>importedProjectInput(JSON.parse(exportOnecWork(p.id))),/FORMAT/);for(const key of progressKeys)assert.equal(fixture.local.getItem(key),'{"preserved":"attempts/projects/provenance"}');});
test('Повреждённая база проектов не заменяется пустой при создании или сохранении',()=>{const s=accountLocalStorage(),key='akronikl:it-nexus:projects:v1',old=s.getItem(key);for(const raw of ['broken','{"schemaVersion":2,"projects":[]}','{"schemaVersion":2,"projects":{"x":null}}']){s.setItem(key,raw);assert.throws(()=>createOnecWork({title:'A',workspace:sample()}),/SAVED_DATA/);assert.throws(()=>saveOnecWork(p.id,sample()),/SAVED_DATA/);assert.equal(s.getItem(key),raw);}s.setItem(key,old);});
test('CI scope фиксирует S1 hook; изменённые bytes/mode не получают разрешение',()=>{const scope=JSON.parse(fs.readFileSync(SCOPE_FILE)),read=path=>({bytes:fs.readFileSync(path),mode:'100644'});assert.ok(verifyBootstrap(scope,read).includes('project-studio/project-studio.js'));for(const tamper of ['bytes','mode'])assert.throws(()=>verifyBootstrap(scope,path=>path==='project-studio/project-studio.js'?{bytes:tamper==='bytes'?Buffer.from('tampered'):fs.readFileSync(path),mode:tamper==='mode'?'100755':'100644'}:read(path)));});
test('S1 допуск не разрешает менять store/auth/runtime/PWA или release admission',()=>{const scope=JSON.parse(fs.readFileSync(SCOPE_FILE)),approved=scope.files.map(f=>f.path).concat(SCOPE_FILE);for(const path of ['project-studio/project-store.js','core/account-storage.js','sandbox/runtime-router.js','pwa/service-worker.js','release/P4Q_RELEASE_SCOPE.json'])assert.equal(classifyContentChanges([{path,status:'M',mode:'100644'}],{bootstrapPaths:approved}).kind,'historical-release');});
test('Блокировка контекста аккаунта закрывает все операции прежней работы',()=>{lockAccountStorage();for(const fn of [()=>ownedOnec(p.id),()=>saveOnecWork(p.id,sample()),()=>exportOnecWork(p.id),()=>copyOnecWork(p.id)])assert.throws(fn,/VERIFIED_ACCOUNT_REQUIRED/);});
