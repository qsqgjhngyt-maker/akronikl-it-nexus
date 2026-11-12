import {assertPreservedOrReference,referencePathId} from './helpers/reference-course-contract.mjs';
import {assertApprovedPresentationPaths,approvedPresentationDiff,approvedVisualStylesAddition,assertPreservedOrWrappedFlow} from './helpers/cpp-clarity-approved-presentation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
const ids=[1,2,3,4].map(i=>'onec.p11.topic-'+i),base='0b46b76c98ee45c69936ff3f77b6d867ab9bc49c';
const docs='docs/ru/03-content/cpp-clarity-01/',native=docs+'R3_EVIDENCE/onec-p11-module/native/';
const json=async p=>JSON.parse(await readFile(p,'utf8')),sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});

test('P11: четыре связных темы RU/EN, сохранённая теория с точными исключениями, наблюдаемые примеры и новые работы',async()=>{
 const sources=await json(native+'CASE_SOURCES.json'),edits=await json(docs+'R65_ONEC_P11_THEORY_PRESENTATION_EXCEPTIONS.json');
 for(const id of ids)for(const locale of ['ru','en']){
  const a=await json('courses/clarity/authoring/'+id+'.'+locale+'.json'),d=await json('courses/clarity/lessons/'+id+'.'+locale+'.json'),old=await json(a.source.path);
  assert.equal(old.topicId,id);assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(d.authored,true);assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const k of ['sections','selfcheck','practice','assessment'])assert.deepEqual(a[k],d[k]);assert.equal(a.sections.length,14);
  for(const [i,s]of old.sections.entries())assert.deepEqual(a.sections.find(s=>s.id==='concept-'+i).paragraphs,s.slice(1).map(p=>edits[locale].reduce((v,[x,y])=>v.replaceAll(x,y),p)));
  for(const [i,q]of old.quiz.entries()){const kept=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([kept.prompt,kept.options,kept.correct],[q.question,q.options,q.correct]);}
  const anchors=new Set(a.sections.map(s=>s.id));for(const k of [...Object.values(a.coverage),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(k),k);
  assert.ok(a.practice.criteria.every(s=>!s.includes('\\n')));assert.ok(a.practice.referenceSolution.source.length>100);
  const code=a.sections.find(s=>s.id==='example-1').code;
  if(id==='onec.p11.safe-mode'){
   assert.equal(code.language,'text');assert.deepEqual(a.practice.files,[]);assert.equal(a.practice.referenceSolution.language,'text');assert.match(a.nativeEvidence.status,/NOT RUN/);assert.match(code.output,/NOT RUN/);
  }else{
   assert.ok(a.practice.files.some(f=>/TODO/.test(f.content)));assert.notDeepEqual(a.practice.files.map(f=>f.content),Object.values(a.practice.referenceSolution.files));
   const main=sources.cases.find(c=>c.id===a.nativeEvidence.cases[0]);assert.equal(code.source,main.fullHandlerSource);assert.equal(code.output,main.sampleOutput);assert.equal(a.sections.find(s=>s.id==='main-function').code.source,main.functionSource);
   const tree=await readFile(native+main.id+'-GUI-accessibility.txt','utf8');for(const line of code.output.split('\n'))assert.ok(tree.includes(line),line);
   const lab=sources.cases.find(c=>c.id===a.nativeEvidence.cases[1]);assert.equal(a.practice.referenceSolution.source,lab.functionSource);assert.equal(a.practice.cases[0].output,lab.sampleOutput||lab.labels.map((v,i)=>v+': '+lab.expectedValues[i]).join('\n'));
  }
 }
});

test('P11: восемь native и четыре настоящих GUI; HTTP свой loopback, конкурентность и расписание не заявлены',async()=>{
 const a=await json(native+'RESULT.json'),n=await json(native+'CASE_SOURCES.json'),m=await json(docs+'R65_ONEC_P11_MODULE_NATIVE_CAPTURES.json'),report=await json(docs+'R65_ONEC_P11_MODULE_NATIVE_RESULT.json');
 assert.equal(a.status,'NATIVE BASIC PASS');assert.equal(a.caseCount,8);assert.equal(a.cases.length,8);assert.equal(report.guiCases,4);assert.equal(report.actualInstalled1CHTTP,true);assert.equal(report.loopbackOnly,true);for(const key of ['externalHTTPSTested','twoConcurrentReceiversTested','serverSchedulingTested','crashRecoveryTested','extendedMatrixRun'])assert.equal(report[key],false,key);
 for(const c of n.cases){const obs=a.cases.find(x=>x.id===c.id);assert.equal(obs.actual,c.expectedValues.join('|'));assert.equal(obs.status,'PASS');assert.equal(sha(c.functionSource),c.functionSha256);assert.equal(sha(c.fullHandlerSource),c.handlerSha256);const log=await readFile(native+c.rawObservation,'utf8');assert.ok(log.includes('VALUE:'+c.id+':'+obs.actual),c.id);}
 const ready=await json(native+'mock-ready.json');assert.equal(ready.scope,'loopback-only');assert.equal(ready.production,false);assert.equal(n.ownedMock.port,ready.port);const mock=await readFile(native+'http-own-mock.mjs','utf8');assert.ok(mock.includes("server.listen(0,'127.0.0.1'"));assert.ok(mock.includes("case'/not-json'"));
 assert.equal(m.images.length,4);for(const im of m.images){assert.equal(sha(await readFile(docs+im.sourceCapture)),im.sourcePngSha256);assert.equal(sha(await readFile('courses/clarity/'+im.src)),im.sha256);assert.ok(im.width>1000&&im.height>500);}
});

test('P11: принятые C++, P1–P10 и прочие контракты прежние;два UI-исключения по SHA256; последующие модули отдельно',async()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-state.mjs','core/storage.js','core/account-storage.js','styles','sandbox','pwa','project-studio','server-access','sync'])assert.equal(approvedPresentationDiff(git('diff','--name-only',base,'--',area)).toString().trim(),'',area);
 const future=Object.keys(CLARITY_COURSES).filter(id=>/^onec\.p1[012]\.|^1c-enterprise\.a[1-8]\./.test(id)),allowed=new Set(future.flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')));
 for(const f of git('diff','--name-only','-z',base,'--','courses/clarity/lessons').toString().split('\0').filter(Boolean))assert.ok(allowed.has(f)||!!referencePathId(f),f);
 const old=git('ls-tree','-r','--name-only','-z',base,'--','courses/clarity/authoring').toString().split('\0').filter(Boolean),files=old.flatMap(p=>[p,p.replace('/authoring/','/lessons/')]);
 const raw=execFileSync('git',['-c','core.longpaths=true','cat-file','--batch'],{input:files.map(f=>base+':'+f+'\n').join(''),maxBuffer:64e6});let offset=0;
 for(const f of files){const end=raw.indexOf(10,offset),header=raw.subarray(offset,end).toString().split(' ');assert.equal(header[1],'blob',f);const size=Number(header[2]),blob=raw.subarray(end+1,end+1+size);assertPreservedOrReference(f,await readFile(f),blob,f);offset=end+size+2;}

});
