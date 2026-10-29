import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {CLOUD_PROVIDERS,cloudSelection,cloudModelInput} from '../akronikl/connections/cloud-catalog.js';
import {createCloudAdapter} from '../tools/qa-akronikl/cloud-adapters.mjs';
import {startCloudSettingsServer} from '../tools/qa-akronikl/cloud-settings-gateway.mjs';
import {createCloudSettingsBroker} from '../akronikl/tutor/cloud-settings-broker.js';
import {createModelConnections} from '../akronikl/connections/controller.js';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {createCloudVault} from '../tools/qa-akronikl/cloud-vault.mjs';
const secret='SYNTHETIC_API_KEY_ONLY_123456789',access='SYNTHETIC_ACCESS_TOKEN_ONLY_123456789';
const request={messages:[{role:'system',content:'Teach C++. JSON answer and citations.'},{role:'user',content:'S1: Local object lifetime ends on block exit. Explain.'}],allowedCitations:['S1']},answer={answer:'ACTUAL_PROVIDER_SENTINEL',citations:['S1']},raw=JSON.stringify(answer);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
test('human-entered Qwen catalog names resolve before transport; a fresh account has no inherited workspace',()=>{
 for(const name of ['Qwen3.8-Max','QWEN3.8-MAX',' qwen3.8-max '])assert.equal(cloudModelInput('qwen',name),'qwen3.8-max');
 assert.equal(cloudModelInput('qwen','MyCaseSensitiveDeployment'),'MyCaseSensitiveDeployment');assert.equal(cloudModelInput('openai','CaseSensitiveId'),'CaseSensitiveId');
 assert.equal(cloudSelection().options.workspaceId,'');assert.deepEqual(cloudSelection({providerId:'qwen',modelId:'qwen3.8-max',options:{region:'singapore',workspaceId:'ws-explicit123'}}).options,{region:'singapore',workspaceId:'ws-explicit123'});
 // Exact already-selected IDs remain a wire contract for old clients; only input is normalized.
 assert.equal(cloudSelection({providerId:'qwen',modelId:'Qwen3.8-Max',options:{}}).modelId,'Qwen3.8-Max');
});
function providerResponse(id,content=raw){
 if(id==='openai')return {status:'completed',output:[{type:'reasoning',summary:'PRIVATE_THINKING_SENTINEL'},{type:'message',content:[{type:'output_text',text:content}]}],usage:{input_tokens:12,output_tokens:9}};
 if(id==='anthropic')return {stop_reason:'end_turn',content:[{type:'thinking',thinking:'PRIVATE_THINKING_SENTINEL'},{type:'text',text:content}],usage:{input_tokens:12,output_tokens:9}};
 if(id==='gemini')return {candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'PRIVATE_THINKING_SENTINEL'},{text:content}]}}],usageMetadata:{promptTokenCount:12,candidatesTokenCount:9,totalTokenCount:21}};
 return {choices:[{finish_reason:'stop',message:{content,reasoning_content:'PRIVATE_THINKING_SENTINEL'}}],usage:{prompt_tokens:12,completion_tokens:9,total_tokens:21}};
}
for(const p of CLOUD_PROVIDERS)test('real HTTP adapter contract, synthetic upstream: '+p.id,async()=>{
 const calls=[],traces=[];const adapter=createCloudAdapter({selection:{providerId:p.id,modelId:p.modelId,options:{}},apiKey:secret,onOutcome:x=>traces.push(x),fetchUpstream:async(url,init)=>{calls.push({url:String(url),init});if(String(url).includes('/oauth'))return json({access_token:access,expires_at:Date.now()+1800000});return json(providerResponse(p.id));}});
 const result=await adapter.complete(request);assert.deepEqual(result.response,answer);assert.equal(result.rawFinal,raw);assert.equal(result.measurements.providerId,p.id);assert.equal(calls.at(-1).init.redirect,'error');assert.equal(calls.at(-1).url.startsWith('https://'),true);
 assert.equal(JSON.stringify({result,traces}).includes(secret),false);assert.equal(JSON.stringify({result,traces}).includes(access),false);assert.doesNotMatch(JSON.stringify({result,traces}),/PRIVATE_THINKING_SENTINEL/);
 const last=calls.at(-1),body=JSON.parse(last.init.body);assert.equal(last.init.body.includes(secret),false);
 if(p.id==='openai'){assert.equal(body.store,false);assert.equal(last.url,'https://api.openai.com/v1/responses');assert.equal(body.instructions,request.messages[0].content);}
 if(p.id==='anthropic'){assert.equal(last.init.headers['anthropic-version'],'2026-10-21');assert.ok(body.output_config.format.schema);}
 if(p.id==='gemini'){assert.equal(last.init.headers['x-goog-api-key'],secret);assert.ok(!last.url.includes(secret));assert.equal(body.contents[0].role,'user');}
 if(p.id==='kimi')assert.deepEqual(body.thinking,{type:'disabled'});
 if(p.id==='deepseek'){assert.equal(body.response_format.type,'json_object');assert.deepEqual(body.thinking,{type:'disabled'});}
 if(p.id==='gigachat'){assert.equal(calls[0].init.headers.Authorization,'Basic '+secret);assert.match(calls[0].init.headers.RqUID,/^[0-9a-f-]{36}$/u);assert.equal(last.init.headers.Authorization,'Bearer '+access);}
 if(p.id==='openrouter')assert.equal(body.provider.allow_fallbacks,false);adapter.dispose();
});
test('provider options cannot become arbitrary URLs, headers or leaked keys',()=>{
 for(const value of [{providerId:'attacker',modelId:'m'},{providerId:'qwen',modelId:'https://attacker.invalid'},{providerId:'qwen',modelId:'m',options:{workspaceId:'ws-a.evil/'}},{providerId:'openai',modelId:'m',options:{url:'https://attacker.invalid'}},{providerId:'gigachat',modelId:'m',options:{scope:'ADMIN'}}])assert.throws(()=>cloudSelection(value));
 assert.throws(()=>createCloudAdapter({selection:cloudSelection(),apiKey:secret+'\nheader: injected'}),/KEY_INVALID/);
});
for(const status of [400,401,403,404,429,500])test('provider HTTP error is safe and preserves status: '+status,async()=>{
 const traces=[],a=createCloudAdapter({selection:{providerId:'qwen',modelId:'qwen3.7-plus'},apiKey:secret,onOutcome:x=>traces.push(x),fetchUpstream:async()=>new Response('PRIVATE_ERROR '+secret,{status})});
 await assert.rejects(a.complete(request),e=>/^CLOUD_[A-Z_]+$/u.test(e.message)&&!e.message.includes(secret));assert.equal(traces[0].httpStatus,status);assert.equal(JSON.stringify(traces).includes(secret),false);assert.doesNotMatch(JSON.stringify(traces),/PRIVATE_ERROR/);
});
for(const [name,output]of [['duplicate',JSON.stringify({...answer,citations:['S1','S1']})],['foreign',JSON.stringify({...answer,citations:['OTHER']})],['reasoning','<think>PRIVATE_INTERNAL</think>'+raw],['key echo',JSON.stringify({...answer,answer:secret})]])test('invalid generated content is rejected unchanged: '+name,async()=>{
 const trace=[],a=createCloudAdapter({selection:cloudSelection(),apiKey:secret,onOutcome:x=>trace.push(x),fetchUpstream:async()=>json(providerResponse('qwen',output))});await assert.rejects(a.complete(request),/RESPONSE_INVALID/);assert.equal(JSON.stringify(trace).includes(secret),false);assert.doesNotMatch(JSON.stringify(trace),/PRIVATE_INTERNAL/);if(['duplicate','foreign'].includes(name))assert.equal(trace[0].rawContent,output);
});
test('GigaChat access token is reused and refreshed on expiry, without disabling TLS',async()=>{
 let time=Date.now(),oauth=0;const a=createCloudAdapter({selection:{providerId:'gigachat',modelId:'GigaChat',options:{scope:'GIGACHAT_API_B2B'}},apiKey:secret,now:()=>time,fetchUpstream:async(url,init)=>{
  assert.equal(init.rejectUnauthorized,undefined);if(String(url).includes('/oauth')){oauth++;assert.equal(new URLSearchParams(init.body).get('scope'),'GIGACHAT_API_B2B');return json({access_token:access,expires_at:time+1800000});}return json(providerResponse('gigachat'));
 }});await a.complete(request);await a.complete(request);assert.equal(oauth,1);time+=1800000;await a.complete(request);assert.equal(oauth,2);a.dispose();
});
test('HTTP cancellation settles without claiming remote compute stopped',async()=>{
 let enter;const entered=new Promise(r=>enter=r),c=new AbortController(),trace=[];const a=createCloudAdapter({selection:cloudSelection(),apiKey:secret,onOutcome:x=>trace.push(x),fetchUpstream:async(url,init)=>{enter();await new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(Error('private transport')),{once:true}));}});
 const task=a.complete(request,{signal:c.signal});await entered;c.abort();await assert.rejects(task,/REQUEST_CANCELLED/);assert.equal(trace[0].status,'cancelled');
});
const repo=fileURLToPath(new URL('../',import.meta.url));
test('settings credential sessions are verified, isolated by browser cookie, revocable and never returned',async()=>{
 let disposed=0,seenKey=null;const s=await startCloudSettingsServer({personalPreview:true,root:repo,createAdapter:options=>{seenKey=options.apiKey;return {complete:async()=>({response:answer,rawFinal:raw,measurements:{}}),dispose(){disposed++;}};}});
 try{
  const post=(route,data,cookie='',origin=s.origin)=>fetch(s.origin+'/api/akronikl/cloud/'+route,{method:'POST',headers:{origin,'Content-Type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(data)});
  assert.equal(s.status().connections,0);assert.equal((await post('connect',{providerId:'qwen',modelId:'qwen3.7-plus',apiKey:secret},'','https://attacker.invalid')).status,403);
  const r=await post('connect',{providerId:'qwen',modelId:'qwen3.7-plus',apiKey:secret}),cookie=r.headers.get('set-cookie').split(';')[0],data=await r.json();assert.equal(data.connected,true);assert.equal(data.verified,true);assert.equal(seenKey,secret);assert.equal(JSON.stringify(data).includes(secret),false);assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/u);
  assert.equal((await post('generate',request)).status,401);assert.equal((await post('generate',{...request,connectionVersion:data.connectionVersion},cookie)).status,200);assert.equal((await post('disconnect',{connectionVersion:data.connectionVersion},cookie)).status,200);assert.equal((await post('generate',request,cookie)).status,401);assert.equal(s.status().sessions,0);assert.equal(disposed,1);
  assert.equal((await fetch(s.origin+'/qwen-api-key.txt')).status,404);
 }finally{await s.close();}
});
test('a rejected verification never becomes connected and erases the tentative adapter',async()=>{
 let disposed=0;const s=await startCloudSettingsServer({personalPreview:true,root:repo,createAdapter:()=>({complete:async()=>{throw Error('CLOUD_AUTH_FAILED');},dispose(){disposed++;}})});
 try{const r=await fetch(s.origin+'/api/akronikl/cloud/connect',{method:'POST',headers:{origin:s.origin,'Content-Type':'application/json'},body:JSON.stringify({providerId:'openai',modelId:'gpt-6-astra',apiKey:secret})});assert.equal(r.status,401);assert.equal(s.status().sessions,0);assert.equal(disposed,1);}finally{await s.close();}
});
test('idle session expiry disposes server credentials',async()=>{
 let now=Date.now(),disposed=0;const s=await startCloudSettingsServer({personalPreview:true,root:repo,ttlMs:100,now:()=>now,createAdapter:()=>({complete:async()=>({response:answer}),dispose(){disposed++;}})});
 try{await fetch(s.origin+'/api/akronikl/cloud/connect',{method:'POST',headers:{origin:s.origin,'Content-Type':'application/json'},body:JSON.stringify({providerId:'qwen',modelId:'m',apiKey:secret})});assert.equal(s.status().sessions,1);now+=101;assert.equal(s.status().sessions,0);assert.equal(disposed,1);}finally{await s.close();}
});
test('controller snapshots never include the entered API key or overwrite the selected model',async()=>{
 let captured;const broker={settings:true,inspect:async()=>({code:'CLOUD_READY',readyToLoad:true}),connect:async value=>{captured=value;return {kind:'cloud',transport:'trusted-broker',modelId:value.modelId,connectionVerified:true,generate:async()=>answer,dispose(){}};}};
 const c=createModelConnections({isCurrent:()=>true,loadLocal:async()=>{},cloudBroker:broker});c.select('external');c.configureCloud({providerId:'deepseek',modelId:'custom-model',options:{}});await c.connect({apiKey:secret});assert.equal(c.snapshot().modelId,'custom-model');assert.equal(captured.apiKey,secret);assert.equal(JSON.stringify(c.snapshot()).includes(secret),false);assert.equal((await c.lease().generate(request)).answer,answer.answer);c.dispose();
});
test('browser settings broker does not store keys and sends them only to connect',async()=>{
 const requests=[],outcomes=[];const broker=createCloudSettingsBroker({origin:'http://127.0.0.1:23456',fetchResource:async(url,init)=>{requests.push({url,init});if(url.endsWith('/connect'))return json({connected:true,verified:true,connectionVersion:'SYNTHETIC_VERSION_123456',providerId:'qwen',modelId:'m'});if(url.endsWith('/generate'))return json({response:answer,rawFinal:raw,measurements:{}});return json({disconnected:true});},onOutcome:x=>outcomes.push(x)});
 assert.equal(requests.length,0);const p=await broker.connect({providerId:'qwen',modelId:'m',apiKey:secret});assert.equal(p.connectionVerified,true);await p.generate(request);await p.dispose();assert.equal(requests[0].init.credentials,'same-origin');assert.equal(requests[0].init.body.includes(secret),true);assert.equal(requests.slice(1).some(x=>x.init.body.includes(secret)),false);assert.equal(JSON.stringify(outcomes).includes(secret),false);
});

test('late disposal and old requests cannot target a newer connection',async()=>{
 const server=await startCloudSettingsServer({personalPreview:true,root:repo,createAdapter:()=>({complete:async()=>({response:answer}),dispose(){}})});
 const post=(route,data,cookie='')=>fetch(server.origin+'/api/akronikl/cloud/'+route,{method:'POST',headers:{origin:server.origin,'Content-Type':'application/json',cookie},body:JSON.stringify(data)});
 try{
  const a=await post('connect',{providerId:'qwen',modelId:'m',apiKey:secret}),cookieA=a.headers.get('set-cookie').split(';')[0],first=await a.json();
  const b=await post('connect',{providerId:'deepseek',modelId:'n',apiKey:secret},cookieA),cookieB=b.headers.get('set-cookie').split(';')[0],second=await b.json();
  const late=await post('disconnect',{connectionVersion:first.connectionVersion},cookieB);assert.equal(late.headers.get('set-cookie'),null);assert.equal(server.status().sessions,1);
  assert.equal((await post('generate',{...request,connectionVersion:first.connectionVersion},cookieB)).status,401);
  assert.equal((await post('generate',{...request,connectionVersion:second.connectionVersion},cookieB)).status,200);
 }finally{await server.close();}
});

test('encrypted vault survives a new gateway, isolates browser owners and revokes forgotten credentials',async()=>{
 // Portable AES test codec exercises I/O and ownership; Windows DPAPI is a separate Windows/browser check.
 const dir=await mkdtemp(path.join(tmpdir(),'ak-cloud-vault-')),file=path.join(dir,'fixture.bin'),master=randomBytes(32);
 const codec={protect:async b=>{const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',master,iv),bytes=Buffer.concat([c.update(b),c.final()]);return Buffer.concat([iv,c.getAuthTag(),bytes]);},unprotect:async b=>{const d=createDecipheriv('aes-256-gcm',master,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]);}};
 const newVault=()=>createCloudVault({file,codec}),keys=[],disposed=[];
 const options=()=>({root:repo,personalPreview:true,vault:newVault(),createAdapter:o=>{keys.push(o.apiKey);return {complete:async()=>({response:answer}),dispose(){disposed.push(o.selection.providerId);}};}});
 let server=await startCloudSettingsServer(options());
 const post=(route,data,cookie='')=>fetch(server.origin+'/api/akronikl/cloud/'+route,{method:'POST',headers:{origin:server.origin,'Content-Type':'application/json',cookie},body:JSON.stringify(data)});
 try{
  const connected=await post('connect',{providerId:'qwen',modelId:'custom-saved',apiKey:secret,remember:true});assert.equal(connected.status,200);
  const cookies=connected.headers.getSetCookie(),owner=cookies.find(c=>c.startsWith('akronikl_owner_')).split(';')[0],session=cookies[0].split(';')[0];assert.equal((await connected.json()).remembered,true);
  const encrypted=await readFile(file);assert.equal(encrypted.includes(Buffer.from(secret)),false);assert.equal(encrypted.includes(Buffer.from('custom-saved')),false);
  assert.deepEqual(await newVault().list('X'.repeat(43)),[]);
  assert.equal((await fetch(server.origin+'/api/akronikl/cloud/saved',{headers:{cookie:owner}})).status,200);
  assert.equal(JSON.stringify(await(await fetch(server.origin+'/api/akronikl/cloud/saved',{headers:{cookie:owner}})).json()).includes(secret),false);
  await server.close();server=await startCloudSettingsServer(options());
  assert.equal((await post('connect',{providerId:'qwen',modelId:'custom-saved',useSaved:true})).status,400);
  const reconnected=await post('connect',{providerId:'qwen',modelId:'custom-saved',useSaved:true,remember:true},owner);assert.equal(reconnected.status,200);assert.equal(keys.at(-1),secret);
  assert.equal((await post('connect',{providerId:'openai',modelId:'m',useSaved:true},owner)).status,400);
  assert.equal((await post('forget',{providerId:'qwen'},owner)).status,200);assert.equal(server.status().sessions,0);assert.deepEqual(await newVault().list(owner.split('=')[1]),[]);
  assert.equal((await post('connect',{providerId:'qwen',modelId:'custom-saved',useSaved:true},owner)).status,400);assert.ok(disposed.length>=2);assert.ok(session);
 }finally{await server.close();await rm(dir,{recursive:true,force:true});}
});

test('failed verification never writes a key and vault failure never claims saved or connected',async()=>{
 let writes=0;const vault={id:'SYNTHETIC',list:async()=>[],get:async()=>null,put:async()=>{writes++;throw Error('private disk error');},remove:async()=>{}};
 let authFail=true,disposed=0;const server=await startCloudSettingsServer({personalPreview:true,root:repo,vault,createAdapter:()=>({complete:async()=>{if(authFail)throw Error('CLOUD_AUTH_FAILED');return {response:answer};},dispose(){disposed++;}})});
 const post=data=>fetch(server.origin+'/api/akronikl/cloud/connect',{method:'POST',headers:{origin:server.origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
 try{
  const data={providerId:'qwen',modelId:'m',apiKey:secret,remember:true};assert.equal((await post(data)).status,401);assert.equal(writes,0);authFail=false;
  const r=await post(data);assert.equal(r.ok,false);assert.equal(server.status().sessions,0);assert.equal(r.headers.get('set-cookie'),null);assert.equal(writes,1);assert.equal(disposed,2);
  assert.equal((await post({...data,remember:false})).status,200);
 }finally{await server.close();}
});

test('authenticated account A/B in the same browser cannot list, reuse, delete or generate with each other credentials',async()=>{
 // Trusted server resolver fixture, not a production Nexus authentication test.
 const records=new Map(),auth=new Map([['issued-session-a','account-a'],['issued-session-b','account-b']]);
 const vault={id:'ACCOUNT_FIXTURE',list:async o=>[...(records.get(o)?.values()??[])].map(({apiKey,...r})=>r),get:async(o,p)=>records.get(o)?.get(p),put:async(o,r)=>{if(!records.has(o))records.set(o,new Map());records.get(o).set(r.providerId,r);},remove:async(o,p)=>records.get(o)?.delete(p)};
 const resolver=req=>auth.get((req.headers.cookie??'').match(/(?:^|; )nexus_test=([^;]+)/u)?.[1])??null;
 const server=await startCloudSettingsServer({root:repo,vault,resolveAccount:resolver,createAdapter:()=>({complete:async()=>({response:answer}),dispose(){}})});
 const post=(route,data,cookie='')=>fetch(server.origin+'/api/akronikl/cloud/'+route,{method:'POST',headers:{origin:server.origin,'Content-Type':'application/json',cookie},body:JSON.stringify(data)});
 const saved=async cookie=>(await(await fetch(server.origin+'/api/akronikl/cloud/saved',{headers:{cookie}})).json()).connections;
 try{
  assert.equal((await post('connect',{providerId:'qwen',modelId:'m',apiKey:secret})).status,401);
  const a=await post('connect',{providerId:'qwen',modelId:'model-a',apiKey:secret,remember:true},'nexus_test=issued-session-a');assert.equal(a.status,200);const first=await a.json(),cookies=a.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),asA=cookies+'; nexus_test=issued-session-a',asB=cookies+'; nexus_test=issued-session-b';
  assert.equal((await saved(asA))[0].modelId,'model-a');assert.deepEqual(await saved(asB),[]);
  assert.equal((await post('connect',{providerId:'qwen',modelId:'m',useSaved:true},asB)).status,400);
  assert.equal((await post('generate',{...request,connectionVersion:first.connectionVersion},asB)).status,401);
  assert.equal((await post('forget',{providerId:'qwen'},asB)).status,200);assert.equal((await saved(asA)).length,1);
  assert.equal((await post('connect',{providerId:'qwen',modelId:'m',apiKey:secret,accountId:'account-a'},asB)).status,400);
  const b=await post('connect',{providerId:'qwen',modelId:'model-b',apiKey:secret+'B',remember:true},asB);assert.equal(b.status,200);assert.equal((await saved(asB))[0].modelId,'model-b');assert.equal((await saved(asA))[0].modelId,'model-a');
  server.revokeAccount('account-b');assert.equal(server.status().sessions,0);auth.delete('issued-session-b');assert.equal((await post('connect',{providerId:'qwen',modelId:'m',useSaved:true},asB)).status,401);
 }finally{await server.close();}
});

test('gateway without a verified account resolver or explicit personal preview fails closed',async()=>{
 const server=await startCloudSettingsServer({root:repo});try{assert.equal((await fetch(server.origin+'/api/akronikl/cloud/ready')).status,401);assert.equal((await fetch(server.origin+'/api/akronikl/cloud/saved')).status,401);}finally{await server.close();}
});
