import {CPP_LEGACY_LESSON_IDS} from '../core/storage.js';
// Синтетические 40/40, 13 старых M3 ID, online и реальный холодный Offline.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';
import {nativeOfflineFixture} from './helpers/native-offline-fixture.mjs';
import {bindRuntimeTransport} from './helpers/runtime-transport.mjs';
const plan=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE3_DEPENDENCIES.json')),curriculum=JSON.parse(await readFile('courses/cpp/curriculum.json'));
const ids=plan.topics.filter(t=>t.stableId).map(t=>t.stableId),all=[...CPP_LEGACY_LESSON_IDS],f=await nativeOfflineFixture('m3-preservation'),online=await onlineRuntimeFixture(),prefix='/releases/'+f.generation;
const phrase='SYNTHETIC M3 fixture phrase',checks=[];let local,vaultId,payload,fatal;
const main='#include <iostream>\n#include "domain.hpp"\nint main(){std::cout<<twice(6)<<"\\n";}';
const files=[{path:'main.cpp',content:main,languageId:'cpp'},{path:'domain.hpp',content:'#ifndef DOMAIN_HPP\n#define DOMAIN_HPP\nint twice(int);\n#endif\n',languageId:'cpp'},{path:'domain.cpp',content:'#include "domain.hpp"\nint twice(int n){return n*2;}\n',languageId:'cpp'}];
const check=async(name,fn)=>{const detail=await fn();checks.push({name,status:'PASS',detail});console.log('PASS '+name)};
try{
 await online.page.goto(online.origin+'/#view=home');await online.page.locator('.visual-home').waitFor();await online.waitReady();
 payload=await online.page.evaluate(async({prefix,all,ids,files,main})=>{
  const {patchLesson,loadState}=await import(prefix+'/core/storage.js'),{verifiedAccount}=await import(prefix+'/core/account-storage.js'),{makeLocalPayload}=await import(prefix+'/pwa/offline-transfer.js');
  for(const id of all)patchLesson(id,{completed:true,quiz:1,code:ids.includes(id)?main:'// SYNTHETIC '+id,stdin:'17\n',note:'SYNTHETIC note',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:7,files}});
  const projects=[{id:'synthetic-m3-project',languageId:'cpp',title:'SYNTHETIC M3 project',workspace:{entryFile:'main.cpp',activeFile:'main.cpp',files},progress:{milestones:['old']},checkpoints:[{id:'cp-old',workspace:{files}}],access:{workspaceKind:'personal'}}];
  return makeLocalPayload({account:verifiedAccount(),state:loadState(),projects,isOwner:()=>true});
 },{prefix,all,ids,files,main});
 local=await f.launch();await bindRuntimeTransport(f.context);await local.goto(f.origin+'/offline.html#view=home');await f.waitReady();
 vaultId=await local.evaluate(async({prefix,payload,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().create(payload,phrase);await s.lock();return s.id},{prefix,payload,phrase});
 await local.goto(f.origin+'/offline.html#copy='+vaultId);await local.locator('#localPhrase').fill(phrase);await local.locator('#unlockLocal button').click();await local.locator('#psNewProject').waitFor();
 await local.evaluate(()=>{location.hash='#view=compiler'});await local.locator('#prepareCompiler').click();await local.waitForFunction(()=>/полностью проверен и готов/.test(document.querySelector('#runtimeStatus')?.textContent||''),{},{timeout:300000});
 await f.closeBrowser();f.networkDown();local=await f.launch();await bindRuntimeTransport(f.context,{offline:true});await local.goto(f.origin+'/offline.html#copy='+vaultId);await local.locator('#localPhrase').fill(phrase);await local.locator('#unlockLocal button').click();await local.locator('#psNewProject').waitFor();
 await check('13 старых M3 тем: личный code/stdin/quiz/VFS и completed после холодного Offline',async()=>{
  for(const id of ids){for(const page of [online.page,local]){
   await page.evaluate(id=>{location.hash='#course=cpp&lesson='+id},id);await page.locator('#editor').waitFor();
   assert.equal(await page.locator('#editor').inputValue(),main);assert.equal(await page.locator('#stdin').inputValue(),'17\n');assert.ok(await page.locator('input[name="quiz"][value="1"]').isChecked());assert.match(await page.locator('#completeLesson').textContent(),/✓/);
   assert.deepEqual(await page.locator('#editor').evaluate(n=>n.__nexusCodeStudio.getSnapshot().files.map(({path,content,languageId})=>({path,content,languageId}))),files);
  }}return{lessons:13,entrypoints:2,cases:26,filesPerLesson:3};
 });
 await check('Code Studio UI: настоящая многофайловая сборка в cold Offline',async()=>{
  await local.evaluate(id=>{location.hash='#course=cpp&lesson='+id},ids[0]);await local.locator('#editor').waitFor();await local.locator('#runCode').click();
  await local.waitForFunction(()=>!document.querySelector('#runCode')?.disabled&&(/Код завершения: 0/.test(document.querySelector('#output')?.textContent||'')||document.querySelector('#output.error-output,#output.provider-limit-output')),{},{timeout:300000});
  const text=await local.locator('#output').textContent();assert.ok(text.startsWith('12\n'),text);assert.equal(await local.locator('#editor').inputValue(),main);
  return{stdout:'12\n',realCompiler:true,networkAvailable:false,sourceUnchanged:true};
 });
 await check('Новая Gold-тема: настоящая сборка span после полного закрытия браузера без сети',async()=>{
  await local.evaluate(()=>{location.hash='#course=cpp&lesson=cpp.standard-sequences'});await local.locator('[data-gold-lesson="cpp.standard-sequences"]').waitFor();await local.locator('#runCode').click();
  await local.waitForFunction(()=>!document.querySelector('#runCode')?.disabled&&(/Код завершения: 0/.test(document.querySelector('#output')?.textContent||'')||document.querySelector('#output.error-output,#output.provider-limit-output')),{},{timeout:300000});
  const text=await local.locator('#output').textContent();assert.ok(text.startsWith('6 9 13 0\n'),text);return{lesson:'cpp.standard-sequences',stdout:'6 9 13 0\n',realCompiler:true,coldOffline:true};
 });
 await check('40/40, личный проект и checkpoint не изменились в зашифрованной копии',async()=>{
  const data=await local.evaluate(async({prefix,id,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().unlock(id,phrase),d=s.read();await s.lock();return d},{prefix,id:vaultId,phrase});
  assert.equal(Object.values(data.state.courses.cpp.lessons).filter(x=>x.completed).length,40);assert.deepEqual(data.projects,payload.projects);
  for(const id of all)for(const key of ['completed','quiz','code','stdin','workspace','note'])assert.deepEqual(data.state.courses.cpp.lessons[id][key],payload.state.courses.cpp.lessons[id][key],id+' '+key);
  return{completed:40,total:40,projectCount:1,checkpoints:1};
 });
 await check('Изоляция аккаунта, Cloud, production и отсутствие JS ошибок',async()=>{assert.equal(online.requests.filter(r=>r.path.startsWith('/api/')&&r.method!=='GET').length,0);assert.deepEqual(online.errors,[]);assert.deepEqual(f.errors,[]);assert.equal(await local.evaluate(async prefix=>(await import(prefix+'/core/account-storage.js')).verifiedAccount(),prefix),null);return{cloudWrites:0,productionRequests:0,realCredentials:false}});
}catch(e){fatal={message:e.message,stack:String(e.stack).slice(0,3000)};console.error(e);}
finally{await online.close();await f.finish({status:fatal?'FAIL':'PASS',checks,fatal,stage:'M3-0',physicalDevice:false,realLive:false});if(fatal)process.exitCode=1;}
