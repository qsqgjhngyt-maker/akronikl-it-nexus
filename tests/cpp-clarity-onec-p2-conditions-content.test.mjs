import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
import {gradeQuiz} from '../courses/onec-education/model.mjs';
import {authoredMarkup,authoredStyles} from '../core/cpp-clarity-authored.mjs';
import {lessonFiguresMarkup} from '../courses/onec-education/lesson-media.mjs';
const id='onec.p2.topic-3',base='35773232b90863d9a4b2991fd2e0e022a97aadb5';
const json=async p=>JSON.parse(await readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{maxBuffer:64e6});
const nativeRoot='docs/ru/03-content/cpp-clarity-01/R3_EVIDENCE/onec-p2-conditions/native/';
const author=locale=>json('courses/clarity/authoring/'+id+'.'+locale+'.json');

test('Условия: ровно согласованная пара; принятые курсы и общий экран неизменны',()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','review/cpp-clarity-r3','core/cpp-clarity-r3-renderer.mjs','core/storage.js','core/clarity-course-progress.mjs','project-studio','sandbox/qt','pwa'])assert.equal(git('diff','--name-only',base,'--',area).toString().trim(),'',area);
 assert.deepEqual(git('diff','--name-only',base,'--','courses/onec-education').toString().trim().split(/\r?\n/),['courses/onec-education/candidate.css'],'Only the MASTER-approved stylesheet import changes');
 assert.deepEqual(git('diff','--name-only',base,'--','courses/clarity/lessons').toString().trim().split(/\r?\n/).sort(),[id,'onec.p2.topic-4','onec.p2.numbers-dates-locales','onec.p3.topic-1','onec.p3.topic-2','onec.p3.topic-3','onec.p3.topic-4','onec.p3.module-tests','onec.p4.topic-1','onec.p4.topic-2','onec.p4.topic-3','onec.p4.topic-4','onec.p5.topic-1','onec.p5.topic-2','onec.p5.topic-3','onec.p5.topic-4','onec.p6.topic-1','onec.p6.topic-2','onec.p6.topic-3','onec.p6.topic-4','onec.p6.reposting','onec.p7.topic-1','onec.p7.topic-3','onec.p7.topic-4','onec.p8.topic-1','onec.p8.topic-2','onec.p8.topic-3','onec.p8.topic-4','onec.p9.topic-1','onec.p9.topic-2','onec.p9.topic-3','onec.p9.topic-4','onec.p10.topic-1','onec.p10.topic-2','onec.p10.topic-3','onec.p10.topic-4','onec.p10.safe-mode','onec.p11.topic-1','onec.p11.topic-2','onec.p11.topic-3','onec.p11.topic-4'].flatMap(topic=>['en','ru'].map(l=>'courses/clarity/lessons/'+topic+'.'+l+'.json')).sort());
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

test('Визуальное исправление сохраняет CONTENT ACCEPT и добавляет только две layout-настройки на язык',async()=>{
 const accepted='5ffd3153577c411f6a3031c517542904f6b59c23';
 for(const locale of ['ru','en'])for(const dir of ['authoring','lessons']){
  const p='courses/clarity/'+dir+'/'+id+'.'+locale+'.json',current=await json(p),old=JSON.parse(git('show',accepted+':'+p));let changed=0;
  for(const s of current.sections)if(s.flowchart){assert.equal(s.flowchart.layout,'roomy');delete s.flowchart.layout;changed++;}
  assert.equal(changed,2);assert.deepEqual(current,old,'Accepted semantics and revision: '+p);
 }
 const p='courses/onec-education/candidate.css',old=git('show',accepted+':'+p).toString();
 assert.equal(await readFile(p,'utf8'),"@import url('../../styles/clarity-onec-code-studio.css');\n@import url('../../styles/clarity-onec-p2-types.css');\n"+old);
 const css=await readFile('styles/clarity-onec-code-studio.css','utf8');
 assert.equal(hash(css),'403f23e6146c6737685cb0305f32ed77d3a1a4c6327470d8d69da59209f78a84');
 assert.match(css,/\.onec-integrated\s*\{/);
 assert.equal(git('diff','--name-only',accepted,'--','styles/app.css','sandbox/code-studio.js','core/cpp-clarity-r3-renderer.mjs').toString().trim(),'');
});

test('Opt-in геометрия не меняет прежний HTML и CSS авторских уроков',async()=>{
 const previous=git('show','5ffd3153577c411f6a3031c517542904f6b59c23:core/cpp-clarity-authored.mjs').toString().replace("'./clarity-visuals.mjs'",JSON.stringify(new URL('../core/clarity-visuals.mjs',import.meta.url).href));
 const prior=await import('data:text/javascript;base64,'+Buffer.from(previous).toString('base64'));
 assert.equal(authoredStyles,prior.authoredStyles);
 const currentVisuals=await import('../core/clarity-visuals.mjs'),priorVisuals=await import('data:text/javascript;base64,'+Buffer.from(git('show','5ffd3153577c411f6a3031c517542904f6b59c23:core/clarity-visuals.mjs')).toString('base64'));
 assert.equal(currentVisuals.learningVisualStyles,priorVisuals.learningVisualStyles);
 const render={code:(...a)=>JSON.stringify(a),table:t=>JSON.stringify(t),url:(...a)=>JSON.stringify(a),programBundle:p=>JSON.stringify(p),figures:f=>JSON.stringify(f)};
 const {readdir}=await import('node:fs/promises');let compared=0;
 for(const folder of ['courses/clarity/lessons','courses/cpp-clarity-r3/lessons'])for(const name of await readdir(folder)){
  if(!name.endsWith('.json'))continue;const lesson=await json(folder+'/'+name);if(!lesson.authored)continue;
  if([id,'onec.p3.topic-4','onec.p3.module-tests','onec.p5.topic-4','onec.p6.topic-4','onec.p7.topic-1','onec.p8.topic-4'].includes(lesson.id))for(const s of lesson.sections)if(s.flowchart)delete s.flowchart.layout;
  for(const s of lesson.sections)if(s.flow&&s.flow.kind!=='while-cycle')assert.equal(currentVisuals.learningFlowMarkup(s.flow),priorVisuals.learningFlowMarkup(s.flow),name+' existing flow');
  const a=authoredMarkup(lesson,render),b=prior.authoredMarkup(lesson,render);
  assert.equal(a.explanation(),b.explanation(),name);assert.equal(a.reading(),b.reading(),name);
  for(const s of lesson.sections)assert.deepEqual(a.recall(s.id),b.recall(s.id),name+' '+s.id);
  compared++;
 }
 assert.ok(compared>=144);
});
