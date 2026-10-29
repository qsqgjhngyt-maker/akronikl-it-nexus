// Реальные компиляции в браузере; private reference берётся только из локального QA input.
// Файл с решениями не копируется в build/evidence/репозиторий.
import{readFile,writeFile,mkdir}from'node:fs/promises';import path from'node:path';import assert from'node:assert/strict';import{QT_BROWSER_PROFILE as profile}from'../sandbox/qt/profile.js';import{module6ApplicationFixture}from'./academy-gold-module6-fixture.mjs';
const out=path.resolve(process.env.NEXUS_QT_EVIDENCE_DIR),reference=path.resolve(process.env.NEXUS_FINAL_PRIVATE_REFERENCE),pack=path.resolve(process.env.NEXUS_QT_BROWSER_PACK),records=[];await mkdir(out,{recursive:true});
const f=await module6ApplicationFixture(),p=f.page,base=profile.previewUrl.replace('index.html','');let fatal;
await f.context.route(base+'**',async route=>{const name=route.request().url().slice(base.length);if(!/^(index\.html|preview\.js|a11y\.js|profile\.js|verified-pack\.js|qtloader\.js|program\.js|program\.wasm\.bin|headers\.bin)$/.test(name))return route.abort();await route.fulfill({status:200,body:await readFile(path.join(pack,name)),headers:{'content-type':name.endsWith('.js')?'text/javascript':name.endsWith('.html')?'text/html':'application/octet-stream','access-control-allow-origin':'*','cross-origin-resource-policy':'cross-origin','cache-control':'no-store'}})});
try{
 await p.goto(f.origin+'/#view=home');await p.locator('.visual-home').waitFor();await f.waitReady();const m=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'))),prefix='/'+m.prefix.replace(/\/$/,'');
 if(!process.argv.includes('--cancel-only'))for(const variant of['A','B','C'])for(const part of(process.argv.includes('--gui-only')?['P4']:['P1','P2','P3','P4']))for(const mode of['reference','starter']){
  const kit=JSON.parse(await readFile(`courses/cpp/final/kits/${variant.toLowerCase()}-${part.toLowerCase()}.json`)),files=structuredClone(kit.template.files);
  if(mode==='reference')for(const file of files.filter(f=>/\.(cpp|hpp)$/.test(f.path)))file.content=await readFile(path.join(reference,variant+'-'+part,file.path),'utf8');
  const input={title:'SYNTHETIC '+variant+'-'+part+' '+mode,workspace:{entryFile:kit.template.entryFile,languageId:'cpp',files},manifest:{sourceRoots:kit.template.sourceRoots,includeRoots:kit.template.includeRoots,testRoots:kit.template.testRoots}};
  const result=await p.evaluate(async({prefix,input,variant,part})=>{
   const{createPracticalControlRunner}=await import(prefix+'/course-final/practical-runner.js'),host=document.createElement('section');host.setAttribute('aria-label','Synthetic control checks');document.body.append(host);const before=JSON.stringify(input),runner=createPracticalControlRunner({previewHost:host});try{const r=await runner.run(input,{variant,part});return{...r,inputUnchanged:JSON.stringify(input)===before}}finally{runner.cancel();host.remove()}
  },{prefix,input,variant,part});
  const all=Object.values(result.checks).every(Boolean);assert.equal(result.checks.build,true,result.output);assert.equal(all,mode==='reference',variant+'-'+part+' '+mode+' '+JSON.stringify(result.checks)+' '+result.output);assert.equal(result.inputUnchanged,true);
  const row={id:kit.id,mode,status:'PASS',checks:result.checks,sourceHash:result.sourceHash,inputUnchanged:true,actualBrowserCompiler:true};records.push(row);console.log(JSON.stringify(row));await writeFile(path.join(out,'FINAL_PRACTICAL_CONTROLS.json'),JSON.stringify({status:'IN_PROGRESS',records},null,2)+'\n');
 }
 // Actual execution-stage cancellation: callback changes account context while
 // student's function is spinning, not merely while a fixture is downloading.
 const kit=JSON.parse(await readFile('courses/cpp/final/kits/a-p1.json')),input={title:'SYNTHETIC cancel check',workspace:{entryFile:kit.template.entryFile,languageId:'cpp',files:structuredClone(kit.template.files)},manifest:{sourceRoots:kit.template.sourceRoots,includeRoots:kit.template.includeRoots,testRoots:kit.template.testRoots}};
 input.workspace.files.find(f=>f.path==='src/model.cpp').content='#include "model.hpp"\nbool load(const std::string&,std::vector<Record>&){volatile unsigned n=0;for(;;)n=n+1;return false;}\n';
 const cancelled=await p.evaluate(async({prefix,input})=>{
  const{createPracticalControlRunner}=await import(prefix+'/course-final/practical-runner.js'),{wasmRuntimeProvider}=await import(prefix+'/sandbox/providers/wasm-runtime.js');let current=true,running=false,switched=0;
  const runner=createPracticalControlRunner({current:()=>current}),unsubscribe=wasmRuntimeProvider.subscribe(state=>{if(state.status==='running'&&!running){running=true;setTimeout(()=>{switched=performance.now();current=false},200)}});
  try{await runner.run(input,{variant:'A',part:'P1'});throw Error('Cancellation not observed')}catch(e){return{code:e.code,running,stoppedMs:performance.now()-switched,busy:runner.busy,state:wasmRuntimeProvider.getState().status}}finally{runner.cancel();unsubscribe()}
 },{prefix,input});assert.equal(cancelled.code,'ASSESSMENT_CHECK_CANCELLED');assert.equal(cancelled.running,true);assert.ok(cancelled.stoppedMs<2000);assert.equal(cancelled.busy,false);assert.equal(cancelled.state,'idle');records.push({id:'context-cancel-during-real-cpp-execution',status:'PASS',...cancelled});console.log(JSON.stringify(records.at(-1)));
 assert.equal(f.studio.jobs.size,0);assert.deepEqual(f.errors,[]);
}catch(e){fatal={message:e.message,stack:e.stack?.slice(0,2500),errors:f.errors};console.error(JSON.stringify({status:'FAIL',fatal}));await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{})}
finally{await f.close();const result={status:fatal?'FAIL':'PASS / actual browser control checks',records,fatal,privateReferencePublished:false,physicalMobile:false,productionRequests:0,serverStudentCompilation:false};await writeFile(path.join(out,'FINAL_PRACTICAL_CONTROLS.json'),JSON.stringify(result,null,2)+'\n');if(fatal)process.exitCode=1}
