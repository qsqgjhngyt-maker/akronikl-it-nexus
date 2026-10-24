// Настоящие runtime и UI; только изолированная синтетическая локальная копия.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {nativeOfflineFixture} from './helpers/native-offline-fixture.mjs';
import {bindRuntimeTransport} from './helpers/runtime-transport.mjs';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';
import {GOLD_ALGORITHM_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
const f=await nativeOfflineFixture('gold-runtime'),prefix='/releases/'+f.generation;
const hash=code=>createHash('sha256').update(code).digest('hex'),all=[],unique=new Map();
for(const id of GOLD_ALGORITHM_LESSONS)for(const locale of ['ru','en']){
 const g=JSON.parse(await readFile(new URL('../'+goldLessonPath(id,locale),import.meta.url)));
 const programs=[...g.workedExamples.map((p,i)=>({name:'example-'+(i+1),code:p.code,cases:[{stdin:p.stdin,stdout:p.expectedStdout},...(p.cases||[])]})),{name:'laboratory',code:g.laboratory.referenceCode,cases:g.laboratory.cases}];
 if(g.modulePracticum)programs.push({name:'module-practicum',code:g.modulePracticum.referenceCode,cases:g.modulePracticum.cases},{name:'module-practicum-starter',code:g.modulePracticum.starterCode,cases:[{stdin:'',stdout:'todo\n'}]});
 for(const p of programs)for(const [index,c]of p.cases.entries()){
  const sourceSha256=hash(p.code),key=sourceSha256+'\0'+c.stdin;
  const record={id,locale,program:p.name,index,sourceSha256,source:p.code,stdin:c.stdin,expected:c.stdout,key};all.push(record);
  if(unique.has(key))assert.equal(unique.get(key).expected,c.stdout);else unique.set(key,record);
 }
}
const phrase='SYNTHETIC Gold runtime phrase 2026';
const payload={schemaVersion:1,owner:{accountId:'synthetic-gold-runtime',displayName:'Synthetic runtime'},projects:{},state:{courses:{},skills:{}},base:{projects:{},state:{courses:{},skills:{}}}};
const executed=new Map(),ui=[],errors=[];let page,failure,offline=false,online,currentCase;
try{
 page=await f.launch();page.on('pageerror',e=>errors.push(e.message));await bindRuntimeTransport(f.context,{offline:()=>offline});
 const jscpp=process.env.NEXUS_JSCPP_FIXTURE;
 if(jscpp)await f.context.route('https://felixhao28.github.io/JSCPP/dist/JSCPP.es5.min.js',async route=>offline?route.abort():route.fulfill({status:200,contentType:'application/javascript',body:await readFile(jscpp)}));
 await page.goto(f.origin+'/offline.html#view=home');await f.waitReady();
 const id=await page.evaluate(async({prefix,payload,phrase})=>{const {createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().create(payload,phrase);const id=s.id;await s.lock();return id;},{prefix,payload,phrase});
 await page.goto(f.origin+'/offline.html#copy='+id);await page.locator('#localPhrase').fill(phrase);await page.locator('#unlockLocal button').click();await page.locator('#psNewProject').waitFor();
 await page.evaluate(()=>{location.hash='#view=compiler'});await page.locator('#prepareCompiler').click();
 await page.waitForFunction(()=>/полностью проверен и готов/.test(document.querySelector('#runtimeStatus')?.textContent||''),{},{timeout:300000});
 console.log('PASS: реальный закреплённый Clang/WASI подготовлен через native PWA');
 online=await onlineRuntimeFixture();
 await online.page.goto(online.origin+'/#view=home');await online.page.locator('.visual-home').waitFor();
 await online.waitReady();
 assert.ok(online.requests.some(r=>r.path==='/api/v2/account'),'online origin must resolve only to the synthetic local server');
 const examples=all.filter(r=>r.program==='example-1'&&r.index===0&&r.locale==='ru'&&['cpp.algorithm-representations','cpp.sequence-branching-loops'].includes(r.id));
 for(const [i,row]of examples.entries()){
  const localPage=page;page=online.page;
  await page.setViewportSize(i?{width:390,height:844}:{width:1366,height:900});
  await page.evaluate(id=>{location.hash='#course=cpp&lesson='+id},row.id);await page.locator('[data-gold-lesson="'+row.id+'"]').waitFor();
  assert.equal(await page.locator('#editor').inputValue(),row.source);await page.locator('#stdin').fill('8\n');await page.locator('#runCode').click();
  await page.waitForFunction(()=>/Код завершения: 0/.test(document.querySelector('#output')?.textContent||'')||document.querySelector('#output.error-output,#output.provider-limit-output'),{},{timeout:300000});
  const text=await page.locator('#output').textContent();assert.match(text,/^even\n/);assert.equal(await page.locator('#editor').inputValue(),row.source);
  const actualRuntime=await page.evaluate(async({prefix,source})=>{const {pickProvider}=await import(prefix+'/sandbox/sandbox.js'),{wasmRuntimeProvider}=await import(prefix+'/sandbox/providers/wasm-runtime.js');const route=await pickProvider({languageId:'cpp',source});return{provider:route.provider.id,state:wasmRuntimeProvider.getState()};},{prefix,source:row.source});
  assert.equal(actualRuntime.provider,'wasm-cpp');assert.equal(actualRuntime.state.compilerReady,true);
  await page.locator('#output').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(f.out,i?'mobile-run.png':'desktop-run.png')});
  ui.push({lesson:row.id,width:i?390:1366,stdin:'8\n',stdout:'even\n',provider:'wasm-cpp',sourceUnchanged:true});console.log('PASS: настоящий Run в '+row.id+' '+(i?'mobile':'desktop'));
  page=localPage;
 }
 const localPage=page;page=online.page;await page.setViewportSize({width:1366,height:900});
 // Контроль быстрого пути: настоящий JSCPP с явным return продолжает работать.
 const fast=await page.evaluate(async prefix=>{const {pickProvider}=await import(prefix+'/sandbox/sandbox.js'),request={languageId:'cpp',source:'#include <iostream>\nint main(){int n;std::cin>>n;std::cout<<n;return 0;}',stdin:'8\n'},route=await pickProvider(request);return{...await route.provider.run(request),provider:route.provider.id};},prefix);
 assert.equal(fast.provider,'browser-jscpp');assert.equal(fast.stdout,'8');assert.equal(fast.exitCode,0);
 for(const [key,row]of unique){
  currentCase={id:row.id,program:row.program,index:row.index,stdin:row.stdin};
  const result=await page.evaluate(async({prefix,source,stdin})=>{
   const {pickProvider}=await import(prefix+'/sandbox/sandbox.js');const request={languageId:'cpp',source,stdin};const route=await pickProvider(request);const r=await route.provider.run(request);
   return{provider:route.provider.id,stdout:r.stdout,stderr:r.stderr,exitCode:r.exitCode,compileMs:r.compileMs,runMs:r.runMs,sourceUnchanged:request.source===source};
  },{prefix,source:row.source,stdin:row.stdin});
  assert.equal(result.stdout,row.expected,row.id+' '+row.program+' '+JSON.stringify(row.stdin));assert.equal(result.exitCode,0);assert.equal(result.stderr,'');assert.equal(result.sourceUnchanged,true);executed.set(key,result);
  if(executed.size%10===0)console.log(JSON.stringify({realRuns:executed.size,total:unique.size,programs:new Set([...unique.values()].slice(0,executed.size).map(r=>r.sourceSha256)).size}));
 }
 assert.deepEqual(online.errors,[]);page=localPage;
 // После полной остановки браузера — настоящий холодный offline запуск исправленного примера.
 await f.closeBrowser();f.networkDown();offline=true;page=await f.launch();await page.goto(f.origin+'/offline.html#copy='+id);await page.locator('#localPhrase').fill(phrase);await page.locator('#unlockLocal button').click();await page.locator('#psNewProject').waitFor();
 await page.evaluate(()=>{location.hash='#course=cpp&lesson=cpp.algorithm-representations'});await page.locator('#editor').waitFor();await page.locator('#stdin').fill('8\n');await page.locator('#runCode').click();
 await page.waitForFunction(()=>/Код завершения: 0/.test(document.querySelector('#output')?.textContent||'')||document.querySelector('#output.error-output,#output.provider-limit-output'),{},{timeout:300000});assert.match(await page.locator('#output').textContent(),/^even\n/);
 assert.deepEqual(errors,[]);console.log('PASS: исправленный пример выполняется после полного закрытия браузера без сети');
}catch(e){failure={message:e.message,currentCase,stack:String(e.stack).slice(0,1800)};console.error(e);}
finally{
 const records=all.map(({source,key,...row})=>({...row,actual:executed.get(key)||null}));
 if(online)await writeFile(path.join(f.out,'ONLINE_CONTEXT.json'),JSON.stringify({errors:online.errors,requests:online.requests},null,2)+'\n');
 await online?.close();
 await writeFile(path.join(f.out,'RUNTIME_CASES.json'),JSON.stringify({records,programs:new Set(all.map(r=>r.sourceSha256)).size,caseRecords:all.length,uniqueCases:unique.size,realRuns:executed.size},null,2)+'\n');
 await f.finish({status:failure?'FAIL':'PASS',failure,ui,errors,caseRecords:all.length,uniqueCases:unique.size,realRuns:executed.size,programs:new Set(all.map(r=>r.sourceSha256)).size,method:'Actual application pickProvider/run, production JSCPP and pinned Clang/WASI; identical source+stdin aliases execute once and retain all RU/EN records; no mocked Worker/compiler/stdout',coldOffline:!failure});if(failure)process.exitCode=1;
}
