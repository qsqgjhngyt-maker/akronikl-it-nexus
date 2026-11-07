import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gradeQuiz} from '../courses/onec-education/model.mjs';
import {lessonFiguresMarkup} from '../courses/onec-education/lesson-media.mjs';
import {learningFlowMarkup} from '../core/clarity-visuals.mjs';
const base='c72e65ab3cd65f4032d0446d3b6ac7e7acce42b5',slugs=['architecture','infobase','lifecycle','tools'];
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{maxBuffer:64e6});
const json=async p=>JSON.parse(await readFile(p)),hash=b=>createHash('sha256').update(b).digest('hex');
test('P1 сохраняет принятые C++, R3, оба исходных курса 1С и меняет только восемь производных уроков',()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','review/cpp-clarity-r3'])assert.equal(git('diff','--name-only',base,'--',area).toString().trim(),'');
 const changed=git('diff','--name-only',base,'--','courses/clarity/lessons').toString().trim().split(/\r?\n/).sort();
 assert.deepEqual(changed,slugs.flatMap(s=>['en','ru'].map(l=>`courses/clarity/lessons/onec.p1.${s}.${l}.json`)).sort());
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
