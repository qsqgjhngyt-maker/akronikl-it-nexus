import {REFERENCE_IDS} from '../core/reference-course-routes.mjs';
import {assertReferenceEdition,assertPreservedOrReference} from './helpers/reference-course-contract.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {goldLessonPath} from '../core/academy-gold-catalog.js';import {B1_NEW,B1_BASE,b1Lesson,b1Programs} from './helpers/cpp-clarity-b1-content.mjs';import {clarityContentRevision,emptyClarityDraft,validateClarityDraft,answerIsChecked} from '../core/cpp-clarity-r3-state.mjs';
test('Блок 1: полные источники, реальные задания и обе локали связаны с одной редакцией',async()=>{
 for(const id of B1_NEW){const editions=[];for(const locale of ['ru','en']){
 const {g,l}=await b1Lesson(id,locale),a=g.teachingEdition;editions.push(l);if(REFERENCE_IDS.includes(id)){assertReferenceEdition(id,locale);continue;}
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
 assertPreservedOrReference(p,await readFile(p),execFileSync('git',['-c','core.longpaths=true','show',B1_BASE+':'+p],{maxBuffer:2e6}));
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
 for(const id of B1_IDS.filter(id=>!['cpp.first-cpp-program','cpp.tokens-identifiers-keywords','cpp.increment-decrement-sizeof-conditional'].includes(id)))for(const locale of ['ru','en'])for(const p of [goldLessonPath(id,locale),'courses/clarity/lessons/'+id+'.'+locale+'.json'])assertPreservedOrReference(p,await readFile(p),execFileSync('git',['-c','core.longpaths=true','show',before+':'+p],{maxBuffer:2e6}));
});
test('Типы данных используют новую разрешённую редакцию; старые оценки сохранены отдельно',()=>{for(const locale of ['ru','en'])assertReferenceEdition('cpp.data-types',locale);});

test('Самопроверка первой программы сохраняет ID и проверяет понятия нового маршрута',()=>{for(const locale of ['ru','en']){const l=assertReferenceEdition('cpp.first-cpp-program',locale);assert.ok(l.selfcheck.some(q=>q.prompt.includes('return 0')));assert.ok(l.selfcheck.some(q=>q.prompt.includes('include')));}});
