import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import{createHash}from'node:crypto';
import {execFileSync} from 'node:child_process';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
import {REFERENCE_IDS} from '../core/reference-course-routes.mjs';
import {ROLLOUT_IDS,assertRolloutEdition} from './helpers/course-rollout-contract.mjs';
import {evaluateReferenceRun} from '../core/reference-practice-assessment.mjs';
import {authoredMarkup} from '../core/cpp-clarity-authored.mjs';
import {curriculumForClarityProgress} from '../core/clarity-course-progress.mjs';
import {progressFor} from '../courses/onec-education/model.mjs';
const read=p=>JSON.parse(readFileSync(p));
test('Обновление объяснения не сбрасывает завершение того же задания 1С',()=>{
 for(const id of ['onec.p3.topic-2','1c-enterprise.a3.topic-1']){
  const revision=CLARITY_COURSES[id].contentRevision,entry={completed:true,completionRevision:revision,attempts:[{contentRevision:revision,grade:{passed:true}}]},state={lessons:{[id]:entry}},before=structuredClone(state);
  const catalog={courseId:CLARITY_COURSES[id].courseId,modules:[{status:'IMPLEMENTED',topics:[{topicId:id,status:'IMPLEMENTED',contentRevision:revision,progressPolicy:'current-revision-required'}]}]};
  assert.equal(progressFor(curriculumForClarityProgress(catalog,state),state).done,1);assert.deepEqual(state,before);
 }
});
test('Все три курса: 151 ID, 302 полных редакции и сохранённые десять образцов',()=>{
 assert.deepEqual(readFileSync('core/clarity-course-registry.mjs'),execFileSync('git',['show','66ffc315:core/clarity-course-registry.mjs']),'Редакции проверок, ID и runtime не меняются из-за оформления урока');
 assert.equal(ROLLOUT_IDS.length,141);assert.equal(new Set([...REFERENCE_IDS,...ROLLOUT_IDS]).size,151);
 const counts={};for(const m of Object.values(CLARITY_COURSES))counts[m.courseId]=(counts[m.courseId]||0)+1;
 assert.deepEqual(counts,{cpp:67,onec:52,'1c-enterprise':32});
 for(const id of ROLLOUT_IDS)for(const locale of ['ru','en'])assertRolloutEdition(id,locale);
 const pins=read('docs/ru/03-content/reference-courses-20261112/APPROVED_REFERENCE_BYTES.json').files;
 for(const pin of pins.filter(p=>REFERENCE_IDS.some(id=>p.path.endsWith('/'+id+'.ru.json')||p.path.endsWith('/'+id+'.en.json'))))assert.equal(createHash('sha256').update(readFileSync(pin.path)).digest('hex'),pin.newSha256,'Принятый образец сохранён: '+pin.path);
});
test('Контроль вывода связан с фактическим вводом; неизвестный ввод не объявляется успешным',()=>{
 const contract={cases:[{stdin:'29\n',lines:['2 5']},{stdin:'0\n',lines:['0 0']}]};
 const result={providerId:'wasm-cpp',exitCode:0,inputSnapshot:{stdin:'29\n'},output:{stdout:'2 5\n'}};
 assert.equal(evaluateReferenceRun(contract,result).state,'passed');
 assert.equal(evaluateReferenceRun(contract,{...result,inputSnapshot:{stdin:'0\n'}}).state,'failed');
 assert.equal(evaluateReferenceRun(contract,{...result,inputSnapshot:{stdin:'13\n'}}).state,'unsupported');
 assert.equal(evaluateReferenceRun(contract,{...result,exitCode:1}).state,'failed');
 assert.equal(evaluateReferenceRun(contract,{...result,output:{stdout:'2 5\nextra\n'}}).state,'failed');
 assert.equal(evaluateReferenceRun(contract,result,{current:false}).state,'stale');
 assert.equal(Object.hasOwn(evaluateReferenceRun(contract,result),'mastery'),false);
});
test('Пошаговый разбор функции действительно отображается, HTML в пояснениях экранируется',()=>{
 const l=read('courses/reference/authoring/cpp.functions-contracts.ru.json');
 const explanation=authoredMarkup(l,{code:()=>'',table:()=>'',url:()=>'',programBundle:()=>''}).explanation();
 assert.ok(explanation.includes('return value возвращает 5'));
 assert.ok(explanation.includes('checkedArea(-1,2,result)'));
 const malicious=structuredClone(l);malicious.sections[0].steps=['<img src=x onerror=alert(1)>'];
 const markup=authoredMarkup(malicious,{code:()=>'',table:()=>'',url:()=>'',programBundle:()=>''}).explanation();
 assert.ok(markup.includes('&lt;img'));assert.ok(!markup.includes('<img src=x'));
});
test('Один договор в RU и EN: вопросы, входы, stdout и варианты констант C++',()=>{
 for(const id of ROLLOUT_IDS){const ru=read(`courses/reference/authoring/${id}.ru.json`),en=read(`courses/reference/authoring/${id}.en.json`);
  assert.deepEqual(ru.selfcheck.map(q=>[q.id,q.kind,q.correct]),en.selfcheck.map(q=>[q.id,q.kind,q.correct]),id);
  assert.equal(ru.contentRevision,en.contentRevision);
  if(ru.courseId==='cpp'&&ru.practice.kind==='cpp-console')assert.deepEqual(ru.practice.cases.map(c=>[c.input,c.output]),en.practice.cases.map(c=>[c.input,c.output]),id);
 }
});
