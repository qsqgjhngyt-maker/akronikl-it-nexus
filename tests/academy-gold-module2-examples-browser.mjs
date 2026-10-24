import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';
import {module2GoldPrograms,matchesGoldOutput} from './helpers/module2-gold-programs.mjs';
import {goldLessonRoute} from './helpers/gold-lesson-route.mjs';
const out=path.resolve(process.env.NEXUS_M2_EVIDENCE||'academy-gold-m2-evidence');await mkdir(out,{recursive:true});
const fixture=await onlineRuntimeFixture(),manifest=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration;
const programs=await module2GoldPrograms(),records=[],ui=[];let fatal,home;
try{
 await fixture.page.goto(fixture.origin+'/#view=home');await fixture.page.locator('.visual-home').waitFor();await fixture.waitReady();
 home=await fixture.page.evaluate(()=>performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname));
 assert.ok(!home.some(p=>/llvm|clang|runno|gold\/.*json|sandbox\/providers/.test(p)),'Home: no Gold bodies/compiler in document resources');
 for(const p of programs){for(const [index,c]of p.cases.entries()){
  const r=await fixture.page.evaluate(async({prefix,source,stdin})=>{
   const {pickProvider}=await import(prefix+'/sandbox/sandbox.js'),request={languageId:'cpp',source,stdin},route=await pickProvider(request);
   try{const r=await route.provider.run(request);return{ok:true,provider:route.provider.id,stdout:r.stdout,stderr:r.stderr,exitCode:r.exitCode,sourceUnchanged:request.source===source,compileMs:r.compileMs,runMs:r.runMs};}
   catch(e){return{ok:false,provider:route.provider.id,sourceUnchanged:request.source===source,error:{code:e.code||null,phase:e.anxPhase||null,providerLimit:!!e.anxProviderLimit,message:String(e.message).slice(0,2000)}};}
  },{prefix,source:p.source,stdin:c.stdin});
  const pass=r.provider==='wasm-cpp'&&r.sourceUnchanged&&(p.expectation==='compile-error'?!r.ok&&r.error.phase==='compile':r.ok&&r.exitCode===0&&r.stderr===''&&matchesGoldOutput(p,r.stdout,c));
  records.push({id:p.id,index,sourceSha256:p.sourceSha256,aliases:p.aliases,expectation:p.expectation,stdin:c.stdin,expected:c.stdout,...r,pass});
 }
 console.log(JSON.stringify({id:p.id,cases:p.cases.length,status:records.filter(r=>r.id===p.id).every(r=>r.pass)?'PASS':'FAIL'}));
 await writeFile(path.join(out,'GOLD_WASM_CASES.json'),JSON.stringify({programs:programs.length,records},null,2)+'\n');
 }
 // Настоящий Fill/Run UI: все 12 lesson routes, обе ширины, ошибка и восстановление.
 for(const [i,p]of programs.filter(p=>p.aliases.some(a=>a.part==='lab-reference')).entries()){
  const g=p.aliases.find(a=>a.part==='lab-reference'),c=p.cases[0],width=i%2?390:1366;
  await fixture.page.setViewportSize({width,height:900});await goldLessonRoute(fixture.page,g.lesson,'ru');
  await fixture.page.locator('#editor').fill(p.source);await fixture.page.locator('#stdin').fill(c.stdin);await fixture.page.locator('#runCode').click();
  await fixture.page.waitForFunction(()=>!document.querySelector('#runCode')?.disabled&&/Код завершения: 0/.test(document.querySelector('#output')?.textContent||''),{},{timeout:300000});
  assert.ok((await fixture.page.locator('#output').textContent()).startsWith(c.stdout),g.lesson);assert.equal(await fixture.page.locator('#editor').inputValue(),p.source);ui.push({lesson:g.lesson,width,status:'PASS',sourceUnchanged:true});
 }
 const bad=programs.find(p=>p.expectation==='compile-error');await fixture.page.locator('#editor').fill(bad.source);await fixture.page.locator('#runCode').click();
 await fixture.page.waitForFunction(()=>!document.querySelector('#runCode')?.disabled&&document.querySelector('#output.error-output'),{},{timeout:300000});assert.match(await fixture.page.locator('#output').textContent(),/Ошибка компиляции C\+\+/);
 const project=programs.find(p=>p.aliases.some(a=>a.part==='project-reference'));await fixture.page.locator('#editor').fill(project.source);await fixture.page.locator('#stdin').fill('1 1000 25');await fixture.page.locator('#runCode').click();
 await fixture.page.waitForFunction(()=>!document.querySelector('#runCode')?.disabled&&/Код завершения: 0/.test(document.querySelector('#output')?.textContent||''),{},{timeout:300000});assert.ok((await fixture.page.locator('#output').textContent()).startsWith('11 0 11\n'));ui.push({lesson:'cpp.standard-io',case:'recover-after-compile-error',status:'PASS'});
 await fixture.page.locator('#output').scrollIntoViewIfNeeded();await fixture.page.screenshot({path:path.join(out,'module2-capstone-mobile.png')});
}catch(e){fatal={message:e.message,stack:e.stack};console.error(e);}
finally{
 const result={status:!fatal&&records.length===programs.reduce((n,p)=>n+p.cases.length,0)&&records.every(r=>r.pass)&&!fixture.errors.length?'PASS':'FAIL',programs:programs.length,cases:records.length,failures:records.filter(r=>!r.pass),fatal,ui,home,errors:fixture.errors,scope:{realCompiler:true,realWorker:true,realRouter:true,transport:'local SHA256-verified pinned bytes, not CDN LIVE',syntheticAccount:true,realCredentials:false,physicalDevice:false,productionRequests:0,cloudMutations:0}};
 await writeFile(path.join(out,'GOLD_RUNTIME_RESULT.json'),JSON.stringify(result,null,2)+'\n');await fixture.close();console.log(JSON.stringify({status:result.status,programs:result.programs,cases:result.cases,failures:result.failures.length,ui:ui.length,fatal}));if(result.status!=='PASS')process.exitCode=1;
}
