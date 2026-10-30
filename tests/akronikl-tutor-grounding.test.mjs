import test from 'node:test';
import assert from 'node:assert/strict';
import {createWllamaProvider,evidenceQuoteCandidates,selectEvidenceFocus} from '../akronikl/tutor/local-model.js';
const source={label:'S1',text:'A local object is destroyed when its block exits. Copying its address does not keep it alive.'};
function provider(response,outcomes=[]){return createWllamaProvider({async createChatCompletion(x){assert.equal(x.response_format.json_schema.schema.properties.basis,undefined);assert.deepEqual(x.messages,[]);x.onData({choices:[{finish_reason:'stop',delta:{content:JSON.stringify(response)}}]});},async exit(){}},{onOutcome:e=>outcomes.push(e)});}
const request={messages:[],evidencePacket:{question:'local object lifetime',evidence:[source]},allowedCitations:['S1']};
test('actual model answer stays unaltered; retrieval focus is separately recorded',async()=>{
 const trace=[],p=provider({answer:'ACTUAL_PROVIDER_SENTINEL',citations:['S1']},trace);
 assert.deepEqual(await p.generate(request),{answer:'ACTUAL_PROVIDER_SENTINEL',citations:['S1']});assert.ok(source.text.includes(trace[0].evidenceFocus.quote));assert.equal(trace[0].basisVerified,undefined);assert.match(trace[0].rawContent,/ACTUAL_PROVIDER_SENTINEL/);await p.dispose();
});
for(const citations of [[],['OTHER'],['S1','S1']])test('empty/foreign/duplicate citations are rejected: '+JSON.stringify(citations),async()=>{
 const trace=[],p=provider({answer:'UNSUPPORTED_ACTUAL_ANSWER',citations},trace);await assert.rejects(p.generate(request),/GROUNDING_INVALID/);assert.match(trace[0].rawContent,/UNSUPPORTED_ACTUAL_ANSWER/);await p.dispose();
});
test('a compiler fact is the diagnostic retrieval focus instead of a code hypothesis',async()=>{
 const trace=[],p=provider({answer:'ACTUAL_DIAGNOSTIC_OUTPUT',citations:['D1']},trace);
 await p.generate({...request,allowedCitations:['C1','D1'],evidencePacket:{question:'value assignment',evidence:[{label:'C1',text:'const int value=4;'},{label:'D1',text:'error: assignment of read-only variable value'}]}});
 assert.equal(trace[0].evidenceFocus.label,'D1');assert.match(trace[0].evidenceFocus.quote,/read-only/);await p.dispose();
});
test('a correct literal focus is not semantic acceptance or answer substitution',async()=>{
 const p=provider({answer:'WRONG_UNVERIFIED_CONTRADICTION',citations:['S1']});
 assert.equal((await p.generate(request)).answer,'WRONG_UNVERIFIED_CONTRADICTION');await p.dispose();
});
test('quote choices are complete literal sentences, preserving negation and escape sequences',()=>{
 const s={label:'S1',text:"A heading\nclear() resets flags, but does not consume invalid input. ignore(max,'\\\\n') can discard the line. Clear first, otherwise ignore may fail."};
 const choices=evidenceQuoteCandidates(s);assert.ok(choices.includes('clear() resets flags, but does not consume invalid input.'));assert.ok(choices.includes("ignore(max,'\\\\n') can discard the line."));assert.ok(choices.every(q=>s.text.includes(q)));assert.ok(!choices.includes('A heading'));
});
test('completed invalid raw answer remains in QA outcome while stream progress stays numeric',async()=>{
 const trace=[],progress=[],p=createWllamaProvider({async createChatCompletion(x){x.onData({choices:[{finish_reason:'length',delta:{content:'{"answer":"PARTIAL_ACTUAL_OUTPUT'}}]});},async exit(){}},{onOutcome:r=>trace.push(r)});
 await assert.rejects(p.generate({...request,onProgress:r=>progress.push(r)}));assert.match(trace[0].rawContent,/PARTIAL_ACTUAL_OUTPUT/);assert.equal(trace[0].finishReason,'length');assert.doesNotMatch(JSON.stringify(progress),/PARTIAL_ACTUAL_OUTPUT/);await p.dispose();
});
test('C++ member access and diagnostic filenames are not sentence boundaries',()=>{
 const sentence='After Note b=a, changing b.text must not change a.text.';
 assert.ok(evidenceQuoteCandidates({label:'S1',text:sentence+' A copy is independent.'}).includes(sentence));
 const diagnostic='main.cpp:1:29: error: assignment of read-only variable value';
 assert.deepEqual(evidenceQuoteCandidates({label:'D1',text:diagnostic}),[diagnostic]);
});
