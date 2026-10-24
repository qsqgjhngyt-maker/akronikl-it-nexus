// Real entry -> bootstrap -> app -> routed views in Chromium. Account/feed DTOs
// are synthetic; every network request is intercepted and no live API is used.
// Without NEXUS_FRONTEND_DIR, versioned shell URLs serve source files. With it,
// every document and module comes from the exact official build on disk.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {GATEWAY_ORIGIN} from '../server-access/bff/account-read.mjs';

const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
const official=Boolean(process.env.NEXUS_FRONTEND_DIR);
const frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR||sourceRoot);
const metadata=JSON.parse(await readFile(path.join(frontend,official?'BUILD_MANIFEST.json':'version.json'),'utf8'));
const generation=metadata.assetGeneration||metadata.releaseCandidate?.assetGeneration;
assert.ok(generation,'The source/build must declare its asset generation');
const prefix='/releases/'+generation+'/';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const account={account:{accountId:'synthetic-startup',displayName:'Synthetic startup',status:'active'},loginMethods:[{id:'synthetic-passkey',kind:'passkey',status:'active',createdAt:'2026-10-23T00:00:00Z',disabledAt:null}],enrollmentAvailable:false};
const post={slug:'dobro-pozhalovat-v-nexus',title:'Synthetic published article',summary:'Startup navigation fixture',body:'## Synthetic section\n\nA public article for real app navigation.',publishedAt:'2026-10-23T00:00:00Z'};
const checks=[],errors=[],consoleErrors=[],missingAssets=[],externalRequests=[],sessions=[],moduleSha256={};
let browser,page;
const mime=file=>({'.js':'text/javascript','.json':'application/json','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'}[path.extname(file)]||'text/html');
const check=async(name,fn)=>{const started=performance.now();const metrics=await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-started),...metrics});console.log('PASS '+name)};
async function evidenceScreenshot(target,name){
 if(!process.env.NEXUS_NATIVE_EVIDENCE)return;
 await mkdir(process.env.NEXUS_NATIVE_EVIDENCE,{recursive:true});
 await target.screenshot({path:path.join(process.env.NEXUS_NATIVE_EVIDENCE,name),fullPage:true,animations:'disabled'});
}
const cppPaths=session=>session.assets.filter(file=>/^courses\/cpp\/.*\.json$/.test(file));
const assertOutline=session=>assertFull(session);
const assertFull=session=>assert.deepEqual(cppPaths(session).sort(),['courses/cpp/curriculum.json','courses/cpp/data/lessons.en.json','courses/cpp/data/lessons.ru.json','courses/cpp/data/practicums.ru.json','courses/cpp/data/projects.ru.json','courses/cpp/manifest.json']);
async function ready(target,selector){
 await target.waitForFunction(selector=>document.querySelector(selector)||document.querySelector('.nexus-route-message,.boot-error'),selector);
 const error=await target.locator('.route-error-detail,.boot-error').allTextContents();
 assert.deepEqual(error,[],'Actual app render failed: '+error.join('\n'));
 assert.equal(await target.locator(selector).count()>0,true,'Missing rendered view '+selector);
 assert.equal(await target.locator('#boot-status').count(),0,'Bootstrap must finish');
}
async function navigation(target,href,selector){
 const link=target.locator('.side-nav a[href="'+href+'"]');
 if(await link.count())await link.click();else await target.evaluate(hash=>{location.hash=hash},href);
 await ready(target,selector);
}
async function session({width=1366}={}){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 // Playwright's serviceWorkers:'block' probes navigator.serviceWorker inside
 // opaque graphics iframes and itself throws SecurityError. Block registration
 // in the top document only; do not alter the sandboxed scene or app modules.
 await context.addInitScript(()=>{
  if(window===window.top&&navigator.serviceWorker)navigator.serviceWorker.register=async()=>{throw Error('SYNTHETIC_STARTUP_SW_DISABLED')};
 });
 const record={assets:[],api:[],documents:[]};sessions.push(record);
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==GATEWAY_ORIGIN){externalRequests.push(request.url());return route.abort()}
  if(url.pathname.startsWith('/api/')){
   record.api.push({path:url.pathname,method:request.method()});
   let body,status=200;
   if(url.pathname==='/api/v2/account')body=account;
   else if(url.pathname==='/api/v2/account/profile')body={...account.account,username:null,avatar:null,avatarVersion:0};
   else if(url.pathname==='/api/v2/account/oauth/providers')body={providers:[]};
   else if(url.pathname==='/api/v2/account/control/capabilities')body={canManage:false,canModerate:false,canPurge:false,freshPasskey:false};
   else if(url.pathname==='/api/v2/content/feed')body={posts:url.searchParams.has('slug')?[post]:[{...post,body:undefined}],home:{}};
   else if(url.pathname==='/api/v2/feedback/reviews')body={reviews:[],ratings:0,average:0,total:0};
   else{status=403;body={error:{code:'SYNTHETIC_DENIED'}}}
   return route.fulfill({status,headers:{'content-type':'application/json','cache-control':'no-store',vary:'*'},body:JSON.stringify(body)});
  }
  let file=url.pathname==='/'?'nexus-shell.html':url.pathname.slice(1);
  // Only the known current generation is mapped in source mode. Official mode
  // never rewrites HTML/JS or silently falls back to source or retained assets.
  if(!official&&url.pathname.startsWith(prefix))file=url.pathname.slice(prefix.length);
  if(url.pathname.startsWith(prefix))record.assets.push(url.pathname.slice(prefix.length));
  if(request.isNavigationRequest())record.documents.push(url.pathname);
  try{
   const target=path.resolve(frontend,file);assert.ok(target.startsWith(frontend+path.sep));
   const body=await readFile(target);
   if(['core/bootstrap.js','core/app.js','core/learning-views.js','core/academy-catalog.js'].some(name=>url.pathname===prefix+name))moduleSha256[url.pathname.slice(prefix.length)]=createHash('sha256').update(body).digest('hex');
   return route.fulfill({status:200,contentType:mime(file),body});
  }catch{missingAssets.push(file);return route.fulfill({status:404,body:'SYNTHETIC_NOT_FOUND'})}
 });
 const target=await context.newPage();page=target;target.setDefaultTimeout(15000);
 target.on('pageerror',error=>errors.push(error.stack||error.message));
 target.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
 return{context,page:target,record};
}
async function enter(target,hash,selector){
 await target.goto(GATEWAY_ORIGIN+'/index.html'+hash);
 await target.waitForFunction(()=>document.querySelector('[data-login-label]')?.textContent==='Продолжить в Nexus');
 await target.locator('[data-login]').click();
 await ready(target,selector);
 assert.equal(new URL(target.url()).pathname,'/','Entry must trigger a full document navigation to the shell');
}

try{
 browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking','--disable-component-update']});
 const primary=await session();
 await check('Fresh entry Continue -> verified bootstrap -> Home renders with historical complete C++ data',async()=>{
  await enter(primary.page,'#view=home','.visual-home');assertOutline(primary.record);
  assert.equal(await primary.page.locator('.visual-facts strong').nth(2).textContent(),'40');
  assert.equal(await primary.page.locator('.visual-facts strong').nth(3).textContent(),'7');
  assert.deepEqual(primary.record.documents.slice(0,2),['/index.html','/']);
  await evidenceScreenshot(primary.page,'desktop-home.png');
  return{cppJsonRequests:cppPaths(primary.record).length};
 });
 await check('Home -> Academy -> Home via real menu reuses the outline and renders C++ card',async()=>{
  await navigation(primary.page,'#view=academy','[data-visual-academy]');
  assert.equal(await primary.page.locator('.academy-hub-reference').count(),1);assertOutline(primary.record);
  await navigation(primary.page,'#view=home','.visual-home');assertOutline(primary.record);
 });
 await check('Academy -> complete C++ -> lesson loads each course payload once and binds the editor',async()=>{
  await navigation(primary.page,'#view=academy','[data-visual-academy]');
  await primary.page.locator('.academy-hub-reference').click();await ready(primary.page,'[data-cpp-learning-path]');
  assert.equal(await primary.page.locator('.topic').count(),40);assertFull(primary.record);
  await primary.page.locator('.topic a').first().click();await ready(primary.page,'.lesson');
  await primary.page.waitForFunction(()=>Boolean(document.querySelector('#editor')?.__nexusCodeStudio));
  assert.equal(primary.record.assets.filter(file=>file==='sandbox/sandbox.js').length,1);assertFull(primary.record);
  await navigation(primary.page,'#view=home','.visual-home');assertFull(primary.record);
 });
 await check('Code Studio, projects, Academy graphics, labs and practices remain navigable',async()=>{
  await navigation(primary.page,'#view=code-studio','[data-code-studio-home]');assert.equal(await primary.page.locator('[data-cs-action]').count(),4);
  await navigation(primary.page,'#view=projects','#psNewProject');
  await navigation(primary.page,'#view=academy','[data-visual-academy]');
  await primary.page.locator('.graphics-catalog-link').click();await ready(primary.page,'[data-graphics-workshop]');
  await primary.page.waitForFunction(()=>Boolean(document.querySelector('#editor')?.__nexusCodeStudio));
  await navigation(primary.page,'#view=labs','[data-learning-discovery="labs"]');
  await navigation(primary.page,'#view=practices','[data-learning-discovery="practices"]');
 });
 await check('Real Blog route loads published feed, cover and article; Home remains available afterward',async()=>{
  await navigation(primary.page,'#view=blog','.nexus-blog');await primary.page.locator('.blog-card-featured').waitFor();
  await primary.page.waitForFunction(()=>document.querySelector('.blog-card-featured img')?.naturalWidth>0);
  await primary.page.locator('.blog-card-featured .blog-read').click();await ready(primary.page,'.blog-article');
  assert.equal(await primary.page.locator('.blog-article h1').textContent(),post.title);
  await primary.page.waitForFunction(()=>document.querySelector('.blog-cover img')?.naturalWidth>0);
  await navigation(primary.page,'#view=home','.visual-home');assertFull(primary.record);
 });
 await primary.context.close();
 await check('Fresh Academy deep link on mobile works with historical complete course data',async()=>{
  const direct=await session({width:390});await enter(direct.page,'#view=academy','[data-visual-academy]');assertOutline(direct.record);
  assert.equal(await direct.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await evidenceScreenshot(direct.page,'mobile-academy.png');
  await direct.page.locator('#menuBtn').click();await navigation(direct.page,'#view=home','.visual-home');assertOutline(direct.record);
  assert.equal(await direct.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await direct.context.close();
 });
 await check('Fresh Blog, Code Studio and graphics start independently with the historical eager-loading contract',async()=>{
  for(const [view,selector]of [['blog','.blog-card-featured'],['code-studio','[data-code-studio-home]'],['computer-graphics','[data-graphics-workshop]']]){
   const direct=await session();await enter(direct.page,'#view='+view,selector);
   if(view==='computer-graphics')await direct.page.waitForFunction(()=>Boolean(document.querySelector('#editor')?.__nexusCodeStudio));
   assert.deepEqual(cppPaths(direct.record),[],view+' starts without course data');
   await navigation(direct.page,'#view=home','.visual-home');assertOutline(direct.record);
   await direct.context.close();
  }
 });
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(missingAssets,[]);assert.deepEqual(externalRequests,[]);
 assert.equal(sessions.flatMap(session=>session.api).some(request=>request.method!=='GET'),false,'Navigation must not mutate synthetic API state');
}catch(error){
 process.exitCode=1;checks.push({name:error.message,status:'FAIL',stack:error.stack});console.error(error.stack);
 if(process.env.NEXUS_NATIVE_EVIDENCE&&page&&!page.isClosed()){await mkdir(process.env.NEXUS_NATIVE_EVIDENCE,{recursive:true});await page.screenshot({path:path.join(process.env.NEXUS_NATIVE_EVIDENCE,'failure.png'),fullPage:true}).catch(()=>{})}
}finally{
 await browser?.close();
 const result={status:process.exitCode?'FAIL':'PASS',checks,errors,consoleErrors,missingAssets,externalRequests,sessions,moduleSha256,assetGeneration:generation,source:official?'official-build':'source-checkout',physical:false,serviceWorkers:'registration blocked in top document; lifecycle tested separately',syntheticAccounts:true,productionWrites:0};
 if(process.env.NEXUS_NATIVE_EVIDENCE){await mkdir(process.env.NEXUS_NATIVE_EVIDENCE,{recursive:true});await writeFile(path.join(process.env.NEXUS_NATIVE_EVIDENCE,'RESULT.json'),JSON.stringify(result,null,2)+'\n')}
}
