// Настоящий index -> bootstrap -> app. Серверные ответы и JPEG синтетические.
// Official mode читает точные bytes сборки; source mode подставляет исходники
// только для объявленной текущей генерации. Renderer/loader не подменяются.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {GATEWAY_ORIGIN} from '../server-access/bff/account-read.mjs';

const sourceRoot=fileURLToPath(new URL('../',import.meta.url)),official=Boolean(process.env.NEXUS_FRONTEND_DIR);
const frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR||sourceRoot);
const metadata=JSON.parse(await readFile(path.join(frontend,official?'BUILD_MANIFEST.json':'version.json'),'utf8'));
const generation=metadata.assetGeneration||metadata.releaseCandidate?.assetGeneration;
assert.ok(generation,'The source/build must declare its asset generation');
const prefix='/releases/'+generation+'/';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const jpeg=await readFile(new URL('./fixtures/synthetic-media-1280.jpg',import.meta.url));
const photos=Array.from({length:5},(_,i)=>{const bytes=Buffer.concat([jpeg,Buffer.from([i])]);return{
 id:createHash('sha256').update(bytes).digest('hex'),mime:'image/jpeg',data:bytes.toString('base64'),width:1280,height:1280
}});
const image=i=>({mediaId:photos[i].id,alt:'Synthetic photograph '+i,caption:'Synthetic photograph '+i,focusX:50,focusY:50});
const layout={schemaVersion:1,cover:image(0),blocks:[
 {id:'00000000-0000-4000-8000-000000000001',kind:'heading',text:'Five photographs in one article',width:100,align:'left',ratio:'auto',columns:1,surface:'plain',images:[]},
 {id:'00000000-0000-4000-8000-000000000002',kind:'text',text:Array.from({length:42},(_,i)=>'Synthetic paragraph '+(i+1)+'. The gallery is below the initial viewport.').join('\n'),width:100,align:'left',ratio:'auto',columns:1,surface:'plain',images:[]},
 {id:'00000000-0000-4000-8000-000000000003',kind:'gallery',text:'',width:100,align:'left',ratio:'landscape',columns:2,surface:'plain',images:[image(1),image(2),image(3),image(4)]}
]};
const posts=photos.map((_,i)=>({slug:'synthetic-photo-'+i,title:'Synthetic photo story '+i,summary:'Public photo regression fixture.',cover:image(i),body:i===0?'NEXUS_LAYOUT_V1\n'+JSON.stringify(layout):'## Synthetic article\n\nPublic text.',publishedAt:'2026-10-23T00:00:00Z'}));
const account={account:{accountId:'synthetic-public-photos',displayName:'Synthetic reader',status:'active'},loginMethods:[{id:'synthetic-passkey',kind:'passkey',status:'active',createdAt:'2026-10-23T00:00:00Z',disabledAt:null}],enrollmentAvailable:false};
const checks=[],errors=[],consoleErrors=[],expectedDeniedMediaConsole=[],missingAssets=[],externalRequests=[],api=[],media=[],documents=[],moduleSha256={};
const state={phase:'entry',hold:null,denied:false},pendingHolds=new Set(),records=new WeakMap();
const mime=file=>({'.js':'text/javascript','.json':'application/json','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'}[path.extname(file)]||'text/html');
let browser,context,page;
const check=async(name,fn)=>{const started=performance.now(),metrics=await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-started),...metrics});console.log('PASS '+name+(metrics?' '+JSON.stringify(metrics):''))};
const waitUntil=async(predicate,message)=>{const deadline=Date.now()+2000;while(!predicate()&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));assert.ok(predicate(),message)};
const requests=phase=>media.filter(r=>r.phase===phase);
function holdMedia(){
 let release;const gate={promise:new Promise(resolve=>{release=resolve})};
 gate.release=()=>{pendingHolds.delete(gate);if(state.hold===gate)state.hold=null;release()};
 pendingHolds.add(gate);state.hold=gate;return gate;
}
async function ready(selector){
 await page.waitForFunction(selector=>document.querySelector(selector)||document.querySelector('.nexus-route-message,.boot-error'),selector);
 assert.deepEqual(await page.locator('.route-error-detail,.boot-error').allTextContents(),[]);
 assert.ok(await page.locator(selector).count());assert.equal(await page.locator('#boot-status').count(),0);
}
async function navigate(action,selector){
 const previous=await page.locator('#appShell').elementHandle();await action();
 if(previous){await page.waitForFunction(node=>!node.isConnected,previous);await previous.dispose()}
 await ready(selector);
}
const allJpeg=selector=>page.waitForFunction(selector=>{
 const images=[...document.querySelectorAll(selector)];
 return images.length>0&&images.every(img=>img.src.startsWith('data:image/jpeg;base64,')&&img.naturalWidth===1280&&img.naturalHeight===1280&&!img.hasAttribute('aria-busy'));
},selector);
const imageState=()=>page.locator('[data-blog-media]').evaluateAll(images=>images.map(img=>({
 id:img.dataset.blogMedia,jpeg:img.src.startsWith('data:image/jpeg;base64,'),width:img.naturalWidth,height:img.naturalHeight,top:img.getBoundingClientRect().top
})));

try{
 browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking','--disable-component-update']});
 context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});
 await context.addInitScript(()=>{if(window===window.top&&navigator.serviceWorker)navigator.serviceWorker.register=async()=>{throw Error('SYNTHETIC_PUBLIC_MEDIA_SW_DISABLED')}});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==GATEWAY_ORIGIN){externalRequests.push(request.url());return route.abort()}
  if(url.pathname.startsWith('/api/')){
   api.push({path:url.pathname+url.search,method:request.method(),phase:state.phase});let body,status=200,record;
   if(url.pathname==='/api/v2/account')body=account;
   else if(url.pathname==='/api/v2/account/profile')body={...account.account,username:null,avatar:null,avatarVersion:0};
   else if(url.pathname==='/api/v2/account/oauth/providers')body={providers:[]};
   else if(url.pathname==='/api/v2/account/control/capabilities')body={canManage:false,canModerate:false,canPurge:false,freshPasskey:false};
   else if(url.pathname==='/api/v2/feedback/reviews')body={reviews:[],ratings:0,average:0,total:0};
   else if(url.pathname==='/api/v2/content/feed'){
    if(url.searchParams.has('media')){
     const id=url.searchParams.get('media'),photo=photos.find(p=>p.id===id);assert.ok(photo);
     const hold=state.hold,denied=state.denied;record={id,phase:state.phase,started:Date.now(),held:Boolean(hold),status:denied?404:200};
     media.push(record);records.set(request,record);if(hold)await hold.promise;
     if(denied){status=404;body={error:{code:'NOT_FOUND'}}}else body={media:photo};
     record.responseReady=Date.now();
    }else body={posts:url.searchParams.has('slug')?posts.filter(p=>p.slug===url.searchParams.get('slug')):posts.map(({body,...p})=>p),home:{}};
   }else{status=403;body={error:{code:'SYNTHETIC_DENIED'}}}
   return route.fulfill({status,headers:{'content-type':'application/json','cache-control':'no-store',vary:'*'},body:JSON.stringify(body)}).catch(error=>{
    if(record)record.fulfillError=String(error.message).slice(0,160);else throw error;
   });
  }
  let file=url.pathname==='/'?'nexus-shell.html':url.pathname.slice(1);
  if(!official&&url.pathname.startsWith(prefix))file=url.pathname.slice(prefix.length);
  if(request.isNavigationRequest())documents.push({path:url.pathname,phase:state.phase});
  try{
   const target=path.resolve(frontend,file);assert.ok(target.startsWith(frontend+path.sep));const bytes=await readFile(target);
   if(url.pathname.startsWith(prefix)&&/^core\/(app|bootstrap|blog-layout|blog-presentation|content-public)\.js$/.test(url.pathname.slice(prefix.length)))moduleSha256[url.pathname.slice(prefix.length)]=createHash('sha256').update(bytes).digest('hex');
   return route.fulfill({status:200,contentType:mime(file),body:bytes});
  }catch{missingAssets.push(file);return route.fulfill({status:404,body:'SYNTHETIC_NOT_FOUND'})}
 });
 page=await context.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',error=>errors.push(error.stack||error.message));
 page.on('console',message=>{
  if(message.type()!=='error')return;
  const item={text:message.text(),url:message.location().url,phase:state.phase};
  const denied=media.some(r=>r.phase==='revoked'&&r.status===404&&item.url===GATEWAY_ORIGIN+'/api/v2/content/feed?media='+r.id);
  if(denied&&/Failed to load resource:.*404/.test(item.text))expectedDeniedMediaConsole.push(item);else consoleErrors.push(item);
 });
 page.on('requestfailed',request=>{const record=records.get(request);if(record){record.cancelledAt=Date.now();record.failure=request.failure()?.errorText}});

 await check('Real entry -> Blog -> Article starts all five GET before any response and loads every JPEG without scrolling',async()=>{
  await page.goto(GATEWAY_ORIGIN+'/index.html#view=home');
  await page.waitForFunction(()=>document.querySelector('[data-login-label]')?.textContent==='Продолжить в Nexus');
  await page.locator('[data-login]').click();await ready('.visual-home');await page.locator('[data-blog-preview]').waitFor();
  assert.deepEqual(documents.slice(0,2).map(d=>d.path),['/index.html','/']);
  state.phase='blog';await navigate(()=>page.locator('.side-nav a[href="#view=blog"]').click(),'.blog-card-featured');
  await allJpeg('.blog-card-featured img');
  state.phase='article';const held=holdMedia();
  await navigate(()=>page.locator('.blog-card-featured .blog-read').click(),'.blog-article');
  const before=await imageState(),scrollY=await page.evaluate(()=>scrollY);
  assert.equal(before.length,5);assert.ok(before.slice(1).every(img=>img.top>900+240),'The actual article gallery must be outside the initial viewport and old observer margin');
  await waitUntil(()=>requests('article').length===5,'All five media GET must start before any response or scrolling');
  assert.ok(requests('article').every(r=>r.held&&!r.responseReady));held.release();
  await allJpeg('.blog-article [data-blog-media]');assert.equal(await page.evaluate(()=>scrollY),scrollY);
  const after=await imageState();assert.ok(after.every(img=>img.jpeg&&img.width===1280&&img.height===1280));
  assert.equal(requests('article').length,5);assert.equal(await page.locator('[data-blog-media-retry]').count(),0);
  return{getsBeforeFirstResponse:5,jpegReadyWithoutScroll:after.length,galleryTopBeforeScroll:before[1].top,scrollY};
 });

 await check('Back and refresh revalidate all public photos instead of reusing another route cache',async()=>{
  state.phase='back';await navigate(()=>page.goBack(),'.blog-card-featured');await allJpeg('[data-blog-media]');
  assert.equal(requests('back').length,5);assert.equal(new Set(requests('back').map(r=>r.id)).size,5);
  state.phase='refresh';await page.reload();await ready('.blog-card-featured');await allJpeg('[data-blog-media]');
  assert.equal(requests('refresh').length,5);assert.equal(new Set(requests('refresh').map(r=>r.id)).size,5);
  return{backGets:5,refreshGets:5};
 });

 await check('Revoked public media cannot reuse old verified bytes; explicit retry rechecks the server',async()=>{
  state.denied=true;state.phase='revoked';
  await navigate(()=>page.locator('.blog-card-featured .blog-read').click(),'.blog-article');
  await page.waitForFunction(()=>document.querySelectorAll('[data-blog-media-retry]').length===5);
  assert.equal(requests('revoked').length,5);assert.ok(requests('revoked').every(r=>r.status===404));
  assert.ok((await imageState()).every(img=>!img.jpeg),'Previously verified public bytes must not survive into the new denied view');
  state.denied=false;await page.locator('[data-blog-media-retry]').first().click();await allJpeg('.blog-cover img');
  assert.equal(requests('revoked').length,6);assert.equal(requests('revoked').at(-1).status,200);
  assert.equal((await imageState()).filter(img=>img.jpeg).length,1);assert.equal(await page.locator('[data-blog-media-retry]').count(),4);
  return{deniedFreshGets:5,explicitRetryGets:1,oldBytesExposed:0};
 });

 await check('Leaving the real route aborts all pending public media and rejects late DOM writes',async()=>{
  state.phase='pending';const held=holdMedia();
  await navigate(()=>page.locator('.back-link').click(),'.blog-card-featured');
  await waitUntil(()=>requests('pending').length===5,'All pending public photos must have started');
  const oldImages=await page.locator('[data-blog-media]').elementHandles();assert.equal(oldImages.length,5);
  state.hold=null;state.phase='leave-pending';
  await navigate(()=>page.locator('.side-nav a[href="#view=home"]').click(),'.visual-home');
  await waitUntil(()=>requests('pending').every(r=>r.cancelledAt),'Leaving the route must abort every pending transport');
  held.release();await allJpeg('[data-blog-preview] [data-blog-media]');
  for(const oldImage of oldImages){
   assert.deepEqual(await oldImage.evaluate(img=>({connected:img.isConnected,jpeg:img.src.startsWith('data:image/jpeg;base64,'),retry:img.classList.contains('blog-media-unavailable')})),{connected:false,jpeg:false,retry:false});
   await oldImage.dispose();
  }
  assert.equal(requests('pending').length,5);assert.equal(await page.locator('[data-blog-media-retry]').count(),0);
  return{abortedGets:requests('pending').filter(r=>r.cancelledAt).length,lateDomWrites:0};
 });
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(missingAssets,[]);assert.deepEqual(externalRequests,[]);
 assert.ok(api.every(r=>r.method==='GET'));assert.equal(Object.keys(moduleSha256).length,5);
}catch(error){
 process.exitCode=1;checks.push({name:error.message,status:'FAIL',stack:error.stack});console.error(error.stack);
 if(process.env.NEXUS_NATIVE_EVIDENCE&&page&&!page.isClosed()){await mkdir(process.env.NEXUS_NATIVE_EVIDENCE,{recursive:true});await page.screenshot({path:path.join(process.env.NEXUS_NATIVE_EVIDENCE,'failure.png'),fullPage:true}).catch(()=>{})}
}finally{
 for(const held of pendingHolds)held.release();await browser?.close();
 const result={status:process.exitCode?'FAIL':'PASS',checks,errors,consoleErrors,expectedDeniedMediaConsole,missingAssets,externalRequests,api,media,documents,moduleSha256,assetGeneration:generation,source:official?'official-build':'source-checkout',physical:false,syntheticMedia:true,serviceWorkers:'registration blocked to isolate frontend scheduling',productionWrites:0};
 if(process.env.NEXUS_NATIVE_EVIDENCE){await mkdir(process.env.NEXUS_NATIVE_EVIDENCE,{recursive:true});await writeFile(path.join(process.env.NEXUS_NATIVE_EVIDENCE,'RESULT.json'),JSON.stringify(result,null,2)+'\n')}
}
