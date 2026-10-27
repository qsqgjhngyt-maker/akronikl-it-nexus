import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{makeIndices,makeQualityProbe}from'./helpers/akronikl-quality-probe.mjs';
import{retrieveTutorMaterials}from'../akronikl/tutor/retrieval.js';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url)));
const indices=makeIndices(await read('akronikl/knowledge/core-index.ru.json'),await read('akronikl/knowledge/core-index.en.json'));
const corpus=await read('tests/fixtures/akronikl-tutor-quality-v1.json');
for(const c of corpus.cases.filter(x=>x.kind==='course'))test('Естественный вопрос получает источники своего подтверждённого урока: '+c.id,async()=>{
 const p=makeQualityProbe(c,null,indices),r=await p.run();assert.equal(r.status,'ok');assert.ok(r.sources.length);assert.ok(r.sources.every(s=>s.sourcePath===c.source.path));p.dispose();
});
test('Fallback не выбирает урок самостоятельно без подтверждённой привязки',()=>{assert.deepEqual(retrieveTutorMaterials(indices.ru,corpus.cases[0].prompt,{locale:'ru'}),[]);});
test('Чужой courseId не раскрывает источники выбранного урока',()=>{assert.deepEqual(retrieveTutorMaterials(indices.ru,corpus.cases[0].prompt,{locale:'ru',courseId:'other',lessonId:'cpp.lifetime-ownership'}),[]);});
test('Другой язык отклоняется',()=>assert.throws(()=>retrieveTutorMaterials(indices.ru,'RAII',{locale:'en'})));
test('Неизвестная тема не подменяется текущим уроком',()=>assert.deepEqual(retrieveTutorMaterials(indices.ru,'Как выращивать орхидеи в теплице?',{locale:'ru',courseId:'cpp',lessonId:'cpp.lifetime-ownership'}),[]));
test('Fallback возвращает исходные байты, а не создаёт объяснение',()=>{const r=retrieveTutorMaterials(indices.en,corpus.cases[1].prompt,{locale:'en',courseId:'cpp',lessonId:'cpp.lifetime-ownership'});const sources=indices.en.getSources();for(const x of r)assert.deepEqual(x,sources.find(s=>s.sourceId===x.sourceId));});
test('Прежний строгий поиск коротких терминов не изменён',()=>{assert.deepEqual(retrieveTutorMaterials(indices.ru,'указатели',{locale:'ru',limit:3}),indices.ru.search('указатели',{locale:'ru',limit:3}));});
