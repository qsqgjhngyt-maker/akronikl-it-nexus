import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {completeExcerpt,previousCompleteTurn} from '../akronikl/tutor/evidence.js';
import {createTutorSession} from '../akronikl/tutor/session.js';
import {createNexusContextAdapter,createKnowledgeIndex} from '../akronikl/core/index.js';
const index=createKnowledgeIndex(JSON.parse(await readFile(new URL('../akronikl/knowledge/core-index.ru.json',import.meta.url))));
const recorded='RAII (Resource Acquisition Is Initialization) связывает ресурс с объектом, обеспечивая автоматическое освобождение при деструкторе. Это правило полезно, но не гарантирует выполнения деструкторов при аварийном завершении.';
function session(generate){const boundary={};return createTutorSession({host:createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>({view:'akronikl'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',authorize:()=>true}),loadKnowledge:async()=>index,provider:{kind:'local',transport:'in-process',modelId:'synthetic',generate,dispose(){}}});}
test('полный предыдущий ответ: «при деструкторе», а не «при д»',async()=>{
 const packets=[];const s=session(async x=>{packets.push(x);return {answer:recorded,citations:['S1']};});
 await s.ask({text:'Объясни RAII'});await s.ask({text:'Объясни проще',intent:'simpler'});
 assert.equal(packets[1].messages.find(x=>x.role==='assistant').content,recorded);s.dispose();
});
test('реальная выдержка сохраняет завершённый абзац и происхождение',async()=>{
 const s=session(async()=>({answer:recorded,citations:['S1']}));const r=await s.ask({text:'Объясни RAII'});
 const original=index.search('RAII',{locale:'ru',limit:3}).find(x=>x.section==='theory');
 assert.equal(r.sources[0].sourceId,original.sourceId);assert.ok(original.text.startsWith(r.sources[0].text));
 assert.match(r.sources[0].text,/освобождает в деструкторе/);assert.match(r.sources[0].text,/[.!?]$/);assert.equal(r.sources[0].truncated,true);s.dispose();
});
test('короткий источник передаётся без изменений',()=>assert.deepEqual(completeExcerpt('A complete sentence.'),{text:'A complete sentence.',truncated:false}));
test('длинный одноабзацный источник заканчивается на настоящем предложении',()=>{const x='First complete sentence. '+ 'Word '.repeat(100);assert.equal(completeExcerpt(x,60).text,'First complete sentence.');});
test('без законченного предложения — пустой фрагмент, не обрывок',()=>assert.deepEqual(completeExcerpt('x'.repeat(500)),{text:'',truncated:true}));
test('точка на границе лимита внутри слова не завершает предложение',()=>assert.equal(completeExcerpt('abc.def',4).text,''));
test('не потерять отрицание в коротком источнике',()=>{const x='Деструктор не гарантирован при аварии.';assert.equal(completeExcerpt(x,80).text,x);});
test('длинная история пропускается целиком',()=>assert.deepEqual(previousCompleteTurn([{question:'q',answer:'x'.repeat(1201)}],true),[]));
test('новая тема не получает старую историю',()=>assert.deepEqual(previousCompleteTurn([{question:'q',answer:recorded}],false),[]));
test('предыдущий вопрос не обрезается посередине',()=>{const q='Как устроен автоматический жизненный цикл ресурса при выходе из функции после завершения вызова?';assert.equal(previousCompleteTurn([{question:q,answer:recorded}],true)[0].content,q);});
