// Только synthetic storage/ProjectStore: реальные аккаунты/Cloud не читаются.
import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';import path from 'node:path';
import {initializeAccountStorage,accountLocalStorage,createAccountStorageController} from '../core/account-storage.js';
import {CPP_LEGACY_LESSON_IDS,loadState,saveState,patchLesson,cppProgramProgress} from '../core/storage.js';
import {importLegacyCppV7,LEGACY_KEY} from '../core/migrations/cpp-v7.js';
import {createProject,patchProject,listProjects} from '../project-studio/project-store.js';
import {makeLocalPayload,transferPlan} from '../pwa/offline-transfer.js';import {createLearningViews} from '../core/learning-views.js';
class MemoryStorage{data=new Map();get length(){return this.data.size}key(i){return [...this.data.keys()][i]??null}getItem(k){return this.data.get(k)??null}setItem(k,v){this.data.set(k,String(v))}removeItem(k){this.data.delete(k)}}
globalThis.localStorage=new MemoryStorage();globalThis.sessionStorage=new MemoryStorage();
const account={accountId:'synthetic-m5-preservation',displayName:'SYNTHETIC',status:'active'},initialize=a=>initializeAccountStorage({account:a,loginMethods:[],enrollmentAvailable:false});initialize(account);
const actual=JSON.parse(await readFile('courses/cpp/curriculum.json')),authored=actual.programVersion==='cpp-gold-m5-v1',curriculum=structuredClone(actual);curriculum.lessons=curriculum.lessons.slice(0,50);curriculum.programVersion='cpp-gold-m4-v1';const ids=curriculum.lessons.map(l=>l.id),legacy=[...CPP_LEGACY_LESSON_IDS];assert.equal(ids.length,50);
const future=authored?actual:structuredClone(curriculum);if(!authored){future.programVersion='SYNTHETIC:M5-FUTURE';for(let i=1;i<=6;i++)future.lessons.push({id:'cpp.synthetic-m5-a'+i,sectionId:'cpp.section.oop'});}
const files=[{path:'main.cpp',content:'// SYNTHETIC main',languageId:'cpp'},{path:'include/domain.hpp',content:'// SYNTHETIC header',languageId:'cpp'},{path:'data/items.txt',content:'2 4 7\n',languageId:'cpp'}];
const sample=id=>({completed:true,quiz:1,code:'// SYNTHETIC '+id,stdin:'8\n',note:'SYNTHETIC note',workspace:{entryFile:'main.cpp',activeFile:'main.cpp',files},unknown:{preserve:true}}),checks=[],check=(name,fn)=>{fn();checks.push({name,status:'PASS'});console.log('PASS '+name)};
for(const done of [0,23,40,50])check('Состояние '+done+'/50, старые quiz/code/stdin/VFS/unknown поля сохранены',()=>{
 const complete=done===40?legacy:ids.slice(0,done);saveState({courses:{cpp:{lessons:Object.fromEntries(complete.map(id=>[id,sample(id)]))}},skills:{preserve:true}});
 const before=loadState();assert.equal(cppProgramProgress(before,curriculum).done,done);for(const id of complete)patchLesson(id,{lastViewed:'SYNTHETIC'});
 const after=loadState();for(const id of complete)for(const k of Object.keys(before.courses.cpp.lessons[id]))assert.deepEqual(after.courses.cpp.lessons[id][k],before.courses.cpp.lessons[id][k]);assert.deepEqual(after.skills,before.skills);
});
check('50/50, legacy40/40 и новые50/56 без изменения state/отзыва прежнего завершения',()=>{
 assert.throws(()=>cppProgramProgress(loadState(),{...curriculum,lessons:[...curriculum.lessons,{id:'SYNTHETIC:invalid'}]}),/CPP_PROGRAM_IDS_INVALID/);
 const s=loadState(),before=JSON.stringify(s);assert.equal(cppProgramProgress(s,curriculum).pct,100);const next=cppProgramProgress(s,future);assert.deepEqual([next.done,next.total],[50,56]);assert.deepEqual(next.legacy,{done:40,total:40,pct:100,programVersion:'cpp-v7'});assert.equal(cppProgramProgress(s,curriculum).pct,100);assert.equal(JSON.stringify(s),before);
});
check('Новые/неизвестные IDs не меняют текущие 50 и legacy40',()=>{
 for(const l of future.lessons.slice(50))patchLesson(l.id,sample(l.id));patchLesson('SYNTHETIC:unknown',sample('unknown'));
 const s=loadState();assert.equal(cppProgramProgress(s,curriculum).done,50);assert.equal(cppProgramProgress(s,future).done,56);assert.equal(cppProgramProgress(s).done,40);assert.ok(s.courses.cpp.lessons['SYNTHETIC:unknown'].unknown.preserve);
});
check('Повторный legacy import не переписывает текущие 50 записей и исходный backup',()=>{
 const raw=JSON.stringify({done:legacy.map((_,i)=>i),code:{36:'// legacy'},quiz:{36:0},projectCode:{p:'// legacy'}});accountLocalStorage().setItem(LEGACY_KEY,raw);const before=loadState();assert.equal(importLegacyCppV7().ok,true);const after=loadState();for(const id of ids)for(const k of Object.keys(before.courses.cpp.lessons[id]))assert.deepEqual(after.courses.cpp.lessons[id][k],before.courses.cpp.lessons[id][k]);assert.equal(accountLocalStorage().getItem(LEGACY_KEY),raw);importLegacyCppV7();assert.deepEqual(loadState().courses,after.courses);
});
let projects,payload;
check('Настоящий локальный ProjectStore: VFS, progress и checkpoint сохранены',()=>{
 const p=createProject({id:'synthetic-m5-project',title:'SYNTHETIC M5',entryFile:'main.cpp',files});patchProject(p.id,{progress:{milestones:['old']},checkpoints:[{id:'synthetic-old-checkpoint',workspace:p.workspace}]});projects=listProjects();assert.equal(projects.length,1);assert.deepEqual(projects[0].workspace.files,files);assert.equal(projects[0].checkpoints.length,1);
 payload=makeLocalPayload({account,state:loadState(),projects,isOwner:()=>true});assert.deepEqual(payload.state.courses,loadState().courses);assert.deepEqual(payload.projects[p.id].workspace,projects[0].workspace);assert.deepEqual(payload.projects[p.id].checkpoints,projects[0].checkpoints);
});
check('Offline transfer: конфликты/повтор/другой аккаунт не теряют новые online правки',()=>{
 const id='cpp.oop-principles',edited=structuredClone(payload),state=loadState(),p=structuredClone(projects[0]);edited.state.courses.cpp.lessons[id].code='// offline';state.courses.cpp.lessons[id].code='// online';edited.projects[p.id].workspace.files[0].content='// offline';p.workspace.files[0].content='// online';const result=transferPlan(edited,account,state,[p],{vaultId:'synthetic-m5-vault',revision:2});assert.equal(result.state.courses.cpp.lessons[id].code,'// online');assert.ok(result.conflicts.some(c=>c.kind==='progress'));assert.ok(result.conflicts.some(c=>c.kind==='project'));assert.equal(result.projects[0].action,'copy');assert.equal(transferPlan(edited,account,result.state,[p],{vaultId:'synthetic-m5-vault',revision:2}).alreadyApplied,true);assert.throws(()=>transferPlan(edited,{...account,accountId:'other'},state,[p],{vaultId:'x',revision:2}),/OFFLINE_ACCOUNT_MISMATCH/);
});
check('RU/EN: текущие50/50 и legacy40/40 показываются отдельно',()=>{
 const progress=cppProgramProgress(loadState(),curriculum);for(const locale of ['ru','en']){const views=createLearningViews({cpp:{manifest:{title:{ru:'C++',en:'C++'},description:{ru:'Курс',en:'Course'}},curriculum},prefs:{courseLocale:locale},t:k=>k,progress:()=>progress});const html=views.courseHead('overview');assert.ok(html.includes('50/50')&&html.includes('40/40')&&html.includes('aria-valuemax="50"'));}
});
check('Смена аккаунта требует navigation; независимый контекст B изолирован от A',()=>{
 const state=loadState();assert.throws(()=>initialize({...account,accountId:'synthetic-m5-other'}),/ACCOUNT_SWITCH_REQUIRES_NAVIGATION/);
 const b=createAccountStorageController({localStorage:globalThis.localStorage,sessionStorage:globalThis.sessionStorage});b.initializeAccountStorage({...account,accountId:'synthetic-m5-other'});
 assert.equal(b.accountLocalStorage().getItem('akronikl:it-nexus:state:v1'),null);assert.equal(b.accountLocalStorage().getItem('akronikl:it-nexus:projects:v1'),null);
 b.accountLocalStorage().setItem('akronikl:it-nexus:state:v1','{"synthetic":"B"}');assert.deepEqual(loadState().courses,state.courses);assert.deepEqual(listProjects(),projects);
});
check('Активная версия56: legacy и весь progress отображаются без перезаписи',()=>{const state=loadState(),before=JSON.stringify(state),p=cppProgramProgress(state,future);assert.deepEqual([p.done,p.total,p.legacy.done],[56,56,40]);for(const locale of ['ru','en']){const view=createLearningViews({cpp:{manifest:{title:{ru:'C++',en:'C++'},description:{ru:'Курс',en:'Course'}},curriculum:future},prefs:{courseLocale:locale},progress:()=>p,t:k=>k});assert.ok(view.courseHead('overview').includes('56/56'));}assert.equal(JSON.stringify(state),before);});
const out=path.resolve(process.env.NEXUS_M5_EVIDENCE||'academy-gold-m5-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'PRESERVATION.json'),JSON.stringify({status:'PASS',checks,currentIds:authored?56:50,priorIds:50,legacyIds:40,syntheticFutureIds:authored?0:56,newRegisteredIds:authored?6:0,realUserStorageRead:false,networkRequests:0,cloudWrites:0,physical:false},null,2)+'\n');
