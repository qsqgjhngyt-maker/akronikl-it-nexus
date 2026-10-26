// Только синтетический storage: существующие 45 ID и будущие 50 без регистрации.
import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';import path from 'node:path';
import {initializeAccountStorage,accountLocalStorage} from '../core/account-storage.js';
import {CPP_LEGACY_LESSON_IDS,loadState,saveState,patchLesson,cppProgramProgress} from '../core/storage.js';
import {importLegacyCppV7,LEGACY_KEY} from '../core/migrations/cpp-v7.js';
import {makeLocalPayload,transferPlan} from '../pwa/offline-transfer.js';
import {createLearningViews} from '../core/learning-views.js';
class MemoryStorage{data=new Map();get length(){return this.data.size}key(i){return [...this.data.keys()][i]??null}getItem(k){return this.data.get(k)??null}setItem(k,v){this.data.set(k,String(v))}removeItem(k){this.data.delete(k)}}
globalThis.localStorage=new MemoryStorage();globalThis.sessionStorage=new MemoryStorage();
const account={accountId:'synthetic-m4-preservation',displayName:'SYNTHETIC',status:'active'};initializeAccountStorage({account,loginMethods:[],enrollmentAvailable:false});
const curriculum=JSON.parse(await readFile('courses/cpp/curriculum.json')),ids=curriculum.lessons.slice(0,45).map(l=>l.id),legacy=[...CPP_LEGACY_LESSON_IDS],newIds=curriculum.lessons.slice(45).map(l=>l.id);
const future=structuredClone(curriculum);curriculum.lessons=curriculum.lessons.slice(0,45);curriculum.programVersion='cpp-gold-m3-v1';
const sample=id=>({completed:true,quiz:2,code:'// SYNTHETIC '+id,stdin:'17\n',note:'SYNTHETIC',workspace:{entryFile:'main.cpp',activeFile:'domain.hpp',files:[{path:'main.cpp',content:'// synthetic main'},{path:'domain.hpp',content:'// synthetic header'},{path:'data.txt',content:'1 2'}]},unknown:{preserve:true}});
const checks=[],check=(name,fn)=>{fn();checks.push({name,status:'PASS'});console.log('PASS '+name)};
for(const done of [0,23,40,45])check('Профиль '+done+'/45: хранение, patch и расчёт не теряют поля',()=>{
 const completed=done===40?legacy:ids.slice(0,done);saveState({courses:{cpp:{lessons:Object.fromEntries(completed.map(id=>[id,sample(id)]))}},skills:{keep:true}});
 const before=loadState();assert.equal(cppProgramProgress(before,curriculum).done,done);for(const id of completed)patchLesson(id,{lastViewed:'SYNTHETIC'});const after=loadState();for(const id of completed)for(const k of Object.keys(before.courses.cpp.lessons[id]))assert.deepEqual(after.courses.cpp.lessons[id][k],before.courses.cpp.lessons[id][k]);assert.deepEqual(after.skills,before.skills);
});
check('45/50 не удаляет 45/45 прежней версии и 40/40 legacy, state не меняется',()=>{
 const s=loadState(),before=JSON.stringify(s);assert.equal(cppProgramProgress(s,curriculum).pct,100);const p=cppProgramProgress(s,future);assert.deepEqual([p.done,p.total,p.pct],[45,50,90]);assert.deepEqual(p.legacy,{done:40,total:40,pct:100,programVersion:'cpp-v7'});assert.equal(cppProgramProgress(s,curriculum).done,45);assert.equal(JSON.stringify(s),before);
 // Расчёт прежнего curriculum доказан; автоматический UI badge всех прошлых версий не предполагается.
});
check('Новые и неизвестные ID хранятся без влияния на активные 45 и legacy 40',()=>{
 for(const id of newIds)patchLesson(id,sample(id));patchLesson('cpp.synthetic-unknown',sample('unknown'));const s=loadState();assert.equal(cppProgramProgress(s,curriculum).done,45);assert.equal(cppProgramProgress(s,future).done,50);assert.equal(cppProgramProgress(s).done,40);assert.ok(s.courses.cpp.lessons['cpp.synthetic-unknown'].unknown.preserve);
 assert.throws(()=>cppProgramProgress(s,{...future,programVersion:null}),/CPP_PROGRAM_VERSION_REQUIRED/);assert.throws(()=>cppProgramProgress(s,{...future,lessons:[...future.lessons,future.lessons[0]]}),/CPP_PROGRAM_IDS_INVALID/);
});
check('Старый импорт повторяется без перезаписи code/quiz/VFS всех 45 ID',()=>{
 const old={done:legacy.map((_,i)=>i),code:{33:'// old'},quiz:{33:0},projectCode:{p:'// legacy'}};const raw=JSON.stringify(old);accountLocalStorage().setItem(LEGACY_KEY,raw);const before=loadState();assert.equal(importLegacyCppV7().ok,true);const after=loadState();for(const id of ids)for(const k of Object.keys(before.courses.cpp.lessons[id]))assert.deepEqual(after.courses.cpp.lessons[id][k],before.courses.cpp.lessons[id][k]);assert.equal(accountLocalStorage().getItem(LEGACY_KEY),raw);importLegacyCppV7();assert.deepEqual(loadState().courses,after.courses);
});
const project={id:'synthetic-m4-project',languageId:'cpp',title:'SYNTHETIC',workspace:sample('project').workspace,checkpoints:[{id:'synthetic-checkpoint',workspace:sample('checkpoint').workspace}],access:{workspaceKind:'personal'}};let payload;
check('Offline roundtrip сохраняет 45 ID, новые/неизвестные поля, VFS и checkpoints',()=>{
 payload=makeLocalPayload({account,state:loadState(),projects:[project],isOwner:()=>true});assert.deepEqual(payload.state.courses,loadState().courses);assert.deepEqual(payload.projects[project.id].workspace,project.workspace);assert.deepEqual(payload.projects[project.id].checkpoints,project.checkpoints);
});
check('Конфликт и повторный перенос не перезаписывают новые online правки',()=>{
 const id='cpp.sorting-basic',edited=structuredClone(payload),current=loadState(),p=structuredClone(project);edited.state.courses.cpp.lessons[id].code='// offline';current.courses.cpp.lessons[id].code='// online';edited.projects[p.id].workspace.files[0].content='// offline';p.workspace.files[0].content='// online';const result=transferPlan(edited,account,current,[p],{vaultId:'synthetic-m4-vault',revision:2});assert.equal(result.state.courses.cpp.lessons[id].code,'// online');assert.ok(result.conflicts.some(c=>c.kind==='progress'));assert.ok(result.conflicts.some(c=>c.kind==='project'));assert.equal(result.projects[0].action,'copy');assert.ok(Object.values(result.state.offlineConflicts).some(c=>c.local.lessons[id].code==='// offline'));assert.equal(transferPlan(edited,account,result.state,[p],{vaultId:'synthetic-m4-vault',revision:2}).alreadyApplied,true);assert.throws(()=>transferPlan(edited,{...account,accountId:'other'},current,[p],{vaultId:'x',revision:2}),/OFFLINE_ACCOUNT_MISMATCH/);
});
check('RU/EN показывают текущий denominator и legacy badge без 50/45',()=>{
 const progress=cppProgramProgress(payload.state,future);for(const locale of ['ru','en']){const views=createLearningViews({cpp:{manifest:{title:{ru:'C++',en:'C++'},description:{ru:'Курс',en:'Course'}},curriculum:future},prefs:{courseLocale:locale},t:k=>k,progress:()=>progress});const html=views.courseHead('overview');assert.ok(html.includes('50/50'));assert.ok(html.includes('40/40'));assert.ok(html.includes('aria-valuemax="50"'));}
});
const out=path.resolve(process.env.NEXUS_M4_EVIDENCE||'academy-gold-m4-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'PRESERVATION.json'),JSON.stringify({status:'PASS',checks,currentIds:45,legacyIds:40,syntheticFutureIds:50,newRegisteredIds:5,scope:'Синтетические production APIs, не личный LIVE; UI badge истории cpp-gold-m3-v1 отдельно не реализован',realUserStorageRead:false,networkRequests:0,cloudWrites:0},null,2)+'\n');
