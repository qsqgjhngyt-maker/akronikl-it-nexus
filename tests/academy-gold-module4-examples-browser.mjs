import {filePropertiesMatch} from './helpers/module4-file-properties.mjs';
// Реальные router, Worker и Clang/WASI, исходники из самих 36 Gold объектов.
import assert from 'node:assert/strict';import {mkdir,readFile,writeFile} from 'node:fs/promises';import path from 'node:path';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';import {module4GoldPrograms,programFiles} from './helpers/module4-gold-programs.mjs';
const out=path.resolve(process.env.NEXUS_M4_EVIDENCE||'academy-gold-m4-evidence');await mkdir(out,{recursive:true});
const m=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'))),prefix='/releases/'+m.assetGeneration;
const f=await onlineRuntimeFixture(),programs=await module4GoldPrograms(),records=[],ui=[];let fatal,home;
try{
 await f.page.goto(f.origin+'/#view=home');await f.page.locator('.visual-home').waitFor();await f.waitReady();
 home=await f.page.evaluate(()=>performance.getEntriesByType('resource').map(r=>new URL(r.name).pathname));assert.equal(home.filter(p=>/gold\/.*json|llvm|clang|runno|sandbox\/providers/.test(p)).length,0);
 for(const p of programs){for(const [index,c]of p.cases.entries()){
  const request={languageId:'cpp',source:p.source,stdin:c.stdin,entryFile:'main.cpp',files:programFiles(p,c),metadata:p.metadata};
  const result=await f.page.evaluate(async({prefix,request})=>{
   const {pickProvider}=await import(prefix+'/sandbox/sandbox.js');const before=JSON.stringify(request);let provider;
   try{const route=await pickProvider(request);provider=route.provider.id;const r=await route.provider.run(request);return{ok:true,provider,stdout:r.stdout,stderr:r.stderr,exitCode:r.exitCode,outputFiles:r.outputFiles||r.files||{},compileMs:r.compileMs,runMs:r.runMs,sourceUnchanged:before===JSON.stringify(request)}}
   catch(e){return{ok:false,provider,phase:e.anxPhase,providerLimit:!!e.anxProviderLimit,diagnostic:String(e.anxCompilerOutput||e.message),sourceUnchanged:before===JSON.stringify(request)}}
  },{prefix,request});
  const pass=result.provider==='wasm-cpp'&&result.sourceUnchanged&&(p.expectation!=='exact'?!result.ok&&result.phase==='compile'&&!result.providerLimit&&result.diagnostic.includes(p.diagnostic):result.ok&&result.exitCode===(c.exitCode||0)&&result.stdout===c.stdout&&result.stderr===''&&Object.entries(c.outputFiles||{}).every(([k,v])=>result.outputFiles[k]===v)&&filePropertiesMatch(c.fileProperties,result.outputFiles));
  records.push({id:p.id,index,aliases:p.aliases,sourceSha256:p.sourceSha256,bundleSha256:p.bundleSha256,expected:c.stdout,pass,...result});
  await writeFile(path.join(out,'GOLD_WASM_CASES.json'),JSON.stringify(records,null,2)+'\n');
 }console.log(JSON.stringify({program:p.id,cases:p.cases.length,status:records.filter(r=>r.id===p.id).every(r=>r.pass)?'PASS':'FAIL'}));}
 const runUi=async expected=>{await f.page.locator('#runCode').click();await f.page.waitForFunction(()=>!document.querySelector('#runCode')?.disabled&&(/Код завершения:/.test(document.querySelector('#output')?.textContent||'')||document.querySelector('#output.error-output,#output.provider-limit-output')),{},{timeout:300000});const actual=await f.page.locator('#output').textContent();assert.ok(actual.startsWith(expected),actual)};
 for(const id of [...new Set(programs.flatMap(p=>p.aliases.map(a=>a.lesson)))]){
  const p=programs.find(p=>p.aliases.some(a=>a.lesson===id&&a.part.startsWith('example-')));
  await f.page.evaluate(id=>{location.hash='#course=cpp&lesson='+id},id);await f.page.locator('[data-gold-lesson="'+id+'"]').waitFor();assert.equal(await f.page.locator('#editor').inputValue(),p.source);await runUi(p.cases[0].stdout);ui.push({lesson:id,status:'PASS',sourceUnchanged:true});
 }
 const project=programs.find(p=>p.aliases.some(a=>a.part==='project-reference')),c=project.cases[0],projectId='synthetic-m4-gold-capstone';
 await f.page.evaluate(async({prefix,projectId,files})=>{const {createProject,patchProject,createCheckpoint}=await import(prefix+'/project-studio/project-store.js');createProject({id:projectId,title:'SYNTHETIC Gold capstone',languageId:'cpp'});patchProject(projectId,{manifest:{schemaVersion:1,entryFile:'main.cpp',sourceRoots:['.'],includeRoots:['include'],testRoots:['tests']},workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',files:Object.entries(files).map(([path,content])=>({path,content,languageId:'cpp'}))}});createCheckpoint(projectId,'SYNTHETIC before capstone')},{prefix,projectId,files:programFiles(project,c)});
 await f.page.evaluate(id=>{location.hash='#view=code-studio&project='+id},projectId);await f.page.locator('#psSaveProject').waitFor();assert.equal(await f.page.locator('#editor').inputValue(),project.source);await f.page.locator('#stdin').fill(c.stdin);assert.equal(await f.page.locator('#stdin').inputValue(),c.stdin);await runUi(c.stdout);
 const snapshot=()=>f.page.locator('#editor').evaluate(e=>e.__nexusCodeStudio.getSnapshot());assert.ok(!(await snapshot()).files.some(f=>f.path==='index-report.txt'));
 await f.page.locator('[data-save-runtime-files]').click();assert.equal((await snapshot()).files.find(f=>f.path==='index-report.txt').content,c.outputFiles['index-report.txt']);
 await f.page.locator('#editor').evaluate((e,text)=>e.__nexusCodeStudio.workspace.updateFile('data/records.txt',text), '1\n7 delta -3\n');await f.page.locator('#stdin').fill('find 7\n');await runUi('found 7 delta -3\n');assert.equal((await snapshot()).files.find(f=>f.path==='main.cpp').content,project.source);ui.push({project:projectId,status:'PASS',translationUnits:3,explicitArtifactSave:true,freshImport:true,sourceUnchanged:true});
}catch(e){fatal={message:e.message,stack:String(e.stack).slice(0,3000)};console.error(e)}
finally{const result={status:!fatal&&records.length===programs.reduce((n,p)=>n+p.cases.length,0)&&records.every(r=>r.pass)&&!f.errors.length?'PASS':'FAIL',programs:programs.length,cases:records.length,passed:records.filter(r=>r.pass).length,failures:records.filter(r=>!r.pass),ui,fatal,home,errors:f.errors,scope:{realRouter:true,realCompiler:true,realWorker:true,pinnedBytesSha256Verified:true,syntheticAccount:true,physicalDevice:false,productionRequests:0,cloudWrites:0,sourceRewrite:false}};await writeFile(path.join(out,'GOLD_RUNTIME_RESULT.json'),JSON.stringify(result,null,2)+'\n');await f.close();console.log(JSON.stringify({...result,home:undefined,failures:result.failures.map(x=>({id:x.id,index:x.index,diagnostic:x.diagnostic,stdout:x.stdout})),errors:result.errors}));if(result.status!=='PASS')process.exitCode=1;}
