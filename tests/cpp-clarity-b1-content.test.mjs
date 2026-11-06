import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {goldLessonPath} from '../core/academy-gold-catalog.js';import {B1_NEW,B1_BASE,b1Lesson,b1Programs} from './helpers/cpp-clarity-b1-content.mjs';import {clarityContentRevision,emptyClarityDraft,validateClarityDraft,answerIsChecked} from '../core/cpp-clarity-r3-state.mjs';
test('Блок 1: полные источники, реальные задания и обе локали связаны с одной редакцией',async()=>{
 for(const id of B1_NEW){const editions=[];for(const locale of ['ru','en']){
 const {g,l}=await b1Lesson(id,locale),a=g.teachingEdition;editions.push(l);
 for(const k of ['sections','selfcheck','practice','reading'])assert.deepEqual(l[k],a[k],id+' '+k);
 assert.equal(a.sourceCoverage.length,g.sections.length);assert.equal(Object.keys(a.coverage).length,g.objectives.length);
 for(const c of a.sourceCoverage){const s=l.sections.find(s=>s.id===c.anchor);assert.ok(s);assert.ok((s.paragraphs.join(' ')+(s.reveal?.paragraphs||[]).join(' ')).length>180);}
 assert.ok(l.sections.some(s=>s.reveal?.tables?.length));assert.ok(l.sections.some(s=>s.deep));assert.equal(l.contentRevision,clarityContentRevision(id));
 for(const q of l.selfcheck){assert.ok(l.sections.some(s=>s.id===q.recall));if(q.execution){assert.equal(q.code,q.execution.source);assert.equal(q.execution.files['main.cpp'],q.code);}}
 assert.equal(l.practice.cases[0].output,a.verificationCases[0].expected);assert.equal(l.practice.stdin,a.verificationCases[0].stdin);assert.equal(a.referenceProgram,a.verificationCases[0].source);
 assert.notEqual(l.practice.files[0].content,a.referenceProgram);assert.ok(!JSON.stringify(l).includes('\\u0027'));
 const d=emptyClarityDraft(id);d.contentRevision='clarity-courses-v1';d.answers.explain={value:'Прежний ответ',checked:false,contentRevision:'clarity-courses-v1'};validateClarityDraft(id,d,{persisted:false});assert.equal(d.answers.explain.value,'Прежний ответ');assert.equal(answerIsChecked(d.answers.explain,clarityContentRevision(id)),false);
 }
 assert.deepEqual(editions[0].practice.cases,editions[1].practice.cases.map((c,i)=>({...c,label:editions[0].practice.cases[i].label})));
 assert.deepEqual(editions[0].selfcheck.map(q=>[q.id,q.correct,q.options?.length]),editions[1].selfcheck.map(q=>[q.id,q.correct,q.options?.length]));
 }
});
test('Принятый урок «Типы данных» и три образца сохранены побайтно',async()=>{
 for(const id of ['cpp.data-types','cpp.programming-process','onec.p2.topic-1','onec.p7.topic-2'])for(const locale of ['ru','en']){
 const p=id==='cpp.data-types'?'courses/clarity/lessons/'+id+'.'+locale+'.json':'courses/cpp-clarity-r3/lessons/'+id+'.'+locale+'.json';
 assert.deepEqual(await readFile(p),execFileSync('git',['-c','core.longpaths=true','show',B1_BASE+':'+p],{maxBuffer:2e6}));
 if(id==='cpp.data-types'){const gold=goldLessonPath(id,locale);assert.deepEqual(await readFile(gold),execFileSync('git',['show',B1_BASE+':'+gold],{maxBuffer:2e6}));}
 }
});
test('R65-01: основной старый опыт использует точные source, stdin и expected последнего названного варианта',async()=>{
 for(const id of ['cpp.comments-constants-literals','cpp.relations-logic','cpp.standard-io','cpp.increment-decrement-sizeof-conditional'])for(const locale of ['ru','en']){const{g}=await b1Lesson(id,locale),t=g.clarity.training,v=t.variants.at(-1);assert.equal(t.starterCode,v.code);assert.equal(t.stdin,v.stdin);assert.equal(t.expectedStdout,v.stdout);}
});
test('Все исполняемые записи несут файлы и метаданные своей версии',async()=>{for(const r of await b1Programs()){assert.equal(r.files['main.cpp'],r.source);assert.equal(r.metadata.entryFile,'main.cpp');assert.equal(typeof r.stdin,'string');assert.ok(r.expectCompileFailure||typeof r.expected==='string');}});
test('Состав B01 совпадает с границей модуля и сохраняет уроки вне согласованных правок',async()=>{
 const before='d551c75047c0e21a16d0fba49e4c8fd340975e7b';
 const {B1_IDS}=await import('./helpers/cpp-clarity-b1-content.mjs');
 const curriculum=JSON.parse(await readFile('courses/cpp/curriculum.json','utf8'));
 const first=curriculum.lessons.find(t=>t.id===B1_IDS[0]);
 const moduleIds=curriculum.lessons.filter(t=>t.sectionId===first.sectionId).sort((a,b)=>(a.learningOrder??a.order)-(b.learningOrder??b.order)).map(t=>t.id);
 assert.deepEqual(B1_IDS,moduleIds);assert.equal(B1_IDS.length,12);
 for(const id of B1_IDS.filter(id=>!['cpp.first-cpp-program','cpp.tokens-identifiers-keywords','cpp.increment-decrement-sizeof-conditional'].includes(id)))for(const locale of ['ru','en'])for(const p of [goldLessonPath(id,locale),'courses/clarity/lessons/'+id+'.'+locale+'.json'])assert.deepEqual(await readFile(p),execFileSync('git',['-c','core.longpaths=true','show',before+':'+p],{maxBuffer:2e6}));
});
test('Принятый экран «Типы данных» остаётся прежним после обобщения renderer',async()=>{const previous=await import('data:text/javascript;base64,'+execFileSync('git',['show',B1_BASE+':core/cpp-clarity-authored.mjs']).toString('base64')),current=await import('../core/cpp-clarity-authored.mjs');const callbacks={code:(...v)=>JSON.stringify(v),table:t=>JSON.stringify(t),url:(...v)=>v.join('/')};for(const locale of ['ru','en']){const{l}=await b1Lesson('cpp.data-types',locale),a=previous.authoredMarkup(l,callbacks),b=current.authoredMarkup(l,callbacks);assert.equal(a.explanation().replace(locale==='ru'?'Девять шагов урока':'Nine steps in this lesson',locale==='ru'?'Содержание урока':'Lesson contents'),b.explanation());assert.equal(a.reading(),b.reading());for(const s of l.sections)assert.deepEqual(a.recall(s.id),b.recall(s.id));}});

test('Самопроверка первой программы показывает исполняемый пример с приветствием',async()=>{
 for(const locale of ['ru','en']){
  const {g,l}=await b1Lesson('cpp.first-cpp-program',locale);
  const q=l.selfcheck.find(q=>q.id==='concept-0');
  const hello=g.workedExamples.find(example=>example.id==='hello');
  const before=JSON.parse(execFileSync('git',['show','4066559b1326ce93b1e5bed57757daae266015ce:courses/clarity/lessons/cpp.first-cpp-program.'+locale+'.json'],{encoding:'utf8'}));
  assert.equal(q.code,hello.code);
  assert.equal(q.code,l.sections.find(section=>section.id===q.recall).reveal.code.source);
  assert.equal(q.options[q.correct],hello.expectedStdout);
  assert.equal(q.execution.expected,q.options[q.correct]);
  assert.doesNotMatch(q.prompt,/перв(ый|ого) пример|first example/i);
  assert.deepEqual(l.selfcheck.map(q=>[q.id,q.correct,q.options]),before.selfcheck.map(q=>[q.id,q.correct,q.options]));
  assert.deepEqual(l.practice,before.practice);
  assert.equal(l.contentRevision,before.contentRevision);
 }
});
