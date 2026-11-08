import {approvedPresentationDiff,approvedVisualStylesAddition,assertPreservedOrWrappedFlow} from './helpers/cpp-clarity-approved-presentation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
import {gradeQuiz} from '../courses/onec-education/model.mjs';
import {lessonFiguresMarkup} from '../courses/onec-education/lesson-media.mjs';
const ids=['onec.p7.topic-1','onec.p7.topic-3','onec.p7.topic-4'],base='e55c0d4d85293f834f6dcacf9c67720caac270c1';
const root='docs/ru/03-content/cpp-clarity-01/',native=root+'R3_EVIDENCE/onec-p7-module/native/';
const json=async p=>JSON.parse(await readFile(p,'utf8')),sha=s=>createHash('sha256').update(s).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});
const readableType=s=>s.replace('фактическое значение Новая с ПеречислениеСсылка.СтатусыЗаявки','тип значения Новая с типом ссылки на перечисление статусов заявки').replace('the actual Новая value as ПеречислениеСсылка.СтатусыЗаявки','the type of the actual Новая value as an enumeration reference for request statuses');

test('P7: три новые пары и сохранённый пилот, сильная исходная теория и вопросы сохранены; заготовка и новая задача различаются',async()=>{
 const sources=await json(native+'CASE_SOURCES.json');
 for(const id of ids)for(const locale of ['ru','en']){
  const a=await json('courses/clarity/authoring/'+id+'.'+locale+'.json'),d=await json('courses/clarity/lessons/'+id+'.'+locale+'.json'),old=await json(a.source.path);
  assert.equal(old.topicId,id);assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(d.authored,true);assert.equal(a.revision,d.contentRevision);assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const key of ['sections','selfcheck','practice','assessment','reading'])assert.deepEqual(a[key],d[key]);
  assert.equal(a.sections.length,14);assert.ok(a.sections.every(s=>s.paragraphs.length>=1));const anchors=new Set(a.sections.map(s=>s.id));assert.equal(anchors.size,14);
  for(const anchor of [...Object.values(a.coverage),...a.sourceCoverage.map(s=>s.anchor),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(anchor),anchor);
  assert.deepEqual(a.sourceCoverage.map(s=>s.sourceTitle),old.sections.map(s=>s[0]));
  for(const [i,q]of old.quiz.entries()){const kept=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([kept.prompt,kept.options,kept.correct],[q.question,q.options,q.correct]);}
  const edits=await json(root+'R65_ONEC_P7_THEORY_PRESENTATION_EXCEPTIONS.json');for(const [i,s]of old.sections.entries())assert.deepEqual(a.sections.find(s=>s.id==='concept-'+i).paragraphs,s.slice(1).map(p=>edits.reduce((v,[x,y])=>v.replaceAll(x,y),p)));
  const choices=a.selfcheck.filter(q=>q.kind==='choice');assert.equal(choices.length,5);assert.equal(gradeQuiz(a.assessment.quiz,choices.map(q=>q.correct)).correct,5);assert.equal(a.selfcheck.filter(q=>q.kind==='free').length,1);
  assert.equal(a.practice.files.length,2);assert.match(a.practice.files[0].content,/TODO/);assert.notEqual(a.practice.files[0].content,a.practice.referenceSolution.source);assert.equal(a.practice.steps.length,5);
  const [main,lab]=a.nativeEvidence.cases.map(cid=>sources.cases.find(c=>c.id===cid));assert.equal(a.sections.find(s=>s.id==='main-function').code.source,main.functionSource);assert.equal(a.sections.find(s=>s.id==='example-1').code.source,main.fullHandlerSource);assert.equal(a.practice.referenceSolution.source,lab.functionSource);
  assert.deepEqual(a.practice.referenceSolution.files,{'Данные.bsl':lab.functionSource,'Приложение.bsl':lab.fullHandlerSource});assert.ok(a.practice.criteria.every(s=>!s.includes('\\n')));
 }
});

test('P7: только восемь подготовленных native наблюдений, три настоящих GUI результата; область доказательства не завышена',async()=>{
 const sources=await json(native+'CASE_SOURCES.json'),actual=await json(native+'RESULT.json'),report=await json(root+'R65_ONEC_P7_MODULE_NATIVE_RESULT.json'),media=await json(root+'R65_ONEC_P7_MODULE_NATIVE_CAPTURES.json');
 assert.equal(actual.status,'NATIVE BASIC PASS');assert.equal(actual.caseCount,8);assert.equal(actual.serverQAWrapper,false);assert.equal(report.guiCases,3);assert.equal(report.plainStandaloneHandlerGUI,false);assert.equal(report.extendedMatrixRun,false);assert.equal(report.studentAuthorshipVerified,false);
 const module=await readFile(native+'source/CommonModules/УчебныеДанные/Ext/Module.bsl','utf8'),log=await readFile(native+'ACTUAL_BASIC.txt','utf8');
 for(const c of sources.cases){assert.equal(sha(c.functionSource),c.functionSha256);assert.equal(sha(c.fullHandlerSource),c.handlerSha256);for(const def of c.functionSource.matchAll(/^Функция\s+.*?^КонецФункции[^\S\n]*(?:\n|$)/msg))assert.ok(module.includes(def[0].trim()),c.id);const result=actual.cases.find(x=>x.id===c.id);assert.equal(result.actual,c.expectedValues.join('|'));assert.ok(log.includes('VALUE:'+c.id+':'+result.actual));}
 assert.equal(media.images.length,3);
 for(const im of media.images){const c=sources.cases.find(c=>c.id===im.sourceCase),gui=report.GUI.find(g=>g.id===im.sourceCase);assert.equal(gui.plainStandaloneHandlerGUI,false);assert.deepEqual(gui.labelledAssertions,c.labels.map((l,i)=>l+': '+c.expectedValues[i]));assert.ok(gui.labelledAssertions.every(v=>gui.actualMessages.includes(v)));if(c.id==='events-main')assert.deepEqual(gui.actualMessages.slice(0,2),['Укажите учебного клиента и услугу.','Минуты должны быть в диапазоне 0..1440.']);assert.equal(sha(await readFile(root+im.sourceCapture)),im.sourcePngSha256);assert.equal(sha(await readFile('courses/clarity/'+im.src)),im.sha256);for(const locale of ['ru','en']){const a=await json('courses/clarity/authoring/'+im.topicId+'.'+locale+'.json');const figures=a.sections.flatMap(s=>s.figures||[]);assert.equal(figures.length,1);assert.match(lessonFiguresMarkup(figures,locale),/data-onec-figure/);}}
});

test('P7: принятые C++, P1–P6 и защищённые контракты остаются побайтно прежними',async()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-state.mjs','core/storage.js','core/account-storage.js','styles','sandbox','pwa','project-studio','server-access','sync'])assert.equal(approvedPresentationDiff(git('diff','--name-only',base,'--',area)).toString().trim(),'',area);
 const approved=[...ids,'onec.p8.topic-1','onec.p8.topic-2','onec.p8.topic-3','onec.p8.topic-4','onec.p9.topic-1','onec.p9.topic-2','onec.p9.topic-3','onec.p9.topic-4','onec.p10.topic-1','onec.p10.topic-2','onec.p10.topic-3','onec.p10.topic-4','onec.p10.safe-mode','onec.p11.topic-1','onec.p11.topic-2','onec.p11.topic-3','onec.p11.topic-4','onec.p12.topic-1','onec.p12.topic-2','onec.p12.topic-3','onec.p12.topic-4','1c-enterprise.a1.orientation','1c-enterprise.a1.modes','1c-enterprise.a1.interface','1c-enterprise.a1.safe-lab','1c-enterprise.a2.topic-1','1c-enterprise.a2.topic-2','1c-enterprise.a2.topic-3','1c-enterprise.a2.topic-4','1c-enterprise.a3.topic-1','1c-enterprise.a3.topic-2','1c-enterprise.a3.topic-3','1c-enterprise.a3.topic-4','1c-enterprise.a4.topic-1','1c-enterprise.a4.topic-2','1c-enterprise.a4.topic-3','1c-enterprise.a4.topic-4','1c-enterprise.a5.topic-1','1c-enterprise.a5.topic-2','1c-enterprise.a5.topic-3','1c-enterprise.a5.topic-4','1c-enterprise.a6.topic-1','1c-enterprise.a6.topic-2','1c-enterprise.a6.topic-3','1c-enterprise.a6.topic-4','1c-enterprise.a7.topic-1','1c-enterprise.a7.topic-2','1c-enterprise.a7.topic-3','1c-enterprise.a7.topic-4','1c-enterprise.a8.topic-1','1c-enterprise.a8.topic-2','1c-enterprise.a8.topic-3','1c-enterprise.a8.topic-4'].flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')).sort();assert.deepEqual(approvedPresentationDiff(git('diff','--name-only',base,'--','courses/clarity/lessons')).toString().trim().split(/\r?\n/).sort(),approved);
 const old=git('ls-tree','-r','--name-only',base,'--','courses/clarity/authoring').toString().trim().split(/\r?\n/).filter(p=>/\/onec\.p[123456]\./.test(p));
 for(const p of old)for(const file of [p,p.replace('/authoring/','/lessons/')])assert.deepEqual(await readFile(file),git('show',base+':'+file),file);
 for(const locale of ['ru','en']){const file='courses/cpp-clarity-r3/lessons/onec.p7.topic-2.'+locale+'.json';assert.deepEqual(await readFile(file),git('show',base+':'+file),file);}const prior=await import('data:text/javascript;base64,'+git('show',base+':core/clarity-course-registry.mjs').toString('base64'));assert.deepEqual(CLARITY_COURSES['onec.p7.topic-2'],prior.CLARITY_COURSES['onec.p7.topic-2']);
});
