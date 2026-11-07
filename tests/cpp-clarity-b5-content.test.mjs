import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {GOLD_EVENT_LESSONS,GOLD_OOP_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
import {answerIsChecked,clarityContentRevision,emptyClarityDraft,validateClarityDraft} from '../core/cpp-clarity-r3-state.mjs';
import {b1Lesson} from './helpers/cpp-clarity-b1-content.mjs';
import {module5GoldPrograms} from './helpers/module5-gold-programs.mjs';

const accepted='417601483abc3ff51f3c38ce6068cb5fd378e0e6';
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{encoding:'utf8'});
const prior=p=>JSON.parse(git('show',accepted+':'+p));
const lessonPath=(id,locale)=>'courses/clarity/lessons/'+id+'.'+locale+'.json';
const sourcePath=(id,locale)=>goldLessonPath(id,locale).replaceAll('\\','/');

test('B05 охватывает девять тем и сохраняет принятые редакции и проекты',async()=>{
 const curriculum=JSON.parse(await readFile('courses/cpp/curriculum.json','utf8'));
 assert.deepEqual(curriculum.sections.find(s=>s.id==='cpp.section.oop').lessonIds,GOLD_OOP_LESSONS);
 const expected=GOLD_OOP_LESSONS.flatMap(id=>['ru','en'].flatMap(locale=>[sourcePath(id,locale),lessonPath(id,locale)])).sort();
 const changed=git('diff','--name-only',accepted,'--','courses/clarity/lessons','courses/cpp-clarity-r3/lessons','courses/cpp/gold').trim().split(/\r?\n/).sort();
 const later=new Set(GOLD_EVENT_LESSONS.flatMap(id=>['ru','en'].flatMap(locale=>[sourcePath(id,locale),lessonPath(id,locale)])));
 assert.deepEqual(changed.filter(p=>!later.has(p)),expected);
});

test('B05 сохраняет учебные контракты и связывает объяснение, прогноз и работу',async()=>{
 const programs=await module5GoldPrograms({includeAuthored:true}),starters=new Set();
 for(const id of GOLD_OOP_LESSONS){
  const editions=[];
  for(const locale of ['ru','en']){
   const {g,l}=await b1Lesson(id,locale),{teachingEdition:a,...original}=g,p=l.practice;
   assert.deepEqual(original,prior(sourcePath(id,locale)));
   const before=prior(lessonPath(id,locale));
   const anchors=new Set(l.sections.map(s=>s.id));
   for(const key of ['sections','selfcheck','practice','reading'])assert.deepEqual(l[key],a[key]);
   assert.deepEqual(l.extras,before.extras);
   assert.equal(l.contentRevision,clarityContentRevision(id));
   assert.ok(before.sections.every(s=>anchors.has(s.id)));
   assert.deepEqual(a.sourceCoverage.map(s=>s.sourceTitle),g.sections.map(s=>s.title));
   assert.ok(a.sourceCoverage.every(s=>anchors.has(s.anchor)));
   assert.equal(Object.keys(a.coverage).length,g.objectives.length);
   assert.ok(Object.values(a.coverage).every(s=>anchors.has(s)));
   assert.ok(l.selfcheck.every(q=>anchors.has(q.recall)));
   for(const q of before.selfcheck.filter(q=>q.kind==='choice')){
    const {recall,...next}=l.selfcheck.find(x=>x.id===q.id);
    assert.deepEqual(next,q);
   }
   const draft=emptyClarityDraft(id);
   draft.contentRevision=before.contentRevision;
   draft.answers['check-0']={value:1,checked:true,contentRevision:before.contentRevision};
   validateClarityDraft(id,draft,{persisted:false});
   assert.equal(draft.answers['check-0'].value,1);
   assert.equal(answerIsChecked(draft.answers['check-0'],l.contentRevision),false);
   assert.ok(p.steps.every(s=>s.action&&s.why&&s.expected));
   assert.equal(p.starterRevision,'b5-starter-v1');
   const main=p.files.find(f=>f.path==='main.cpp').content;
   assert.match(main,/TODO/);
   assert.equal(/\p{Script=Cyrillic}/u.test(main),locale==='ru');
   assert.ok(!starters.has(main));
   starters.add(main);
   assert.deepEqual(p.metadata,before.practice.metadata);
   assert.deepEqual(p.files.map(f=>f.path),before.practice.files.map(f=>f.path));
   assert.equal(p.stdin,p.cases[p.starterObservation.case].input);
   assert.notEqual(p.starterObservation.stdout,p.cases[p.starterObservation.case].output);
   assert.equal(p.cases.length,g.laboratory.cases.length);
   for(const [i,c] of p.cases.entries()){
    const gold=g.laboratory.cases[i];
    assert.deepEqual([c.input,c.output,c.files,c.outputFiles,c.fileProperties],
     [gold.stdin,gold.stdout,gold.files,gold.outputFiles,gold.fileProperties]);
    assert.deepEqual(c.fileChecks?.map(x=>x.path)||[],Object.keys(gold.fileProperties||{}));
    assert.ok((c.fileChecks||[]).every(x=>x.description&&!x.description.includes('\\n')));
   }
   const casesFor=part=>programs.find(x=>x.aliases.some(a=>a.lesson===id&&a.locale===locale&&a.part===part));
   assert.equal(casesFor('authored-starter').source,main);
   assert.deepEqual(casesFor('authored-starter').cases,[{
    stdin:p.stdin,stdout:p.starterObservation.stdout,exitCode:p.starterObservation.exitCode
   }]);
   const prediction=l.selfcheck.find(q=>q.id==='predict');
   const example=l.sections.find(s=>s.id===prediction.recall);
   assert.equal(prediction.code.source,example.reveal.code.source);
   assert.equal(prediction.options[prediction.correct],prediction.execution.expected);
   for(const [i,e] of g.workedExamples.entries()){
    const s=l.sections.find(s=>s.id==='example-'+(i+1)),c=s.code||s.reveal.code;
    assert.deepEqual([c.stdin,c.output,c.files,c.metadata,c.outputFiles],
     [e.stdin,e.expectedStdout,e.files,c.metadata&&e.metadata,e.outputFiles]);
    const program=casesFor('authored-example-'+e.id);
    assert.equal(program.source,c.source);
    if(s===example)assert.ok(program.cases.some(x=>x.stdin===prediction.execution.stdin&&x.stdout===prediction.execution.expected));
   }
   editions.push(l);
  }
  const execution=l=>({
   examples:l.sections.filter(s=>s.code||s.reveal).map(s=>s.code||s.reveal.code),
   prediction:l.selfcheck.find(q=>q.id==='predict').execution,
   cases:l.practice.cases.map(({label,fileChecks,...c})=>c),
   source:l.practice.files[0].content.replace(/^\s*\/\/[^\n]*\n/gm,''),
   observation:l.practice.starterObservation
  });
  assert.deepEqual(execution(editions[0]),execution(editions[1]),id+' RU/EN execution');
 }
});


test('Навигация всех 67 тем следует lessonIds без смешения legacy order и learningOrder',async()=>{
 const curriculum=JSON.parse(await readFile('courses/cpp/curriculum.json','utf8'));
 const catalog=JSON.parse(await readFile('courses/clarity/courses.json','utf8')).find(c=>c.id==='cpp');
 assert.deepEqual(catalog.topics.map(t=>t.id),curriculum.sections.flatMap(s=>s.lessonIds));
 assert.equal(new Set(catalog.topics.map(t=>t.id)).size,67);
 for(const section of curriculum.sections){
  assert.deepEqual(catalog.topics.filter(t=>t.moduleId===section.id).map(t=>t.id),section.lessonIds);
 }
});
