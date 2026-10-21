// Real installation of the exact two deliverable SWs over disposable local storage.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const current=path.resolve(process.env.NEXUS_FRONTEND_DIR),rollback=path.resolve(process.env.NEXUS_ROLLBACK_DIR),resultFile=process.env.NEXUS_BROWSER_RESULT;
const a=JSON.parse(await readFile(path.join(current,'BUILD_MANIFEST.json'))),b=JSON.parse(await readFile(path.join(rollback,'BUILD_MANIFEST.json')));
let mode='candidate',browser,context,failure,offline=false;const checks=[],workerErrors=[],expectedOfflineFailures=[];
const mime=n=>n.endsWith('.js')?'text/javascript':n.endsWith('.css')?'text/css':n.endsWith('.json')?'application/json':n.endsWith('.webmanifest')?'application/manifest+json':n.endsWith('.png')?'image/png':n.endsWith('.svg')?'image/svg+xml':n.endsWith('.md')?'text/markdown':'text/html';
const server=http.createServer(async(req,res)=>{try{
 if(offline){req.socket.destroy();return}
 const n=decodeURIComponent(new URL(req.url,'http://local.invalid').pathname).slice(1);
 if(n==='_fixture.html'){res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});return res.end('<!doctype html><title>Isolated rollback</title>')}if(n==='favicon.ico'){res.writeHead(204);return res.end()}
 const base=mode==='candidate'?current:rollback,target=path.resolve(base,n);if(!target.startsWith(base+path.sep))throw Error();
 const data=await readFile(target);res.writeHead(200,{'content-type':mime(n),'cache-control':n==='service-worker.js'?'no-store':'public, max-age=0'});res.end(data);
}catch{res.writeHead(404,{'cache-control':'no-store'});res.end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const wait=async(page,generation)=>{let last;const deadline=Date.now()+30000;while(Date.now()<deadline){last=await page.evaluate(()=>new Promise(resolve=>{const c=new MessageChannel(),timer=setTimeout(()=>{c.port1.close();resolve(null)},15000);c.port1.onmessage=e=>{clearTimeout(timer);c.port1.close();resolve(e.data)};navigator.serviceWorker.controller?.postMessage({type:'nexus-pwa-status'},[c.port2])}));if(last?.generation===generation&&last.publicReady){await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.active?.state==='activated'&&!r.installing&&!r.waiting});return}await page.waitForTimeout(100)}throw Error('ROLLBACK_GENERATION_TIMEOUT '+JSON.stringify(last))};
try{
 browser=await chromium.launch({executablePath:process.env.NEXUS_CHROME_PATH,headless:true,args:['--disable-background-networking','--disable-component-update']});context=await browser.newContext();const page=await context.newPage();await page.goto(origin+'/_fixture.html');const cdp=await context.newCDPSession(page);await cdp.send('ServiceWorker.enable');cdp.on('ServiceWorker.workerErrorReported',e=>{if(offline&&/TypeError: Failed to fetch/.test(e.errorMessage?.errorMessage||''))expectedOfflineFailures.push(e);else workerErrors.push(e)});
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/service-worker.js',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready});await wait(page,a.assetGeneration);
 await page.evaluate(async()=>{localStorage.setItem('project-preserved','EXACT_SYNTHETIC_PROJECT');window.documentMarker='SAME_DOCUMENT';await(await caches.open('synthetic-preserved')).put('/private-canary',new Response('SYNTHETIC_NOT_FOR_REPLAY'))});
 const vaultId=await page.evaluate(async generation=>{const {createVaultStore}=await import('/releases/'+generation+'/pwa/local-vault.js');const s=await createVaultStore().create({schemaVersion:1,owner:{accountId:'synthetic-rollback',displayName:'Synthetic rollback'},projects:{},state:{courses:{},skills:{marker:'SYNTHETIC_DURABLE'}},base:{projects:{},state:{courses:{},skills:{}}}},'SYNTHETIC rollback local phrase');const id=s.id;await s.lock();return id},a.assetGeneration);
 const second=await context.newPage();await second.goto(origin+'/_fixture.html');await second.evaluate(()=>window.documentMarker='SECOND_DOCUMENT');
 for(const target of ['rollback','candidate']){
  mode=target;await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update()});await wait(page,target==='rollback'?b.rollbackGeneration:a.assetGeneration);await wait(second,target==='rollback'?b.rollbackGeneration:a.assetGeneration);
  assert.equal(await page.evaluate(()=>localStorage.getItem('project-preserved')),'EXACT_SYNTHETIC_PROJECT');assert.equal(await page.evaluate(()=>window.documentMarker),'SAME_DOCUMENT');assert.equal(await second.evaluate(()=>window.documentMarker),'SECOND_DOCUMENT');
  assert.equal(await page.evaluate(async()=>await(await(await caches.open('synthetic-preserved')).match('/private-canary')).text()),'SYNTHETIC_NOT_FOR_REPLAY');
  const local=await context.newPage();offline=true;await local.goto(origin+'/#copy='+vaultId);await local.locator('#localPhrase').fill('SYNTHETIC rollback local phrase');await local.locator('#unlockLocal button').click();await local.locator('#newProject').waitFor();
  const marker=await local.evaluate(async({generation,vaultId})=>{const {createVaultStore}=await import('/releases/'+generation+'/pwa/local-vault.js'),s=await createVaultStore().unlock(vaultId,'SYNTHETIC rollback local phrase'),v=s.read().state.skills.marker;await s.lock();return v},{generation:a.assetGeneration,vaultId});assert.equal(marker,'SYNTHETIC_DURABLE');await local.close();offline=false;
  checks.push({name:target==='rollback'?'exact old Alpha10 UI + safe worker installed over candidate':'candidate safely restored after exact rollback',status:'PASS'});
 }
 assert.deepEqual(workerErrors,[]);
}catch(e){failure={message:e.message,stack:String(e.stack).slice(0,2000)};console.error(e)}
finally{await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));await writeFile(resultFile,JSON.stringify({status:failure?'FAIL':'PASS',checks,failure,workerErrors,candidate:a.assetGeneration,rollback:b.rollbackGeneration,userStorageDeleted:0,userCacheDeleted:0,network:'local loopback only; no runtime or app executed',physical:false,production:false},null,2)+'\n',{flag:'wx'});if(failure)process.exitCode=1}
