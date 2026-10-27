// Ограничение CPU-контекста не меняет факты курса и не разрешает чужие цитаты.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createKnowledgeIndex,createNexusContextAdapter} from '../akronikl/core/index.js';
import {createTutorSession} from '../akronikl/tutor/session.js';
const index=createKnowledgeIndex(JSON.parse(await readFile(new URL('../akronikl/knowledge/core-index.ru.json',import.meta.url))));
function fixture(generate){const boundary={};return createTutorSession({host:createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>({view:'akronikl'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',authorize:()=>true}),loadKnowledge:async()=>index,provider:{kind:'local',transport:'in-process',modelId:'synthetic',generate,dispose(){}}});}
test('CPU-профиль отправляет одну теоретическую выдержку с тем же происхождением',async()=>{
 let packet;const tutor=fixture(async x=>{packet=x;return{answer:'Ресурс связан с объектом.',citations:['S1']};});
 const r=await tutor.ask({text:'Объясни RAII'});const data=JSON.parse(packet.messages.at(-1).content);
 assert.equal(r.status,'ok');assert.equal(data.evidence.length,1);assert.equal(r.sources.length,1);
 assert.match(r.sources[0].sourceId,/:theory-/);assert.equal(data.evidence[0].text,r.sources[0].text);
 assert.equal(JSON.stringify(packet.messages).length<1400,true);assert.deepEqual(packet.allowedCitations,['S1']);tutor.dispose();
});
test('самостоятельная новая тема не получает прежний разговор в prompt',async()=>{
 const packets=[];const tutor=fixture(async x=>{packets.push(x);return{answer:'OLD_TOPIC_SENTINEL',citations:['S1']};});
 await tutor.ask({text:'Объясни RAII'});await tutor.ask({text:'Объясни указатели'});
 assert.doesNotMatch(JSON.stringify(packets[1].messages),/OLD_TOPIC_SENTINEL/);assert.equal(packets[1].messages.length,2);tutor.dispose();
});
test('ограниченный prompt не разрешает ссылку на исключённую выдержку',async()=>{
 const tutor=fixture(async()=>({answer:'Недоказанное',citations:['S2']}));
 assert.equal((await tutor.ask({text:'Объясни RAII'})).status,'error');assert.equal(tutor.snapshot().length,0);tutor.dispose();
});
