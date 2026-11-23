import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {GOLD_STRUCTURED_LESSONS} from '../core/academy-gold-catalog.js';
import {b1Lesson} from './helpers/cpp-clarity-b1-content.mjs';
import {clarityLocalFixture} from './helpers/cpp-clarity-local-fixture.mjs';
import {module3GoldPrograms,programFiles} from './helpers/module3-gold-programs.mjs';

const out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE);
await mkdir(out,{recursive:true});
const scope=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'CLARITY_BUILD_SCOPE.json')));
const f=await clarityLocalFixture(path.join(out,'b3-vault'));
const p=f.page,prefix='/releases/'+f.generation,editions=[],runtime=[],checks=[];
const viewOnly=process.argv.includes('--view-only');
const sample=new Set(['cpp.if-else-switch','cpp.functions-contracts','cpp.two-dimensional-arrays','cpp.multifile-build','cpp.files','cpp.linked-lists','cpp.stacks-queues']);
const go=async(page,id,locale='ru',stage='explanation')=>{
 await page.evaluate(({id,locale,stage})=>location.hash='#'+new URLSearchParams({course:'cpp',lesson:id,locale,stage}),{id,locale,stage});
 const lesson=page.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]');
 await lesson.locator('[data-r3-panel="'+stage+'"]:visible').waitFor();
 return lesson;
};
const fileMap=locator=>locator.evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.dataset.programFile,n.textContent])));
const anchor=async(locator)=>locator.evaluate(el=>{
 const bar=document.querySelector('.lesson-context');
 const top=parseFloat(getComputedStyle(bar).top)+bar.clientHeight+12;
 scrollTo({top:scrollY+el.getBoundingClientRect().top-top,behavior:'instant'});
});
const watchRun=async(page,expected)=>{
 await page.locator('#runCode').click();
 await page.waitForFunction(()=>/exit code:\s*0|код завершения:\s*0/i.test(document.querySelector('#output')?.textContent||''),{},{timeout:300000});
 assert.ok((await page.locator('#output').textContent()).startsWith(expected));
};

let failure;
try{
 await p.setViewportSize({width:1366,height:900});
 for(const id of GOLD_STRUCTURED_LESSONS)for(const locale of ['ru','en']){
  const {g,l}=await b1Lesson(id,locale),lesson=await go(p,id,locale);
  const explanation=lesson.locator('[data-r3-panel="explanation"]');
  assert.equal(await lesson.getAttribute('data-authored'),'true');
  for(const [i,example] of g.workedExamples.entries()){
   const section=explanation.locator('#example-'+(i+1));
   const reveal=section.locator('.prediction-reveal');
   if(await reveal.count()){
    assert.equal(await section.locator('.prediction-code code').textContent(),example.code);
    await reveal.locator(':scope > summary').click();
   }
   const body=await reveal.count()?reveal:section;
   const layout=body.locator('.example-layout');
   assert.equal(await layout.locator('pre code').textContent(),example.code);
   assert.equal(await layout.locator('[data-expected-output]').textContent(),example.expectedStdout);
   assert.equal(await layout.locator('p+pre').count()?await layout.locator('p+pre').textContent():'',example.stdin);
   assert.deepEqual(await fileMap(body.locator('[data-program-file]')),{...example.files,...example.outputFiles});
   if(example.metadata?.translationUnits)assert.match(await body.locator('.program-build').textContent(),/src\/domain\.cpp/);
  }
  if(sample.has(id)){
   const reveal=explanation.locator('.prediction-reveal'),slug=id.slice(4)+'-'+locale;
   await anchor(reveal);
   await p.screenshot({path:path.join(out,slug+'-1366.png')});
   await p.setViewportSize({width:320,height:900});await anchor(reveal);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await p.screenshot({path:path.join(out,slug+'-320.png')});
   await p.setViewportSize({width:1366,height:900});
  }
  for(const section of l.sections.filter(s=>s.id.startsWith('concept-')&&s.tables?.length)){
   const table=explanation.locator('#'+section.id+' table');
   assert.deepEqual(await table.locator('caption').allTextContents(),section.tables.map(t=>t.caption));
   const region=explanation.locator('#'+section.id+' [data-wide-table="state"]');
   await p.setViewportSize({width:320,height:900});await anchor(region);
   assert.ok(await region.evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1&&el.scrollWidth>el.clientWidth&&document.documentElement.scrollWidth<=innerWidth+1));
   assert.ok(await table.locator('td:first-child').evaluateAll(cells=>cells.every(c=>getComputedStyle(c).whiteSpace==='nowrap')));
   await region.focus();await p.keyboard.press('ArrowRight');
   await region.evaluate(el=>new Promise((resolve,reject)=>{
    const limit=performance.now()+1000;
    const poll=()=>el.scrollLeft>0?resolve():performance.now()>limit?reject(Error('State table did not scroll from the keyboard')):requestAnimationFrame(poll);
    poll();
   }));
   await region.evaluate(el=>el.scrollLeft=0);
   await p.screenshot({path:path.join(out,'state-'+id.slice(4)+'-'+section.id+'-'+locale+'-320.png')});
   await p.setViewportSize({width:1366,height:900});
  }
  await lesson.locator('[data-stage="selfcheck"]').click();
  const q=l.selfcheck.find(q=>q.id==='predict'),form=lesson.locator('[data-question="predict"]');
  assert.equal(await form.locator('.example-layout pre code').textContent(),q.code.source);
  assert.equal(await form.locator('[data-expected-output]').count(),0);
  assert.deepEqual(await fileMap(form.locator('[data-program-file]')),q.code.files||{});
  await form.locator('[data-answer="predict"][value="1"]').check();
  await form.locator('fieldset button.btn:not([data-reference-term])').click();
  assert.equal(await form.locator('[data-feedback="predict"]').textContent(),q.feedback[1]);
  await lesson.locator('[data-stage="practice"]').click();
  const editor=lesson.locator('#editor');
  await editor.waitFor();
  const practice=lesson.locator('[data-r3-panel="practice"]'),starter=practice.locator('.program-files:has([data-starter-output])');
  assert.deepEqual(await fileMap(starter.locator('[data-program-file]')),Object.fromEntries(l.practice.files.map(f=>[f.path,f.content])));
  assert.equal(await starter.locator('[data-starter-output]').textContent(),l.practice.starterObservation.stdout);
  assert.equal(await practice.locator('[data-step-why]').count(),3);
  assert.equal(await practice.locator('[data-step-expected]').count(),3);
  const cases=lesson.locator('.practice-cases > li');
  assert.equal(await cases.count(),l.practice.cases.length);
  assert.deepEqual(await cases.locator('[data-expected-output]').allTextContents(),l.practice.cases.map(c=>c.output));
  for(const [i,c] of l.practice.cases.entries())if(c.files||c.outputFiles)
   assert.deepEqual(await fileMap(cases.nth(i).locator('[data-program-file]')),{...c.files,...c.outputFiles});
  const reference=lesson.locator('[data-lab-reference]');
  assert.equal(await reference.getAttribute('open'),null);
  assert.equal(await reference.locator('[data-reference-source]').count(),0);
  await reference.locator(':scope > summary').click();
  assert.equal(await reference.locator('[data-reference-source] code').textContent(),g.laboratory.referenceCode);
  assert.deepEqual(await fileMap(reference.locator('[data-program-file]')),g.laboratory.referenceFiles);
  await reference.locator(':scope > summary').click();
  editions.push({id,locale,examples:2,cases:l.practice.cases.length,reference:'PASS'});
  if(editions.length%8===0)console.log('B03 opened '+editions.length+'/36 editions');
 }

 for(const locale of ['ru','en']){
  let lesson=await go(p,'cpp.while-do-while',locale,'practice');
  const legacy=(await b1Lesson('cpp.while-do-while',locale)).g.laboratory.starterCode+'// retained learner edits\n';
  await lesson.locator('#editor').fill(legacy);
  await lesson.locator('#stdin').fill('3 -1 0');
  await p.waitForFunction(()=>document.querySelector('[data-r3-save]')?.dataset.state==='saved');
  await go(p,'cpp.for-loop',locale,'practice');
  lesson=await go(p,'cpp.while-do-while',locale,'practice');
  const editor=lesson.locator('#editor');assert.equal(await editor.inputValue(),legacy);
  const retained=await editor.elementHandle();
  const opener=lesson.locator('[data-action="lab-window"]');
  for(const width of [1366,390,320]){
   await p.setViewportSize({width,height:900});await opener.click();
   const window=lesson.locator('.gold-work-dialog[open]');
   await window.waitFor();
   assert.ok(await window.locator('#editor').evaluate((el,old)=>el===old,retained));
   if(width<=900)await window.locator('[data-gold-work-tab="task"]').click();
   await p.screenshot({path:path.join(out,'workbench-task-'+locale+'-'+width+'.png')});
   const starter=window.locator('[data-gold-work-panel="task"] .program-files').first();
   await starter.locator(':scope > summary').click();
   assert.ok((await starter.locator('pre code').textContent()).includes('int main()'));
   await starter.locator(':scope > summary').click();
   const solution=window.locator('[data-lab-reference]');
   await solution.locator(':scope > summary').click();
   await solution.locator('[data-reference-source] code').waitFor();
   await solution.evaluate(el=>el.scrollIntoView({block:'start'}));
   await p.screenshot({path:path.join(out,'workbench-'+locale+'-'+width+'.png')});
   if(width<=900)await window.locator('[data-gold-work-tab="editor"]').click();
   assert.equal(await window.locator('#stdin').inputValue(),'3 -1 0');
   assert.equal(await window.locator('#editor').inputValue(),legacy);
   await p.keyboard.press('Escape');await window.waitFor({state:'detached'});
   assert.ok(await opener.evaluate(el=>el===document.activeElement));
   assert.ok(await editor.evaluate((el,old)=>el===old,retained));
  }
  checks.push({id:'cpp.while-do-while',locale,scope:'same editor, exact code and stdin, reference, close and restored focus at 1366/390/320'});
 }
 await p.setViewportSize({width:1366,height:900});
 for(const [id,key] of [['cpp.one-dimensional-arrays','blockPracticum'],['cpp.streams-state','blockPracticum'],['cpp.linked-lists','blockPracticum'],['cpp.stacks-queues','modulePracticum']]){
  const {g}=await b1Lesson(id,'ru'),lesson=await go(p,id,'ru','practice'),project=lesson.locator('[data-gold-practicum]');
  await project.getByText('Эталон: раскройте после собственной попытки',{exact:true}).click();
  assert.ok((await project.locator('details[open] pre code').allTextContents()).includes(g[key].referenceCode));
  assert.equal(await project.locator('[data-gold-open-editor]').count(),0);
  assert.equal(await project.getByRole('link',{name:'Отдельный проект в Code Studio'}).getAttribute('href'),'#view=code-studio');
  checks.push({id,scope:key+' reference and separate Studio entry'});
 }

 if(!viewOnly){
  await p.evaluate(()=>location.hash='#view=compiler');
  await p.locator('#prepareCompiler').click();
  await p.waitForFunction(()=>/полностью проверен и готов/.test(document.querySelector('#runtimeStatus')?.textContent||''),{},{timeout:300000});
  const programs=await module3GoldPrograms({includeAuthoredStarters:true});
  for(const program of programs)for(const [index,c] of program.cases.entries()){
   const request={languageId:'cpp',source:program.source,stdin:c.stdin,entryFile:'main.cpp',files:programFiles(program,c),metadata:program.metadata};
   const actual=await p.evaluate(async({prefix,request})=>{
    const {pickProvider}=await import(prefix+'/sandbox/sandbox.js');
    const route=await pickProvider(request),provider=route.provider.id;
    try{
     const r=await route.provider.run(request);
     return {provider,stdout:r.stdout,stderr:r.stderr,exitCode:r.exitCode,outputFiles:r.outputFiles||r.files||{}};
    }catch(e){return {provider,phase:e.anxPhase,providerLimit:!!e.anxProviderLimit,diagnostic:String(e.anxCompilerOutput||e.message)};}
   },{prefix,request});
   assert.equal(actual.provider,'wasm-cpp');
   if(program.expectation==='exact'){
    assert.equal(actual.stdout,c.stdout,program.id+' stdout');
    assert.equal(actual.exitCode,c.exitCode||0,program.id+' exit');
    assert.equal(actual.stderr,'');
    for(const [file,value] of Object.entries(c.outputFiles||{}))assert.equal(actual.outputFiles[file],value,program.id+' '+file);
   }else{
    assert.equal(actual.phase,'compile',program.id);
    assert.ok(!actual.providerLimit&&actual.diagnostic.includes(program.diagnostic),actual.diagnostic);
   }
   runtime.push({id:program.id,index,aliases:program.aliases,bundleSha256:program.bundleSha256,
    inputSha256:createHash('sha256').update(JSON.stringify(request.files)).digest('hex'),expected:c.stdout,...actual});
   if(runtime.length%25===0)console.log('B03 runtime '+runtime.length+' cases');
  }

  const multi=(await b1Lesson('cpp.multifile-build','ru')).g.laboratory;
  await go(p,'cpp.multifile-build','ru','practice');await p.locator('#editor').fill(multi.referenceCode);
  await p.locator('#editor').evaluate((editor,files)=>{
   for(const [path,content] of Object.entries(files))editor.__nexusCodeStudio.workspace.updateFile(path,content);
  },multi.referenceFiles);
  await p.locator('#stdin').fill('3 4');await watchRun(p,'12\n');
  const lab=(await b1Lesson('cpp.files','ru')).g.laboratory;
  await go(p,'cpp.files','ru','practice');await p.locator('#editor').fill(lab.referenceCode);
  await watchRun(p,'exported\n');
  const snapshots=()=>p.locator('#editor').evaluate(e=>e.__nexusCodeStudio.getSnapshot().files);
  assert.ok(!(await snapshots()).some(f=>f.path==='report.txt'));
  await p.locator('[data-save-runtime-files]').click();
  await p.waitForFunction(()=>document.querySelector('#editor').__nexusCodeStudio.getSnapshot().files.some(f=>f.path==='report.txt'));
  assert.equal((await snapshots()).find(f=>f.path==='report.txt').content,'3 5\n');
  await p.waitForFunction(()=>document.querySelector('[data-r3-save]')?.dataset.state==='saved');
  checks.push({scope:'real multifile editor run; files export; explicit artifact save to the synthetic copy'});

  await f.closeBrowser();f.networkDown();const cold=await f.launch();await cold.context().setOffline(true);
  await cold.goto(f.origin+'/offline.html#copy='+f.id);
  await cold.waitForFunction(()=>document.querySelector('#offlineApp')?.dataset.akroniklRoute===location.hash);
  await cold.evaluate(phrase=>{const i=document.querySelector('#localPhrase');i.value=phrase;i.form.requestSubmit();},f.phrase);
  await cold.locator('#psNewProject').waitFor();
  for(const id of GOLD_STRUCTURED_LESSONS)for(const locale of ['ru','en']){
   const lesson=await go(cold,id,locale);
   assert.equal(await lesson.locator('.prediction-code').count(),1);
  }
  const files=await go(cold,'cpp.files','ru','practice'),ref=files.locator('[data-lab-reference]');
  await ref.locator(':scope > summary').click();
  assert.equal(await ref.locator('[data-reference-source] code').textContent(),lab.referenceCode);
  const restored=await files.locator('#editor').evaluate(e=>e.__nexusCodeStudio.getSnapshot().files);
  assert.equal(restored.find(f=>f.path==='report.txt').content,'3 5\n');
  assert.equal(restored.find(f=>f.path==='main.cpp').content,lab.referenceCode);
  await watchRun(cold,'exported\n');
  checks.push({scope:'cold offline: all 36 editions, on-demand reference, saved code and artifact, actual C++ rerun'});
 }
 assert.deepEqual(f.errors,[]);
}catch(error){
 failure={message:error.message,stack:error.stack};
 console.error(error);
 const current=f.page;
 if(current)await current.screenshot({path:path.join(out,'B3_FAIL.png')}).catch(()=>{});
}finally{
 await writeFile(path.join(out,'B3_BROWSER.json'),JSON.stringify({status:failure?'FAIL':'PASS',sourceCommit:scope.sourceCommit,viewOnly,
  editions,checks,runtime,failure,syntheticOnly:true,physicalDevices:'NOT RUN',learnerUnderstanding:'NOT MEASURED'},null,2)+'\n');
 await f.close();
 if(failure)process.exitCode=1;
 else console.log('PASS B03: '+editions.length+' editions, '+checks.length+' checks, '+runtime.length+' runtime observations');
}
