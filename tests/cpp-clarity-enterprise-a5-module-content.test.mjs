import {approvedPresentationDiff,approvedVisualStylesAddition,assertPreservedOrWrappedFlow} from './helpers/cpp-clarity-approved-presentation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
const ids=['1c-enterprise.a5.topic-1', '1c-enterprise.a5.topic-2', '1c-enterprise.a5.topic-3', '1c-enterprise.a5.topic-4'],base='a60b364a4c15226366337f5679966f3542aaa934';
const docs='docs/ru/03-content/cpp-clarity-01/',native=docs+'R3_EVIDENCE/1c-enterprise-a5-module/native/';
const json=async p=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,'')),sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});



test('A5: четыре прикладных урока RU/EN, исходная сильная теория, новые ручные задачи и эталоны',async()=>{
 const edits=await json(docs+'R65_ENTERPRISE_A5_THEORY_PRESENTATION_EXCEPTIONS.json');
 for(const id of ids)for(const locale of ['ru','en']){
  const a=await json('courses/clarity/authoring/'+id+'.'+locale+'.json'),d=await json('courses/clarity/lessons/'+id+'.'+locale+'.json'),old=await json(a.source.path);
  assert.equal(old.topicId,id);assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(d.authored,true);assert.equal(CLARITY_COURSES[id].courseId,'1c-enterprise');assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const k of ['sections','selfcheck','practice','assessment'])assert.deepEqual(a[k],d[k]);assert.equal(a.sections.length,15+Math.max(0,old.sections.length-4));
  for(const[i,s]of old.sections.entries())assert.deepEqual(a.sections.find(s=>s.id==='concept-'+i).paragraphs,s.slice(1).map(p=>edits[locale].reduce((v,[x,y])=>v.replaceAll(x,y),p)));
  for(const[i,q]of old.quiz.entries()){const k=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([k.prompt,k.options,k.correct],[q.question,q.options,q.correct]);}
  assert.equal(a.selfcheck.filter(q=>q.kind==='choice').length,5);assert.equal(a.selfcheck.filter(q=>q.kind==='free').length,1);assert.deepEqual(a.practice.files,[]);assert.equal(a.practice.referenceSolution.language,'text');assert.ok(a.practice.referenceSolution.source.length>200);
  const example=a.sections.find(s=>s.id==='example-1').code;assert.equal(example.language,'text');assert.ok(example.output.length>80);assert.notEqual(example.output,a.practice.cases[0].output);assert.ok(!a.practice.cases[0].output.includes('\\n'));
  const route=a.sections.find(x=>x.id==='worked-route').paragraphs.join('\n');for(const text of [...old.lab.steps,...old.lab.expected])assert.ok(route.includes(text),text);
  const anchors=new Set(a.sections.map(s=>s.id));for(const k of [...Object.values(a.coverage),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(k),k);
  assert.equal(a.nativeEvidence.studentAuthorshipVerified,false);assert.ok(!a.prerequisites.some(p=>/P1.*P12/.test(p.text)),'The applied course has no programming-course prerequisite');
 }
});

test('A5: две восстановленные копии, реальные связи, строки и явная форма без автоматического пересчёта',async()=>{
 const result=await json(native+'RESULT.json'),m=await json(native+'MAIN.json'),i=await json(native+'INDEPENDENT.json'),mr=await json(native+'REOPEN-main.json'),ir=await json(native+'REOPEN-independent.json'),original=await json(native+'REOPEN-original.json'),prior=await json(docs+'R3_EVIDENCE/1c-enterprise-a4-module/native/REOPEN-main.json');
 assert.equal(result.status,'NATIVE BASIC PASS');assert.equal(result.restoredNewTargets,true);assert.equal(result.dataSetsPhysicallySeparated,true);assert.equal(result.ownerDataUsed,false);assert.deepEqual(original,prior);const old=new Map(prior.snapshots.map(s=>[s.split('|')[0],s]));assert.equal(old.size,4);
 for(const [a,reopen,total,model,services,header,rows,comment]of [[m,mr,255,[30,15],[20,40],30,[20,10],'Форма A5 проверена'],[i,ir,290,[40,25],[15,35],55,[40,15],'Форма самостоятельной работы A5']]){
  assert.deepEqual(reopen,a.after);assert.deepEqual(a.before.snapshots,prior.snapshots);assert.equal(a.after.count,9);assert.equal(a.after.snapshots.length,9);
  for(const state of [a.before,a.after]){const current=new Map(state.snapshots.map(s=>[s.split('|')[0],s]));for(const[id,snapshot]of old)assert.equal(current.get(id),snapshot);for(const customer of prior.customers)assert.deepEqual(state.customers.find(c=>c.id===customer.id),customer);}
  assert.deepEqual(a.modelBefore,a.modelAfter);assert.deepEqual(a.servicesBefore,a.servicesAfter);assert.deepEqual(a.modelAfter.map(s=>Number(s.split('|')[5])),model);assert.deepEqual(a.servicesAfter.map(s=>Number(s.split('|')[5])),services);assert.equal(new Set(a.modelAfter.map(s=>s.split('|')[2])).size,1);assert.equal(new Set(a.servicesAfter.map(s=>s.split('|')[3])).size,1);
  const table=a.after.tables.find(t=>t.id===a.rowsDocumentId);assert.equal(table.header,header);assert.deepEqual(table.rows.map(t=>t.minutes),rows);assert.equal(table.comment,comment);for(const table of a.after.tables.filter(t=>old.has(t.id)))assert.deepEqual(table.rows,[]);
  assert.equal(a.initialHeader,header===30?30:50);assert.equal(a.headerAfterRowChange,a.initialHeader);assert.equal(a.refusedMissingCustomer,true);assert.equal(a.countBeforeRefusal,9);assert.equal(a.countAfterRefusal,9);assert.equal(a.explicitFormOpened,true);assert.deepEqual(a.after.report.at(-1),{level:0,customer:'',count:9,minutes:total});
 }
 const schema='Reports/ЗаявкиПоКлиентам/Templates/ОсновнаяСхемаКомпоновкиДанных/Ext/Template.xml';assert.deepEqual(await readFile(native+'source/'+schema),await readFile('courses/onec-education/native/service-desk-reports-v2/'+schema));const form='Documents/ЗаявкаУслуги/Forms/УчебнаяФормаЗаявки/Ext/Form.xml';assert.deepEqual(await readFile(native+'source/'+form),await readFile('courses/onec-education/native/service-desk-documents-v2/'+form));
 const fail=await json(native+'FAILED_SOURCE_CHECKS_RU.json');assert.match(fail.message,/Переменная не определена/);assert.match(fail.status,/FINAL CHECKCONFIG/);assert.ok(result.operations.some(x=>x.exitCode!==0));assert.ok(result.notRun.some(x=>x.includes('Manual form wizard')));
 const captures=await json(docs+'R65_ENTERPRISE_A5_MODULE_NATIVE_CAPTURES.json');assert.equal(captures.images.length,2);for(const im of captures.images){assert.equal(sha(await readFile(docs+im.sourceCapture)),im.sourcePngSha256);assert.equal(sha(await readFile('courses/clarity/'+im.src)),im.sha256);assert.ok(im.width>1000&&im.height>500);}
 const mainGui=await readFile(native+'main-form-GUI-accessibility.txt','utf8'),ownGui=await readFile(native+'independent-form-GUI-accessibility.txt','utf8');assert.ok(mainGui.includes('A51000005')&&mainGui.includes('Форма A5 проверена'));assert.ok(ownGui.includes('A52000005')&&ownGui.includes('Форма самостоятельной работы A5'));
});

test('A5: принятые C++, P1–P12,A1–A4 и прочие контракты прежние;два UI-исключения по SHA256; последующие модули отдельно',async()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-state.mjs','core/storage.js','core/account-storage.js','styles','sandbox','pwa','project-studio','server-access','sync'])assert.equal(approvedPresentationDiff(git('diff','--name-only',base,'--',area)).toString().trim(),'',area);
 const future=Object.keys(CLARITY_COURSES).filter(id=>/^onec\.p1[012]\.|^1c-enterprise\.a[1-8]\./.test(id)),allowed=new Set(future.flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')));
 for(const f of git('diff','--name-only','-z',base,'--','courses/clarity/lessons').toString().split('\0').filter(Boolean))assert.ok(allowed.has(f),f);
 const old=git('ls-tree','-r','--name-only','-z',base,'--','courses/clarity/authoring').toString().split('\0').filter(Boolean),files=old.flatMap(p=>[p,p.replace('/authoring/','/lessons/')]);
 const raw=execFileSync('git',['-c','core.longpaths=true','cat-file','--batch'],{input:files.map(f=>base+':'+f+'\n').join(''),maxBuffer:64e6});let offset=0;
 for(const f of files){const end=raw.indexOf(10,offset),header=raw.subarray(offset,end).toString().split(' ');assert.equal(header[1],'blob',f);const size=Number(header[2]),blob=raw.subarray(end+1,end+1+size);assert.deepEqual(await readFile(f),blob,f);offset=end+size+2;}

});
