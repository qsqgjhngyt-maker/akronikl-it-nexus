import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {clarityLessons} from './helpers/cpp-clarity-programs.mjs';
import {goldLessonRoute} from './helpers/gold-lesson-route.mjs';
import {verifyResponse} from '../pwa/policy.js';
import {staticMime} from '../pwa/static-mime.js';
import {REFERENCE_IDS} from '../core/reference-course-routes.mjs';
import {assertReferenceEdition} from './helpers/reference-course-contract.mjs';

const out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE||'cpp-clarity-evidence');await mkdir(out,{recursive:true});
const receipt=path.join(out,'PREVIEW_SERVER.json'),child=spawn(process.execPath,['tools/preview-cpp-clarity.mjs','--frontend',process.env.NEXUS_FRONTEND_DIR,'--port',process.env.NEXUS_PREVIEW_PORT||'63368','--receipt',receipt],{stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
let context,failure,result,page,diagnostic;
try{
 let server;for(let i=0;i<200;i++){try{server=JSON.parse(await readFile(receipt,'utf8'));break}catch{}if(child.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,100))}assert.ok(server,'Preview server readiness');
 const metadata=await(await fetch(server.origin+'/__cpp_clarity_preview')).json();assert.equal(metadata.sourceCommit,server.sourceCommit);assert.equal(metadata.userDataUsed,false);
 const denied=await fetch(server.origin+'/api/account/me');assert.equal(denied.status,401);assert.equal(denied.headers.get('cache-control'),'no-store');
 const build=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'),'utf8')),optional=new Set((build.optionalAssets||[]).map(r=>r.url));
 const publicRecords=build.files.filter(r=>!optional.has(r.file)&&!['index.html','nexus-shell.html','version.json','startup-intro.json','service-worker.js'].includes(r.file)).map(r=>({...r,url:r.file,mime:staticMime(r.file)}));
 const assetFailures=[];let cursor=0;
 await Promise.all(Array.from({length:8},async()=>{while(cursor<publicRecords.length){const record=publicRecords[cursor++];try{await verifyResponse(record,await fetch(new URL(record.url,server.origin+'/')))}catch(e){assetFailures.push({url:record.url,error:e.code||e.message})}}}));assert.deepEqual(assetFailures,[],'Every producer-hashed public resource must pass the existing policy');assert.equal(publicRecords.length,build.publicAssets);
 const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE)),profile=await mkdtemp(path.join(tmpdir(),'cpp-manual-preview-'));
 const headless=process.env.NEXUS_PREVIEW_HEADLESS==='1';
 context=await chromium.launchPersistentContext(profile,{headless,executablePath:process.env.NEXUS_CHROME_PATH,viewport:{width:1366,height:950},args:['--no-first-run','--disable-sync','--disable-background-networking']});
 const errors=[],criticalFailures=[],externalRequests=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 context.on('response',r=>{const u=new URL(r.url());if(u.origin===server.origin&&r.status()>=400&&/\.(?:m?js|css|json|wasm)$/.test(u.pathname))criticalFailures.push({path:u.pathname,status:r.status()})});
 context.on('request',r=>{const u=new URL(r.url());if(u.protocol.startsWith('http')&&u.origin!==server.origin)externalRequests.push({origin:u.origin,path:u.pathname})});
 page=await context.newPage();page.setDefaultTimeout(30000);await page.goto(server.origin+'/offline.html#view=home');
 console.log('Ordinary browser loaded '+page.url());
 let ready;const deadline=Date.now()+Number(process.env.NEXUS_PREVIEW_WAIT_MS||120000);
 while(Date.now()<deadline){ready=await page.evaluate(()=>new Promise(resolve=>{const worker=navigator.serviceWorker.controller;if(!worker)return resolve(null);const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(null)},10000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data)};worker.postMessage({type:'nexus-pwa-status'},[channel.port2])}));if(ready?.publicReady&&ready.generation===server.generation)break;await new Promise(r=>setTimeout(r,150))}
 if(!ready?.publicReady){diagnostic=await page.evaluate(async()=>({url:location.href,text:document.body.innerText.slice(0,3000),serviceWorkerSupported:!!navigator.serviceWorker,controller:navigator.serviceWorker.controller?.scriptURL,registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,active:r.active?.state,installing:r.installing?.state,waiting:r.waiting?.state}))}));diagnostic.lastStatus=ready;diagnostic.errors=errors;diagnostic.criticalFailures=criticalFailures;await page.screenshot({path:path.join(out,'preview-failure.png')});}
 assert.ok(ready?.publicReady,'Verified public resources must actually be ready');
 if(!await page.locator('.visual-home').isVisible())await page.reload();await page.locator('.visual-home').waitFor();
 const lessons=(await clarityLessons()).sort((a,b)=>b.locale.localeCompare(a.locale)),observations=[],screens=[];
 for(const g of lessons){
  if(g.lessonId==='cpp.programming-process'){await page.evaluate(({id,locale})=>{location.hash='#course=cpp&lesson='+id+'&locale='+locale+'&stage=practice'}, {id:g.lessonId,locale:g.locale});await page.locator('[data-r3-topic][lang="'+g.locale+'"]').waitFor();await page.locator('#editor').waitFor();assert.equal(await page.locator('#editor:enabled,#runCode:enabled').count(),0);const expected=await page.locator('[data-expected-output]').allTextContents();assert.ok(expected.includes('Welcome to the workshop!\n'));assert.match(await page.locator('.practice-card').first().textContent(),/workshop/i);observations.push({lessonId:g.lessonId,locale:g.locale,status:'PASS',pilot:true,url:page.url()});continue;}
  await page.evaluate(({id,locale})=>location.hash='#'+new URLSearchParams({course:'cpp',lesson:id,locale,stage:'practice'}),{id:g.lessonId,locale:g.locale});
  await page.locator('[data-r3-topic="'+g.lessonId+'"][lang="'+g.locale+'"]').waitFor();
  const expected=REFERENCE_IDS.includes(g.lessonId)?assertReferenceEdition(g.lessonId,g.locale).practice.cases[0].output:g.teachingEdition?.practice.cases[0].output||g.clarity.laboratory.cases[0].stdout;
  const block=page.locator('[data-r3-panel="practice"] [data-expected-output]').first();await block.scrollIntoViewIfNeeded();assert.equal(await block.textContent(),expected);
  assert.equal(await page.locator('#editor:enabled,#runCode:enabled,[data-answer]:enabled').count(),0,'Public preview keeps account/vault access boundaries');
  observations.push({lessonId:g.lessonId,locale:g.locale,stdout:await block.textContent(),url:page.url(),status:'PASS'});
  if(g.locale==='ru'&&['cpp.programming-process','cpp.first-cpp-program','cpp.pointers-references-addresses'].includes(g.lessonId)){
   const file=g.lessonId.slice(4)+'-preview-browser.png';await page.screenshot({path:path.join(out,file)});screens.push(file);
  }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(criticalFailures,[]);
 const productionRequests=externalRequests.filter(r=>/akronikl|nexus|github\.io|workers\.dev|cloudflare|yandexcloud|apigw/.test(r.origin));assert.deepEqual(productionRequests,[]);
 await page.goto(server.url);await page.locator('[data-r3-topic="cpp.programming-process"]').waitFor();
 result={...server,browser:headless?'Headless browser preview check':'Ordinary headed Chrome with isolated empty profile',browserVersion:context.browser()?.version(),headed:!headless,verifiedPublicReady:ready.publicReady,verifiedGeneration:ready.generation,verifiedPublicResourceCount:publicRecords.length,assetFailures,backendDenial:401,observations,screens,errors,criticalFailures,externalRequests,productionRequests:0,userDataUsed:false,authorizationBypass:false,editing:'Unavailable until an ordinary local copy is opened',learnerFeedback:'NOT RUN'};
 console.log('PASS: browser preview; all 40 lesson criteria visible; verified public cache; backend remains unavailable');
}catch(error){failure={message:error.message,stack:String(error.stack).slice(0,2500)};console.error(error)}finally{
 await context?.close();if(process.env.NEXUS_KEEP_PREVIEW_SERVER!=='1')child.kill();else child.unref();
 await writeFile(path.join(out,'MANUAL_PREVIEW_CHECK.json'),JSON.stringify({status:failure?'FAIL':'PASS',failure,result,diagnostic,logs},null,2)+'\n');if(failure)process.exitCode=1;
}
