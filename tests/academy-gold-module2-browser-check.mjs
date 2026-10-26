import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';
import {nativeOfflineFixture} from './helpers/native-offline-fixture.mjs';
import {module2GoldLessons} from './helpers/module2-gold-programs.mjs';
import {goldLessonRoute} from './helpers/gold-lesson-route.mjs';
import {checkGlossaryDrawer} from './helpers/glossary-drawer-checks.mjs';
import {GOLD_BASICS_LESSONS} from '../core/academy-gold-catalog.js';
const f=await nativeOfflineFixture('module2-gold'),online=await onlineRuntimeFixture(),prefix='/releases/'+f.generation,all=await module2GoldLessons();
const checks=[],widths=[320,360,390,768,1366,1440],phrase='SYNTHETIC module two local phrase';let local,vaultId,fatal;
const check=async(name,action)=>{const start=performance.now();const detail=await action();checks.push({name,status:'PASS',ms:Math.round(performance.now()-start),detail});console.log('PASS '+name);};
const personal=id=>'// SYNTHETIC personal '+id+'\nint main(){return 0;}';
try{
 await online.page.goto(online.origin+'/#view=home');await online.page.locator('.visual-home').waitFor();await online.waitReady();
 await check('Home: нет тел Gold и компилятора в ресурсах документа',async()=>{
  const resources=await online.page.evaluate(()=>performance.getEntriesByType('resource').map(r=>new URL(r.name).pathname));assert.ok(!resources.some(p=>/gold\/.*json|llvm|clang|runno|sandbox\/providers/.test(p)));return{resources,backgroundPrecacheExcluded:true};
 });
 const payload=await online.page.evaluate(async({prefix,ids})=>{
  const {patchLesson,loadState}=await import(prefix+'/core/storage.js'),{verifiedAccount}=await import(prefix+'/core/account-storage.js'),{makeLocalPayload}=await import(prefix+'/pwa/offline-transfer.js');
  for(const id of ids){const code='// SYNTHETIC personal '+id+'\nint main(){return 0;}';patchLesson(id,{completed:true,quiz:2,code,stdin:'17\n',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:4,files:[{path:'main.cpp',content:code,languageId:'cpp'},{path:'notes.hpp',content:'// SYNTHETIC header',languageId:'cpp'}]}});}
  const projects=[{id:'synthetic-m2-project',title:'SYNTHETIC preserved project',languageId:'cpp',workspace:{entryFile:'main.cpp',activeFile:'main.cpp',files:[{path:'main.cpp',content:'// SYNTHETIC project\nint main(){return 42;}',languageId:'cpp'}]},progress:{milestones:[1]},checkpoints:[],access:{workspaceKind:'personal'}}];
  return makeLocalPayload({account:verifiedAccount(),state:loadState(),projects,isOwner:()=>true});
 },{prefix,ids:GOLD_BASICS_LESSONS});
 local=await f.launch();await local.goto(f.origin+'/offline.html#view=home');await f.waitReady();
 vaultId=await local.evaluate(async({prefix,payload,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().create(payload,phrase);await s.lock();return s.id;},{prefix,payload,phrase});
 await f.closeBrowser();f.networkDown();local=await f.launch();await local.goto(f.origin+'/offline.html#copy='+vaultId);await local.locator('#localPhrase').fill(phrase);await local.locator('#unlockLocal button').click();await local.locator('#psNewProject').waitFor();
 await check('24 RU/EN урока одинаковы online и после полного закрытия браузера без сети',async()=>{
  for(const locale of ['ru','en'])for(const id of GOLD_BASICS_LESSONS){
   const g=all.find(g=>g.lessonId===id&&g.locale===locale);
   await goldLessonRoute(online.page,id,locale);await goldLessonRoute(local,id,locale);
   assert.equal(await local.locator('.academy-gold').textContent(),await online.page.locator('.academy-gold').textContent());
   assert.equal(await local.locator('[data-gold-question]').count(),g.assessment.length+(g.readinessCheck?.length||0));
   assert.equal(await local.locator('[data-gold-practicum]').count(),Number(!!g.blockPracticum)+Number(!!g.modulePracticum));
   for(const p of [online.page,local]){
    assert.equal(await p.locator('#editor').inputValue(),personal(id));assert.equal(await p.locator('#stdin').inputValue(),'17\n');assert.ok(await p.locator('input[name="quiz"][value="2"]').isChecked());assert.match(await p.locator('#completeLesson').textContent(),/✓/);
    const files=await p.locator('#editor').evaluate(n=>n.__nexusCodeStudio.getSnapshot().files);assert.equal(files.length,2);assert.ok(files.some(f=>f.path==='notes.hpp'&&f.content==='// SYNTHETIC header'));
   }
   if(locale==='en')assert.ok(!/[А-Яа-яЁё]/.test(await local.locator('.academy-gold').textContent()));
   await local.locator('[data-gold-next]').focus();await local.keyboard.press('Enter');assert.match(await local.locator('[data-gold-index]').textContent(),/^2 \/ /);
  }return{objects:24,entrypoints:2,personalStates:12,filesPerLesson:2};
 });
 await check('Открытые тексты, примеры и практикумы: 24 объекта при ширинах 320–1440',async()=>{
  for(const g of all){await goldLessonRoute(local,g.lessonId,g.locale);await local.locator('.academy-gold details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
   for(const width of widths){await local.setViewportSize({width,height:900});await local.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.ok(await local.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),g.lessonId+' '+g.locale+' '+width);}
  }
  await local.setViewportSize({width:390,height:844});await local.locator('[data-gold-practicum]').last().scrollIntoViewIfNeeded();await local.screenshot({path:path.join(f.out,'module2-project-390.png')});
  await local.setViewportSize({width:1366,height:900});await local.locator('[data-gold-viz]').scrollIntoViewIfNeeded();await local.screenshot({path:path.join(f.out,'module2-model-1366.png')});return{objects:24,widths,cases:24*widths.length};
 });
 await check('Словарь Module 2: RU/EN, клавиатура, focus и AX tree',async()=>{
  const details=[];for(const locale of ['ru','en']){await goldLessonRoute(local,'cpp.pointers-references-addresses',locale);await local.setViewportSize({width:390,height:844});const cdp=await f.context.newCDPSession(local);details.push(await checkGlossaryDrawer(local,{cdp,probeTree:true}));await cdp.detach();}return details;
 });
 await check('Входной вопрос, ответ с объяснением и копирование сохраняют личный редактор и старый quiz',async()=>{
  await goldLessonRoute(local,GOLD_BASICS_LESSONS[0],'ru');const q=local.locator('[data-gold-readiness] [data-gold-question]').first();await q.locator('input[value="1"]').check();await q.locator('[data-gold-check]').click();assert.equal(await q.locator('[data-gold-feedback]').getAttribute('data-result'),'correct');
  const example=local.locator('.gold-example details').first();await example.locator(':scope > summary').click();await example.locator(':scope > [data-gold-copy]').click();assert.equal(await local.locator('#editor').inputValue(),personal(GOLD_BASICS_LESSONS[0]));assert.ok(await local.locator('input[name="quiz"][value="2"]').isChecked());
 });
 await check('Синтетический проект и все 12 прогрессов сохранены в зашифрованной копии',async()=>{
  const data=await local.evaluate(async({prefix,id,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().unlock(id,phrase),data=s.read();await s.lock();return data;},{prefix,id:vaultId,phrase});
  assert.deepEqual(data.projects,payload.projects);
  for(const id of GOLD_BASICS_LESSONS){const before=payload.state.courses.cpp.lessons[id],after=data.state.courses.cpp.lessons[id];for(const key of ['completed','quiz','code','stdin','workspace'])assert.deepEqual(after[key],before[key],id+' '+key);}
 });
 await check('Нет Cloud-мутаций, offline Account proof или JS ошибок',async()=>{
  assert.equal(online.requests.filter(r=>r.path.startsWith('/api/')&&r.method!=='GET').length,0);assert.equal(await local.evaluate(async prefix=>(await import(prefix+'/core/account-storage.js')).verifiedAccount(),prefix),null);assert.deepEqual(online.errors,[]);assert.deepEqual(f.errors,[]);
 });
}catch(e){fatal={message:e.message,stack:e.stack};console.error(e);await writeFile(path.join(f.out,'FAILURE.json'),JSON.stringify(fatal,null,2)+'\n');if(local&&!local.isClosed())await local.screenshot({path:path.join(f.out,'FAILURE.png')}).catch(()=>{});}
finally{await online.close();await f.finish({status:fatal?'FAIL':'PASS',checks,fatal,physicalDevice:false,realLive:false,cppExecution:false});if(fatal)process.exitCode=1;}
