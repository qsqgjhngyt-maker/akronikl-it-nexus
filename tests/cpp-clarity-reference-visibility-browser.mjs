// Регрессия двух дефектов владельца: весь эталон и длинные подписи без обрезания.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile,readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {staticMime} from '../pwa/static-mime.js';
const out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE,'reference-visibility'),frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR);await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration,records=[],errors=[];
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://127.0.0.1');
 if(u.pathname==='/__visibility__'){res.setHeader('content-type','text/html');return res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+prefix+'/styles/app.css"><main id="app"></main>');}
 if(u.pathname.startsWith('/api/')){res.writeHead(401,{'content-type':'application/json'});return res.end('{"error":{"code":"SYNTHETIC_NO_SERVER_SESSION"}}');}
 const file=path.resolve(frontend,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(frontend+path.sep))throw Error('PATH');res.setHeader('content-type',staticMime(file));res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE)),browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH}),page=await browser.newPage();let failure;
page.on('pageerror',e=>errors.push(e.message));
async function inspectReference(root){
 return root.locator('[data-lab-reference-content] pre').evaluateAll(async blocks=>{
  await document.fonts.ready;
  return blocks.map(pre=>{
   const box=pre.getBoundingClientRect(),style=getComputedStyle(pre),code=pre.querySelector('code'),range=document.createRange();range.selectNodeContents(code||pre);const lines=[...range.getClientRects()];
   return {characters:pre.textContent.length,width:box.width,height:box.height,scrollWidth:pre.scrollWidth,clientWidth:pre.clientWidth,scrollHeight:pre.scrollHeight,clientHeight:pre.clientHeight,wrap:style.whiteSpace,maxHeight:style.maxHeight,allTextInside:lines.every(r=>r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1)};
  });
 });
}
try{
 await page.goto(origin+'/__visibility__#course=1c-enterprise&lesson=1c-enterprise.a2.topic-1&locale=ru&stage=practice');
 await page.evaluate(async prefix=>{const a=await import(prefix+'/core/account-storage.js');a.initializeAccountStorage({account:{accountId:'synthetic-reference-visibility',status:'active',displayName:'Synthetic'}});await import(prefix+'/core/app.js');},prefix);
 for(const [course,id]of [['1c-enterprise','1c-enterprise.a2.topic-1'],['cpp','cpp.data-types'],['onec','onec.p2.topic-2']])for(const locale of ['ru','en']){
  await page.evaluate(hash=>location.hash=hash,'#'+new URLSearchParams({course,lesson:id,locale,stage:'practice'}));const root=page.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]');await root.waitFor();await root.locator('[data-stage="practice"]').click();await root.locator('[data-r3-panel="practice"]:visible').waitFor();
  const report=await root.locator('#editor').count()?root.locator('#editor'):root.locator('[data-r3-report]');const own=course==='cpp'?'// Моя работа до открытия эталона\nint main() {}':'Моя работа сохраняется независимо от просмотра эталона.';await report.fill(own);
  await root.locator('[data-lab-reference] summary').first().click();await root.locator('[data-reference-source] code').waitFor();
  for(const summary of await root.locator('[data-lab-reference-content] details.program-files>summary').all())await summary.click();
  const original=await root.locator('[data-reference-source] code').textContent();assert.ok(original.length>20);
  if(course==='1c-enterprise'){const panel=root.locator('[data-lab-reference-content]');assert.equal(await panel.getAttribute('data-reference-language'),'text');assert.equal(await panel.locator('[data-reference-source] code').evaluate(n=>getComputedStyle(n).fontFamily),await panel.evaluate(n=>getComputedStyle(n).fontFamily));assert.equal((await panel.locator('[data-action="copy-reference"]').textContent()).trim(),locale==='ru'?'Скопировать текст':'Copy text');}
  for(const width of [1366,320]){
   await page.setViewportSize({width,height:900});const blocks=await inspectReference(root);assert.ok(blocks.length>=1);
   for(const b of blocks){assert.equal(b.wrap,'pre-wrap');assert.equal(b.maxHeight,'none');assert.ok(b.scrollWidth<=b.clientWidth+1,JSON.stringify({id,locale,width,...b}));assert.ok(b.scrollHeight<=b.clientHeight+1);assert.equal(b.allTextInside,true,JSON.stringify({id,locale,width,...b}));}
   assert.equal(await root.locator('[data-reference-source] code').textContent(),original);assert.equal(await report.inputValue(),own);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(course==='1c-enterprise'&&locale==='ru'){await root.locator('[data-lab-reference]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'reference-'+width+'.png')});}
   records.push({id,locale,width,referenceBlocks:blocks.length,noHorizontalScroll:true,noVerticalClipping:true,copySourceUnchanged:true,ownWorkPreserved:true});
  }
  if(locale==='ru'&&course==='cpp'){
   await root.locator('[data-action="lab-window"]').click();const work=root.locator('.gold-work-dialog[open]');await work.waitFor();await work.locator('[data-gold-work-tab="task"]').click();await work.locator('[data-lab-reference] summary').first().click();await work.locator('[data-reference-source] code').waitFor();
   for(const width of [1366,320]){await page.setViewportSize({width,height:900});const blocks=await inspectReference(work);assert.ok(blocks.length);for(const b of blocks){assert.ok(b.scrollWidth<=b.clientWidth+1);assert.ok(b.scrollHeight<=b.clientHeight+1);assert.equal(b.allTextInside,true);}records.push({id,locale,width,workWindow:true,noHorizontalScroll:true,noVerticalClipping:true});}
   await work.locator('[data-gold-work-close]').click();assert.equal(await report.inputValue(),own);
  }
 }
 const flows=[];for(const name of await readdir('courses/clarity/lessons')){if(!name.endsWith('.json'))continue;const a=JSON.parse(await readFile('courses/clarity/lessons/'+name));for(const s of a.sections||[])if(s.flow?.nodes?.some(n=>[n.title,...n.lines].some(t=>String(t).length>24)||n.lines.length>2))flows.push({id:a.id,locale:a.locale,flow:s.flow});}
 await page.evaluate(hash=>location.hash=hash,'#course=1c-enterprise&lesson=1c-enterprise.a2.topic-1&locale=ru&stage=explanation');let root=page.locator('[data-r3-topic="1c-enterprise.a2.topic-1"][lang="ru"]');await root.waitFor();await root.locator('[data-stage="explanation"]').click();
 for(const width of [1366,320]){
  await page.setViewportSize({width,height:900});const result=await root.evaluate(async(node,{flows,prefix})=>{
   const {learningFlowMarkup}=await import(prefix+'/core/clarity-visuals.mjs');const audit=document.createElement('section');audit.dataset.flowAudit='';audit.innerHTML=flows.map(x=>learningFlowMarkup(x.flow)).join('');node.append(audit);await document.fonts.ready;
   const bad=[...audit.querySelectorAll('.flow-step')].filter(step=>{const b=step.getBoundingClientRect();return [...step.querySelectorAll(':scope>strong,:scope>p')].some(label=>{const r=document.createRange();r.selectNodeContents(label);return [...r.getClientRects()].some(t=>t.left<b.left-1||t.right>b.right+1||t.top<b.top-1||t.bottom>b.bottom+1);});}).map(n=>n.textContent);
   const count=audit.querySelectorAll('[data-wrapped-flow]').length;audit.remove();return {count,bad};
  },{flows,prefix});assert.equal(result.count,flows.length);assert.deepEqual(result.bad,[]);await root.locator('[data-r3-panel="explanation"] .lesson-section').first().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'flow-'+width+'.png')});records.push({name:'All long-label diagrams',width,count:flows.length,clippedLabels:0});
 }
 assert.deepEqual(errors,[]);console.log('PASS: 3 курса RU/EN,эталоны и вложенные файлы1366/320;все длинные схемы;своя работа и bytes эталона сохранены');
}catch(e){failure={message:e.message,stack:String(e.stack).slice(0,2000)};process.exitCode=1;console.error(e);await page.screenshot({path:path.join(out,'FAIL.png'),fullPage:true}).catch(()=>{});}
finally{await writeFile(path.join(out,'REFERENCE_VISIBILITY.json'),JSON.stringify({status:failure?'FAIL':'PASS',records,errors,failure,realAccountUsed:false,nativeRuntimeRetested:false,learnerUnderstanding:'NOT MEASURED'},null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}
