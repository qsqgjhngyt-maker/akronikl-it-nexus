// Нативный Chrome, настоящие entry points и Clang/WASI. Все аккаунты и Cloud DTO синтетические.
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {nativeOfflineFixture} from './helpers/native-offline-fixture.mjs';
import {bindRuntimeTransport} from './helpers/runtime-transport.mjs';
import {GATEWAY_ORIGIN} from '../server-access/bff/account-read.mjs';
const f=await nativeOfflineFixture('standalone'),frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR),prefix='/releases/'+f.generation;
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const checks=[],errors=[],cloudRequests=[],phrase='SYNTHETIC standalone phrase 2026';let browser,online,local,id,projectId,payload,learningBefore;
const source='#include <iostream>\n#include <vector>\n#include "calc.hpp"\nint main(){std::vector<int> v{2,3,5};int n=0;for(int x:v)n+=x;std::cout<<"STUDIO_OFFLINE "<<n<<" "<<calc()<<"\\n";}';
const check=async(name,fn)=>{const t=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-t)});console.log('PASS '+name)};
const mime=p=>p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':'text/html';
const route=async(p,hash)=>{await p.goto((p===online?GATEWAY_ORIGIN+'/':f.origin+'/offline.html')+hash)};
const modules=async(p,fn,arg)=>p.evaluate(fn,{prefix,...arg});
const addFile=async(p,name,body)=>{p.once('dialog',d=>d.accept(name));await p.locator('#codeAddFile').click();await p.locator('#editor').fill(body)};
const files=p=>p.locator('#editor').evaluate(n=>n.__nexusCodeStudio.getFiles());
const unlock=async()=>{await route(local,'#copy='+id);await local.locator('#localPhrase').fill(phrase);await local.locator('#unlockLocal button').click();await local.locator('#psNewProject').waitFor()};
const saved=async()=>{await local.waitForFunction(()=>/Сохранено на устройстве|Прогресс сохранён/.test(document.querySelector('#saveStatus')?.textContent||''));await local.waitForTimeout(300)};
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH});const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1366,height:900},acceptDownloads:true});
 online=await context.newPage();online.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async request=>{const req=request.request(),u=new URL(req.url());if(u.origin!==GATEWAY_ORIGIN)return request.abort();
  if(u.pathname.startsWith('/api/')){
   let body,status=200;
   if(u.pathname==='/api/v2/account')body={account:{accountId:'synthetic-studio-owner',displayName:'Synthetic Studio',status:'active'},loginMethods:[{id:'synthetic-key',kind:'passkey',status:'active',createdAt:'2026-10-23T00:00:00Z',disabledAt:null}],enrollmentAvailable:false};
   else if(u.pathname.startsWith('/api/v2/cloud/')){cloudRequests.push({path:u.pathname,method:req.method()});if(u.pathname==='/api/v2/cloud/projects')body={projects:[{id:'synthetic-cloud-only',title:'Synthetic Cloud C++',revision:2}]};else if(req.method()==='GET')body={project:{id:'synthetic-cloud-only',title:'Synthetic Cloud C++',languageId:'cpp',access:{ownerId:'synthetic-studio-owner',workspaceKind:'personal'},manifest:{entryFile:'main.cpp',sourceRoots:['.']},workspace:{entryFile:'main.cpp',activeFile:'main.cpp',files:[{path:'main.cpp',content:'// CLOUD_FIXTURE\nint main(){return 0;}'}]}},meta:{revision:2,updatedAt:'2026-10-23T00:00:00Z'}};else{status=409;body={error:{code:'REVISION_CONFLICT'},meta:{revision:3}}}}
   else {status=403;body={error:{code:'SYNTHETIC_DENIED'}}}
   return request.fulfill({status,headers:{'content-type':'application/json','cache-control':'no-store',vary:'*'},body:JSON.stringify(body)});
  }
  try{const file=u.pathname==='/'?'nexus-shell.html':u.pathname.slice(1),target=path.resolve(frontend,file);assert.ok(target.startsWith(frontend+path.sep));return request.fulfill({status:200,contentType:mime(file),body:await readFile(target)})}catch{return request.fulfill({status:404,body:'SYNTHETIC_NOT_FOUND'})}
 });
 await route(online,'#view=home');await online.locator('[data-code-studio-entry]').waitFor();
 learningBefore=await modules(online,async({prefix})=>(await import(prefix+'/core/storage.js')).loadState());
 await check('Home and Tools open one standalone start with four actions, keyboard focus and mobile layout',async()=>{
  await online.locator('[data-code-studio-entry]').click();await online.locator('[data-code-studio-home]').waitFor();assert.equal(await online.locator('[data-cs-action]').count(),4);assert.equal(await online.locator('.side-nav a[href="#view=code-studio"]').count(),1);
  await online.locator('[data-cs-action=new]').focus();await online.keyboard.press('Enter');assert.equal(await online.locator('[data-cs-new] input[name=title]').evaluate(n=>n===document.activeElement),true);
  await online.screenshot({path:path.join(f.out,'studio-desktop.png'),fullPage:true});
  for(const width of [390,360]){await online.setViewportSize({width,height:844});await online.screenshot({path:path.join(f.out,'studio-mobile-'+width+'.png'),fullPage:true});assert.equal(await online.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true)}
  await online.setViewportSize({width:1366,height:900});assert.deepEqual(cloudRequests,[]);
 });
 await check('create empty C++, multi-file editing, checkpoint and explicit export use the existing project store',async()=>{
  await online.locator('[data-cs-new] input[name=title]').fill('Synthetic standalone');await online.locator('[data-cs-new] input[value=empty]').check();await online.locator('[data-cs-new] button[type=submit]').click();await online.locator('#editor').waitFor();assert.equal(await online.locator('#editor').inputValue(),'');
  projectId=new URLSearchParams(new URL(online.url()).hash.slice(1)).get('project');assert.ok(projectId);
  await online.locator('#editor').fill(source);await addFile(online,'include/calc.hpp','int calc();');await addFile(online,'src/calc.cpp','#include "calc.hpp"\nint calc(){return 42;}');
  await online.locator('#stdin').fill('synthetic input');await online.locator('#psSaveProject').click();
  online.once('dialog',d=>d.accept('Synthetic checkpoint'));await online.locator('#psCheckpoint').click();await online.locator('[data-ps-restore]').waitFor();
  const all=await files(online);assert.match(all['src/main.cpp'],/STUDIO_OFFLINE/);assert.match(all['src/calc.cpp'],/return 42/);assert.equal(all['include/calc.hpp'],'int calc();');
  const promise=online.waitForEvent('download');await online.locator('#psExportProject').click();const download=await promise;await download.saveAs(path.join(f.out,'synthetic-project-export.json'));const exported=JSON.parse(await readFile(path.join(f.out,'synthetic-project-export.json')));assert.equal(exported.id,undefined);assert.equal(exported.access,undefined);assert.equal(exported.workspace.files.length,3);
  await route(online,'#view=code-studio');await online.locator('[data-cs-action=import]').click();await online.locator('[data-cs-import]').setInputFiles(path.join(f.out,'synthetic-project-export.json'));await online.locator('#editor').waitFor();const importedId=new URLSearchParams(new URL(online.url()).hash.slice(1)).get('project');assert.notEqual(importedId,projectId);assert.deepEqual(await files(online),all);
  assert.deepEqual(await modules(online,async({prefix})=>(await import(prefix+'/core/storage.js')).loadState()),learningBefore);assert.deepEqual(cloudRequests,[]);
 });
 await check('storage quota keeps unsaved editor; cancelled navigation and export allow recovery without overwriting stored sources',async()=>{
  await route(online,'#view=code-studio&project='+projectId);await online.locator('#editor').waitFor();await online.locator('[data-open-file="src/main.cpp"]').first().click();
  await online.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,...args){if(key.includes('projects:v1'))throw new DOMException('Synthetic quota','QuotaExceededError');return originalSetItem.call(this,key,...args)}});
  await online.locator('#editor').fill(source+'\n// UNSAVED_QUOTA');await online.locator('#psSaveProject').click();assert.match(await online.locator('#psSaveStatus').textContent(),/Не удалось сохранить/);
  online.once('dialog',d=>d.dismiss());await online.evaluate(()=>{location.hash='#view=home'});await online.waitForTimeout(800);assert.match(online.url(),new RegExp('project='+projectId));assert.match(await online.locator('#editor').inputValue(),/UNSAVED_QUOTA/);
  const promise=online.waitForEvent('download');await online.locator('#psExportProject').click();await (await promise).saveAs(path.join(f.out,'synthetic-quota-recovery.json'));assert.match(await readFile(path.join(f.out,'synthetic-quota-recovery.json'),'utf8'),/UNSAVED_QUOTA/);
  await online.evaluate(()=>{Storage.prototype.setItem=originalSetItem});await online.locator('#psSaveProject').click();await online.reload();await online.locator('#editor').waitFor();await online.locator('[data-open-file="src/main.cpp"]').first().click();assert.match(await online.locator('#editor').inputValue(),/UNSAVED_QUOTA/);
 });
 await check('Cloud list and download require explicit actions; cancelled replacement makes no request and 409 keeps local code',async()=>{
  await route(online,'#view=code-studio');await online.locator('[data-cs-action=cloud]').click();await online.locator('[data-cs-cloud-list] button').waitFor();assert.equal(cloudRequests.length,1);await online.locator('[data-cs-cloud-list] button').click();await online.locator('#editor').waitFor();assert.match(await online.locator('#editor').inputValue(),/CLOUD_FIXTURE/);
  const before=cloudRequests.length;await route(online,'#view=code-studio');await online.locator('[data-cs-action=cloud]').click();await online.locator('[data-cs-cloud-list] button').waitFor();online.once('dialog',d=>d.dismiss());await online.locator('[data-cs-cloud-list] button').click();await online.waitForTimeout(300);assert.equal(cloudRequests.length,before+1);
  await route(online,'#view=code-studio&project=synthetic-cloud-only');await online.locator('#editor').waitFor();await online.locator('#editor').fill('// LOCAL_CONFLICT\nint main(){return 0;}');await online.locator('#psCloudPush').locator('xpath=ancestor::details').locator('summary').first().click();online.once('dialog',d=>d.dismiss());await online.locator('#psCloudPush').click();await online.waitForTimeout(500);assert.match(await online.locator('#editor').inputValue(),/LOCAL_CONFLICT/);assert.equal(cloudRequests.filter(r=>r.method==='PUT').length,1);
 });
 await check('encrypted offline preparation preserves build manifest and free projects without learning writes',async()=>{
  payload=await modules(online,async({prefix})=>{const {listProjects}=await import(prefix+'/project-studio/project-store.js?v=0.1.7-alpha.2.4.6-ui1a.10.1'),{loadState}=await import(prefix+'/core/storage.js'),{verifiedAccount}=await import(prefix+'/core/account-storage.js'),{makeLocalPayload}=await import(prefix+'/pwa/offline-transfer.js');return makeLocalPayload({account:verifiedAccount(),state:loadState(),projects:listProjects(),isOwner:()=>true})});
  assert.ok(payload.projects[projectId]);assert.deepEqual(payload.projects[projectId].manifest.includeRoots,['include']);
  local=await f.launch();await local.goto(f.origin+'/offline.html#view=code-studio');await f.waitReady();assert.equal(await local.locator('[data-cs-action=new]').isDisabled(),true);assert.equal(await local.locator('[data-cs-open]').count(),0);
  id=await modules(local,async({prefix,payload,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js');const s=await createVaultStore().create(payload,phrase);await s.lock();return s.id},{payload,phrase});await unlock();
  await bindRuntimeTransport(f.context);await route(local,'#view=compiler');await local.locator('#prepareCompiler').click();await local.waitForFunction(()=>document.querySelector('#runtimeStatus')?.textContent.includes('полностью проверен и готов'),{},{timeout:300000});
 });
 await check('full browser close and dead network restart retain the same standalone editor and run real multi-file C++',async()=>{
  await f.closeBrowser();f.networkDown();local=await f.launch();await unlock();await route(local,'#view=code-studio');await local.locator('[data-cs-open="'+projectId+'"]').first().click();await local.locator('#editor').waitFor();await local.locator('[data-open-file="src/main.cpp"]').first().click();assert.match(await local.locator('#editor').inputValue(),/UNSAVED_QUOTA/);
  await local.locator('#runCode').click();await local.waitForFunction(()=>document.querySelector('#output')?.textContent.includes('Код завершения: 0'),{},{timeout:240000});assert.match(await local.locator('#output').textContent(),/STUDIO_OFFLINE 10 42/);await local.screenshot({path:path.join(f.out,'offline-cpp-run.png'),fullPage:true});
 });
 await check('offline new project, file edits and checkpoint survive another complete browser restart',async()=>{
  await route(local,'#view=code-studio');await local.locator('[data-cs-action=new]').click();await local.locator('[data-cs-new] input[name=title]').fill('Synthetic cold standalone');await local.locator('[data-cs-new] button[type=submit]').click();await local.locator('#editor').waitFor();const created=new URLSearchParams(new URL(local.url()).hash.slice(1)).get('project');
  await local.locator('#editor').fill('int main(){return 0;}\n// COLD_STANDALONE_SAVED');await addFile(local,'include/own.hpp','#pragma once\n// COLD_HEADER');await saved();local.once('dialog',d=>d.accept('Cold standalone checkpoint'));await local.locator('#psCheckpoint').click();await local.locator('[data-ps-restore]').waitFor();await saved();
  await f.closeBrowser();local=await f.launch();await unlock();await route(local,'#view=code-studio&project='+created);await local.locator('#editor').waitFor();const current=await files(local);assert.match(current['src/main.cpp'],/COLD_STANDALONE_SAVED/);assert.match(current['include/own.hpp'],/COLD_HEADER/);assert.equal(await local.locator('[data-ps-restore]').count(),1);
  await local.locator('#psExportProject').click();assert.equal(await local.locator('#completeLesson').count(),0);
 });
 await check('empty and invalid C++ report compiler failure; restoring checkpoint recovers source and execution',async()=>{
  const hash=new URL(local.url()).hash;await local.locator('[data-open-file="src/main.cpp"]').first().click();
  for(const text of ['', 'int main(){ missing_symbol; }']){await local.locator('#editor').fill(text);await local.locator('#psSaveProject').click();await local.locator('#runCode').click();await local.waitForFunction(()=>/Код завершения:|проект пуст|error:|ошиб/i.test(document.querySelector('#output')?.textContent||''),{},{timeout:180000});assert.match(await local.locator('#output').textContent(),/error|undefined|ошиб|пуст/i)}
  local.once('dialog',d=>d.accept());await local.locator('[data-ps-restore]').first().click();await local.locator('#editor').waitFor();assert.match((await files(local))['src/main.cpp'],/COLD_STANDALONE_SAVED/);
  await local.evaluate(()=>{window.staleEditor=document.querySelector('#editor')});await local.locator('#lockLocal').click();await local.locator('#localPhrase').waitFor();await local.evaluate(()=>{staleEditor.value='// MUST_NOT_WRITE_AFTER_LOCK';staleEditor.dispatchEvent(new Event('input',{bubbles:true}))});await unlock();await route(local,hash);await local.locator('#editor').waitFor();assert.match((await files(local))['src/main.cpp'],/COLD_STANDALONE_SAVED/);
 });
 await check('English and day Glass theme retain actions and mobile editor without horizontal page overflow',async()=>{
  await route(online,'#view=code-studio');await modules(online,async({prefix})=>{const {savePrefs,loadPrefs}=await import(prefix+'/core/storage.js');const {changeNexusAppearance}=await import(prefix+'/effects/nexus-appearance.js');changeNexusAppearance({theme:'day',motion:false});savePrefs({...loadPrefs(),uiLocale:'en'})});await online.reload();await online.locator('[data-code-studio-home]').waitFor();assert.match(await online.locator('h1').textContent(),/first line/);assert.equal(await online.locator('html').getAttribute('data-nexus-theme'),'day');
  await online.screenshot({path:path.join(f.out,'studio-en-day.png'),fullPage:true});await route(online,'#view=code-studio&project='+projectId);await online.locator('#editor').waitFor();await online.setViewportSize({width:390,height:844});assert.equal(await online.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await online.screenshot({path:path.join(f.out,'editor-en-day-mobile.png'),fullPage:true});
 });
 await check('old editor and stdin cannot write after Account storage is locked',async()=>{
  const result=await modules(online,async({prefix})=>{const before=JSON.stringify(Object.entries(localStorage)),{lockAccountStorage}=await import(prefix+'/core/account-storage.js');lockAccountStorage();const editor=document.querySelector('#editor');editor.value='// MUST_NOT_WRITE_AFTER_LOGOUT';editor.dispatchEvent(new Event('input',{bubbles:true}));const stdin=document.querySelector('#stdin');stdin.value='MUST_NOT_WRITE';stdin.dispatchEvent(new Event('input',{bubbles:true}));return before===JSON.stringify(Object.entries(localStorage))});assert.equal(result,true);
 });
 await check('offline has no Account proof, no Cloud writes and no private API cache replay',async()=>{
  assert.equal(await modules(local,async({prefix})=>(await import(prefix+'/core/account-storage.js')).verifiedAccount()),null);
  await route(local,'#view=code-studio');await local.locator('[data-cs-action=cloud]').click();assert.match(await local.locator('[data-cs-status]').textContent(),/интернет|подключ|сети/i);
  const cached=await local.evaluate(async()=>{const rows=[];for(const name of await caches.keys()){const c=await caches.open(name);for(const r of await c.keys())if(/\/(api|account)\//.test(new URL(r.url).pathname))rows.push(r.url)}return rows});assert.deepEqual(cached,[]);assert.equal(f.requests.filter(r=>r.path.startsWith('/api/')&&r.method!=='GET').length,0);assert.deepEqual(errors,[]);assert.deepEqual(f.errors,[]);
 });
}catch(error){process.exitCode=1;checks.push({status:'FAIL',name:error.message,stack:error.stack});console.error(error.stack);await (local||online)?.screenshot({path:path.join(f.out,'FAILURE.png'),fullPage:true}).catch(()=>{})}
finally{await browser?.close();await f.finish({status:process.exitCode?'FAIL':'PASS',checks,onlinePageErrors:errors,cloudFixtureRequests:cloudRequests,realCompiler:true,realCloud:false})}
