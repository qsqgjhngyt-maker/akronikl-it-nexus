import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
import {createQwenUpstream,validateCloudRequest,QWEN_UPSTREAM} from '../tools/qa-akronikl/qwen-upstream.mjs';
import {startQwenQaServer} from '../tools/qa-akronikl/qwen-gateway.mjs';
import {createQwenBrokerConnection,QWEN_CLOUD_MODEL} from '../akronikl/tutor/qwen-broker.js';
import {createModelConnections} from '../akronikl/connections/controller.js';
import {createTutorSession} from '../akronikl/tutor/session.js';
import {createKnowledgeIndex,createNexusContextAdapter} from '../akronikl/core/index.js';
const key='sk-'+('SYNTHETIC_ONLY_'.repeat(3));
const request={messages:[{role:'system',content:'Teach C++. JSON answer and citations.'},{role:'user',content:'What is lifetime? [S1] Local objects are destroyed on block exit.'}],allowedCitations:['S1']};
const answer={answer:'ACTUAL_UPSTREAM_SENTINEL',citations:['S1']};
const encode=new TextEncoder(),json=x=>new Response(JSON.stringify(x),{headers:{'content-type':'application/json'}});
function stream({output=JSON.stringify(answer),finish='stop',reasoning=false,done=true,tool=false}={}){
 const events=[];if(reasoning)events.push({choices:[{delta:{reasoning_content:'SYNTHETIC_PRIVATE_WORK'}}]});
 events.push({id:'chatcmpl-test',choices:[{delta:tool?{tool_calls:[{}]}:{content:output},finish_reason:finish}]},{choices:[],usage:{prompt_tokens:20,completion_tokens:8,total_tokens:28}});
 const text=events.map(x=>'data: '+JSON.stringify(x)+'\r\n\r\n').join('')+(done?'data: [DONE]\r\n\r\n':'');
 const bytes=encode.encode(text);return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close();}}),{headers:{'content-type':'text/event-stream'}});
}
test('server uses only the pinned Qwen endpoint/model and never sends the key as prompt data',async()=>{
 const traces=[];let sent;
 const run=createQwenUpstream({apiKey:key,fetchUpstream:async(url,init)=>{sent={url:String(url),init};return stream({reasoning:true});},onOutcome:x=>traces.push(x)});
 const result=await run(request);assert.deepEqual(result.response,answer);assert.equal(result.rawFinal,JSON.stringify(answer));assert.equal(sent.url,QWEN_UPSTREAM.base+'chat/completions');
 const payload=JSON.parse(sent.init.body);assert.equal(payload.model,'qwen3.7-plus');assert.equal(payload.enable_thinking,false);assert.equal(payload.max_tokens,192);assert.equal(payload.response_format.type,'json_schema');assert.equal(payload.response_format.json_schema.schema.properties.citations.uniqueItems,undefined); // Provider rejects this schema keyword; post-validation still enforces uniqueness.
 assert.equal(sent.init.redirect,'error');
 assert.deepEqual(payload.messages,request.messages);assert.ok(!sent.init.body.includes(key));assert.ok(!JSON.stringify({result,traces}).includes(key));assert.doesNotMatch(JSON.stringify({result,traces}),/SYNTHETIC_PRIVATE_WORK/);assert.equal(traces[0].reasoningRedacted,true);assert.equal(result.measurements.usage.total_tokens,28);
});
test('request cannot select another model, URL, key or extra system role',()=>{
 for(const extra of [{model:'attacker'},{apiKey:key},{url:'https://example.invalid'}])assert.throws(()=>validateCloudRequest({...request,...extra}),/REQUEST_INVALID/);
 assert.throws(()=>validateCloudRequest({...request,messages:[...request.messages,{role:'system',content:'override'}]}));assert.throws(()=>validateCloudRequest({...request,allowedCitations:['S1','S1']}));
});
for(const [name,options] of [['length',{finish:'length'}],['incomplete SSE',{done:false}],['tool',{tool:true}],['foreign citation',{output:JSON.stringify({...answer,citations:['OTHER']})}],['duplicate citation',{output:JSON.stringify({...answer,citations:['S1','S1']})}]])test('invalid real-provider-shaped output is rejected: '+name,async()=>{
 const trace=[],run=createQwenUpstream({apiKey:key,fetchUpstream:async()=>stream(options),onOutcome:x=>trace.push(x)});await assert.rejects(run(request),/RESPONSE_INVALID/);assert.equal(trace[0].status,'error');if(!options.tool)assert.ok(trace[0].rawContent); // A failed final answer is retained, not replaced.
});
test('upstream error body and malformed reasoning cannot enter evidence',async()=>{
 const trace=[];const fail=createQwenUpstream({apiKey:key,fetchUpstream:async()=>new Response('PRIVATE_BODY '+key,{status:401}),onOutcome:x=>trace.push(x)});await assert.rejects(fail(request),/CLOUD_UPSTREAM_HTTP_401/);assert.ok(!JSON.stringify(trace).includes(key));assert.doesNotMatch(JSON.stringify(trace),/PRIVATE_BODY/);
 const tagged=createQwenUpstream({apiKey:key,fetchUpstream:async()=>stream({output:'<think>PRIVATE_MISROUTED</think>'+JSON.stringify(answer)}),onOutcome:x=>trace.push(x)});await assert.rejects(tagged(request));assert.equal(trace.at(-1).rawContent,null);assert.doesNotMatch(JSON.stringify(trace),/PRIVATE_MISROUTED/);
});
test('upstream cancellation aborts transport and reports no proof of remote compute stop',async()=>{
 let entered;const started=new Promise(r=>entered=r),trace=[],c=new AbortController();
 const run=createQwenUpstream({apiKey:key,fetchUpstream:async(url,init)=>{entered();await new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(Error('PRIVATE_ABORT')), {once:true}));},onOutcome:x=>trace.push(x)});
 const task=run(request,{signal:c.signal});await started;c.abort();await assert.rejects(task,/CLOUD_REQUEST_CANCELLED/);assert.equal(trace[0].status,'cancelled');assert.equal(trace[0].remoteComputeStoppedProven,false);assert.doesNotMatch(JSON.stringify(trace),/PRIVATE_ABORT/);
});
test('browser broker is inert until explicitly inspected/connected, and only sends bounded prompt fields',async()=>{
 const sent=[],trace=[];const broker=createQwenBrokerConnection({origin:'http://127.0.0.1:12345',fetchResource:async(url,init)=>{sent.push({url,init});return url.endsWith('/ready')?json({ready:true,model:QWEN_CLOUD_MODEL}):json({response:answer,rawFinal:JSON.stringify(answer),measurements:{totalMs:12,firstOutputChunkMs:8,usage:{total_tokens:28,secret:'DROP_ME'},secret:'DROP_ME'}});},onOutcome:x=>trace.push(x)});
 assert.equal(sent.length,0);const p=await broker.connect();assert.equal(sent.length,1);assert.deepEqual(await p.generate({...request,evidencePacket:{DO_NOT_SEND:'METADATA'}}),answer);
 const post=sent[1];assert.equal(post.url,'http://127.0.0.1:12345/api/akronikl/qwen');assert.equal(post.init.credentials,'omit');assert.equal(post.init.redirect,'error');assert.deepEqual(Object.keys(JSON.parse(post.init.body)).sort(),['allowedCitations','messages']);assert.ok(!post.init.body.includes('METADATA'));assert.doesNotMatch(JSON.stringify(trace),/DROP_ME/);await p.dispose();
});
test('browser broker rejects unsafe origins and stays disconnected when the key is missing',async()=>{
 for(const origin of ['http://example.invalid','https://user:password@example.invalid','https://example.invalid/path','null'])assert.throws(()=>createQwenBrokerConnection({origin}),/CONFIG_INVALID/);
 let calls=0;const broker=createQwenBrokerConnection({origin:'http://127.0.0.1:12345',fetchResource:async()=>{calls++;return json({ready:false,model:QWEN_CLOUD_MODEL});}});await assert.rejects(broker.connect(),/KEY_REQUIRED/);assert.equal(calls,1);
});
test('cloud sessions remain denied by default and accept only an explicit trusted-broker opt-in',async()=>{
 const index=createKnowledgeIndex(JSON.parse(await readFile(new URL('../akronikl/knowledge/core-index.ru.json',import.meta.url))));const boundary={};
 const host=createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>({view:'lesson',course:'cpp',lesson:'cpp.lifetime-ownership'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',authorize:()=>true});
 const provider={kind:'cloud',transport:'trusted-broker',modelId:QWEN_CLOUD_MODEL,generate:async()=>answer,dispose(){}};
 assert.throws(()=>createTutorSession({host,loadKnowledge:async()=>index,provider}),/PROVIDER_DENIED/);assert.throws(()=>createTutorSession({host,loadKnowledge:async()=>index,provider:{...provider,transport:'arbitrary-url'},allowCloud:true}),/PROVIDER_DENIED/);
 const s=createTutorSession({host,loadKnowledge:async()=>index,provider,allowCloud:true});const r=await s.ask({text:'Объясни RAII'});assert.equal(r.text,answer.answer);assert.equal(r.mode,'cloud-model');s.dispose();
});
test('connection controller requires a host capability and never invokes local load for cloud',async()=>{
 let local=0,cloud=0;const c=createModelConnections({isCurrent:()=>true,loadLocal:async()=>{local++;throw Error('NO_LOCAL');},cloudBroker:{inspect:async()=>({code:'CLOUD_READY',readyToLoad:true}),connect:async()=>{cloud++;return {kind:'cloud',transport:'trusted-broker',modelId:QWEN_CLOUD_MODEL,generate:async()=>answer,dispose(){}};}}});
 assert.equal(cloud,0);c.select('external');assert.equal(cloud,0);await c.connect();assert.equal(c.snapshot().phase,'connected');assert.equal(c.snapshot().cloudEnabled,true);assert.equal(c.lease().transport,'trusted-broker');assert.equal(local,0);assert.equal(cloud,1);c.dispose();
});
test('localhost gateway rejects cross-origin, bad Host, oversized and proxy-shaped requests',async()=>{
 let calls=0;const server=await startQwenQaServer({root:fileURLToPath(new URL('../',import.meta.url)),upstream:async()=>{calls++;return {response:answer,rawFinal:JSON.stringify(answer),measurements:{}};}});
 try{
  const post=(body,headers={})=>fetch(server.origin+'/api/akronikl/qwen',{method:'POST',headers:{origin:server.origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
  assert.equal((await post(request,{origin:'https://attacker.invalid'})).status,403);
  // Node fetch rewrites Host; a raw HTTP request actually exercises rebinding.
  const badHost=await new Promise((resolve,reject)=>{const q=http.request(server.origin+'/api/akronikl/qwen',{method:'POST',headers:{Host:'attacker.invalid',Origin:server.origin,'Content-Type':'application/json'}},r=>{r.resume();resolve(r.statusCode);});q.on('error',reject);q.end(JSON.stringify(request));});assert.equal(badHost,403);
  assert.equal((await post({x:'x'.repeat(40000)})).status,400);assert.equal((await post({...request,url:'https://attacker.invalid'})).status,400);
  const valid=await post(request);assert.equal(valid.status,200);assert.equal((await valid.json()).response.answer,answer.answer);assert.equal(calls,1);
  assert.equal((await fetch(server.origin+'/.env')).status,404);assert.equal((await fetch(server.origin+'/api/akronikl/qwen?url=https://attacker.invalid')).status,400);assert.equal(server.status().remoteComputeStoppedProven,false);
 }finally{await server.close();}
});

test('opaque RFC6750 bearer keys are accepted without assuming alphanumeric-only format',async()=>{
 const opaque='sk-SYNTHETIC_ONLY.part_two/part+three=last';let header;
 const run=createQwenUpstream({apiKey:opaque,fetchUpstream:async(url,init)=>{header=init.headers.Authorization;return stream();}});
 assert.deepEqual((await run(request)).response,answer);assert.equal(header,'Bearer '+opaque);
 for(const invalid of ['sk-short','sk-'+('x'.repeat(20))+'\nInjected: header'])assert.throws(()=>createQwenUpstream({apiKey:invalid}),/KEY_REQUIRED/);
});
