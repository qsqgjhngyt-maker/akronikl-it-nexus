// Loopback stand only: durable request cap; unknown usage retains its reservation.
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {boundedJson} from './cloud-adapters.mjs';
export async function createQwenTestBudget({file,fetchUpstream=globalThis.fetch,maxRequests=6,maxTokens=12000,maxOutputTokens=192,maxInputBytes=4096}={}){
 if(!path.isAbsolute(file)||typeof fetchUpstream!=='function'||![maxRequests,maxTokens,maxOutputTokens,maxInputBytes].every(Number.isSafeInteger)||maxRequests<1||maxRequests>12||maxTokens<256||maxTokens>20000||maxOutputTokens<96||maxOutputTokens>256||maxInputBytes<256||maxInputBytes>8192)throw Error('CLOUD_CONFIG_INVALID');
 const limits={maxRequests,maxTokens,maxOutputTokens,maxInputBytes};
 let state={version:1,limits,requests:0,chargedTokens:0,reportedTokens:0,reportedRequests:0},queue=Promise.resolve(),failed=false;
 try{const saved=JSON.parse(await readFile(file,'utf8'));if(saved.version!==1||JSON.stringify(saved.limits)!==JSON.stringify(limits)||!['requests','chargedTokens','reportedTokens','reportedRequests'].every(k=>Number.isSafeInteger(saved[k])&&saved[k]>=0))throw Error();state=saved;}catch(e){if(e.code!=='ENOENT')throw Error('CLOUD_BUDGET_UNAVAILABLE');}
 const serialized=fn=>{const p=queue.then(fn);queue=p.catch(()=>{});return p;};
 async function save(){const tmp=file+'.'+randomUUID()+'.tmp';try{await mkdir(path.dirname(file),{recursive:true});await writeFile(tmp,JSON.stringify(state)+'\n',{mode:0o600});await rename(tmp,file);}catch{failed=true;throw Error('CLOUD_BUDGET_UNAVAILABLE');}}
 function status(){return Object.freeze({...limits,requests:state.requests,requestsRemaining:Math.max(0,maxRequests-state.requests),chargedTokens:state.chargedTokens,providerReportedTokens:state.reportedTokens,reportedRequests:state.reportedRequests,unknownUsageRequests:state.requests-state.reportedRequests,tokenLimitScope:'conservative-local-reservation-not-provider-billing',exhausted:failed||state.requests>=maxRequests||state.chargedTokens>=maxTokens});}
 return Object.freeze({status,
  async fetch(url,init){
   if(String(url)!=='https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions'||init.method!=='POST')throw Error('CLOUD_REQUEST_DENIED');
   let body;try{body=JSON.parse(init.body);}catch{throw Error('CLOUD_REQUEST_REJECTED');}
   if(body.model!=='qwen3.8-flash'||body.enable_thinking!==false||body.preserve_thinking!==false||body.stream!==false||!Number.isSafeInteger(body.max_tokens)||body.max_tokens>maxOutputTokens||body.max_tokens<1||!Array.isArray(body.messages)||body.messages.length>24||body.messages.some(m=>typeof m.content!=='string'))throw Error('CLOUD_REQUEST_REJECTED');
   body.messages=body.messages.map((m,i)=>i===0?{...m,content:m.content+' Keep this test answer concise: one or two short sentences, no more than 40 words.'}:m);
   const bytes=Buffer.byteLength(JSON.stringify(body.messages),'utf8');if(bytes>maxInputBytes)throw Error('CLOUD_REQUEST_REJECTED');
   const reserved=bytes+64*(body.messages.length+1)+body.max_tokens;
   await serialized(async()=>{init.signal?.throwIfAborted();if(failed)throw Error('CLOUD_BUDGET_UNAVAILABLE');if(state.requests>=maxRequests||state.chargedTokens+reserved>maxTokens)throw Error('CLOUD_BUDGET_EXHAUSTED');state.requests++;state.chargedTokens+=reserved;await save();});
   // No automatic retry. A failed/aborted call keeps its reservation because
   // local cancellation cannot prove remote compute or billing has stopped.
   const response=await fetchUpstream(url,{...init,body:JSON.stringify(body)});
   let used=null;try{const data=await boundedJson(response.clone(),init.signal);const u=data.usage;if(Number.isSafeInteger(u?.total_tokens)&&u.total_tokens>=0)used=u.total_tokens;}catch{}
   if(used!==null)await serialized(async()=>{state.chargedTokens+=used-reserved;state.reportedTokens+=used;state.reportedRequests++;await save();});
   return response;
  }
 });
}
