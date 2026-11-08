import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
import {gradeQuiz} from '../courses/onec-education/model.mjs';
import {lessonFiguresMarkup} from '../courses/onec-education/lesson-media.mjs';
const ids=[1,2,3,4].map(i=>'onec.p5.topic-'+i),base='d53e6ba261103e606b0bc92de9e9214e68bd3b8e';
const root='docs/ru/03-content/cpp-clarity-01/',native=root+'R3_EVIDENCE/onec-p5-module/native/';
const json=async p=>JSON.parse(await readFile(p,'utf8')),sha=s=>createHash('sha256').update(s).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});
const readableType=s=>s.replace('фактическое значение Новая с ПеречислениеСсылка.СтатусыЗаявки','тип значения Новая с типом ссылки на перечисление статусов заявки').replace('the actual Новая value as ПеречислениеСсылка.СтатусыЗаявки','the type of the actual Новая value as an enumeration reference for request statuses');

test('P5: четыре полные пары, сильная исходная теория и вопросы сохранены; заготовка и новая задача различаются',async()=>{
 const sources=await json(native+'CASE_SOURCES.json');
 for(const id of ids)for(const locale of ['ru','en']){
  const a=await json('courses/clarity/authoring/'+id+'.'+locale+'.json'),d=await json('courses/clarity/lessons/'+id+'.'+locale+'.json'),old=await json(a.source.path);
  assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(d.authored,true);assert.equal(a.revision,d.contentRevision);assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const key of ['sections','selfcheck','practice','assessment','reading'])assert.deepEqual(a[key],d[key]);
  assert.equal(a.sections.length,14);assert.ok(a.sections.every(s=>s.paragraphs.length>=1));const anchors=new Set(a.sections.map(s=>s.id));assert.equal(anchors.size,14);
  for(const anchor of [...Object.values(a.coverage),...a.sourceCoverage.map(s=>s.anchor),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(anchor),anchor);
  assert.deepEqual(a.sourceCoverage.map(s=>s.sourceTitle),old.sections.map(s=>s[0]));
  for(const [i,q]of old.quiz.entries()){const kept=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([kept.prompt,kept.options,kept.correct],[q.question,q.options,q.correct]);assert.deepEqual(a.sections.find(s=>s.id==='concept-'+i).paragraphs,old.sections[i].slice(1).map(readableType));}
  const choices=a.selfcheck.filter(q=>q.kind==='choice');assert.equal(choices.length,5);assert.equal(gradeQuiz(a.assessment.quiz,choices.map(q=>q.correct)).correct,5);assert.equal(a.selfcheck.filter(q=>q.kind==='free').length,1);
  assert.equal(a.practice.files.length,2);assert.match(a.practice.files[0].content,/TODO/);assert.notEqual(a.practice.files[0].content,a.practice.referenceSolution.source);assert.equal(a.practice.steps.length,5);
  const [main,lab]=a.nativeEvidence.cases.map(cid=>sources.cases.find(c=>c.id===cid));assert.equal(a.sections.find(s=>s.id==='main-function').code.source,main.functionSource);assert.equal(a.sections.find(s=>s.id==='example-1').code.source,main.fullHandlerSource);assert.equal(a.practice.referenceSolution.source,lab.functionSource);
  assert.deepEqual(a.practice.referenceSolution.files,{'Данные.bsl':lab.functionSource,'Приложение.bsl':lab.fullHandlerSource});assert.ok(a.practice.criteria.every(s=>!s.includes('\\n')));
 }
});

test('P5: только восемь основных native наблюдений, четыре настоящих GUI результата; область доказательства не завышена',async()=>{
 const sources=await json(native+'CASE_SOURCES.json'),actual=await json(native+'RESULT.json'),report=await json(root+'R65_ONEC_P5_MODULE_NATIVE_RESULT.json'),media=await json(root+'R65_ONEC_P5_MODULE_NATIVE_CAPTURES.json');
 assert.equal(actual.status,'NATIVE BASIC PASS');assert.equal(actual.caseCount,8);assert.equal(actual.serverQAWrapper,false);assert.equal(report.guiCases,4);assert.equal(report.plainStandaloneHandlerGUI,false);assert.equal(report.extendedMatrixRun,false);assert.equal(report.studentAuthorshipVerified,false);
 const module=await readFile(native+'source/CommonModules/УчебныеДанные/Ext/Module.bsl','utf8'),log=await readFile(native+'ACTUAL_BASIC.txt','utf8');
 for(const c of sources.cases){assert.equal(sha(c.functionSource),c.functionSha256);assert.equal(sha(c.fullHandlerSource),c.handlerSha256);assert.ok(module.includes(c.functionSource.trim()));const result=actual.cases.find(x=>x.id===c.id);assert.equal(result.actual,c.expectedValues.join('|'));assert.ok(log.includes('VALUE:'+c.id+':'+result.actual));}
 assert.equal(media.images.length,4);
 for(const im of media.images){const c=sources.cases.find(c=>c.id===im.sourceCase),gui=report.GUI.find(g=>g.id===im.sourceCase);assert.equal(gui.plainStandaloneHandlerGUI,false);assert.deepEqual(gui.labelledAssertions,c.labels.map((l,i)=>l+': '+c.expectedValues[i]));assert.ok(gui.labelledAssertions.every(v=>gui.actualMessages.includes(v)));if(c.id==='events-main')assert.deepEqual(gui.actualMessages.slice(0,2),['Укажите учебного клиента и услугу.','Минуты должны быть в диапазоне 0..1440.']);assert.equal(sha(await readFile(root+im.sourceCapture)),im.sourcePngSha256);assert.equal(sha(await readFile('courses/clarity/'+im.src)),im.sha256);for(const locale of ['ru','en']){const a=await json('courses/clarity/authoring/'+im.topicId+'.'+locale+'.json');const figures=a.sections.flatMap(s=>s.figures||[]);assert.equal(figures.length,1);assert.match(lessonFiguresMarkup(figures,locale),/data-onec-figure/);}}
});

test('P5: принятые C++, P1–P4 и защищённые контракты остаются побайтно прежними',async()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-state.mjs','core/storage.js','core/account-storage.js','styles','sandbox','pwa','project-studio','server-access','sync'])assert.equal(git('diff','--name-only',base,'--',area).toString().trim(),'',area);
 const approved=[...ids,'onec.p6.topic-1','onec.p6.topic-2','onec.p6.topic-3','onec.p6.topic-4','onec.p6.reposting','onec.p7.topic-1','onec.p7.topic-3','onec.p7.topic-4','onec.p8.topic-1','onec.p8.topic-2','onec.p8.topic-3','onec.p8.topic-4'].flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')).sort();assert.deepEqual(git('diff','--name-only',base,'--','courses/clarity/lessons').toString().trim().split(/\r?\n/).sort(),approved);
 const old=git('ls-tree','-r','--name-only',base,'--','courses/clarity/authoring').toString().trim().split(/\r?\n/).filter(p=>/\/onec\.p[1234]\./.test(p));
 for(const p of old)for(const file of [p,p.replace('/authoring/','/lessons/')])assert.deepEqual(await readFile(file),git('show',base+':'+file),file);
});
