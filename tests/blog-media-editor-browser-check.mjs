// Actual editor in Chromium; all media and HTTPS routes are synthetic, no live API.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const sourceRoot=fileURLToPath(new URL('../',import.meta.url)),frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR||sourceRoot);
const manifest=process.env.NEXUS_FRONTEND_DIR?JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'),'utf8')):null;
const prefix=manifest?(manifest.prefix||'releases/'+manifest.assetGeneration+'/').replace(/^\/+|\/+$/g,'')+'/':'';
const files=['core/blog-layout.js','core/blog-layout-editor.js'],modules=new Map(),moduleSha256={};
for(const name of files){const bytes=await readFile(path.join(frontend,prefix,name));modules.set('/'+name,bytes);moduleSha256[name]=createHash('sha256').update(bytes).digest('hex')}
const jpeg=await readFile(new URL('./fixtures/synthetic-media-1280.jpg',import.meta.url));
const photos=Array.from({length:6},(_,i)=>{const bytes=Buffer.concat([jpeg,Buffer.from([i])]),id=createHash('sha256').update(bytes).digest('hex');return{id,mime:'image/jpeg',data:bytes.toString('base64'),width:1280,height:720}});
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const origin='https://synthetic-editor.invalid',checks=[],errors=[];let browser,page;
const check=async(name,fn)=>{const metrics=await fn();checks.push({name,status:'PASS',...metrics});console.log('PASS '+name+(metrics?' '+JSON.stringify(metrics):''))};
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
  if(url.pathname==='/fixture.html')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><main id="fixture"></main>'});
  const body=modules.get(url.pathname);return body?route.fulfill({status:200,contentType:'text/javascript',body}):route.fulfill({status:404,body:'NOT_FOUND'});
 });
 await page.goto(origin+'/fixture.html');
 await page.evaluate(async photos=>{
  const {bindBlogLayoutEditor}=await import('/core/blog-layout-editor.js'),{encodeBlogLayout}=await import('/core/blog-layout.js');
  let editor;
  window.startMediaCase=({cover=0,blocks=[],hold=false}={})=>{
   editor?.dispose();const host=document.querySelector('#fixture');host.replaceChildren();
   const state=window.mediaCase={reads:0,active:0,peak:0,signals:[],waiters:[],hold,current:true};
   const image=i=>({mediaId:photos[i].id,alt:'Synthetic photo',caption:'',focusX:50,focusY:50});
   const layout={schemaVersion:1,cover:cover===null?null:image(cover),blocks:blocks.map(i=>({id:crypto.randomUUID(),kind:'image',text:'',width:100,align:'left',ratio:'auto',columns:1,surface:'plain',images:[image(i)]}))};
   editor=bindBlogLayoutEditor({host,body:encodeBlogLayout(layout),isCurrent:()=>state.current,getMediaAvailability:async()=>({enabled:true}),uploadPhoto:async()=>{throw Error('Unexpected upload')},
    privateRead:async(path,{signal}={})=>{
     state.reads++;state.active++;state.peak=Math.max(state.peak,state.active);if(signal)state.signals.push(signal);
     try{
      if(state.hold)await new Promise((resolve,reject)=>{
       const abort=()=>{signal?.removeEventListener('abort',abort);reject(new DOMException('aborted','AbortError'))};
       state.waiters.push(()=>{signal?.removeEventListener('abort',abort);resolve()});
       if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
      });
      return{media:photos.find(p=>p.id===path.split('=')[1])};
     }finally{state.active--}
    }
   });
   window.releaseMediaCase=()=>{state.hold=false;for(const resolve of state.waiters.splice(0))resolve()};
   window.disposeMediaCase=()=>editor.dispose();
  };
 },photos);
 const loaded=()=>page.waitForFunction(()=>[...document.querySelectorAll('[data-blog-media]')].every(img=>img.src.startsWith('data:image/jpeg;base64,')&&!img.hasAttribute('aria-busy')));
 await check('Actual editor cover rerenders reuse verified bytes without extra GET',async()=>{
  await page.evaluate(()=>startMediaCase());await loaded();const initial=await page.evaluate(()=>mediaCase.reads);
  for(let i=0;i<2;i++){await page.locator('[data-add=text]').click();await loaded()}
  const total=await page.evaluate(()=>mediaCase.reads);assert.equal(initial,1);assert.equal(total-initial,0);
  return{initialGets:initial,twoRerenderGets:total-initial};
 });
 await check('Actual cover/list/canvas of one photo coalesce to one in-flight GET',async()=>{
  await page.evaluate(()=>startMediaCase({cover:0,blocks:[0],hold:true}));
  assert.equal(await page.evaluate(()=>mediaCase.reads),1);await page.evaluate(()=>releaseMediaCase());await loaded();
  assert.equal(await page.locator('[data-blog-media]').count(),3);return{gets:await page.evaluate(()=>mediaCase.reads),imageNodes:3};
 });
 await check('Actual editor aggregate queue never exceeds three media requests',async()=>{
  await page.evaluate(()=>startMediaCase({cover:0,blocks:[1,2,3,4,5],hold:true}));
  assert.equal(await page.evaluate(()=>mediaCase.reads),3);await page.evaluate(()=>releaseMediaCase());await loaded();
  const result=await page.evaluate(()=>({gets:mediaCase.reads,peakConcurrent:mediaCase.peak}));assert.equal(result.gets,6);assert.equal(result.peakConcurrent,3);return result;
 });
 await check('Editor dispose aborts all media reads without retry or late private DOM writes',async()=>{
  await page.evaluate(()=>startMediaCase({cover:0,blocks:[0],hold:true}));
  await page.evaluate(()=>disposeMediaCase());
  await page.waitForFunction(()=>mediaCase.active===0);
  assert.equal(await page.evaluate(()=>mediaCase.signals.length>0&&mediaCase.signals.every(s=>s.aborted)),true);
  assert.equal(await page.locator('[data-blog-media-retry]').count(),0);
  assert.equal(await page.evaluate(()=>[...document.querySelectorAll('[data-blog-media]')].some(img=>img.src.startsWith('data:image/jpeg;base64,'))),false);
 });
 await check('A fresh editor rechecks the same media instead of inheriting private cache',async()=>{
  await page.evaluate(()=>startMediaCase());await loaded();assert.equal(await page.evaluate(()=>mediaCase.reads),1);
  await page.evaluate(()=>startMediaCase());await loaded();assert.equal(await page.evaluate(()=>mediaCase.reads),1);
 });
 assert.deepEqual(errors,[]);
}catch(error){process.exitCode=1;checks.push({name:error.message,status:'FAIL',stack:error.stack});console.error(error.stack)}
finally{
 await browser?.close();
 const result={status:process.exitCode?'FAIL':'PASS',checks,errors,moduleSha256,assetGeneration:manifest?.assetGeneration||null,source:manifest?'official-build':'source-checkout',physical:false,syntheticMedia:true,productionWrites:0};
 if(process.env.NEXUS_NATIVE_EVIDENCE){await mkdir(process.env.NEXUS_NATIVE_EVIDENCE,{recursive:true});await writeFile(path.join(process.env.NEXUS_NATIVE_EVIDENCE,'RESULT.json'),JSON.stringify(result,null,2)+'\n')}
}
