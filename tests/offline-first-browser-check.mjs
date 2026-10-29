// Нативные SW/IDB/редактор/компилятор, отдельный синтетический профиль. Не физический LIVE.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {bindRuntimeTransport} from './helpers/runtime-transport.mjs';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR),out=path.resolve(process.env.NEXUS_OFFLINE_EVIDENCE);
await mkdir(out,{recursive:false});
const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),generation=manifest.assetGeneration,profile=await mkdtemp(path.join(tmpdir(),'nx-offline-'));
const course=JSON.parse(await readFile(path.join(frontend,'releases',generation,'courses/cpp/manifest.json')));
assert.ok(Number.isSafeInteger(course.lessonCount)&&course.lessonCount>0);
const phrase='SYNTHETIC local copy phrase only 2026',checks=[],failures=[],requests=[],pageErrors=[];
let context,offline=false,vaultId,branchId;
const source='#include <iostream>\n#include <vector>\n#include "calc.hpp"\nint main(){std::vector<int> v{2,3,5};int n=0;for(int x:v)n+=x;std::cout<<"NEXUS_OFFLINE "<<n<<" "<<calc()<<"\\n";}';
const mime=f=>f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':f.endsWith('.webmanifest')?'application/manifest+json':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.png')?'image/png':f.endsWith('.webp')?'image/webp':f.endsWith('.md')?'text/markdown':'text/html';
const server=http.createServer(async(req,res)=>{
 if(offline){req.socket.destroy();return}
 try{
  const u=new URL(req.url,'http://127.0.0.1');if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/account/')){res.writeHead(401,{'content-type':'application/json','cache-control':'no-store',vary:'*'});return res.end('{"error":{"code":"SYNTHETIC_NO_SESSION"}}')}
  const file=u.pathname==='/'?'offline.html':decodeURIComponent(u.pathname).slice(1),target=path.resolve(frontend,file);
  if(!target.startsWith(frontend+path.sep))throw Error('PATH');
  const bytes=await readFile(target);res.writeHead(200,{'content-type':mime(file),'cache-control':'public, max-age=0',...(file==='service-worker.js'?{'service-worker-allowed':'/'}:{})});res.end(bytes);
 }catch{res.writeHead(404,{'cache-control':'no-store'});res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
async function launch(dead=false){
 context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.NEXUS_CHROME_PATH,...(dead?{proxy:{server:'http://127.0.0.1:9'}}:{}),serviceWorkers:'allow',args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
 if(!dead)await bindRuntimeTransport(context,{offline:()=>offline});
 context.on('page',p=>p.on('pageerror',e=>pageErrors.push(e.message)));
 context.on('request',r=>{const u=new URL(r.url());requests.push({scheme:u.protocol,origin:u.origin,path:u.pathname,method:r.method()})});
 return context.newPage();
}
async function check(name,fn){const started=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-started)});console.log('PASS '+name)}
async function unlock(page,id=vaultId){
 await page.goto(origin+'/offline.html#copy='+id);await page.locator('#localPhrase').fill(phrase);await page.locator('#unlockLocal button').click();await page.locator('#psNewProject').waitFor();
}
async function saved(page){await page.waitForFunction(()=>/Сохранено на устройстве|Прогресс сохранён/.test(document.querySelector('#saveStatus')?.textContent||''));await page.waitForTimeout(350)}
let page;
try{
 page=await launch();page.setDefaultTimeout(30000);await page.goto(origin+'/offline.html#view=academy&focus=cpp');await page.locator('[data-cpp-learning-path]').waitFor();
 await check('online preparation commits public Academy resources and an encrypted own-account local copy',async()=>{
  vaultId=await page.evaluate(async({generation,phrase,source})=>{
   const {createVaultStore}=await import('/releases/'+generation+'/pwa/local-vault.js'),{makeLocalPayload}=await import('/releases/'+generation+'/pwa/offline-transfer.js');
   const account={accountId:'synthetic-offline-a',displayName:'Synthetic A',status:'active'},project={id:'synthetic-project',title:'Synthetic offline project',languageId:'cpp',access:{ownerId:account.accountId,workspaceKind:'personal'},workspace:{entryFile:'main.cpp',activeFile:'main.cpp',files:[{path:'main.cpp',content:source},{path:'calc.hpp',content:'int calc();'},{path:'calc.cpp',content:'#include "calc.hpp"\nint calc(){return 42;}'}]},progress:{},checkpoints:[]};
   const state={courses:{cpp:{lessons:{'cpp.programming-process':{completed:true}}}},skills:{}},payload=makeLocalPayload({account,state,projects:[project],isOwner:a=>a.ownerId===account.accountId}),store=createVaultStore(),session=await store.create(payload,phrase),id=session.id;
   await session.lock();return id;
  },{generation,phrase,source});
  assert.match(vaultId,/^[a-f0-9-]{36}$/);assert.equal(await page.locator('#cppPathPanel-topics .topic a').count(),course.lessonCount);
 });
 await check('wrong phrase cannot open projects; raw durable records contain no plaintext account or project content',async()=>{
  await page.goto(origin+'/offline.html#copy='+vaultId);await page.locator('#localPhrase').fill('wrong synthetic phrase 2026');await page.locator('#unlockLocal button').click();await page.getByText('Копия не открыта.',{exact:false}).waitFor();assert.equal(await page.locator('#editor').count(),0);
  const raw=await page.evaluate(async()=>{
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nexus-offline-workspaces-v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
   const rows=await new Promise(resolve=>{const r=db.transaction('vaults').objectStore('vaults').getAll();r.onsuccess=()=>resolve(r.result)});db.close();return JSON.stringify(rows);
  });assert.ok(!raw.includes('synthetic-offline-a'));assert.ok(!raw.includes('NEXUS_OFFLINE'));assert.ok(!raw.includes('Synthetic A'));
 });
 await unlock(page);
 await check('explicit compiler preparation verifies all seven actual CDN files before readiness',async()=>{
  await page.goto(origin+'/offline.html#view=compiler');await page.locator('#prepareCompiler').waitFor();await page.locator('#prepareCompiler').click();
  await page.waitForFunction(()=>document.querySelector('#runtimeStatus')?.textContent.includes('полностью проверен и готов'),{},{timeout:300000});
 });
 await check('close complete browser then cold offline PWA restart opens Academy, own projects and previous progress',async()=>{
  await context.close();offline=true;page=await launch(true);page.setDefaultTimeout(30000);await page.goto(origin+'/');await page.locator('[data-cpp-learning-path]').waitFor();
  assert.equal(await page.locator('#cppPathPanel-topics .topic a').count(),course.lessonCount);
  await unlock(page);await page.goto(origin+'/offline.html#view=academy&focus=cpp');await page.waitForFunction(()=>document.querySelector('#offlineApp')?.textContent.includes('✓'));
  await page.goto(origin+'/offline.html#project=synthetic-project');await page.locator('#editor').waitFor();assert.match(await page.locator('#editor').inputValue(),/NEXUS_OFFLINE/);
 });
 await check('offline editor saves edits, file switching, checkpoint and learning progress durably',async()=>{
  await page.locator('#editor').fill(source.replace('NEXUS_OFFLINE','NEXUS_RESTART'));await saved(page);
  await page.locator('[data-open-file="calc.cpp"]').first().click();
  await page.locator('#editor').fill('#include "calc.hpp"\nint calc(){return 43;}');await saved(page);
  page.once('dialog',d=>d.accept('Synthetic durable checkpoint'));await page.locator('#psCheckpoint').click();await page.locator('[data-ps-restore]').waitFor({state:'attached'});
  await page.goto(origin+'/offline.html#lesson=cpp.algorithm-definition-properties');await page.locator('#completeLesson').click();await saved(page);
  await context.close();page=await launch(true);await unlock(page);await page.goto(origin+'/offline.html#project=synthetic-project');await page.locator('#editor').waitFor();
  const actual=await page.evaluate(()=>document.querySelector('#editor').__nexusCodeStudio.getFiles());assert.match(actual['main.cpp'],/NEXUS_RESTART/);assert.match(actual['calc.cpp'],/return 43/);
  assert.equal(await page.locator('[data-ps-restore]').count(),1);
 });
 await check('prepared C++ compiler executes multi-file STL entirely offline after PWA restart',async()=>{
  await page.locator('#runCode').click();await page.waitForFunction(()=>document.querySelector('#output')?.textContent.includes('Код завершения: 0'),{},{timeout:180000});
  assert.match(await page.locator('#output').textContent(),/NEXUS_RESTART 10 43/);
 });
 await check('two unlocked tabs preserve conflicting saves as distinct encrypted copies without overwriting',async()=>{
  branchId=await page.evaluate(async({generation,vaultId,phrase})=>{
   const {createVaultStore}=await import('/releases/'+generation+'/pwa/local-vault.js'),store=createVaultStore(),a=await store.unlock(vaultId,phrase),b=await store.unlock(vaultId,phrase);
   const first=a.read(),second=b.read();first.state.skills.tab='first';second.state.skills.tab='second';await a.save(first);const result=await b.save(second);if(!result.branched)throw Error('NO_BRANCH');
   const old=await store.unlock(vaultId,phrase),branch=await store.unlock(result.id,phrase);if(old.read().state.skills.tab!=='first'||branch.read().state.skills.tab!=='second')throw Error('OVERWRITE');
   await Promise.all([a.lock(),b.lock(),old.lock(),branch.lock()]);return result.id;
  },{generation,vaultId,phrase});assert.notEqual(branchId,vaultId);
 });
 await check('wrong-account phrase, authenticated ciphertext tampering and native transaction faults fail closed without data loss',async()=>{
  const result=await page.evaluate(async({generation,phrase})=>{
   const {createVaultStore}=await import('/releases/'+generation+'/pwa/local-vault.js'),name='synthetic-vault-fault-fixture',store=createVaultStore({name});
   const payload={schemaVersion:1,owner:{accountId:'synthetic-b',displayName:'B'},state:{courses:{},skills:{}},projects:{},base:{state:{courses:{},skills:{}},projects:{}}};const b=await store.create(payload,phrase+' B'),id=b.id;
   let wrong=false;try{await store.unlock(id,phrase)}catch(e){wrong=e.code==='LOCAL_UNLOCK_FAILED'}
   const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='vaults')throw new DOMException('Synthetic quota fault','QuotaExceededError');return original.apply(this,args)};
   let quota=false;const changed=b.read();changed.state.skills.saved='must-not-commit';try{await b.save(changed)}catch(e){quota=e.name==='QuotaExceededError'}finally{IDBObjectStore.prototype.put=original}
   const unchanged=await store.unlock(id,phrase+' B');if(unchanged.read().state.skills.saved)throw Error('PARTIAL_COMMIT');
   await b.save(changed);const committed=await store.unlock(id,phrase+' B');if(committed.read().state.skills.saved!=='must-not-commit')throw Error('RETRY_FAILED');
   const db=await new Promise(resolve=>{const r=indexedDB.open(name);r.onsuccess=()=>resolve(r.result)});
   await new Promise((resolve,reject)=>{const tx=db.transaction('vaults','readwrite',{durability:'strict'}),os=tx.objectStore('vaults'),r=os.get(id);r.onsuccess=()=>{const row=r.result,bytes=new Uint8Array(row.ciphertext);bytes[0]^=1;row.ciphertext=bytes.buffer;os.put(row)};tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});db.close();
   let tampered=false;try{await store.unlock(id,phrase+' B')}catch(e){tampered=e.code==='LOCAL_UNLOCK_FAILED'}
   await Promise.all([b.lock(),unchanged.lock(),committed.lock()]);return {wrong,quota,tampered};
  },{generation,phrase});assert.deepEqual(result,{wrong:true,quota:true,tampered:true});
 });
 await check('prepared Academy lessons, exercises, English benchmark and interactive learning models remain available offline',async()=>{
  await page.goto(origin+'/offline.html#view=academy&focus=cpp');assert.equal(await page.locator('#cppPathPanel-topics .topic a').count(),course.lessonCount);await page.goto(origin+'/offline.html#course=cpp&tab=practicums');assert.equal(await page.locator('a[href*="practicum="]').count(),course.practicumCount);await page.goto(origin+'/offline.html#course=cpp&tab=projects');assert.equal(await page.locator('a[href*="template=cpp%3A"]').count(),course.projectCount);
  await page.goto(origin+'/offline.html#lesson=cpp.pointers-references-addresses');await page.locator('[data-gold-viz]').waitFor();const before=await page.locator('[data-gold-index]').textContent();await page.locator('[data-gold-next]').click();assert.notEqual(await page.locator('[data-gold-index]').textContent(),before);
  await page.locator('#visualSettings summary').click();await page.locator('#courseLocale').click();await page.locator('#courseLocaleMenu [data-value=en]').click();await page.waitForFunction(()=>document.querySelector('#courseLocale')?.value==='en');assert.ok((await page.locator('#offlineApp').textContent()).length>500);
  await page.goto(origin+'/offline.html#lesson=cpp.oop-principles');await page.locator('[data-gold-viz]').waitFor();await page.locator('[data-gold-next]').click();
  await page.bringToFront();await page.goto(origin+'/offline.html#view=computer-graphics');await page.locator('[data-graphics-stage][data-graphics-runtime-state="ready"]').waitFor();await page.locator('[data-graphics-template="sphere"]').click();
  // Предыдущая сцена тоже ready: ждём применения нового шаблона, а не старого флага.
  await page.waitForFunction(()=>document.querySelector('[data-graphics-setting="planets"]')?.value==='1');
  await page.locator('[data-graphics-stage][data-graphics-runtime-state="ready"]').waitFor();assert.equal(await page.locator('[data-graphics-setting="planets"]').inputValue(),'1');
  const download=page.waitForEvent('download');await page.locator('[data-graphics-download]').click();assert.equal((await download).suggestedFilename(),'nexus-my-universe.html');
 });
 await check('practicum tasks, working code and course project templates survive a cold offline restart',async()=>{
  await unlock(page,branchId);await page.goto(origin+'/offline.html#practicum=alg');await page.locator('[data-task="0"]').check();await saved(page);
  assert.equal(await page.locator('#completeLesson').count(),0);await page.locator('#editor').fill('// OFFLINE_PRACTICUM_SAVED\nint main(){return 0;}');await saved(page);
  await context.close();page=await launch(true);await unlock(page,branchId);await page.goto(origin+'/offline.html#practicum=alg');assert.equal(await page.locator('[data-task="0"]').isChecked(),true);
  await page.locator('#editor').waitFor();assert.match(await page.locator('#editor').inputValue(),/OFFLINE_PRACTICUM_SAVED/);
  await page.goto(origin+'/offline.html#exercise=finance');assert.equal(await page.locator('#completeLesson').count(),0);await page.locator('#editor').waitFor();
  const files=await page.evaluate(()=>document.querySelector('#editor').__nexusCodeStudio.getFiles());assert.ok(files['src/main.cpp']);assert.ok(files['include/project.hpp']);await page.locator('[data-ps-milestone="0"]').check();await saved(page);
 });
 await check('reconnect does not push, pull or overwrite offline changes; private/API requests cannot replay a cached body',async()=>{
  offline=false;await context.close();page=await launch();await unlock(page,branchId);await page.goto(origin+'/offline.html#project=synthetic-project');await page.locator('#editor').waitFor();
  assert.equal(await page.evaluate(()=>document.querySelector('#editor').__nexusCodeStudio.getFiles()['calc.cpp'].includes('return 43')),true);
  await page.evaluate(async()=>{const c=await caches.open('synthetic-private-canary-offline');await c.put('/api/v2/account',new Response('SYNTHETIC_MUST_NOT_REPLAY'))});
  const r=await page.evaluate(async()=>{const r=await fetch('/api/v2/account');return{status:r.status,body:await r.text()}});assert.equal(r.status,401);assert.ok(!r.body.includes('SYNTHETIC_MUST_NOT_REPLAY'));
  offline=true;const replay=await page.evaluate(()=>fetch('/api/v2/account').then(r=>r.text()).catch(()=>null));assert.equal(replay,null);
  assert.equal(requests.filter(r=>/\/api\/v2\/cloud/.test(r.path)).length,0);
 });
 await check('compiler capacity failure reports not ready without project mutation',async()=>{
  offline=false;
  const code=await page.evaluate(async generation=>{
   const {runtimeReadiness}=await import('/releases/'+generation+'/pwa/runtime-prepare.js'),original=navigator.storage.estimate.bind(navigator.storage);
   navigator.storage.estimate=async()=>({quota:10,usage:9});try{await runtimeReadiness({prepare:true});return 'UNEXPECTED'}catch(e){return e.code}finally{navigator.storage.estimate=original}
  },generation);assert.equal(code,'RUNTIME_STORAGE_SPACE');
  assert.equal(await page.evaluate(()=>document.querySelector('#editor').__nexusCodeStudio.getFiles()['calc.cpp'].includes('return 43')),true);
 });
 assert.deepEqual(pageErrors,[]);
 // Оpaque sandbox создаёт локальные blob:null worker URL; это не сетевая отправка.
 const foreign=requests.filter(r=>r.origin!==origin&&r.origin!=='https://cdn.jsdelivr.net'&&!(r.scheme==='blob:'&&r.origin==='null'&&/^null\/[0-9a-f-]{36}$/.test(r.path)));assert.deepEqual(foreign,[]);
}catch(error){failures.push({message:error.message,stack:error.stack,ui:await page?.evaluate(()=>document.querySelector('#runtimeStatus')?.textContent||null).catch(()=>null)});await page?.screenshot({path:path.join(out,'FAILURE.png'),fullPage:true}).catch(()=>{});console.error(error.stack)}
finally{
 try{await context?.close()}catch{}await new Promise(resolve=>server.close(resolve));
 const result={status:failures.length?'FAIL':'PASS',checks,failures,pageErrors,profile,generation,publicFiles:manifest.files.length,requests,physical:false,localBrowser:true,realCredentials:false,cloudLive:false,sourceAccountProof:'synthetic fixture; not server LIVE',userDataDeleted:0,cacheOrDatabaseDeleted:0};
 await writeFile(path.join(out,'RESULT.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,checks:checks.length,failures:failures.length}));if(failures.length)process.exitCode=1;
}
