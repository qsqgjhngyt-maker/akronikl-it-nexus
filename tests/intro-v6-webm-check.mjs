import assert from 'node:assert/strict';import {readFile,mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(process.env.NEXUS_NATIVE_EVIDENCE),origin='http://127.0.0.1:19360';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH});const results=[];let failure;
try{for(const variant of ['desktop','mobile']){
 const context=await browser.newContext({viewport:variant==='mobile'?{width:390,height:844}:{width:1440,height:900},reducedMotion:'no-preference'}),errors=[];
 await context.addInitScript(()=>{const original=HTMLMediaElement.prototype.canPlayType;HTMLMediaElement.prototype.canPlayType=function(type){return type.includes('mp4')?'':original.call(this,type)};addEventListener('nexus:intro-finished',e=>window.__done=e.detail);addEventListener('nexus:intro-video-ended',e=>{const v=document.querySelector('video');window.__end={...e.detail,source:v.currentSrc,width:v.videoWidth,height:v.videoHeight}})});
 await context.route('**/*',async route=>{try{
  const url=new URL(route.request().url());assert.equal(url.origin,origin);assert.equal(route.request().method(),'GET');
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><footer class="entry-footer"></footer><script type="module">import {installStartupIntro} from '/core/startup-intro.js';installStartupIntro({surface:'entry',videoBase:location.origin+'/intro-media/cinematic-v6/'});</script></body></html>`});
  if(url.pathname==='/favicon.ico')return route.fulfill({status:204,body:''});
  const file=path.resolve(root,'.'+url.pathname);assert.ok(file.startsWith(root+path.sep));
  const mime={'.js':'text/javascript','.css':'text/css','.webm':'video/webm','.jpg':'image/jpeg'}[path.extname(file)]||'application/octet-stream';
  await route.fulfill({status:200,contentType:mime,body:await readFile(file)});
 }catch(e){errors.push(e.message);await route.abort()}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/');await page.waitForFunction(()=>window.__done,{timeout:20000});
 const record=await page.evaluate(()=>({done:window.__done,end:window.__end}));assert.equal(record.done.reason,'ended');assert.match(record.end.source,new RegExp('/'+variant+'\\.webm$'));assert.ok(Math.abs(record.done.playedSeconds-(variant==='mobile'?8:10))<.05);assert.deepEqual(errors,[]);results.push({variant,status:'PASS',...record,errors});await context.close();
}}catch(e){failure={message:e.message,stack:e.stack};console.error(e)}finally{await browser.close();await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:failure?'FAIL':'PASS',results,failure,physical:false,production:false},null,2)+'\n');if(failure)process.exitCode=1}
