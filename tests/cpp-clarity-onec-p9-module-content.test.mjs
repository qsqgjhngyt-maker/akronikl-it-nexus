import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
const ids=[1,2,3,4].map(i=>'onec.p9.topic-'+i),base='5497c6654833f1e7d6b65d74fe02e1ebff7f5d55';
const docs='docs/ru/03-content/cpp-clarity-01/',native=docs+'R3_EVIDENCE/onec-p9-module/native/';
const json=async p=>JSON.parse(await readFile(p,'utf8')),sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});

test('P9: связные RU/EN, прежняя теория и вопросы, новые задачи; вывод показан рядом с конкретным примером',async()=>{
 const sources=await json(native+'CASE_SOURCES.json'),edits=await json(docs+'R65_ONEC_P9_THEORY_PRESENTATION_EXCEPTIONS.json');
 for(const id of ids)for(const locale of ['ru','en']){
  const a=await json('courses/clarity/authoring/'+id+'.'+locale+'.json'),d=await json('courses/clarity/lessons/'+id+'.'+locale+'.json'),old=await json(a.source.path);
  assert.equal(old.topicId,id);assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(d.authored,true);assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const k of ['sections','selfcheck','practice','assessment'])assert.deepEqual(a[k],d[k]);
  assert.equal(a.sections.length,14);
  for(const [i,s]of old.sections.entries())assert.deepEqual(a.sections.find(s=>s.id==='concept-'+i).paragraphs,s.slice(1).map(p=>edits[locale].reduce((v,[x,y])=>v.replaceAll(x,y),p)));
  for(const [i,q]of old.quiz.entries()){const kept=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([kept.prompt,kept.options,kept.correct],[q.question,q.options,q.correct]);}
  const anchors=new Set(a.sections.map(s=>s.id));for(const k of [...Object.values(a.coverage),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(k),k);
  assert.ok(a.practice.criteria.every(s=>!s.includes('\\n')));assert.ok(a.practice.referenceSolution.source.length>100);
  const code=a.sections.find(s=>s.id==='example-1').code;
  if(id==='onec.p9.topic-3'){
   assert.equal(code.language,'text');assert.deepEqual(a.practice.files,[]);assert.equal(a.practice.referenceSolution.language,'text');assert.match(a.nativeEvidence.status,/NOT RUN/);assert.match(code.output,/NOT RUN/);
  }else{
   assert.ok(a.practice.files.some(f=>/TODO/.test(f.content)));assert.notDeepEqual(a.practice.files.map(f=>f.content),Object.values(a.practice.referenceSolution.files));
   const main=sources.cases.find(c=>c.id===a.nativeEvidence.cases[0]);assert.equal(code.source,main.fullHandlerSource);assert.equal(a.sections.find(s=>s.id==='main-function').code.source,main.functionSource);
   const tree=await readFile(native+main.id+'-GUI-accessibility.txt','utf8');for(const line of code.output.split('\n'))assert.ok(tree.includes(line),line);
   const lab=sources.cases.find(c=>c.id===a.nativeEvidence.cases[1]);assert.equal(a.practice.referenceSolution.source,lab.functionSource);assert.equal(a.practice.cases[0].output,lab.labels.map((v,i)=>v+': '+lab.expectedValues[i]).join('\n'));
  }
 }
});

test('P9: шесть реальных наблюдений и три подлинных снимка; две карточки NOT RUN отдельно от native PASS',async()=>{
 const a=await json(native+'RESULT.json'),n=await json(native+'CASE_SOURCES.json'),m=await json(docs+'R65_ONEC_P9_MODULE_NATIVE_CAPTURES.json'),report=await json(docs+'R65_ONEC_P9_MODULE_NATIVE_RESULT.json'),manual=await json(docs+'R3_EVIDENCE/onec-p9-module/MANUAL_ADMISSION_CARDS.json');
 assert.equal(a.status,'NATIVE BASIC PASS');assert.equal(a.caseCount,6);assert.equal(a.cases.length,6);assert.equal(report.guiCases,3);assert.equal(report.printAndExport,false);assert.equal(report.extendedMatrixRun,false);
 for(const c of n.cases){const obs=a.cases.find(x=>x.id===c.id);assert.equal(obs.actual,c.expectedValues.join('|'));assert.equal(obs.status,'PASS');assert.equal(sha(c.functionSource),c.functionSha256);assert.equal(sha(c.fullHandlerSource),c.handlerSha256);const log=await readFile(native+obs.rawObservation,'utf8');assert.ok(log.includes(c.id+':'+obs.actual),c.id);}
 assert.equal(manual.cards.length,2);assert.equal(manual.actualFileAcquired,false);assert.equal(manual.actualFileExecuted,false);assert.ok(manual.cards.every(c=>c.decision==='NOT RUN'));
 assert.equal(m.images.length,3);for(const im of m.images){assert.equal(sha(await readFile(docs+im.sourceCapture)),im.sourcePngSha256);assert.equal(sha(await readFile('courses/clarity/'+im.src)),im.sha256);assert.ok(im.width>1000&&im.height>500);}
});

test('P9: принятые C++, P1–P8 и общие контракты сохранены побайтно; последующие модули допускаются отдельно',async()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-state.mjs','core/storage.js','core/account-storage.js','styles','sandbox','pwa','project-studio','server-access','sync'])assert.equal(git('diff','--name-only',base,'--',area).toString().trim(),'',area);
 const future=Object.keys(CLARITY_COURSES).filter(id=>/^onec\.p(?:9|1[012])\.|^1c-enterprise\.a[1-8]\./.test(id));
 const allowed=new Set(future.flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')));
 for(const file of git('diff','--name-only','-z',base,'--','courses/clarity/lessons').toString().split('\0').filter(Boolean))assert.ok(allowed.has(file),file);
 const old=git('ls-tree','-r','--name-only','-z',base,'--','courses/clarity/authoring').toString().split('\0').filter(Boolean);for(const p of old)for(const f of [p,p.replace('/authoring/','/lessons/')])assert.deepEqual(await readFile(f),git('show',base+':'+f),f);
});
