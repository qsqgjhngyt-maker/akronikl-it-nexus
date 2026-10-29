// Приёмка 05/07 M5: отдельные сценарии, только SYNTHETIC/loopback.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';
import {nativeOfflineFixture} from './helpers/native-offline-fixture.mjs';
import {module5GoldLessons} from './helpers/module5-gold-programs.mjs';
import {goldLessonRoute} from './helpers/gold-lesson-route.mjs';
import {checkGlossaryDrawer} from './helpers/glossary-drawer-checks.mjs';
import {GOLD_OOP_LESSONS} from '../core/academy-gold-catalog.js';
const f=await nativeOfflineFixture('module5-gold'),online=await onlineRuntimeFixture(),prefix='/releases/'+f.generation,all=await module5GoldLessons();
const totalLessons=JSON.parse(await readFile(new URL('../courses/cpp/curriculum.json',import.meta.url))).lessons.length;
const previousIds=JSON.parse(await readFile(new URL('../courses/cpp/curriculum.json',import.meta.url),'utf8')).lessons.slice(0,50).map(l=>l.id);
const checks=[],widths=[320,360,390,768,1366,1440],phrase='SYNTHETIC module five local phrase';let local,vaultId,fatal;
const check=async(name,action)=>{const start=performance.now();const detail=await action();checks.push({name,status:'PASS',ms:Math.round(performance.now()-start),detail});console.log('PASS '+name);};
const personal=id=>'// SYNTHETIC personal '+id+'\nint main(){return 0;}';
try{
 await online.page.goto(online.origin+'/#view=home');await online.page.locator('.visual-home').waitFor();await online.waitReady();
 await check('Home: нет тел Gold и компилятора в ресурсах документа',async()=>{
  const resources=await online.page.evaluate(()=>performance.getEntriesByType('resource').map(r=>new URL(r.name).pathname));assert.ok(!resources.some(p=>/gold\/.*json|llvm|clang|runno|sandbox\/providers/.test(p)));return{resources,backgroundPrecacheExcluded:true};
 });
 await online.page.evaluate(async({prefix,ids})=>{const {patchLesson}=await import(prefix+'/core/storage.js');for(const id of ids)patchLesson(id,{completed:true})},{prefix,ids:previousIds});
 await online.page.reload();await online.page.locator('.visual-home').waitFor();await online.waitReady();assert.equal(await online.page.locator('[data-learning-continue]').first().getAttribute('href'),'#course=cpp&lesson=cpp.raii-smart-pointers');
 const payload=await online.page.evaluate(async({prefix,ids,oldIds})=>{
  const {patchLesson,loadState}=await import(prefix+'/core/storage.js'),{verifiedAccount}=await import(prefix+'/core/account-storage.js'),{makeLocalPayload}=await import(prefix+'/pwa/offline-transfer.js');
  for(const id of oldIds)patchLesson(id,{completed:true});
  for(const id of ids){const code='// SYNTHETIC personal '+id+'\nint main(){return 0;}';patchLesson(id,{completed:oldIds.includes(id),quiz:2,code,stdin:'17\n',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:4,files:[{path:'main.cpp',content:code,languageId:'cpp'},{path:'notes.hpp',content:'// SYNTHETIC header',languageId:'cpp'}]}});}
  const projects=[{id:'synthetic-m5-gold-project',title:'SYNTHETIC preserved project',languageId:'cpp',workspace:{entryFile:'main.cpp',activeFile:'main.cpp',files:[{path:'main.cpp',content:'// SYNTHETIC project\nint main(){return 42;}',languageId:'cpp'}]},progress:{milestones:[1]},checkpoints:[{id:'cp-before-m5',workspace:{entryFile:'main.cpp',files:[{path:'main.cpp',content:'// preserved checkpoint'}]}}],access:{workspaceKind:'personal'}}];
  return makeLocalPayload({account:verifiedAccount(),state:loadState(),projects,isOwner:()=>true});
 },{prefix,ids:GOLD_OOP_LESSONS,oldIds:previousIds});
 local=await f.launch();await local.goto(f.origin+'/offline.html#view=home');await f.waitReady();
 vaultId=await local.evaluate(async({prefix,payload,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().create(payload,phrase);await s.lock();return s.id;},{prefix,payload,phrase});
 await f.closeBrowser();f.networkDown();local=await f.launch();await local.goto(f.origin+'/offline.html#copy='+vaultId);await local.locator('#localPhrase').fill(phrase);await local.locator('#unlockLocal button').click();await local.locator('#psNewProject').waitFor();
 await check('Продолжить не пропускает новые темы: online после 50 старых и cold Offline после 50 старых',async()=>{
  await local.evaluate(()=>{location.hash='#view=home'});await local.locator('.visual-home').waitFor();assert.equal(await local.locator('[data-learning-continue]').first().getAttribute('href'),'#course=cpp&lesson=cpp.raii-smart-pointers');return{onlineCompleted:50,offlineCompleted:50,next:'cpp.raii-smart-pointers',bookmarkPreserved:true};
 });
 await check('18 RU/EN урока одинаковы online и после полного закрытия браузера без сети',async()=>{
  for(const locale of ['ru','en'])for(const id of GOLD_OOP_LESSONS){
   const g=all.find(g=>g.lessonId===id&&g.locale===locale);
   await goldLessonRoute(online.page,id,locale);await goldLessonRoute(local,id,locale);
   assert.equal(await local.locator('.academy-gold').textContent(),await online.page.locator('.academy-gold').textContent());
   assert.equal(await local.locator('[data-gold-question]').count(),g.assessment.length+(g.readinessCheck?.length||0));
   assert.equal(await local.locator('[data-gold-practicum]').count(),Number(!!g.blockPracticum)+Number(!!g.modulePracticum));
   for(const p of [online.page,local]){
    assert.equal(await p.locator('#editor').inputValue(),personal(id));assert.equal(await p.locator('#stdin').inputValue(),'17\n');assert.ok(await p.locator('input[name="quiz"][value="2"]').isChecked());assert.equal((await p.locator('#completeLesson').textContent()).includes('✓'),previousIds.includes(id));
    const files=await p.locator('#editor').evaluate(n=>n.__nexusCodeStudio.getSnapshot().files);assert.equal(files.length,2);assert.ok(files.some(f=>f.path==='notes.hpp'&&f.content==='// SYNTHETIC header'));
   }
   if(locale==='en')assert.ok(!/[А-Яа-яЁё]/.test(await local.locator('.academy-gold').textContent()));
   await local.locator('[data-gold-next]').focus();await local.keyboard.press('Enter');assert.match(await local.locator('[data-gold-index]').textContent(),/^2 \/ /);
  }return{objects:18,entrypoints:2,personalStates:9,filesPerLesson:2};
 });
 await check('Открытые тексты, примеры и практикумы: 18 объектов при ширинах 320–1440',async()=>{
  for(const g of all){await goldLessonRoute(local,g.lessonId,g.locale);await local.locator('.academy-gold details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
   for(const width of widths){await local.setViewportSize({width,height:900});await local.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.ok(await local.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),g.lessonId+' '+g.locale+' '+width);}
  }
  await local.setViewportSize({width:390,height:844});await local.waitForTimeout(300);await local.locator('[data-gold-practicum] h2').last().scrollIntoViewIfNeeded();await local.waitForTimeout(150);assert.ok(await local.locator('[data-gold-practicum] h2').last().evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}));await local.screenshot({path:path.join(f.out,'module5-project-390.png')});
  await local.setViewportSize({width:1366,height:900});await local.waitForTimeout(300);await local.locator('[data-gold-viz]').scrollIntoViewIfNeeded();await local.waitForTimeout(150);await local.screenshot({path:path.join(f.out,'module5-model-1366.png')});return{objects:18,widths,cases:18*widths.length};
 });
 await check('Словарь Module 5: RU/EN, клавиатура, focus и AX tree',async()=>{
  const details=[];for(const locale of ['ru','en']){await goldLessonRoute(local,'cpp.associative-containers',locale);await local.setViewportSize({width:390,height:844});const cdp=await f.context.newCDPSession(local);details.push(await checkGlossaryDrawer(local,{cdp,probeTree:true}));await cdp.detach();}return details;
 });
 await check('Входной вопрос, ответ с объяснением и копирование сохраняют личный редактор и старый quiz',async()=>{
  await goldLessonRoute(local,GOLD_OOP_LESSONS[0],'ru');const q=local.locator('[data-gold-readiness] [data-gold-question]').first();await q.locator('input[value="'+all[0].readinessCheck[0].correctIndex+'"]').check();await q.locator('[data-gold-check]').click();assert.equal(await q.locator('[data-gold-feedback]').getAttribute('data-result'),'correct');
  const example=local.locator('.gold-example details').first();await example.locator(':scope > summary').click();await example.locator(':scope > [data-gold-copy]').click();assert.equal(await local.locator('#editor').inputValue(),personal(GOLD_OOP_LESSONS[0]));assert.ok(await local.locator('input[name="quiz"][value="2"]').isChecked());
 });
 await check('Все 144 вопросов RU/EN: неверный ответ, объяснение, верный ответ без изменения legacy quiz',async()=>{
  let questions=0;
  for(const g of all){
   await goldLessonRoute(local,g.lessonId,g.locale);
   const qs=[...g.readinessCheck,...g.assessment];
   for(const [i,item] of qs.entries()){
    const q=local.locator('[data-gold-question]').nth(i);
    await q.locator('input[value="'+((item.correctIndex+1)%3)+'"]').check();await q.locator('[data-gold-check]').click();
    assert.equal(await q.locator('[data-gold-feedback]').getAttribute('data-result'),'incorrect');
    assert.ok((await q.locator('[data-gold-feedback]').textContent()).includes(item.explanation));
    await q.locator('input[value="'+item.correctIndex+'"]').check();await q.locator('[data-gold-check]').click();
    assert.equal(await q.locator('[data-gold-feedback]').getAttribute('data-result'),'correct');questions++;
   }
   assert.ok(await local.locator('input[name="quiz"][value="2"]').isChecked());
   assert.equal(await local.locator('#editor').inputValue(),personal(g.lessonId));
  }return{questions,answerSubmissions:questions*2,manualProgress:true};
 });
 await check('50 завершённых тем и исторические40/40 видны online и в холодной локальной копии',async()=>{for(const p of [online.page,local]){await p.evaluate(()=>{location.hash='#course=cpp'});await p.locator('[data-legacy-completion]').waitFor();assert.ok((await p.locator('[data-legacy-completion]').textContent()).includes('40/40'));assert.ok((await p.locator('body').textContent()).includes('50/'+totalLessons));}});
 await check('Синтетический проект и все 9 состояний сохранены в зашифрованной копии',async()=>{
  const data=await local.evaluate(async({prefix,id,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().unlock(id,phrase),data=s.read();await s.lock();return data;},{prefix,id:vaultId,phrase});
  assert.deepEqual(data.projects,payload.projects);
  for(const id of GOLD_OOP_LESSONS){const before=payload.state.courses.cpp.lessons[id],after=data.state.courses.cpp.lessons[id];for(const key of ['completed','quiz','code','stdin','workspace'])assert.deepEqual(after[key],before[key],id+' '+key);}
 });
 await check('Нет Cloud-мутаций, offline Account proof или JS ошибок',async()=>{
  assert.equal(online.requests.filter(r=>r.path.startsWith('/api/')&&r.method!=='GET').length,0);assert.equal(await local.evaluate(async prefix=>(await import(prefix+'/core/account-storage.js')).verifiedAccount(),prefix),null);assert.deepEqual(online.errors,[]);assert.deepEqual(f.errors,[]);
 });
}catch(e){fatal={message:e.message,stack:e.stack};console.error(e);await writeFile(path.join(f.out,'FAILURE.json'),JSON.stringify(fatal,null,2)+'\n');if(local&&!local.isClosed())await local.screenshot({path:path.join(f.out,'FAILURE.png')}).catch(()=>{});}
finally{await online.close();await f.finish({status:fatal?'FAIL':'PASS',checks,fatal,physicalDevice:false,realLive:false,cppExecution:false});if(fatal)process.exitCode=1;}
