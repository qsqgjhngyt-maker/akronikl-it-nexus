// Полный core/app, синтетический Account DTO. Не проверяет серверный вход.
import assert from 'node:assert/strict';import http from 'node:http';import path from 'node:path';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import {staticMime} from '../pwa/static-mime.js';
const out=path.resolve(process.env.NEXUS_CLARITY_R3_EVIDENCE||'cpp-clarity-evidence/all-courses'),frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR);await mkdir(out,{recursive:true});const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration;
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');if(u.pathname==='/__app__'){res.setHeader('content-type','text/html');return res.end('<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+prefix+'/styles/app.css"><body><main id="app"></main></body></html>');}if(u.pathname.startsWith('/api/')){res.writeHead(401,{'content-type':'application/json'});return res.end('{"error":{"code":"SYNTHETIC_NO_SERVER_SESSION"}}');}const file=path.resolve(frontend,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(frontend+path.sep))throw Error('PATH');res.setHeader('content-type',staticMime(file));res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE)),browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH}),context=await browser.newContext(),errors=[],blocked=[],checks=[];await context.route('**/*',route=>{if(!route.request().url().startsWith(origin)){blocked.push(route.request().url().split('?')[0]);return route.abort();}return route.continue();});let failure;
function adjacentControls(panel){
 const selector='a[href],button:not([hidden])';
 const textRects=element=>{
  const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),rects=[];
  for(let node=walker.nextNode();node;node=walker.nextNode()){
   const text=node.textContent,trimmed=text.trim();
   if(!trimmed)continue;
   const start=text.indexOf(trimmed),range=document.createRange();
   range.setStart(node,start);range.setEnd(node,start+trimmed.length);
   rects.push(...range.getClientRects());
  }
  return rects.filter(rect=>rect.width);
 };
 const details=[...panel.querySelectorAll('details:not([open]):not([hidden])')];
 for(const node of details)node.open=true;
 const collisions=[];
 let boundaries=0;
 for(const control of panel.querySelectorAll(selector)){
  const next=control.nextElementSibling;
  if(!next?.matches(selector))continue;
  const first=[...control.getClientRects()].at(-1),second=next.getClientRects()[0];
  if(!first?.width||!second?.width)continue;
  boundaries++;
  const rowOverlap=Math.min(first.bottom,second.bottom)-Math.max(first.top,second.top);
  const gap=Math.max(second.left-first.right,first.left-second.right);
  if(rowOverlap<=1||gap>=3)continue;
  // Bordered editor tabs can touch while their text stays separated by padding.
  const a=textRects(control).at(-1),b=textRects(next)[0];
  if(!a||!b)continue;
  const textOverlap=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
  const textGap=Math.max(b.left-a.right,a.left-b.right);
  if(textOverlap>1&&textGap<3)collisions.push([control.textContent.trim(),next.textContent.trim(),textGap]);
 }
 for(const node of details)node.open=false;
 return {boundaries,collisions};
}
try{
 const p=await context.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+'/__app__#view=academy');await p.evaluate(async prefix=>{const a=await import(prefix+'/core/account-storage.js');a.initializeAccountStorage({accountId:'synthetic-all-courses',status:'active',displayName:'Synthetic'});await import(prefix+'/core/app.js');},prefix);
 const catalog=JSON.parse(await readFile('courses/clarity/courses.json','utf8'));
 if(process.env.NEXUS_CLARITY_FOCUSED!=='1')for(const course of catalog)for(const topic of course.topics)for(const locale of ['ru','en']){
  await p.evaluate(({course,id,locale})=>location.hash='#'+new URLSearchParams({course,lesson:id,locale,stage:'explanation'}),{course:course.id,id:topic.id,locale});
  const lesson=p.locator('[data-r3-topic="'+topic.id+'"][lang="'+locale+'"]');await lesson.waitFor();
  assert.equal(await lesson.locator('[data-r3-panel="explanation"] h1').count(),1);
  assert.ok(await p.locator('#sidebar').isVisible());
  let linkAndButtonBoundaries=0;
  for(const stage of ['selfcheck','practice','explanation']){
   await lesson.locator('[data-stage="'+stage+'"]').click();
   const panel=lesson.locator('[data-r3-panel="'+stage+'"]');
   await panel.waitFor({state:'visible'});
   assert.equal(await lesson.locator('[data-current-marker]:visible').count(),1);
   const {boundaries,collisions}=await panel.evaluate(adjacentControls);
   linkAndButtonBoundaries+=boundaries;
   assert.deepEqual(collisions,[],topic.id+' '+locale+' '+stage+' control spacing');
  }
  assert.equal(await lesson.locator('[data-gold-depth]').count(),0);
  assert.equal(await p.evaluate(()=>document.querySelector('#app').dataset.akroniklRoute),new URL(p.url()).hash);
  checks.push({id:topic.id,locale,stages:3,linkAndButtonBoundaries});
  if(checks.length%20===0)console.log('Opened '+checks.length+'/302 lesson editions');
 }

 for(const id of ['onec.p1.architecture','1c-enterprise.a1.orientation']){
  const l=JSON.parse(await readFile('courses/clarity/lessons/'+id+'.ru.json','utf8'));
  await p.evaluate(({id,course})=>location.hash='#'+new URLSearchParams({course,lesson:id,locale:'ru',stage:'selfcheck'}),{id,course:l.courseId});const lesson=p.locator('[data-r3-topic="'+id+'"]');await lesson.waitFor();
  for(const q of l.selfcheck.filter(q=>q.kind!=='free'))await lesson.locator('[data-answer="'+q.id+'"][value="'+q.correct+'"]').check();
  await lesson.getByRole('button',{name:'Сохранить попытку самопроверки',exact:true}).click();
  await lesson.locator('[data-stage="practice"]').click();await lesson.locator('[data-course-progress]').getByText(/Сохранённых попыток: 1/).waitFor();
  await lesson.locator('[data-course-progress] input[type="checkbox"]').check();await lesson.getByRole('button',{name:'Отметить выполненным по самоотчёту',exact:true}).click();await lesson.locator('[data-course-progress]').getByText(/Сохранённая отметка прохождения есть/).waitFor();
 }
 console.log('PASS explicit self-check attempts and practice attestations in both 1C courses');
 // Работа в новой теме C++, включённой в прежний локальный формат.
 await p.evaluate(()=>location.hash='#course=cpp&lesson=cpp.functions-contracts&stage=practice&locale=ru');await p.locator('[data-r3-topic="cpp.functions-contracts"] #editor').waitFor();
 await p.locator('#editor').fill('// retained independent work\nint main(){}');await p.locator('#stdin').fill('3 4');await p.waitForFunction(()=>document.querySelector('[data-r3-save]')?.dataset.state==='saved');
 const editor=await p.locator('#editor').elementHandle();await p.locator('[data-stage="explanation"]').click();await p.locator('[data-stage="practice"]').click();assert.ok(await p.locator('#editor').evaluate((node,old)=>node===old,editor));assert.match(await p.locator('#editor').inputValue(),/retained independent/);
 await p.locator('[data-action="tools"]').click();await p.locator('[data-r3-assistant]').click();await p.locator('[data-akronikl-panel]').waitFor();await p.locator('[data-akronikl-close]').click();
 for(const id of ['cpp.pointers-references-addresses','cpp.multifile-build','cpp.qt-graphical-adapter','onec.p8.topic-1','1c-enterprise.a1.orientation']){
  await p.evaluate(id=>location.hash='#'+new URLSearchParams({course:id.startsWith('cpp.')?'cpp':id.startsWith('onec.')?'onec':'1c-enterprise',lesson:id,locale:'ru',stage:'practice'}),id);const lesson=p.locator('[data-r3-topic="'+id+'"]');await lesson.waitFor();
  if(id==='cpp.multifile-build'){await lesson.locator('#editor').waitFor();assert.ok((await lesson.locator('#editor').evaluate(e=>e.__nexusCodeStudio.getSnapshot())).files.some(f=>f.path==='main.cpp'));}
  if(id==='cpp.qt-graphical-adapter')assert.equal(await lesson.locator('#runCode,#editor').count(),0);
  for(const width of [390,320]){await p.setViewportSize({width,height:900});for(const stage of ['explanation','selfcheck','practice']){await lesson.locator('[data-stage="'+stage+'"]').click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' '+stage+' '+width);assert.ok(await lesson.locator('.stages').evaluate(nav=>[...nav.querySelectorAll('a')].every(a=>a.scrollWidth<=a.clientWidth+1)),id+' tab text overflow '+width);}await p.evaluate(()=>scrollTo({top:500,behavior:'instant'}));await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.ok(await lesson.locator('.lesson-context').evaluate(e=>e.getBoundingClientRect().top>=document.querySelector('.topbar').getBoundingClientRect().bottom-1),id+' header overlap');await p.screenshot({path:path.join(out,id+'-'+width+'.png')});}
  await p.setViewportSize({width:1280,height:900});
 }
 await p.evaluate(()=>location.hash='#course=cpp&lesson=cpp.functions-contracts&stage=practice&locale=ru');await p.locator('[data-r3-topic="cpp.functions-contracts"] #editor').waitFor();assert.match(await p.locator('#editor').inputValue(),/retained independent/);assert.equal(await p.locator('#stdin').inputValue(),'3 4');
 await p.evaluate(()=>location.hash='#course=onec&lesson=onec.p1.architecture&section=lab&locale=ru');await p.locator('[data-r3-topic="onec.p1.architecture"] [data-r3-panel="practice"]').waitFor({state:'visible'});await p.evaluate(()=>location.hash='#course=onec&lesson=onec.p1.architecture&section=theory-2&locale=ru');await p.locator('[data-r3-topic="onec.p1.architecture"] [data-r3-panel="explanation"]').waitFor({state:'visible'});
 assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);console.log('PASS '+checks.length+' lesson editions; shell, assistant, saved work, Qt separation and narrow screens');
}catch(e){failure={message:e.message,stack:String(e.stack).slice(0,1800)};console.error(e);for(const p of context.pages()){console.log(p.url());console.log((await p.locator('body').innerText()).slice(-1500));console.log(await p.evaluate(()=>({width:innerWidth,tabs:[...document.querySelectorAll(".stages a")].map(a=>({text:a.textContent,scroll:a.scrollWidth,client:a.clientWidth,font:getComputedStyle(a).fontSize,space:getComputedStyle(a).whiteSpace,display:getComputedStyle(a).display,cols:getComputedStyle(a.parentElement).gridTemplateColumns,gap:getComputedStyle(a.parentElement).gap})),overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right}))})));await p.screenshot({path:path.join(out,'FAIL.png')});}}finally{await writeFile(path.join(out,'ALL_COURSES_BROWSER.json'),JSON.stringify({status:failure?'FAIL':'PASS',checks,failure,errors,blockedExternalRequests:blocked,syntheticOnly:true,serverAuthentication:'NOT TESTED',learnerUnderstanding:'NOT MEASURED'},null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));if(failure)process.exitCode=1;}
