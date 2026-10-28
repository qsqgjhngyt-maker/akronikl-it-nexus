import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GOLD_LESSONS,GOLD_STRUCTURED_LESSONS,GOLD_OOP_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
import {createLearningViews} from '../core/learning-views.js';
import {discoveryPageMarkup,orderedCppLessons,focusLearningSection} from '../core/nexus-learning-discovery.js';
import {academyGoldMarkup} from '../core/academy-gold-presentation.js';
import {translator} from '../core/i18n.js';
import {createViewResume,VIEW_RESUME_KEY} from '../core/view-resume.js';
const j=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const baseIndex=await j('courses/cpp/data/gold-laboratories.json'),extension=await j('courses/cpp/data/gold-laboratories-m6.json'),index={schemaVersion:1,lessons:{...baseIndex.lessons,...extension.lessons}},course={};
for(const [key,file]of Object.entries({manifest:'manifest.json',curriculum:'curriculum.json',lessonsRu:'data/lessons.ru.json',lessonsEn:'data/lessons.en.json',practicumsRu:'data/practicums.ru.json',projectsRu:'data/projects.ru.json'}))course[key]=await j('courses/cpp/'+file);
course.goldLaboratories=index.lessons;
test('76 записей индекса согласованы с лабораторными; код и теория не скопированы в каталог',async()=>{
 assert.equal(index.schemaVersion,1);assert.deepEqual(Object.keys(index.lessons),GOLD_LESSONS);
 for(const id of GOLD_LESSONS)for(const locale of ['ru','en']){
  const g=await j(goldLessonPath(id,locale)),m=index.lessons[id][locale];
  assert.deepEqual(m,{title:g.laboratory.title,goal:g.laboratory.catalogGoal||g.laboratory.challenge,stepCount:g.laboratory.steps.length,proof:g.laboratory.catalogProof||g.laboratory.rubric[0]});
  assert.deepEqual(Object.keys(m).sort(),['goal','proof','stepCount','title']);
  if(locale==='en')assert.ok(!/[А-Яа-яЁё]/.test(JSON.stringify(m)));
 }
 // M5 adds nine bilingual index rows. This is fetched only with full course/labs,
 // never in the Home outline. Preserve the 40 KB baseline plus <=6 KB for M5.
 assert.ok(Buffer.byteLength(JSON.stringify(baseIndex))<40000+(GOLD_OOP_LESSONS.length===9?6000:0),'Bounded metadata, separate from the unchanged Home outline cap');
});
test('RU/EN: 39 C++ labs, все18 M3, учебный порядок, без зависимости от посещения Gold',async()=>{
 for(const locale of ['ru','en']){
  const t=translator(await j('locales/'+locale+'/ui.json')),state={courses:{cpp:{lessons:{}}}},prefs={courseLocale:locale},views=createLearningViews({cpp:course,prefs,t,visualIcon:()=>'',loadState:()=>state,lessonState:()=>({}),progress:()=>({done:0,total:45,pct:0}),cppContinuation:()=>null});
  const render=()=>discoveryPageMarkup({kind:'labs',course,contentFor:views.lessonData,t,materialLocale:locale,locale});
  const before=render(),overview=views.overview();
  assert.equal((before.match(/data-discovery-kind="lab"/g)||[]).length,GOLD_LESSONS.length+(GOLD_LESSONS.includes('cpp.oop-principles')?0:1));
  for(const id of GOLD_STRUCTURED_LESSONS){assert.ok(before.includes('data-discovery-item="'+id+'"'));assert.ok(overview.includes('#course=cpp&amp;lesson='+id+'&amp;focus=lab')||overview.includes('#course=cpp&lesson='+id+'&focus=lab'));}
  const positions=orderedCppLessons(course).filter(l=>GOLD_LESSONS.includes(l.id)).map(l=>before.indexOf('data-discovery-item="'+l.id+'"'));assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
  course.goldLessons??={};course.goldLessons[locale]={};for(const id of GOLD_LESSONS)course.goldLessons[locale][id]=await j(goldLessonPath(id,locale));
  assert.equal(render(),before);assert.ok(views.overview().includes('cpp.oop-principles&focus=lab'),'Legacy OOP lab retained');
 }
});
test('Gold main lab имеет единственный старый focus ID, практикумы его не присваивают',async()=>{
 for(const id of GOLD_LESSONS)for(const locale of ['ru','en']){const html=academyGoldMarkup(await j(goldLessonPath(id,locale)));assert.equal((html.match(/id="cppLab"/g)||[]).length,1);assert.equal((html.match(/data-gold-laboratory/g)||[]).length,1);assert.ok(!/id="cppLab"[^>]*data-gold-practicum/.test(html));}
});
test('Отложенный focus отменён после смены маршрута или удаления цели',()=>{
 const saved={document:globalThis.document,location:globalThis.location,requestAnimationFrame:globalThis.requestAnimationFrame};
 try{
  let frames=[],scrolls=0,focuses=0;const target={isConnected:true,scrollIntoView(){scrolls++},focus(){focuses++}};
  globalThis.document={querySelector:()=>target};globalThis.location={hash:'#course=cpp&lesson=cpp.files&focus=lab'};globalThis.requestAnimationFrame=f=>frames.push(f);
  const flush=()=>{while(frames.length)frames.shift()()};
  assert.equal(focusLearningSection('lab'),true);globalThis.location.hash='#view=home';flush();assert.equal(focuses,0);
  focusLearningSection('lab');target.isConnected=false;flush();assert.equal(scrolls,0);
  target.isConnected=true;focusLearningSection('lab');flush();assert.equal(scrolls,1);assert.equal(focuses,1);assert.equal(target.tabIndex,-1);
 }finally{for(const [k,v]of Object.entries(saved))v===undefined?delete globalThis[k]:globalThis[k]=v;}
});

test('Прокрутка старого экрана и его таймер не создают bookmark ещё загружаемого урока',async()=>{
 const memory=new Map(),listeners={},frames=[];let position={x:0,y:2500},applied;
 const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 const resume=createViewResume({storage,getPosition:()=>position,applyPosition:p=>{applied=p},scheduleFrame:f=>frames.push(f),addListener:(name,fn)=>listeners[name]=fn,removeListener:()=>{},historyObject:{scrollRestoration:'auto'},debounceMs:5});resume.install();
 resume.begin('#view=labs');assert.equal(resume.restore(),false);listeners.scroll();
 resume.begin('#course=cpp&lesson=cpp.data-types&focus=lab');listeners.scroll();await new Promise(r=>setTimeout(r,20));
 listeners.pagehide();assert.equal(resume.read(resume.getCurrentKey()),null);assert.equal(resume.restore(),false,'Fresh lab must receive focus rather than a fake old-catalog position');
 position={x:0,y:9000};listeners.scroll();await new Promise(r=>setTimeout(r,20));assert.equal(resume.read(resume.getCurrentKey()).y,9000,'A rendered page still persists normal scroll');
 resume.begin('#view=labs');assert.equal(resume.restore(),true);resume.begin('#view=home');while(frames.length)frames.shift()();assert.equal(applied,undefined,'Stale scheduled restore must not scroll the new route');
 assert.equal(JSON.parse(memory.get(VIEW_RESUME_KEY))['#view=labs'].y,2500);resume.destroy();
});
