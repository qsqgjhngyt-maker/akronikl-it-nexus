// Регрессия дефекта владельца: широкие таблицы и недоступное место выполнения.
// Только отдельный профиль, синтетические работы, без production-запросов.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';
import {goldLessonRoute} from './helpers/gold-lesson-route.mjs';
import {GOLD_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
const out=path.resolve(process.env.NEXUS_GOLD_UX_EVIDENCE),fixture=await onlineRuntimeFixture();
await mkdir(out,{recursive:false});
const p=fixture.page,checks=[],widths=[320,360,390,768,1366,1440];let fatal;
const check=async(name,fn)=>{const detail=await fn();checks.push({name,status:'PASS',detail});console.log('PASS '+name);};
// Существующий bind Code Studio обновляет timestamp и локальный счётчик revision.
// Эти служебные поля не являются содержимым работы или учебным прогрессом.
const semantic=raw=>{const value=JSON.parse(raw);delete value.state.updatedAt;for(const course of Object.values(value.state.courses||{}))for(const lesson of Object.values(course.lessons||{}))if(lesson.workspace)delete lesson.workspace.revision;return value;};
try{
 await p.goto(fixture.origin+'/#course=cpp&lesson=cpp.algorithm-complexity');
 await p.locator('[data-gold-lesson="cpp.algorithm-complexity"]').waitFor();await fixture.waitReady();
 const prefix='/releases/'+await p.evaluate(()=>document.querySelector('script[type="module"][src*="/releases/"]').src.split('/releases/')[1].split('/')[0]);
 if(!process.argv.includes('--interaction-only'))await check('Все 92 RU/EN объекта M1–4: случаи, stdin/stdout, файлы и свойства без потерь',async()=>{
  let groups=0,cases=0;
  for(const id of GOLD_LESSONS)for(const locale of ['ru','en']){
   const g=JSON.parse(await readFile(new URL('../'+goldLessonPath(id,locale),import.meta.url)));
   await p.evaluate(async({g,prefix})=>{const {academyGoldMarkup,bindAcademyGold}=await import(prefix+'/core/academy-gold-presentation.js');document.querySelector('.academy-gold').outerHTML=academyGoldMarkup(g);bindAcademyGold(document.querySelector('.academy-gold'),g);},{g,prefix});
   const sections=p.locator('[data-gold-laboratory],[data-gold-practicum]'),expected=[g.laboratory,g.blockPracticum,g.modulePracticum].filter(Boolean);
   assert.equal(await sections.count(),expected.length);
   for(let i=0;i<expected.length;i++){
    const section=sections.nth(i),rows=section.locator('.gold-case');assert.equal(await rows.count(),expected[i].cases.length);
    assert.equal(await section.locator('[data-gold-open-editor]').count(),1);assert.equal(await section.locator('a[href="#view=code-studio"]').count(),1);
    const actual=await rows.evaluateAll(nodes=>nodes.map(n=>({open:n.open,values:[...n.querySelector('.gold-case-values').querySelectorAll('pre code')].map(c=>c.textContent),files:[...n.querySelectorAll('.gold-case-files')].map(f=>({title:f.querySelector('summary').textContent,values:[...f.querySelectorAll('.gold-case-value')].map(v=>({path:v.querySelector('strong').textContent,text:v.querySelector('pre code').textContent})),properties:f.querySelector('.gold-case-value')?null:f.querySelector('pre code')?.textContent}))})));
    for(let j=0;j<actual.length;j++){
     const a=actual[j],e=expected[i].cases[j];assert.equal(a.open,j===0);assert.deepEqual(a.values,[e.stdin,e.stdout]);
     const fileExpected=[e.files,e.outputFiles].filter(v=>v!==undefined);assert.equal(a.files.length,fileExpected.length+Number(e.fileProperties!==undefined));
     for(let k=0;k<fileExpected.length;k++)assert.deepEqual(a.files[k].values,Object.entries(fileExpected[k]).map(([path,text])=>({path,text})));
     if(e.fileProperties!==undefined)assert.deepEqual(JSON.parse(a.files.at(-1).properties),e.fileProperties);
    }groups++;cases+=actual.length;
   }
   await p.locator('.gold-cases details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
   for(const width of widths){await p.setViewportSize({width,height:900});const overflow=await p.evaluate(()=>({document:document.documentElement.scrollWidth>innerWidth+1,cases:[...document.querySelectorAll('.gold-cases,.gold-case,.gold-case pre')].some(n=>n.scrollWidth>n.clientWidth+1)}));assert.deepEqual(overflow,{document:false,cases:false},id+' '+locale+' '+width);}
  }
  return{objects:GOLD_LESSONS.length*2,groups,cases,widths,responsiveChecks:GOLD_LESSONS.length*2*widths.length};
 });
 await check('Клавиатура, точное копирование stdin/stdout/файлов, пустой и длинный ввод',async()=>{
  await goldLessonRoute(p,'cpp.property-testing-benchmarks','ru');
  await fixture.context.grantPermissions(['clipboard-read','clipboard-write'],{origin:fixture.origin});
  await p.evaluate(()=>{const write=navigator.clipboard.writeText.bind(navigator.clipboard);window.__goldClipboardCalls=[];navigator.clipboard.writeText=text=>{window.__goldClipboardCalls.push(text);return write(text);};});
  const project=p.locator('[data-gold-practicum]').last(),cases=project.locator('.gold-case');
  const expected=JSON.parse(await readFile(new URL('../'+goldLessonPath('cpp.property-testing-benchmarks','ru'),import.meta.url))).modulePracticum.cases;
  for(const i of [0,2,expected.length-1]){
   const c=cases.nth(i),summary=c.locator(':scope>summary');await summary.focus();
   if(await c.getAttribute('open')===null)await p.keyboard.press('Enter');
   assert.ok(await c.locator('.gold-case-values').isVisible());
   for(const [j,value]of [expected[i].stdin,expected[i].stdout].entries()){
    const b=c.locator('.gold-case-values [data-gold-copy]').nth(j);await b.click();await p.waitForFunction(()=>document.activeElement?.textContent==='Скопировано');
    assert.equal(await p.evaluate(()=>window.__goldClipboardCalls.at(-1)),value);
    assert.equal((await p.evaluate(()=>navigator.clipboard.readText())).replaceAll('\r\n','\n'),value);
   }
   await summary.focus();await p.keyboard.press('Space');assert.equal(await c.getAttribute('open'),null);
  }
  const first=cases.first();await first.locator(':scope>summary').click();const files=first.locator('.gold-case-files').first();await files.locator(':scope>summary').click();
  const input=Object.entries(expected[0].files??expected[0].outputFiles)[0];await files.locator('[data-gold-copy]').first().click();assert.equal(await p.evaluate(()=>window.__goldClipboardCalls.at(-1)),input[1]);assert.equal((await p.evaluate(()=>navigator.clipboard.readText())).replaceAll('\r\n','\n'),input[1]);
  await p.setViewportSize({width:390,height:844});await first.scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'cases-390.png')});
  await p.setViewportSize({width:1366,height:900});await first.scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'cases-1366.png')});
  return{keyboard:['Enter','Space'],cases:[0,2,expected.length-1],clipboardWriteArgumentExact:true,clipboardReadNormalizesWindowsCRLF:true};
 });
 await check('Рабочее окно: задание рядом, мобильные вкладки и точный возврат к месту урока',async()=>{
  const ids=['cpp.languages-compilation-debugging','cpp.standard-io','cpp.files','cpp.property-testing-benchmarks'];let actions=0,actualRuns=0;
  const snapshot=()=>p.evaluate(async prefix=>{const {loadState}=await import(prefix+'/core/storage.js'),{listProjects}=await import(prefix+'/project-studio/project-store.js');return JSON.stringify({state:loadState(),projects:listProjects()});},prefix);
  await p.evaluate(async prefix=>{const {createProject}=await import(prefix+'/project-studio/project-store.js');createProject({id:'synthetic-gold-ux-preserved',title:'SYNTHETIC preserved work',entryFile:'main.cpp',files:[{path:'main.cpp',content:'// SYNTHETIC project\nint main(){return 23;}',languageId:'cpp'}]});},prefix);
  for(const locale of ['ru','en'])for(const id of ids){
   await goldLessonRoute(p,id,locale);
   let source='// SYNTHETIC work '+id+'\n#include <iostream>\nint main(){std::cout<<"modal\\n";return 0;}';
   await p.locator('#editor').fill(source);await p.locator('#editor').dispatchEvent('input');await p.locator('#stdin').fill('personal input\n');await p.locator('#stdin').dispatchEvent('input');
   const hash=await p.evaluate(()=>location.hash),count=await p.locator('[data-gold-open-editor]').count();
   for(const width of [1366,390])for(let i=0;i<count;i++){
    await p.setViewportSize({width,height:900});
    const button=p.locator('[data-gold-open-editor]').nth(i);await button.scrollIntoViewIfNeeded();await button.focus();
    await p.evaluate(()=>{window.__goldOriginalEditor=document.querySelector('#editor');});
    const position=await p.evaluate(()=>({x:scrollX,y:scrollY})),before=await snapshot(),editorLanguage=await p.locator('#editor').evaluate(n=>n.closest('[lang]')?.getAttribute('lang')||document.documentElement.lang);
    await p.keyboard.press('Enter');const dialog=p.locator('.gold-work-dialog');await dialog.waitFor({state:'visible'});
    assert.equal(await p.locator('#editor').count(),1);assert.equal(await p.locator('#stdin').count(),1);
    assert.ok(await p.locator('#editor').evaluate(n=>document.activeElement===n&&n===window.__goldOriginalEditor));
    assert.equal(await p.locator('#editor').inputValue(),source);assert.equal(await p.evaluate(()=>location.hash),hash);
    const task=dialog.locator('[data-gold-work-panel="task"]'),editor=dialog.locator('[data-gold-work-panel="editor"]');
    assert.equal(await editor.getAttribute('lang'),editorLanguage);assert.equal(await task.getAttribute('lang'),locale);
    if(width===390){
     const taskTab=dialog.locator('[data-gold-work-tab="task"]'),editorTab=dialog.locator('[data-gold-work-tab="editor"]');
     assert.equal(await task.isVisible(),false);assert.ok(await editor.isVisible());await editorTab.focus();await p.keyboard.press('Home');
     assert.ok(await task.isVisible());assert.equal(await editor.isVisible(),false);assert.equal(await taskTab.getAttribute('aria-selected'),'true');
     await p.keyboard.press('ArrowRight');assert.ok(await editor.isVisible());assert.equal(await task.isVisible(),false);
    }else{assert.ok(await task.isVisible());assert.ok(await editor.isVisible());assert.equal(await dialog.locator('.gold-work-tabs').isVisible(),false);}
    assert.ok(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth+1));
    // Native modal сохраняет focus внутри и делает остальной урок недоступным.
    await p.locator('#completeLesson').evaluate(n=>n.focus());assert.ok(await dialog.evaluate(n=>n.contains(document.activeElement)));
    if(actualRuns===0){
     for(const probeWidth of widths){await p.setViewportSize({width:probeWidth,height:900});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.ok(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth+1));assert.equal(await dialog.locator('.gold-work-tabs').isVisible(),probeWidth<=900);}
     await p.setViewportSize({width,height:900});
     await dialog.locator('#runCode').click();await p.waitForFunction(()=>!document.querySelector('#runCode')?.disabled&&(/Код завершения:/.test(document.querySelector('#output')?.textContent||'')||document.querySelector('#output.error-output,#output.provider-limit-output')),{},{timeout:300000});
     const output=await dialog.locator('#output').textContent();assert.ok(output.startsWith('modal\n'),output);assert.ok(output.includes('Код завершения: 0'),output);actualRuns++;
     source+='\n// SYNTHETIC edit inside the work window';await dialog.locator('#editor').fill(source);await dialog.locator('#editor').dispatchEvent('input');
    }
    if(id==='cpp.property-testing-benchmarks'&&locale==='ru'&&i===count-1){
     await p.screenshot({path:path.join(out,'work-window-'+width+'.png')});
     if(width===390){await dialog.locator('[data-gold-work-tab="task"]').click();await p.screenshot({path:path.join(out,'work-task-390.png')});await dialog.locator('[data-gold-work-tab="editor"]').click();}
    }
    const afterEdit=await snapshot();
    if(width===390){
     await dialog.locator('[data-gold-work-tab="task"]').click();await task.locator('.gold-cases').first().scrollIntoViewIfNeeded();const taskY=await task.evaluate(n=>n.scrollTop);
     await dialog.locator('[data-gold-work-tab="editor"]').click();await dialog.locator('[data-gold-work-tab="task"]').click();assert.equal(await task.evaluate(n=>n.scrollTop),taskY);
     await dialog.locator('[data-gold-work-tab="editor"]').click();
    }
    if(actions%2===0)await dialog.locator('[data-gold-work-close]').click();else await p.keyboard.press('Escape');
    await dialog.waitFor({state:'detached'});assert.ok(await button.evaluate(n=>document.activeElement===n));
    assert.ok(await p.evaluate(pos=>Math.abs(scrollX-pos.x)<=1&&Math.abs(scrollY-pos.y)<=2,position));
    assert.ok(await p.locator('#editor').evaluate(n=>n===window.__goldOriginalEditor));
    assert.equal(await p.locator('#editor').inputValue(),source);assert.equal(await p.locator('#stdin').inputValue(),'personal input\n');
    assert.deepEqual(semantic(await snapshot()),semantic(afterEdit));
    if(actions>0)assert.deepEqual(semantic(afterEdit),semantic(before));actions++;
   }
   const before=await snapshot();await p.locator('[data-gold-laboratory] a[href="#view=code-studio"]').click();await p.locator('[data-code-studio-home]').waitFor();
   await p.locator('[data-cs-action="new"]').click();assert.ok(await p.locator('[data-cs-new]').isVisible());
   await p.goBack();await p.locator('[data-gold-lesson="'+id+'"]').waitFor();assert.equal(await p.locator('#editor').inputValue(),source);assert.deepEqual(semantic(await snapshot()),semantic(before));
  }
  await p.locator('[data-gold-open-editor]').first().click();await p.locator('.gold-work-dialog').waitFor();await p.evaluate(()=>{location.hash='#view=home'});await p.locator('.visual-home').waitFor();assert.equal(await p.locator('.gold-work-dialog').count(),0);assert.notEqual(await p.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'hidden');
  await goldLessonRoute(p,ids.at(-1),'en');await p.locator('[data-gold-open-editor]').first().click();await p.locator('.gold-work-dialog').waitFor();
  await p.locator('.gold-work-dialog').evaluate(n=>n.closest('.lesson').remove());await p.waitForFunction(()=>!document.querySelector('.gold-work-dialog'));assert.notEqual(await p.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'hidden');
  return{lessons:ids.length,locales:2,widths:[1366,390],workWindowOpenClose:actions,actualCppRuns:actualRuns,editorNodeNotCloned:true,scrollAndFocusReturn:true,nativeModalInert:true,projectsExact:true,sourceAndProgressExact:true,transientExclusions:['state.updatedAt','lesson.workspace.revision']};
 });
 assert.deepEqual(fixture.errors,[]);assert.equal(fixture.requests.filter(r=>r.path.startsWith('/api/')&&r.method!=='GET').length,0);
}catch(e){fatal={message:e.message,stack:e.stack};console.error(e);await p.screenshot({path:path.join(out,'FAILURE.png')}).catch(()=>{});}
finally{await fixture.close();await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:fatal?'FAIL':'PASS',checks,fatal,errors:fixture.errors,physicalDevice:false,realLive:false,productionMutations:0},null,2)+'\n');if(fatal)process.exitCode=1;}
