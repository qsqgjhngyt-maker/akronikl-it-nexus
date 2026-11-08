import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
import {gradeQuiz} from '../courses/onec-education/model.mjs';
import {lessonFiguresMarkup} from '../courses/onec-education/lesson-media.mjs';
const ids=['onec.p3.topic-1','onec.p3.topic-2','onec.p3.topic-3','onec.p3.topic-4','onec.p3.module-tests'];
const base='6c2bd97e75dd7bf55bb2ec9da7a6984d273cdb4a',root='docs/ru/03-content/cpp-clarity-01/',native=root+'R3_EVIDENCE/onec-p3-module/native/';
const json=async p=>JSON.parse(await readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const author=(id,l)=>json('courses/clarity/authoring/'+id+'.'+l+'.json');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});

test('P3: только пять новых пар; принятые курсы, контракты и матовый экран сохранены',()=>{
 for(const p of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','styles','sandbox','core/storage.js','core/account-storage.js','pwa','project-studio','sync','server-access'])assert.equal(git('diff','--name-only',base,'--',p).toString().trim(),'',p);
 const expected=[...ids,'onec.p4.topic-1','onec.p4.topic-2','onec.p4.topic-3','onec.p4.topic-4','onec.p5.topic-1','onec.p5.topic-2','onec.p5.topic-3','onec.p5.topic-4','onec.p6.topic-1','onec.p6.topic-2','onec.p6.topic-3','onec.p6.topic-4','onec.p6.reposting'].flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')).sort();
 assert.deepEqual(git('diff','--name-only',base,'--','courses/clarity/lessons').toString().trim().split(/\r?\n/).sort(),expected);
});

test('P3: связные RU/EN уроки, сохранённые исходные вопросы, явный прогноз и независимая работа',async()=>{
 for(const id of ids)for(const l of ['ru','en']){
  const a=await author(id,l),d=await json('courses/clarity/lessons/'+id+'.'+l+'.json'),old=await json(a.source.path);
  assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(d.authored,true);assert.equal(a.revision,d.contentRevision);assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const k of ['sections','selfcheck','practice','reading','assessment'])assert.deepEqual(d[k],a[k]);
  const anchors=new Set(a.sections.map(s=>s.id));assert.equal(anchors.size,15);assert.ok(a.sections.every(s=>s.paragraphs.length>=2));
  for(const anchor of [...Object.values(a.coverage),...a.sourceCoverage.map(s=>s.anchor),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(anchor),anchor);
  assert.deepEqual(a.sourceCoverage.map(s=>s.sourceTitle),old.sections.map(s=>s[0]));
  for(const [i,q]of old.quiz.entries()){const kept=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([kept.prompt,kept.options,kept.correct],[q.question,q.options,q.correct]);assert.deepEqual(a.sections.find(s=>s.id==='concept-'+i).paragraphs,old.sections[i].slice(1));}
  const choices=a.selfcheck.filter(q=>q.kind==='choice');assert.equal(choices.length,5);assert.equal(gradeQuiz(a.assessment.quiz,choices.map(q=>q.correct)).correct,5);
  assert.deepEqual(a.assessment.quiz.map(q=>[q.question,q.options,q.correct]),choices.map(q=>[q.prompt,q.options,q.correct]));
  assert.match(a.selfcheck.find(q=>q.kind==='free').feedback,l==='ru'?/не оценивается автоматически/:/not graded automatically/);
  assert.notEqual(a.practice.files[0].content,a.practice.referenceSolution.source);assert.match(a.practice.files[0].content,/TODO/);
  assert.ok(a.practice.cases.every(c=>!/(contexts|params|collections|exceptions|tests)-(independent|wrong)/.test(c.input)&&c.input.length>12));
  assert.ok(a.practice.criteria.every(c=>!c.includes('\\n')));
  assert.equal(a.practice.steps.length,id===ids[0]?6:5);
 }
});

test('P3: 42 точных QA исходника, первоначальные расхождения представления и отдельные десять GUI запусков',async()=>{
 const manifest=await json(native+'CASE_SOURCES.json'),qa=await json(native+'FINAL_NATIVE_BATCH_RESULT.json'),result=await json(root+'R65_ONEC_P3_MODULE_NATIVE_RESULT.json');
 assert.equal(qa.status,'NATIVE QA AUTOMATED PASS');assert.equal(qa.cases.length,42);assert.equal(qa.guiCases,0);
 assert.equal(sha(await readFile(native+'CASE_SOURCES.json')),qa.sourceManifestSha256);assert.equal(sha(await readFile(native+qa.nativeLog)),qa.actualLogSha256);
 for(const c of manifest.cases){assert.equal(sha(c.fullSource),c.sha256);assert.equal(sha(c.functions),c.functionsSha256);assert.equal(sha(c.body),c.bodySha256);assert.equal(sha(await readFile(native+'cases/'+c.id+'.bsl')),c.sha256);const observation=qa.cases.find(v=>v.id===c.id);assert.equal(observation.status,'PASS');if(c.expectedErrorContains){assert.ok(observation.actual.startsWith('ERROR:'+c.id+':'));assert.ok(observation.actual.includes(c.expectedErrorContains));}else assert.equal(observation.actual,c.expectedValue);}
 const first=await json(native+'FIRST_FAILED_CASE_SOURCES.json');for(const c of first.cases){const after=manifest.cases.find(x=>x.id===c.id);assert.equal(c.fullSource,after.fullSource);assert.equal(c.expectedValue,after.expectedValue);}
 const log=await readFile(native+'FIRST_FAILED_ACTUAL_NATIVE_qa-all.txt','utf8');assert.ok(log.includes('1\u00a0500'));assert.ok(log.includes('Не определено'));
 assert.equal(result.status,'NATIVE QA AUTOMATED PASS + PLAIN HANDLER GUI PASS');assert.equal(result.GUI.length,10);assert.equal(result.studentAuthorshipVerified,false);
 for(const gui of result.GUI){const c=manifest.cases.find(x=>x.id===gui.id);assert.equal(gui.sourceSha256,c.sha256);assert.equal(gui.qaHarnessPresent,false);assert.equal(sha(await readFile(root+gui.sourceCapture)),gui.sourcePngSha256);if(c.expectedMessages)assert.deepEqual(gui.actualMessages,c.expectedMessages);}
 const probe=await json(root+'R3_EVIDENCE/onec-p3-module/export-probe/RESULT.json');assert.equal(probe.status,'PASS');assert.equal(probe.privilegedChanged,false);
 const rejection=await readFile(root+'R3_EVIDENCE/onec-p3-module/export-probe/ACTUAL_WITHOUT_EXPORT.txt','utf8');assert.match(rejection,/Метод объекта не обнаружен \(Стоимость\)/);
 assert.equal((await readFile(root+'R3_EVIDENCE/onec-p3-module/export-probe/ACTUAL_RESTORED_EXPORT.txt','utf8')).trim(),'VALUE:600');
});

test('P3: контексты и наблюдаемые свойства различают результат, состояние, отсутствие ключа и ложный успех',async()=>{
 for(const l of ['ru','en']){
  const all=await Promise.all(ids.map(id=>author(id,l))),[ctx,params,collections,exceptions,tests]=all;
  assert.match(ctx.sections.find(s=>s.id==='concept-0').code.source,/Функция Стоимость.*Экспорт/);assert.equal(ctx.practice.files.length,2);assert.equal(Object.keys(ctx.practice.referenceSolution.files).length,2);
  assert.deepEqual(params.practice.cases.map(c=>c.output),['540\n45','800\n60','0\n0',l==='ru'?'Отказ: Неверные значения':'Rejection: Неверные значения']);
  assert.deepEqual(collections.practice.cases.map(c=>c.output),['10\n99\n2','7\n99\n1','empty\nempty\n0']);
  assert.match(collections.practice.referenceSolution.source,/Новый Массив/);assert.match(collections.practice.referenceSolution.source,/Количество\(\) > 0/);
  assert.equal(exceptions.sections.find(s=>s.id==='example-1').code.output,'Введите число минут, например 30\nНет');assert.match(exceptions.practice.referenceSolution.source,/ИсходныйТекст/);
  assert.equal(tests.practice.cases[0].output,'Пройдены шесть учебных проверок');assert.match(tests.practice.cases[1].output,/Не пройдено: занята часть/);
  for(const a of all){const diagrams=a.sections.filter(s=>s.flow||s.flowchart);assert.equal(diagrams.length,1);if(a.id===ids[3]||a.id===ids[4])assert.equal(diagrams[0].flowchart.layout,'roomy');}
 }
});

test('P3: подлинные фото относятся к основным примерам; решения лабораторных остаются по запросу',async()=>{
 const m=await json(root+'R65_ONEC_P3_MODULE_NATIVE_CAPTURES.json');assert.ok(m.images.length>=10);
 for(const id of ids)for(const l of ['ru','en']){const a=await author(id,l),figures=a.sections.flatMap(s=>s.figures||[]);assert.ok(figures.length>=2);for(const f of figures){const capture=m.images.find(c=>c.src===f.src);assert.ok(capture);assert.equal(capture.topicId,id);assert.equal(capture.kind,'worked-example');assert.equal(f.assetRoot,'clarity');assert.equal(sha(await readFile('courses/clarity/'+f.src)),f.sha256);assert.equal(sha(await readFile(root+capture.sourceCapture)),capture.sourcePngSha256);assert.ok(f.alt.length>30&&f.caption.length>30);assert.match(lessonFiguresMarkup([f],l),/data-onec-figure/);}}
});
