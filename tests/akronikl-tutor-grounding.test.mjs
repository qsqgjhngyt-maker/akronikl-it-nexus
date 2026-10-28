import test from 'node:test';
import assert from 'node:assert/strict';
import {createWllamaProvider} from '../akronikl/tutor/local-model.js';
const source={label:'S1',text:'A local object is destroyed when its block exits. Copying its address does not keep it alive.'};
function provider(response,outcomes=[]){return createWllamaProvider({async createChatCompletion(x){assert.ok(x.response_format.json_schema.schema.properties.basis);x.onData({choices:[{finish_reason:'stop',delta:{content:JSON.stringify(response)}}]});},async exit(){}},{onOutcome:e=>outcomes.push(e)});}
const request={messages:[],evidencePacket:{evidence:[source]},allowedCitations:['S1']};
test('actual model answer stays unaltered; evidence quote is separately validated',async()=>{
 const trace=[],p=provider({basis:{label:'S1',quote:'Copying its address does not keep it alive.'},answer:'ACTUAL_PROVIDER_SENTINEL',citations:['S1']},trace);
 assert.deepEqual(await p.generate(request),{answer:'ACTUAL_PROVIDER_SENTINEL',citations:['S1']});assert.equal(trace[0].basisVerified,true);assert.match(trace[0].rawContent,/ACTUAL_PROVIDER_SENTINEL/);await p.dispose();
});
for(const basis of [{label:'S1',quote:'The copied address keeps its object alive.'},{label:'OTHER',quote:source.text},{label:'S1',quote:'alive'}])test('fabricated/foreign/trivial quote is rejected: '+basis.quote,async()=>{
 const trace=[],p=provider({basis,answer:'UNSUPPORTED_ACTUAL_ANSWER',citations:['S1']},trace);await assert.rejects(p.generate(request),/GROUNDING_INVALID/);assert.equal(trace[0].basisVerified,false);assert.match(trace[0].rawContent,/UNSUPPORTED_ACTUAL_ANSWER/);await p.dispose();
});
test('a compiler fact must ground diagnostics instead of a selected-code hypothesis',async()=>{
 const trace=[],p=provider({basis:{label:'C1',quote:'const int value=4;'},answer:'Wrong fact',citations:['C1']},trace);
 await assert.rejects(p.generate({...request,allowedCitations:['C1','D1'],evidencePacket:{evidence:[{label:'C1',text:'const int value=4;'},{label:'D1',text:'error: assignment of read-only variable value'}]}}),/GROUNDING_INVALID/);await p.dispose();
});
test('quote verification alone is not semantic acceptance',async()=>{
 const p=provider({basis:{label:'S1',quote:'Copying its address does not keep it alive.'},answer:'WRONG_UNVERIFIED_CONTRADICTION',citations:['S1']});
 assert.equal((await p.generate(request)).answer,'WRONG_UNVERIFIED_CONTRADICTION');await p.dispose(); // Human rubric, not this structural guard, judges truth.
});
