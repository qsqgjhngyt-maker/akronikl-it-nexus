import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {module5GoldLessons,module5GoldPrograms,programFiles} from './helpers/module5-gold-programs.mjs';
import {GOLD_OOP_LESSONS,GOLD_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
import {academyGoldMarkup} from '../core/academy-gold-presentation.js';import {goldVisualizationSteps} from '../core/academy-gold-model.js';
import {cppProgramProgress,CPP_LEGACY_LESSON_IDS} from '../core/storage.js';import {orderedCppLessons,createLearningResume} from '../core/nexus-learning-discovery.js';
import {m5AuthoringScope} from '../tools/academy-gold-module5-authoring-scope.mjs';
const j=async f=>JSON.parse(await readFile(f)),all=await module5GoldLessons(),spec=await j('docs/ru/03-content/CPP_MODULE5_AUTHORING.json'),c=await j('courses/cpp/curriculum.json');
test('M5: 18 полных RU/EN объектов, теория причин, задания разных уровней и лабораторные',()=>{
 assert.equal(all.length,18);assert.equal(GOLD_LESSONS.length,55);assert.deepEqual(GOLD_OOP_LESSONS,spec.lessons.map(l=>l.id));
 for(const g of all){const p=spec.lessons.find(p=>p.id===g.lessonId);assert.equal(g.schemaVersion,1);assert.equal(g.moduleId,'cpp.section.oop');assert.equal(g.standardVersion,'academy-gold-1.1');assert.equal(g.target,'C++20');assert.equal(g.sessions,p.sessions);assert.deepEqual(g.prerequisiteIds,p.prerequisites);
  assert.equal(g.sections.length,8);assert.ok(g.sections.every(s=>s.paragraphs.length===2&&s.paragraphs.every(p=>p.length>=120)));assert.ok(g.sections.flatMap(s=>s.paragraphs).join(' ').split(/\s+/).length>=650,g.lessonId+' '+g.locale+' theory');
  assert.equal(g.concepts.length,8);assert.ok(g.concepts.every(t=>t.term&&t.definition.length>=20));assert.ok(g.objectives.length>=5&&g.prerequisites.length>=2);
  assert.equal(g.workedExamples.length,2);assert.ok(g.workedExamples.every(e=>e.steps.length>=3&&e.purpose&&e.expectedStdout));assert.equal(g.practice.length,6);assert.deepEqual(g.practice.map(p=>p.level),['basic','basic','applied','applied','transfer','transfer']);assert.equal(new Set(g.practice.map(p=>p.task)).size,6);
  assert.equal(g.experiments.length,2);assert.equal(g.diagnostics.length,3);assert.equal(g.assessment.length,5);assert.equal(g.readinessCheck.length,3);
  for(const q of [...g.assessment,...g.readinessCheck])assert.ok(q.question&&q.explanation&&q.answers.length===3&&new Set(q.answers).size===3&&Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<3);
  assert.equal(g.laboratory.verification,'manual-output-comparison');assert.ok(g.laboratory.steps.length>=6&&g.laboratory.rubric.length>=5&&g.laboratory.cases.length>=8);assert.notEqual(g.laboratory.starterCode,g.laboratory.referenceCode);
  const html=academyGoldMarkup(g);assert.ok(html.includes('data-gold-lesson="'+g.lessonId+'"'));assert.ok(html.includes('data-gold-open-editor'));assert.equal((html.match(/rel="noopener noreferrer"/g)||[]).length,g.sourceRefs.length);assert.equal(goldVisualizationSteps(g.visualization,{},g.locale).length,5);
  if(g.locale==='en')assert.ok(!/[А-Яа-яЁё]/.test(JSON.stringify(g)),g.lessonId+' untranslated English');
 }
});
test('Старые quiz и все RU/EN исполняемые контракты сохранены без переписывания',async()=>{
 const ru=await j('courses/cpp/data/lessons.ru.json');for(const id of GOLD_OOP_LESSONS){const a=all.find(g=>g.lessonId===id&&g.locale==='ru'),b=all.find(g=>g.lessonId===id&&g.locale==='en');assert.deepEqual(a.legacyQuiz,ru.lessons.find(l=>l.id===id).quiz);assert.equal(a.legacyQuiz.correctIndex,b.legacyQuiz.correctIndex);for(const k of ['objectives','concepts','practice','assessment','sections'])assert.equal(a[k].length,b[k].length);for(let i=0;i<5;i++)assert.equal(a.assessment[i].correctIndex,b.assessment[i].correctIndex)}
 const ps=await module5GoldPrograms();assert.ok(ps.length>=40);assert.ok(ps.reduce((n,p)=>n+p.cases.length,0)>=160);for(const p of ps){assert.ok(p.aliases.some(a=>a.locale==='ru')&&p.aliases.some(a=>a.locale==='en'),p.id);for(const x of p.cases){assert.equal(typeof x.stdin,'string');assert.equal(typeof x.stdout,'string');assert.equal(programFiles(p,x)['main.cpp'],p.source)}}
 const missing=ps.find(p=>p.id.endsWith('project-reference'));assert.ok(missing.cases.some(c=>c.files&&Object.keys(c.files).length===0));assert.equal(ps.filter(p=>p.expectation==='compile-error').length,4);
});
test('Полный DAG, неизменные50 строки, legacy40/40 и отсутствие записи при расчёте50/56',()=>{
 assert.equal(c.lessons.length,56);assert.equal(c.programVersion,'cpp-gold-m5-v1');assert.deepEqual(c.lessons.slice(0,40).map(l=>l.id),CPP_LEGACY_LESSON_IDS);assert.deepEqual(c.lessons.slice(0,40).map(l=>l.legacyIndex),Array.from({length:40},(_,i)=>i));assert.ok(c.lessons.slice(40).every(l=>l.legacyIndex===null));
 const seen=new Set(c.lessons.filter(l=>c.sections.find(s=>s.id===l.sectionId).order<5).map(l=>l.id));for(const t of spec.lessons){for(const d of t.prerequisites)assert.ok(seen.has(d),t.id+' <- '+d);seen.add(t.id)}assert.ok(!spec.lessons[7].prerequisites.includes('cpp.exceptions-guarantees'));
 const state={courses:{cpp:{lessons:Object.fromEntries(c.lessons.slice(0,50).map(l=>[l.id,{completed:true,code:'SYNTHETIC',quiz:1}]))}}},before=JSON.stringify(state),p=cppProgramProgress(state,c);assert.deepEqual([p.done,p.total,p.legacy.done,p.legacy.total],[50,56,40,40]);assert.equal(JSON.stringify(state),before);
 const ids=orderedCppLessons({curriculum:c}).map(l=>l.id),resume=createLearningResume({storage:{getItem:()=>null,setItem:()=>assert.fail('Чтение продолжения не пишет state')},principal:()=> 'synthetic-m5'}),done={};for(const id of ids){assert.equal(resume.continuation({curriculum:c},done).lesson.id,id);done[id]={completed:true}}assert.equal(resume.continuation({curriculum:c},done).mode,'review');
 for(const invalid of ['cpp.unknown','../../secret'])assert.equal(goldLessonPath(invalid),null);
});
test('Два практикума, 9 навыков проекта, 3 TU, отдельный драйвер и явное сохранение файлов',()=>{
 for(const locale of ['ru','en']){const gs=all.filter(g=>g.locale===locale),blocks=gs.filter(g=>g.blockPracticum);assert.equal(blocks.length,2);assert.notEqual(blocks[0].blockPracticum.referenceCode,blocks[1].blockPracticum.referenceCode);for(const g of blocks){assert.notEqual(g.blockPracticum.referenceCode,g.laboratory.referenceCode);assert.equal(g.blockPracticum.rubric.reduce((n,r)=>n+r.points,0),10)}
  const p=gs.at(-1).modulePracticum;assert.equal(gs.filter(g=>g.modulePracticum).length,1);assert.deepEqual(p.skills.map(s=>s.lessonId),GOLD_OOP_LESSONS);assert.deepEqual(p.metadata.translationUnits,['main.cpp','src/domain.cpp','src/report.cpp']);assert.equal(p.testExpectedStdout,'PASS 12\n');assert.ok(p.cases.length>=25&&p.artifacts.length>=5&&p.completionRule);assert.equal(p.rubric.reduce((n,r)=>n+r.points,0),10);for(const f of p.metadata.translationUnits.slice(1))assert.ok(Object.hasOwn(p.starterFiles,f));
  for(const a of [...blocks.map(g=>g.blockPracticum),p]){assert.ok(a.readiness&&a.requirements.length>=3&&a.walkthrough.length>=3);assert.equal(a.rubric.length,5);assert.ok(a.rubric.every(r=>r.points===2&&r.complete&&r.partial&&r.missing));assert.ok(a.skills.every(s=>s.title&&s.lessonId));}
 }
});
test('Точная SHA256 надстройка M5 без скрытых изменений runtime/auth/Cloud/публикации',async()=>{const s=await m5AuthoringScope();assert.equal(s.status,'PASS');assert.equal(s.currentLessonCount,56);assert.equal(s.oldRowsPreserved,50)});
