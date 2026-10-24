import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {GOLD_ALGORITHM_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
import {euclidTrace,evenSumTrace,deliveryTrace,goldVisualizationSteps} from '../core/academy-gold-model.js';
import {academyGoldMarkup} from '../core/academy-gold-presentation.js';
import {createLearningViews} from '../core/learning-views.js';
const json=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const baseline=await json('courses/cpp/data/lessons.ru.json');
const curriculum=await json('courses/cpp/curriculum.json');
const lessons=[];
for(const id of GOLD_ALGORITHM_LESSONS)for(const locale of ['ru','en'])lessons.push(await json(goldLessonPath(id,locale)));
test('16 полноценных RU/EN объектов; существующие ID и CP-1.1 сохраняются',async()=>{
 assert.equal(lessons.length,16);
 const section=curriculum.sections.find(s=>s.id==='cpp.section.algorithms');
 assert.ok(section);
 assert.deepEqual(new Set(curriculum.lessons.filter(l=>l.sectionId===section.id).map(l=>l.id)),new Set(GOLD_ALGORITHM_LESSONS));
 for(const g of lessons){
  assert.ok(baseline.lessons.some(l=>l.id===g.lessonId));
  const legacy=baseline.lessons.find(l=>l.id===g.lessonId).quiz;
  assert.equal(g.legacyQuiz.correctIndex,legacy.correctIndex);assert.equal(g.legacyQuiz.answers.length,legacy.answers.length);
  if(g.locale==='ru')assert.deepEqual(g.legacyQuiz,legacy);else assert.ok(!/[А-Яа-яЁё]/.test(JSON.stringify(g.legacyQuiz)));
  assert.equal(g.moduleId,section.id);assert.equal(g.standardVersion,'academy-gold-1.1');
  for(const k of ['title','lead','why','bridge'])assert.ok(typeof g[k]==='string'&&g[k].trim());
  for(const k of ['objectives','prerequisites','concepts','sections','workedExamples','experiments','diagnostics','practice','assessment','reflection','sourceRefs'])assert.ok(Array.isArray(g[k])&&g[k].length>=2,k);
  assert.ok(g.sections.length>=5&&g.sections.every(s=>s.title&&s.paragraphs.length));
  assert.deepEqual(new Set(g.practice.map(x=>x.level)),new Set(['basic','applied','transfer']));
  assert.ok(g.practice.every(x=>x.task&&x.criteria&&x.hint));
  assert.ok(g.workedExamples.every(x=>x.code.includes('\n')&&x.code.includes('int main(')&&typeof x.stdin==='string'&&x.expectedStdout.endsWith('\n')&&x.steps.length>=3));
  assert.ok(g.laboratory.starterCode&&g.laboratory.referenceCode&&g.laboratory.rubric.length>=3&&g.laboratory.artifact);
  assert.equal(g.laboratory.verification,'manual-output-comparison');
  assert.ok(g.laboratory.cases.some(c=>c.stdin==='oops\n'&&c.stdout==='invalid\n'));
  for(const q of g.assessment)assert.ok(q.explanation&&q.answers.length>=3&&Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<q.answers.length);
  assert.ok(goldVisualizationSteps(g.visualization,{},g.locale).length>=3);
  const markup=academyGoldMarkup(g);
  assert.ok(markup.includes('data-gold-viz')&&markup.includes('data-gold-question')&&markup.includes('lang="'+g.locale+'"'));
  const peer=lessons.find(x=>x.lessonId===g.lessonId&&x.locale!==g.locale);
  for(const key of ['objectives','sections','workedExamples','assessment','practice','concepts'])assert.equal(g[key].length,peer[key].length,key);
  assert.deepEqual(g.laboratory.cases,peer.laboratory.cases);
  assert.equal(g.laboratory.referenceCode,peer.laboratory.referenceCode);
 }
 assert.equal(goldLessonPath('../secret'),null);assert.equal(goldLessonPath(GOLD_ALGORITHM_LESSONS[0],'de'),null);
});
test('доказуемые свойства моделей и ошибочные входы',()=>{
 const brute=(a,b)=>{for(let d=Math.max(a,b);d>0;d--)if(a%d===0&&b%d===0)return d;};
 for(let a=0;a<=40;a++)for(let b=0;b<=40;b++)if(a||b){const steps=euclidTrace(a,b,'en');assert.equal(steps.at(-1).title,'gcd = '+brute(a,b));assert.ok(steps.length<=41);}
 for(let n=0;n<=12;n++)assert.equal(evenSumTrace(n,'en').at(-1).title,'Result '+Math.floor(n/2)*(Math.floor(n/2)+1));
 for(const [x,out] of [[-1,'invalid'],[0,'150'],[999,'150'],[1000,'free'],[10000,'free']])assert.equal(deliveryTrace(x,'en').at(-1).title,out);
 for(const v of ['',-1,1.5,100001,NaN,Infinity])assert.throws(()=>euclidTrace(v,18));
 assert.throws(()=>euclidTrace(0,0));assert.throws(()=>evenSumTrace(13));assert.throws(()=>goldVisualizationSteps({kind:'unknown'}));
 for(const fn of [()=>euclidTrace(48,18,'en'),()=>evenSumTrace(5,'en'),()=>deliveryTrace(1000,'en')])assert.ok(!/[А-Яа-яЁё]/.test(JSON.stringify(fn())));
});
test('Gold не перезаписывает learner state и смысл старого quiz',()=>{
 const g=lessons[0],old=baseline.lessons.find(x=>x.id===g.lessonId),saved={completed:true,quiz:2,code:'// Личный код',stdin:'7\n',workspace:{entryFile:'main.cpp',activeFile:'main.cpp',files:[{path:'main.cpp',content:'// Личный файл'}]}};
 const before=JSON.stringify(saved),cpp={lessonsRu:baseline,goldLessons:{[g.locale]:{[g.lessonId]:g}}};
 const views=createLearningViews({prefs:{courseLocale:g.locale},cpp,lessonState:()=>saved});
 const projected=views.lessonData(g.lessonId);
 assert.deepEqual(projected.quiz,old.quiz);assert.equal(projected.id,old.id);assert.equal(JSON.stringify(saved),before);
 const malicious=structuredClone(g);malicious.title='<img src=x onerror=alert(1)>';malicious.workedExamples[0].code='</code><script>alert(1)</script>';
 const markup=academyGoldMarkup(malicious);assert.ok(!markup.includes('<script>'));assert.ok(markup.includes('&lt;img'));
});
test('Gold registry: отложенная загрузка, дедупликация, повтор после ошибки, allowlist',async()=>{
 const original=globalThis.fetch,requests=[];let fail=false;
 globalThis.fetch=async url=>{requests.push(String(url));if(fail)throw Error('SYNTHETIC_NETWORK_FAILURE');const name=new URL(url).pathname.split('/').at(-1);const g=lessons.find(x=>goldLessonPath(x.lessonId,x.locale).endsWith(name));return {ok:true,json:async()=>g};};
 try{
  const {getCppGoldLesson,prepareCppGoldLesson}=await import('../core/course-registry.js?gold-test');assert.equal(requests.length,0);
  const id=GOLD_ALGORITHM_LESSONS[0];const [a,b]=await Promise.all([getCppGoldLesson(id),getCppGoldLesson(id)]);assert.equal(a,b);assert.equal(requests.length,1);
  assert.equal(await getCppGoldLesson('../secret'),null);assert.equal(requests.length,1);
  fail=true;await assert.rejects(getCppGoldLesson(id,'en'));fail=false;
  const course={};await prepareCppGoldLesson(course,id,'en');assert.equal(course.goldLessons.en[id].locale,'en');assert.equal(requests.length,3);
 }finally{globalThis.fetch=original;}
});

test('Итоговый практикум связывает все 8 прежних ID, имеет одинаковые исполняемые контракты RU/EN',()=>{
 const end=GOLD_ALGORITHM_LESSONS.at(-1),a=lessons.find(x=>x.lessonId===end&&x.locale==='ru').modulePracticum,b=lessons.find(x=>x.lessonId===end&&x.locale==='en').modulePracticum;
 assert.equal(lessons.filter(x=>x.modulePracticum).length,2);
 for(const project of [a,b]){
  assert.deepEqual(project.skills.map(s=>s.lessonId),GOLD_ALGORITHM_LESSONS);
  assert.equal(project.verification,'manual-output-comparison');
  assert.equal(project.rubric.reduce((n,r)=>n+r.points,0),10);
  assert.ok(project.rubric.every(r=>r.criterion&&r.complete&&r.partial&&r.missing));
  assert.ok(project.requirements.length>=4&&project.milestones.length>=4&&project.artifacts.length>=4);
  assert.ok(project.cases.some(c=>c.stdin==='0 0\n'&&c.stdout==='0 0 0\n'));
  assert.ok(project.cases.some(c=>c.stdin.includes('2.5')&&c.stdout==='invalid\n'));
  assert.ok(project.cases.some(c=>c.stdin==='0 0 99\n'&&c.stdout==='invalid\n'));
  assert.ok(project.cases.some(c=>c.stdout==='99 9 90\n'));
 }
 assert.deepEqual(a.cases.map(({stdin,stdout})=>({stdin,stdout})),b.cases.map(({stdin,stdout})=>({stdin,stdout})));
 assert.equal(a.referenceCode,b.referenceCode);assert.equal(a.starterCode,b.starterCode);
 assert.ok(!/[А-Яа-яЁё]/.test(JSON.stringify(b)));
});

test('Дополнительные тесты примеров RU/EN совпадают; итоговый практикум экранирует текст',()=>{
 for(const g of lessons){const peer=lessons.find(x=>x.lessonId===g.lessonId&&x.locale!==g.locale);
  for(const [i,e] of g.workedExamples.entries()){assert.deepEqual(e.cases,peer.workedExamples[i].cases);assert.ok((e.cases||[]).every(c=>typeof c.stdin==='string'&&c.stdout.endsWith('\n')));}
 }
 const g=structuredClone(lessons.find(x=>x.modulePracticum));g.modulePracticum.title='<script>alert(1)</script>';
 g.modulePracticum.skills[0].title='<img src=x onerror=alert(1)>';
 const markup=academyGoldMarkup(g);assert.ok(markup.includes('data-gold-practicum'));assert.ok(!markup.includes('<script>'));assert.ok(!markup.includes('<img'));assert.ok(markup.includes('&lt;script&gt;'));
});
