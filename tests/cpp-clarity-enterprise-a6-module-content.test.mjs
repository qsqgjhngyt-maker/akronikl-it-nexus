import {approvedPresentationDiff,approvedVisualStylesAddition,assertPreservedOrWrappedFlow} from './helpers/cpp-clarity-approved-presentation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
const ids=['1c-enterprise.a6.topic-1', '1c-enterprise.a6.topic-2', '1c-enterprise.a6.topic-3', '1c-enterprise.a6.topic-4'],base='624ec788577689c4882dfbcc6adb020ea2af7a4b';
const docs='docs/ru/03-content/cpp-clarity-01/',native=docs+'R3_EVIDENCE/1c-enterprise-a6-module/native/';
const json=async p=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,'')),sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});



test('A6: четыре прикладных урока RU/EN, исходная сильная теория, новые ручные задачи и эталоны',async()=>{
 const edits=await json(docs+'R65_ENTERPRISE_A6_THEORY_PRESENTATION_EXCEPTIONS.json');assert.deepEqual(edits.quiz,[{"id": "1c-enterprise.a6.topic-4", "locale": "en", "question": 1, "option": 1, "before": "Versions/steps/expectation/observation", "after": "Versions / steps / expectation / observation"}]);
 for(const id of ids)for(const locale of ['ru','en']){
  const a=await json('courses/clarity/authoring/'+id+'.'+locale+'.json'),d=await json('courses/clarity/lessons/'+id+'.'+locale+'.json'),old=await json(a.source.path);
  assert.equal(old.topicId,id);assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(d.authored,true);assert.equal(CLARITY_COURSES[id].courseId,'1c-enterprise');assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const k of ['sections','selfcheck','practice','assessment'])assert.deepEqual(a[k],d[k]);assert.equal(a.sections.length,15+Math.max(0,old.sections.length-4));
  for(const[i,s]of old.sections.entries())assert.deepEqual(a.sections.find(s=>s.id==='concept-'+i).paragraphs,s.slice(1).map(p=>edits[locale].reduce((v,[x,y])=>v.replaceAll(x,y),p)));
  for(const[i,q]of old.quiz.entries()){const k=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([k.prompt,k.options,k.correct],[q.question,q.options.map((v,j)=>edits.quiz.find(e=>e.id===id&&e.locale===locale&&e.question===i&&e.option===j&&e.before===v)?.after||v),q.correct]);}
  assert.equal(a.selfcheck.filter(q=>q.kind==='choice').length,5);assert.equal(a.selfcheck.filter(q=>q.kind==='free').length,1);assert.deepEqual(a.practice.files,[]);assert.equal(a.practice.referenceSolution.language,'text');assert.ok(a.practice.referenceSolution.source.length>200);
  const example=a.sections.find(s=>s.id==='example-1').code;assert.equal(example.language,'text');assert.ok(example.output.length>80);assert.notEqual(example.output,a.practice.cases[0].output);assert.ok(!a.practice.cases[0].output.includes('\\n'));
  const route=a.sections.find(x=>x.id==='worked-route').paragraphs.join('\n');for(const text of [...old.lab.steps,...old.lab.expected])assert.ok(route.includes(text),text);
  const anchors=new Set(a.sections.map(s=>s.id));for(const k of [...Object.values(a.coverage),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(k),k);
  assert.equal(a.nativeEvidence.studentAuthorshipVerified,false);assert.ok(!a.prerequisites.some(p=>/P1.*P12/.test(p.text)),'The applied course has no programming-course prerequisite');
 }
});

test('A6: новые изолированные права и восстановление,метаданные и сохранность;прежние примеры закреплены отдельно',async()=>{
 const result=await json(native+'RESULT.json'),setup=await json(native+'SETUP.json'),reader=await json(native+'READER.json'),admin=await json(native+'ADMIN.json'),copy=await json(native+'REOPEN-copy.json'),original=await json(native+'REOPEN-original.json'),prior=await json(docs+'R3_EVIDENCE/1c-enterprise-a5-module/native/REOPEN-independent.json');assert.equal(result.status,'NATIVE BASIC PASS');assert.deepEqual(original,prior);
 assert.deepEqual(setup.createdProfiles,['NexusA6Admin','NexusA6Reader']);assert.equal(setup.passwordsUsed,false);assert.equal(setup.osAuthenticationUsed,false);assert.deepEqual(reader,{readAllowed:true,writeAllowed:false,number:'A52000001',before:40,attempted:41,refused:true,after:40});assert.deepEqual(admin.before,setup.before);
 for(const state of [setup.before,admin.afterDescription])for(const[k,v]of Object.entries(prior))assert.deepEqual(state[k],v,k);assert.equal(admin.descriptionInitiallyEmpty,true);assert.deepEqual(setup.before.descriptionMetadata,{name:'УчебноеОписание',length:100,fillChecking:'Не проверять'});assert.ok(setup.before.descriptions.every(x=>x.description===''));
 for(const state of [admin.afterDescription,admin.afterMinutes,admin.after,copy])for(const old of setup.before.descriptions)assert.deepEqual(state.descriptions.find(x=>x.id===old.id),{...old,description:old.code==='A5U2'?'Самостоятельное описание A6':''});assert.deepEqual(copy,admin.after);assert.deepEqual(admin.after,admin.afterMinutes);assert.equal(admin.businessRefused,true);assert.equal(admin.afterBusinessRefusal,50);assert.equal(admin.corrected50Read,50);
 const old=new Map(prior.snapshots.map(x=>[x.split('|')[0],x.split('|')])),after=new Map(copy.snapshots.map(x=>[x.split('|')[0],x.split('|')]));assert.equal(old.size,9);assert.deepEqual([...after.keys()],[...old.keys()]);let target;for(const[id,fields]of old){const expected=[...fields];if(fields[1]==='A52000001'){assert.equal(fields[5],'40');expected[5]='50';target=id;}assert.deepEqual(after.get(id),expected);}
 assert.ok(target);for(const table of prior.tables)assert.deepEqual(copy.tables.find(t=>t.id===table.id),{...table,header:table.id===target?50:table.header});assert.deepEqual(copy.customers,prior.customers);assert.deepEqual(copy.services,prior.services);assert.deepEqual(copy.report.at(-1),{level:0,customer:'',count:9,minutes:300});assert.equal(prior.report.at(-1).minutes,290);
 const reused=await json(docs+'R3_EVIDENCE/1c-enterprise-a6-module/pinned-prior/A6_ADMINISTRATION_RESULT.json');assert.match(result.pinnedPriorExecution.status,/NOT A NEW RUN/);assert.equal(reused.status,'AUTOMATED PASS');assert.equal(reused.originalControlMinutes,75);assert.equal(reused.changedCopyControlMinutes,90);assert.equal(sha(await readFile(result.pinnedPriorExecution.path)),result.pinnedPriorExecution.sha256);for(const f of reused.fixture)assert.equal(sha(await readFile('courses/onec-education/native/service-desk-administration-v2/'+f.path)),f.sha256);assert.equal(sha(await readFile('tools/check-onec-pedagogy-administration.ps1')),reused.runnerSha256);assert.equal(sha(await readFile('docs/ru/03-content/onec/pedagogy-v2-20261102/engineering/a6-administration-common.bsl')),reused.moduleSourceSha256);
 for(const file of ['Roles/УчебныйАдминистраторA6/Ext/Rights.xml','Roles/УчебныйЧитательA6/Ext/Rights.xml'])assert.deepEqual(await readFile(native+'source/'+file),await readFile('courses/onec-education/native/service-desk-administration-v2/'+file));assert.match(await readFile(native+'source/CommonModules/УчебноеАдминистрирование.xml','utf8'),/<Privileged>false<\/Privileged>/);assert.equal(result.freshExecution.nexusIAMChanged,false);assert.equal(result.freshExecution.workingACLChanged,false);assert.ok(result.operations.every(x=>x.exitCode===0));assert.equal(result.backupFiles.length,2);
 const captures=await json(docs+'R65_ENTERPRISE_A6_MODULE_NATIVE_CAPTURES.json');assert.equal(captures.images.length,2);for(const im of captures.images){assert.equal(sha(await readFile(docs+im.sourceCapture)),im.sourcePngSha256);assert.equal(sha(await readFile('courses/clarity/'+im.src)),im.sha256);assert.ok(im.width>1000&&im.height>500);}const service=await readFile(native+'service-description-GUI-accessibility.txt','utf8'),list=await readFile(native+'copy-list-GUI-accessibility.txt','utf8');assert.ok(service.includes('Самостоятельное описание A6'));assert.ok(list.includes('A52000001')&&list.includes('A52000005'));
});

test('A6: принятые C++, P1–P12,A1–A5 и прочие контракты прежние;два UI-исключения по SHA256; последующие модули отдельно',async()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-state.mjs','core/storage.js','core/account-storage.js','styles','sandbox','pwa','project-studio','server-access','sync'])assert.equal(approvedPresentationDiff(git('diff','--name-only',base,'--',area)).toString().trim(),'',area);
 const future=Object.keys(CLARITY_COURSES).filter(id=>/^onec\.p1[012]\.|^1c-enterprise\.a[1-8]\./.test(id)),allowed=new Set(future.flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')));
 for(const f of git('diff','--name-only','-z',base,'--','courses/clarity/lessons').toString().split('\0').filter(Boolean))assert.ok(allowed.has(f),f);
 const old=git('ls-tree','-r','--name-only','-z',base,'--','courses/clarity/authoring').toString().split('\0').filter(Boolean),files=old.flatMap(p=>[p,p.replace('/authoring/','/lessons/')]);
 const raw=execFileSync('git',['-c','core.longpaths=true','cat-file','--batch'],{input:files.map(f=>base+':'+f+'\n').join(''),maxBuffer:64e6});let offset=0;
 for(const f of files){const end=raw.indexOf(10,offset),header=raw.subarray(offset,end).toString().split(' ');assert.equal(header[1],'blob',f);const size=Number(header[2]),blob=raw.subarray(end+1,end+1+size);assert.deepEqual(await readFile(f),blob,f);offset=end+size+2;}

});
