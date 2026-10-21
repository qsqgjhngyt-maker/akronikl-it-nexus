// Нативный холодный запуск по реальной ссылке локальной копии. Только синтетический профиль.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {readFile,writeFile,mkdtemp,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR),resultPath=path.resolve(process.env.NEXUS_BROWSER_RESULT);
const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),generation=manifest.assetGeneration;
const profile=await mkdtemp(path.join(tmpdir(),'nx-nav-')),checks=[],failures=[];
let context,offline=false;
const mime=f=>f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':f.endsWith('.webmanifest')?'application/manifest+json':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.png')?'image/png':f.endsWith('.webp')?'image/webp':f.endsWith('.md')?'text/markdown':'text/html';
const server=http.createServer(async(req,res)=>{
 if(offline){req.socket.destroy();return}
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/fixture.html'){res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});return res.end('<!doctype html><meta charset="utf-8"><title>Synthetic navigation test</title>')}
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/account/')){res.writeHead(401,{'content-type':'application/json','cache-control':'no-store',vary:'*'});return res.end('{"error":{"code":"SYNTHETIC_NO_SESSION"}}')}
  const file=decodeURIComponent(url.pathname).slice(1),target=path.resolve(frontend,file);
  if(!target.startsWith(frontend+path.sep))throw Error('PATH');
  const bytes=await readFile(target);res.writeHead(200,{'content-type':mime(file),'cache-control':file==='service-worker.js'?'no-store':'public, max-age=0',...(file==='service-worker.js'?{'service-worker-allowed':'/'}:{})});res.end(bytes);
 }catch{res.writeHead(404,{'cache-control':'no-store'});res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const launch=()=>chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.NEXUS_CHROME_PATH,serviceWorkers:'allow',...(offline?{proxy:{server:'http://127.0.0.1:9'}}:{}),args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
async function check(name,fn){const started=performance.now();try{await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-started)});console.log('PASS '+name)}catch(error){failures.push({name,message:error.message});console.error('FAIL '+name+': '+error.message)}}
async function openAcademy(page,url){
 await page.goto(origin+url);await page.locator('.visual-academy').waitFor();
 if(await page.locator('[data-visual-academy]').count()){
  const cpp=page.locator('a[href="#course=cpp"]');assert.ok(await cpp.count()>0);await cpp.first().click();
 }
 await page.getByRole('heading',{name:'Академия',exact:true}).waitFor();
 assert.equal(await page.locator('a[href^="#lesson="]').count(),40);
}
try{
 context=await launch();let page=await context.newPage();page.setDefaultTimeout(15000);await page.goto(origin+'/fixture.html');
 await check('online preparation commits the exact public generation',async()=>{
  const state=await page.evaluate(async generation=>{const {ensureVerifiedRuntime}=await import('/releases/'+generation+'/pwa/client.js');return ensureVerifiedRuntime()},generation);assert.equal(state.publicReady,true);assert.equal(state.generation,generation);
  await page.evaluate(async()=>{const cache=await caches.open('synthetic-navigation-private-canary');for(const url of ['/api/v2/account','/account/entry/','/offline.html?account=other'])await cache.put(url,new Response('SYNTHETIC_PRIVATE_MUST_NOT_REPLAY'));localStorage.setItem('synthetic-navigation-preserved','PROJECT_PROGRESS_PRESERVED')});
 });
 await context.close();offline=true;context=await launch();page=await context.newPage();page.setDefaultTimeout(15000);
 await check('cold offline root start opens the public Academy',()=>openAcademy(page,'/'));
 await check('cold direct offline.html#copy navigation reaches local phrase gate',async()=>{
  await page.goto(origin+'/offline.html#copy=00000000-0000-4000-8000-000000000001');await page.locator('#localPhrase').waitFor();assert.equal(await page.locator('#editor').count(),0);assert.equal(await page.locator('#unlockLocal button').isDisabled(),true);
 });
 await check('cold offline.html#view and index.html fragment navigations retain the public shell',async()=>{
  for(const url of ['/offline.html#view=academy','/index.html#view=academy','/#view=academy'])await openAcademy(page,url);
 });
 await check('private, API, unapproved and query navigations never receive the public shell or cache canary',async()=>{
  for(const url of ['/api/v2/account#view=academy','/account/entry/#copy=synthetic','/nexus-shell.html#view=academy','/unapproved.html#view=academy','/offline.html?account=other#copy=synthetic','/?account=other#view=academy']){
   const other=await context.newPage();try{let rejected=false;try{await other.goto(origin+url)}catch{rejected=true}assert.equal(rejected,true,url)}finally{await other.close()}
  }
  await openAcademy(page,'/');
  const result=await page.evaluate(async()=>{const rows=[];for(const url of ['/offline.html#copy=synthetic','/api/v2/account#fragment','/offline.html?account=other']){let rejected=false;try{await fetch(url,{method:'POST',body:'SYNTHETIC'})}catch{rejected=true}rows.push(rejected)}return rows});assert.deepEqual(result,[true,true,true]);
 });
 await check('all synthetic user and legacy cache canary bytes remain intact',async()=>{
  await openAcademy(page,'/');assert.equal(await page.evaluate(()=>localStorage.getItem('synthetic-navigation-preserved')),'PROJECT_PROGRESS_PRESERVED');
  const canary=await page.evaluate(async()=>{const c=await caches.open('synthetic-navigation-private-canary');return await(await c.match('/api/v2/account')).text()});assert.equal(canary,'SYNTHETIC_PRIVATE_MUST_NOT_REPLAY');
 });
}catch(error){failures.push({name:'harness',message:error.message});console.error(error.stack)}finally{
 await context?.close();await new Promise(resolve=>server.close(resolve));await mkdir(path.dirname(resultPath),{recursive:true});
 const result={status:failures.length?'FAIL':'PASS',checks,failures,generation,physical:false,localNativeBrowser:true,realCredentials:false,userDataDeleted:0,cacheOrDatabaseDeleted:0};await writeFile(resultPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});if(failures.length)process.exitCode=1;
}
