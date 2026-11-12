import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {GOLD_OOP_LESSONS} from '../core/academy-gold-catalog.js';
import {b1Lesson} from './helpers/cpp-clarity-b1-content.mjs';
import {clarityLocalFixture} from './helpers/cpp-clarity-local-fixture.mjs';
import {module5GoldPrograms,programFiles} from './helpers/module5-gold-programs.mjs';
import {filePropertiesMatch} from './helpers/module4-file-properties.mjs';

const out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE);
await mkdir(out,{recursive:true});
const scope=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'CLARITY_BUILD_SCOPE.json')));
const f=await clarityLocalFixture(path.join(out,'b5-vault'));
let p=f.page;
const prefix='/releases/'+f.generation,editions=[],observations=[],checks=[];
const go=async(id,locale,stage)=>{
 await p.evaluate(args=>location.hash='#'+new URLSearchParams(args),{course:'cpp',lesson:id,locale,stage});
 const root=p.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]');
 await root.locator('[data-r3-panel="'+stage+'"]:visible').waitFor();
 return root;
};
const screenshot=async(locator,name)=>{
 await locator.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await p.screenshot({path:path.join(out,name+'.png')});
};
let failure;
try{
 await p.setViewportSize({width:1366,height:900});
 for(const id of GOLD_OOP_LESSONS)for(const locale of ['ru','en']){
  const {g,l}=await b1Lesson(id,locale),root=await go(id,locale,'explanation');
  assert.equal(await root.getAttribute('data-authored'),'true');
  const prediction=l.selfcheck.find(q=>q.id==='predict');
  for(const section of l.sections.filter(s=>s.code||s.reveal)){
   const item=root.locator('#'+section.id),code=section.code||section.reveal.code;
   if(section.reveal)await item.locator('.prediction-reveal > summary').click();
   const layout=item.locator('.example-layout');
   assert.equal(await layout.locator('pre code').textContent(),code.source);
   assert.equal(await layout.locator('[data-expected-output]').textContent(),code.output);
   assert.equal(await layout.locator('p+pre').count()?await layout.locator('p+pre').textContent():'',code.stdin);
  }
  if(['cpp.classes-objects-state-control','cpp.constructors-destructors'].includes(id)){
   const reveal=root.locator('.prediction-reveal');
   await screenshot(reveal,id.slice(4)+'-'+locale+'-1366');
   await p.setViewportSize({width:320,height:900});
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await screenshot(reveal,id.slice(4)+'-'+locale+'-320');
   await p.setViewportSize({width:1366,height:900});
  }
  for(const section of l.sections.filter(s=>s.tables?.some(t=>t.kind==='state'))){
   const region=root.locator('#'+section.id+' [data-wide-table="state"]');
   await p.setViewportSize({width:320,height:900});
   assert.ok(await region.evaluate(el=>el.scrollWidth>el.clientWidth&&document.documentElement.scrollWidth<=innerWidth+1));
   await region.focus();await p.keyboard.press('ArrowRight');
   await p.waitForFunction(()=>[...document.querySelectorAll('[data-wide-table="state"]')].some(el=>el.scrollLeft>0));
   await region.evaluate(el=>el.scrollLeft=0);
   await screenshot(region,id.slice(4)+'-'+section.id+'-'+locale+'-320');
   await p.setViewportSize({width:1366,height:900});
  }
  await root.locator('[data-stage="selfcheck"]').click();
  const q=root.locator('[data-question="predict"]');
  assert.equal(await q.locator('.example-layout pre code').textContent(),prediction.code.source);
  assert.equal(await q.locator('[data-expected-output]').count(),0);
  await q.locator('[data-answer="predict"][value="1"]').check();
  await q.locator('fieldset button.btn:not([data-reference-term])').click();
  assert.ok((await q.locator('[data-feedback="predict"]').textContent()).endsWith(prediction.feedback));
  await root.locator('[data-stage="practice"]').click();
  const editor=root.locator('#editor'),practice=root.locator('[data-r3-panel="practice"]');
  await editor.waitFor();
  const starter=l.practice.files[0].content;
  const old=(await b1Lesson(id,'ru')).g.laboratory.starterCode+'\n// retained learner work\n';
  assert.equal(await editor.inputValue(),locale==='ru'?starter:old);
  assert.equal(await practice.locator('.program-files:has([data-starter-output])').locator('[data-program-file="main.cpp"]').textContent(),starter);
  assert.equal(await practice.locator('[data-starter-output]').textContent(),l.practice.starterObservation.stdout);
  assert.equal(await practice.locator('[data-step-why]').count(),3);
  assert.equal(await practice.locator('[data-step-expected]').count(),3);
  const cases=practice.locator('.practice-cases > li');
  assert.deepEqual(await cases.locator('[data-expected-output]').allTextContents(),l.practice.cases.map(c=>c.output));
  for(const [i,c] of l.practice.cases.entries())if(c.fileChecks){
   assert.deepEqual(await cases.nth(i).locator('ul > li').allTextContents(),c.fileChecks.map(x=>x.path+' · '+x.description));
  }
  await editor.fill(old);
  const stdin=root.locator('#stdin');
  await stdin.fill(l.practice.stdin+' ');
  const retained=await editor.elementHandle(),opener=practice.locator('[data-action="lab-window"]');
  const mobile=['cpp.raii-smart-pointers','cpp.exceptions-guarantees'].includes(id);
  if(mobile)await p.setViewportSize({width:390,height:900});
  await opener.click();
  const dialog=root.locator('.gold-work-dialog[open]'),reference=dialog.locator('[data-lab-reference]');
  assert.ok(await dialog.locator('#editor').evaluate((el,node)=>el===node,retained));
  if(mobile)await dialog.locator('[data-gold-work-tab="task"]').click();
  await reference.locator(':scope > summary').click();
  assert.equal(await reference.locator('[data-reference-source] code').textContent(),g.laboratory.referenceCode);
  if(mobile){
   await screenshot(dialog.locator('.practice-cases > li').nth(l.practice.starterObservation.case),id.slice(4)+'-workbench-'+locale);
   await dialog.locator('[data-gold-work-tab="editor"]').click();
  }
  assert.equal(await dialog.locator('#editor').inputValue(),old);
  assert.equal(await dialog.locator('#stdin').inputValue(),l.practice.stdin+' ');
  await p.keyboard.press('Escape');
  await dialog.waitFor({state:'detached'});
  assert.ok(await opener.evaluate(el=>el===document.activeElement));
  assert.equal(await editor.inputValue(),old);
  await p.waitForFunction(()=>document.querySelector('[data-r3-save]')?.dataset.state==='saved');
  await p.setViewportSize({width:1366,height:900});
  const project=g.blockPracticum||g.modulePracticum;
  if(project){
   const panel=practice.locator('[data-gold-practicum]');
   await panel.getByText(locale==='ru'?'Эталон: раскройте после собственной попытки':'Reference: open after your own attempt',{exact:true}).click();
   assert.ok((await panel.locator('details[open] pre code').allTextContents()).includes(project.referenceCode));
   assert.equal(await panel.locator('[data-gold-open-editor]').count(),0);
   assert.equal(await panel.locator('a[href="#view=code-studio"]').count(),1);
  }
  editions.push({id,locale,examples:g.workedExamples.length,cases:l.practice.cases.length,workbench:true,project:!!project});
  console.log('B05 interface '+editions.length+'/18 '+id+' '+locale);
 }
 for(const locale of ['ru','en']){
  const id='cpp.raii-smart-pointers',{g,l}=await b1Lesson(id,'ru');
  const root=await go(id,locale,'practice');
  assert.equal(await root.locator('#editor').inputValue(),g.laboratory.starterCode+'\n// retained learner work\n');
  assert.equal(await root.locator('#stdin').inputValue(),l.practice.stdin+' ');
 }
 checks.push('Original learner code and stdin survive the workbench, reference inspection and route changes.');
 for(const locale of ['ru','en']){
  let root=await go(GOLD_OOP_LESSONS[0],locale,'explanation');
  for(const [index,id] of GOLD_OOP_LESSONS.entries()){
   root=p.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]');
   await root.locator('[data-r3-panel="explanation"]:visible').waitFor();
   assert.ok((await root.locator('.topic-marker').textContent()).trim().endsWith((47+index)+'/67'));
   if(index+1<GOLD_OOP_LESSONS.length){
    await root.locator('.reference-lesson-neighbours [data-reference-next-lesson]').click();
   }
  }
 }
 checks.push('Normal next-topic navigation follows all nine OOP prerequisites and markers 47–55 in RU/EN.');

 if(!process.argv.includes('--view-only')){
  await p.evaluate(()=>location.hash='#view=compiler');
  await p.locator('#prepareCompiler').click();
  await p.waitForFunction(()=>/полностью проверен и готов/.test(document.querySelector('#runtimeStatus')?.textContent||''),{},{timeout:300000});
  const programs=await module5GoldPrograms({includeAuthored:true});
  for(const program of programs)for(const [index,c] of program.cases.entries()){
   const request={languageId:'cpp',source:program.source,stdin:c.stdin,entryFile:'main.cpp',files:programFiles(program,c),metadata:program.metadata};
   const result=await p.evaluate(async({prefix,request})=>{
    const {pickProvider}=await import(prefix+'/sandbox/sandbox.js');
    const {provider}=await pickProvider(request);
    const input=JSON.stringify(request);
    try{
     const run=await provider.run(request);
     return {provider:provider.id,stdout:run.stdout,stderr:run.stderr,exitCode:run.exitCode,
      cppExceptions:run.cppExceptions,files:run.outputFiles||run.files||{},sameInput:input===JSON.stringify(request)};
    }catch(e){
     return {provider:provider.id,phase:e.anxPhase,limited:!!e.anxProviderLimit,
      diagnostic:String(e.anxCompilerOutput||e.message),sameInput:input===JSON.stringify(request)};
    }
   },{prefix,request});
   observations.push({id:program.id,index,aliases:program.aliases,bundleSha256:program.bundleSha256,expected:c.stdout,...result});
   assert.equal(result.provider,'wasm-cpp',program.id);
   assert.ok(result.sameInput,program.id);
   if(program.expectation==='exact'){
    assert.equal(result.stdout,c.stdout,program.id+' stdout');
    assert.equal(result.exitCode,c.exitCode||0,program.id+' exit code');
    assert.equal(result.stderr,'',program.id+' stderr');
    if(/\bthrow\b/.test(program.source))assert.equal(result.cppExceptions,true,program.id+' actual browser EH');
    for(const [file,value] of Object.entries(c.outputFiles||{}))assert.equal(result.files[file],value,program.id+' '+file);
    assert.ok(filePropertiesMatch(c.fileProperties,result.files),program.id+' file properties');
   }else{
    assert.equal(result.phase,'compile',program.id);
    assert.ok(!result.limited&&result.diagnostic.includes(program.diagnostic),result.diagnostic);
   }
   if(observations.length%25===0)console.log('B05 Clang/WASI '+observations.length+' cases');
  }

  const project=programs.find(x=>x.aliases.some(a=>a.part==='project-reference'));
  const sample=project.cases[5];
  const runEditor=async expected=>{
   await p.locator('#runCode').click();
   await p.waitForFunction(()=>!document.querySelector('#runCode')?.disabled&&/exit code:|код завершения:/i.test(document.querySelector('#output')?.textContent||''),{},{timeout:300000});
   assert.ok((await p.locator('#output').textContent()).startsWith(expected));
  };
  const imported={
   title:'SYNTHETIC B05 Board',languageId:'cpp',
   manifest:{schemaVersion:1,entryFile:'main.cpp',sourceRoots:['.'],includeRoots:project.metadata.includeRoots,testRoots:['tests']},
   workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',
    files:Object.entries(programFiles(project,sample)).map(([path,content])=>({path,content,languageId:'cpp'}))}
  };
  await p.evaluate(()=>location.hash='#view=code-studio');
  await p.locator('[data-cs-action="import"]').click();
  await p.locator('[data-cs-import]').setInputFiles({
   name:'synthetic-board.nexus.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(imported))
  });
  await p.locator('#psSaveProject').waitFor();
  const projectId=await p.evaluate(()=>new URLSearchParams(location.hash.slice(1)).get('project'));
  assert.ok(projectId);
  await p.locator('#stdin').fill(sample.stdin);
  await runEditor(sample.stdout);
  const snapshot=()=>p.locator('#editor').evaluate(e=>e.__nexusCodeStudio.getSnapshot().files);
  assert.ok(!(await snapshot()).some(x=>x.path==='board-report.txt'));
  await p.locator('[data-save-runtime-files]').click();
  await p.waitForFunction(()=>document.querySelector('#editor').__nexusCodeStudio.getSnapshot().files.some(x=>x.path==='board-report.txt'));
  assert.equal((await snapshot()).find(x=>x.path==='board-report.txt').content,sample.outputFiles['board-report.txt']);
  assert.equal((await snapshot()).find(x=>x.path==='main.cpp').content,project.source);
  await p.locator('#psSaveProject').click();
  await p.waitForFunction(()=>/Сохранено на устройстве|Saved on this device/.test(document.querySelector('#psSaveStatus')?.textContent||''));
  checks.push('Actual Board run with three translation units, Urgent scoring, explicit board-report.txt save and unchanged source.');
  await f.closeBrowser();f.networkDown();p=await f.launch();await p.context().setOffline(true);
  await p.goto(f.origin+'/offline.html#copy='+f.id);
  await p.waitForFunction(()=>document.querySelector('#offlineApp')?.dataset.akroniklRoute===location.hash);
  await p.evaluate(phrase=>{const input=document.querySelector('#localPhrase');input.value=phrase;input.form.requestSubmit();},f.phrase);
  await p.locator('#psNewProject').waitFor();
  for(const id of GOLD_OOP_LESSONS)for(const locale of ['ru','en']){
   const root=await go(id,locale,'explanation');
   assert.equal(await root.locator('.prediction-code').count(),1);
  }
  await p.evaluate(id=>location.hash='#view=code-studio&project='+id,projectId);
  await p.locator('#psSaveProject').waitFor();
  assert.equal((await snapshot()).find(x=>x.path==='board-report.txt').content,sample.outputFiles['board-report.txt']);
  assert.equal((await snapshot()).find(x=>x.path==='main.cpp').content,project.source);
  await p.locator('#stdin').fill(sample.stdin);
  await runEditor(sample.stdout);
  checks.push('Cold offline reopened all eighteen editions and reran the saved Board with its source and report restored.');
 }
 assert.deepEqual(f.errors,[]);
}catch(e){
 failure={message:e.message,stack:e.stack};
 console.error(e);
 await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
}finally{
 const result={status:failure?'FAIL':'PASS',scope,editions,checks,observations,failure};
 await writeFile(path.join(out,'B05_BROWSER.json'),JSON.stringify(result,null,2)+'\n');
 await f.close();
 console.log(JSON.stringify({status:result.status,sourceCommit:scope.sourceCommit,editions:editions.length,cases:observations.length,failure}));
 if(failure)process.exitCode=1;
}
