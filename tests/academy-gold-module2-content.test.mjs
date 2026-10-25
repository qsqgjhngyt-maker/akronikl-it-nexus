import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {GOLD_BASICS_LESSONS,GOLD_ALGORITHM_LESSONS,goldLessonPath,goldLessonModule} from '../core/academy-gold-catalog.js';
import {module2GoldLessons,module2GoldPrograms,matchesGoldOutput} from './helpers/module2-gold-programs.mjs';
import {academyGoldMarkup} from '../core/academy-gold-presentation.js';
import {createLearningViews} from '../core/learning-views.js';
const load=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const all=await module2GoldLessons(),legacy=await load('courses/cpp/data/lessons.ru.json'),plan=await load('docs/ru/03-content/CPP_MODULE2_DEPENDENCIES.json');
test('Module 2: 24 полных RU/EN объекта, 12 прежних ID, 19 занятий и редакционный DAG',()=>{
 assert.equal(all.length,24);assert.equal(GOLD_ALGORITHM_LESSONS.length,8);assert.deepEqual(GOLD_BASICS_LESSONS,plan.lessons.map(l=>l.id));
 assert.equal(all.filter(g=>g.locale==='ru').reduce((n,g)=>n+g.sessions,0),19);
 for(const g of all){
  assert.equal(g.schemaVersion,1);assert.equal(g.standardVersion,'academy-gold-1.1');assert.equal(g.moduleId,'cpp.section.cpp-basics');assert.equal(goldLessonModule(g.lessonId),g.moduleId);
  const spec=plan.lessons.find(l=>l.id===g.lessonId);assert.deepEqual(g.prerequisiteIds,spec.prerequisites);assert.equal(g.sessions,spec.sessions);
  for(const k of ['title','lead','why','bridge'])assert.ok(g[k]?.trim(),k);
  for(const k of ['objectives','prerequisites','concepts','sections','workedExamples','experiments','diagnostics','practice','assessment','reflection','sourceRefs'])assert.ok(g[k].length>=2,k);
  assert.ok(g.sections.length>=6&&g.sections.every(s=>s.title&&s.paragraphs.length>=2));
  assert.ok(g.concepts.every(c=>c.term&&c.definition));assert.ok(g.workedExamples.every(e=>e.steps.length>=3));
  assert.deepEqual(new Set(g.practice.map(p=>p.level)),new Set(['basic','applied','transfer']));
  assert.ok(g.practice.every(p=>p.task&&p.criteria&&p.hint));assert.ok(g.experiments.every(x=>x.action&&x.prediction&&x.verification));
  for(const q of [...g.assessment,...(g.readinessCheck||[])])assert.ok(q.question&&q.explanation&&q.answers.length>=3&&q.correctIndex>=0&&q.correctIndex<q.answers.length);
  assert.equal(g.laboratory.verification,'manual-output-comparison');assert.ok(g.laboratory.steps.length>=4&&g.laboratory.rubric.length>=4);
  const html=academyGoldMarkup(g);assert.ok(html.includes('data-gold-lesson="'+g.lessonId+'"'));assert.ok(html.includes(g.visualization.title));
  assert.equal((html.match(/rel="noopener noreferrer"/g)||[]).length,g.sourceRefs.length,'Every source key is rendered');
  if(g.locale==='en')assert.ok(!/[А-Яа-яЁё]/.test(JSON.stringify(g)),g.lessonId);
 }
});
test('Одинаковые RU/EN контракты, полный перевод и прежний смысл сохранённого quiz',()=>{
 for(const id of GOLD_BASICS_LESSONS){
  const ru=all.find(g=>g.lessonId===id&&g.locale==='ru'),en=all.find(g=>g.lessonId===id&&g.locale==='en');
  assert.deepEqual(ru.legacyQuiz,legacy.lessons.find(l=>l.id===id).quiz);assert.equal(ru.legacyQuiz.correctIndex,en.legacyQuiz.correctIndex);assert.equal(ru.legacyQuiz.answers.length,en.legacyQuiz.answers.length);
  for(const k of ['objectives','prerequisites','concepts','sections','workedExamples','experiments','diagnostics','practice','assessment','reflection','sourceRefs'])assert.equal(ru[k].length,en[k].length,k);
  for(let i=0;i<ru.sections.length;i++)assert.equal(ru.sections[i].paragraphs.length,en.sections[i].paragraphs.length);
  for(let i=0;i<ru.assessment.length;i++)assert.equal(ru.assessment[i].correctIndex,en.assessment[i].correctIndex);
  for(const locale of ['ru','en']){
   const g=locale==='ru'?ru:en,saved={completed:true,quiz:2,code:'// SYNTHETIC personal source',stdin:'17\n',workspace:{entryFile:'main.cpp',files:[{path:'main.cpp',content:'// saved'},{path:'notes.hpp',content:'// header'}]}};
   const before=JSON.stringify(saved),views=createLearningViews({prefs:{courseLocale:locale},cpp:{lessonsRu:legacy,goldLessons:{[locale]:{[id]:g}}},lessonState:()=>saved});
   const lesson=views.lessonData(id);assert.equal(lesson.id,id);assert.deepEqual(lesson.quiz,g.legacyQuiz);assert.equal(JSON.stringify(saved),before);
  }
 }
});
test('Входная диагностика, A/B/C и итоговый проект не выдают ручную рубрику за автооценку',()=>{
 for(const locale of ['ru','en']){
  const g=all.filter(g=>g.locale===locale);assert.equal(g.filter(g=>g.readinessCheck).length,1);assert.ok(g[0].readinessCheck.length>=2);
  assert.equal(g.filter(g=>g.blockPracticum).length,3);assert.equal(g.filter(g=>g.modulePracticum).length,1);
  for(const l of g)for(const p of [l.blockPracticum,l.modulePracticum].filter(Boolean)){
   assert.equal(p.verification,'manual-output-comparison');assert.equal(p.rubric.reduce((s,r)=>s+r.points,0),10);assert.ok(p.artifacts.length>=4);assert.ok(p.skills.every(s=>GOLD_BASICS_LESSONS.includes(s.lessonId)));
   assert.ok(!p.referenceCode.includes('TODO'));assert.ok(p.completionRule);
  }
  const project=g.at(-1).modulePracticum;assert.deepEqual(project.skills.map(s=>s.lessonId),GOLD_BASICS_LESSONS);assert.equal(project.cases.length,30);
  for(const c of project.cases){const t=c.stdin.trim().split(/\s+/);let expected='invalid\n';if(t.length===3&&t.every(x=>/^\d+$/.test(x))){const [m,r,h]=t.map(BigInt);if(m<=1000000n&&r>=1n&&r<=1000000n&&h<=100n){const num=m*1048576n*8n*(100n+h),den=100n*r*1000n,s=(num+den-1n)/den;expected=`${s} ${s/60n} ${s%60n}\n`;}}assert.equal(c.stdout,expected,c.stdin);}
 }
});
test('Полные исполняемые исходники и отрицательные контроли охватывают обе локали',async()=>{
 const programs=await module2GoldPrograms();assert.ok(programs.length>=100);
 for(const p of programs){assert.ok(p.aliases.some(a=>a.locale==='ru')&&p.aliases.some(a=>a.locale==='en'));assert.ok(['exact','type-layout','compile-error'].includes(p.expectation));assert.ok(p.cases.every(c=>typeof c.stdin==='string'&&typeof c.stdout==='string'));}
 assert.equal(programs.filter(p=>p.expectation==='type-layout').length,1);
 const layout=programs.find(p=>p.expectation==='type-layout'),sample=layout.cases[0].stdout;
 assert.ok(matchesGoldOutput(layout,sample,layout.cases[0]));assert.ok(matchesGoldOutput(layout,sample.replace('long_bytes=4','long_bytes=8').replace('pointer_bytes=4','pointer_bytes=8'),layout.cases[0]));assert.ok(!matchesGoldOutput(layout,sample.replace('char_bytes=1','char_bytes=2'),layout.cases[0]));
});
test('Allowlist, проверка moduleId, дедупликация и повтор после повреждённого ответа',async()=>{
 const original=globalThis.fetch,calls=[];let wrong=true;
 globalThis.fetch=async url=>{calls.push(String(url));const g=structuredClone(all.find(g=>String(url).endsWith(goldLessonPath(g.lessonId,g.locale))));if(wrong)g.moduleId='cpp.section.algorithms';return{ok:true,json:async()=>g};};
 try{
  const {getCppGoldLesson}=await import('../core/course-registry.js?m2-content');const id=GOLD_BASICS_LESSONS[0];
  await assert.rejects(getCppGoldLesson(id,'en'),/GOLD_CONTENT_CONTRACT_MISMATCH/);wrong=false;
  const [a,b]=await Promise.all([getCppGoldLesson(id,'en'),getCppGoldLesson(id,'en')]);assert.equal(a,b);assert.equal(calls.length,2);
  for(const bad of ['../secret','cpp.unknown','cpp.first-cpp-program/../../private'])assert.equal(await getCppGoldLesson(bad),null);
  const {fetchPublicJSON}=await import('../core/offline-assets.js');
  for(const bad of ['courses/cpp/gold/basics/private.json','courses/cpp/gold/algorithms/data-types.ru.json','courses/cpp/gold/basics/data-types.ru.json?private=1','https://example.com/courses/cpp/gold/basics/data-types.ru.json'])await assert.rejects(fetchPublicJSON(bad),/Not a public offline asset/);
  assert.equal(calls.length,2);
 }finally{globalThis.fetch=original;}
});
test('Новые поля presentation экранированы; вопросы readiness не пересекаются с итоговыми',()=>{
 const g=structuredClone(all[0]);g.visualization.title='<img src=x onerror=alert(1)>';g.diagnosticExamples[0].explanation='<script>bad()</script>';g.readinessCheck[0].question='<svg onload=bad()>';
 const html=academyGoldMarkup(g);assert.ok(!/<(?:img|script|svg onload)/.test(html));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('-readiness-0'));assert.ok(html.includes('-assessment-0'));
 const io=all.find(g=>g.lessonId==='cpp.standard-io');assert.equal((academyGoldMarkup(io).match(/data-gold-practicum/g)||[]).length,2,'Practicum C and capstone both render');
});
