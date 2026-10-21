// Native SW, persistent disposable Chromium profile and actual Clang/WASI. No personal profiles, tokens or cloud data plane.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {RUNTIME_RESOURCES} from '../pwa/runtime-manifest.js';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.resolve(process.env.NEXUS_PWA_EVIDENCE),frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR);
const legacySource=path.resolve(process.env.NEXUS_LEGACY_SOURCE||path.resolve(root,'../nexus-alpha10-closure-evidence-2026-10-21/baseline-source'));
await mkdir(out,{recursive:false});
const profile=await mkdtemp(path.join(tmpdir(),'nx-closure-')),checks=[],requests=[],failures=[],workerErrors=[];
const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),generation=manifest.assetGeneration;
const safeSW=await readFile(path.join(frontend,'service-worker.js'),'utf8');
const legacySW=await readFile(path.join(legacySource,'service-worker.js'),'utf8');
let mode='legacy',badAsset=null,context,server,transportOffline=false;
const mime=file=>file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.webmanifest')?'application/manifest+json':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.md')?'text/markdown':'text/html';
const fixture='<!doctype html><meta charset="utf-8"><title>Synthetic PWA regression</title><body>Synthetic fixture only</body>';
server=http.createServer(async(req,res)=>{
 if(transportOffline){req.socket.destroy();return}
 try{
  const url=new URL(req.url,'http://127.0.0.1'),name=decodeURIComponent(url.pathname).slice(1);
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end()}
  if(url.pathname==='/service-worker.js'){
   const changed=id=>safeSW.replace('generation: "'+generation+'"','generation: "'+id+'"');
   const body=mode==='legacy'?legacySW:mode==='update2'?changed(generation+'-update2'):mode==='broken'?changed(generation+'-interrupted'):mode==='mime-broken'?changed(generation+'-mime-rejected').replaceAll('mime: \"text/markdown\"','mime: \"text/html\"'):safeSW;
   res.writeHead(200,{'content-type':'text/javascript','cache-control':'no-store','service-worker-allowed':'/'});return res.end(body);
  }
  if(url.pathname.startsWith('/api/')||url.pathname==='/nexus-shell.html'){
   res.writeHead(401,{'content-type':'application/json','cache-control':'no-store',vary:'*'});return res.end('{"error":{"code":"SYNTHETIC_NO_SESSION"}}');
  }
  if(!name||name==='_fixture.html'||name==='index.html'){res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});return res.end(fixture)}
  if(mode==='broken'&&name===badAsset){res.writeHead(200,{'content-type':mime(name)});return res.end('INTERRUPTED_UPDATE_SAME_ORIGIN_SYNTHETIC')}
  const base=mode==='legacy'?legacySource:frontend,target=path.resolve(base,name);
  if(!target.startsWith(base+path.sep)){res.writeHead(403);return res.end()}
  const bytes=await readFile(target);res.writeHead(200,{'content-type':mime(name),'cache-control':'public, max-age=0'});res.end(bytes);
 }catch{console.log('LOCAL_MISSING '+req.url);res.writeHead(404,{'cache-control':'no-store'});res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const launch=(offline=false)=>chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.NEXUS_CHROME_PATH,...(offline?{proxy:{server:'http://127.0.0.1:9'}}:{}),args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run'],serviceWorkers:'allow'});
async function check(name,fn){const started=performance.now();await fn();const row={name,status:'PASS',durationMs:Math.round(performance.now()-started)};checks.push(row);console.log(JSON.stringify(row))}
async function status(page,includeRuntime=false){return page.evaluate(async includeRuntime=>{
 return new Promise((resolve,reject)=>{const c=new MessageChannel(),timer=setTimeout(()=>{c.port1.close();reject(Error('STATUS_TIMEOUT'))},includeRuntime?60000:15000);c.port1.onmessage=e=>{clearTimeout(timer);c.port1.close();resolve(e.data)};navigator.serviceWorker.controller.postMessage({type:'nexus-pwa-status',includeRuntime},[c.port2])});
},includeRuntime)}
async function waitGeneration(page,expected){const deadline=Date.now()+30000;let last;
 while(Date.now()<deadline){try{last=await status(page);if(last.generation===expected&&last.publicReady)return last}catch{}await page.waitForTimeout(150)}throw Error('GENERATION_WAIT '+JSON.stringify(last))}
async function preserved(page){return page.evaluate(async()=>{
 const projects=localStorage.getItem('synthetic-projects'),progress=localStorage.getItem('synthetic-progress');
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('synthetic-user-projects',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 const value=await new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').get('preserved');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();
 const names=await caches.keys(),cacheBytes=[];
 for(const name of names.sort()){const cache=await caches.open(name);for(const request of await cache.keys()){
  const response=await cache.match(request),bytes=await response.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  cacheBytes.push({name,url:request.url,hash});
 }}
 return {projects,progress,value,names,cacheBytes:cacheBytes.sort((a,b)=>a.url.localeCompare(b.url))};
})}
async function runCompiler(page,label){
 return page.evaluate(async({generation,label})=>{
  const {wasmRuntimeProvider:p}=await import('/releases/'+generation+'/sandbox/providers/wasm-runtime.js');
  const source='#include <iostream>\n#include <vector>\n#include "calc.hpp"\nint main(){std::vector<int> v{2,3,5};int n=0;for(int x:v)n+=x;std::cout<<"NEXUS_CLOSURE "<<n<<" MULTI "<<calc()<<"\\n";}';
  try{const result=await p.run({languageId:'cpp',entryFile:'main.cpp',source,files:{'main.cpp':source,'calc.hpp':'int calc();','calc.cpp':'#include "calc.hpp"\nint calc(){return 42;}'}});return {label,stdout:result.stdout,exitCode:result.exitCode,translationUnits:result.translationUnits}}finally{p.shutdown()}
 },{generation,label});
}
let original,beforeReplay,networkCompiler,offlineCompiler;
try{
 context=await launch();context.on('request',r=>{const u=new URL(r.url());if(['http:','https:'].includes(u.protocol))requests.push({origin:u.origin,path:u.pathname,method:r.method(),serviceWorker:!!r.serviceWorker()})});
 const page=await context.newPage();page.setDefaultTimeout(30000);page.on('console',m=>{if(m.type()==='error')console.log('BROWSER_ERROR '+m.text().slice(0,500))});await page.goto(origin+'/_fixture.html');
 const cdp=await context.newCDPSession(page);await cdp.send('ServiceWorker.enable');cdp.on('ServiceWorker.workerErrorReported',e=>{workerErrors.push(e);console.log('WORKER_ERROR '+JSON.stringify(e).slice(0,1200))});
 await check('native historical .2.4.5 controller installed in an empty synthetic profile',async()=>{
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/service-worker.js',{scope:'/',updateViaCache:'none'});await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('LEGACY_INSTALL_TIMEOUT')),20000))])});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 });
 await page.evaluate(async()=>{
  localStorage.setItem('synthetic-projects','PROJECT_BYTES_PRESERVED');localStorage.setItem('synthetic-progress','PROGRESS_BYTES_PRESERVED');
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('synthetic-user-projects',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  await new Promise((resolve,reject)=>{const t=db.transaction('projects','readwrite',{durability:'strict'});t.objectStore('projects').put({files:{'main.cpp':'SYNTHETIC_PROJECT_CODE'},progress:42},'preserved');t.oncomplete=resolve;t.onabort=()=>reject(t.error)});db.close();
  const cache=await caches.open('akronikl-it-nexus-v0.1.7-alpha.2.4.5');await cache.put('/api/v2/account',new Response('SYNTHETIC_PRIVATE_CACHE_CANARY'));await cache.put('/unapproved-private.json',new Response('SYNTHETIC_PRIVATE_OTHER_CANARY'));
 });
 original=await preserved(page);await context.setOffline(true);
 beforeReplay=await page.evaluate(()=>fetch('/api/v2/account').then(r=>r.text()));
 assert.equal(beforeReplay,'SYNTHETIC_PRIVATE_CACHE_CANARY');
 await writeFile(path.join(out,'BEFORE_LEGACY_REPLAY_EXPECTED_FAIL.json'),JSON.stringify({status:'EXPECTED_SECURITY_FAIL_REPRODUCED',body:'synthetic private canary replayed',controller:'/service-worker.js',credentials:false},null,2));
 await context.setOffline(false);const second=await context.newPage();await second.goto(origin+'/_fixture.html');original=await preserved(page);
 await check('atomic safe migration claims two tabs without reload or user storage/cache deletion',async()=>{
  const counters=await Promise.all([page,second].map(p=>p.evaluate(()=>{window.syntheticDocumentId=crypto.randomUUID();return window.syntheticDocumentId})));
  mode='safe';await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update()});
  await waitGeneration(page,generation);await waitGeneration(second,generation);
  assert.deepEqual(await preserved(page),original);assert.deepEqual(await preserved(second),original);
  assert.deepEqual(await Promise.all([page,second].map(p=>p.evaluate(()=>window.syntheticDocumentId))),counters);
 });
 await check('offline private/API requests never replay any historical cache or HTML fallback',async()=>{
  await context.setOffline(true);
  for(const target of ['/api/v2/account','/api/v2/cloud/projects','/account/entry/','/nexus-shell.html','/unapproved-private.json']){
   const result=await page.evaluate(async path=>{try{return {ok:true,text:await (await fetch(path)).text()}}catch{return{ok:false}}},target);
   assert.equal(result.ok,false,target);
  }
  assert.deepEqual(await preserved(page),original);
 });
 await check('private Vary-star response cannot be stored and mutable root metadata has no public cache authority',async()=>{
  await context.setOffline(false);
  const result=await page.evaluate(async generation=>{
   const response=await fetch('/api/v2/account');let rejected=false;
   try{await(await caches.open('akronikl-it-nexus-v0.1.7-alpha.2.4.5')).put('/synthetic-rejected-private-write',response.clone())}catch(e){rejected=e.name==='TypeError'}
   const root=await fetch('/version.json'),pinned=await fetch('/releases/'+generation+'/version.json');
   return {rejected,noStore:response.headers.get('cache-control'),vary:response.headers.get('vary'),rootVerified:root.headers.has('x-nexus-verified-sha256'),pinnedVerified:pinned.headers.has('x-nexus-verified-sha256')};
  },generation);
  assert.deepEqual(result,{rejected:true,noStore:'no-store',vary:'*',rootVerified:false,pinnedVerified:true});assert.deepEqual(await preserved(page),original);await context.setOffline(true);
 });
 await check('cold offline runtime fails honestly before an unverified module can execute',async()=>{
  await assert.rejects(runCompiler(page,'cold-offline'));assert.equal((await status(page,true)).runtimeReady,false);
  await context.setOffline(false);
 });
 await check('actual Clang/WASI graph passes SHA/MIME gates and compiles STL from network',async()=>{
  networkCompiler=await runCompiler(page,'verified-network');assert.match(networkCompiler.stdout,/NEXUS_CLOSURE 10 MULTI 42/);assert.equal(networkCompiler.exitCode,0);assert.equal(networkCompiler.translationUnits.length,2);
  assert.equal((await status(page,true)).runtimeReady,true);
 });
 await check('interrupted generation install preserves the active generation and every user byte',async()=>{
  mode='broken';badAsset=manifest.files.find(r=>r.file.endsWith('/core/app.js')).file;
  await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update()});
  // Не запускать следующий update, пока отрицательная установка ещё выполняется.
  // Фиксированная пауза ошибочно смешивала два install на нагруженном хосте.
  await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.active?.state==='activated'&&!r.installing&&!r.waiting},{},{timeout:60000});
  assert.equal((await status(page)).generation,generation);assert.deepEqual(await preserved(page),original);
 });
 await check('incorrect producer Markdown MIME rejects the entire update and preserves the active generation and user data',async()=>{
  assert.equal(safeSW.split('mime: "text/markdown"').length-1,6);
  mode='mime-broken';await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update()});
  await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.active?.state==='activated'&&!r.installing&&!r.waiting},{},{timeout:60000});
  assert.equal((await status(page)).generation,generation);assert.equal((await status(second)).generation,generation);assert.deepEqual(await preserved(page),original);
 });
 await check('valid update then safe rollback retain both generations and do not reload tabs',async()=>{
  mode='update2';await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update()});await waitGeneration(page,generation+'-update2');await waitGeneration(second,generation+'-update2');
  mode='safe';await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update()});await waitGeneration(page,generation);await waitGeneration(second,generation);
  assert.deepEqual(await preserved(page),original);
 });
 await check('strict IndexedDB abort and quota faults publish neither partial generation nor acknowledgement',async()=>{
  const result=await page.evaluate(async generation=>{
   const {createAssetStore}=await import('/releases/'+generation+'/pwa/durable-store.js'),{sha256}=await import('/releases/'+generation+'/pwa/policy.js');
   const data=new TextEncoder().encode('SYNTHETIC_DURABLE_ASSET').buffer,record={url:'synthetic-public',sha256:await sha256(data),bytes:data.byteLength};
   const store=createAssetStore({name:'synthetic-pwa-faults'}),put=IDBObjectStore.prototype.put;let puts=0,failed=false;
   IDBObjectStore.prototype.put=function(...args){if(++puts===2)throw new DOMException('Synthetic quota fault','QuotaExceededError');return put.apply(this,args)};
   try{await store.stage('incomplete',[record],new Map([[record.url,data]]))}catch{failed=true}finally{IDBObjectStore.prototype.put=put}
   const absent=!await store.ready('incomplete',[record]);await store.close();
   const reopened=createAssetStore({name:'synthetic-pwa-faults'}),partial=await reopened.read(record);
   await reopened.stage('recovered',[record],new Map([[record.url,data]]));await reopened.close();
   const restart=createAssetStore({name:'synthetic-pwa-faults'}),ready=await restart.ready('recovered',[record]),bytes=await restart.read(record);await restart.close();
   return {failed,absent,noPartial:partial===null,ready,bytes:bytes.byteLength};
  },generation);
  assert.deepEqual(result,{failed:true,absent:true,noPartial:true,ready:true,bytes:23});assert.deepEqual(await preserved(page),original);
 });
 await check('durable store rejects metadata-only and corrupt bytes; concurrent tabs retain complete generations',async()=>{
  const result=await page.evaluate(async generation=>{
   const {createAssetStore}=await import('/releases/'+generation+'/pwa/durable-store.js'),{sha256}=await import('/releases/'+generation+'/pwa/policy.js');
   const data=new TextEncoder().encode('SYNTHETIC_DURABLE_ASSET').buffer,record={url:'synthetic-public',sha256:await sha256(data),bytes:data.byteLength};
   const name='synthetic-pwa-faults',store=createAssetStore({name}),other=createAssetStore({name});
   const mutate=async fn=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise((resolve,reject)=>{const tx=db.transaction(['assets','generations'],'readwrite',{durability:'strict'});fn(tx);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});db.close()};
   await mutate(tx=>tx.objectStore('generations').put({id:'metadata-only',hashes:['e'.repeat(64)]}));
   const metadataOnly=await store.ready('metadata-only',[{...record,sha256:'e'.repeat(64)}]);
   await mutate(tx=>tx.objectStore('assets').put({id:record.sha256,data:new Uint8Array(record.bytes).buffer}));
   let corruptRejected=false;try{await store.read(record)}catch(e){corruptRejected=e.code==='ASSET_INTEGRITY_MISMATCH'}
   const corruptReady=await store.ready('recovered',[record]);
   await Promise.all([store.stage('tab-a',[record],new Map([[record.url,data]])),other.stage('tab-b',[record],new Map([[record.url,data]]))]);
   const bothReady=await store.ready('tab-a',[record])&&await other.ready('tab-b',[record]);await store.close();await other.close();
   return {metadataOnly,corruptRejected,corruptReady,bothReady};
  },generation);
  assert.deepEqual(result,{metadataOnly:false,corruptRejected:true,corruptReady:false,bothReady:true});assert.deepEqual(await preserved(page),original);
 });
 await context.close();context=await launch(true);
 await check('browser process restart restores committed runtime and compiles without network',async()=>{
  transportOffline=true;await context.setOffline(true);const p=await context.newPage();
  // Самостоятельная публичная оболочка открывается без создания Account proof.
  await p.goto(origin+'/');await waitGeneration(p,generation);await p.getByRole('heading',{name:'Академия · офлайн'}).waitFor();
  assert.equal(await p.evaluate(async generation=>(await import('/releases/'+generation+'/core/account-storage.js')).verifiedAccount(),generation),null);
  offlineCompiler=await runCompiler(p,'verified-IDB-after-browser-restart');
  assert.match(offlineCompiler.stdout,/NEXUS_CLOSURE 10/);assert.equal(offlineCompiler.exitCode,0);assert.deepEqual(await preserved(p),original);
 });
 const observed=[...new Set(requests.filter(r=>r.origin==='https://cdn.jsdelivr.net').map(r=>r.origin+r.path))].sort();
 assert.deepEqual(observed,RUNTIME_RESOURCES.map(r=>r.url).sort(),'Observed browser runtime graph must equal the seven pinned files');
 assert.deepEqual(requests.filter(r=>![origin,'https://cdn.jsdelivr.net'].includes(r.origin)),[],'No Nexus or provider data-plane access');
}catch(error){failures.push({message:error.message,stack:String(error.stack).slice(0,5000)});console.error(error)}
finally{
 await context?.close();await new Promise(resolve=>server.close(resolve));
 const report={status:failures.length?'FAIL':'PASS',checks,failures,workerErrors,profile,generation,beforeReplay:beforeReplay==='SYNTHETIC_PRIVATE_CACHE_CANARY'?'EXPECTED_SECURITY_FAIL_REPRODUCED':'NOT_RUN',networkCompiler,offlineCompiler,requests,physical:false,localBrowser:true,syntheticProfileOnly:true,realCredentials:false,cloudDataPlane:false,userCachesDeleted:0,userDatabasesDeleted:0};
 await writeFile(path.join(out,'RESULT.json'),JSON.stringify(report,null,2)+'\n');if(failures.length)process.exitCode=1;
}
