// Exact historical -> candidate -> historical -> candidate SWs over disposable storage.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const current=path.resolve(process.env.NEXUS_FRONTEND_DIR),rollback=path.resolve(process.env.NEXUS_ROLLBACK_DIR),resultFile=process.env.NEXUS_BROWSER_RESULT;
const a=JSON.parse(await readFile(path.join(current,'BUILD_MANIFEST.json'))),b=JSON.parse(await readFile(path.join(rollback,'BUILD_MANIFEST.json')));b.rollbackGeneration||=b.assetGeneration;
assert.notEqual(a.assetGeneration,b.rollbackGeneration,'upgrade must install a different deliverable generation');
assert.deepEqual(a.manifestIdentity,b.manifestIdentity,'installed PWA identity must remain stable');
let mode='rollback',browser,context,failure,offline=false;const checks=[],workerErrors=[],expectedOfflineFailures=[],externalRequests=[];
const phrase='SYNTHETIC rollback local phrase';
const payload={schemaVersion:1,owner:{accountId:'synthetic-rollback',displayName:'Synthetic rollback'},projects:{'synthetic-project':{id:'synthetic-project',title:'Synthetic preserved project',languageId:'cpp',workspace:{entryFile:'main.cpp',activeFile:'main.cpp',files:[{path:'main.cpp',content:'// EXACT_SYNTHETIC_SOURCE\nint main(){return 42;}\n'}]},progress:{milestones:[1]},checkpoints:[]}},state:{courses:{cpp:{lessons:{'synthetic-lesson':{completed:true,score:3}}}},skills:{marker:'SYNTHETIC_DURABLE'}},base:{projects:{},state:{courses:{},skills:{}}}};
const mime=n=>n.endsWith('.js')?'text/javascript':n.endsWith('.css')?'text/css':n.endsWith('.json')?'application/json':n.endsWith('.webmanifest')?'application/manifest+json':n.endsWith('.png')?'image/png':n.endsWith('.webp')?'image/webp':n.endsWith('.svg')?'image/svg+xml':n.endsWith('.md')?'text/markdown':'text/html';
const server=http.createServer(async(req,res)=>{try{
 if(offline){req.socket.destroy();return}
 const n=decodeURIComponent(new URL(req.url,'http://local.invalid').pathname).slice(1);
 if(n==='_fixture.html'){res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});return res.end('<!doctype html><title>Isolated rollback</title>')}if(n==='favicon.ico'){res.writeHead(204);return res.end()}
 const base=mode==='candidate'?current:rollback,target=path.resolve(base,n);if(!target.startsWith(base+path.sep))throw Error();
 const data=await readFile(target);res.writeHead(200,{'content-type':mime(n),'cache-control':n==='service-worker.js'?'no-store':'public, max-age=0'});res.end(data);
}catch{res.writeHead(404,{'cache-control':'no-store'});res.end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const wait=async(page,generation)=>{let last;const deadline=Date.now()+60000;while(Date.now()<deadline){last=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration(),proof=await new Promise(resolve=>{const c=new MessageChannel(),timer=setTimeout(()=>{c.port1.close();resolve(null)},15000);c.port1.onmessage=e=>{clearTimeout(timer);c.port1.close();resolve(e.data)};navigator.serviceWorker.controller?.postMessage({type:'nexus-pwa-status'},[c.port2])});return {...proof,activated:r?.active?.state==='activated'&&!r.installing&&!r.waiting}});if(last?.generation===generation&&last.publicReady&&last.activated)return;await page.waitForTimeout(100)}throw Error('ROLLBACK_GENERATION_TIMEOUT '+JSON.stringify(last))};
async function check(name,fn){const started=performance.now();await fn();const row={name,status:'PASS',durationMs:Math.round(performance.now()-started)};checks.push(row);console.log(JSON.stringify(row))}
async function preserved(page,vaultId){return page.evaluate(async vaultId=>{
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nexus-offline-workspaces-v1',1);r.onupgradeneeded=()=>{r.transaction.abort();reject(Error('EXISTING_VAULT_DATABASE_MISSING'))};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 const row=await new Promise((resolve,reject)=>{const r=db.transaction('vaults').objectStore('vaults').get(vaultId);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();
 if(!row)throw Error('EXISTING_VAULT_MISSING');
 const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
 const vault={id:row.id,revision:row.revision,format:row.format,iterations:row.iterations,salt:await digest(row.salt),iv:await digest(row.iv),ciphertext:await digest(row.ciphertext)};
 const cached=await(await caches.open('synthetic-preserved')).match('/private-canary');
 return{project:localStorage.getItem('project-preserved'),progress:localStorage.getItem('progress-preserved'),privateCanary:cached?await cached.text():null,vault};
},vaultId)}
async function openOfflineCopy(generation,vaultId){
 const local=await context.newPage();offline=true;await context.setOffline(true);
 try{
  await local.goto(origin+'/#copy='+vaultId);await local.locator('#localPhrase').fill(phrase);await local.locator('#unlockLocal button').click();await local.locator('#psNewProject').waitFor();
  assert.equal(await local.locator('[data-studio-project] h3').textContent(),'Synthetic preserved project');
  // A rollback shell may only import modules authorized by that exact old worker.
  // Future-generation bytes in IndexedDB do not grant the old worker authority.
  const restored=await local.evaluate(async({generation,vaultId,phrase})=>{const {createVaultStore}=await import('/releases/'+generation+'/pwa/local-vault.js'),store=createVaultStore();let session;try{session=await store.unlock(vaultId,phrase);return session.read()}finally{await session?.lock();await store.close()}},{generation,vaultId,phrase});
  assert.deepEqual(restored,payload,'encrypted source files and course progress must survive byte-exact upgrade/rollback');
  await wait(local,generation);
 }finally{await local.close();await context.setOffline(false);offline=false}
}
try{
 browser=await chromium.launch({executablePath:process.env.NEXUS_CHROME_PATH,headless:true,args:['--disable-background-networking','--disable-component-update']});context=await browser.newContext();context.on('request',request=>{const u=new URL(request.url());if(['http:','https:'].includes(u.protocol)&&u.origin!==origin)externalRequests.push(request.url())});const page=await context.newPage();await page.goto(origin+'/_fixture.html');const cdp=await context.newCDPSession(page);await cdp.send('ServiceWorker.enable');cdp.on('ServiceWorker.workerErrorReported',e=>{if(offline&&/TypeError: Failed to fetch/.test(e.errorMessage?.errorMessage||''))expectedOfflineFailures.push(e);else workerErrors.push(e)});
 await check('exact historical PWA installed before the upgrade',async()=>{await page.evaluate(async()=>{await navigator.serviceWorker.register('/service-worker.js',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready});await wait(page,b.rollbackGeneration)});
 await page.evaluate(async()=>{localStorage.setItem('project-preserved','EXACT_SYNTHETIC_PROJECT');localStorage.setItem('progress-preserved','EXACT_SYNTHETIC_PROGRESS');window.documentMarker='SAME_DOCUMENT';await(await caches.open('synthetic-preserved')).put('/private-canary',new Response('SYNTHETIC_NOT_FOR_REPLAY'))});
 const vaultId=await page.evaluate(async({generation,payload,phrase})=>{const {createVaultStore}=await import('/releases/'+generation+'/pwa/local-vault.js'),store=createVaultStore(),session=await store.create(payload,phrase);const id=session.id;await session.lock();await store.close();return id},{generation:b.rollbackGeneration,payload,phrase});
 const original=await preserved(page,vaultId);
 const second=await context.newPage();await second.goto(origin+'/_fixture.html');await second.evaluate(()=>window.documentMarker='SECOND_DOCUMENT');
 await check('historical encrypted project opens offline before any update',async()=>{await openOfflineCopy(b.rollbackGeneration,vaultId);assert.deepEqual(await preserved(page,vaultId),original)});
 for(const [target,name] of [['candidate','installed historical PWA upgrades to candidate'],['rollback','exact historical build rolls back candidate'],['candidate','candidate restores after the exact rollback']]){
  await check(name+' with two live documents and intact local storage, progress, cache and encrypted IndexedDB',async()=>{
   mode=target;const generation=target==='rollback'?b.rollbackGeneration:a.assetGeneration;
   await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update()});await wait(page,generation);await wait(second,generation);
   assert.equal(await page.evaluate(()=>window.documentMarker),'SAME_DOCUMENT');assert.equal(await second.evaluate(()=>window.documentMarker),'SECOND_DOCUMENT');
   assert.deepEqual(await preserved(page,vaultId),original);assert.deepEqual(await preserved(second,vaultId),original);
   await openOfflineCopy(generation,vaultId);assert.deepEqual(await preserved(page,vaultId),original);
  });
 }
 assert.deepEqual(workerErrors,[]);assert.deepEqual(externalRequests,[],'fixture must not contact live services');
}catch(e){failure={message:e.message,stack:String(e.stack).slice(0,2000)};console.error(e)}
finally{await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));await writeFile(resultFile,JSON.stringify({status:failure?'FAIL':'PASS',checks,failure,workerErrors,expectedOfflineFailures:expectedOfflineFailures.length,externalRequests,candidate:a.assetGeneration,rollback:b.rollbackGeneration,sequence:[b.rollbackGeneration,a.assetGeneration,b.rollbackGeneration,a.assetGeneration],userStorageDeleted:0,userCacheDeleted:0,network:'local loopback only; actual offline application and encrypted vault, no compiler or live Account/Cloud requests',scope:'native service-worker upgrade/rollback; two retained fixture documents; exact encrypted IndexedDB bytes and offline UI unlock; not a physical installation or HTTPS/live authorization test',physical:false,production:false},null,2)+'\n',{flag:'wx'});if(failure)process.exitCode=1}
