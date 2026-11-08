import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
const ids=[1,2,3,4].map(i=>'onec.p8.topic-'+i),base='14d8629042aef9b913881c4b340aee11a573cba1';
const docs='docs/ru/03-content/cpp-clarity-01/',native=docs+'R3_EVIDENCE/onec-p8-module/native/';
const json=async p=>JSON.parse(await readFile(p,'utf8')),sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});

test('P8: исходная теория и вопросы сохранены RU/EN; показанный результат совпадает с настоящим основным наблюдением',async()=>{
 const sources=await json(native+'CASE_SOURCES.json');
 for(const id of ids)for(const locale of ['ru','en']){
  const a=await json('courses/clarity/authoring/'+id+'.'+locale+'.json'),d=await json('courses/clarity/lessons/'+id+'.'+locale+'.json'),old=await json(a.source.path);
  assert.equal(old.topicId,id);assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(d.authored,true);assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const k of ['sections','selfcheck','practice','assessment'])assert.deepEqual(a[k],d[k]);
  const edits=(await json(docs+'R65_ONEC_P8_THEORY_PRESENTATION_EXCEPTIONS.json'))[locale];for(const [i,s]of old.sections.entries())assert.deepEqual(a.sections.find(s=>s.id==='concept-'+i).paragraphs,s.slice(1).map(p=>edits.reduce((v,[x,y])=>v.replaceAll(x,y),p)));
  for(const [i,q]of old.quiz.entries()){const kept=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([kept.prompt,kept.options,kept.correct],[q.question,q.options,q.correct]);}
  const anchors=new Set(a.sections.map(s=>s.id));for(const k of [...Object.values(a.coverage),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(k),k);
  assert.ok(a.practice.files.some(f=>/TODO/.test(f.content)));assert.notDeepEqual(a.practice.files.map(f=>f.content),Object.values(a.practice.referenceSolution.files));assert.ok(a.practice.criteria.every(s=>!s.includes('\\n')));
  const code=a.sections.find(s=>s.id==='example-1').code;assert.equal(code.source,sources.mainCommands[a.nativeEvidence.cases[0]]);
  const tree=await readFile(native+a.nativeEvidence.cases[0]+'-GUI-accessibility.txt','utf8');for(const line of code.output.split('\n'))assert.ok(tree.includes(line),line);
 }
});

test('P8: реальные управляемые формы, новые основные задачи и неизменённые методы; подлинные снимки без заявления physical dialog PASS',async()=>{
 const a=await json(native+'RESULT.json'),n=await json(native+'CASE_SOURCES.json'),m=await json(docs+'R65_ONEC_P8_MODULE_NATIVE_CAPTURES.json'),report=await json(docs+'R65_ONEC_P8_MODULE_NATIVE_RESULT.json');
 assert.equal(a.status,'NATIVE BASIC PASS');assert.equal(a.actualManagedForm,true);assert.equal(a.physicalDialogInteractionVerified,false);assert.equal(a.canonicalCases,8);assert.equal(a.preservationReadings,2);assert.equal(report.guiCases,4);assert.equal(report.extendedMatrixRun,false);
 const log=await readFile(native+'ACTUAL_BASIC.txt','utf8'),form=await readFile(native+'source/Documents/ЗаявкаУслуги/Forms/УчебнаяФормаЗаявки/Ext/Form/Module.bsl','utf8');assert.ok(form.includes(n.originalFormSource));assert.ok(form.includes(n.independentFormAdditions));
 for(const [id,expected]of Object.entries(n.expected)){assert.ok(log.includes(id+':'+expected));assert.equal(a.cases.find(c=>c.id===id).actual,expected);}
 for(const im of m.images){assert.equal(sha(await readFile(docs+im.sourceCapture)),im.sourcePngSha256);assert.equal(sha(await readFile('courses/clarity/'+im.src)),im.sha256);assert.ok(im.width>1000&&im.height>500);}
});

test('P8: принятые C++, P1–P7 и общие контракты сохранены побайтно',async()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-state.mjs','core/storage.js','core/account-storage.js','styles','sandbox','pwa','project-studio','server-access','sync'])assert.equal(git('diff','--name-only',base,'--',area).toString().trim(),'',area);
 const expected=[...ids,'onec.p9.topic-1','onec.p9.topic-2','onec.p9.topic-3','onec.p9.topic-4','onec.p10.topic-1','onec.p10.topic-2','onec.p10.topic-3','onec.p10.topic-4','onec.p10.safe-mode','onec.p11.topic-1','onec.p11.topic-2','onec.p11.topic-3','onec.p11.topic-4','onec.p12.topic-1','onec.p12.topic-2','onec.p12.topic-3','onec.p12.topic-4'].flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')).sort();assert.deepEqual(git('diff','--name-only',base,'--','courses/clarity/lessons').toString().trim().split(/\r?\n/).sort(),expected);
 const old=git('ls-tree','-r','--name-only',base,'--','courses/clarity/authoring').toString().trim().split(/\r?\n/).filter(p=>/\/onec\.p[1-7]\./.test(p));for(const p of old)for(const f of [p,p.replace('/authoring/','/lessons/')])assert.deepEqual(await readFile(f),git('show',base+':'+f),f);
});
