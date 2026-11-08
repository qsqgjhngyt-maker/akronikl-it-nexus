import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
const ids=['1c-enterprise.a2.topic-1', '1c-enterprise.a2.topic-2', '1c-enterprise.a2.topic-3', '1c-enterprise.a2.topic-4'],base='ba2db7f634db32b3a2b8879118595c5f4857a4cf';
const docs='docs/ru/03-content/cpp-clarity-01/',native=docs+'R3_EVIDENCE/1c-enterprise-a2-module/native/';
const json=async p=>JSON.parse(await readFile(p,'utf8')),sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});



test('A2: четыре прикладных урока RU/EN, исходная сильная теория, новые ручные задачи и эталоны',async()=>{
 const edits=await json(docs+'R65_ENTERPRISE_A2_THEORY_PRESENTATION_EXCEPTIONS.json');
 for(const id of ids)for(const locale of ['ru','en']){
  const a=await json('courses/clarity/authoring/'+id+'.'+locale+'.json'),d=await json('courses/clarity/lessons/'+id+'.'+locale+'.json'),old=await json(a.source.path);
  assert.equal(old.topicId,id);assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(d.authored,true);assert.equal(CLARITY_COURSES[id].courseId,'1c-enterprise');assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const k of ['sections','selfcheck','practice','assessment'])assert.deepEqual(a[k],d[k]);assert.equal(a.sections.length,14);
  for(const[i,s]of old.sections.entries())assert.deepEqual(a.sections.find(s=>s.id==='concept-'+i).paragraphs,s.slice(1).map(p=>edits[locale].reduce((v,[x,y])=>v.replaceAll(x,y),p)));
  for(const[i,q]of old.quiz.entries()){const k=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([k.prompt,k.options,k.correct],[q.question,q.options,q.correct]);}
  assert.equal(a.selfcheck.filter(q=>q.kind==='choice').length,5);assert.equal(a.selfcheck.filter(q=>q.kind==='free').length,1);assert.deepEqual(a.practice.files,[]);assert.equal(a.practice.referenceSolution.language,'text');assert.ok(a.practice.referenceSolution.source.length>200);
  const example=a.sections.find(s=>s.id==='example-1').code;assert.equal(example.language,'text');assert.ok(example.output.length>80);assert.notEqual(example.output,a.practice.cases[0].output);assert.ok(!a.practice.cases[0].output.includes('\\n'));
  const anchors=new Set(a.sections.map(s=>s.id));for(const k of [...Object.values(a.coverage),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(k),k);
  assert.equal(a.nativeEvidence.studentAuthorshipVerified,false);assert.ok(!a.prerequisites.some(p=>/P1.*P12/.test(p.text)),'The applied course has no programming-course prerequisite');
 }
});

test('A2: реальные клиенты,ссылки,заявки30/45 и отдельные20/55 после перезапуска;триGUI',async()=>{
 const a=await json(native+'RESULT.json'),m=await json(docs+'R65_ENTERPRISE_A2_MODULE_NATIVE_CAPTURES.json');assert.equal(a.status,'NATIVE BASIC PASS');assert.ok(a.operations.every(s=>s.exitCode===0));assert.equal(a.failedAttempts.length,1);assert.equal(a.gui.length,3);assert.equal(a.ownSeparateInfobase,true);assert.equal(a.ownerDataUsed,false);assert.equal(a.allEightFieldsAfterReopen,true);assert.equal(a.workedPairUnchanged,true);
 for(const k of ['renameSameRef','renameSameCode','firstInProgress','missingCustomerRefused','postingFalse'])assert.equal(a.main[k],true,k);assert.deepEqual([a.main.firstMinutes,a.main.secondMinutes,a.main.documents,a.main.foundFirst,a.main.missingSearch],[30,45,2,1,0]);
 for(const k of ['renameSameRef','renameSameCode','distinctCustomerRefs','secondUnchanged','workedPairUnchanged'])assert.equal(a.independent[k],true,k);assert.deepEqual([a.independent.firstMinutes,a.independent.secondMinutes,a.independent.totalDocuments],[20,55,4]);assert.equal(a.independent.firstComment,'Моя навигация');
 assert.deepEqual(a.reopened,{documents:4,snapshots:[a.main.firstSnapshot,a.main.secondSnapshot,a.independent.firstSnapshot,a.independent.secondSnapshot]});assert.ok(a.reopened.snapshots.every(s=>s.split('|').length===8));
 for(const k of ['allLearnerStepsVerified','guiEmptySearchAndClearVerified','installationTested','trainingEdition1508Tested','rolesOrAuthenticationTested'])assert.equal(a[k],false,k);
 assert.equal(m.images.length,3);for(const im of m.images){assert.equal(sha(await readFile(docs+im.sourceCapture)),im.sourcePngSha256);assert.equal(sha(await readFile('courses/clarity/'+im.src)),im.sha256);assert.ok(im.width>1000&&im.height>500);}
 const customers=await readFile(native+'saved-customers-GUI-accessibility.txt','utf8');assert.match(customers,/Учебный Север — ремонт/);assert.match(customers,/A2N1/);assert.match(customers,/Учебный Юг/);const query=await readFile(native+'request-search-GUI-accessibility.txt','utf8');assert.match(query,/A20000001/);assert.doesNotMatch(query,/A20000002/);
 assert.match(await readFile(native+'source/Documents/ЗаявкаУслуги.xml','utf8'),/<Posting>Deny<\/Posting>/);
});

test('A2: принятые C++, P1–P12,A1 и общие контракты побайтно прежние; последующие модули отдельно',async()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-state.mjs','core/storage.js','core/account-storage.js','styles','sandbox','pwa','project-studio','server-access','sync'])assert.equal(git('diff','--name-only',base,'--',area).toString().trim(),'',area);
 const future=Object.keys(CLARITY_COURSES).filter(id=>/^onec\.p1[012]\.|^1c-enterprise\.a[1-8]\./.test(id)),allowed=new Set(future.flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')));
 for(const f of git('diff','--name-only','-z',base,'--','courses/clarity/lessons').toString().split('\0').filter(Boolean))assert.ok(allowed.has(f),f);
 const old=git('ls-tree','-r','--name-only','-z',base,'--','courses/clarity/authoring').toString().split('\0').filter(Boolean),files=old.flatMap(p=>[p,p.replace('/authoring/','/lessons/')]);
 const raw=execFileSync('git',['-c','core.longpaths=true','cat-file','--batch'],{input:files.map(f=>base+':'+f+'\n').join(''),maxBuffer:64e6});let offset=0;
 for(const f of files){const end=raw.indexOf(10,offset),header=raw.subarray(offset,end).toString().split(' ');assert.equal(header[1],'blob',f);const size=Number(header[2]),blob=raw.subarray(end+1,end+1+size);assert.deepEqual(await readFile(f),blob,f);offset=end+size+2;}

});
