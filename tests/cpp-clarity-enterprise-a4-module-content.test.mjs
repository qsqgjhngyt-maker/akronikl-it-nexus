import {assertPreservedOrReference,referencePathId} from './helpers/reference-course-contract.mjs';
import {assertApprovedPresentationPaths,approvedPresentationDiff,approvedVisualStylesAddition,assertPreservedOrWrappedFlow} from './helpers/cpp-clarity-approved-presentation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
const ids=['1c-enterprise.a4.topic-1', '1c-enterprise.a4.topic-2', '1c-enterprise.a4.topic-3', '1c-enterprise.a4.topic-4'],base='0634836506a7cd135489eb830786304e86ef8f86';
const docs='docs/ru/03-content/cpp-clarity-01/',native=docs+'R3_EVIDENCE/1c-enterprise-a4-module/native/';
const json=async p=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,'')),sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});



test('A4: четыре прикладных урока RU/EN, исходная сильная теория, новые ручные задачи и эталоны',async()=>{
 const edits=await json(docs+'R65_ENTERPRISE_A4_THEORY_PRESENTATION_EXCEPTIONS.json');assert.deepEqual(edits.quiz,[{id:'1c-enterprise.a4.topic-3',locale:'ru',question:1,option:2,before:'СправочникСсылка.Клиенты',after:'Ссылка на клиента'}]);
 for(const id of ids)for(const locale of ['ru','en']){
  const a=await json('courses/clarity/authoring/'+id+'.'+locale+'.json'),d=await json('courses/clarity/lessons/'+id+'.'+locale+'.json'),old=await json(a.source.path);
  assert.equal(old.topicId,id);assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(d.authored,true);assert.equal(CLARITY_COURSES[id].courseId,'1c-enterprise');assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const k of ['sections','selfcheck','practice','assessment'])assert.deepEqual(a[k],d[k]);assert.equal(a.sections.length,14+Math.max(0,old.sections.length-4));
  for(const[i,s]of old.sections.entries())assert.deepEqual(a.sections.find(s=>s.id==='concept-'+i).paragraphs,s.slice(1).map(p=>edits[locale].reduce((v,[x,y])=>v.replaceAll(x,y),p)));
  for(const[i,q]of old.quiz.entries()){const k=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([k.prompt,k.options,k.correct],[q.question,q.options.map((v,j)=>edits.quiz.find(e=>e.id===id&&e.locale===locale&&e.question===i&&e.option===j&&e.before===v)?.after||v),q.correct]);}
  assert.equal(a.selfcheck.filter(q=>q.kind==='choice').length,5);assert.equal(a.selfcheck.filter(q=>q.kind==='free').length,1);assert.deepEqual(a.practice.files,[]);assert.equal(a.practice.referenceSolution.language,'text');assert.ok(a.practice.referenceSolution.source.length>200);
  const example=a.sections.find(s=>s.id==='example-1').code;assert.equal(example.language,'text');assert.ok(example.output.length>80);assert.notEqual(example.output,a.practice.cases[0].output);assert.ok(!a.practice.cases[0].output.includes('\\n'));
  const anchors=new Set(a.sections.map(s=>s.id));for(const k of [...Object.values(a.coverage),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(k),k);
  assert.equal(a.nativeEvidence.studentAuthorshipVerified,false);assert.ok(!a.prerequisites.some(p=>/P1.*P12/.test(p.text)),'The applied course has no programming-course prerequisite');
 }
});

test('A4: настоящее восстановление, два разных реквизита, новые значения и все прежние поля',async()=>{
 const result=await json(native+'RESULT.json'),m=await json(native+'MAIN.json'),i=await json(native+'INDEPENDENT.json'),mr=await json(native+'REOPEN-main.json'),ir=await json(native+'REOPEN-independent.json'),original=await json(native+'REOPEN-original.json'),prior=await json(docs+'R3_EVIDENCE/1c-enterprise-a3-module/native/REOPEN-main.json');
 assert.equal(result.status,'NATIVE BASIC PASS');assert.equal(result.restoration.twoNewSeparateTargets,true);assert.equal(result.restoration.workingDatabasesUsed,false);assert.equal(result.restoration.dtFiles.length,2);for(const d of result.restoration.dtFiles)assert.ok(d.bytes>1000&&/^[a-f0-9]{64}$/.test(d.sha256));assert.deepEqual(original,prior);
 const old=prior.snapshots;assert.equal(old.length,4);for(const v of old)assert.equal(v.split('|').length,8);
 for(const state of [m.before,m.after,i.before,i.after,mr,ir]){
  assert.equal(state.count,4);assert.deepEqual(state.snapshots,old);assert.deepEqual(state.report.map(v=>[v.count,v.minutes]),[[3,105],[1,15],[4,120]]);assert.deepEqual(state.customers.map(c=>[c.id,c.code,c.name]),m.before.customers.map(c=>[c.id,c.code,c.name]));assert.equal(state.noteMetadata.length,80);assert.equal(state.noteMetadata.fillChecking,'Не проверять');
 }
 assert.deepEqual(m.before.customers.map(c=>c.note),['','']);for(const state of [m.after,mr,i.before,i.after,ir])assert.deepEqual(state.customers.map(c=>c.note),['Учебная заметка сохранена в новой копии.','']);assert.deepEqual(mr.channelMetadata,{exists:false});assert.deepEqual(i.before.channels.map(c=>c.channel),['','','','']);for(const state of [i.after,ir]){assert.deepEqual(state.channels.map(c=>c.channel),['Учебная форма','','','']);assert.equal(state.channelMetadata.length,40);assert.equal(state.channelMetadata.synonym,'Канал обращения');assert.equal(state.channelMetadata.fillChecking,'Не проверять');}
 const schema='Reports/ЗаявкиПоКлиентам/Templates/ОсновнаяСхемаКомпоновкиДанных/Ext/Template.xml';for(const kind of ['main','independent'])assert.deepEqual(await readFile(native+'source-'+kind+'/'+schema),await readFile('courses/onec-education/native/service-desk-reports-v2/'+schema));
 const failed=await json(native+'FAILED_EXPERIMENTS_RU.json');assert.match(failed.startup.problem,/timeout45sec/);assert.match(failed.startup.rootCause,/UNKNOWN/);assert.ok(result.notRun.some(v=>v.includes('80/81')));
 const captures=await json(docs+'R65_ENTERPRISE_A4_MODULE_NATIVE_CAPTURES.json');assert.equal(captures.images.length,2);for(const im of captures.images){assert.equal(sha(await readFile(docs+im.sourceCapture)),im.sourcePngSha256);assert.equal(sha(await readFile('courses/clarity/'+im.src)),im.sha256);assert.ok(im.width>1000&&im.height>500);}
 assert.match(await readFile(native+'saved-note-GUI-accessibility.txt','utf8'),/Учебная заметка сохранена в новой копии\./);const gui=await readFile(native+'saved-channel-GUI-accessibility.txt','utf8');for(const n of ['A30000001','A30000002','A30000003','A30000004','Учебная форма'])assert.ok(gui.includes(n));
});

test('A4: принятые C++, P1–P12,A1–A3 и прочие контракты прежние;два UI-исключения по SHA256; последующие модули отдельно',async()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-state.mjs','core/storage.js','core/account-storage.js','styles','sandbox','pwa','project-studio','server-access','sync'])assert.equal(approvedPresentationDiff(git('diff','--name-only',base,'--',area)).toString().trim(),'',area);
 const future=Object.keys(CLARITY_COURSES).filter(id=>/^onec\.p1[012]\.|^1c-enterprise\.a[1-8]\./.test(id)),allowed=new Set(future.flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')));
 for(const f of git('diff','--name-only','-z',base,'--','courses/clarity/lessons').toString().split('\0').filter(Boolean))assert.ok(allowed.has(f)||!!referencePathId(f),f);
 const old=git('ls-tree','-r','--name-only','-z',base,'--','courses/clarity/authoring').toString().split('\0').filter(Boolean),files=old.flatMap(p=>[p,p.replace('/authoring/','/lessons/')]);
 const raw=execFileSync('git',['-c','core.longpaths=true','cat-file','--batch'],{input:files.map(f=>base+':'+f+'\n').join(''),maxBuffer:64e6});let offset=0;
 for(const f of files){const end=raw.indexOf(10,offset),header=raw.subarray(offset,end).toString().split(' ');assert.equal(header[1],'blob',f);const size=Number(header[2]),blob=raw.subarray(end+1,end+1+size);assertPreservedOrReference(f,await readFile(f),blob,f);offset=end+size+2;}

});
