// Ограничение CPU-контекста не меняет факты курса и не разрешает чужие цитаты.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createKnowledgeIndex,createNexusContextAdapter,diagnosticFromNexus} from '../akronikl/core/index.js';
import {createTutorSession} from '../akronikl/tutor/session.js';
const index=createKnowledgeIndex(JSON.parse(await readFile(new URL('../akronikl/knowledge/core-index.ru.json',import.meta.url))));
function fixture(generate){const boundary={};return createTutorSession({host:createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>({view:'akronikl'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',authorize:()=>true}),loadKnowledge:async()=>index,provider:{kind:'local',transport:'in-process',modelId:'synthetic',generate,dispose(){}}});}
test('CPU-профиль отправляет одну теоретическую выдержку с тем же происхождением',async()=>{
 let packet;const tutor=fixture(async x=>{packet=x;return{answer:'Ресурс связан с объектом.',citations:['S1']};});
 const r=await tutor.ask({text:'Объясни RAII'});const data=packet.evidencePacket;
 assert.equal(r.status,'ok');assert.equal(data.evidence.length,1);assert.equal(r.sources.length,1);
 assert.match(r.sources[0].sourceId,/:theory-/);assert.equal(data.evidence[0].text,r.sources[0].text);
 assert.equal(JSON.stringify(packet.messages).length<1400,true);assert.deepEqual(packet.allowedCitations,['S1']);tutor.dispose();
});
test('модель получает реальные строки цитат; metadata не подменяет её prompt',async()=>{
 let packet;const tutor=fixture(async x=>{packet=x;return{answer:'UNALTERED_MODEL_SENTINEL',citations:['S1']};});
 const r=await tutor.ask({text:'Объясни RAII'});const content=packet.messages.at(-1).content;
 for(const s of packet.evidencePacket.evidence)for(const line of s.text.split('\n'))assert.ok(content.includes('> '+line));
 assert.match(content,/Question \(not an asserted fact\)/);assert.equal(r.text,'UNALTERED_MODEL_SENTINEL');assert.equal(packet.messages.filter(m=>m.role==='system').length,1);tutor.dispose();
});
test('язык ответа повторяется после цитаты, в том числе при английской диагностике',async()=>{
 let packet;const boundary={},selection={filePath:'main.cpp',revision:1,languageId:'cpp',code:'int main(){const int n=1; n=2;}',startLine:1,endLine:1};
 const diagnostic=diagnosticFromNexus({compilerDiagnostic:true,file:'main.cpp',line:1,column:27,raw:'main.cpp:1:27: error: assignment of read-only variable n'},{selection,runRevision:1});assert.ok(diagnostic);
 const host=createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>({view:'code-studio'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',readSelection:()=>selection,readDiagnostics:()=>[diagnostic],authorize:()=>true});
 const tutor=createTutorSession({host,locale:'ru',loadKnowledge:async()=>index,provider:{kind:'local',transport:'in-process',generate:async x=>{packet=x;return{answer:'SENTINEL',citations:['D1']};},dispose(){}}});
 const result=await tutor.ask({text:'Объясни диагностику',intent:'diagnostic',include:['selection','diagnostics']});assert.equal(result.generated,true);
 assert.match(packet.evidencePacket.evidence.find(e=>e.label==='D1').text,/error: assignment of read-only/);
 const content=packet.messages.at(-1).content;assert.ok(content.indexOf('error: assignment')<content.indexOf('Ответь по-русски'));assert.match(content.split('\n').at(-1),/^Ответь по-русски/);tutor.dispose();
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

for(const [name,code,message,expected] of [
 ['undeclared identifier','int main(){return unseen;}','error: unseen was not declared in this scope',false],
 ['missing terminator','int main(){return 3 }',"error: expected ';' before '}' token",false],
 ['private member','class Gate{int score=3;}; int main(){Gate g; return g.score;}','error: int Gate::score is private within this context',false],
 ['verified read-only','int main(){const int guard=4; guard=5;}','error: assignment of read-only variable guard',true]
])test('read-only policy applies only to its verified diagnostic: '+name,async()=>{
 let packet;const boundary={},selection={filePath:'heldout.cpp',revision:7,languageId:'cpp',code,startLine:1,endLine:1};
 const diagnostic=diagnosticFromNexus({compilerDiagnostic:true,file:'heldout.cpp',line:1,column:1,raw:'heldout.cpp:1:1: '+message},{selection,runRevision:7});assert.ok(diagnostic);
 const host=createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>({view:'code-studio'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',readSelection:()=>selection,readDiagnostics:()=>[diagnostic],authorize:()=>true});
 const tutor=createTutorSession({host,locale:'ru',loadKnowledge:async()=>index,provider:{kind:'local',transport:'in-process',generate:async x=>{packet=x;return{answer:'ACTUAL_TEST_PROVIDER',citations:['D1']};},dispose(){}}});
 const answer=await tutor.ask({text:'Explain this compiler message',intent:'diagnostic',include:['selection','diagnostics']});assert.equal(answer.text,'ACTUAL_TEST_PROVIDER');
 assert.equal(packet.messages[0].content.includes('Read-only prohibits assignment even of the old value'),expected);
 assert.equal(packet.messages.at(-1).content.includes('Если объект read-only'),expected);
 assert.equal(packet.evidencePacket.evidence.find(x=>x.label==='D1').text,'heldout.cpp:1:1: '+message);tutor.dispose();
});
