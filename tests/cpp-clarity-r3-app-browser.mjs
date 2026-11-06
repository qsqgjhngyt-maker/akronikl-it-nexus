// Полный core/app, синтетический Account DTO. Не проверяет серверный вход.
import assert from 'node:assert/strict';import http from 'node:http';import path from 'node:path';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import {staticMime} from '../pwa/static-mime.js';
const out=path.resolve(process.env.NEXUS_CLARITY_R3_EVIDENCE||'cpp-clarity-evidence/r3-app'),frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR);await mkdir(out,{recursive:true});const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration;
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');if(u.pathname==='/__app__'){res.setHeader('content-type','text/html');return res.end('<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+prefix+'/styles/app.css"><body><main id="app"></main></body></html>');}if(u.pathname.startsWith('/api/')){res.writeHead(401,{'content-type':'application/json'});return res.end('{"error":{"code":"SYNTHETIC_NO_SERVER_SESSION"}}');}const file=path.resolve(frontend,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(frontend+path.sep))throw Error('PATH');res.setHeader('content-type',staticMime(file));res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE)),browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH}),context=await browser.newContext(),errors=[],blocked=[],checks=[];await context.route('**/*',route=>{if(!route.request().url().startsWith(origin)){blocked.push(route.request().url().split('?')[0]);return route.abort();}return route.continue();});let failure;
try{const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/__app__#course=cpp&lesson=cpp.programming-process');await p.evaluate(async prefix=>{const a=await import(prefix+'/core/account-storage.js');a.initializeAccountStorage({accountId:'synthetic-full-app',status:'active',displayName:'Synthetic'});await import(prefix+'/core/app.js');},prefix);await p.locator('[data-r3-topic="cpp.programming-process"]').waitFor();
 async function assistantAfterStage(stage){
  await p.locator('[data-stage="'+stage+'"]').click();
  await p.locator('[data-r3-panel="'+stage+'"]').waitFor({state:'visible'});
  assert.ok(await p.locator('#sidebar').isVisible());
  assert.equal(await p.evaluate(()=>document.querySelector('#app').dataset.akroniklRoute),new URL(p.url()).hash);
  await p.locator('[data-action="tools"]').click();await p.locator('[data-r3-assistant]').click();
  await p.locator('[data-akronikl-panel]').waitFor();
  assert.ok(await p.locator('[data-akronikl-message]').isVisible());
  await p.locator('[data-akronikl-close]').click();
  await p.locator('[data-akronikl-panel]').waitFor({state:'detached'});
 }
 for(const stage of ['explanation','selfcheck','practice'])await assistantAfterStage(stage);
 assert.equal(await p.locator('[data-akronikl-editor]').count(),1);
 checks.push('Existing sidebar and assistant open after every C++ stage; editor context button appears once');
await p.locator('#editor').fill('// synthetic full app work\nint main(){}');await p.waitForFunction(()=>document.querySelector('[data-r3-save]')?.dataset.state==='saved');
 await p.evaluate(()=>location.hash='#course=cpp&lesson=cpp.first-cpp-program&stage=practice');await p.locator('[data-r3-topic="cpp.first-cpp-program"]').waitFor();await p.locator('#editor').fill('// synthetic legacy work\nint main(){}');await p.evaluate(()=>location.hash='#course=cpp&lesson=cpp.pointers-references-addresses');await p.locator('[data-r3-topic="cpp.pointers-references-addresses"]').waitFor();await p.evaluate(()=>location.hash='#course=cpp&lesson=cpp.first-cpp-program&stage=practice');await p.locator('[data-r3-topic="cpp.first-cpp-program"]').waitFor();assert.match(await p.locator('#editor').inputValue(),/synthetic legacy/);await p.evaluate(()=>location.hash='#course=cpp&lesson=cpp.programming-process&stage=practice');await p.locator('[data-r3-topic]').waitFor();await p.locator('#editor').waitFor();assert.match(await p.locator('#editor').inputValue(),/synthetic full app/);checks.push('Full app: pilot, first program and pointers; legacy and pilot work restored');
 await p.evaluate(()=>location.hash='#view=offline');await p.locator('[data-offline-center]').waitFor();assert.ok(await p.locator('[data-local-import]').isVisible());checks.push('Offline centre lazy route renders and binds');
 for(const id of ['onec.p2.topic-1','onec.p7.topic-2']){await p.evaluate(id=>location.hash='#course=onec&lesson='+id,id);await p.locator('[data-r3-topic="'+id+'"]').waitFor();await p.locator('[data-stage="selfcheck"]').click();assert.ok(await p.locator('[data-r3-panel="selfcheck"]').isVisible());for(const stage of ['explanation','selfcheck','practice'])await assistantAfterStage(stage);}checks.push('Both 1C pilots route through the actual platform and ShadowRoot');assert.deepEqual(errors,[]);console.log('PASS full core/app routes, legacy persistence, offline centre and both 1C pilots');
 // The compact bar stays usable at phone widths, including after following a section link.
 await p.evaluate(()=>location.hash='#course=cpp&lesson=cpp.first-cpp-program&stage=explanation&locale=ru');
 const lesson=p.locator('[data-r3-topic="cpp.first-cpp-program"]');
 await lesson.locator('[data-stage="explanation"][aria-current="step"]').waitFor();
 const header=lesson.locator('.lesson-context');
 const toggle=header.locator('[data-action="tools"]');
 for(const width of [1366,390,320]){
  await p.setViewportSize({width,height:900});
  await p.evaluate(()=>scrollTo({top:520,behavior:'instant'}));
  await p.waitForFunction(()=>{
   const header=document.querySelector('.lesson-context').getBoundingClientRect();
   const shell=document.querySelector('.topbar').getBoundingClientRect();
   return Math.abs(scrollY-520)<2&&Math.abs(header.top-shell.bottom)<1;
  });
  const measure=()=>header.evaluate(node=>{
   const box=node.getBoundingClientRect();
   return {top:box.top,bottom:box.bottom,height:box.height,shellBottom:document.querySelector('.topbar').getBoundingClientRect().bottom,
    overflow:document.documentElement.scrollWidth>innerWidth+1,
    tabsFit:[...node.querySelectorAll('[data-stage]')].every(link=>link.scrollWidth<=link.clientWidth+1&&link.getBoundingClientRect().bottom<=box.bottom)};
  });
  const compact=await measure();
  assert.ok(compact.height<=80 && compact.top>=compact.shellBottom-1,width+' header geometry');
  assert.ok(compact.tabsFit&&!compact.overflow,width+' tab overflow');
  assert.equal(await header.locator('[aria-current="step"]').count(),1);
  const readingTop=await lesson.locator('.authored-intro').evaluate(node=>node.getBoundingClientRect().top);
  await toggle.focus();await p.keyboard.press('Enter');
  await header.locator('.lesson-tools').waitFor({state:'visible'});
  const opened=await measure();
  assert.equal(opened.height,compact.height);
  assert.ok(opened.top>=opened.shellBottom-1&&opened.tabsFit&&!opened.overflow);
  assert.equal(await lesson.locator('.authored-intro').evaluate(node=>node.getBoundingClientRect().top),readingTop);
  await p.keyboard.press('Tab');
  assert.ok(await header.locator('[data-action="outline"]').evaluate(el=>el===document.activeElement));
  await p.keyboard.press('Escape');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.ok(await toggle.evaluate(el=>el===document.activeElement));
  assert.equal(await p.evaluate(()=>scrollY),520);
 }
 await lesson.locator('.lesson-map-wrap summary').click();
 await lesson.locator('.lesson-map a[href$="at=concept-4"]').click();
 await p.waitForFunction(()=>{
  const section=document.querySelector('#concept-4').getBoundingClientRect();
  const header=document.querySelector('.lesson-context').getBoundingClientRect();
  return section.top>=header.bottom&&section.top<header.bottom+45;
 },null,{timeout:5000});
 const readingPosition=await p.evaluate(()=>scrollY);
 await lesson.locator('[data-stage="selfcheck"]').click();
 const greeting=lesson.locator('[data-question="concept-0"]');
 assert.match(await greeting.locator('pre code').textContent(),/Hello, C\+\+!/);
 await lesson.locator('[data-stage="explanation"]').click();
 await p.waitForFunction(y=>Math.abs(scrollY-y)<2,readingPosition);
 await p.setViewportSize({width:1366,height:900});
 checks.push('Compact lesson navigation at 1366/390/320, menu focus, heading anchor and restored reading position');

 // Отмена монтирования после создания header должна убрать обработчики общего root.
 await p.evaluate(async prefix=>{
  const ui=await import(prefix+'/core/cpp-clarity-r3-renderer.mjs'),state=await import(prefix+'/core/cpp-clarity-r3-session.mjs');
  const root=document.createElement('section');root.id='mountRace';document.body.append(root);
  let current=true;const base=state.createCppAccountAdapter('lesson','cpp.first-cpp-program'),OriginalObserver=globalThis.ResizeObserver;
  globalThis.ResizeObserver=class extends OriginalObserver{observe(target,...args){super.observe(target,...args);if(target.classList?.contains('lesson-context'))queueMicrotask(()=>{current=false;});}};
  let stale;try{stale=await ui.mountClarityLesson(root,{topicId:'cpp.first-cpp-program',adapter:{...base,isCurrent:()=>current&&base.isCurrent()},isCurrent:()=>current});}finally{globalThis.ResizeObserver=OriginalObserver;}
  if(stale!==null)throw Error('CANCELLED_MOUNT_RETURNED_CONTROLLER');
  globalThis.racePreviousHash=location.hash;history.replaceState(null,'','#course=cpp&lesson=cpp.first-cpp-program&locale=ru&stage=explanation');
  globalThis.raceController=await ui.mountClarityLesson(root,{topicId:'cpp.first-cpp-program',adapter:state.createCppAccountAdapter('lesson','cpp.first-cpp-program')});
 },prefix);
 for(const stage of ['selfcheck','practice','explanation']){await p.locator('#mountRace [data-stage="'+stage+'"]').click();await p.locator('#mountRace [data-r3-panel="'+stage+'"]').waitFor({state:'visible'});}
 await p.evaluate(async()=>{await globalThis.raceController.prepareNavigation();globalThis.raceController.dispose();document.querySelector('#mountRace').remove();history.replaceState(null,'',globalThis.racePreviousHash);delete globalThis.raceController;delete globalThis.racePreviousHash;});
 assert.deepEqual(errors,[]);checks.push('Cancelled mount releases root handlers; replacement controller owns all stage changes');console.log('PASS cancelled mount and fresh controller: no stale session events');
}catch(e){failure={message:e.message,stack:String(e.stack).slice(0,1800)};console.error(e);for(const p of context.pages()){console.log((await p.locator('body').innerText()).slice(-2000));await p.screenshot({path:path.join(out,'FAIL.png')});}}finally{await writeFile(path.join(out,'APP_BROWSER.json'),JSON.stringify({status:failure?'FAIL':'PASS',checks,failure,errors,blockedExternalRequests:blocked,serverAuthentication:'NOT TESTED',syntheticOnly:true},null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));if(failure)process.exitCode=1;}
