import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
import {gradeQuiz} from '../courses/onec-education/model.mjs';
import {learningFlowMarkup} from '../core/clarity-visuals.mjs';
const base='c8d6ee888a14229c066d2a16df0a5b9c3c79717b',ids=['onec.p2.topic-4','onec.p2.numbers-dates-locales'];
const root='docs/ru/03-content/cpp-clarity-01/',native=root+'R3_EVIDENCE/onec-p2-module/native/';
const json=async p=>JSON.parse(await readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{maxBuffer:64e6});
const author=(id,l)=>json('courses/clarity/authoring/'+id+'.'+l+'.json');

test('P2 модуль: точные две новые пары, принятые материалы и защищённые contracts сохранены',()=>{
 for(const path of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','review/cpp-clarity-r3','core/cpp-clarity-r3-renderer.mjs','styles/app.css','sandbox/code-studio.js','core/storage.js','core/account-storage.js','project-studio','pwa','sync','server-access'])assert.equal(git('diff','--name-only',base,'--',path).toString().trim(),'',path);
 for(const id of ['onec.p1.architecture','onec.p1.infobase','onec.p1.lifecycle','onec.p1.tools','onec.p2.topic-2'])for(const dir of ['authoring','lessons'])for(const l of ['ru','en'])assert.equal(git('diff','--name-only',base,'--','courses/clarity/'+dir+'/'+id+'.'+l+'.json').toString().trim(),'');
 const approved=[...ids,'onec.p2.topic-3','onec.p3.topic-1','onec.p3.topic-2','onec.p3.topic-3','onec.p3.topic-4','onec.p3.module-tests','onec.p4.topic-1','onec.p4.topic-2','onec.p4.topic-3','onec.p4.topic-4','onec.p5.topic-1','onec.p5.topic-2','onec.p5.topic-3','onec.p5.topic-4','onec.p6.topic-1','onec.p6.topic-2','onec.p6.topic-3','onec.p6.topic-4','onec.p6.reposting','onec.p7.topic-1','onec.p7.topic-3','onec.p7.topic-4','onec.p8.topic-1','onec.p8.topic-2','onec.p8.topic-3','onec.p8.topic-4','onec.p9.topic-1','onec.p9.topic-2','onec.p9.topic-3','onec.p9.topic-4','onec.p10.topic-1','onec.p10.topic-2','onec.p10.topic-3','onec.p10.topic-4','onec.p10.safe-mode'].flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')).sort();
 assert.deepEqual(git('diff','--name-only',base,'--','courses/clarity/lessons').toString().trim().split(/\r?\n/).sort(),approved);
});

test('P2 модуль: обе RU/EN редакции связны, исходные вопросы сохранены, реальный gradeQuiz согласован',async()=>{
 for(const id of ids)for(const l of ['ru','en']){
  const a=await author(id,l),derived=await json('courses/clarity/lessons/'+id+'.'+l+'.json'),old=await json(a.source.path);
  assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(derived.authored,true);
  assert.equal(derived.contentRevision,CLARITY_COURSES[id].contentRevision);assert.equal(a.revision,derived.contentRevision);
  for(const key of ['sections','selfcheck','practice','reading','assessment'])assert.deepEqual(derived[key],a[key],key);
  assert.equal(a.sections.length,15);assert.ok(a.sections.every(s=>s.paragraphs.length>=2));
  const anchors=new Set(a.sections.map(s=>s.id));assert.equal(anchors.size,15);
  for(const anchor of [...Object.values(a.coverage),...a.sourceCoverage.map(s=>s.anchor),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(anchor),anchor);
  assert.deepEqual(a.sourceCoverage.map(s=>s.sourceTitle),old.sections.map(s=>s[0]));
  for(const [i,q]of old.quiz.entries()){const kept=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([kept.prompt,kept.options,kept.correct],[q.question,q.options,q.correct]);}
  const choice=a.selfcheck.filter(q=>q.kind==='choice');assert.equal(choice.length,5);
  assert.deepEqual(a.assessment.quiz.map(q=>[q.question,q.options,q.correct]),choice.map(q=>[q.prompt,q.options,q.correct]));
  const answers=choice.map(q=>q.correct);assert.equal(gradeQuiz(a.assessment.quiz,answers).correct,5);answers[0]=(answers[0]+1)%3;assert.equal(gradeQuiz(a.assessment.quiz,answers).correct,4);
  assert.ok(a.selfcheck.find(q=>q.kind==='free').feedback.includes(l==='ru'?'не оценивается автоматически':'not graded automatically'));
 }
});

test('P2 модуль: 22 конечных тела и четыре полных GUI обработчика связаны с точными source/log hashes',async()=>{
 const sources=await json(root+'R65_ONEC_P2_MODULE_CASE_SOURCES.json'),result=await json(root+'R65_ONEC_P2_MODULE_NATIVE_RESULT.json');
 assert.equal(result.status,'NATIVE AUTOMATED PASS + PLAIN HANDLER GUI PASS');assert.equal(result.cases.length,22);assert.equal(result.guiCases,4);
 assert.equal(sha(await readFile(native+'CASE_SOURCES.json')),result.sourceManifestSha256);
 assert.equal(sha(await readFile(native+result.nativeLog)),result.actualLogSha256);assert.equal(sha(await readFile(native+'BATCH_HARNESS_FINAL.bsl')),result.harnessSha256);
 const harness=await readFile(native+'BATCH_HARNESS_FINAL.bsl','utf8'),log=await readFile(native+result.nativeLog,'utf8');
 for(const c of sources.cases){
  assert.equal(sha(c.fullSource),c.sha256);assert.equal(sha(c.body),c.bodySha256);
  assert.equal(sha(await readFile(native+'cases/'+c.id+'.bsl')),c.sha256);
  assert.ok(harness.includes(c.body.split('\n').filter(Boolean).map(line=>'    '+line+'\n').join('')),c.id);
  assert.ok(log.includes('VALUE:'+c.id+':'+c.expectedValue),c.id);assert.equal(result.cases.find(v=>v.id===c.id).actualValue,c.expectedValue);
 }
 for(const [name,gui]of Object.entries(result.GUI)){const c=sources.cases.find(c=>c.id===name);assert.equal(gui.sourceSha256,c.sha256);assert.equal(gui.designer.fullSourceMatched,true);assert.deepEqual(gui.actualMessages,c.expectedMessages);assert.equal(gui.qaHarnessPresent,false);}
 assert.equal(result.studentAuthorshipVerified,false);assert.equal(result.arbitraryTypesOrFormatsValidated,false);
 assert.match(sources.notExecuted,/не исполняется/);
});

test('P2 модуль: первые неуспешные форматы не подменены успешными ожиданиями',async()=>{
 const before=await json(native+'FIRST_FAILED_CASE_SOURCES.json'),text=await readFile(native+'FIRST_FAILED_ACTUAL_NATIVE_qa-all.txt','utf8');
 const failed=before.cases.filter(c=>{const line=text.split(/\r?\n/).find(s=>s.startsWith('VALUE:'+c.id+':'));return line?.slice(('VALUE:'+c.id+':').length)!==c.expectedValue;});
 assert.equal(failed.length,4);assert.ok(failed.every(c=>c.id.startsWith('dates-')));
 const probe=await readFile(native+'ACTUAL_FORMAT_PROBE.txt','utf8');assert.ok(probe.includes('latin-unquoted:01.12.2026 0:02:00'));assert.ok(probe.includes('latin-single-quotes:01.12.2026 00:02:00'));
 for(const l of ['ru','en']){const a=await author(ids[1],l);assert.match(a.practice.referenceSolution.source,/ДФ='dd\.MM\.yyyy HH:mm:ss'/);assert.equal(a.practice.cases[0].output.split('\n')[0],'01.12.2026 00:02:00');}
});

test('P2 модуль: TODO, основной пример, самостоятельный эталон и изменённые входы различаются',async()=>{
 const m=await json(root+'R65_ONEC_P2_MODULE_CASE_SOURCES.json'),byid=Object.fromEntries(m.cases.map(c=>[c.id,c]));
 for(const l of ['ru','en']){
  const loop=await author(ids[0],l),dates=await author(ids[1],l);
  assert.equal(loop.sections.find(s=>s.id==='example-1').code.source,byid['loops-main3'].fullSource);
  assert.equal(loop.practice.referenceSolution.source,byid['loops-independent4'].fullSource);
  assert.deepEqual(loop.practice.cases.map(c=>c.output),['10','15','0','1']);
  assert.equal(dates.sections.find(s=>s.id==='example-1').code.source,byid['dates-main60'].fullSource);
  assert.equal(dates.practice.referenceSolution.source,byid['dates-independent210'].fullSource);
  assert.deepEqual(dates.practice.cases.map(c=>c.output.split('\n')[1]),['210','0','90','330']);
  for(const a of [loop,dates]){
   assert.notEqual(a.practice.files[0].content,a.practice.referenceSolution.source);assert.match(a.practice.files[0].content,/TODO/);
   assert.notEqual(a.practice.files[0].content,a.sections.find(s=>s.id==='example-1').code.source);
   assert.ok(a.practice.criteria.every(s=>!s.includes('\\n')));
   const steps=a.practice.steps;assert.equal(steps.length,5);assert.equal(new Set(steps.map(s=>s.where)).size,5);
   assert.match(steps[0].where,/Nexus/);assert.match(steps[1].where,/Открыть модуль приложения/);assert.match(steps[2].where,/ПриНачалеРаботыСистемы/);assert.match(steps[3].where,/F7.*F5/);
  }
 }
});

test('P2 модуль: наглядность включает настоящий цикл, шкалы времени и только подлинные фото основного примера',async()=>{
 const media=await json(root+'R65_ONEC_P2_MODULE_NATIVE_CAPTURES.json');assert.equal(media.images.length,4);
 for(const id of ids)for(const l of ['ru','en']){
  const a=await author(id,l),figures=a.sections.flatMap(s=>s.figures||[]);assert.equal(figures.length,2);
  for(const f of figures){assert.equal(f.assetRoot,'clarity');assert.equal(sha(await readFile('courses/clarity/'+f.src)),f.sha256);const source=media.images.find(x=>x.src===f.src);assert.equal(source.sha256,f.sha256);assert.ok(['loops-main3','dates-main60'].includes(source.sourceCase));assert.equal(sha(await readFile(root+source.sourceCapture)),source.sourcePngSha256);assert.ok(f.alt.length>30&&f.caption.length>30);}
  const flows=a.sections.filter(s=>s.flow).map(s=>s.flow);assert.equal(flows.length,id===ids[0]?1:3);
  if(id===ids[0]){assert.equal(flows[0].kind,'while-cycle');const svg=learningFlowMarkup(flows[0]);assert.match(svg,/data-flow-edge="return"/);assert.match(svg,/data-flow-edge="exit"/);assert.match(svg,/data-flowchart-node="initial"/);assert.match(svg,/<desc>/);}
  else assert.ok(flows.every(f=>f.nodes.every(n=>n.lines.length===1)));
 }
});
