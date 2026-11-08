import {approvedPresentationDiff,approvedVisualStylesAddition,assertPreservedOrWrappedFlow} from './helpers/cpp-clarity-approved-presentation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gradeQuiz} from '../courses/onec-education/model.mjs';
import {lessonFiguresMarkup} from '../courses/onec-education/lesson-media.mjs';
import {learningFlowMarkup} from '../core/clarity-visuals.mjs';
import {curriculumForClarityProgress} from '../core/clarity-course-progress.mjs';
import {progressFor} from '../courses/onec-education/model.mjs';
const base='c72e65ab3cd65f4032d0446d3b6ac7e7acce42b5',slugs=['architecture','infobase','lifecycle','tools'];
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{maxBuffer:64e6});
const json=async p=>JSON.parse(await readFile(p)),hash=b=>createHash('sha256').update(b).digest('hex');
test('P1: счётчик принимает явную отметку новой редакции, сохраняя прежние отметки и не принимая неизвестные версии',async()=>{
 const c=await json('courses/onec/curriculum.json'),id='onec.p1.architecture',old=c.modules[0].topics[0].contentRevision,revision='onec-p1-author-v1';
 for(const [entry,done]of [[{completed:true,completionRevision:old},1],[{completed:true,completionRevision:revision},1],[{completed:true,completionRevision:'unknown'},0],[{completed:false,completionRevision:revision},0],[{completed:true,completionRevision:old,completionHistory:[{contentRevision:revision,kind:'self-reported'}]},1]]){
  const state={lessons:{[id]:entry}},before=JSON.stringify([c,state]);
  assert.equal(progressFor(curriculumForClarityProgress(c,state),state).done,done);assert.equal(JSON.stringify([c,state]),before,'No stored or original revision is rewritten');
 }
});
test('Принятая пара P1 и оба исходных курса сохраняются при отдельной новой редакции P2',()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','review/cpp-clarity-r3'])assert.equal(approvedPresentationDiff(git('diff','--name-only',base,'--',area)).toString().trim(),'');
 const changed=approvedPresentationDiff(git('diff','--name-only',base,'--','courses/clarity/lessons')).toString().trim().split(/\r?\n/).sort();
 const p1=slugs.flatMap(s=>['en','ru'].map(l=>`courses/clarity/lessons/onec.p1.${s}.${l}.json`));
 const p2Types=['en','ru'].map(l=>`courses/clarity/lessons/onec.p2.topic-2.${l}.json`);
 const p2Conditions=['en','ru'].map(l=>`courses/clarity/lessons/onec.p2.topic-3.${l}.json`);
 const p2Module=['onec.p2.topic-4','onec.p2.numbers-dates-locales'].flatMap(id=>['en','ru'].map(l=>`courses/clarity/lessons/${id}.${l}.json`));
 assert.deepEqual(changed,[...p1,...p2Types,...p2Conditions,...p2Module,...['onec.p3.topic-1','onec.p3.topic-2','onec.p3.topic-3','onec.p3.topic-4','onec.p3.module-tests','onec.p4.topic-1','onec.p4.topic-2','onec.p4.topic-3','onec.p4.topic-4','onec.p5.topic-1','onec.p5.topic-2','onec.p5.topic-3','onec.p5.topic-4','onec.p6.topic-1','onec.p6.topic-2','onec.p6.topic-3','onec.p6.topic-4','onec.p6.reposting','onec.p7.topic-1','onec.p7.topic-3','onec.p7.topic-4','onec.p8.topic-1','onec.p8.topic-2','onec.p8.topic-3','onec.p8.topic-4','onec.p9.topic-1','onec.p9.topic-2','onec.p9.topic-3','onec.p9.topic-4','onec.p10.topic-1','onec.p10.topic-2','onec.p10.topic-3','onec.p10.topic-4','onec.p10.safe-mode','onec.p11.topic-1','onec.p11.topic-2','onec.p11.topic-3','onec.p11.topic-4','onec.p12.topic-1','onec.p12.topic-2','onec.p12.topic-3','onec.p12.topic-4','1c-enterprise.a1.orientation','1c-enterprise.a1.modes','1c-enterprise.a1.interface','1c-enterprise.a1.safe-lab','1c-enterprise.a2.topic-1','1c-enterprise.a2.topic-2','1c-enterprise.a2.topic-3','1c-enterprise.a2.topic-4','1c-enterprise.a3.topic-1','1c-enterprise.a3.topic-2','1c-enterprise.a3.topic-3','1c-enterprise.a3.topic-4','1c-enterprise.a4.topic-1','1c-enterprise.a4.topic-2','1c-enterprise.a4.topic-3','1c-enterprise.a4.topic-4'].flatMap(id=>['en','ru'].map(l=>`courses/clarity/lessons/${id}.${l}.json`))].sort());
 const acceptedP1=[...p1,...slugs.flatMap(s=>['en','ru'].map(l=>`courses/clarity/authoring/onec.p1.${s}.${l}.json`))];
 assert.equal(approvedPresentationDiff(git('diff','--name-only','704c23616f1d8536416fb90a9b46502e1b0f1831','--',...acceptedP1)).toString().trim(),'','Accepted P1 remains byte-identical');
});
test('P1 содержит связное объяснение, свой прогноз, перенос, эталон и точное оценивание четырёх вопросов',async()=>{
 for(const slug of slugs)for(const locale of ['ru','en']){
  const id='onec.p1.'+slug,a=await json(`courses/clarity/authoring/${id}.${locale}.json`),l=await json(`courses/clarity/lessons/${id}.${locale}.json`),original=await json(a.source.path);
  assert.equal(hash(await readFile(a.source.path)),a.source.sha256);
  for(const field of ['sections','selfcheck','practice','reading','assessment'])assert.deepEqual(l[field],a[field]);
  const anchors=new Set(a.sections.map(s=>s.id));assert.equal(anchors.size,a.sections.length);
  for(const anchor of ['orientation','predict','variation','independent-work','example-1','example-2','diagnostics'])assert.ok(anchors.has(anchor),id+' '+anchor);
  assert.deepEqual(a.sourceCoverage.map(s=>s.sourceTitle),original.sections.map(s=>s[0]));
  assert.ok(Object.values(a.coverage).every(s=>anchors.has(s)));
  assert.ok(a.selfcheck.every(q=>anchors.has(q.recall)));assert.equal(a.selfcheck.length,5);
  const choices=a.selfcheck.filter(q=>q.kind==='choice');assert.equal(choices.length,4);
  assert.deepEqual(a.assessment.quiz.map(q=>[q.question,q.correct]),choices.map(q=>[q.prompt,q.correct]));
  const answers=choices.map(q=>q.correct),good=gradeQuiz(a.assessment.quiz,answers);assert.equal(good.correct,4);
  answers[0]=(answers[0]+1)%choices[0].options.length;assert.equal(gradeQuiz(a.assessment.quiz,answers).correct,3);
  assert.equal(a.assessment.contentRevision,a.revision);
  assert.ok(a.practice.referenceSolution.paragraphs.length>=3);
  assert.ok(a.practice.cases.every(c=>!c.output.includes('\\n')));
  if(['lifecycle','tools'].includes(slug)){
   assert.notEqual(a.practice.files[0].content,a.practice.referenceSolution.source);
   assert.match(a.practice.files[0].content,/TODO/);assert.equal(a.practice.referenceSolution.language,'bsl');
  }else assert.deepEqual(a.practice.files,[]);
  if(slug==='tools'){
   assert.match(a.practice.files[0].content,/Осмотр = 18;[\s\S]*Ремонт = 27;/);
   assert.deepEqual(a.practice.cases.slice(0,2).map(c=>c.output),['45','65']);
   assert.match(a.sections.find(s=>s.id==='native-debugger').paragraphs.join(' '),/55/);
  }
 }
});
test('P1 наглядность: локальные SVG, настоящие хешированные снимки, RU/EN подписи и текстовые альтернативы',async()=>{
 for(const slug of slugs)for(const locale of ['ru','en']){
  const a=await json(`courses/clarity/authoring/onec.p1.${slug}.${locale}.json`),flows=a.sections.filter(s=>s.flow),figures=a.sections.flatMap(s=>s.figures||[]);
  assert.equal(flows.length,1);assert.ok(figures.length>=2,slug);
  for(const s of flows){assert.equal(s.flow.nodes.length,s.flow.alternative.length);assert.ok(s.flow.nodes.every(n=>n.title&&n.lines.length));const markup=learningFlowMarkup(s.flow);assert.match(markup,/<svg[\s\S]*<desc>/);assert.match(markup,/<ol>/);assert.ok(!markup.includes('https://'));}
  for(const f of figures){assert.ok(f.alt.length>20&&f.caption.length>20);assert.equal(f.uiLocale,'ru');assert.equal(f.platformVersion,'8.3.27.2214');
   const p=`courses/${f.assetRoot==='clarity'?'clarity':'onec-education'}/${f.src}`;assert.equal(hash(await readFile(p)),f.sha256,p);
   const markup=lessonFiguresMarkup([f],locale,false,new URL('../courses/clarity/',import.meta.url),true);assert.match(markup,/onec-shot-scroll/);assert.match(markup,/alt=/);
  }
  if(slug==='tools')assert.ok(figures.some(f=>f.src.endsWith('p1-syntax-diagnostic.jpg')));
 }
});
