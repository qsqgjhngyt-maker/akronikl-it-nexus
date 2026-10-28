import test from 'node:test';
import assert from 'node:assert/strict';
import {createWllamaProvider} from '../akronikl/tutor/local-model.js';
test('unexpected reasoning is rejected without exposure in progress or QA outcome',async()=>{
 const progress=[],outcomes=[];const p=createWllamaProvider({async createChatCompletion(x){assert.equal(x.max_tokens,384);assert.equal(x.chat_template_kwargs.enable_thinking,false);x.onData({choices:[{delta:{reasoning_content:'PRIVATE_INTERNAL_WORK'}}]});x.onData({choices:[{finish_reason:'stop',delta:{content:'{"answer":"FINAL_ONLY","citations":["S1"]}'}}]});},async exit(){}},{onOutcome:x=>outcomes.push(x)});
 await assert.rejects(p.generate({messages:[],allowedCitations:['S1'],onProgress:x=>progress.push(x)}),/LOCAL_ANSWER_INVALID/);assert.doesNotMatch(JSON.stringify({progress,outcomes}),/PRIVATE_INTERNAL_WORK|FINAL_ONLY/);assert.equal(outcomes[0].rawContent,null);assert.equal(outcomes[0].reasoningRedacted,true);await p.dispose();
});
test('failed reasoning experiments cannot be re-enabled through provider configuration',()=>{
 const e={async createChatCompletion(){},async exit(){}};for(const n of [-1,1,48,64,128,999999,NaN,'0'])assert.throws(()=>createWllamaProvider(e,{reasoningBudget:n}),/CONFIG_INVALID/);
});
test('reasoning misplaced in content is rejected and redacted without exception text echo',async()=>{
 const outcomes=[];const p=createWllamaProvider({async createChatCompletion(x){x.onData({choices:[{finish_reason:'stop',delta:{content:'<think>PRIVATE_MISROUTED_WORK</think>{"answer":"x","citations":[]}'}}]});},async exit(){}},{onOutcome:x=>outcomes.push(x)});
 await assert.rejects(p.generate({messages:[],allowedCitations:['S1']}),/LOCAL_ANSWER_INVALID/);assert.equal(outcomes[0].rawContent,null);assert.equal(outcomes[0].reasoningRedacted,true);assert.doesNotMatch(JSON.stringify(outcomes),/PRIVATE_MISROUTED_WORK/);await p.dispose();
});
