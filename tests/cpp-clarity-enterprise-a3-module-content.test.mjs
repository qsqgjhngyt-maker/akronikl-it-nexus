import {approvedPresentationDiff,approvedVisualStylesAddition,assertPreservedOrWrappedFlow} from './helpers/cpp-clarity-approved-presentation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
const ids=['1c-enterprise.a3.topic-1', '1c-enterprise.a3.topic-2', '1c-enterprise.a3.topic-3', '1c-enterprise.a3.topic-4'],base='89dc97fa43e51d9dcd91168b5ea147de7a0acb9c';
const docs='docs/ru/03-content/cpp-clarity-01/',native=docs+'R3_EVIDENCE/1c-enterprise-a3-module/native/';
const json=async p=>JSON.parse(await readFile(p,'utf8')),sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});



test('A3: четыре прикладных урока RU/EN, исходная сильная теория, новые ручные задачи и эталоны',async()=>{
 const edits=await json(docs+'R65_ENTERPRISE_A3_THEORY_PRESENTATION_EXCEPTIONS.json');
 for(const id of ids)for(const locale of ['ru','en']){
  const a=await json('courses/clarity/authoring/'+id+'.'+locale+'.json'),d=await json('courses/clarity/lessons/'+id+'.'+locale+'.json'),old=await json(a.source.path);
  assert.equal(old.topicId,id);assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(d.authored,true);assert.equal(CLARITY_COURSES[id].courseId,'1c-enterprise');assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const k of ['sections','selfcheck','practice','assessment'])assert.deepEqual(a[k],d[k]);assert.equal(a.sections.length,14+Math.max(0,old.sections.length-4));
  for(const[i,s]of old.sections.entries())assert.deepEqual(a.sections.find(s=>s.id==='concept-'+i).paragraphs,s.slice(1).map(p=>edits[locale].reduce((v,[x,y])=>v.replaceAll(x,y),p)));
  for(const[i,q]of old.quiz.entries()){const k=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([k.prompt,k.options,k.correct],[q.question,q.options,q.correct]);}
  assert.equal(a.selfcheck.filter(q=>q.kind==='choice').length,5);assert.equal(a.selfcheck.filter(q=>q.kind==='free').length,1);assert.deepEqual(a.practice.files,[]);assert.equal(a.practice.referenceSolution.language,'text');assert.ok(a.practice.referenceSolution.source.length>200);
  const example=a.sections.find(s=>s.id==='example-1').code;assert.equal(example.language,'text');assert.ok(example.output.length>80);assert.notEqual(example.output,a.practice.cases[0].output);assert.ok(!a.practice.cases[0].output.includes('\\n'));
  const anchors=new Set(a.sections.map(s=>s.id));for(const k of [...Object.values(a.coverage),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(k),k);
  assert.equal(a.nativeEvidence.studentAuthorshipVerified,false);assert.ok(!a.prerequisites.some(p=>/P1.*P12/.test(p.text)),'The applied course has no programming-course prerequisite');
 }
});

test('A3:реальнаяСКД,разные наборы120/160,границыввода и триGUI без приписанного ручного прохождения',async()=>{
 const a=await json(native+'RESULT.json'),m=await json(docs+'R65_ENTERPRISE_A3_MODULE_NATIVE_CAPTURES.json');assert.equal(a.status,'NATIVE BASIC PASS');assert.equal(a.failedAttempts.length,2);assert.equal(a.failedSourceChecks.length,2);assert.ok(a.operations.every(x=>x.exitCode===0));assert.equal(a.actualExistingReportDCS,true);assert.equal(a.dataSetsPhysicallySeparated,true);assert.equal(a.allEightFieldsAfterReopen,true);assert.equal(a.ownerDataUsed,false);
 for(const [key,minutes,ascending,filtered,total,first]of [['main',[30,45,30,15],[15,30,30,45],[45],120,105],['independent',[20,55,40,45],[20,40,45,55],[40,45,55],160,115]]){
  const x=a[key];assert.equal(x.count,4);assert.equal(x.recordsUnchanged,true);assert.deepEqual(x.ascending,ascending);assert.deepEqual(x.descending,[...ascending].reverse());assert.deepEqual(x.filtered,filtered);assert.deepEqual(x.reportAll,x.reportAfterClear);
  assert.deepEqual(x.reportAll,[{level:0,customer:x.firstCustomer,count:3,minutes:first},{level:0,customer:x.secondCustomer,count:1,minutes:total-first},{level:0,customer:'',count:4,minutes:total}]);assert.deepEqual(x.reportFirst,[{level:0,customer:x.firstCustomer,count:3,minutes:first},{level:0,customer:'',count:3,minutes:first}]);assert.deepEqual(a.reopened[key],{count:4,snapshots:x.snapshots});assert.deepEqual(x.snapshots.map(s=>Number(s.split('|')[5].replace(/\s/g,''))),minutes);
 }
 assert.deepEqual(a.validation,{missingCustomerRefused:true,countAfterMissing:0,corrected30:30,tooLargeRefused:true,countAfterTooLarge:1,corrected25:25,zeroRead:0,upperRead:1440,negativeRefused:true,count:4});assert.equal(a.reopened.validation.count,4);assert.deepEqual(a.reopened.validation.snapshots.map(s=>Number(s.split('|')[5].replace(/\s/g,''))),[30,25,0,1440]);
 const schema='source/Reports/ЗаявкиПоКлиентам/Templates/ОсновнаяСхемаКомпоновкиДанных/Ext/Template.xml';assert.equal(sha(await readFile(native+schema)),a.reportSchemaSha256);assert.deepEqual(await readFile(native+schema),await readFile('courses/onec-education/native/service-desk-reports-v2/'+schema.slice(7)));
 for(const k of ['allLearnerStepsVerified','allListSettingsGuiVerified','installationTested','trainingEdition1508Tested','rolesOrAuthenticationTested'])assert.equal(a[k],false,k);
 assert.equal(m.images.length,3);for(const im of m.images){assert.equal(sha(await readFile(docs+im.sourceCapture)),im.sourcePngSha256);assert.equal(sha(await readFile('courses/clarity/'+im.src)),im.sha256);assert.ok(im.width>1000&&im.height>500);}
 const control=await readFile(native+'control-list-GUI-accessibility.txt','utf8');for(const n of ['A30000001','A30000002','A30000003','A30000004'])assert.ok(control.includes(n));const validation=await readFile(native+'validation-list-GUI-accessibility.txt','utf8');assert.ok(validation.includes('A3V000003')&&validation.includes('A3V000004'));assert.match(validation,/1440/);
});

test('A3: принятые C++, P1–P12,A1/A2 и прочие контракты прежние;два UI-исключения по SHA256; последующие модули отдельно',async()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-state.mjs','core/storage.js','core/account-storage.js','styles','sandbox','pwa','project-studio','server-access','sync'])assert.equal(approvedPresentationDiff(git('diff','--name-only',base,'--',area)).toString().trim(),'',area);
 const future=Object.keys(CLARITY_COURSES).filter(id=>/^onec\.p1[012]\.|^1c-enterprise\.a[1-8]\./.test(id)),allowed=new Set(future.flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')));
 for(const f of git('diff','--name-only','-z',base,'--','courses/clarity/lessons').toString().split('\0').filter(Boolean))assert.ok(allowed.has(f),f);
 const old=git('ls-tree','-r','--name-only','-z',base,'--','courses/clarity/authoring').toString().split('\0').filter(Boolean),files=old.flatMap(p=>[p,p.replace('/authoring/','/lessons/')]);
 const raw=execFileSync('git',['-c','core.longpaths=true','cat-file','--batch'],{input:files.map(f=>base+':'+f+'\n').join(''),maxBuffer:64e6});let offset=0;
 for(const f of files){const end=raw.indexOf(10,offset),header=raw.subarray(offset,end).toString().split(' ');assert.equal(header[1],'blob',f);const size=Number(header[2]),blob=raw.subarray(end+1,end+1+size);assert.deepEqual(await readFile(f),blob,f);offset=end+size+2;}

});
