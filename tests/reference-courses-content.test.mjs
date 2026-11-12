import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {REFERENCE_IDS,REFERENCE_ROUTES} from '../core/reference-course-routes.mjs';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
import {clarityContentRevision} from '../core/cpp-clarity-r3-state.mjs';
import {evaluateReferenceRun} from '../core/reference-practice-assessment.mjs';
import {curriculumForClarityProgress} from '../core/clarity-course-progress.mjs';
import {hasRevisionCompletion,progressFor} from '../courses/onec-education/model.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const folder=id=>['cpp.programming-process','onec.p2.topic-1'].includes(id)?'cpp-clarity-r3':'clarity';
const target=(id,locale)=>'courses/'+folder(id)+'/lessons/'+id+'.'+locale+'.json';
const old=(file)=>JSON.parse(execFileSync('git',['-c','core.longpaths=true','show','9a01de88:'+file],{maxBuffer:4e6}));
test('Состав 151/302, прежние ID и 141 неизменённая тема',async()=>{
 assert.equal(REFERENCE_IDS.length,10);assert.equal(new Set(REFERENCE_IDS).size,10);assert.deepEqual(REFERENCE_ROUTES.map(r=>r.topics.length),[4,3,3]);
 assert.equal(Object.keys(CLARITY_COURSES).length,151);
 for(const id of Object.keys(CLARITY_COURSES))for(const locale of ['ru','en']){
  const file='courses/'+(CLARITY_COURSES[id].pilot?'cpp-clarity-r3':'clarity')+'/lessons/'+id+'.'+locale+'.json';
  const bytes=await readFile(file);if(!REFERENCE_IDS.includes(id)){assert.deepEqual(bytes,execFileSync('git',['-c','core.longpaths=true','show','9a01de88:'+file],{maxBuffer:4e6}),file);continue;}
  const l=JSON.parse(bytes),prior=old(file);assert.equal(l.id,prior.id);assert.equal(l.courseId,prior.courseId);assert.equal(l.moduleId,prior.moduleId);
  assert.deepEqual(l.selfcheck.map(q=>q.id),prior.selfcheck.map(q=>q.id),file+' question IDs');
  assert.equal(l.contentRevision,clarityContentRevision(id));assert.notEqual(l.contentRevision,prior.contentRevision||prior.proposalRevision);
 }
});
test('Старая попытка и отметка 1С сохраняются, но не становятся оценкой нового задания',()=>{
 const id='onec.p1.lifecycle',prior='onec-p1-author-v1',entry={completed:true,completionRevision:prior,attempts:[{contentRevision:prior,grade:{passed:true}}]},state={lessons:{[id]:entry}},c={courseId:'onec',modules:[{topics:[{topicId:id,status:'IMPLEMENTED',contentRevision:prior,progressPolicy:'current-revision-required'}]}]};
 const before=structuredClone(state),adapted=curriculumForClarityProgress(c,state);
 assert.equal(adapted.modules[0].topics[0].contentRevision,clarityContentRevision(id));assert.deepEqual(state,before);
 assert.equal(hasRevisionCompletion(entry,clarityContentRevision(id)),false);assert.equal(progressFor(adapted,state).done,0);
});
test('20 полных редакций, справка, задачи, перенос навыка и источники',async()=>{
 for(const locale of ['ru','en']){
  const cards=await read('courses/reference/cards.'+locale+'.json'),index=await read('courses/reference/index.'+locale+'.json');assert.equal(cards.length,index.length);
  const ids=new Set();for(const c of cards){assert.ok(!ids.has(c.id));ids.add(c.id);for(const key of ['context','term','simple','definition','purpose','form','example','breakdown','observation','mistake','category','checkedAt'])assert.equal(typeof c[key],'string',c.id+' '+key);assert.ok(c.aliases.length&&c.lessons.length);assert.match(c.source.url,/^https:\/\//);for(const id of c.lessons)assert.ok(CLARITY_COURSES[id],c.id+' lesson link');}
  for(const id of REFERENCE_IDS){const l=await read(target(id,locale));assert.equal(l.referenceEdition,true);assert.ok(l.authored);assert.ok(l.sections.length>=5);
   assert.ok(l.sections.every(s=>s.paragraphs.length>=2&&s.paragraphs.every(p=>typeof p==='string'&&p.length>30)));
   // Объём текста не является мерой понятности. Проверяем целостность, review — отдельно.
   const paragraphs=l.sections.flatMap(s=>s.paragraphs);assert.equal(new Set(paragraphs).size,paragraphs.length,id+' repeated prose');
   for(const t of l.terms)assert.ok(ids.has(t),id+' '+t);assert.ok(l.reading.length>=2);
   assert.deepEqual(l,Object.assign(await read('courses/reference/authoring/'+id+'.'+locale+'.json')));
   for(const k of ['goal','start','where','knowledge','change','inputs','result','checks','errors','recovery'])assert.ok(l.practice.passport[k],id+' '+k);
   assert.ok(l.practice.referenceSolution);assert.ok(l.practice.cases.length);assert.ok(l.practice.criteria.length>=3);
   for(const q of l.selfcheck)if(q.kind!=='free'){assert.equal(q.options.length,CLARITY_COURSES[id].questions[q.id]);assert.ok(q.correct>=0&&q.correct<q.options.length)}
   if(l.courseId==='cpp'){assert.ok(l.practice.runAssessment.lines.length);assert.notEqual(l.practice.files[0].content,l.practice.referenceSolution.source,id+' seed differs');}
   else{assert.equal(l.practice.runAssessment,undefined);assert.match(l.practice.externalRoute,locale==='ru'?/самоотчёт/:/self-report/);}
  }
 }
});
test('Положительный и отрицательные контроли результата, без ложного освоения',()=>{
 const c={lines:['minutes=20.5','open=1']},result={providerId:'wasm-cpp',exitCode:0,output:{stdout:'minutes=20.5\nopen=1\n'}};
 assert.equal(evaluateReferenceRun(c,result).state,'passed');
 assert.equal(evaluateReferenceRun(c,{...result,output:{stdout:'minutes=20\nopen=1\n'}}).state,'failed');
 assert.equal(evaluateReferenceRun(c,{...result,exitCode:1}).state,'failed');
 assert.equal(evaluateReferenceRun(c,{...result,output:{stdout:result.output.stdout+'unexpected\n'}}).state,'failed');
 assert.equal(evaluateReferenceRun(c,result,{current:false}).state,'stale');
 assert.equal(evaluateReferenceRun(c,null).state,'unrun');
 assert.equal(Object.hasOwn(evaluateReferenceRun(c,result),'mastery'),false);
});
