import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {GOLD_STRUCTURED_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
import {answerIsChecked,clarityContentRevision,emptyClarityDraft,validateClarityDraft} from '../core/cpp-clarity-r3-state.mjs';
import {b1Lesson} from './helpers/cpp-clarity-b1-content.mjs';

const accepted='96c2be99fec990163d59daed8bc2bc0d604308de';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const prior=p=>JSON.parse(execFileSync('git',['-c','core.longpaths=true','show',accepted+':'+p]));

test('B03 включает все 18 тем и меняет только свои редакции',async()=>{
 const catalog=await read('courses/cpp/curriculum.json');
 assert.deepEqual(catalog.sections.find(s=>s.id==='cpp.section.structured-programming').lessonIds,GOLD_STRUCTURED_LESSONS);
 const expected=GOLD_STRUCTURED_LESSONS.flatMap(id=>['ru','en'].flatMap(locale=>[
  goldLessonPath(id,locale).replaceAll('\\','/'),`courses/clarity/lessons/${id}.${locale}.json`
 ])).sort();
 const changed=execFileSync('git',['-c','core.longpaths=true','diff','--name-only',accepted,'--','courses/clarity/lessons','courses/cpp-clarity-r3/lessons','courses/cpp/gold'],{encoding:'utf8'}).trim().split(/\r?\n/).sort();
 assert.deepEqual(changed,expected);
});

test('B03 сохраняет разделы, старые вопросы, входы и исполняемые наборы',async()=>{
 const starters=new Set();
 for(const id of GOLD_STRUCTURED_LESSONS){
  const languages=[];
  for(const locale of ['ru','en']){
   const {g,l}=await b1Lesson(id,locale),edition=g.teachingEdition;
   const older=prior(`courses/clarity/lessons/${id}.${locale}.json`);
   const source=prior(goldLessonPath(id,locale).replaceAll('\\','/'));
   const {teachingEdition,...unchanged}=g;
   assert.deepEqual(unchanged,source,id+' '+locale+' original Gold and projects');
   assert.equal(l.contentRevision,clarityContentRevision(id));
   for(const key of ['sections','selfcheck','practice','reading'])assert.deepEqual(l[key],edition[key]);
   const anchors=new Set(l.sections.map(s=>s.id));
   assert.ok(older.sections.every(s=>anchors.has(s.id)));
   assert.equal(Object.keys(edition.coverage).length,g.objectives.length);
   assert.ok(Object.values(edition.coverage).flat().every(a=>anchors.has(a)));
   assert.deepEqual(edition.sourceCoverage.map(s=>s.sourceTitle),g.sections.map(s=>s.title));
   assert.ok(l.selfcheck.every(q=>anchors.has(q.recall)));
   for(const q of older.selfcheck.filter(q=>q.kind!=='free')){
    const next=l.selfcheck.find(x=>x.id===q.id);
    assert.deepEqual([next.kind,next.prompt,next.options,next.correct],[q.kind,q.prompt,q.options,q.correct]);
   }
   assert.ok(l.selfcheck.some(q=>q.id==='explain'&&q.kind==='free'));
   for(const key of ['metadata','returnAnchor','blockPracticum','modulePracticum','delivery'])assert.deepEqual(l.practice[key],older.practice[key]);
   const p=l.practice,starter=p.files.find(f=>f.path==='main.cpp').content,observation=p.starterObservation;
   assert.equal(p.starterRevision,'b3-starter-v2');
   assert.ok(p.files.some(f=>f.content.includes('TODO')),id+' starter needs a visible point of work');
   assert.ok(!starter.includes('Implement the stated')&&!starter.includes('"pending'));
   assert.equal(/\p{Script=Cyrillic}/u.test(starter),locale==='ru');
   assert.ok(!starters.has(starter),id+' starter must be specific to the topic and locale');
   starters.add(starter);
   assert.deepEqual(p.files.map(f=>f.path),older.practice.files.map(f=>f.path));
   for(const file of p.files.filter(f=>f.path!=='main.cpp'&&!(id==='cpp.multifile-build'&&f.path==='src/domain.cpp')))
    assert.deepEqual(file,older.practice.files.find(f=>f.path===file.path));
   assert.equal(p.stdin,p.cases[observation.case].input);
   assert.notEqual(observation.stdout,p.cases[observation.case].output);
   assert.ok(p.steps.every(step=>step.why.trim()&&step.expected.trim()));
   for(const [i,c] of l.practice.cases.entries()){
    const orig=g.laboratory.cases[i];
    assert.deepEqual([c.input,c.output,c.files,c.outputFiles],[orig.stdin,orig.stdout,orig.files,orig.outputFiles]);
   }
   assert.equal(l.practice.cases.length,g.laboratory.cases.length);
   for(const [i,e] of g.workedExamples.entries()){
    const s=l.sections.find(x=>x.id==='example-'+(i+1)),c=s.code||s.reveal.code;
    assert.deepEqual([c.source,c.stdin,c.output,c.files,c.metadata,c.outputFiles],[e.code,e.stdin,e.expectedStdout,e.files,e.metadata,e.outputFiles]);
   }
   const q=l.selfcheck.find(x=>x.id==='predict');
   const c=l.sections.find(s=>s.id===q.recall).reveal.code;
   assert.equal(q.execution.source,c.source);
   const example=g.workedExamples.find(e=>e.code===c.source);
   const run=[{stdin:c.stdin,stdout:c.output},...example.cases].find(x=>x.stdin===q.code.stdin);
   assert.equal(q.options[q.correct],run.stdout);
   assert.deepEqual(q.execution.files,c.files);
   assert.deepEqual(q.execution.metadata,c.metadata);
   const previous=emptyClarityDraft(id);
   previous.contentRevision=older.contentRevision;
   previous.answers['check-0']={value:1,checked:true,contentRevision:older.contentRevision};
   previous.answers.explain={value:'Previous independent reasoning',checked:false,contentRevision:older.contentRevision};
   validateClarityDraft(id,previous,{persisted:false});
   assert.equal(previous.answers.explain.value,'Previous independent reasoning');
   assert.equal(answerIsChecked(previous.answers['check-0'],l.contentRevision),false);
   assert.equal(previous.answers['check-0'].value,1);
   languages.push(l);
  }
  const contract=l=>({sections:l.sections.map(s=>s.id),questions:l.selfcheck.map(q=>[q.id,q.correct,q.execution]),
   cases:l.practice.cases.map(({label,...caseContract})=>caseContract),
   files:l.practice.files.map(f=>({...f,content:f.content.replace(/^\s*\/\/[^\n]*\n/gm,'')})),
   stdin:l.practice.stdin,observation:l.practice.starterObservation,metadata:l.practice.metadata});
  assert.deepEqual(contract(languages[0]),contract(languages[1]),id+' RU/EN execution');
 }
});
