import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createKnowledgeIndex,createNexusContextAdapter} from '../akronikl/core/index.js';
import {retrieveTutorEvidence} from '../akronikl/tutor/retrieval.js';
import {createTutorSession} from '../akronikl/tutor/session.js';
const indexes={};for(const l of ['ru','en'])indexes[l]=createKnowledgeIndex(JSON.parse(await readFile(new URL(`../akronikl/knowledge/core-index.${l}.json`,import.meta.url))));
const route={courseId:'cpp',lessonId:'cpp.lifetime-ownership'};
const questions={ru:'Объясни RAII простыми словами. Когда ресурс получают, а когда освобождают?',en:'Explain RAII simply. When is a resource acquired and released?'};
for(const locale of ['ru','en']){
 test(`${locale}: длинный вопрос использует источник подтверждённого урока`,()=>{
  const records=retrieveTutorEvidence(indexes[locale],{query:questions[locale],locale,route});
  assert.ok(records.length>0);assert.ok(records.every(r=>r.lessonId===route.lessonId));
  assert.equal(records[0].sourceId.includes(':theory-'),true);assert.match(records[0].text,locale==='ru'?/освобождает в деструкторе/:/releases it in its destructor/);
 });
 test(`${locale}: вне разрешённого урока нет неявного расширения поиска`,()=>{
  assert.deepEqual(retrieveTutorEvidence(indexes[locale],{query:questions[locale],locale}),[]);
 });
 test(`${locale}: строгий короткий поиск Core не изменён`,()=>{
  assert.deepEqual(retrieveTutorEvidence(indexes[locale],{query:'RAII',locale,route}),indexes[locale].search('RAII',{locale,limit:3}));
 });
 test(`${locale}: неизвестный вопрос не подменяется уроком по маршруту`,()=>{
  assert.deepEqual(retrieveTutorEvidence(indexes[locale],{query:'xyzqqnonexistent_726384',locale,route}),[]);
 });
 test(`${locale}: история и личные встречи не извлекаются из публичного урока`,()=>{
  assert.deepEqual(retrieveTutorEvidence(indexes[locale],{query:locale==='ru'?'Что было на моём последнем занятии с преподавателем?':'What happened in my last private appointment?',locale,route}),[]);
 });
 test(`${locale}: отключённый контекст не читается ради fallback`,async()=>{
  let calls=0;const boundary={};
  const host=createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>({view:'lesson'}),readLocale:()=>locale,readCourseLocale:()=>locale,authorize:()=>true});
  const session=createTutorSession({host,loadKnowledge:async()=>indexes[locale],locale,provider:{kind:'local',transport:'in-process',generate:async()=>{calls++;throw Error('unexpected');},dispose(){}}});
  assert.equal((await session.ask({text:questions[locale]})).status,'empty');assert.equal(calls,0);session.dispose();
 });
 test(`${locale}: отказ ACL предшествует чтению индекса и генерации`,async()=>{
  let reads=0;const boundary={};const host=createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>route,authorize:()=>false,readLocale:()=>locale});
  const session=createTutorSession({host,loadKnowledge:async()=>{reads++;return indexes[locale];},locale});
  assert.equal((await session.ask({text:questions[locale]})).status,'denied');assert.equal(reads,0);session.dispose();
 });
}
test('RU индекс не используется вместо EN',()=>assert.throws(()=>retrieveTutorEvidence(indexes.ru,{query:'RAII',locale:'en',route}),/INVALID/));
test('другой courseId не включает fallback',()=>assert.deepEqual(retrieveTutorEvidence(indexes.ru,{query:questions.ru,locale:'ru',route:{...route,courseId:'python'}}),[]));
test('лимит не допускает расширения контекста',()=>{for(const limit of [0,4,20,NaN,1.1])assert.throws(()=>retrieveTutorEvidence(indexes.ru,{query:'RAII',locale:'ru',route,limit}),/INVALID/);});
test('полученные записи — точные записи подготовленного индекса',()=>{
 const allowed=new Map(indexes.ru.getSources().map(r=>[r.sourceId,r]));
 for(const record of retrieveTutorEvidence(indexes.ru,{query:questions.ru,locale:'ru',route}))assert.deepEqual(record,allowed.get(record.sourceId));
});
test('короткий успешный запрос не сканирует весь корпус',()=>{
 const index={...indexes.ru,getSources(){throw Error('unnecessary scan');}};
 assert.ok(retrieveTutorEvidence(index,{query:'RAII',locale:'ru',route}).length>0);
});
for(const locale of ['ru','en'])test(`${locale}: Tutor передаёт длинный вопрос и источник, не подставляя ответ`,async()=>{
 let packet=null;const boundary={};const host=createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>route,readLocale:()=>locale,readCourseLocale:()=>locale,authorize:()=>true});
 const session=createTutorSession({host,loadKnowledge:async()=>indexes[locale],locale,
  provider:{kind:'local',transport:'in-process',modelId:'synthetic-test-only',generate:async r=>{packet=r;return{answer:'SYNTHETIC_PROVIDER_SENTINEL',citations:['S1']};},dispose(){}}});
 const result=await session.ask({text:questions[locale]});assert.equal(result.status,'ok');assert.equal(result.text,'SYNTHETIC_PROVIDER_SENTINEL');
 assert.equal(JSON.parse(packet.messages.at(-1).content).question,questions[locale]);assert.equal(result.sources[0].lessonId,route.lessonId);session.dispose();
});
