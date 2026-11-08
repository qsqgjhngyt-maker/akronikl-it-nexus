import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
import {gradeQuiz} from '../courses/onec-education/model.mjs';
import {learningFlowMarkup} from '../core/clarity-visuals.mjs';
import {lessonFiguresMarkup} from '../courses/onec-education/lesson-media.mjs';
const id='onec.p2.topic-2',base='704c23616f1d8536416fb90a9b46502e1b0f1831';
const json=async p=>JSON.parse(await readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{maxBuffer:64e6});
test('P2 types меняет одну редакционную пару и сохраняет принятый пилот, P1 и исходные курсы',()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','review/cpp-clarity-r3','core/clarity-course-progress.mjs','core/storage.js','project-studio','sandbox/qt'])assert.equal(git('diff','--name-only',base,'--',area).toString().trim(),'');
 assert.deepEqual(git('diff','--name-only',base,'--','courses/onec-education').toString().trim().split(/\r?\n/),['courses/onec-education/candidate.css'],'Only the MASTER-approved stylesheet import changes');
 const approved=[id,'onec.p2.topic-3','onec.p2.topic-4','onec.p2.numbers-dates-locales','onec.p3.topic-1','onec.p3.topic-2','onec.p3.topic-3','onec.p3.topic-4','onec.p3.module-tests','onec.p4.topic-1','onec.p4.topic-2','onec.p4.topic-3','onec.p4.topic-4','onec.p5.topic-1','onec.p5.topic-2','onec.p5.topic-3','onec.p5.topic-4','onec.p6.topic-1','onec.p6.topic-2','onec.p6.topic-3','onec.p6.topic-4','onec.p6.reposting','onec.p7.topic-1','onec.p7.topic-3','onec.p7.topic-4','onec.p8.topic-1','onec.p8.topic-2','onec.p8.topic-3','onec.p8.topic-4','onec.p9.topic-1','onec.p9.topic-2','onec.p9.topic-3','onec.p9.topic-4','onec.p10.topic-1','onec.p10.topic-2','onec.p10.topic-3','onec.p10.topic-4','onec.p10.safe-mode'].flatMap(topic=>['en','ru'].map(l=>`courses/clarity/lessons/${topic}.${l}.json`));
 assert.deepEqual(git('diff','--name-only',base,'--','courses/clarity/lessons').toString().trim().split(/\r?\n/).sort(),approved.sort());
 const acceptedTypes=['authoring','lessons'].flatMap(dir=>['en','ru'].map(l=>`courses/clarity/${dir}/${id}.${l}.json`));
 assert.equal(git('diff','--name-only','7bafbe88e2eb07c972c33525afb8f0de365faa31','--',...acceptedTypes).toString().trim(),'','Accepted types edition remains byte-identical');
});
test('P2 types сохраняет исходную теорию и вопросы, согласует новую попытку и маршрут возврата',async()=>{
 for(const locale of ['ru','en']){
  const a=await json(`courses/clarity/authoring/${id}.${locale}.json`),l=await json(`courses/clarity/lessons/${id}.${locale}.json`),g=await json(a.source.path);
  assert.equal(hash(await readFile(a.source.path)),a.source.sha256);
  for(const field of ['sections','selfcheck','practice','reading','assessment'])assert.deepEqual(l[field],a[field]);
  assert.equal(l.authored,true);assert.equal(l.contentRevision,CLARITY_COURSES[id].contentRevision);
  assert.deepEqual(a.sourceCoverage.map(s=>s.sourceTitle),g.sections.map(s=>s[0]));
  const anchors=new Set(a.sections.map(s=>s.id));assert.equal(anchors.size,a.sections.length);
  for(const anchor of [...Object.values(a.coverage),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(anchor));
  for(const [i,q]of g.quiz.entries()){
   const retained=a.selfcheck.find(q=>q.id==='check-'+i);assert.deepEqual([retained.prompt,retained.options,retained.correct],[q.question,q.options,q.correct]);
  }
  const choices=a.selfcheck.filter(q=>q.kind==='choice');assert.equal(choices.length,5);
  assert.deepEqual(a.assessment.quiz.map(q=>[q.question,q.options,q.correct]),choices.map(q=>[q.prompt,q.options,q.correct]));
  assert.equal(a.assessment.contentRevision,a.revision);
  const answers=choices.map(q=>q.correct);assert.equal(gradeQuiz(a.assessment.quiz,answers).correct,5);
  answers[0]=(answers[0]+1)%choices[0].options.length;assert.equal(gradeQuiz(a.assessment.quiz,answers).correct,4);
 }
});
test('Самостоятельный эталон связан с новым фактическим native evidence, заготовка сохраняет место для решения',async()=>{
 const result=await json('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P2_TYPES_NATIVE_RESULT.json');
 const sources=await json('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P2_TYPES_CASE_SOURCES.json');
 const ui=await json('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P2_TYPES_PLAIN_UI.json');
 const nativeSources='docs/ru/03-content/cpp-clarity-01/R3_EVIDENCE/onec-p2-types/native/CASE_SOURCES.json';
 assert.equal(hash(await readFile(nativeSources)),result.sourceManifestSha256);
 assert.deepEqual(await json(nativeSources),sources,'Редакционная копия сохраняет значения исходного native manifest');
 assert.equal(result.status,'NATIVE AUTOMATED PASS');assert.equal(result.cases.length,6);
 assert.equal(hash(await readFile('docs/ru/03-content/cpp-clarity-01/R3_EVIDENCE/onec-p2-types/native/ACTUAL_NATIVE_qa-all.txt')),result.actualLogSha256);
 assert.equal(hash(await readFile('docs/ru/03-content/cpp-clarity-01/R3_EVIDENCE/onec-p2-types/native/BATCH_HARNESS_FINAL.bsl')),sources.harnessSha256);
 assert.equal(ui.status,'NATIVE UI PASS');assert.deepEqual(ui.actualMessages,['25','Строка','Строка']);assert.equal(ui.qaHarnessPresentInThisRun,false);
 const reference=sources.cases.find(c=>c.id==='independent');assert.equal(hash(reference.fullSource),reference.sha256);assert.equal(ui.fullStudentHandlerSourceSha256,reference.sha256);
 assert.deepEqual(result.cases.map(c=>[c.case,c.value]),[['example30','45'],['variation20','35'],['independent','25'],['zero','7'],['negative','6'],['invalid',null]]);
 for(const locale of ['ru','en']){
  const a=await json(`courses/clarity/authoring/${id}.${locale}.json`);
  assert.equal(a.practice.referenceSolution.source,reference.fullSource);assert.equal(a.practice.referenceSolution.language,'bsl');
  assert.notEqual(a.practice.files[0].content,reference.fullSource);assert.match(a.practice.files[0].content,/TODO/);
  assert.deepEqual(a.practice.cases.slice(0,2).map(c=>c.output),['25\nСтрока\nСтрока','7\nСтрока\nСтрока']);
  assert.ok(a.practice.cases.every(c=>!c.output.includes('\\n')),'Readable observations, no JSON escape strings');
  assert.equal(a.practice.steps.length,5);assert.ok(a.practice.steps.every(s=>s.action&&s.why&&s.expected));
  const main=a.sections.find(s=>s.id==='example-1');assert.equal(main.code.source,sources.cases.find(c=>c.id==='example30').body);assert.equal(main.code.output,'Число\nСтрока\n45');
  assert.equal(a.sections.find(s=>s.id==='variation').code.source,sources.cases.find(c=>c.id==='variation20').body);
 }
});
test('Преобразуемый отрицательный ввод и неверный текст не подменены нулём или успешным приёмом длительности',async()=>{
 const result=await json('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P2_TYPES_NATIVE_RESULT.json');
 assert.equal(result.cases.find(c=>c.case==='negative').value,'6');
 assert.ok(result.cases.every(c=>c.durationBusinessRuleAutomaticallyGraded===false));
 assert.equal(result.cases.find(c=>c.case==='invalid').status,'EXPECTED CONVERSION ERROR');
 for(const locale of ['ru','en']){
  const a=await json(`courses/clarity/authoring/${id}.${locale}.json`),negative=a.practice.cases[2],invalid=a.practice.cases[3];
  assert.match(negative.input,/-1/);assert.match(negative.output,/^6\n/);assert.ok(negative.output.includes(locale==='ru'?'не отклоняет':'does not reject'));
  assert.ok(invalid.output.includes(locale==='ru'?'не получены':'not produced'));assert.ok(a.sections.find(s=>s.id==='input-limits').paragraphs.length>=3);
 }
});
test('P2 types: смысловая SVG и подлинные локальные снимки не раскрывают эталонный код до попытки',async()=>{
 const captures=await json('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P2_TYPES_NATIVE_CAPTURES.json');
 const matrix=await json('docs/ru/03-content/cpp-clarity-01/R65_VISUAL_EDU_MATRIX.json');assert.equal(matrix.rows.length,151);
 const row=matrix.rows.find(row=>row.id===id);assert.equal(row.visualAcceptance,'CONTENT / VISUAL ACCEPT at7bafbe88; accepted source unchanged');assert.ok(row.required.length&&row.implemented.length&&row.verified.length&&row.missing.length);
 for(const locale of ['ru','en']){
  const a=await json(`courses/clarity/authoring/${id}.${locale}.json`),flows=a.sections.filter(s=>s.flow),figures=a.sections.flatMap(s=>s.figures||[]);
  assert.equal(flows.length,1);assert.equal(figures.length,2);
  const markup=learningFlowMarkup(flows[0].flow);assert.match(markup,/<svg[\s\S]*<desc>/);assert.match(markup,/<ol>/);assert.equal(flows[0].flow.alternative.length,4);
  for(const f of figures){
   assert.ok(f.caption.length>30&&f.alt.length>30);assert.equal(f.sha256,captures.images.find(c=>c.src===f.src).sha256);assert.equal(hash(await readFile('courses/clarity/'+f.src)),f.sha256);
   assert.equal(f.uiLocale,'ru');assert.equal(f.platformVersion,'8.3.27.2214');
   assert.match(lessonFiguresMarkup([f],locale,false,new URL('../courses/clarity/',import.meta.url),true),/onec-shot-scroll/);
   assert.ok(!f.src.includes('native-module'),'Complete independent solution image stays in review evidence');
  }
 }
});
