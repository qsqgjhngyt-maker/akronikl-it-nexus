import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {GOLD_CLASSIC_LESSONS,GOLD_STRUCTURED_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
import {answerIsChecked,clarityContentRevision,emptyClarityDraft,validateClarityDraft} from '../core/cpp-clarity-r3-state.mjs';
import {B2_IDS,B2_NEW,b1Lesson,authoredPrograms} from './helpers/cpp-clarity-b1-content.mjs';

const accepted='e742b2bbefa0165143d4f2841955e9276d86ab4b';
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const old=path=>execFileSync('git',['-c','core.longpaths=true','show',accepted+':'+path]);

test('B02 покрывает весь модуль из восьми тем и сохраняет принятые редакции',async()=>{
 const curriculum=await json('courses/cpp/curriculum.json');
 assert.deepEqual(curriculum.lessons.filter(x=>x.sectionId==='cpp.section.algorithms').sort((a,b)=>(a.learningOrder??a.order)-(b.learningOrder??b.order)).map(x=>x.id),B2_IDS);
 const expected=B2_NEW.flatMap(id=>['ru','en'].flatMap(locale=>[
  goldLessonPath(id,locale).replaceAll('\\','/'),'courses/clarity/lessons/'+id+'.'+locale+'.json'
 ])).sort();
 const changed=execFileSync('git',['-c','core.longpaths=true','diff','--name-only',accepted,'--','courses/clarity/lessons','courses/cpp-clarity-r3/lessons','courses/cpp/gold'],{encoding:'utf8'}).trim().split(/\r?\n/).sort();
 const nextBlock=new Set([...GOLD_STRUCTURED_LESSONS,...GOLD_CLASSIC_LESSONS].flatMap(id=>['ru','en'].flatMap(locale=>[
  goldLessonPath(id,locale).replaceAll('\\','/'),'courses/clarity/lessons/'+id+'.'+locale+'.json'
 ])));
 assert.deepEqual(changed.filter(file=>!nextBlock.has(file)),expected);
});

test('B02 связывает обязательные разделы, вопросы, прежние ответы и независимую практику',async()=>{
 for(const id of B2_NEW){
  const editions=[];
  for(const locale of ['ru','en']){
   const {g,l}=await b1Lesson(id,locale),a=g.teachingEdition;
   editions.push(l);
   for(const key of ['sections','selfcheck','practice','reading'])assert.deepEqual(l[key],a[key]);
   assert.equal(l.contentRevision,clarityContentRevision(id));
   assert.equal(Object.keys(a.coverage).length,g.objectives.length);
   assert.equal(a.sourceCoverage.length,g.sections.length);
   const anchors=new Set(l.sections.map(s=>s.id));
   assert.ok(a.sourceCoverage.every(s=>anchors.has(s.anchor)));
   assert.ok(l.selfcheck.every(q=>anchors.has(q.recall)));
   const q=l.selfcheck.find(q=>q.id==='predict');
   assert.equal(q.code.source,q.execution.source);
   assert.equal(q.code.stdin,q.execution.stdin);
   assert.equal(q.options[q.correct],q.execution.expected);
   const reveal=l.sections.find(s=>s.id===q.recall);
   assert.equal(reveal.prediction[0],reveal.reveal.code.source);
   assert.equal(reveal.predictionInput??'',reveal.reveal.code.stdin);
   assert.notEqual(reveal.reveal.code.stdin,l.practice.stdin);
   assert.notEqual(l.practice.files[0].content,a.referenceProgram);
   assert.deepEqual(l.practice.cases.map(({input,output})=>[input,output]),a.verificationCases.filter(x=>x.label.startsWith('transfer-')).map(x=>[x.stdin,x.expected]));
   const previous=JSON.parse(old('courses/clarity/lessons/'+id+'.'+locale+'.json'));
   for(const oldQuestion of previous.selfcheck){
    assert.ok(l.selfcheck.some(newQuestion=>newQuestion.id===oldQuestion.id&&newQuestion.kind===oldQuestion.kind&&(oldQuestion.options?.length??0)<=(newQuestion.options?.length??0)));
   }
   const d=emptyClarityDraft(id);
   d.contentRevision=previous.contentRevision;
   d.answers.predict={value:1,checked:true,contentRevision:previous.contentRevision};
   d.answers.explain={value:'Прежнее объяснение',checked:false,contentRevision:previous.contentRevision};
   validateClarityDraft(id,d,{persisted:false});
   assert.equal(d.answers.explain.value,'Прежнее объяснение');
   assert.equal(answerIsChecked(d.answers.predict,l.contentRevision),false);
   assert.equal(d.answers.predict.value,1);
  }
  assert.deepEqual(editions[0].practice.cases.map(x=>[x.input,x.output]),editions[1].practice.cases.map(x=>[x.input,x.output]));
  assert.deepEqual(editions[0].selfcheck.map(x=>[x.id,x.correct]),editions[1].selfcheck.map(x=>[x.id,x.correct]));
 }
});

test('R65-01 и R65-05: контрольные варианты и новые исполнения привязаны к собственным исходникам',async()=>{
 for(const id of ['cpp.algorithm-definition-properties','cpp.top-down-design'])for(const locale of ['ru','en']){
  const {g}=await b1Lesson(id,locale),t=g.clarity.training,v=t.variants.at(-1);
  assert.deepEqual([t.starterCode,t.stdin,t.expectedStdout],[v.code,v.stdin,v.stdout]);
 }
 const programs=await authoredPrograms(B2_NEW);
 for(const p of programs){
  assert.equal(p.files['main.cpp'],p.source);
  assert.equal(p.metadata.entryFile,'main.cpp');
  assert.equal(typeof p.stdin,'string');
  assert.ok(p.expectCompileFailure||typeof p.expected==='string');
 }
 assert.equal(programs.filter(p=>p.expectCompileFailure).length,4);
});
