// M2-0: неизменённый C++20 через настоящий router и закреплённый Clang/WASI.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';
import {M2_PROBES,matchesOutput} from './fixtures/cpp-module2-probes.mjs';
const out=path.resolve(process.env.NEXUS_M2_EVIDENCE||'academy-gold-m2-evidence');
await mkdir(out,{recursive:true});
const jscpp=await readFile(process.env.NEXUS_JSCPP_FIXTURE);
assert.equal(jscpp.length,619555);assert.equal(createHash('sha256').update(jscpp).digest('hex'),'e73047b962bd8fa92faf493873b38990b63df876e67dc0a7dfc7c0fc046e7fdd','Actual JSCPP fixture must match accepted bytes');
const manifest=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration;
const fixture=await onlineRuntimeFixture(),records=[],ui=[],legacyRequests=[],sourceHashes=M2_PROBES.map(p=>({id:p.id,lesson:p.lesson,sourceSha256:createHash('sha256').update(p.source).digest('hex')}));
fixture.context.on('request',r=>{if(r.url().includes('felixhao28.github.io/JSCPP'))legacyRequests.push(r.url())});
let fatal,home;
try{
 await fixture.page.goto(fixture.origin+'/#view=home');await fixture.page.locator('.visual-home').waitFor();await fixture.waitReady();
 // Resource Timing документа отделён от фонового precache native SW.
 // Прогрев public cache не означает выполнение runtime на Home.
 const documentResources=await fixture.page.evaluate(()=>performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname));
 home={requests:fixture.requests.slice(),documentResources,compilerRequests:documentResources.filter(p=>/llvm|clang|runno|sandbox\/providers|gold\/.*json/.test(p))};
 assert.equal(home.compilerRequests.length,0,'Home must not load the compiler or Gold bodies');
 for(const p of M2_PROBES){
  for(const [index,c] of p.cases.entries()){
   const result=await fixture.page.evaluate(async({prefix,source,stdin})=>{
    const {pickProvider}=await import(prefix+'/sandbox/sandbox.js');
    const {wasmRuntimeProvider}=await import(prefix+'/sandbox/providers/wasm-runtime.js');
    const request={languageId:'cpp',source,stdin};
    async function execute(provider){
     try{const r=await provider.run(request);return{ok:true,provider:provider.id,stdout:r.stdout,stderr:r.stderr,exitCode:r.exitCode,compileMs:r.compileMs,runMs:r.runMs};}
     catch(e){return{ok:false,provider:provider.id,error:{code:e.code||null,message:String(e.message).slice(0,3000),phase:e.anxPhase||null,providerLimit:!!e.anxProviderLimit,compilerOutput:String(e.anxCompilerOutput||'').slice(0,3000)}};}
    }
    const route=await pickProvider(request),routed=await execute(route.provider);
    // Независимый настоящий компилятор для каждого результата интерпретатора.
    const native=route.provider.id==='wasm-cpp'?routed:await execute(wasmRuntimeProvider);
    return{route:{provider:route.provider.id,support:route.assessment.support,reason:route.reason,candidates:route.candidates.map(x=>({id:x.provider.id,support:x.assessment.support,ready:x.ready,score:x.score}))},routed,native,sourceUnchanged:request.source===source};
   },{prefix,source:p.source,stdin:c.stdin});
   const check=r=>p.expectation==='compile-error'?!r.ok && r.error.phase==='compile':r.ok && r.exitCode===0 && r.stderr==='' && matchesOutput(p,r.stdout,c);
   // Отрицательный контроль требует именно реальную compile phase,
   // сетевой сбой или parser teaching subset не закрывают этот сценарий.
   const routePass=result.route.provider==='wasm-cpp' && check(result.routed);
   const row={probe:p.id,lesson:p.lesson,index,stdin:c.stdin,expected:c.stdout,expectation:p.expectation||'exact',...result,routePass,nativePass:check(result.native)};
   records.push(row);
   await writeFile(path.join(out,'RUNTIME_CASES.json'),JSON.stringify({sourceHashes,records},null,2)+'\n');
  }
  const rows=records.filter(r=>r.probe===p.id);console.log(JSON.stringify({probe:p.id,cases:rows.length,provider:rows[0].route.provider,route:rows.every(r=>r.routePass)?'PASS':'FAIL',native:rows.every(r=>r.nativePass)?'PASS':'FAIL'}));
 }
 // Настоящие Fill/Run и диагностический UI, desktop и mobile viewport.
 // После compile error тот же editor должен снова выполнить правильный код.
 await fixture.page.evaluate(()=>{location.hash='#course=cpp&lesson=cpp.first-cpp-program'});
 await fixture.page.locator('#editor').waitFor();
 const uiCases=[['division-remainder',1366],['static-cast',390],['invalid-const-write',1366],['mixed-signed-unsigned',1366],['invalid-keyword-name',390],['sizeof-unevaluated',390]];
 for(const [id,width]of uiCases){
  const p=M2_PROBES.find(p=>p.id===id),c=p.cases[0];
  await fixture.page.setViewportSize({width,height:900});
  await fixture.page.locator('#editor').fill(p.source);await fixture.page.locator('#stdin').fill(c.stdin);
  await fixture.page.locator('#runCode').click();
  await fixture.page.waitForFunction(()=>!document.querySelector('#runCode')?.disabled && (/Код завершения: 0/.test(document.querySelector('#output')?.textContent||'')||document.querySelector('#output.error-output,#output.provider-limit-output')),{},{timeout:300000});
  const text=await fixture.page.locator('#output').textContent();
  if(p.expectation==='compile-error')assert.match(text,/Ошибка компиляции C\+\+/);else assert.ok(text.startsWith(c.stdout),id+' actual UI stdout: '+text);
  assert.equal(await fixture.page.locator('#editor').inputValue(),p.source);
  ui.push({probe:id,width,expected:c.stdout,compileError:p.expectation==='compile-error',sourceUnchanged:true,status:'PASS'});
  if(id==='division-remainder'||id==='invalid-keyword-name'){await fixture.page.locator('#output').scrollIntoViewIfNeeded();await fixture.page.screenshot({path:path.join(out,id+'.png')});}
 }
 assert.deepEqual(legacyRequests,[],'JSCPP must never load for normal C++');
}catch(e){fatal={message:e.message,stack:String(e.stack).slice(0,1600)};console.error(e);}
finally{
 const nativeFailures=records.filter(r=>!r.nativePass),routeFailures=records.filter(r=>!r.routePass);
 const result={status:fatal||nativeFailures.length||routeFailures.length||fixture.errors.length?'FAIL':'PASS',auditCompleted:!fatal&&records.length===M2_PROBES.reduce((s,p)=>s+p.cases.length,0),fatal,programs:M2_PROBES.length,cases:records.length,nativeFailures:nativeFailures.map(r=>({probe:r.probe,index:r.index})),routeFailures:routeFailures.map(r=>({probe:r.probe,index:r.index})),ui,legacyRequests,errors:fixture.errors,sourceUnchanged:records.every(r=>r.sourceUnchanged),home,requests:fixture.requests,workerEvents:fixture.workerEvents,scope:{realCompiler:true,realRouter:true,realWorker:true,transport:'local SHA256-verified pinned bytes; not CDN LIVE',syntheticAccount:true,realCredentials:false,physicalDevice:false,productionRequests:0,cloudMutations:0}};
 await writeFile(path.join(out,'RESULT.json'),JSON.stringify(result,null,2)+'\n');
 await fixture.close();console.log(JSON.stringify({status:result.status,auditCompleted:result.auditCompleted,programs:result.programs,cases:result.cases,nativeFailures:result.nativeFailures,routeFailures:result.routeFailures,errors:result.errors}));
 if(result.status!=='PASS')process.exitCode=1;
}
