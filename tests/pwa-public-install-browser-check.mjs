// Настоящий Chrome и весь собранный public graph. Только локальный HTTP fixture.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR),out=path.resolve(process.env.NEXUS_NATIVE_EVIDENCE);
await mkdir(out,{recursive:false});
const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),generation=manifest.assetGeneration;
const sw=await readFile(path.join(frontend,'service-worker.js'),'utf8'),profile=await mkdtemp(path.join(tmpdir(),'nexus-install-bounded-'));
const checks=[],requests=[],workerErrors=[];let context,mode='base',networkDown=false,failure,activeRequests=0,peakRequests=0;
const optional=new Set((manifest.optionalAssets||[]).map(r=>r.url));
const latencyMs=350,uniqueBodies=new Set(manifest.files.filter(r=>!optional.has(r.file)&&!['index.html','nexus-shell.html','version.json','service-worker.js'].includes(r.file)).map(r=>r.sha256+':'+r.bytes)).size;
const mime=f=>f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':f.endsWith('.webmanifest')?'application/manifest+json':f.endsWith('.png')?'image/png':f.endsWith('.webp')?'image/webp':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.md')?'text/markdown':'text/html';
const server=http.createServer(async(req,res)=>{
 if(networkDown){req.socket.destroy();return}
 const url=new URL(req.url,'http://127.0.0.1');
 if(req.method!=='GET'){res.writeHead(405);return res.end()}
 if(url.pathname==='/fixture.html'){res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});return res.end('<!doctype html><meta charset="utf-8"><title>Синтетическая проверка установки</title>')}
 if(url.pathname==='/service-worker.js'){
  let body=sw;if(mode==='update')body=body.replace('generation: "'+generation+'"','generation: "'+generation+'-update"');
  res.writeHead(200,{'content-type':'text/javascript','cache-control':'no-store'});return res.end(body);
 }
 if(/^\/(api|account|oauth|auth)\//.test(url.pathname)){res.writeHead(401,{'cache-control':'no-store',vary:'*'});return res.end('SYNTHETIC_PRIVATE_NOT_FOR_CACHE')}
 const file=decodeURIComponent(url.pathname).slice(1),target=path.resolve(frontend,file);
 if(!target.startsWith(frontend+path.sep)){res.writeHead(403);return res.end()}
 try{
  const bytes=await readFile(target);activeRequests++;peakRequests=Math.max(peakRequests,activeRequests);requests.push({file,mode});
  await new Promise(resolve=>setTimeout(resolve,latencyMs));
  res.writeHead(200,{'content-type':mime(file),'cache-control':'public,max-age=0'});res.end(bytes);activeRequests--;
 }catch{res.writeHead(404,{'cache-control':'no-store'});res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
async function launch(offline=false){
 const c=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.NEXUS_CHROME_PATH,...(offline?{proxy:{server:'http://127.0.0.1:9'}}:{}),args:['--disable-background-networking','--disable-sync','--no-first-run']});
 if(offline)await c.setOffline(true);return c;
}
async function proof(page){return page.evaluate(()=>new Promise(resolve=>{
 const worker=navigator.serviceWorker.controller;if(!worker)return resolve(null);
 const c=new MessageChannel(),timer=setTimeout(()=>{c.port1.close();resolve(null)},15000);
 c.port1.onmessage=e=>{clearTimeout(timer);c.port1.close();resolve(e.data)};
 worker.postMessage({type:'nexus-pwa-status'},[c.port2]);
}))}
async function ready(page,id){const start=performance.now();while(performance.now()-start<60000){const p=await proof(page);if(p?.generation===id&&p.publicReady===true)return p;await page.waitForTimeout(100)}throw Error('INSTALL_NOT_READY_UNDER_60_SECONDS')}
async function preserved(page){return page.evaluate(async()=>{
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('synthetic-private-projects',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 const value=await new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').get('one');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();
 const cache=await caches.open('synthetic-legacy-private'),body=await(await cache.match('/api/v2/account')).text();
 return {value,body,local:localStorage.getItem('synthetic-progress')};
})}
async function check(name,fn){const start=performance.now();await fn();const r={name,status:'PASS',durationMs:Math.round(performance.now()-start)};checks.push(r);console.log(JSON.stringify(r))}
try{
 context=await launch();let page=await context.newPage();await page.goto(origin+'/fixture.html');
 const cdp=await context.newCDPSession(page);await cdp.send('ServiceWorker.enable');cdp.on('ServiceWorker.workerErrorReported',e=>workerErrors.push(e));
 await check('полный новый public graph готов через настоящий client без увеличения его 60-секундного срока',async()=>{
  await page.evaluate(async generation=>{window.prepareVerified=(await import('/releases/'+generation+'/pwa/client.js')).ensureVerifiedRuntime},generation);
  const before=requests.length,value=await page.evaluate(()=>window.prepareVerified());
  assert.equal(value.generation,generation);assert.equal(value.publicReady,true);assert.equal(value.protocol,'nexus-verified-public-v1');
  assert.equal(requests.length-before,uniqueBodies);assert.ok(peakRequests>1&&peakRequests<=8);
  assert.equal(requests.some(r=>optional.has(r.file)),false,'Необязательное медиа не загружается установщиком PWA');
  for(const file of optional)assert.equal(sw.includes('url: "'+file+'"'),false,'Медиа не получает public authority');
 });
 let expected;
 await check('локальные проекты, прогресс и старый cache сохранены при установке',async()=>{
  await page.evaluate(async()=>{
   localStorage.setItem('synthetic-progress','SYNTHETIC_PROGRESS_42');
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('synthetic-private-projects',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
   await new Promise((resolve,reject)=>{const t=db.transaction('projects','readwrite',{durability:'strict'});t.objectStore('projects').put({files:{'main.cpp':'SYNTHETIC_CODE_PRESERVED'}},'one');t.oncomplete=resolve;t.onabort=()=>reject(t.error)});db.close();
   await(await caches.open('synthetic-legacy-private')).put('/api/v2/account',new Response('SYNTHETIC_PRIVATE_CACHE_NOT_FOR_REPLAY'));
   window.documentMarker='ORIGINAL_DOCUMENT';
  });expected=await preserved(page);assert.equal(expected.local,'SYNTHETIC_PROGRESS_42');
 });
 const second=await context.newPage();await second.goto(origin+'/fixture.html');await second.evaluate(()=>window.documentMarker='SECOND_DOCUMENT');
 await check('обновление двух вкладок переиспользует только проверенные bytes и не перезагружает документы',async()=>{
  const before=requests.length;mode='update';await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update()});
  await ready(page,generation+'-update');await ready(second,generation+'-update');assert.equal(requests.length,before);
  assert.equal(await page.evaluate(()=>window.documentMarker),'ORIGINAL_DOCUMENT');assert.equal(await second.evaluate(()=>window.documentMarker),'SECOND_DOCUMENT');assert.deepEqual(await preserved(page),expected);
 });
 await check('безопасный возврат поколения сохраняет все личные bytes без сетевой перезагрузки ресурсов',async()=>{
  const before=requests.length;mode='base';await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update()});await ready(page,generation);await ready(second,generation);
  assert.equal(requests.length,before);assert.deepEqual(await preserved(page),expected);
 });
 await context.close();context=null;networkDown=true;context=await launch(true);page=await context.newPage();
 await check('полное закрытие Chrome и повторный запуск без сети открывают настоящую Академию',async()=>{
  await page.goto(origin+'/offline.html#view=academy');await page.locator('#offlineApp [data-visual-academy]').waitFor({state:'visible',timeout:30000});
  assert.equal((await proof(page)).publicReady,true);assert.deepEqual(await preserved(page),expected);await page.screenshot({path:path.join(out,'cold-offline-academy.png'),fullPage:true});
 });
 await check('старый private/API cache не воспроизводится после холодного запуска',async()=>{
  for(const target of ['/api/v2/account','/api/v2/cloud/projects','/account/access/','/nexus-shell.html']){
   const result=await page.evaluate(async target=>{try{await fetch(target);return true}catch{return false}},target);assert.equal(result,false,target);
  }
  assert.deepEqual(await preserved(page),expected);
 });
 assert.deepEqual(workerErrors,[]);
}catch(error){failure={message:error.message,stack:String(error.stack).slice(0,4000)};console.error(error)}
finally{
 await context?.close();await new Promise(resolve=>server.close(resolve));
 await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:failure?'FAIL':'PASS',checks,failure:failure||null,workerErrors,generation,uniqueBodies,publicRecords:manifest.publicAssets,requests,peakRequests,latencyMs,profile,physical:false,production:false,cloudRequests:0,userDataDeleted:0},null,2)+'\n');if(failure)process.exitCode=1;
}
