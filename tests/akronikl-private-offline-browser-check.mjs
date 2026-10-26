// Gate B2: реальные offline-entry, local-vault, autosave, CodeStudio и Akronikl.
// Только синтетические копии A/B в новом persistent-профиле на loopback.
// Локальная фраза НЕ является серверной сессией; Account/backend не вызываются.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const frontend=process.env.NEXUS_FRONTEND_DIR, out=process.env.NEXUS_AKRONIKL_EVIDENCE;
if (!frontend || !out || !process.env.NEXUS_PLAYWRIGHT_MODULE) throw Error('GATE_B_ENV_REQUIRED');
await mkdir(out,{recursive:true});
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const build=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json')));
const prefix='/'+build.prefix;
const allowed=new Set(build.files.map(r=>'/'+r.file));
const profile=await mkdtemp(path.join(tmpdir(),'ak02-private-gate-'));
let available=true, context=null, page=null, browserVersion=null, phase='prepare', fatal=null, restarted=false, verifiedWorker=false;
const checks=[],network=[],errors=[];
const mime=file=>({'.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.md':'text/markdown'}[path.extname(file)]||'text/html');
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1'); const row={phase,path:u.pathname,method:req.method,served:false};network.push(row);
  if (!available) {req.socket.destroy(); return;}
  if (req.method!=='GET') {res.writeHead(405);res.end();return;}
  if (u.pathname==='/__ak02__/prepare.html') {
    row.served=true;res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});
    res.end('<!doctype html><meta charset="utf-8"><title>Akronikl Gate B — публичная подготовка</title>');return;
  }
  if (u.pathname==='/favicon.ico') {res.writeHead(204);res.end();return;}
  if (!allowed.has(u.pathname)) {res.writeHead(404);res.end();return;}
  try {
    const file=u.pathname.slice(1),bytes=await readFile(path.join(frontend,file));
    row.served=true;
    res.writeHead(200,{'content-type':mime(file),'cache-control':file==='service-worker.js'?'no-store':'public, max-age=0',...(file==='service-worker.js'?{'service-worker-allowed':'/'}:{})});res.end(bytes);
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
async function launch(directory=profile,offline=false) {
  const ctx=await chromium.launchPersistentContext(directory,{headless:true,serviceWorkers:'allow',offline,viewport:{width:1366,height:900},
    ...(process.env.NEXUS_CHROME_PATH?{executablePath:process.env.NEXUS_CHROME_PATH}:{}),args:['--disable-background-networking']});
  browserVersion=ctx.browser()?.version()||browserVersion;
  // Страница не обращается к внешним ресурсам. SW получает только точные public
  // records локальной staging-сборки. Request fulfillment/подмена модулей не используются.
  await ctx.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  return ctx;
}
async function newPage() {
  page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(20000);
  page.on('pageerror',e=>errors.push({phase,message:e.message}));return page;
}
const copies={},phrases={a:'SYNTHETIC LOCAL COPY A - NOT A REAL CREDENTIAL',b:'SYNTHETIC LOCAL COPY B - NOT A REAL CREDENTIAL'};
const projectId='synthetic-ak02-shared-project';
const source=owner=>`// SYNTHETIC_PRIVATE_${owner}_BEFORE\nSELECTED_${owner}\n// SYNTHETIC_PRIVATE_${owner}_AFTER`;
const panel=()=>page.locator('[data-akronikl-panel]');
async function ready(){await page.waitForFunction(()=>document.querySelector('#offlineApp')?.dataset.akroniklRoute===location.hash);}
async function navigate(hash){await page.evaluate(h=>location.hash=h,hash);await ready();}
async function open(){await page.locator('#offlineApp [data-akronikl-open],#offlineApp #askAkronikl').first().click();await panel().waitFor();}
async function unlock(owner){
 await navigate('#copy='+copies[owner]);await page.locator('#localPhrase').fill(phrases[owner]);await page.locator('#unlockLocal button').click();
 await page.locator('#psNewProject').waitFor();await ready();
 await navigate('#view=code-studio&project='+projectId);await page.locator('#editor').waitFor();
}
async function saved(){await page.waitForFunction(()=>/^Сохранено на устройстве/.test(document.querySelector('#saveStatus')?.textContent||''));}
async function preview(owner){
 await page.locator('#editor').evaluate((editor,owner)=>{const token='SELECTED_'+owner,start=editor.value.indexOf(token);if(start<0)throw Error('TEST_SELECTION_MISSING');editor.setSelectionRange(start,start+token.length)},owner);
 await open();await panel().locator('input[type=checkbox]').check();await panel().getByRole('button',{name:'Показать контекст',exact:true}).click();
 await panel().locator('pre').waitFor();assert.equal(await panel().locator('pre').textContent(),'SELECTED_'+owner);
 assert.equal((await panel().textContent()).includes('SYNTHETIC_PRIVATE'),false);
}
async function search(){await panel().locator('input[type=search]').fill('указатели');await panel().locator('button[type=submit]').click();await panel().locator('article').first().waitFor();}
async function vaultFingerprint(){
 return page.evaluate(async()=>{
  const db=await new Promise((ok,no)=>{const r=indexedDB.open('nexus-offline-workspaces-v1');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
  try{
   const rows=await new Promise((ok,no)=>{const r=db.transaction('vaults').objectStore('vaults').getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
   const fingerprints=[];
   for(const row of rows){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',row.ciphertext));fingerprints.push({id:row.id,revision:row.revision,digest:[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('')})}
   return fingerprints.sort((a,b)=>a.id.localeCompare(b.id));
  }finally{db.close()}
 });
}
async function validateSaved(owner,expected){
 return page.evaluate(async({prefix,id,phrase,projectId,expected})=>{
  const {createVaultStore}=await import(prefix+'pwa/local-vault.js'),store=createVaultStore();let session;
  try{session=await store.unlock(id,phrase);const payload=session.read();return {code:payload.projects[projectId].workspace.files.find(f=>f.path==='main.cpp').content===expected,progress:payload.state.courses.cpp.lessons['cpp.programming-process'].completed===true,projects:Object.keys(payload.projects).length}}
  finally{await session?.lock();await store.close()}
 },{prefix,id:copies[owner],phrase:phrases[owner],projectId,expected});
}
async function check(name,fn){const start=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-start)});console.log('PASS '+name);}
try{
 context=await launch();await newPage();await page.goto(origin+'/__ak02__/prepare.html');
 await check('Настоящий SW и две зашифрованные синтетические копии подготовлены',async()=>{
  const status=await page.evaluate(async prefix=>{const {ensureVerifiedRuntime}=await import(prefix+'pwa/client.js');return ensureVerifiedRuntime()},prefix);
  assert.equal(status.publicReady,true);verifiedWorker=true;
  Object.assign(copies,await page.evaluate(async({prefix,phrases,projectId,sourceA,sourceB})=>{
   const {createVaultStore}=await import(prefix+'pwa/local-vault.js'),{makeLocalPayload}=await import(prefix+'pwa/offline-transfer.js');
   const store=createVaultStore(),ids={};
   try{for(const owner of ['a','b']){
    const account={accountId:'synthetic-ak02-'+owner,displayName:'Синтетическая копия '+owner.toUpperCase(),status:'active'};
    const project={id:projectId,title:'Тестовый проект '+owner.toUpperCase(),languageId:'cpp',access:{ownerId:account.accountId,workspaceKind:'personal'},
     manifest:{schemaVersion:1,entryFile:'main.cpp',sourceRoots:['.'],includeRoots:[],testRoots:[],build:{standard:'c++20'}},
     workspace:{languageId:'cpp',revision:0,entryFile:'main.cpp',activeFile:'main.cpp',files:[{path:'main.cpp',content:owner==='a'?sourceA:sourceB,languageId:'cpp'},{path:'helper.cpp',content:'SELECTED_HELPER_'+owner.toUpperCase(),languageId:'cpp'}]},progress:{},checkpoints:[]};
    const state={courses:{cpp:{lessons:{'cpp.programming-process':{completed:true}}}},skills:{}};
    const session=await store.create(makeLocalPayload({account,state,projects:[project],isOwner:a=>a.ownerId===account.accountId}),phrases[owner]);ids[owner]=session.id;await session.lock();
   }return ids}finally{await store.close()}
  },{prefix,phrases,projectId,sourceA:source('A'),sourceB:source('B')}));
  await page.evaluate(()=>localStorage.setItem('akronikl:it-nexus:prefs:v1',JSON.stringify({uiLocale:'ru',mentorLocale:'ru',courseLocale:'ru',effectsQuality:'off'})));
 });
 await context.close();context=null;available=false;phase='cold-private';context=await launch(profile,true);restarted=true;await newPage();
 await check('Холодный запуск без сети не открывает личную копию автоматически',async()=>{
  const r=await page.goto(origin+'/#view=code-studio&project='+projectId);assert.equal(r.fromServiceWorker(),true);await ready();
  assert.equal(await page.locator('#editor').count(),0);assert.equal(await page.evaluate(()=>navigator.onLine),false);
  assert.equal((await page.locator('#offlineApp').textContent()).includes('SELECTED_'),false);
 });
 await check('Неверная фраза отклонена без изменения копий',async()=>{
  const before=await vaultFingerprint();await navigate('#copy='+copies.a);await page.locator('#localPhrase').fill(phrases.b);
  await page.locator('#unlockLocal button').click();await page.locator('#unlockStatus').filter({hasText:'Копия не открыта'}).waitFor();
  assert.equal(await page.locator('#editor').count(),0);assert.deepEqual(await vaultFingerprint(),before);
 });
 await check('Открыта копия A, cloud-вход не подтверждён; код по умолчанию исключён',async()=>{
  await unlock('a');assert.equal(await page.locator('#editor').inputValue(),source('A'));
  assert.match(await page.locator('#saveStatus').textContent(),/Облачный вход не подтверждён/);
  await open();await panel().getByRole('button',{name:'Показать контекст',exact:true}).click();await panel().getByText('Фрагмент кода не включён.',{exact:true}).waitFor();
  assert.equal(await panel().locator('pre').count(),0);await page.keyboard.press('Escape');
 });
 await check('Выделение и поиск не меняют ciphertext, ревизию или учебный прогресс',async()=>{
  const before=await vaultFingerprint();await preview('A');await search();await page.keyboard.press('Escape');
  assert.deepEqual(await vaultFingerprint(),before);assert.deepEqual(await validateSaved('a',source('A')),{code:true,progress:true,projects:1});
 });
 await check('Приватная панель не переполняется на 390/1366 CSS px',async()=>{
  await preview('A');for(const width of [390,1366]){await page.setViewportSize({width,height:900});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   assert.ok(await panel().evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.screenshot({path:path.join(out,'private-context-'+width+'.png')})}
  await page.keyboard.press('Escape');
 });
 await check('Снятие выбора немедленно удаляет код из результата',async()=>{
  await preview('A');await panel().locator('input[type=checkbox]').uncheck();assert.equal(await panel().locator('pre').count(),0);await page.keyboard.press('Escape');
 });
 await check('Переключение файла закрывает старый контекст',async()=>{
  await preview('A');await page.locator('#editor').evaluate(e=>e.__nexusCodeStudio.workspace.setActiveFile('helper.cpp'));
  await panel().waitFor({state:'detached'});await saved();assert.equal(await page.locator('#editor').inputValue(),'SELECTED_HELPER_A');
  await page.locator('[data-open-file="main.cpp"]').first().click();await saved();
 });
 await check('Изменение workspace очищает показанный код и действительно сохраняется',async()=>{
  await preview('A');await page.locator('#editor').evaluate(e=>e.__nexusCodeStudio.workspace.updateFile('main.cpp',e.value+'\n// SYNTHETIC_AUTOSAVE_A'));
  await panel().waitFor({state:'detached'});await saved();assert.equal((await validateSaved('a',source('A')+'\n// SYNTHETIC_AUTOSAVE_A')).code,true);
 });
 await check('Закрытие копии во время задержанного шифрования скрывает код до завершения save',async()=>{
  // Управляемая задержка только в новом тестовом профиле, штатные AES/IDB остаются.
  await page.evaluate(()=>{
   let release;const waiting=new Promise(r=>release=r),original=crypto.subtle.encrypt;
   const control={entered:false,release,restore:()=>{crypto.subtle.encrypt=original}};
   crypto.subtle.encrypt=async function(...args){control.entered=true;await waiting;return original.apply(this,args)};
   window.__ak02SaveDelay=control;
  });
  await page.locator('#editor').fill(source('A')+'\n// SYNTHETIC_LAST_SAVE_A');
  await page.waitForFunction(()=>window.__ak02SaveDelay?.entered===true);await preview('A');
  // Прямой вызов настоящего обработчика: проверяется очистка даже при открытом modal.
  const cleared=await page.evaluate(()=>{document.querySelector('#lockLocal').click();return !document.querySelector('[data-akronikl-panel]')&&!document.querySelector('#offlineApp').dataset.akroniklRoute});
  assert.equal(cleared,true);await page.locator('#offlineApp [data-akronikl-open]').first().click();assert.equal(await panel().count(),0);
  await page.evaluate(()=>{window.__ak02SaveDelay.restore();window.__ak02SaveDelay.release();delete window.__ak02SaveDelay});
  await page.locator('#localPhrase').waitFor();await ready();assert.equal(await page.locator('#editor').count(),0);
  assert.deepEqual(await validateSaved('a',source('A')+'\n// SYNTHETIC_LAST_SAVE_A'),{code:true,progress:true,projects:1});
 });
 await context.close();context=null;phase='second-cold-private';context=await launch(profile,true);await newPage();
 await check('После второго перезапуска последняя запись A и прогресс сохранены',async()=>{
  await page.goto(origin+'/#view=unlock');await ready();await unlock('a');assert.equal(await page.locator('#editor').inputValue(),source('A')+'\n// SYNTHETIC_LAST_SAVE_A');
  assert.deepEqual(await validateSaved('a',source('A')+'\n// SYNTHETIC_LAST_SAVE_A'),{code:true,progress:true,projects:1});
  await page.locator('#lockLocal').click();await page.locator('#localPhrase').waitFor();await ready();
 });
 await check('Копия B с тем же projectId не наследует выделение или файлы A',async()=>{
  await unlock('b');assert.equal(await page.locator('#editor').inputValue(),source('B'));await preview('B');
  assert.equal((await panel().textContent()).includes('SELECTED_A'),false);await page.keyboard.press('Escape');
  assert.deepEqual(await validateSaved('a',source('A')+'\n// SYNTHETIC_LAST_SAVE_A'),{code:true,progress:true,projects:1});
 });
 await check('В durable vault нет открытого текста кода, имени или синтетических фраз',async()=>{
  const safe=await page.evaluate(async()=>{
   const db=await new Promise((ok,no)=>{const r=indexedDB.open('nexus-offline-workspaces-v1');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
   try{const rows=await new Promise((ok,no)=>{const r=db.transaction('vaults').objectStore('vaults').getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
    const raw=JSON.stringify(rows,(_k,v)=>v instanceof ArrayBuffer?[...new Uint8Array(v)]:v);
    const binary=rows.map(r=>new TextDecoder().decode(r.ciphertext)).join('');
    return rows.length===2&&!/SELECTED_|SYNTHETIC_PRIVATE|NOT A REAL CREDENTIAL|Синтетическая копия/.test(raw+binary);
   }finally{db.close()}
  });assert.equal(safe,true);
 });
 phase='reconnect';available=true;await context.setOffline(false);
 await check('Возвращение сети не изменяет приватные копии и не вызывает Cloud/Account',async()=>{
  const before=await vaultFingerprint();await open();await search();await page.keyboard.press('Escape');
  assert.deepEqual(await vaultFingerprint(),before);assert.deepEqual(errors,[]);
  assert.equal(network.filter(r=>r.method!=='GET').length,0);assert.equal(network.filter(r=>/^\/(api|account)\//.test(r.path)).length,0);
  assert.equal(network.filter(r=>r.phase.includes('cold-private')&&r.served).length,0);
 });
}catch(error){fatal={phase,message:error.message,stack:error.stack};console.error(error);process.exitCode=1;await page?.screenshot({path:path.join(out,'FAILURE.png')}).catch(()=>{})}
finally{
 // Снимаем только собственную задержку, чтобы браузер корректно завершил запись.
 await page?.evaluate(()=>{window.__ak02SaveDelay?.restore();window.__ak02SaveDelay?.release()}).catch(()=>{});
 await context?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 await writeFile(path.join(out,'PRIVATE_OFFLINE.json'),JSON.stringify({status:fatal?'FAIL':'PASS',checks,fatal,errors,network,sourceCommit:process.env.NEXUS_SOURCE_COMMIT||null,generation:build.assetGeneration,browser:browserVersion,node:process.version,scope:'built-private-offline-shell',realServiceWorker:verifiedWorker,browserProcessRestarted:restarted,nativeESM:true,syntheticLocalCopies:true,fullAuthenticatedNexusE2E:false,serverAccountProof:false,physicalDevices:false,productionLive:false,realCredentials:false,productionMutations:0},null,2)+'\n');
}
