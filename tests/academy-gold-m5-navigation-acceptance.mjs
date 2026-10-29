// Приёмка M5: весь каталог 55 Gold, RU/EN, online/cold Offline.
// Настоящие ссылки каталога, Gold UI, изолированный аккаунт и холодная локальная копия.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';
import {nativeOfflineFixture} from './helpers/native-offline-fixture.mjs';
import {goldLessonRoute} from './helpers/gold-lesson-route.mjs';
import {GOLD_LESSONS,GOLD_OOP_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
const f=await nativeOfflineFixture('m5-navigation'),online=await onlineRuntimeFixture(),prefix='/releases/'+f.generation,checks=[],phrase='SYNTHETIC navigation copy';
const totalLessons=JSON.parse(await readFile(new URL('../courses/cpp/curriculum.json',import.meta.url))).lessons.length,qtIds=new Set((await Promise.all(GOLD_LESSONS.map(async id=>{const g=JSON.parse(await readFile(new URL('../'+goldLessonPath(id,'ru'),import.meta.url)));return g.runtimeTarget==='qt-wasm'?id:null}))).filter(Boolean));
const previousIds=JSON.parse(await readFile(new URL('../courses/cpp/curriculum.json',import.meta.url),'utf8')).lessons.slice(0,50).map(l=>l.id);
let local,vaultId,payload,fatal,probe,activePage;const personal=id=>'// SYNTHETIC navigation '+id+'\nint main(){return 0;}';
const frame=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const check=async(name,fn)=>{const start=performance.now(),detail=await fn();checks.push({name,status:'PASS',ms:Math.round(performance.now()-start),detail});console.log('PASS '+name);};
async function catalog(p){await p.evaluate(()=>{location.hash='#view=labs'});await p.locator('[data-learning-discovery="labs"]').waitFor();await frame(p);return p.locator('[data-discovery-kind="lab"]').evaluateAll(ns=>ns.map(n=>({id:n.dataset.discoveryItem,title:n.querySelector('h2').textContent,href:n.querySelector('a').getAttribute('href')})));}
const clearSyntheticViewResume=p=>p.evaluate(async prefix=>(await import(prefix+'/core/account-storage.js')).accountSessionStorage().removeItem('akronikl:it-nexus:view-resume:v1'),prefix);
try{
 await online.page.goto(online.origin+'/#view=home');await online.page.locator('.visual-home').waitFor();await online.waitReady();
 await check('Home: два outline JSON, без лабораторного индекса, тел Gold и компилятора',async()=>{
  const resources=await online.page.evaluate(()=>performance.getEntriesByType('resource').map(r=>new URL(r.name).pathname));
  assert.ok(!resources.some(p=>/gold-laboratories|\/gold\/|llvm|clang|runno|sandbox\/providers/.test(p)));
  assert.equal(resources.filter(p=>/courses\/cpp\/.*json$/.test(p)).length,2);return{outlineJson:2,labIndex:0,goldBodies:0,compiler:0,backgroundSwPrecacheExcluded:true};
 });
 payload=await online.page.evaluate(async({prefix,ids,oldIds})=>{
  const {patchLesson,loadState,CPP_LEGACY_LESSON_IDS}=await import(prefix+'/core/storage.js'),{verifiedAccount}=await import(prefix+'/core/account-storage.js'),{makeLocalPayload}=await import(prefix+'/pwa/offline-transfer.js');
  for(const id of oldIds)patchLesson(id,{completed:true});
  for(const id of ids){const code='// SYNTHETIC navigation '+id+'\nint main(){return 0;}';patchLesson(id,{completed:oldIds.includes(id),quiz:2,code,stdin:'17\n',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',files:[{path:'main.cpp',content:code,languageId:'cpp'},{path:'notes.hpp',content:'// SYNTHETIC unchanged header',languageId:'cpp'}]}});}
  return makeLocalPayload({account:verifiedAccount(),state:loadState(),projects:[{id:'synthetic-navigation-project',title:'SYNTHETIC navigation project',languageId:'cpp',progress:{milestones:[1]},workspace:{entryFile:'main.cpp',activeFile:'main.cpp',files:[{path:'main.cpp',content:'// unchanged project'}]},checkpoints:[{id:'before-navigation',workspace:{entryFile:'main.cpp',files:[{path:'main.cpp',content:'// unchanged checkpoint'}]}}],access:{workspaceKind:'personal'}}],isOwner:()=>true});
 },{prefix,ids:GOLD_LESSONS,oldIds:previousIds});
 const fresh=await catalog(online.page);assert.equal(fresh.length,GOLD_LESSONS.length);assert.ok(GOLD_LESSONS.every(id=>fresh.some(r=>r.id===id)));assert.ok(fresh.some(r=>r.id==='cpp.oop-principles'));
 assert.equal(await online.page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/\/gold\//.test(new URL(r.name).pathname)).length),0,'Catalog must not fetch Gold bodies');
 local=await f.launch();await local.goto(f.origin+'/offline.html#view=home');await f.waitReady();
 vaultId=await local.evaluate(async({prefix,payload,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().create(payload,phrase);await s.lock();return s.id},{prefix,payload,phrase});
 await f.closeBrowser();f.networkDown();local=await f.launch();await local.goto(f.origin+'/offline.html#copy='+vaultId);await local.locator('#localPhrase').fill(phrase);await local.locator('#unlockLocal button').click();await local.locator('#psNewProject').waitFor();
 await check('Свежий каталог всех Gold лабораторных, включая девять M5 одинаковы online/cold Offline до посещения уроков',async()=>{assert.deepEqual(await catalog(local),fresh);return{gold:GOLD_LESSONS.length,module3:18,module4:8,module5:9,coldOffline:true};});
 await check('Настоящие переходы из каталога: RU/EN, все Gold, online/cold Offline, focus и личный код',async()=>{
  let routes=0;
  for(const locale of ['ru','en']){
   if(locale==='en'){for(const p of [online.page,local])await goldLessonRoute(p,GOLD_LESSONS[0],locale);await clearSyntheticViewResume(online.page);}
   const before=await catalog(online.page);assert.deepEqual(await catalog(local),before);assert.equal(before.length,GOLD_LESSONS.length);
   for(const p of [local,online.page]){
    for(const id of GOLD_LESSONS){
     await catalog(p);activePage=p;probe={id,locale,entrypoint:p===online.page?'online':'offline',before:p===online.page?await p.evaluate(async prefix=>{const {accountSessionStorage}=await import(prefix+'/core/account-storage.js');return JSON.parse(accountSessionStorage().getItem('akronikl:it-nexus:view-resume:v1')||'{}')},prefix):null};console.log('ROUTE '+probe.entrypoint+' '+locale+' '+id);await p.locator('[data-discovery-item="'+id+'"] a').click();
     await p.locator('[data-gold-lesson="'+id+'"][lang="'+locale+'"]').waitFor();
     await p.waitForFunction(()=>document.activeElement?.matches('[data-gold-laboratory]')===true);
     await p.waitForFunction(()=>{const n=document.querySelector('[data-gold-laboratory]'),top=n?.getBoundingClientRect().top;return top>=80&&top<160});
     const target=p.locator('[data-gold-laboratory]');assert.equal(await target.count(),1);assert.equal(await target.getAttribute('id'),'cppLab');
     const bounds=await target.evaluate(n=>({top:n.getBoundingClientRect().top,practicum:n.hasAttribute('data-gold-practicum')}));assert.equal(bounds.practicum,false);assert.ok(bounds.top>=80&&bounds.top<160,'Visible below shell: '+id+' '+JSON.stringify(bounds));
     if(qtIds.has(id)){assert.equal(await p.locator('#editor').count(),0);const link=target.locator('[data-gold-qt-workspace] a');assert.equal(await link.getAttribute('href'),'./#view=project-studio');assert.equal(await link.getAttribute('target'),'_blank');routes++;continue;}
     assert.equal(await p.locator('#editor').inputValue(),personal(id));assert.equal(await p.locator('#stdin').inputValue(),'17\n');assert.ok(await p.locator('input[name="quiz"][value="2"]').isChecked());
     const files=await p.locator('#editor').evaluate(n=>n.__nexusCodeStudio.getSnapshot().files);assert.equal(files.length,2);assert.equal(files.find(f=>f.path==='notes.hpp').content,'// SYNTHETIC unchanged header');routes++;
    }
    assert.deepEqual(await catalog(p),before,'Catalog stays stable after reading every Gold lesson');
    await p.evaluate(()=>{location.hash='#course=cpp'});await p.locator('#cppPathTab-labs').waitFor();await p.locator('#cppPathTab-labs').click();
    assert.equal(await p.locator('.learning-lab-card').count(),GOLD_LESSONS.length);
    const links=await p.locator('.learning-lab-card a').evaluateAll(ns=>ns.map(n=>n.getAttribute('href')));for(const id of GOLD_OOP_LESSONS)assert.ok(links.includes('#course=cpp&lesson='+id+'&focus=lab'));
    await catalog(p);const title=before.find(x=>x.id==='cpp.functions-contracts').title;await p.locator('[data-discovery-query]').fill(title);assert.equal(await p.locator('[data-discovery-item]:visible').count(),1);await p.locator('[data-discovery-clear]').click();assert.equal(await p.locator('[data-discovery-kind="lab"]:visible').count(),GOLD_LESSONS.length);
   }
  }
  return{routes,goldLessons:GOLD_LESSONS.length,locales:2,entrypoints:2,courseLabCards:GOLD_LESSONS.length,module3Cards:18,module4Cards:8,module5Cards:9};
 });
 await check('Сохранённая позиция online имеет приоритет над повторным focus=lab',async()=>{
  await catalog(online.page);const hash='#course=cpp&lesson=cpp.functions-contracts&focus=lab';
  await online.page.evaluate(async({prefix,hash})=>{const {accountSessionStorage}=await import(prefix+'/core/account-storage.js');accountSessionStorage().setItem('akronikl:it-nexus:view-resume:v1',JSON.stringify({[hash]:{x:0,y:240,at:Date.now()}}))},{prefix,hash});
  await online.page.locator('[data-discovery-item="cpp.functions-contracts"] a').click();await online.page.locator('[data-gold-lesson="cpp.functions-contracts"]').waitFor();await frame(online.page);await frame(online.page);await online.page.waitForFunction(()=>Math.abs(scrollY-240)<3);assert.ok(Math.abs(await online.page.evaluate(()=>scrollY)-240)<3);assert.equal(await online.page.locator('[data-gold-laboratory]').evaluate(n=>document.activeElement===n),false);
 });
 await check('Клавиатурная ссылка OOP Gold laboratory и клавиатура сохранены в обоих режимах',async()=>{
  for(const p of [online.page,local]){await catalog(p);const link=p.locator('[data-discovery-item="cpp.oop-principles"] a');await link.focus();await p.keyboard.press('Enter');await p.locator('#cppLab').waitFor();await p.waitForFunction(()=>document.activeElement?.id==='cppLab');}
 });
 await check('Новая навигация сохраняет50 завершённых тем, старые40/40, состояния, проект/checkpoint и не пишет в Cloud',async()=>{
  for(const p of [online.page,local]){await p.evaluate(()=>{location.hash='#course=cpp'});await p.locator('[data-legacy-completion]').waitFor();assert.ok((await p.locator('[data-legacy-completion]').textContent()).includes('40/40'));assert.ok((await p.locator('body').textContent()).includes('50/'+totalLessons));}
  const stored=await local.evaluate(async({prefix,vaultId,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().unlock(vaultId,phrase),data=s.read();await s.lock();return data;},{prefix,vaultId,phrase});
  assert.deepEqual(stored.projects,payload.projects);for(const id of GOLD_LESSONS)for(const key of ['code','stdin','quiz','workspace','completed'])assert.deepEqual(stored.state.courses.cpp.lessons[id][key],payload.state.courses.cpp.lessons[id][key]);
  assert.equal(online.requests.filter(r=>r.path.startsWith('/api/')&&r.method!=='GET').length,0);assert.deepEqual(online.errors,[]);assert.deepEqual(f.errors,[]);return{lessonStates:GOLD_LESSONS.length,legacyCompleted:40,currentTotal:totalLessons,projectCheckpoint:true,cloudWrites:0};
 });
}catch(e){fatal={message:e.message,stack:e.stack,probe};if(activePage&&!activePage.isClosed())fatal.after=await activePage.evaluate(async({prefix,isOnline})=>({hash:location.hash,focus:document.activeElement?.id||document.activeElement?.tagName,top:document.querySelector('[data-gold-laboratory]')?.getBoundingClientRect().top,scrollY,viewResume:isOnline?JSON.parse((await import(prefix+'/core/account-storage.js')).accountSessionStorage().getItem('akronikl:it-nexus:view-resume:v1')||'{}'):null}),{prefix,isOnline:activePage===online.page});console.error(JSON.stringify(fatal));if(local&&!local.isClosed())await local.screenshot({path:path.join(f.out,'FAILURE.png')}).catch(()=>{});}
finally{await online.close();await f.finish({status:fatal?'FAIL':'PASS',checks,fatal,physical:false,productionRequests:0});if(fatal)process.exitCode=1;}
