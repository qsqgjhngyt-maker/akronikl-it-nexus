// M4-0: три прежних урока и сохранность всех 45 ID в изолированной cold Offline копии.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';
import {nativeOfflineFixture} from './helpers/native-offline-fixture.mjs';
import {bindRuntimeTransport} from './helpers/runtime-transport.mjs';
const curriculum=JSON.parse(await readFile('courses/cpp/curriculum.json')),ids=curriculum.sections.find(s=>s.id==='cpp.section.classic-algorithms').lessonIds,all=curriculum.lessons.map(l=>l.id);
const f=await nativeOfflineFixture('m4-preservation'),online=await onlineRuntimeFixture(),prefix='/releases/'+f.generation,phrase='SYNTHETIC M4 fixture phrase',checks=[];
let local,vaultId,payload,fatal;
const main='#include <iostream>\n#include "domain.hpp"\nint main(){std::cout<<twice(6)<<"\\n";}';
const files=[{path:'main.cpp',content:main,languageId:'cpp'},{path:'domain.hpp',content:'#ifndef DOMAIN_HPP\n#define DOMAIN_HPP\nint twice(int);\n#endif\n',languageId:'cpp'},{path:'domain.cpp',content:'#include "domain.hpp"\nint twice(int n){return n*2;}\n',languageId:'cpp'}];
const personal=id=>'// SYNTHETIC '+id+'\n'+main;
const check=async(name,fn)=>{checks.push({name,status:'PASS',detail:await fn()});console.log('PASS '+name)};
try{
 await online.page.goto(online.origin+'/#view=home');await online.page.locator('.visual-home').waitFor();await online.waitReady();
 payload=await online.page.evaluate(async({prefix,all,files,main})=>{
  const {patchLesson,loadState}=await import(prefix+'/core/storage.js'),{verifiedAccount}=await import(prefix+'/core/account-storage.js'),{makeLocalPayload}=await import(prefix+'/pwa/offline-transfer.js');
  for(const id of all){const code='// SYNTHETIC '+id+'\n'+main;patchLesson(id,{completed:true,quiz:1,code,stdin:'17\n',note:'SYNTHETIC note',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:7,files:files.map(f=>f.path==='main.cpp'?{...f,content:code}:f)}});}
  const projects=[{id:'synthetic-m4-project',languageId:'cpp',title:'SYNTHETIC M4 project',workspace:{entryFile:'main.cpp',activeFile:'main.cpp',files},progress:{milestones:['synthetic-existing']},checkpoints:[{id:'synthetic-checkpoint',workspace:{files}}],access:{workspaceKind:'personal'}}];
  return makeLocalPayload({account:verifiedAccount(),state:loadState(),projects,isOwner:()=>true});
 },{prefix,all,files,main});
 local=await f.launch();await bindRuntimeTransport(f.context);await local.goto(f.origin+'/offline.html#view=home');await f.waitReady();
 vaultId=await local.evaluate(async({prefix,payload,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().create(payload,phrase);await s.lock();return s.id},{prefix,payload,phrase});
 await local.goto(f.origin+'/offline.html#copy='+vaultId);await local.locator('#localPhrase').fill(phrase);await local.locator('#unlockLocal button').click();await local.locator('#psNewProject').waitFor();
 await local.evaluate(()=>{location.hash='#view=compiler'});await local.locator('#prepareCompiler').click();await local.waitForFunction(()=>/полностью проверен и готов/.test(document.querySelector('#runtimeStatus')?.textContent||''),{},{timeout:300000});
 await f.closeBrowser();f.networkDown();local=await f.launch();await bindRuntimeTransport(f.context,{offline:true});await local.goto(f.origin+'/offline.html#copy='+vaultId);await local.locator('#localPhrase').fill(phrase);await local.locator('#unlockLocal button').click();await local.locator('#psNewProject').waitFor();
 await check('Три старых M4 ID online и после полного закрытия браузера без сети',async()=>{
  for(const id of ids)for(const page of [online.page,local]){
   await page.evaluate(id=>{location.hash='#course=cpp&lesson='+id},id);await page.waitForFunction(expected=>document.querySelector('#editor')?.value===expected,personal(id));
   assert.equal(await page.locator('#stdin').inputValue(),'17\n');assert.ok(await page.locator('input[name="quiz"][value="1"]').isChecked());assert.match(await page.locator('#completeLesson').textContent(),/✓/);
   const expected=files.map(file=>file.path==='main.cpp'?{...file,content:personal(id)}:file);assert.deepEqual(await page.locator('#editor').evaluate(n=>n.__nexusCodeStudio.getSnapshot().files.map(({path,content,languageId})=>({path,content,languageId}))),expected);
  }return{lessons:3,entrypoints:2,cases:6,filesPerLesson:3};
 });
 await check('Code Studio M4: настоящий Clang/WASM и три файла в cold Offline',async()=>{
  const id=ids[0];await local.evaluate(id=>{location.hash='#course=cpp&lesson='+id},id);await local.waitForFunction(expected=>document.querySelector('#editor')?.value===expected,personal(id));await local.locator('#runCode').click();
  await local.waitForFunction(()=>!document.querySelector('#runCode')?.disabled&&(/Код завершения: 0/.test(document.querySelector('#output')?.textContent||'')||document.querySelector('#output.error-output,#output.provider-limit-output')),{},{timeout:300000});
  const text=await local.locator('#output').textContent();assert.ok(text.startsWith('12\n'),text);assert.equal(await local.locator('#editor').inputValue(),personal(id));return{stdout:'12\n',realCompiler:true,coldOffline:true,sourceUnchanged:true};
 });
 await check('45/45, исторические 40/40, проект и checkpoint сохранены',async()=>{
  const data=await local.evaluate(async({prefix,id,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().unlock(id,phrase),data=s.read();await s.lock();return data},{prefix,id:vaultId,phrase});
  assert.deepEqual(data.projects,payload.projects);for(const id of all)for(const key of ['completed','quiz','code','stdin','workspace','note'])assert.deepEqual(data.state.courses.cpp.lessons[id][key],payload.state.courses.cpp.lessons[id][key]);
  const progress=await local.evaluate(async({prefix,state,curriculum})=>(await import(prefix+'/core/storage.js')).cppProgramProgress(state,curriculum),{prefix,state:data.state,curriculum});assert.deepEqual([progress.done,progress.total,progress.legacy.done],[45,45,40]);return{ids:45,completed:45,legacy:40,projects:1,checkpoints:1};
 });
 await check('Изоляция реального аккаунта и Cloud; нет JS ошибок',async()=>{
  assert.equal(online.requests.filter(r=>r.path.startsWith('/api/')&&r.method!=='GET').length,0);assert.deepEqual(online.errors,[]);assert.deepEqual(f.errors,[]);assert.equal(await local.evaluate(async prefix=>(await import(prefix+'/core/account-storage.js')).verifiedAccount(),prefix),null);return{realCredentials:false,productionRequests:0,cloudWrites:0};
 });
}catch(e){fatal={message:e.message,stack:String(e.stack).slice(0,3000)};console.error(e);}
finally{await online.close();await f.finish({status:fatal?'FAIL':'PASS',checks,fatal,stage:'M4-0',physicalDevice:false,realLive:false});if(fatal)process.exitCode=1;}
