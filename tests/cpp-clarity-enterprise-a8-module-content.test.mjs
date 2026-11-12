import {assertPreservedOrReference,referencePathId} from './helpers/reference-course-contract.mjs';
import {assertApprovedPresentationPaths,approvedPresentationDiff,approvedVisualStylesAddition,assertPreservedOrWrappedFlow} from './helpers/cpp-clarity-approved-presentation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
const ids=['1c-enterprise.a8.topic-1', '1c-enterprise.a8.topic-2', '1c-enterprise.a8.topic-3', '1c-enterprise.a8.topic-4'],base='408f875ea0c7a64154af6857c9c05a6716570c0a';
const docs='docs/ru/03-content/cpp-clarity-01/',native=docs+'R3_EVIDENCE/1c-enterprise-a8-module/native/';
const json=async p=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,'')),sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});



test('A8: четыре прикладных урока RU/EN, исходная сильная теория, новые ручные задачи и эталоны',async()=>{
 const edits=await json(docs+'R65_ENTERPRISE_A8_THEORY_PRESENTATION_EXCEPTIONS.json');assert.equal(edits.semanticCorrections.length,2);for(const locale of ['ru','en'])for(const[x,y]of edits[locale]){const semantic=edits.semanticCorrections.find(c=>c.locale===locale&&c.before===x);if(semantic){assert.equal(semantic.after,y);assert.equal(semantic.id,'1c-enterprise.a8.topic-4');assert.equal(semantic.sourceAnchor,'sections.1.1');assert.match(semantic.reason,/no period\/status filter/);}else assert.equal(y,x.replaceAll('/',' / '));}assert.equal(edits.quiz.length,2);assert.ok(edits.quiz.every(e=>e.id==='1c-enterprise.a8.topic-2'&&e.question===1&&e.option===0&&e.after===e.before.replaceAll('/',' / ')));
 for(const id of ids)for(const locale of ['ru','en']){
  const a=await json('courses/clarity/authoring/'+id+'.'+locale+'.json'),d=await json('courses/clarity/lessons/'+id+'.'+locale+'.json'),old=await json(a.source.path);
  assert.equal(old.topicId,id);assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(d.authored,true);assert.equal(CLARITY_COURSES[id].courseId,'1c-enterprise');assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const k of ['sections','selfcheck','practice','assessment'])assert.deepEqual(a[k],d[k]);assert.equal(a.sections.length,15+Math.max(0,old.sections.length-4));
  for(const[i,s]of old.sections.entries())assert.deepEqual(a.sections.find(s=>s.id==='concept-'+i).paragraphs,s.slice(1).map(p=>edits[locale].reduce((v,[x,y])=>v.replaceAll(x,y),p)));
  for(const[i,q]of old.quiz.entries()){const k=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([k.prompt,k.options,k.correct],[q.question,q.options.map((v,j)=>edits.quiz.find(e=>e.id===id&&e.locale===locale&&e.question===i&&e.option===j&&e.before===v)?.after||v),q.correct]);}
  assert.equal(a.selfcheck.filter(q=>q.kind==='choice').length,5);assert.equal(a.selfcheck.filter(q=>q.kind==='free').length,1);assert.deepEqual(a.practice.files,[]);assert.equal(a.practice.referenceSolution.language,'text');assert.ok(a.practice.referenceSolution.source.length>200);
  const example=a.sections.find(s=>s.id==='example-1').code;assert.equal(example.language,'text');assert.ok(example.output.length>80);assert.notEqual(example.output,a.practice.cases[0].output);assert.ok(!a.practice.cases[0].output.includes('\\n'));
  const route=a.sections.find(x=>x.id==='worked-route').paragraphs.join('\n');for(const text of [...old.lab.steps,...old.lab.expected])assert.ok(route.includes(edits[locale].reduce((v,[x,y])=>v.replaceAll(x,y),text)),text);
  const anchors=new Set(a.sections.map(s=>s.id));for(const k of [...Object.values(a.coverage),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(k),k);
  assert.equal(a.nativeEvidence.studentAuthorshipVerified,false);assert.ok(!a.prerequisites.some(p=>/P1.*P12/.test(p.text)),'The applied course has no programming-course prerequisite');
 }
});

test('A8: настоящая DTкопия400→420,два отказа и сохранность;основной440→455 закреплён отдельно',async()=>{
 const result=await json(native+'RESULT.json'),base=await json(native+'BASELINE.json'),run=await json(native+'VERIFY.json'),copy=await json(native+'REOPEN-copy.json'),original=await json(native+'REOPEN-original.json'),prior=await json(docs+'R3_EVIDENCE/1c-enterprise-a7-module/native/REOPEN-copy.json');assert.equal(result.status,'NATIVE BASIC PASS');assert.deepEqual(base,prior);assert.deepEqual(original,prior);assert.deepEqual(run.before,base);assert.deepEqual(run.afterRange,base);assert.deepEqual(run.afterCustomer,base);assert.equal(run.rangeRefused,true);assert.equal(run.customerRefused,true);assert.deepEqual(run.after,copy);assert.deepEqual(base.before,base.after);assert.deepEqual(copy.before,copy.after);
 const old=base.after,current=copy.after;assert.equal(old.count,12);assert.equal(current.count,12);assert.equal(old.report.at(-1).minutes,400);assert.equal(current.report.at(-1).minutes,420);assert.equal(base.beta.at(-1).minutes,15);assert.equal(copy.beta.at(-1).minutes,35);for(const field of ['customers','services','descriptions','descriptionMetadata'])assert.deepEqual(current[field],old[field]);for(const key of ['alpha','own','north','emptyTwin'])assert.deepEqual(copy[key],base[key]);
 const before=new Map(old.snapshots.map(x=>[x.split('|')[0],x.split('|')])),after=new Map(current.snapshots.map(x=>[x.split('|')[0],x.split('|')]));assert.deepEqual([...before.keys()],[...after.keys()]);let target;for(const[id,fields]of before){const expected=[...fields];if(fields[1]==='A71000003'){assert.equal(fields[5],'15');expected[5]='35';target=id;}assert.deepEqual(after.get(id),expected);}assert.ok(target);for(const row of old.tables)assert.deepEqual(current.tables.find(x=>x.id===row.id),{...row,header:row.id===target?35:row.header});
 const pinned=await json(docs+'R3_EVIDENCE/1c-enterprise-a8-module/pinned-prior/PEDAGOGY_CAPSTONE_RESULT.json');assert.equal(pinned.status,'AUTOMATED PASS');assert.deepEqual([pinned.originalControlMinutes,pinned.changedCopyControlMinutes],[440,455]);assert.match(result.pinnedPrior.status,/NOT A NEW RUN/);assert.equal(sha(await readFile(result.pinnedPrior.path)),result.pinnedPrior.sha256);for(const f of pinned.fixture)assert.equal(sha(await readFile('courses/onec-education/native/service-desk-professional-v2/'+f.path)),f.sha256);assert.equal(sha(await readFile('tools/check-onec-pedagogy-capstone.ps1')),pinned.runnerSha256);assert.equal(sha(await readFile('docs/ru/03-content/onec/pedagogy-v2-20261102/engineering/capstone-current-common.bsl')),pinned.moduleSourceSha256);
 assert.match(await readFile(native+'source/CommonModules/УчебныйИтогA8.xml','utf8'),/<Privileged>false<\/Privileged>/);assert.deepEqual(await readFile(native+'source/Reports/ЗаявкиПоКлиентам.xml'),await readFile(docs+'R3_EVIDENCE/1c-enterprise-a7-module/native/source/Reports/ЗаявкиПоКлиентам.xml'));assert.equal(result.nativeDCS,true);assert.equal(result.backupFiles.length,2);assert.ok(result.operations.every(x=>x.exitCode===0));assert.equal(result.ownWindowsClosed,true);assert.equal(result.ownerWindowsUntouched,23);
 const captures=await json(docs+'R65_ENTERPRISE_A8_MODULE_NATIVE_CAPTURES.json');assert.equal(captures.images.length,2);for(const im of captures.images){assert.equal(sha(await readFile(docs+im.sourceCapture)),im.sourcePngSha256);assert.equal(sha(await readFile('courses/clarity/'+im.src)),im.sha256);assert.ok(im.width>1000&&im.height>500);}const list=await readFile(native+'list-12-GUI-accessibility.txt','utf8');assert.ok(list.includes('A71000003')&&list.includes('A30000001'));
 const a6=await json(docs+'R65_ENTERPRISE_A6_MODULE_REPORT_RU.json'),a7=await json(docs+'R65_ENTERPRISE_A7_MODULE_REPORT_RU.json');assert.equal(a6.masterFinalClose.decision,'a4de22dd-0646-4846-8821-54fd16f4e700');assert.equal(a7.masterFinalClose.decision,'c62671f7-4aed-411e-9e8b-7ddeb4a0bba4');
});

test('A8: принятые C++, P1–P12,A1–A7 и прочие контракты прежние;два UI-исключения по SHA256; последующие модули отдельно',async()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-state.mjs','core/storage.js','core/account-storage.js','styles','sandbox','pwa','project-studio','server-access','sync'])assert.equal(approvedPresentationDiff(git('diff','--name-only',base,'--',area)).toString().trim(),'',area);
 const future=Object.keys(CLARITY_COURSES).filter(id=>/^onec\.p1[012]\.|^1c-enterprise\.a[1-8]\./.test(id)),allowed=new Set(future.flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')));
 for(const f of git('diff','--name-only','-z',base,'--','courses/clarity/lessons').toString().split('\0').filter(Boolean))assert.ok(allowed.has(f)||!!referencePathId(f),f);
 const old=git('ls-tree','-r','--name-only','-z',base,'--','courses/clarity/authoring').toString().split('\0').filter(Boolean),files=old.flatMap(p=>[p,p.replace('/authoring/','/lessons/')]);
 const raw=execFileSync('git',['-c','core.longpaths=true','cat-file','--batch'],{input:files.map(f=>base+':'+f+'\n').join(''),maxBuffer:64e6});let offset=0;
 for(const f of files){const end=raw.indexOf(10,offset),header=raw.subarray(offset,end).toString().split(' ');assert.equal(header[1],'blob',f);const size=Number(header[2]),blob=raw.subarray(end+1,end+1+size);assertPreservedOrReference(f,await readFile(f),blob,f);offset=end+size+2;}

});
