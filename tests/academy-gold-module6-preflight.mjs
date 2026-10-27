// M6-0: измерение настоящего router/Worker/Clang, не реализация оконного GUI.
import assert from'node:assert/strict';import{mkdir,readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';import path from'node:path';
import{onlineRuntimeFixture}from'./helpers/online-runtime-fixture.mjs';import{M6_PROBES,M6_CASE_COUNT}from'./fixtures/cpp-module6-probes.mjs';
const out=path.resolve(process.env.NEXUS_M6_EVIDENCE||'academy-gold-m6-evidence');await mkdir(out,{recursive:true});
const m=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'))),prefix='/releases/'+m.assetGeneration;
const f=await onlineRuntimeFixture(),records=[],legacyRequests=[];let fatal,home;
f.context.on('request',r=>{if(r.url().includes('felixhao28.github.io/JSCPP'))legacyRequests.push(r.url())});
try{
 await f.page.goto(f.origin+'/#view=home');await f.page.locator('.visual-home').waitFor();await f.waitReady();
 home=await f.page.evaluate(()=>performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname).filter(p=>/llvm|clang|runno|sandbox\/providers|gold\/.*json/.test(p)));
 for(const p of M6_PROBES){for(const[index,c]of p.cases.entries()){
  const result=await f.page.evaluate(async({prefix,p,c})=>{
   const{pickProvider}=await import(prefix+'/sandbox/sandbox.js'),request={languageId:'cpp',source:p.source,stdin:c.stdin,entryFile:'main.cpp',files:{...(p.files||{}),'main.cpp':p.source},metadata:p.metadata||{}},before=JSON.stringify(request);let provider=null,assessment=null,capabilities=null;
   try{const route=await pickProvider(request);provider=route.provider.id;assessment=route.assessment;capabilities={gui:route.provider.capabilities.gui,threads:route.provider.capabilities.threads};const r=await route.provider.run(request);return{ok:true,provider,assessment,capabilities,stdout:r.stdout,stderr:r.stderr,exitCode:r.exitCode,cppExceptions:r.cppExceptions,outputFiles:r.files||r.outputFiles||null,sourceUnchanged:before===JSON.stringify(request)}}
   catch(e){return{ok:false,provider,assessment,capabilities,error:{code:e.code||null,message:String(e.message).slice(0,1400),phase:e.anxPhase||null,providerLimit:!!e.anxProviderLimit,compilerOutput:String(e.anxCompilerOutput||'').slice(0,2200)},sourceUnchanged:before===JSON.stringify(request)}}
  },{prefix,p,c});
  const diagnostic=result.error?.compilerOutput||result.error?.message||'',expectedBoundary=!!p.boundary;
  const correct=p.browserExpectation==='capability-limit'?!result.ok&&result.error?.providerLimit===true:p.browserExpectation==='compile-error'?!result.ok&&result.error?.phase==='compile'&&diagnostic.toLowerCase().includes(c.diagnostic.toLowerCase()):result.ok&&result.exitCode===0&&result.stderr===''&&result.stdout===c.stdout;
  const artifacts=Object.entries(p.outputFiles||{}).every(([file,value])=>result.outputFiles?.[file]===value);
  const passed=result.provider==='wasm-cpp'&&result.sourceUnchanged&&correct&&artifacts&&(!p.capability||p.capability!=='exceptions'||result.cppExceptions===true);
  records.push({probe:p.id,topics:p.topics,index,boundary:p.boundary||null,status:passed?'PASS':'FAIL',expected:p.browserExpectation==='capability-limit'?'typed provider limitation':expectedBoundary?c.diagnostic:c.stdout,expectedBoundary,sourceSha256:createHash('sha256').update(p.source).digest('hex'),...result});
  await writeFile(path.join(out,'RUNTIME_CASES.json'),JSON.stringify({programs:M6_PROBES.length,cases:M6_CASE_COUNT,records},null,2)+'\n');
 }const rows=records.filter(r=>r.probe===p.id);console.log(JSON.stringify({probe:p.id,cases:rows.length,status:rows.every(r=>r.status==='PASS')?'PASS':'FAIL',boundary:p.boundary||null,error:rows.find(r=>r.error)?.error.code}));}
}catch(e){fatal={message:e.message,stack:String(e.stack).slice(0,2000)};console.error(e)}
finally{
 const core=records.filter(r=>!r.boundary),boundaries=records.filter(r=>r.boundary),unexpected=records.filter(r=>r.status!=='PASS'),findings=[];
 for(const r of core.filter(r=>r.status!=='PASS'))findings.push({id:'M6-P1-RUNTIME-'+r.probe,priority:'P1',area:'02/runtime',problem:'Кандидат обязательной темы не исполняется опубликованной средой.',probe:r.probe,error:r.error,sourceSha256:r.sourceSha256});
 const misleading=boundaries.filter(r=>r.boundary==='threads'&&r.assessment?.support==='guaranteed'&&r.capabilities?.threads===false&&r.error?.providerLimit===false);
 if(misleading.length)findings.push({id:'M6-P1-01',priority:'P1',area:'02/runtime contract →03/07',problem:'Для std::thread route объявляет guaranteed при threads=false; выполнение возвращает сырой WebAssembly.Exception вместо типизированного ограничения среды.',probes:misleading.map(r=>r.probe),required:'Согласовать inspect/run/diagnostics для неподдержанных OS threads без переписывания learner source; сохранить реальный C++ и исключения.'});
 const complete=!fatal&&records.length===M6_CASE_COUNT,harnessPass=complete&&!f.errors.length&&!legacyRequests.length&&!home?.length&&records.every(r=>r.sourceUnchanged);
 const result={status:!harnessPass?'FAIL':unexpected.length||findings.length?'PARTIAL':'PASS',auditCompleted:complete,harnessPass,programs:M6_PROBES.length,cases:M6_CASE_COUNT,coreCases:core.length,corePassed:core.filter(r=>r.status==='PASS').length,boundaryCases:boundaries.length,boundaryRejections:boundaries.filter(r=>r.status==='PASS').length,coreAdmission:core.every(r=>r.status==='PASS')&&harnessPass?'PASS':'NOT_ADMITTED',guiAdmission:'NOT_ADMITTED_NO_QT_OR_CPP_CLI_TOOLCHAIN',concurrencyAdmission:'COOPERATIVE_MODEL_ONLY_NO_OS_THREADS',findings,unexpectedFailures:unexpected.map(r=>({probe:r.probe,index:r.index,error:r.error})),fatal,homeCompilerOrGold:home,legacyRequests,errors:f.errors,scope:{realRouter:true,realCompiler:true,realWorker:true,pinnedBytesSha256Verified:true,syntheticAccount:true,productionRequests:0,cloudWrites:0,sourceRewrite:false,physicalDevice:false,qtRuntimeImplemented:false}};
 await writeFile(path.join(out,'RESULT.json'),JSON.stringify(result,null,2)+'\n');await f.close();console.log(JSON.stringify(result));
 // Audit completion и admission разделены явно. --audit не делает PARTIAL равным PASS.
 if(!harnessPass||(!process.argv.includes('--audit')&&result.status!=='PASS'))process.exitCode=1;
}
