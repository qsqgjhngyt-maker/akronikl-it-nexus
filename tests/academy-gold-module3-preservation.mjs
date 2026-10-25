import {CPP_LEGACY_LESSON_IDS} from '../core/storage.js';
// Существующие production APIs, только память с синтетическими данными.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';import path from 'node:path';
import {createHash} from 'node:crypto';
import {initializeAccountStorage,accountLocalStorage} from '../core/account-storage.js';
import {loadState,saveState,patchLesson,cppProgramProgress} from '../core/storage.js';
import {createLearningViews} from '../core/learning-views.js';
import {importLegacyCppV7,getCppProgress,LEGACY_KEY} from '../core/migrations/cpp-v7.js';
import {makeLocalPayload,transferPlan} from '../pwa/offline-transfer.js';
class MemoryStorage{data=new Map();get length(){return this.data.size}key(i){return [...this.data.keys()][i]??null}getItem(k){return this.data.get(k)??null}setItem(k,v){this.data.set(k,String(v))}removeItem(k){this.data.delete(k)}}
globalThis.localStorage=new MemoryStorage();globalThis.sessionStorage=new MemoryStorage();
const account={accountId:'synthetic-m3-preservation',displayName:'Synthetic M3',status:'active'};initializeAccountStorage({account,loginMethods:[],enrollmentAvailable:false});
const curriculum=JSON.parse(await readFile('courses/cpp/curriculum.json')),ids=[...CPP_LEGACY_LESSON_IDS],m3=curriculum.sections.find(s=>s.id==='cpp.section.structured-programming').lessonIds;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex'),checks=[];
const check=(name,fn)=>{fn();checks.push({name,status:'PASS'});console.log('PASS '+name)};
const sample=id=>({completed:true,quiz:2,code:'// SYNTHETIC '+id+'\nint main(){return 17;}',stdin:'17\n',note:'SYNTHETIC note',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'notes.hpp',revision:7,files:[{path:'main.cpp',content:'int main(){return 17;}',languageId:'cpp'},{path:'notes.hpp',content:'// preserved header',languageId:'cpp'}]},unknownField:{preserve:true}});
for(const [name,done]of [['empty',0],['partial',23],['all40',40]])check('Существующий профиль '+name,()=>{saveState({schemaVersion:1,courses:{cpp:{lessons:Object.fromEntries(ids.slice(0,done).map(id=>[id,sample(id)]))}},skills:{old:true},migrations:{old:true}});assert.deepEqual(getCppProgress(),{done,total:40,pct:Math.round(done/40*100)});const before=loadState();for(const id of Object.keys(before.courses.cpp.lessons))patchLesson(id,{lastViewed:'synthetic'});const after=loadState();for(const [id,data]of Object.entries(before.courses.cpp.lessons))for(const key of Object.keys(data))assert.deepEqual(after.courses.cpp.lessons[id][key],data[key]);assert.deepEqual(after.skills,before.skills);assert.deepEqual(after.migrations,before.migrations)});
check('Legacy 40 индексов: исходник сохранён, личные правки и неизвестные ID не затёрты',()=>{
 const legacy={done:ids.map((_,i)=>i),quiz:Object.fromEntries(ids.map((_,i)=>[i,1])),code:Object.fromEntries(ids.map((_,i)=>[i,'// legacy '+i])),stdin:{30:'old'},projectCode:{p:'// project'},projectSnapshots:{p:[{id:'old-snapshot'}]}};
 const source=JSON.stringify(legacy);accountLocalStorage().setItem(LEGACY_KEY,source);
 const existing=Object.fromEntries(m3.map(id=>[id,sample(id)]));existing['cpp.synthetic-unknown']={completed:false,code:'// keep unknown'};
 saveState({courses:{cpp:{lessons:existing,legacyV7:{projectCode:{p:'// newer project'}}}},migrations:{preexisting:{keep:true}}});
 assert.equal(importLegacyCppV7().ok,true);const first=loadState();assert.equal(accountLocalStorage().getItem(LEGACY_KEY),source);
 for(const [i,id]of ids.entries()){const now=first.courses.cpp.lessons[id];assert.equal(now.legacyIndex,i);assert.equal(now.completed,true);if(existing[id]){for(const k of Object.keys(existing[id]))assert.deepEqual(now[k],existing[id][k])}else{assert.equal(now.code,'// legacy '+i);assert.equal(now.quiz,1)}}
 assert.deepEqual(first.courses.cpp.lessons['cpp.synthetic-unknown'],existing['cpp.synthetic-unknown']);assert.equal(first.courses.cpp.legacyV7.projectCode.p,'// newer project');assert.equal(first.courses.cpp.legacyV7.projectSnapshots.p[0].id,'old-snapshot');assert.deepEqual(first.migrations.preexisting,{keep:true});
 importLegacyCppV7();assert.deepEqual(loadState().courses,first.courses);
});
const project={id:'synthetic-m3-project',languageId:'cpp',title:'SYNTHETIC project',description:'Preserve',workspace:{entryFile:'main.cpp',activeFile:'include/domain.hpp',files:[{path:'main.cpp',content:'// personal main'},{path:'include/domain.hpp',content:'// personal header'}]},progress:{done:['old']},checkpoints:[{id:'cp-old',workspace:{files:[{path:'main.cpp',content:'// checkpoint'}]}}],access:{workspaceKind:'personal'}};
let payload;
check('Перенос в Offline: все поля lessons, VFS и личные checkpoints сохранены',()=>{payload=makeLocalPayload({account,state:loadState(),projects:[project],isOwner:()=>true});assert.deepEqual(payload.state.courses,loadState().courses);assert.deepEqual(payload.projects[project.id].workspace,project.workspace);assert.deepEqual(payload.projects[project.id].checkpoints,project.checkpoints);assert.equal(payload.owner.accountId,account.accountId)});
check('Трёхстороннее сравнение: конфликт курса/проекта не затирает текущие правки',()=>{const edited=structuredClone(payload),current=loadState(),currentProject=structuredClone(project);edited.state.courses.cpp.lessons[m3[0]].code='// offline edit';current.courses.cpp.lessons[m3[0]].code='// online edit';edited.projects[project.id].workspace.files[0].content='// offline project';currentProject.workspace.files[0].content='// online project';const plan=transferPlan(edited,account,current,[currentProject],{vaultId:'synthetic-vault',revision:2});assert.equal(plan.state.courses.cpp.lessons[m3[0]].code,'// online edit');assert.ok(plan.conflicts.some(c=>c.kind==='progress'));assert.ok(plan.conflicts.some(c=>c.kind==='project'));assert.equal(plan.projects[0].action,'copy');assert.ok(Object.values(plan.state.offlineConflicts).some(c=>c.local.lessons[m3[0]].code==='// offline edit'));const repeat=transferPlan(edited,account,plan.state,[currentProject],{vaultId:'synthetic-vault',revision:2});assert.equal(repeat.alreadyApplied,true);assert.throws(()=>transferPlan(edited,{...account,accountId:'other'},current,[],{vaultId:'x',revision:2}),/OFFLINE_ACCOUNT_MISMATCH/)});
// Негативная проба будущей регистрации. Намеренно не признаём 45/40 безопасным.
saveState({courses:{cpp:{lessons:Object.fromEntries(ids.map(id=>[id,{completed:true}]))}}});const historical=getCppProgress();
for(let i=1;i<=5;i++)patchLesson('cpp.synthetic-proposed-'+i,{completed:true});
const expanded=getCppProgress(),expansionReady=expanded.pct<=100&&expanded.done<=expanded.total&&historical.done===40;
check('Незарегистрированные ID сохранены, но не увеличивают счётчик старой программы',()=>{assert.deepEqual(expanded,{done:40,total:40,pct:100});assert.ok(loadState().courses.cpp.lessons['cpp.synthetic-proposed-5'].completed)});
const future={...curriculum,programVersion:'cpp-gold-m3-synthetic-v2',lessons:[...curriculum.lessons.filter(l=>ids.includes(l.id)),...Array.from({length:5},(_,i)=>({id:'cpp.synthetic-proposed-'+(i+1)}))]};
let registered;
check('Новая версия: 40/45 и исторические 40/40; затем 45/45 без перезаписи state',()=>{
 const state=loadState();for(let i=1;i<=5;i++)state.courses.cpp.lessons['cpp.synthetic-proposed-'+i].completed=false;
 const before=JSON.stringify(state),p=cppProgramProgress(state,future);assert.equal(p.done,40);assert.equal(p.total,45);assert.equal(p.pct,89);assert.deepEqual(p.legacy,{done:40,total:40,pct:100,programVersion:'cpp-v7'});assert.equal(JSON.stringify(state),before);
 for(let i=1;i<=5;i++)state.courses.cpp.lessons['cpp.synthetic-proposed-'+i].completed=true;
 registered=cppProgramProgress(state,future);assert.equal(registered.done,45);assert.equal(registered.total,45);assert.equal(registered.pct,100);
 assert.throws(()=>cppProgramProgress(state,{...future,programVersion:undefined}),/CPP_PROGRAM_VERSION_REQUIRED/);
 assert.throws(()=>cppProgramProgress(state,{...future,lessons:[...future.lessons,future.lessons[0]]}),/CPP_PROGRAM_IDS_INVALID/);
});
check('RU/EN представления используют активный denominator и показывают прежнее завершение',()=>{
 for(const locale of ['ru','en']){const views=createLearningViews({cpp:{manifest:{title:{ru:'C++',en:'C++'},description:{ru:'Курс',en:'Course'},practicumCount:0,projectCount:0},curriculum:future},prefs:{courseLocale:locale},t:k=>k,progress:()=>registered});const html=views.courseHead('overview');assert.ok(html.includes('45/45'));assert.ok(html.includes('data-legacy-completion'));assert.ok(html.includes('40/40'));assert.ok(html.includes('aria-valuemax="45"'))}
});
const observation={status:expansionReady?'PASS':'FAIL',historical,unregistered:expanded,registered,issue:'M3-P1-01',scope:'Синтетическая следующая версия проверяется отдельно от реально зарегистрированной cpp-gold-m3-v1.',requirement:'Версия программы определяет состав подсчёта. Исторические 40/40 выводятся отдельно; storage читается без миграции и перезаписи.'};
assert.deepEqual(historical,{done:40,total:40,pct:100});
const result={status:'PASS',scope:'Сохранность существующих 40 ID и синтетический offline conflict roundtrip; не доказательство LIVE; расширение реальной версии проверено отдельным content gate',checks,checksCount:checks.length,legacyIds:40,m3Ids:13,sourcePayloadSha256:hash(payload),expansionReadiness:observation,realUserStorageRead:false,networkRequests:0,cloudWrites:0};
const out=path.resolve(process.env.NEXUS_M3_EVIDENCE||'academy-gold-m3-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'PRESERVATION.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,checks:checks.length,expansionReadiness:observation}));
if(process.argv.includes('--require-expansion-ready'))assert.equal(expansionReady,true,'M3-P1-01: расширение курса не готово');
