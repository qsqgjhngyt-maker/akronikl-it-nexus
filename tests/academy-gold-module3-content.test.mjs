import test from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';
import {module3GoldLessons,module3GoldPrograms,programFiles} from './helpers/module3-gold-programs.mjs';
import {GOLD_STRUCTURED_LESSONS,GOLD_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
import {academyGoldMarkup} from '../core/academy-gold-presentation.js';import {goldVisualizationSteps} from '../core/academy-gold-model.js';
import {CPP_LEGACY_LESSON_IDS,cppProgramProgress} from '../core/storage.js';import {createLearningViews} from '../core/learning-views.js';
import {orderedCppLessons,createLearningResume} from '../core/nexus-learning-discovery.js';
const j=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const isM4=(await j('courses/cpp/curriculum.json')).programVersion==='cpp-gold-m4-v1';
const all=await module3GoldLessons(),spec=await j('docs/ru/03-content/CPP_MODULE3_AUTHORING.json'),curriculum=await j('courses/cpp/curriculum.json'),ru=await j('courses/cpp/data/lessons.ru.json'),en=await j('courses/cpp/data/lessons.en.json');
test('M3-1: 36 полных объектов, шесть теоретических разделов, лабораторные, A/B/C и полный EN',async()=>{
 assert.equal(all.length,36);assert.equal((await readdir(new URL('../courses/cpp/gold/structured/',import.meta.url))).filter(p=>p.endsWith('.json')).length,36);assert.equal(GOLD_LESSONS.length,isM4?46:38);assert.deepEqual(GOLD_STRUCTURED_LESSONS,spec.lessons.map(l=>l.id));
 for(const g of all){
  assert.equal(g.schemaVersion,1);assert.equal(g.standardVersion,'academy-gold-1.1');assert.equal(g.moduleId,spec.moduleId);assert.equal(g.target,'C++20');
  const p=spec.lessons.find(l=>l.id===g.lessonId);assert.deepEqual(g.prerequisiteIds,p.prerequisites);assert.equal(g.sessions,p.sessions);
  assert.equal(g.sections.length,6);assert.ok(g.sections.every(s=>s.title&&s.paragraphs.length>=2&&s.paragraphs.every(p=>p.length>=100)));
  assert.ok(g.sections.flatMap(s=>s.paragraphs).join(' ').split(/\s+/).length>280,'Substantive theory: '+g.lessonId);
  assert.ok(g.objectives.length>=5&&g.prerequisites.length>=2&&g.concepts.length>=6);assert.ok(g.concepts.every(c=>c.term&&c.definition));
  assert.ok(g.workedExamples.length>=2&&g.workedExamples.every(e=>e.steps.length>=3&&e.purpose));assert.equal(g.practice.length,6);assert.deepEqual(new Set(g.practice.map(p=>p.level)),new Set(['basic','applied','transfer']));
  assert.ok(g.experiments.length>=2&&g.diagnostics.length>=3);assert.equal(g.assessment.length,5);assert.ok(g.assessment.every(q=>q.explanation&&q.answers.length===3&&new Set(q.answers).size===3));
  assert.equal(g.laboratory.verification,'manual-output-comparison');assert.ok(g.laboratory.steps.length>=6&&g.laboratory.rubric.length>=5&&g.laboratory.cases.length);
  assert.equal(goldVisualizationSteps(g.visualization,{},g.locale).length,5);
  const html=academyGoldMarkup(g);assert.ok(html.includes('data-gold-lesson="'+g.lessonId+'"'));assert.equal((html.match(/rel="noopener noreferrer"/g)||[]).length,g.sourceRefs.length);
  if(g.locale==='en')assert.ok(!/[А-Яа-яЁё]/.test(JSON.stringify(g)),g.lessonId+' English contains untranslated text');
 }
});
test('Согласованность RU/EN, сохранённый смысл quiz и личный код при чтении Gold',()=>{
 for(const id of GOLD_STRUCTURED_LESSONS){
  const a=all.find(g=>g.lessonId===id&&g.locale==='ru'),b=all.find(g=>g.lessonId===id&&g.locale==='en');
  for(const key of ['objectives','concepts','sections','workedExamples','practice','assessment'])assert.equal(a[key].length,b[key].length);
  assert.deepEqual(a.legacyQuiz,ru.lessons.find(l=>l.id===id).quiz);assert.equal(a.legacyQuiz.correctIndex,b.legacyQuiz.correctIndex);assert.equal(a.legacyQuiz.answers.length,b.legacyQuiz.answers.length);
  for(let i=0;i<a.assessment.length;i++)assert.equal(a.assessment[i].correctIndex,b.assessment[i].correctIndex);
  for(const locale of ['ru','en']){const g=locale==='ru'?a:b,saved={completed:true,quiz:2,code:'// SYNTHETIC personal',stdin:'17',note:'keep',unknown:{keep:true}},before=JSON.stringify(saved);const views=createLearningViews({prefs:{courseLocale:locale},cpp:{lessonsRu:ru,lessonsEn:en,goldLessons:{[locale]:{[id]:g}}},lessonState:()=>saved});const l=views.lessonData(id);assert.equal(l.id,id);assert.deepEqual(l.quiz,g.legacyQuiz);assert.equal(JSON.stringify(saved),before);}
 }
});
test('DAG из 18 тем: новые пять ID зарегистрированы после prerequisites, старые 40 индексов неизменны',()=>{
 assert.equal(curriculum.lessons.length,isM4?50:45);assert.equal(curriculum.programVersion,isM4?'cpp-gold-m4-v1':'cpp-gold-m3-v1');assert.deepEqual(curriculum.lessons.slice(0,40).map(l=>l.id),CPP_LEGACY_LESSON_IDS);
 assert.ok(curriculum.lessons.slice(0,40).every((l,i)=>l.legacyIndex===i&&l.order===i+1));assert.ok(curriculum.lessons.slice(40).every(l=>l.legacyIndex===null));
 const known=new Set(CPP_LEGACY_LESSON_IDS.slice(0,20));for(const t of spec.lessons){for(const p of t.prerequisites)assert.ok(known.has(p),t.id+' <- '+p);known.add(t.id)}
 assert.deepEqual(curriculum.sections.find(s=>s.id===spec.moduleId).lessonIds,spec.lessons.map(l=>l.id));
 assert.equal(spec.lessons.filter(l=>l.added).length,5);
});
test('Реальная версия 40/45 сохраняет прежние 40/40 и не переписывает профиль',()=>{
 const state={courses:{cpp:{lessons:Object.fromEntries(CPP_LEGACY_LESSON_IDS.map(id=>[id,{completed:true,code:'personal',quiz:1}]))}}},before=JSON.stringify(state),p=cppProgramProgress(state,curriculum);
 assert.deepEqual({done:p.done,total:p.total,pct:p.pct},{done:40,total:isM4?50:45,pct:isM4?80:89});assert.equal(p.legacy.done,40);assert.equal(p.legacy.total,40);assert.equal(JSON.stringify(state),before);
 for(const locale of ['ru','en']){const views=createLearningViews({cpp:{manifest:{title:{ru:'C++',en:'C++'},description:{ru:'Курс',en:'Course'},practicumCount:6,projectCount:7},curriculum},prefs:{courseLocale:locale},progress:()=>p,t:k=>k});assert.ok(views.courseHead('overview').includes(isM4?'40/50':'40/45'));assert.ok(views.courseHead('overview').includes('40/40'));}
});
test('Продолжить следует учебному порядку 18 тем; bookmark и старые migration indices сохранены',()=>{
 const course={manifest:{id:'cpp'},curriculum},expected=curriculum.sections.flatMap(s=>s.lessonIds),ordered=orderedCppLessons(course);assert.deepEqual(ordered.map(l=>l.id),expected);
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},resume=createLearningResume({storage,principal:()=> 'synthetic-m3-order',now:()=> '2026-10-25T00:00:00Z'}),state={};
 for(const [i,id]of expected.entries()){assert.equal(resume.continuation(course,state).lesson.id,id,'Must not skip '+id);state[id]={completed:true,code:'personal '+i};}
 assert.equal(resume.continuation(course,state).mode,'review');assert.equal(values.size,0,'Reading suggestions must not write bookmarks or progress');
 const first23=Object.fromEntries(CPP_LEGACY_LESSON_IDS.slice(0,23).map(id=>[id,{completed:true}]));assert.equal(resume.continuation(course,first23).lesson.id,'cpp.functions-contracts');
 assert.equal(resume.remember(course,'cpp.files','task'),true);const before=JSON.stringify(state);assert.equal(resume.continuation(course,first23).lesson.id,'cpp.files');assert.equal(resume.continuation(course,first23).focus,'task');assert.equal(JSON.stringify(state),before);
 assert.deepEqual(orderedCppLessons({curriculum:{lessons:[{id:'cpp.a'},{id:'cpp.b'}],sections:[{lessonIds:['missing','cpp.b','cpp.b']}]}}).map(l=>l.id),['cpp.b','cpp.a']);
 assert.deepEqual(curriculum.lessons.slice(0,40).map(l=>l.legacyIndex),Array.from({length:40},(_,i)=>i));
 const views=createLearningViews({cpp:{...course,manifest:{id:'cpp',title:{en:'C++',ru:'C++'},description:{en:'Course',ru:'Курс'},practicumCount:6,projectCount:7},lessonsRu:ru,lessonsEn:en},prefs:{uiLocale:'en',courseLocale:'en'},t:k=>k,loadState:()=>({}),lessonState:()=>({}),cppContinuation:()=>null,progress:()=>cppProgramProgress({},curriculum),visualIcon:()=>''});
 assert.ok(views.overview().includes('class="topic-order">24</span><a href="#course=cpp&lesson=cpp.functions-contracts"'));
 assert.ok(views.lessonView('cpp.functions-contracts').includes('TOPIC 24'));
 assert.equal(curriculum.lessons.find(l=>l.id==='cpp.functions-contracts').order,41,'Display order must not replace stored order');
});
test('Три разных накопительных практикума и многoфайловый проект с 18 навыками и драйвером',()=>{
 for(const locale of ['ru','en']){
  const lessons=all.filter(g=>g.locale===locale),blocks=lessons.filter(g=>g.blockPracticum);assert.equal(blocks.length,3);
  for(const g of blocks){const p=g.blockPracticum;assert.notEqual(p.referenceCode,g.laboratory.referenceCode);assert.equal(p.rubric.reduce((n,r)=>n+r.points,0),10);assert.ok(p.artifacts.length>=4&&p.completionRule);}
  assert.equal(lessons.filter(g=>g.modulePracticum).length,1);const p=lessons.at(-1).modulePracticum;
  assert.deepEqual(p.skills.map(s=>s.lessonId),GOLD_STRUCTURED_LESSONS);assert.ok(p.cases.length>=20&&p.testDriver.includes('PASS 8'));
  assert.deepEqual(p.metadata.translationUnits,['main.cpp','src/domain.cpp','src/format.cpp']);assert.equal(p.rubric.reduce((n,r)=>n+r.points,0),10);assert.ok(p.referenceFiles['include/catalog.hpp']);
  const html=academyGoldMarkup(lessons.at(-1));for(const f of Object.keys(p.referenceFiles))assert.ok(html.includes(f));assert.ok(html.includes('catalog-out.txt'));
 }
});
test('Все компилируемые исходники извлекаются без переписывания, файловые случаи и безопасная мутация явные',async()=>{
 const programs=await module3GoldPrograms();assert.ok(programs.length>=70);assert.ok(programs.reduce((n,p)=>n+p.cases.length,0)>=200);
 for(const p of programs){assert.ok(p.aliases.some(a=>a.locale==='ru')&&p.aliases.some(a=>a.locale==='en'));assert.ok(p.cases.every(c=>typeof c.stdin==='string'&&typeof c.stdout==='string'));for(const c of p.cases)assert.equal(programFiles(p,c)['main.cpp'],p.source);}
 assert.equal(programs.filter(p=>p.expectation==='link-error').length,2);assert.equal(programs.filter(p=>p.expectation==='compile-error').length,1);assert.equal(programs.filter(p=>p.cases.some(c=>c.exitCode===1)).length,1);
 const file=programs.find(p=>p.id==='files-lab-reference');assert.ok(!Object.hasOwn(programFiles(file,file.cases[2]),'records.txt'),'Explicit missing-file case must not inherit sample input');
});
test('Файлы, задания и модели экранированы; source allowlist не принимает произвольный путь',()=>{
 const g=structuredClone(all.find(g=>g.modulePracticum));g.modulePracticum.referenceFiles['<img src=x onerror=bad()>']='<script>bad()</script>';g.visualization.title='<svg onload=bad()>';const html=academyGoldMarkup(g);assert.ok(!/<(?:img|script|svg onload)/.test(html));assert.ok(html.includes('&lt;script&gt;'));
 for(const id of ['cpp.unknown','../../secret','cpp.files/../../private'])assert.equal(goldLessonPath(id,'ru'),null);assert.equal(goldLessonPath('cpp.files','xx'),null);
});
