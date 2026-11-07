import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
import {gradeQuiz} from '../courses/onec-education/model.mjs';
import {authoredMarkup} from '../core/cpp-clarity-authored.mjs';
import {lessonFiguresMarkup} from '../courses/onec-education/lesson-media.mjs';
const id='onec.p2.topic-3',base='35773232b90863d9a4b2991fd2e0e022a97aadb5';
const json=async p=>JSON.parse(await readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{maxBuffer:64e6});
const nativeRoot='docs/ru/03-content/cpp-clarity-01/R3_EVIDENCE/onec-p2-conditions/native/';
const author=locale=>json('courses/clarity/authoring/'+id+'.'+locale+'.json');

test('Условия: ровно согласованная пара; принятые курсы и общий экран неизменны',()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/storage.js','core/clarity-course-progress.mjs','project-studio','sandbox/qt','pwa'])assert.equal(git('diff','--name-only',base,'--',area).toString().trim(),'',area);
 assert.deepEqual(git('diff','--name-only',base,'--','courses/clarity/lessons').toString().trim().split(/\r?\n/).sort(),['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json'));
 for(const topic of ['onec.p1.architecture','onec.p1.infobase','onec.p1.lifecycle','onec.p1.tools','onec.p2.topic-2'])for(const dir of ['authoring','lessons'])for(const locale of ['ru','en'])assert.equal(git('diff','--name-only',base,'--','courses/clarity/'+dir+'/'+topic+'.'+locale+'.json').toString().trim(),'');
});

test('Условия: исходные вопросы сохранены, пять выборов и revision согласованы с реальным gradeQuiz',async()=>{
 for(const locale of ['ru','en']){
  const a=await author(locale),l=await json('courses/clarity/lessons/'+id+'.'+locale+'.json'),g=await json(a.source.path);
  assert.equal(hash(await readFile(a.source.path)),a.source.sha256);assert.equal(l.authored,true);assert.equal(l.contentRevision,a.revision);assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const key of ['sections','selfcheck','practice','reading','assessment'])assert.deepEqual(l[key],a[key]);
  assert.equal(a.sections.length,14);const anchors=new Set(a.sections.map(s=>s.id));assert.equal(anchors.size,14);
  for(const anchor of [...Object.values(a.coverage),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(anchor),anchor);
  assert.deepEqual(a.sourceCoverage.map(s=>s.sourceTitle),g.sections.map(s=>s[0]));
  for(const [i,q]of g.quiz.entries()){const retained=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([retained.prompt,retained.options,retained.correct],[q.question,q.options,q.correct]);}
  const choice=a.selfcheck.filter(q=>q.kind==='choice');assert.equal(choice.length,5);assert.ok(choice.every(q=>q.feedback.length>10));
  assert.deepEqual(a.assessment.quiz.map(q=>[q.question,q.options,q.correct]),choice.map(q=>[q.prompt,q.options,q.correct]));assert.equal(a.assessment.contentRevision,a.revision);
  const answers=choice.map(q=>q.correct);assert.equal(gradeQuiz(a.assessment.quiz,answers).correct,5);answers[0]=(answers[0]+1)%3;assert.equal(gradeQuiz(a.assessment.quiz,answers).correct,4);
  assert.match(a.sections.find(s=>s.id==='rule').paragraphs.join(' '),locale==='ru'?/цел/:/integer/);
 }
});

test('Условия: 18 исходных тел и четыре мутации связаны с подлинным native протоколом и двумя GUI запусками',async()=>{
 const sources=await json(nativeRoot+'CASE_SOURCES.json'),result=await json('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P2_CONDITIONS_NATIVE_RESULT.json');
 assert.equal(hash(await readFile(nativeRoot+'CASE_SOURCES.json')),result.sourceManifestSha256);
 assert.equal(hash(await readFile(nativeRoot+'ACTUAL_NATIVE_qa-all.txt')),result.actualLogSha256);
 assert.equal(hash(await readFile(nativeRoot+'BATCH_HARNESS_FINAL.bsl')),result.harnessSha256);
 assert.equal(result.status,'NATIVE AUTOMATED PASS + PLAIN HANDLER GUI PASS');assert.equal(result.cases.length,18);assert.equal(result.GUIVerified,true);
 const log=await readFile(nativeRoot+'ACTUAL_NATIVE_qa-all.txt','utf8'),harness=await readFile(nativeRoot+'BATCH_HARNESS_FINAL.bsl','utf8');
 for(const c of sources.cases){
  assert.equal(hash(c.fullSource),c.sha256);assert.equal(hash(c.body),c.bodySha256);
  assert.ok(harness.includes(c.body.split('\n').filter(Boolean).map(line=>'    '+line+'\n').join('')));
  assert.ok(log.includes('VALUE:'+c.id+':'+c.expectedOutput));assert.equal(result.cases.find(x=>x.id===c.id).actualValue,c.expectedOutput);
 }
 assert.equal(result.mutants.length,4);assert.ok(result.mutants.every(m=>m.detected&&m.wrongActual!==m.correctActual));
 assert.equal(result.studentAuthorshipVerified,false);assert.equal(result.arbitraryTypesOrFormatsValidated,false);
 for(const name of ['main0','independent31']){const c=sources.cases.find(c=>c.id===name),ui=result.GUI[name];assert.equal(ui.fullStudentHandlerSourceSha256,c.sha256);assert.deepEqual(ui.actualMessages,[c.expectedOutput]);assert.equal(ui.qaHarnessPresent,false);assert.equal(ui.designer.actualEditorTextMatched,true);}
});

test('Условия: полные примеры, TODO и новый эталон различаются; все семь наблюдений читаемы',async()=>{
 const sources=await json(nativeRoot+'CASE_SOURCES.json'),byid=Object.fromEntries(sources.cases.map(c=>[c.id,c]));
 for(const locale of ['ru','en']){
  const a=await author(locale);
  for(const [anchor,caseId]of [['example-1','main0'],['variation','main61'],['wrong-order','wrong-order-zero']]){const code=a.sections.find(s=>s.id===anchor).code;assert.equal(code.source,byid[caseId].fullSource);assert.equal(code.output,byid[caseId].expectedOutput);}
  assert.match(byid.main0.body,/1440/);assert.match(byid.independent31.body,/180/);assert.match(byid.independent31.body,/<= 30/);
  assert.equal(a.practice.referenceSolution.source,byid.independent31.fullSource);assert.notEqual(a.practice.files[0].content,a.practice.referenceSolution.source);assert.match(a.practice.files[0].content,/TODO/);
  assert.equal(a.practice.cases.length,7);assert.deepEqual(a.practice.cases.map(c=>c.output),['Ошибка','Без затрат','Срочно','Срочно','Обычно','Обычно','Ошибка']);
  assert.deepEqual(a.practice.cases.map(c=>Number(c.input.match(/= (-?\d+);/)[1])),[-1,0,1,30,31,180,181]);
  assert.ok([...a.practice.criteria,...a.practice.cases.map(c=>c.output)].every(s=>!s.includes('\\n')));
  assert.ok(a.sections.find(s=>s.id==='example-1').tables[0].rows.some(row=>row.includes(locale==='ru'?'Не выполняется':'Not evaluated')));
 }
});

test('Условия: две локальные SVG имеют настоящие ветви и альтернативы; native снимки относятся только к main0',async()=>{
 const captures=await json('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P2_CONDITIONS_NATIVE_CAPTURES.json');
 for(const locale of ['ru','en']){
  const a=await author(locale),charts=a.sections.filter(s=>s.flowchart),figures=a.sections.flatMap(s=>s.figures||[]);
  assert.equal(charts.length,2);assert.equal(figures.length,2);assert.match(charts[0].flowchart.decisions[0].condition,/1440/);assert.match(charts[1].flowchart.decisions[0].condition,/180/);
  assert.equal(charts[0].flowchart.decisions[2].condition,'≤ 60');assert.equal(charts[1].flowchart.decisions[2].condition,'≤ 30');
  const markup=authoredMarkup(a,{code:()=>'',table:()=>'',url:()=>'#',programBundle:()=>''}).explanation();
  assert.equal((markup.match(/class="lesson-flowchart"/g)||[]).length,2);assert.equal((markup.match(/class="flowchart-decision"/g)||[]).length,6);assert.equal((markup.match(/<desc>/g)||[]).length,2);
  for(const f of figures){
   assert.equal(f.assetRoot,'clarity');assert.equal(hash(await readFile('courses/clarity/'+f.src)),f.sha256);const capture=captures.images.find(c=>c.src===f.src);assert.equal(capture.sha256,f.sha256);assert.equal(capture.sourceCase,'main0');
   assert.equal(hash(await readFile('docs/ru/03-content/cpp-clarity-01/'+capture.sourceCapture)),capture.sourcePngSha256);assert.ok(f.alt.length>30&&f.caption.length>30);assert.equal(f.uiLocale,'ru');assert.equal(f.platformVersion,'8.3.27.2214');
   assert.match(lessonFiguresMarkup([f],locale,false,new URL('../courses/clarity/',import.meta.url),true),/onec-shot-scroll/);assert.ok(!f.src.includes('independent'));
  }
 }
});

test('Условия: шаги точно различают Nexus, редактор, клиент и фиксацию результата',async()=>{
 for(const locale of ['ru','en']){
  const a=await author(locale),steps=a.practice.steps;assert.equal(steps.length,5);assert.equal(new Set(steps.map(s=>s.where)).size,5);assert.ok(steps.every(s=>s.action&&s.why&&s.expected));
  assert.match(steps[0].where,/Nexus/);assert.match(steps[1].where,locale==='ru'?/Конфигуратор/:/Designer/);assert.match(steps[2].where,/ПриНачалеРаботыСистемы/);assert.match(steps[3].where,/F7.*F5/);assert.match(steps[4].where,locale==='ru'?/Фиксация результата/:/Result recording/);
  assert.ok(a.selfcheck.find(q=>q.kind==='free').feedback.includes(locale==='ru'?'не оценивается автоматически':'not graded automatically'));
 }
});
