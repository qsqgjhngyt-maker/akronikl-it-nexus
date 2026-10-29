import {M6_PROBES} from './fixtures/cpp-module6-probes.mjs';
// M6-0: все M6 ID и все записи текущей версии в настоящей cold Offline копии.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';import {nativeOfflineFixture} from './helpers/native-offline-fixture.mjs';import {bindRuntimeTransport} from './helpers/runtime-transport.mjs';
const c=JSON.parse(await readFile('courses/cpp/curriculum.json')),all=c.lessons.map(l=>l.id),ids=c.sections.find(s=>s.id==='cpp.section.visual-programming').lessonIds;
const f=await nativeOfflineFixture('m6-preservation'),online=await onlineRuntimeFixture(),prefix='/releases/'+f.generation,phrase='SYNTHETIC M6 fixture phrase';
const probe=M6_PROBES.find(p=>p.id==='multifile-event-application'),main=probe.source;
const files=Object.entries({'main.cpp':main,...probe.files}).map(([path,content])=>({path,content,languageId:'cpp'}));
const source=id=>'// SYNTHETIC '+id+'\n'+main,checks=[];let local,vaultId,payload,fatal;
const check=async(name,fn)=>{const detail=await fn();checks.push({name,status:'PASS',detail});console.log('PASS '+name)};
const guiIds=new Set(['cpp.qt-graphical-adapter','cpp.application-build-delivery']);
const route=async(page,id)=>{await page.evaluate(id=>{location.hash='#course=cpp&lesson='+id},id);if(guiIds.has(id))await page.locator('[data-gold-lesson="'+id+'"]').waitFor();else await page.waitForFunction(expected=>document.querySelector('#editor')?.value===expected,source(id));};
try{
 await online.page.goto(online.origin+'/#view=home');await online.page.locator('.visual-home').waitFor();await online.waitReady();
 payload=await online.page.evaluate(async({prefix,all,ids,files,main})=>{
  const {patchLesson,loadState}=await import(prefix+'/core/storage.js'),{verifiedAccount}=await import(prefix+'/core/account-storage.js'),{makeLocalPayload}=await import(prefix+'/pwa/offline-transfer.js');
  for(const id of all){const code='// SYNTHETIC '+id+'\n'+main,workspaceFiles=files.map(f=>f.path==='main.cpp'?{...f,content:code}:f);patchLesson(id,{completed:true,quiz:0,code,stdin:'17\n',note:'SYNTHETIC note',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:7,files:workspaceFiles}});}
  patchLesson('cpp.synthetic-m6-unknown',{completed:false,code:'// unknown preserved',unknown:{keep:true}});
  const projects=[{id:'synthetic-m6-project',languageId:'cpp',title:'SYNTHETIC M6 project',workspace:{entryFile:'main.cpp',activeFile:'main.cpp',files},progress:{milestones:['old']},checkpoints:[{id:'synthetic-old-checkpoint',workspace:{files}}],access:{workspaceKind:'personal'}}];
  return makeLocalPayload({account:verifiedAccount(),state:loadState(),projects,isOwner:()=>true});
 },{prefix,all,ids,files,main});
 local=await f.launch();await bindRuntimeTransport(f.context);await local.goto(f.origin+'/offline.html#view=home');await f.waitReady();
 vaultId=await local.evaluate(async({prefix,payload,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().create(payload,phrase);await s.lock();return s.id},{prefix,payload,phrase});
 await local.goto(f.origin+'/offline.html#copy='+vaultId);await local.locator('#localPhrase').fill(phrase);await local.locator('#unlockLocal button').click();await local.locator('#psNewProject').waitFor();
 await local.evaluate(()=>{location.hash='#view=compiler'});await local.locator('#prepareCompiler').click();await local.waitForFunction(()=>/полностью проверен и готов/.test(document.querySelector('#runtimeStatus')?.textContent||''),{},{timeout:300000});
 await f.closeBrowser();f.networkDown();local=await f.launch();await bindRuntimeTransport(f.context,{offline:()=>true});await local.goto(f.origin+'/offline.html#copy='+vaultId);await local.locator('#localPhrase').fill(phrase);await local.locator('#unlockLocal button').click();await local.locator('#psNewProject').waitFor();
 await check('Все M6 ID online/cold Offline: code/stdin/quiz/VFS/completed, desktop/mobile',async()=>{
  for(const id of ids)for(const page of [online.page,local]){await route(page,id);for(const width of [1366,390]){await page.setViewportSize({width,height:900});if(guiIds.has(id)){assert.equal(await page.locator('#editor').count(),0);assert.equal(await page.locator('[data-gold-qt-workspace] a').getAttribute('href'),'./#view=project-studio');}else{assert.equal(await page.locator('#editor').inputValue(),source(id));assert.equal(await page.locator('#stdin').inputValue(),'17\n');}assert.ok(await page.locator('input[name="quiz"][value="0"]').isChecked());assert.match(await page.locator('#completeLesson').textContent(),/✓/);const expected=files.map(f=>f.path==='main.cpp'?{...f,content:source(id)}:f);if(!guiIds.has(id))assert.deepEqual(await page.locator('#editor').evaluate(n=>n.__nexusCodeStudio.getSnapshot().files.map(({path,content,languageId})=>({path,content,languageId}))),expected);}}
  return{existingLessons:1,registeredM6Lessons:12,consoleLessons:10,guiLessons:2,guiRequiresOnline:true,entrypoints:2,widths:[1366,390],combinations:ids.length*4,newGoldLessons:12};
 });
 await check('Настоящий Code Studio: модель/представление, три translation units и header в cold Offline',async()=>{
  await route(local,ids[0]);await local.locator('#runCode').click();await local.waitForFunction(()=>!document.querySelector('#runCode')?.disabled&&(/Код завершения:/.test(document.querySelector('#output')?.textContent||'')||document.querySelector('#output.error-output,#output.provider-limit-output')),{},{timeout:300000});const text=await local.locator('#output').textContent();assert.ok(text.startsWith('count 3 rejected 1\n')&&text.includes('Код завершения: 0'),text);assert.equal(await local.locator('#editor').inputValue(),source(ids[0]));return{stdout:'count 3 rejected 1\n',translationUnits:3,files:4,realCompiler:true,coldOffline:true,sourceUnchanged:true};
 });
 await check('Текущий прогресс, legacy40/40 и unknown state/проект/checkpoint в encrypted IndexedDB',async()=>{
  const data=await local.evaluate(async({prefix,id,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().unlock(id,phrase),d=s.read();await s.lock();return d},{prefix,id:vaultId,phrase});assert.deepEqual(data.projects,payload.projects);
  for(const id of all)for(const k of ['completed','quiz','code','stdin','workspace','note'])assert.deepEqual(data.state.courses.cpp.lessons[id][k],payload.state.courses.cpp.lessons[id][k],id+' '+k);
  assert.deepEqual(data.state.courses.cpp.lessons['cpp.synthetic-m6-unknown'],payload.state.courses.cpp.lessons['cpp.synthetic-m6-unknown']);
  const progress=await local.evaluate(async({prefix,state,c})=>(await import(prefix+'/core/storage.js')).cppProgramProgress(state,c),{prefix,state:data.state,c});assert.deepEqual([progress.done,progress.total],[all.length,all.length]);assert.deepEqual([progress.legacy.done,progress.legacy.total],[40,40]);return{current:all.length+'/'+all.length,legacy:'40/40',projects:1,checkpoints:1,allLessonStatesExact:true};
 });
 await check('Изоляция реального аккаунта/Cloud и отсутствие browser/SW ошибок',async()=>{assert.equal(online.requests.filter(r=>r.path.startsWith('/api/')&&r.method!=='GET').length,0);assert.deepEqual(online.errors,[]);assert.deepEqual(f.errors,[]);assert.equal(await local.evaluate(async prefix=>(await import(prefix+'/core/account-storage.js')).verifiedAccount(),prefix),null);return{realCredentials:false,productionRequests:0,cloudWrites:0}});
}catch(e){fatal={message:e.message,stack:String(e.stack).slice(0,2600)};console.error(e);}
finally{await online.close();await f.finish({status:fatal?'FAIL':'PASS',stage:'M6-0-preservation',checks,fatal,physicalDevice:false,realLive:false});if(fatal)process.exitCode=1;}
