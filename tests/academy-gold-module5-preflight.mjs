// Проверяет capability, не включает неподдержанные возможности и не меняет source.
import {mkdir,readFile,writeFile} from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';
import {M5_PROBES,M5_CASE_COUNT} from './fixtures/cpp-module5-probes.mjs';
const out=path.resolve(process.env.NEXUS_M5_EVIDENCE||'academy-gold-m5-evidence');await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration;
const fixture=await onlineRuntimeFixture(),records=[],legacyRequests=[];let fatal,home;
fixture.context.on('request',r=>{if(r.url().includes('felixhao28.github.io/JSCPP'))legacyRequests.push(r.url())});
try{
 await fixture.page.goto(fixture.origin+'/#view=home');await fixture.page.locator('.visual-home').waitFor();await fixture.waitReady();
 const resources=await fixture.page.evaluate(()=>performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname));home={compilerOrGold:resources.filter(p=>/llvm|clang|runno|sandbox\/providers|gold\/.*json/.test(p))};
 for(const p of M5_PROBES){for(const [index,c]of p.cases.entries()){
  const result=await fixture.page.evaluate(async({prefix,p,c})=>{
   const {pickProvider}=await import(prefix+'/sandbox/sandbox.js');
   const request={languageId:'cpp',source:p.source,stdin:c.stdin,entryFile:'main.cpp',files:{...(p.files||{}),'main.cpp':p.source},metadata:p.metadata||{}},before=JSON.stringify(request);let provider=null,assessment=null;
   try{const route=await pickProvider(request);provider=route.provider.id;assessment=route.assessment;const r=await route.provider.run(request);return{ok:true,provider,assessment,stdout:r.stdout,stderr:r.stderr,exitCode:r.exitCode,cppExceptions:r.cppExceptions,compileMs:r.compileMs,runMs:r.runMs,outputFiles:r.files||r.outputFiles||null,sourceUnchanged:before===JSON.stringify(request)}}
   catch(e){return{ok:false,provider,assessment,error:{code:e.code||null,message:String(e.message).slice(0,1800),phase:e.anxPhase||null,providerLimit:!!e.anxProviderLimit,compilerOutput:String(e.anxCompilerOutput||'').slice(0,2200)},sourceUnchanged:before===JSON.stringify(request)}}
  },{prefix,p,c});
  const diagnostic=result.error?.compilerOutput||result.error?.message||'';
  const programPass=p.expectation==='compile-error'?!result.ok&&result.error?.phase==='compile'&&diagnostic.toLowerCase().includes(c.diagnostic.toLowerCase()):result.ok&&result.exitCode===0&&result.stderr===''&&result.stdout===c.stdout;
  const artifactsPass=Object.entries(p.outputFiles||{}).every(([f,value])=>result.outputFiles?.[f]===value);
  const ehPass=p.capability!=='exceptions'||result.cppExceptions===true&&result.assessment.features.some(f=>f.id==='cpp.exceptions'&&f.support==='guaranteed');
  const capabilityPass=result.provider==='wasm-cpp'&&result.sourceUnchanged&&programPass&&artifactsPass&&ehPass;
  const knownUnsupported=p.browserExpectation==='known-unsupported'&&!result.ok&&result.error?.code===p.expectedError&&result.error.providerLimit;
  records.push({probe:p.id,topics:p.topics,index,expected:c.stdout||c.diagnostic,capability:p.capability||'standard-cpp',capabilityPass,knownUnsupported,artifactPass:artifactsPass,sourceSha256:createHash('sha256').update(p.source).digest('hex'),...result});
  await writeFile(path.join(out,'RUNTIME_CASES.json'),JSON.stringify({programs:M5_PROBES.length,cases:M5_CASE_COUNT,records},null,2)+'\n');
 }const rows=records.filter(r=>r.probe===p.id);console.log(JSON.stringify({probe:p.id,cases:rows.length,status:rows.every(r=>r.capabilityPass)?'PASS':rows.every(r=>r.knownUnsupported)?'UNSUPPORTED':'FAIL',error:rows.find(r=>r.error)?.error.code}));}
}catch(e){fatal={message:e.message,stack:String(e.stack).slice(0,2000)};console.error(e);}
finally{
 const unsupported=records.filter(r=>r.knownUnsupported),unexpected=records.filter(r=>!r.capabilityPass&&!r.knownUnsupported),findings=[];
 if(unsupported.some(r=>r.assessment?.support==='guaranteed'))findings.push({id:'M5-P1-01',priority:'P1',area:'02/runtime contract',problem:'inspect объявляет guaranteed для корректного C++ EH, run возвращает WASM_CPP_EXCEPTIONS_UNSUPPORTED.',probes:[...new Set(unsupported.map(r=>r.probe))],required:'Не заявлять поддержку EH до реального toolchain/provider gate; исправление контракта и стратегия исполнения отдельно.'});
 if(unexpected.some(r=>r.probe==='raw-literal-exception-word'&&r.error?.code==='WASM_CPP_EXCEPTIONS_UNSUPPORTED'))findings.push({id:'M5-P1-02',priority:'P1',area:'02/лексический guard',problem:'Корректный raw string с текстом throw ошибочно принят за C++ исключение до компиляции.',probes:['raw-literal-exception-word'],required:'Корректный разбор комментариев/литералов без изменения learner source; negative EH controls сохранить.'});
 const auditCompleted=!fatal&&records.length===M5_CASE_COUNT;
 const harnessPass=auditCompleted&&!fixture.errors.length&&!legacyRequests.length&&!home.compilerOrGold.length&&records.every(r=>r.sourceUnchanged);
 const result={status:!harnessPass?'FAIL':unsupported.length||unexpected.length?'PARTIAL':'PASS',auditCompleted,harnessPass,programs:M5_PROBES.length,cases:records.length,capabilityPassed:records.filter(r=>r.capabilityPass).length,knownUnsupportedCases:unsupported.length,unexpectedFailures:unexpected.map(r=>({probe:r.probe,index:r.index,error:r.error})),findings,fullM5Admission:unsupported.length===0&&unexpected.length===0&&harnessPass?'PASS':'NOT_ADMITTED',fatal,home,legacyRequests,errors:fixture.errors,scope:{realRouter:true,realCompiler:true,realWorker:true,pinnedBytesSha256Verified:true,syntheticAccount:true,physicalDevice:false,productionRequests:0,cloudWrites:0,sourceRewrite:false,browserEhNotAssumed:true}};
 await writeFile(path.join(out,'RESULT.json'),JSON.stringify(result,null,2)+'\n');await fixture.close();console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1;
}
