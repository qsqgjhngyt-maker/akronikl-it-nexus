import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {GOLD_EVENT_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
import {b1Lesson} from './helpers/cpp-clarity-b1-content.mjs';
import {module6GoldPrograms} from './helpers/module6-gold-programs.mjs';
import {clarityContentRevision} from '../core/cpp-clarity-r3-state.mjs';

const base='17cf1a02b6351b6d50fd14f5601c044a3cafe554';
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{encoding:'utf8',maxBuffer:64e6});
const old=p=>JSON.parse(git('show',base+':'+p));
const source=(id,locale)=>goldLessonPath(id,locale).replaceAll('\\','/');
const lesson=(id,locale)=>`courses/clarity/lessons/${id}.${locale}.json`;

test('B06 изменяет ровно24 источника и24 урока, сохраняя принятые B01–B05 и R3',async()=>{
 const expected=GOLD_EVENT_LESSONS.flatMap(id=>['ru','en'].flatMap(locale=>[source(id,locale),lesson(id,locale)])).sort();
 const changed=git('diff','--name-only',base,'--','courses/cpp/gold','courses/clarity/lessons','courses/cpp-clarity-r3/lessons').trim().split(/\r?\n/).filter(p=>!p.startsWith('courses/clarity/lessons/')||p.startsWith('courses/clarity/lessons/cpp.')).sort();
 assert.deepEqual(changed,expected);
});

test('B06 связывает полный текст, прогноз, контрольные случаи и отдельную предметную заготовку',async()=>{
 const programs=await module6GoldPrograms({includeAuthored:true});
 for(const id of GOLD_EVENT_LESSONS){
  const editions=[];
  for(const locale of ['ru','en']){
   const {g,l}=await b1Lesson(id,locale),{teachingEdition:a,...original}=g,p=l.practice,before=old(lesson(id,locale)),qt=g.runtimeTarget==='qt-wasm';
   assert.deepEqual(original,old(source(id,locale)));
   assert.deepEqual(l.extras,before.extras);
   for(const key of ['sections','selfcheck','practice','reading'])assert.deepEqual(l[key],a[key]);
   assert.equal(a.revision,qt?'b6-author-v3':id==='cpp.event-queues-dispatch'?'b6-author-v2':'b6-author-v1');
   assert.equal(l.contentRevision,clarityContentRevision(id));
   const anchors=new Set(l.sections.map(s=>s.id));
   assert.ok(before.sections.every(s=>anchors.has(s.id)));
   assert.deepEqual(a.sourceCoverage.map(s=>s.sourceTitle),g.sections.map(s=>s.title));
   assert.equal(Object.keys(a.coverage).length,g.objectives.length);
   assert.ok(Object.values(a.coverage).every(x=>anchors.has(x)));
   for(const [index,section] of g.sections.entries()){
    const next=l.sections.find(s=>s.id===`concept-${index+1}`);
    if(a.adaptedSourceSections?.includes(next.id)){assert.ok(qt||next.id===a.contractAnchor||next.id==='concept-8'&&['cpp.event-testing-replay','cpp.multifile-event-application'].includes(id));assert.notDeepEqual(next.paragraphs,section.paragraphs);assert.ok(next.paragraphs.every(p=>p.length>80));}
    else assert.ok(section.paragraphs.every(text=>next.paragraphs.includes(text)));
   }
   assert.ok(l.selfcheck.every(q=>anchors.has(q.recall)));
   const contract=l.sections.find(s=>s.id===a.contractAnchor);
   assert.equal(contract.paragraphs[0],p.task);
   const previewCase=qt?(id==='cpp.qt-graphical-adapter'?p.cases.at(-1):p.cases[8]):p.cases[p.starterObservation.case];
   assert.deepEqual(contract.casePreview,{kind:qt?'qt-ui':'console',input:previewCase.input,output:previewCase.output});
   assert.ok(!contract.paragraphs.join(' ').includes('\\n'));
   for(const q of before.selfcheck.filter(q=>q.kind==='choice')){
    const {recall,...next}=l.selfcheck.find(x=>x.id===q.id);assert.deepEqual(next,q);
   }
   assert.ok(p.steps.length===3&&p.steps.every(s=>s.action&&s.why&&s.expected));
   assert.equal(p.starterRevision,qt||id==='cpp.event-queues-dispatch'?'b6-starter-v2':'b6-starter-v1');
   assert.deepEqual(p.metadata,before.practice.metadata);
   const entry=qt?'src/gui.cpp':'main.cpp',starter=p.files.find(f=>f.path===entry)?.content;
   const allSources=p.files.map(f=>f.content).join('\n');
   assert.match(allSources,/TODO/);
   assert.equal(/\p{Script=Cyrillic}/u.test(allSources),locale==='ru');
   assert.equal(p.cases.length,g.laboratory.cases.length+(id==='cpp.qt-graphical-adapter'?1:0));
   for(const [index,c] of p.cases.entries()){
    const gold=g.laboratory.cases[index];
    const ownCase=qt&&(!gold||id==='cpp.application-build-delivery'&&[8,9].includes(index));
    if(ownCase){assert.match(c.output,/Open|OPEN/);continue;}
    assert.deepEqual([c.input,c.output],qt?[(gold.actions||[]).join('\n'),gold.expected]:[gold.stdin,gold.stdout]);
    assert.ok(!c.output.includes('\\n'));
   }
   const prediction=l.selfcheck.find(q=>q.id==='predict'),example=l.sections.find(s=>s.id===prediction.recall);
   assert.equal(prediction.code.source,example.reveal.code.source);
   for(const [index,e] of g.workedExamples.entries()){
    const section=l.sections.find(s=>s.id==='example-'+(index+1)),code=section.code||section.reveal.code;
    assert.deepEqual([code.stdin,code.output,code.files],[e.stdin,e.expectedStdout,e.files]);
    const program=programs.find(p=>p.aliases.some(a=>a.lesson===id&&a.locale===locale&&a.part==='authored-example-'+e.id));
    assert.equal(program.source,code.source);
    if(qt){assert.equal(code.metadata.target,'qt-wasm');assert.equal(code.metadata.entryFile,entry);assert.ok(Object.keys(code.files).length>=7);}
   }
   for(const probe of a.verificationCases||[]){
    const section=l.sections.find(s=>s.id==='probe-'+probe.id);
    assert.deepEqual(section.code,{source:probe.source,stdin:probe.stdin,output:probe.output});
    const program=programs.find(p=>p.aliases.some(a=>a.lesson===id&&a.locale===locale&&a.part==='authored-probe-'+probe.id));
    assert.equal(program.source,probe.source);assert.deepEqual(program.cases,[{stdin:probe.stdin,stdout:probe.output}]);
   }
   if(qt){
    assert.deepEqual(a.adaptedSourceSections,id==='cpp.qt-graphical-adapter'?['concept-1','concept-5','concept-6','concept-8']:['concept-3','concept-4','concept-7','concept-9']);
    assert.equal(prediction.execution,undefined,'Qt must never be routed through the console predictor');
    assert.equal(p.starterObservation.kind,'qt-ui');
    const reference=programs.find(p=>p.aliases.some(a=>a.lesson===id&&a.locale===locale&&a.part==='authored-lab-reference'));
    assert.equal(reference.source,a.referenceProgram);
    assert.notEqual(reference.source,g.laboratory.referenceCode);
    assert.match(reference.source,id==='cpp.qt-graphical-adapter'?/Open tasks: %1/:/Completed tasks only/);
    assert.match(p.task,id==='cpp.qt-graphical-adapter'?/Open tasks/:/Completed tasks only/);
    assert.ok(p.starterObservation.description);
    assert.deepEqual(new Set(p.files.map(f=>f.path)),new Set([entry,...Object.keys(g.laboratory.starterFiles)]));
   }else{
    assert.equal(prediction.options[prediction.correct],prediction.execution.expected);
    assert.equal(p.stdin,p.cases[p.starterObservation.case].input);
    assert.notEqual(p.starterObservation.stdout,p.cases[p.starterObservation.case].output);
    const seed=programs.find(p=>p.aliases.some(a=>a.lesson===id&&a.locale===locale&&a.part==='authored-starter'));
    assert.equal(seed.source,starter);assert.deepEqual(seed.cases,[{stdin:p.stdin,stdout:p.starterObservation.stdout,exitCode:0}]);
   }
   editions.push(l);
  }
  if(editions[0].practice.kind!=='qt-project')assert.deepEqual(editions[0].practice.cases.map(({label,...c})=>c),editions[1].practice.cases.map(({label,...c})=>c));
  const strip=s=>s.replace(/\/\/[^\n]*/g,'').split('\n').map(x=>x.trimEnd()).filter(x=>x.trim()).join('\n');
  assert.deepEqual(editions[0].practice.files.filter(f=>/\.(cpp|hpp|h)$/.test(f.path)).map(f=>[f.path,strip(f.content)]),editions[1].practice.files.filter(f=>/\.(cpp|hpp|h)$/.test(f.path)).map(f=>[f.path,strip(f.content)]));
 }
});

test('B06 завершает учебный порядок56–67 без изменения67 текущих и40 legacy ID',async()=>{
 const c=JSON.parse(await readFile('courses/cpp/curriculum.json','utf8'));
 const topics=JSON.parse(await readFile('courses/clarity/courses.json','utf8')).find(c=>c.id==='cpp').topics;
 assert.deepEqual(topics.map(t=>t.id),c.sections.flatMap(s=>s.lessonIds));
 assert.deepEqual(topics.slice(55).map(t=>t.id),GOLD_EVENT_LESSONS);
 assert.equal(c.lessons.length,67);assert.equal(c.lessons.filter(l=>Number.isInteger(l.legacyIndex)).length,40);
 for(const id of topics.map(t=>t.id))for(const locale of ['ru','en']){
  const folder=id==='cpp.programming-process'?'cpp-clarity-r3':'clarity';
  const l=JSON.parse(await readFile(`courses/${folder}/lessons/${id}.${locale}.json`,'utf8'));
  assert.ok(id==='cpp.programming-process'||l.authored===true,id+' '+locale);
 }
});
