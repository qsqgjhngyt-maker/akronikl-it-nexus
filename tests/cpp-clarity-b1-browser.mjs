import assert from 'node:assert/strict';import {readFile,mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {clarityLocalFixture} from './helpers/cpp-clarity-local-fixture.mjs';import {B1_NEW,B1_IDS,B2_NEW,B2_IDS,b1Lesson,authoredPrograms} from './helpers/cpp-clarity-b1-content.mjs';
const algorithmization=process.argv.includes('--b2');
const block=algorithmization?'B2':'B1';
const authoredIds=algorithmization?B2_NEW:B1_NEW;
const moduleIds=algorithmization?B2_IDS:B1_IDS;
const runCase=algorithmization
 ?{id:'cpp.pseudocode-euclidean-algorithm',stdin:'84 30\n',output:/6 3/}
 :{id:'cpp.standard-io',stdin:'4 6\n',output:/items=24/};
const out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE);
await mkdir(out,{recursive:true});
const f=await clarityLocalFixture(path.join(out,block.toLowerCase()+'-vault'));
const p=f.page,prefix='/releases/'+f.generation,checks=[],observations=[],requests=[],timings=[];
let failure;
const before=process.argv.includes('--before');
const go=async(id,locale='ru',stage='explanation')=>{const start=Date.now();await p.evaluate(({id,locale,stage})=>location.hash='#'+new URLSearchParams({course:'cpp',lesson:id,locale,stage}),{id,locale,stage});await p.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]').waitFor();await p.locator('[data-r3-panel="'+stage+'"]:visible').waitFor();timings.push({id,locale,stage,ms:Date.now()-start});};
const saved=()=>p.waitForFunction(()=>['saved','restored'].includes(document.querySelector('[data-r3-save]')?.dataset.state));
const snap=async(id,locale,width,part)=>{await p.screenshot({path:path.join(out,(before?'before':'after')+'-'+id.slice(4)+'-'+locale+'-'+width+'-'+part+'.png')});};
try{
 for(const id of authoredIds)for(const locale of ['ru','en']){
  const{g,l}=await b1Lesson(id,locale);await go(id,locale);await p.setViewportSize({width:1366,height:900});await p.waitForTimeout(120);await p.evaluate(()=>scrollTo(0,0));await snap(id,locale,1366,'entry');
  if(before){await p.setViewportSize({width:390,height:900});await p.evaluate(()=>scrollTo(0,0));await snap(id,locale,390,'entry');continue;}
  assert.equal(await p.locator('.authored-section').count(),l.sections.length);assert.equal(await p.locator('.optional-reading[open]').count(),0);
  await p.locator('.prediction-reveal summary').click();
  for(const s of l.sections){
   const section=p.locator('section.authored-section[id="'+s.id+'"]');const expected=[s.reveal?.code,s.code].filter(Boolean),actual=await section.locator('.example-layout').evaluateAll(xs=>xs.map(e=>({source:e.querySelector('pre code')?.textContent,output:e.querySelector('[data-expected-output]')?.textContent,input:e.querySelector('p+pre')?.textContent||''})));
   assert.equal(actual.length,expected.length,id+' '+s.id+' rendered programs');
   for(let i=0;i<expected.length;i++){assert.equal(actual[i].source,expected[i].source);assert.equal(actual[i].output,expected[i].output);assert.equal(actual[i].input,expected[i].stdin||'');requests.push({id,locale,name:s.id,source:actual[i].source,stdin:actual[i].input,expected:actual[i].output,expectCompileFailure:!!expected[i].expectCompileFailure,files:{'main.cpp':actual[i].source},metadata:{entryFile:'main.cpp'},evidence:'Rendered DOM'});}
   if(s.tables)assert.equal(await section.locator('table').count(),s.tables.length);
   if(s.diagram)assert.equal(await section.locator('.lesson-diagram pre').textContent(),s.diagram.text);
  }
  for(const width of [1366,390,320]){
   await p.setViewportSize({width,height:900});await p.locator('.prediction-reveal .example-layout').scrollIntoViewIfNeeded();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' horizontal overflow');await snap(id,locale,width,'visual');
  }
  if(['cpp.variables-scope','cpp.pointers-references-addresses'].includes(id)){await p.setViewportSize({width:390,height:900});await p.locator('#'+(id==='cpp.variables-scope'?'concept-4':'concept-2')+' table').scrollIntoViewIfNeeded();await snap(id,locale,390,'objects');}
  await go(id,locale,'selfcheck');const q=l.selfcheck.find(q=>q.id==='predict');
  for(const question of l.selfcheck.filter(q=>q.execution)){
   const form=p.locator('[data-question="'+question.id+'"]');
   assert.equal(await form.locator('pre code').textContent(),question.execution.source);
   if(typeof question.code==='object'&&question.execution.stdin)assert.equal(await form.locator('.example-layout p+pre').textContent(),question.execution.stdin);
  }
  await p.locator('[data-answer="predict"][value="1"]').check();await p.locator('[data-question="predict"] fieldset button').click();assert.equal((await p.locator('[data-feedback="predict"]').textContent()).includes(q.feedback[1]),true);
  await p.locator('[data-answer="predict"][value="0"]').check();await p.locator('[data-question="predict"] fieldset button').click();
  const own=block+' '+id+' '+locale+' — собственное объяснение';await p.locator('[data-answer="explain"]').fill(own);await saved();await p.locator('[data-answer="explain"]').focus();
  await p.locator('[data-question="explain"] [data-recall]').click();await p.locator('dialog.r3-dialog[open]').waitFor();
  assert.ok(!(await p.locator('dialog.r3-dialog[open]').textContent()).includes(g.teachingEdition.referenceProgram));await p.keyboard.press('Escape');await p.locator('dialog.r3-dialog').waitFor({state:'detached'});assert.equal(await p.locator('[data-answer="explain"]').inputValue(),own);assert.ok(await p.locator('[data-answer="explain"]').evaluate(e=>e===document.activeElement));
  await go(id,locale,'practice');await p.locator('#editor').waitFor();const ownCode='// '+block+' '+id+'\nint main(){}\n';await p.locator('#editor').fill(ownCode);await p.locator('#stdin').fill('own input');await p.locator('#editor').focus();await p.locator('#editor').evaluate(e=>e.setSelectionRange(3,7));const ed=await p.locator('#editor').elementHandle();
  await p.locator('.work-actions [data-recall]').click();await p.locator('dialog.r3-dialog[open]').waitFor();await p.keyboard.press('Escape');await p.locator('dialog.r3-dialog').waitFor({state:'detached'});assert.deepEqual(await p.locator('#editor').evaluate(e=>[e.selectionStart,e.selectionEnd,e===document.activeElement]),[3,7,true]);
  await p.locator('[data-stage="explanation"]').click();await p.locator('[data-stage="practice"]').click();assert.ok(await p.locator('#editor').evaluate((e,old)=>e===old,ed));assert.equal(await p.locator('#editor').inputValue(),ownCode);assert.equal(await p.locator('#stdin').inputValue(),'own input');await saved();
  checks.push({id,locale,status:'PASS',scope:'DOM, prediction, retry, own answer, recall, editor identity and selection, three widths'});
  console.log(block+' UI '+id+' '+locale);
 }
 if(!before){
  if(algorithmization){
   for(const id of ['cpp.first-cpp-program','cpp.pointers-references-addresses'])for(const locale of ['ru','en']){
    await go(id,locale);
    await p.setViewportSize({width:320,height:900});
    await p.locator('.prediction-reveal summary').click();
    const table=p.locator('.prediction-reveal [data-wide-table]').first();
    await table.scrollIntoViewIfNeeded();
    const metrics=await table.evaluate(el=>({
     visible:el.clientWidth,total:el.scrollWidth,
     columns:[...el.querySelectorAll('th')].map(th=>Math.round(th.getBoundingClientRect().width)),
     pageOverflow:document.documentElement.scrollWidth>innerWidth+1,
     headerHeight:document.querySelector('.lesson-context').getBoundingClientRect().height
    }));
    assert.ok(metrics.total>metrics.visible&&metrics.columns.every(w=>w>=108),JSON.stringify(metrics));
    assert.ok(!metrics.pageOverflow&&metrics.headerHeight<=80,JSON.stringify(metrics));
    await table.focus();
    await p.keyboard.press('ArrowRight');
    await p.waitForFunction(()=>document.querySelector('.prediction-reveal [data-wide-table]').scrollLeft>0);
    assert.equal(await p.evaluate(()=>scrollX),0);
    await p.screenshot({path:path.join(out,'mobile-table-'+id.slice(4)+'-'+locale+'.png')});
    checks.push({id,locale,width:320,status:'PASS',scope:'Keyboard-scrollable table without page overflow',metrics});
   }
  }
  // Неизменённый сосед и принятый образец проверяются в той же установленной оболочке.
  await go('cpp.functions-contracts','ru');assert.equal(await p.locator('[data-authored="true"]').count(),0);
  await go('cpp.data-types','en');assert.equal(await p.locator('.authored-section').count(),9);
  await go(authoredIds[0],'ru','practice');assert.equal(await p.locator('#editor').inputValue(),'// '+block+' '+authoredIds[0]+'\nint main(){}\n');
  await p.evaluate(()=>location.hash='#view=compiler');await p.locator('#prepareCompiler').click();await p.waitForFunction(()=>/полностью проверен и готов/.test(document.querySelector('#runtimeStatus')?.textContent||''),{},{timeout:300000});
  const bound=await authoredPrograms(authoredIds);for(const row of bound)if(row.name.startsWith('question-')||!row.name.startsWith('concept-')&&!row.name.startsWith('diagnose-')&&!row.name.startsWith('worked-'))requests.push({...row,evidence:row.name.startsWith('question-')?'Displayed question source':'Authored independent reference and bound test case'});
  const cache=new Map();for(const row of requests){
   const key=JSON.stringify([row.source,row.stdin,row.files,row.metadata]);let result=cache.get(key);
   if(!result){result=await p.evaluate(async({prefix,row})=>{const request={languageId:'cpp',source:row.source,stdin:row.stdin,files:row.files,metadata:row.metadata};const{pickProvider}=await import(prefix+'/sandbox/sandbox.js'),r=await pickProvider(request);try{const v=await r.provider.run(request);return {provider:r.provider.id,stdout:v.stdout||'',stderr:v.stderr||'',exitCode:v.exitCode};}catch(e){return {provider:r.provider.id,error:e.message,stdout:'',stderr:String(e.message),exitCode:-1};}},{prefix,row});cache.set(key,result);}
   assert.equal(result.provider,'wasm-cpp');if(row.expectCompileFailure){assert.notEqual(result.exitCode,0);assert.ok(result.stderr||result.error);}else{assert.equal(result.exitCode,0,row.id+' '+row.name+' '+result.stderr);assert.equal(result.stdout,row.expected,row.id+' '+row.name);}
   observations.push({...row,sourceSha256:createHash('sha256').update(row.source).digest('hex'),...result});if(observations.length%10===0)console.log(block+' runtime '+observations.length+'/'+requests.length);
  }
  const good=observations.filter(r=>!r.expectCompileFailure),other=good.find(r=>r.expected!==good[0].expected);assert.throws(()=>assert.equal(good[0].stdout,other.expected));checks.push({negativeControl:'Swapped expected rejected',status:'PASS'});
  // Реальная кнопка запуска и сохранение привязаны к условию задачи, а не к демонстрационному тексту.
  const{g}=await b1Lesson(runCase.id,'ru');await go(runCase.id,'ru','practice');await p.locator('#editor').fill(g.teachingEdition.referenceProgram);await p.locator('#stdin').fill(runCase.stdin);await p.locator('#runCode').click();await p.waitForFunction(()=>/(?:Код завершения|Exit code): 0/i.test(document.querySelector('#output')?.textContent||''),{},{timeout:300000});assert.match(await p.locator('#output').textContent(),runCase.output);await saved();
  await f.closeBrowser();f.networkDown();const cold=await f.launch();await cold.context().setOffline(true);await cold.goto(f.origin+'/offline.html#copy='+f.id);await cold.waitForFunction(()=>document.querySelector('#offlineApp')?.dataset.akroniklRoute===location.hash);await cold.evaluate(phrase=>{const i=document.querySelector('#localPhrase');i.value=phrase;i.form.requestSubmit()},f.phrase);await cold.locator('#psNewProject').waitFor();
  for(const id of moduleIds)for(const locale of ['ru','en']){
   await cold.evaluate(({id,locale})=>location.hash='#'+new URLSearchParams({course:'cpp',lesson:id,locale,stage:'explanation'}),{id,locale});
   const lesson=cold.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]');
   await lesson.locator('.lesson-section').first().waitFor();
   if(id==='cpp.programming-process')assert.ok(await lesson.locator('.example-layout').first().isVisible());
   else{
    await lesson.locator('.prediction-reveal summary').click();
    assert.ok(await lesson.locator('.prediction-reveal .example-layout').isVisible());
   }
  }
  await cold.evaluate(id=>location.hash='#course=cpp&lesson='+id+'&locale=en&stage=practice',runCase.id);await cold.locator('#editor').waitFor();assert.equal(await cold.locator('#editor').inputValue(),g.teachingEdition.referenceProgram);assert.equal(await cold.locator('#stdin').inputValue(),runCase.stdin);await cold.locator('#runCode').click();await cold.waitForFunction(()=>/(?:Код завершения|Exit code): 0/i.test(document.querySelector('#output')?.textContent||''),{},{timeout:300000});assert.match(await cold.locator('#output').textContent(),runCase.output);checks.push({status:'PASS',scope:'Cold offline: all '+moduleIds.length+' topics RU/EN; work, input and actual C++ run restored'});
 }
 assert.deepEqual(f.errors,[]);
}catch(e){failure={message:e.message,stack:e.stack};console.error(e);try{console.error((await p.locator('body').innerText()).slice(-900));await p.screenshot({path:path.join(out,block+'_FAIL.png')});}catch{}}
finally{await writeFile(path.join(out,block+'_BROWSER.json'),JSON.stringify({status:failure?'FAIL':'PASS',checks,observations,timings,failure,physicalDevices:'NOT RUN',learnerUnderstanding:'NOT RUN',realAccount:'NOT RUN',syntheticLocalVault:true},null,2)+'\n');await f.close();if(failure)process.exitCode=1;else console.log('PASS '+block+': '+checks.length+' checks, '+observations.length+' runtime observations');}
