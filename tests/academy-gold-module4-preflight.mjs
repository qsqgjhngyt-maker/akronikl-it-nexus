// Аудит возможностей, а не объявление неподдержанного файлового API рабочим.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';
import {M4_PROBES,M4_CASE_COUNT} from './fixtures/cpp-module4-probes.mjs';
const out=path.resolve(process.env.NEXUS_M4_EVIDENCE||'academy-gold-m4-evidence');await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration;
const fixture=await onlineRuntimeFixture(),records=[],legacyRequests=[];let fatal,home,acceptedArtifactFiles={};
fixture.context.on('request',r=>{if(r.url().includes('felixhao28.github.io/JSCPP'))legacyRequests.push(r.url())});
try{
 await fixture.page.goto(fixture.origin+'/#view=home');await fixture.page.locator('.visual-home').waitFor();await fixture.waitReady();
 const resources=await fixture.page.evaluate(()=>performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname));
 home={resources,compilerOrGold:resources.filter(p=>/llvm|clang|runno|sandbox\/providers|gold\/.*json/.test(p))};assert.equal(home.compilerOrGold.length,0);
 for(const p of M4_PROBES){
  for(const [index,c]of p.cases.entries()){
   const result=await fixture.page.evaluate(async({prefix,p,c})=>{
    const {pickProvider}=await import(prefix+'/sandbox/sandbox.js');
    const request={languageId:'cpp',source:p.source,stdin:c.stdin,entryFile:'main.cpp',files:{...(p.files||{}),'main.cpp':p.source},metadata:p.metadata||{}};
    const original=JSON.stringify(request);let provider=null,assessment=null;
    try{const route=await pickProvider(request);provider=route.provider.id;assessment=route.assessment;const r=await route.provider.run(request);return{ok:true,provider,assessment,stdout:r.stdout,stderr:r.stderr,exitCode:r.exitCode,compileMs:r.compileMs,runMs:r.runMs,outputFiles:r.files||r.outputFiles||null,resultKeys:Object.keys(r),sourceUnchanged:original===JSON.stringify(request)}}
    catch(e){return{ok:false,provider,assessment,error:{code:e.code||null,message:String(e.message).slice(0,3000),phase:e.anxPhase||null,providerLimit:!!e.anxProviderLimit,compilerOutput:String(e.anxCompilerOutput||'').slice(0,3000)},sourceUnchanged:original===JSON.stringify(request)}}
   },{prefix,p:{...p,files:{...(p.files||{}),...(p.capability==='explicit-persistence'?acceptedArtifactFiles:{})}},c});
   const isNegative=p.expectation==='compile-error';
   const diagnostic=result.error?.compilerOutput||result.error?.message||'';
   const programPass=isNegative?!result.ok&&result.error.phase==='compile'&&diagnostic.toLowerCase().includes(c.diagnostic.toLowerCase()):result.ok&&result.exitCode===0&&result.stderr===''&&result.stdout===c.stdout;
   // stdout "written" не доказывает экспорт/сохранение файла в проекте.
   const artifactPass=!p.outputFiles||Object.entries(p.outputFiles).every(([name,value])=>result.outputFiles?.[name]===value);
   const pass=result.provider==='wasm-cpp'&&result.sourceUnchanged&&programPass&&artifactPass;
   if(p.id==='file-export-write'&&pass)acceptedArtifactFiles=structuredClone(result.outputFiles); // Явное принятие артефакта вызывающей стороной, не ambient FS.
   records.push({probe:p.id,topics:p.topics,index,capability:p.capability||'standard-cpp',expectation:p.expectation||'stdout',expected:c.stdout||c.diagnostic,programPass,artifactPass,pass,...result});
   await writeFile(path.join(out,'RUNTIME_CASES.json'),JSON.stringify({programs:M4_PROBES.length,cases:M4_CASE_COUNT,records},null,2)+'\n');
  }
  const rows=records.filter(r=>r.probe===p.id);console.log(JSON.stringify({probe:p.id,cases:rows.length,status:rows.every(r=>r.pass)?'PASS':'FAIL',stdout:rows[0].stdout,error:rows[0].error?.code}));
 }
 assert.deepEqual(legacyRequests,[]);
}catch(e){fatal={message:e.message,stack:String(e.stack).slice(0,1600)};console.error(e);}
finally{
 const failures=records.filter(r=>!r.pass).map(r=>({probe:r.probe,index:r.index,capability:r.capability,programPass:r.programPass,artifactPass:r.artifactPass}));
 const result={status:fatal||failures.length||fixture.errors.length?'PARTIAL':'PASS',auditCompleted:!fatal&&records.length===M4_CASE_COUNT,programs:M4_PROBES.length,cases:records.length,passed:records.filter(r=>r.pass).length,failures,fatal,home,legacyRequests,errors:fixture.errors,sourceHashes:M4_PROBES.map(p=>({id:p.id,sha256:createHash('sha256').update(p.source).digest('hex')})),requests:fixture.requests,workerEvents:fixture.workerEvents,scope:{realRouter:true,realCompiler:true,realWorker:true,pinnedBytesSha256Verified:true,syntheticAccount:true,physicalDevice:false,productionRequests:0,cloudWrites:0,sourceRewrite:false,filesystemPersistenceNotAssumed:true}};
 await writeFile(path.join(out,'RESULT.json'),JSON.stringify(result,null,2)+'\n');await fixture.close();console.log(JSON.stringify({status:result.status,auditCompleted:result.auditCompleted,passed:result.passed,cases:result.cases,failures,fatal,errors:result.errors}));
 if(result.status!=='PASS')process.exitCode=1;
}
