import {approvedPresentationDiff,approvedVisualStylesAddition,assertPreservedOrWrappedFlow} from './helpers/cpp-clarity-approved-presentation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
const ids=['1c-enterprise.a7.topic-1', '1c-enterprise.a7.topic-2', '1c-enterprise.a7.topic-3', '1c-enterprise.a7.topic-4'],base='640911b656da0a34a8de7fb80c46dfb5afc604cf';
const docs='docs/ru/03-content/cpp-clarity-01/',native=docs+'R3_EVIDENCE/1c-enterprise-a7-module/native/';
const json=async p=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,'')),sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});



test('A7: четыре прикладных урока RU/EN, исходная сильная теория, новые ручные задачи и эталоны',async()=>{
 const edits=await json(docs+'R65_ENTERPRISE_A7_THEORY_PRESENTATION_EXCEPTIONS.json');assert.deepEqual(edits.quiz,[]);assert.deepEqual(edits.ru,[]);assert.deepEqual(edits.en,[['provenance/source/version/permission','provenance / source / version / permission'],['paths/keys/time/settings','paths / keys / time / settings'],['author/code/permissions/environment','author / code / permissions / environment'],['inputs/boundaries/expectations','inputs / boundaries / expectations']]);
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

test('A7: настоящая СКД,новый сохранённый вариант и сохранность12записей;неизвестныйEPFне запускался',async()=>{
 const result=await json(native+'RESULT.json'),seed=await json(native+'INSPECT.json'),change=await json(native+'MUTATE.json'),copy=await json(native+'REOPEN-copy.json'),original=await json(native+'REOPEN-original.json'),prior=await json(docs+'R3_EVIDENCE/1c-enterprise-a6-module/native/REOPEN-copy.json');assert.equal(result.status,'NATIVE BASIC PASS');assert.deepEqual(original,prior);assert.equal(prior.count,9);assert.equal(prior.report.at(-1).minutes,300);
 for(const state of [seed,change.afterMain,change.afterOwn,copy]){assert.deepEqual(state.before,state.after);assert.equal(state.before.count,12);assert.deepEqual(state.own,state.returnOwn);assert.deepEqual(state.all,state.clear);assert.equal(state.north.at(-1).minutes,105);assert.deepEqual(state.emptyTwin,[{level:0,customer:'',count:0,minutes:0,nativeNullTotal:true}]);}
 for(const[state,key,minutes,count]of [[seed,'all',390,12],[seed,'alpha',75,2],[seed,'beta',15,1],[seed,'own',180,5],[change.afterMain,'all',395,12],[change.afterMain,'alpha',80,2],[change.afterMain,'own',180,5],[copy,'all',400,12],[copy,'alpha',80,2],[copy,'own',185,5]])assert.deepEqual([state[key].at(-1).minutes,state[key].at(-1).count],[minutes,count]);assert.deepEqual(copy,change.afterOwn);assert.deepEqual(change.before,seed.after);
 const before=seed.before,after=copy.after;for(const field of ['customers','services','descriptions']){assert.deepEqual(before[field],after[field]);for(const old of prior[field])assert.deepEqual(before[field].find(x=>x.id===old.id),old);}assert.deepEqual(before.descriptionMetadata,after.descriptionMetadata);
 const old=new Map(before.snapshots.map(x=>[x.split('|')[0],x.split('|')])),current=new Map(after.snapshots.map(x=>[x.split('|')[0],x.split('|')]));assert.equal(old.size,12);assert.deepEqual([...old.keys()],[...current.keys()]);for(const raw of prior.snapshots)assert.deepEqual(old.get(raw.split('|')[0]),raw.split('|'));let changed=0;for(const[id,fields]of old){const expected=[...fields];if(fields[1]==='A71000001'){assert.equal(fields[5],'30');expected[5]='35';changed++;}if(fields[1]==='A52000002'){assert.equal(fields[5],'25');expected[5]='30';changed++;}assert.deepEqual(current.get(id),expected);}assert.equal(changed,2);
 for(const table of before.tables)assert.deepEqual(after.tables.find(x=>x.id===table.id),{...table,header:table.number==='A71000001'?35:table.number==='A52000002'?30:table.header});for(const table of prior.tables)assert.deepEqual(before.tables.find(x=>x.id===table.id),table);
 assert.equal(result.nativeDCS,true);assert.equal(result.queriesNotSubstituted,true);assert.match(await readFile(native+'source/CommonModules/УчебныеОтчетыA7/Ext/Module.bsl','utf8'),/ПроцессорКомпоновкиДанных/);assert.match(await readFile(native+'source/CommonModules/УчебныеОтчетыA7.xml','utf8'),/<Privileged>false<\/Privileged>/);assert.deepEqual(await readFile(native+'source/Reports/ЗаявкиПоКлиентам.xml'),await readFile(docs+'R3_EVIDENCE/1c-enterprise-a6-module/native/source/Reports/ЗаявкиПоКлиентам.xml'));
 assert.equal(result.variant.status,'ACTUAL GUI PASS');assert.equal(result.variant.name,'A7 — продолжение — минуты');assert.equal(new Set(result.variant.newProcesses).size,3);assert.deepEqual([result.variant.savedAt,result.variant.selectedAfterReopen,result.variant.regeneratedAfterDataEdit],[180,180,185]);assert.equal(result.variant.defaultStillListed,true);assert.equal(result.externalProcessors.fileAcquired,false);assert.equal(result.externalProcessors.fileOpened,false);assert.equal(result.externalProcessors.securitySettingsChanged,false);assert.equal(result.requirement.status,'PLANNED');assert.equal(result.requirement.periodAndStatusFilterImplemented,false);
 const captures=await json(docs+'R65_ENTERPRISE_A7_MODULE_NATIVE_CAPTURES.json');assert.equal(captures.images.length,3);for(const im of captures.images){assert.equal(sha(await readFile(docs+im.sourceCapture)),im.sourcePngSha256);assert.equal(sha(await readFile('courses/clarity/'+im.src)),im.sha256);assert.ok(im.width>1000&&im.height>500);}for(const f of result.guiCaptures)assert.equal(sha(await readFile(native+f.file)),f.sha256);assert.equal(result.backups.length,2);assert.equal(result.ownWindowsClosed,true);assert.equal(result.ownerWindowsUntouched,23);assert.equal((await json(native+'FAILED_SEED_OBSERVATION_RU.json')).status,'FAILED OBSERVATION;SEED NOT REPEATED');
});

test('A7: принятые C++, P1–P12,A1–A6 и прочие контракты прежние;два UI-исключения по SHA256; последующие модули отдельно',async()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-state.mjs','core/storage.js','core/account-storage.js','styles','sandbox','pwa','project-studio','server-access','sync'])assert.equal(approvedPresentationDiff(git('diff','--name-only',base,'--',area)).toString().trim(),'',area);
 const future=Object.keys(CLARITY_COURSES).filter(id=>/^onec\.p1[012]\.|^1c-enterprise\.a[1-8]\./.test(id)),allowed=new Set(future.flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')));
 for(const f of git('diff','--name-only','-z',base,'--','courses/clarity/lessons').toString().split('\0').filter(Boolean))assert.ok(allowed.has(f),f);
 const old=git('ls-tree','-r','--name-only','-z',base,'--','courses/clarity/authoring').toString().split('\0').filter(Boolean),files=old.flatMap(p=>[p,p.replace('/authoring/','/lessons/')]);
 const raw=execFileSync('git',['-c','core.longpaths=true','cat-file','--batch'],{input:files.map(f=>base+':'+f+'\n').join(''),maxBuffer:64e6});let offset=0;
 for(const f of files){const end=raw.indexOf(10,offset),header=raw.subarray(offset,end).toString().split(' ');assert.equal(header[1],'blob',f);const size=Number(header[2]),blob=raw.subarray(end+1,end+1+size);assert.deepEqual(await readFile(f),blob,f);offset=end+size+2;}

});
