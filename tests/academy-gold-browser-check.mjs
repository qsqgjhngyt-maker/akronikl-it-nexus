// Нативный браузер, настоящие entry points, синтетический аккаунт и холодный Offline.
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {nativeOfflineFixture} from './helpers/native-offline-fixture.mjs';
import {checkGlossaryDrawer} from './helpers/glossary-drawer-checks.mjs';
import {GATEWAY_ORIGIN} from '../server-access/bff/account-read.mjs';
import {GOLD_ALGORITHM_LESSONS} from '../core/academy-gold-catalog.js';
const f=await nativeOfflineFixture('academy-gold'),frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR),prefix='/releases/'+f.generation;
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const checks=[],errors=[],requests=[],phrase='SYNTHETIC Gold local copy 2026';let browser,online,local,id;
let heldGold=null;
const personal='// SYNTHETIC learner source\nint main(){return 0;}';
const check=async(name,fn)=>{const start=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-start)});console.log('PASS '+name);};
const mime=p=>p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':'text/html';
const lessonRoute=async(p,id,locale)=>{
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 if(await p.locator('#courseLocale').getAttribute('data-value')!==locale){
  // Язык меняем на короткой Главной: восстановление позиции длинного
  // практикума не должно закрывать popup между клавишами проверки.
  await p.evaluate(()=>{location.hash='#view=home'});await p.locator('.visual-home').waitFor();
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await p.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const settings=p.locator('#visualSettings');if(await settings.getAttribute('open')===null)await settings.locator('summary').click();
  // Сначала заканчиваем прокрутку от длинного практикума: глобальный scroll
  // закрывает popup. Открывать его во время автопрокрутки focus нельзя.
  await p.locator('#courseLocale').scrollIntoViewIfNeeded();
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await p.locator('#courseLocale').focus();
  await p.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await p.keyboard.press('ArrowDown');await p.keyboard.press(locale==='ru'?'Home':'End');await p.keyboard.press('Enter');
  await p.waitForFunction(locale=>document.querySelector('#courseLocale')?.dataset.value===locale,locale);
  if(await settings.getAttribute('open')!==null)await settings.locator('summary').click();
 }
 await p.evaluate(id=>{location.hash='#course=cpp&lesson='+id},id);
 await p.locator('[data-gold-lesson="'+id+'"][lang="'+locale+'"]').waitFor();
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
};
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1366,height:900}});
 await context.addInitScript(()=>{
  const Native=MutationObserver;globalThis.__solarAudit=[];
  globalThis.MutationObserver=class extends Native{
   constructor(callback){const record={disconnects:0,solar:new Error().stack.includes('nexus-solar-system.js')};super(callback);this.record=record;if(record.solar)globalThis.__solarAudit.push(record)}
   disconnect(){this.record.disconnects++;return super.disconnect()}
  };
 });
 online=await context.newPage();online.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());requests.push({path:u.pathname,method:req.method()});
  if(u.origin!==GATEWAY_ORIGIN)return route.abort();
  if(heldGold?.path===u.pathname){
   const hold=heldGold;hold.arrival.resolve();await hold.release.promise;
   if(hold.fail)return route.fulfill({status:503,body:'SYNTHETIC_DELAYED_FAILURE'});
  }
  if(u.pathname.startsWith('/api/')){
   const body=u.pathname==='/api/v2/account'?{account:{accountId:'synthetic-gold-owner',displayName:'Synthetic Gold',status:'active'},loginMethods:[{id:'synthetic-key',kind:'passkey',status:'active',createdAt:'2026-10-24T00:00:00Z',disabledAt:null}],enrollmentAvailable:false}:null;
   return route.fulfill({status:body?200:403,headers:{'content-type':'application/json','cache-control':'no-store',vary:'*'},body:JSON.stringify(body||{error:{code:'SYNTHETIC_DENIED'}})});
  }
  try{const file=u.pathname==='/'?'nexus-shell.html':u.pathname.slice(1),target=path.resolve(frontend,file);assert.ok(target.startsWith(frontend+path.sep));return route.fulfill({status:200,contentType:mime(file),body:await readFile(target)});}catch{return route.fulfill({status:404,body:'SYNTHETIC_NOT_FOUND'});}
 });
 await online.goto(GATEWAY_ORIGIN+'/#view=home');await online.locator('.visual-home').waitFor();
 await check('Старт Home не загружает Gold JSON, визуализатор или CSS',async()=>{assert.equal(requests.filter(r=>/gold\//.test(r.path)||/academy-gold-(presentation|model)\.js|academy-gold\.css/.test(r.path)).length,0);});
 await check('Поздний Gold ответ и ошибка после перехода Home не заменяют текущий экран',async()=>{
  for(const [lessonId,fail] of [[GOLD_ALGORITHM_LESSONS[1],false],[GOLD_ALGORITHM_LESSONS[2],true]]){
   heldGold={path:prefix+'/courses/cpp/gold/algorithms/'+lessonId.slice(4)+'.ru.json',fail,arrival:Promise.withResolvers(),release:Promise.withResolvers()};
   await online.evaluate(id=>{location.hash='#course=cpp&lesson='+id},lessonId);
   await heldGold.arrival.promise;
   if(!fail){
    // JSON удерживается: CSS и Sandbox обязаны подготовиться независимо.
    await online.waitForFunction(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('/styles/academy-gold.css'))&&performance.getEntriesByType('resource').some(r=>r.name.includes('/sandbox/sandbox.js')));
   }
   await online.evaluate(()=>{location.hash='#view=home'});
   await online.locator('[data-nexus-route="#view=home"] .visual-home').waitFor();
   heldGold.release.resolve();
   await online.evaluate(async({prefix,id})=>{
    const registry=await import(prefix+'/core/course-registry.js');
    await registry.getCppGoldLesson(id,'ru').catch(()=>{});
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   },{prefix,id:lessonId});
   assert.equal(await online.locator('.visual-home').count(),1);
   assert.equal(await online.locator('.route-error-detail,[data-gold-lesson],#editor').count(),0);
   heldGold=null;
  }
 });
 const payload=await online.evaluate(async({prefix,personal,id})=>{
  const {patchLesson,loadState}=await import(prefix+'/core/storage.js'),{verifiedAccount}=await import(prefix+'/core/account-storage.js'),{makeLocalPayload}=await import(prefix+'/pwa/offline-transfer.js');
  patchLesson(id,{completed:true,quiz:2,code:personal,stdin:'7\n',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:4,files:[{path:'main.cpp',content:personal,languageId:'cpp'},{path:'notes.hpp',content:'// SYNTHETIC header',languageId:'cpp'}]}});
  return makeLocalPayload({account:verifiedAccount(),state:loadState(),projects:[],isOwner:()=>true});
 },{prefix,personal,id:GOLD_ALGORITHM_LESSONS[0]});
 local=await f.launch();await local.goto(f.origin+'/offline.html#view=home');await f.waitReady();
 id=await local.evaluate(async({prefix,payload,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js');const session=await createVaultStore().create(payload,phrase);await session.lock();return session.id;},{prefix,payload,phrase});
 await f.closeBrowser();f.networkDown();local=await f.launch();await local.goto(f.origin+'/offline.html#copy='+id);await local.locator('#localPhrase').fill(phrase);await local.locator('#unlockLocal button').click();await local.locator('#psNewProject').waitFor();
 await check('Все 8 уроков RU/EN совпадают online и после холодного запуска без сети',async()=>{
  for(const locale of ['ru','en'])for(const lessonId of GOLD_ALGORITHM_LESSONS){
   await lessonRoute(online,lessonId,locale);await lessonRoute(local,lessonId,locale);
   assert.equal(await local.locator('.academy-gold').textContent(),await online.locator('.academy-gold').textContent());
   assert.equal(await local.locator('[data-gold-question]').count(),3);
   const next=local.locator('[data-gold-next]'),index=local.locator('[data-gold-index]');await next.click();assert.match(await index.textContent(),/^2 \/ /);
   if(locale==='en'){assert.ok(!/[А-Яа-яЁё]/.test(await local.locator('[data-gold-viz] [data-gold-explanation]').textContent()));assert.ok(!/[А-Яа-яЁё]/.test(await local.locator('.answers').textContent()));}
  }
 });
 await check('Стабильный ID сохраняет завершение, старый quiz, stdin и два личных файла',async()=>{
  for(const p of [online,local]){await lessonRoute(p,GOLD_ALGORITHM_LESSONS[0],'ru');assert.equal(await p.locator('#editor').inputValue(),personal);assert.equal(await p.locator('#stdin').inputValue(),'7\n');assert.ok(await p.locator('#completeLesson').textContent().then(t=>t.includes('✓')));assert.ok(await p.locator('input[name="quiz"][value="2"]').isChecked());const files=await p.locator('#editor').evaluate(n=>n.__nexusCodeStudio.getSnapshot().files);assert.equal(files.length,2);assert.ok(files.some(x=>x.path==='notes.hpp'&&x.content==='// SYNTHETIC header'));}
 });
 await check('Модель Евклида: ошибочная пара 0,0 и восстановление управления',async()=>{
  await lessonRoute(local,'cpp.pseudocode-euclidean-algorithm','en');await local.locator('[data-gold-var="a"]').fill('0');await local.locator('[data-gold-var="b"]').fill('0');assert.ok(await local.locator('[data-gold-error]').isVisible());assert.ok(await local.locator('[data-gold-next]').isDisabled());await local.locator('[data-gold-var="a"]').fill('48');await local.locator('[data-gold-var="b"]').fill('18');assert.ok(await local.locator('[data-gold-error]').isHidden());await local.locator('[data-gold-next]').focus();await local.keyboard.press('Enter');assert.match(await local.locator('[data-gold-index]').textContent(),/^2 \/ /);
 });
 await check('Mobile 390px и 360px: схема прокручивается внутри, страница не расширяется',async()=>{
  await lessonRoute(local,'cpp.flowcharts','ru');
  for(const width of [390,360]){await local.setViewportSize({width,height:844});await local.waitForFunction(()=>{const g=document.querySelector('[data-gold-graphic]'),a=g?.querySelector('.gold-node.active');if(!a)return false;const b=g.getBoundingClientRect(),c=a.getBoundingClientRect();return c.left>=b.left&&c.right<=b.right;});assert.ok(await local.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const graphic=local.locator('[data-gold-graphic]');await graphic.focus();assert.equal(await graphic.getAttribute('tabindex'),'0');assert.ok(await graphic.evaluate(n=>n.scrollWidth>n.clientWidth));await local.screenshot({path:path.join(f.out,'mobile-'+width+'.png'),fullPage:true});await local.locator('[data-gold-viz]').evaluate(n=>scrollTo(0,scrollY+n.getBoundingClientRect().top-90));await local.locator('[data-gold-viz]').screenshot({path:path.join(f.out,'model-'+width+'.png')});}
  await local.setViewportSize({width:1366,height:900});await local.screenshot({path:path.join(f.out,'desktop-flowchart.png'),fullPage:true});await local.locator('[data-gold-viz]').screenshot({path:path.join(f.out,'model-desktop.png')});
 });
 await check('Контрольный вопрос Gold показывает объяснение без автоматической оценки проекта',async()=>{const q=local.locator('[data-gold-question]').first();await q.locator('input[value="0"]').check();await q.locator('[data-gold-check]').click();assert.equal(await q.locator('[data-gold-feedback]').getAttribute('data-result'),'correct');assert.ok((await q.locator('[data-gold-feedback]').textContent()).length>15);});
 await check('Открытые примеры всех 8 RU/EN уроков сохраняют ширину 320–1440px online и offline',async()=>{
  for(const p of [online,local])for(const locale of ['ru','en'])for(const lessonId of GOLD_ALGORITHM_LESSONS){
   await lessonRoute(p,lessonId,locale);
   await p.locator('.academy-gold details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
   for(const width of [320,360,390,768,1024,1440]){
    await p.setViewportSize({width,height:900});
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${locale} ${lessonId} ${width}`);
   }
  }
  for(const p of [online,local])await p.setViewportSize({width:1366,height:900});
 });
 await check('Итоговый практикум RU/EN online и offline: рубрика, скрытый эталон и неизменный редактор',async()=>{
  for(const locale of ['ru','en'])for(const p of [online,local]){
   await lessonRoute(p,'cpp.languages-compilation-debugging',locale);
   const project=p.locator('[data-gold-practicum]'),editorBefore=await p.locator('#editor').inputValue();
   assert.equal(await project.count(),1);assert.equal(await project.locator('a[href^="#course=cpp"]').count(),8);
   assert.equal(await project.locator('.gold-project-rubric>li').count(),5);assert.ok(await project.locator('.gold-case-list>li').count()>=21);
   const reference=project.locator('details').last();assert.equal(await reference.locator('pre').isVisible(),false);
   await reference.locator('summary').focus();await p.keyboard.press('Enter');assert.ok(await reference.locator('pre').isVisible());
   assert.ok((await reference.locator('pre code').textContent()).includes('std::cin.eof()'));
   assert.equal(await p.locator('#editor').inputValue(),editorBefore);
   if(locale==='en')assert.ok(!/[А-Яа-яЁё]/.test(await project.textContent()));
  }
  await local.setViewportSize({width:360,height:844});assert.ok(await local.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const cases=local.locator('[data-gold-practicum] .gold-cases'),second=cases.locator('.gold-case').nth(1);
  assert.ok(await cases.evaluate(n=>n.scrollWidth<=n.clientWidth+1));
  assert.equal(await second.getAttribute('open'),null);await second.locator(':scope>summary').focus();await local.keyboard.press('Enter');assert.notEqual(await second.getAttribute('open'),null);
  assert.ok(await second.locator('.gold-case-values').isVisible());
  await cases.screenshot({path:path.join(f.out,'practicum-cases-360.png')});
  await local.locator('[data-gold-practicum]').screenshot({path:path.join(f.out,'practicum-360.png')});
  await local.setViewportSize({width:1366,height:900});
 });
 await check('Home освобождает сцену, observers, диалог и flight при навигации и удалении владельца',async()=>{
  const home=async()=>{await online.evaluate(()=>{location.hash='#view=home'});await online.locator('.visual-home').waitFor();};
  const cdp=await context.newCDPSession(online),memory=[];
  for(let i=0;i<20;i++){
   await home();await lessonRoute(online,GOLD_ALGORITHM_LESSONS[7],'ru');
   assert.equal(await online.evaluate(()=>__solarAudit.filter(r=>!r.disconnects).length),1,'Одна активная сцена на текущий shell');
   if(i===0||i===19){await cdp.send('HeapProfiler.collectGarbage');await online.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await cdp.send('HeapProfiler.collectGarbage');memory.push(await cdp.send('Memory.getDOMCounters'));}
  }
  assert.ok(memory[1].nodes<=memory[0].nodes+300,JSON.stringify(memory));
  assert.ok(memory[1].jsEventListeners<=memory[0].jsEventListeners+30,JSON.stringify(memory));
  await writeFile(path.join(f.out,'LIFECYCLE_MEMORY.json'),JSON.stringify({cycles:20,memory,scope:'Изолированный Chrome, граница regression этого fixture; не production-бюджет'},null,2));
  for(const remove of ['.visual-home','#appShell']){
   await home();await online.locator('[data-orbit-open]').click();await online.locator('dialog.nexus-system[open]').waitFor();
   await online.locator('.ns-field').focus();await online.keyboard.press('w');
   await online.locator(remove).evaluate(n=>n.remove());
   await online.waitForFunction(()=>!document.querySelector('dialog.nexus-system')&&__solarAudit.every(r=>r.disconnects));
   assert.equal(await online.evaluate(()=>document.body.style.overflow),'');
   await online.evaluate(id=>{location.hash='#course=cpp&lesson='+id},GOLD_ALGORITHM_LESSONS[7]);
   await online.locator('[data-gold-lesson="'+GOLD_ALGORITHM_LESSONS[7]+'"][lang="ru"]').waitFor();
  }
  await home();await online.locator('[data-orbit-open]').click();await online.locator('[data-solar-close]').click();
  await lessonRoute(online,GOLD_ALGORITHM_LESSONS[7],'ru');
  assert.equal(await online.locator('dialog.nexus-system').count(),0);
  // Offline сохраняет shell, но заменяет его Home: тот же lifecycle contract.
  for(let i=0;i<5;i++){
   await local.evaluate(()=>{location.hash='#view=home'});await local.locator('.visual-home').waitFor();
   await lessonRoute(local,GOLD_ALGORITHM_LESSONS[0],'ru');
  }
 });
 await check('Словарь RU/EN online/offline: hidden/inert, AX name, keyboard, search, возврат focus и route cleanup',async()=>{
  const evidence=[];
  for(const [kind,p]of [['online',online],['offline',local]]){
   const cdp=await p.context().newCDPSession(p);
   for(const locale of ['ru','en']){
    await lessonRoute(p,GOLD_ALGORITHM_LESSONS[0],locale);await p.setViewportSize({width:390,height:844});
    evidence.push({kind,locale,...await checkGlossaryDrawer(p,{cdp,probeTree:true})});
    await p.locator('#openTerms').click();await p.evaluate(()=>{location.hash='#view=home'});await p.locator('.visual-home').waitFor();
    assert.equal(await p.locator('#termDrawer:modal').count(),0);
    assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).overflow==='hidden'),false);
    await p.locator('#visualSettings summary').click();await p.keyboard.press('Escape');
   }
   await cdp.detach();await p.setViewportSize({width:1366,height:900});
  }
  await writeFile(path.join(f.out,'GLOSSARY_ACCESSIBILITY.json'),JSON.stringify({status:'PASS',evidence,physical:false,production:false},null,2));
 });
 await check('Синтетические сценарии не отправляют мутации Cloud и не выдают offline Account proof',async()=>{assert.equal(requests.filter(r=>r.path.startsWith('/api/')&&r.method!=='GET').length,0);assert.equal(await local.evaluate(async prefix=>(await import(prefix+'/core/account-storage.js')).verifiedAccount(),prefix),null);assert.deepEqual(errors,[]);assert.deepEqual(f.errors,[]);});
}catch(error){
 process.exitCode=1;checks.push({name:error.message,status:'FAIL',stack:error.stack});console.error(error.stack);
 for(const [name,p]of [['online',online],['offline',local]])if(p&&!p.isClosed()){
  const state=await p.evaluate(()=>({route:location.hash,locale:document.querySelector('#courseLocale')?.dataset.value,gold:[...document.querySelectorAll('[data-gold-lesson]')].map(x=>({id:x.dataset.goldLesson,lang:x.lang})),focus:document.activeElement?.outerHTML?.slice(0,1500),error:document.querySelector('.route-error-detail,.boot-error')?.textContent})).catch(e=>({error:e.message}));
  await writeFile(path.join(f.out,'FAILURE-'+name+'.json'),JSON.stringify(state,null,2)+'\n');
  await p.screenshot({path:path.join(f.out,'FAILURE-'+name+'.png'),fullPage:true}).catch(()=>{});
 }
}
finally{heldGold?.release.resolve();await browser?.close();await f.finish({status:process.exitCode?'FAIL':'PASS',checks,onlineErrors:errors,realLive:false,physicalDevice:false,cppExecution:false,onlineRequests:requests});}
