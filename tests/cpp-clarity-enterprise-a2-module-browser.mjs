import {REFERENCE_IDS} from '../core/reference-course-routes.mjs';
// Ускоренный модульный smoke владельца: чтение RU/EN и один сценарий сохранения.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {staticMime} from '../pwa/static-mime.js';
import {nativeOfflineFixture} from './helpers/native-offline-fixture.mjs';
const allIds=['1c-enterprise.a2.topic-1','1c-enterprise.a2.topic-2','1c-enterprise.a2.topic-3','1c-enterprise.a2.topic-4'],ids=process.env.NEXUS_ONEC_BASIC_IDS?.split(',')||allIds.filter(id=>!REFERENCE_IDS.includes(id)),locales=process.env.NEXUS_ONEC_BASIC_LOCALE?[process.env.NEXUS_ONEC_BASIC_LOCALE]:['ru','en'],out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE,'enterprise-a2-module'),frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR);
await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration;
const errors=[],failed=[],records=[];let failure,publicFixture;
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://127.0.0.1');
 if(u.pathname.startsWith('/api/')){res.writeHead(401,{'content-type':'application/json'});return res.end('{"error":{"code":"NO_REAL_SESSION"}}');}
 if(u.pathname==='/__enterprise_a2_basic__'){res.setHeader('content-type','text/html');return res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+prefix+'/styles/app.css"><main id="app"></main>');}
 const file=path.resolve(frontend,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(frontend+path.sep))throw Error('PATH');let bytes=await readFile(file);if(u.pathname==='/version.json'){const version=JSON.parse(bytes);version.releaseCandidate={assetGeneration:manifest.assetGeneration};bytes=Buffer.from(JSON.stringify(version));}res.setHeader('content-type',staticMime(file));res.setHeader('cache-control',u.pathname==='/service-worker.js'?'no-store':'public, max-age=0');res.end(bytes);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE)),browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH}),context=await browser.newContext();
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
const stage=async(root,name)=>{await root.locator('[data-stage="'+name+'"]').click();await root.locator('[data-r3-panel="'+name+'"]:visible').waitFor();};
const saved=root=>root.locator('[data-r3-save][data-state="saved"]').waitFor();
async function checkPageWidth(page,label){const width=await page.evaluate(()=>document.documentElement.scrollWidth);if(width>await page.evaluate(()=>innerWidth+1)){const items=await page.evaluate(()=>{const all=[...document.querySelectorAll('*')];for(const el of [...all])if(el.shadowRoot)all.push(...el.shadowRoot.querySelectorAll('*'));const rows=[];for(const el of all){if(!el.getClientRects().length||el.closest('pre,.onec-shot-scroll'))continue;for(const child of el.childNodes){if(child.nodeType!==3||!child.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(child);const rects=[...range.getClientRects()];if(rects.some(r=>r.right>innerWidth+1))rows.push({text:child.textContent.slice(0,400),tag:el.tagName,cls:el.className,rects:rects.map(r=>({x:r.x,right:r.right,y:r.y}))});}}return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,rows};});await writeFile(path.join(out,'OVERFLOW.json'),JSON.stringify({label,...items},null,2));await page.screenshot({path:path.join(out,'OVERFLOW.png'),fullPage:true});throw Error(label+' overflow '+width);}}
try{
 process.env.NEXUS_NATIVE_EVIDENCE=path.join(out,'public-fixture');publicFixture=await nativeOfflineFixture('enterprise-a2-basic');const p=await publicFixture.launch();await p.goto(publicFixture.origin+'/offline.html#view=home');await publicFixture.waitReady();p.setDefaultTimeout(20000);p.on('response',r=>{if(r.status()>=400&&!new URL(r.url()).pathname.startsWith('/api/'))failed.push({path:new URL(r.url()).pathname,status:r.status()});});
 assert.equal((await p.request.get(origin+'/api/v2/account')).status(),401);
 for(const id of process.env.NEXUS_ONEC_BASIC_COLD_ONLY?[]:ids)for(const locale of locales){
  const source=JSON.parse(await readFile('courses/clarity/lessons/'+id+'.'+locale+'.json'));
  await p.goto(publicFixture.origin+'/offline.html#'+new URLSearchParams({course:'1c-enterprise',lesson:id,locale,stage:'explanation'}));const root=p.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]');await root.waitFor();
  assert.equal(await root.getAttribute('data-authored'),'true');assert.equal((await root.locator('#example-1 [data-expected-output]').textContent()).trim(),source.sections.find(s=>s.id==='example-1').code.output);
  const images=await root.locator('[data-onec-figure] img').evaluateAll(async images=>{await Promise.all(images.map(async img=>{img.loading='eager';await img.decode();}));return images.map(i=>({loaded:i.naturalWidth>0,alt:i.alt}));});assert.ok(images.length>=1&&images.length<=2);assert.ok(images.every(i=>i.loaded&&i.alt.length>30));
  for(const width of [1366,320]){
   await p.setViewportSize({width,height:900});
   for(const name of ['explanation','selfcheck','practice']){await stage(root,name);assert.equal(await root.locator('.stage-body:visible').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(11, 25, 41)');await checkPageWidth(p,id+' '+locale+' '+width+' '+name);}
  }
  await root.locator('[data-lab-reference] summary').first().click();await root.locator('[data-reference-source] code').waitFor();for(const s of await root.locator('[data-r3-panel="practice"] details.program-files>summary').all())if(await s.isVisible())await s.click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' '+locale+' expanded starter/reference overflow');
  await p.screenshot({path:path.join(out,id+'-'+locale+'-practice320.png')});await stage(root,'explanation');await root.locator('#trace').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,id+'-'+locale+'-diagram320.png')});records.push({id,locale,widths:[1366,320],stages:3,actualNativeImageLoaded:images.length>0,manualWork:true,expectedObservationVisible:true,matte:true,pageOverflow:false});
 }
 // Один репрезентативный сценарий приватного черновика; только синтетический Account.
 if(!process.env.NEXUS_ONEC_BASIC_COLD_ONLY){
 const id=allIds.at(-1),p2=await context.newPage();await p2.goto(origin+'/__enterprise_a2_basic__#course=1c-enterprise&lesson='+id+'&locale=ru&stage=practice');
 const mount=async()=>p2.evaluate(async prefix=>{const a=await import(prefix+'/core/account-storage.js');a.initializeAccountStorage({account:{accountId:'synthetic-a2-basic',status:'active',displayName:'Synthetic A2'}});const m=await import(prefix+'/courses/onec-education/integration.mjs');globalThis.controller=m.mountOnecIntegration(document.querySelector('#app'),{locale:'ru'});await controller.ready;},prefix);
 await mount();let root=p2.locator('[data-r3-topic="'+id+'"]');await root.waitFor();await stage(root,'practice');assert.equal(await root.locator('#editor').count(),0);assert.equal(await root.locator('[data-r3-create]').count(),0);
 const own='Моя первая заявка20,вторая55. Комментарий изменён только в первой.';await root.locator('[data-r3-report]').fill(own);await root.locator('[data-lab-reference] summary').first().click();await root.locator('[data-reference-source] code').waitFor();assert.equal(await root.locator('[data-r3-report]').inputValue(),own);await saved(root);await stage(root,'explanation');await stage(root,'practice');assert.equal(await root.locator('[data-r3-report]').inputValue(),own);
 await p2.reload();await mount();root=p2.locator('[data-r3-topic="'+id+'"]');await root.waitFor();await stage(root,'practice');assert.equal(await root.locator('[data-r3-report]').inputValue(),own);records.push({name:'Representative draft preservation',id,manualNote:true,noFictionalCodeEditor:true,referenceDoesNotReplaceNote:true,stageSwitch:true,reload:true,syntheticAccountOnly:true,status:'PASS'});

 }
 // Один короткий cold offline: новый процесс, сервер недоступен, тот же модуль и ресурс.
 await publicFixture.closeBrowser();publicFixture.networkDown();const cold=await publicFixture.launch();await cold.goto(publicFixture.origin+'/offline.html#'+new URLSearchParams({course:'1c-enterprise',lesson:'1c-enterprise.a2.topic-4',locale:'en',stage:'explanation'}));const coldRoot=cold.locator('[data-r3-topic="1c-enterprise.a2.topic-4"][lang="en"]');await coldRoot.waitFor();await coldRoot.locator('[data-onec-figure] img').evaluateAll(async images=>{await Promise.all(images.map(async img=>{img.loading='eager';await img.decode();}));if(images.length!==1||images.some(i=>!i.naturalWidth))throw Error('OFFLINE_NATIVE_IMAGE');});assert.equal((await coldRoot.locator('#example-1 [data-expected-output]').textContent()).trim(),JSON.parse(await readFile('courses/clarity/lessons/1c-enterprise.a2.topic-4.en.json')).sections.find(s=>s.id==='example-1').code.output);records.push({name:'Short cold offline',id:'1c-enterprise.a2.topic-4',locale:'en',freshBrowserProcess:true,serverUnavailable:true,mainExample:true,nativeImageLoaded:true,status:'PASS'});
 errors.push(...publicFixture.errors);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('PASS:A2: '+records.filter(r=>r.widths).length+' редакций; cold offline PASS; свой черновик: '+(records.some(r=>r.name==='Representative draft preservation')?'PASS':'не повторялся'));
}catch(e){failure={message:e.message,stack:String(e.stack).slice(0,2000)};console.error(e);for(const [i,p]of context.pages().entries())await p.screenshot({path:path.join(out,'FAIL-'+i+'.png'),fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{await writeFile(path.join(out,'ENTERPRISE_A2_MODULE_BROWSER.json'),JSON.stringify({status:failure?'FAIL':'PASS',mode:'OWNER BASIC MODULE CHECKS',scope:{ids,locales},records,errors,resourceFailures:failed,failure,serverAuthentication:'NOT TESTED',realAccountUsed:false,nativeExecution:'OWN CF LOAD / CLIENT REFERENCES / 30-45 AND INDEPENDENT20-55 / FOUR RECORDS REREAD;3GUI;LEARNER UNDERSTANDING NOT MEASURED',learnerUnderstanding:'NOT MEASURED'},null,2)+'\n');if(publicFixture)await publicFixture.finish({status:failure?'FAIL':'PASS'});await browser.close();await new Promise(r=>server.close(r));}
