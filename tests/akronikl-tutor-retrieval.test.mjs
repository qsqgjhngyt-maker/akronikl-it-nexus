import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createKnowledgeIndex,createNexusContextAdapter} from '../akronikl/core/index.js';
import {findTutorEvidence} from '../akronikl/tutor/retrieval.js';
import {createTutorSession} from '../akronikl/tutor/session.js';
import {resolveMessage} from '../akronikl/experience/intents.js';
const corpus=JSON.parse(await readFile(new URL('./fixtures/akronikl-tutor-quality-v1.json',import.meta.url)));
const indexes=Object.fromEntries(await Promise.all(['ru','en'].map(async l=>[l,createKnowledgeIndex(JSON.parse(await readFile(new URL('../akronikl/knowledge/core-index.'+l+'.json',import.meta.url))))])));
for(const c of corpus.cases.filter(c=>c.source))test(c.id+': естественный вопрос получает реальный источник текущего разрешённого урока',async()=>{
 const boundary={},intent=resolveMessage(c.prompt);let packet;
 const host=createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>({course:'cpp',lesson:c.source.lessonId}),readLocale:()=>c.locale,readCourseLocale:()=>c.locale,authorize:()=>true});
 const tutor=createTutorSession({host,locale:c.locale,loadKnowledge:async()=>indexes[c.locale],provider:{kind:'local',transport:'in-process',modelId:'synthetic-retrieval-spy',dispose(){},generate:async p=>{packet=p;return {answer:'SYNTHETIC_NOT_QUALITY_ACCEPTANCE',citations:p.allowedCitations.slice(0,1)};}}});
 try{const r=await tutor.ask({text:intent.text??c.prompt,intent:intent.intent??'explain',followUp:intent.followUp??false});
 assert.equal(r.status,'ok');assert.ok(packet);assert.ok(r.sources.some(s=>s.lessonId===c.source.lessonId&&s.locale===c.locale));
 for(const s of r.sources){const originals=indexes[c.locale].getLesson(s.lessonId,c.locale);const real=originals.find(x=>x.sourceId===s.sourceId);assert.ok(real);assert.ok(real.text.includes(s.text));}
 }finally{tutor.dispose();}
});
test('точный поиск сохраняется без чтения урока',()=>{let read=0;const result=[{id:'sentinel'}];assert.equal(findTutorEvidence({search:()=>result,getLesson:()=>{read++;}},'указатели',{locale:'ru',lessonId:'x'}),result);assert.equal(read,0);});
test('нет разрешённого урока — расширение контекста не выполняется',()=>{let read=0;assert.deepEqual(findTutorEvidence({search:()=>[],getLesson:()=>{read++;}},'long unknown',{locale:'ru'}),[]);assert.equal(read,0);});
test('неизвестный вопрос не подменяется случайным материалом текущего урока',()=>{for(const q of ['Какая погода завтра?', 'Какой мой пароль?', 'Расскажи про баскетбол', 'What is my password?', 'PRIVATE_SENTINEL_UNRELATED'])assert.deepEqual(findTutorEvidence(indexes.ru,q,{locale:'ru',lessonId:'cpp.lifetime-ownership'}),[]);});
test('одно общее слово не даёт права объявить источник релевантным',()=>{assert.deepEqual(findTutorEvidence({search:()=>[],getLesson:indexes.ru.getLesson.bind(indexes.ru)},'Почему ресурс?',{locale:'ru',lessonId:'cpp.lifetime-ownership'}),[]);});
test('чужой язык и ID отклоняются даже в ошибочном адаптере',()=>{const r={lessonId:'wrong',locale:'en',text:'RAII',section:'theory',sourceId:'wrong'};assert.deepEqual(findTutorEvidence({search:()=>[],getLesson:()=>[r]},'Explain RAII to me',{locale:'ru',lessonId:'cpp.lifetime-ownership'}),[]);});
test('C++ и пунктуация не становятся исполняемым регулярным выражением',()=>{for(const q of ['C++ ??? [[[]]', '(?=RAII).*', 'RAII C++ **', 'O(n log n)'])assert.doesNotThrow(()=>findTutorEvidence(indexes.ru,q,{locale:'ru',lessonId:'cpp.lifetime-ownership'}));});
test('отзыв контекста урока не допускает fallback и не читает код',async()=>{
 let selected=0,calls=0;const boundary={},host=createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>({view:'akronikl'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',readSelection:()=>{selected++;},authorize:()=>true});
 const tutor=createTutorSession({host,loadKnowledge:async()=>indexes.ru,provider:{kind:'local',transport:'in-process',modelId:'synthetic',dispose(){},generate:()=>{calls++;}}});
 try{assert.equal((await tutor.ask({text:corpus.cases[0].prompt})).status,'empty');assert.equal(calls,0);assert.equal(selected,0);}finally{tutor.dispose();}
});
