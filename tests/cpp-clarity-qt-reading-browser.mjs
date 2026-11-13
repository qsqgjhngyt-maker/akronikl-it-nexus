// Ранний переход с настоящим ответом; отдельная защита от потери работы.
// Только синтетический Account/пустой профиль. Компилятор и Qt здесь не запускаются.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {module6ApplicationFixture} from './academy-gold-module6-fixture.mjs';
const out=path.resolve(process.env.NEXUS_M6_EVIDENCE);await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration;
const ids=['cpp.qt-graphical-adapter','cpp.application-build-delivery'],checks=[];
let failure;
try{
 for(const mode of ['early-answer','answer-receipt','reading-receipt']){
  const f=await module6ApplicationFixture(),p=f.page;try{
   await p.goto(f.origin+'/#view=home');await p.locator('.visual-home').waitFor();await f.waitReady();
   await p.locator('[data-startup-intro]').waitFor({state:'hidden',timeout:30000});
   await p.evaluate(async prefix=>{
    const {patchLesson,courseWorkToken,loadState,withCourseStateWriter}=await import(prefix+'/core/storage.js');
    const id='cpp.programming-process';
    await withCourseStateWriter(()=>patchLesson(id,{completed:true,code:'// SYNTHETIC preserved before reading',quiz:1,stdin:'17'},{expectedWorkToken:courseWorkToken(loadState(),'lesson',id)}));
   },prefix);
   const before=await p.evaluate(async prefix=>(await import(prefix+'/core/storage.js')).loadState().courses,prefix),visits=[];
   for(const id of ids){
    const stage=mode==='reading-receipt'?'practice':'selfcheck';
    await p.evaluate(({id,stage})=>location.hash='#'+new URLSearchParams({course:'cpp',lesson:id,stage,locale:'en'}),{id,stage});
    const root=p.locator('[data-r3-topic="'+id+'"]');await root.locator('[data-r3-panel="'+stage+'"]:visible').waitFor();
    const visible=await p.evaluate(()=>({routeReady:document.querySelector('#app').dataset.akroniklRoute===location.hash,status:document.querySelector('[data-r3-save]')?.dataset.state||null}));
    let question=null;
    if(mode!=='reading-receipt'){
     const answer=root.locator('textarea[data-answer]').first();question=await answer.getAttribute('data-answer');
     await answer.fill('SYNTHETIC early answer '+id);
     assert.equal(await answer.inputValue(),'SYNTHETIC early answer '+id,'Actual input must reach the field before testing navigation');
     visible.afterFill=await answer.evaluate(node=>({value:node.value,routeReady:document.querySelector('#app').dataset.akroniklRoute===location.hash,status:document.querySelector('[data-r3-save]')?.dataset.state||null}));
    }
    // В ранней ветке намеренно нет ожидания ACK до следующей навигации.
    if(mode!=='early-answer')await root.locator('[data-r3-save][data-state="saved"]').waitFor({timeout:15000});
    visits.push({id,question,...visible});
   }
   await p.evaluate(()=>location.hash='#view=home');await p.locator('.visual-home').waitFor();
   const after=await p.evaluate(async prefix=>(await import(prefix+'/core/storage.js')).loadState().courses,prefix),snapshots={};
   await writeFile(path.join(out,'QT_READING_SNAPSHOT_'+mode+'.json'),JSON.stringify({mode,visits,before,after,errors:f.errors},null,2)+'\n');
   for(const {id,question}of visits){
    const {clarityDraft,...legacy}=after.cpp.lessons[id]||{};
    const {clarityDraft:priorDraft,...priorLegacy}=before.cpp.lessons[id]||{};
    assert.deepEqual(legacy,priorLegacy,'Reading/answering creates no attempts, completion or learner code');
    assert.ok(clarityDraft&&clarityDraft.workBinding===null);
    if(mode==='reading-receipt')assert.deepEqual(clarityDraft.answers,{});
    else{
     assert.equal(clarityDraft.answers[question]?.value,'SYNTHETIC early answer '+id);
     assert.equal(clarityDraft.answers[question]?.checked,false);
    }
    snapshots[id]=clarityDraft;
    if(before.cpp.lessons[id])after.cpp.lessons[id]=before.cpp.lessons[id];else delete after.cpp.lessons[id];
   }
   assert.deepEqual(after,before,'Other course progress is preserved');assert.deepEqual(f.errors,[]);
   checks.push({mode,status:'PASS',visits,snapshots});console.log('PASS Qt reading '+mode);
  }finally{await f.close();}
 }
}catch(error){failure={message:error.message,stack:String(error.stack).slice(0,3500)};console.error(error);}
await writeFile(path.join(out,'QT_READING_BROWSER.json'),JSON.stringify({status:failure?'FAIL':'PASS',generation:manifest.assetGeneration,checks,failure,syntheticOnly:true,actualQtCompilation:false,learnerUnderstanding:'NOT MEASURED'},null,2)+'\n');
if(failure)process.exitCode=1;
