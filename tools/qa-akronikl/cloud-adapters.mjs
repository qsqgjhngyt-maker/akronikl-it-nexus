// Server-only provider adapters. All destinations are fixed here; no browser URL.
import {randomUUID} from 'node:crypto';
import {cloudSelection} from '../../akronikl/connections/cloud-catalog.js';
import {conversationRequest,providerConversationMessages} from './conversation-request.mjs';
import {validateCloudRequest} from './qwen-upstream.mjs';
const origins=Object.freeze({openai:'https://api.openai.com/v1/responses',anthropic:'https://api.anthropic.com/v1/messages',kimi:'https://api.moonshot.ai/v1/chat/completions',deepseek:'https://api.deepseek.com/chat/completions',gigachat:'https://api.giga.chat/v1/chat/completions',gemini:'https://generativelanguage.googleapis.com/v1beta/models/',openrouter:'https://openrouter.ai/api/v1/chat/completions'});
export function validApiKey(key){return typeof key==='string'&&/^[A-Za-z0-9._~+\/=-]{16,4096}$/u.test(key);}
export function qwenEndpoint(options){
 const region={singapore:'ap-southeast-1',beijing:'cn-beijing',virginia:'us-east-1'}[options.region];
 const host=options.workspaceId?`${options.workspaceId}.${region}.maas.aliyuncs.com`:{singapore:'dashscope-intl.aliyuncs.com',beijing:'dashscope.aliyuncs.com',virginia:'dashscope-us.aliyuncs.com'}[options.region];
 return `https://${host}/compatible-mode/v1/chat/completions`;
}
const responseSchema=labels=>({type:'object',properties:{answer:{type:'string'},citations:{type:'array',items:{type:'string',enum:labels},minItems:1,maxItems:labels.length}},required:['answer','citations'],additionalProperties:false});
function usageOf(body,id){const u=body.usage??body.usageMetadata??{};return {prompt_tokens:u.prompt_tokens??u.input_tokens??u.promptTokenCount??null,completion_tokens:u.completion_tokens??u.output_tokens??u.candidatesTokenCount??null,total_tokens:u.total_tokens??u.totalTokenCount??(Number.isSafeInteger(u.input_tokens)&&Number.isSafeInteger(u.output_tokens)?u.input_tokens+u.output_tokens:null)};}
export async function boundedJson(response,signal){
 const reader=response.body?.getReader();if(!reader)throw Error('CLOUD_RESPONSE_INVALID');const parts=[];let bytes=0;
 try{for(;;){signal?.throwIfAborted();const r=await reader.read();if(r.done)break;bytes+=r.value.length;if(bytes>262144)throw Error('CLOUD_RESPONSE_INVALID');parts.push(r.value);}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Error('CLOUD_RESPONSE_INVALID');}
}
function httpError(status){const e=Error(status===401?'CLOUD_AUTH_FAILED':status===403?'CLOUD_ACCESS_DENIED':status===404?'CLOUD_MODEL_NOT_FOUND':status===429?'CLOUD_RATE_LIMITED':status===400||status===422?'CLOUD_REQUEST_REJECTED':'CLOUD_SERVICE_UNAVAILABLE');e.httpStatus=status;return e;}
function parseFinal(raw,labels){
 if(typeof raw!=='string'||!raw||raw.length>10000||/<\/?think(?:ing)?>/iu.test(raw))throw Error('CLOUD_RESPONSE_INVALID');let r;try{r=JSON.parse(raw);}catch{throw Error('CLOUD_RESPONSE_INVALID');}
 if(!r||Object.keys(r).sort().join(',')!=='answer,citations'||typeof r.answer!=='string'||!r.answer.trim()||r.answer.length>6000||!Array.isArray(r.citations)||!r.citations.length||r.citations.some(c=>!labels.includes(c))||new Set(r.citations).size!==r.citations.length)throw Error('CLOUD_RESPONSE_INVALID');return r;
}
export function createCloudAdapter({selection,apiKey,fetchUpstream=globalThis.fetch,onOutcome=null,timeoutMs=45000,now=()=>Date.now(),qwenMaxOutputTokens=1024}={}){
 const config=cloudSelection(selection);if(!validApiKey(apiKey)||typeof fetchUpstream!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<20||timeoutMs>45000)throw Error('CLOUD_KEY_INVALID');
 if(!Number.isSafeInteger(qwenMaxOutputTokens)||qwenMaxOutputTokens<96||qwenMaxOutputTokens>2048)throw Error('CLOUD_CONFIG_INVALID');
 let key=apiKey,access=null,expires=0,disposed=false,busy=false,current=null;
 async function send(url,init,signal){const r=await fetchUpstream(url,{...init,signal,redirect:'error',cache:'no-store'});if(!r.ok||r.redirected){await r.body?.cancel().catch(()=>{});throw httpError(r.status);}return r;}
 async function gigaToken(signal){
  if(access&&now()<expires-60000)return access;
  const r=await send('https://ngw.devices.sberbank.ru:9443/api/v2/oauth',{method:'POST',headers:{Authorization:'Basic '+key,RqUID:randomUUID(),'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({scope:config.options.scope}).toString()},signal);
  const data=await boundedJson(r,signal);if(typeof data.access_token!=='string'||!validApiKey(data.access_token)||!Number.isFinite(data.expires_at))throw Error('CLOUD_AUTH_FAILED');access=data.access_token;expires=data.expires_at>1e12?data.expires_at:data.expires_at*1000;return access;
 }
 const adapter={providerId:config.providerId,modelId:config.modelId,
 chat(data,options={}){return adapter.complete(data,{...options,conversation:true});},
 async complete(data,{signal,conversation=false}={}){
  if(conversation)data=conversationRequest(data,config);else validateCloudRequest(data);if(disposed||busy)throw Error('CLOUD_BUSY');signal?.throwIfAborted();busy=true;current=new AbortController();const combined=signal?AbortSignal.any([signal,current.signal]):current.signal,timer=setTimeout(()=>current?.abort(),timeoutMs),started=performance.now();
  let rawFinal='',status='error',httpStatus=null,reasoningRedacted=false,usage=null,providerReportedModel=null;
  try{
   const {providerId:id,modelId:model}=config,schema=responseSchema(data.allowedCitations),messages=conversation?providerConversationMessages(data.messages,id):data.messages;
   let url=origins[id],headers={'Content-Type':'application/json',Authorization:'Bearer '+key},body;
   if(id==='qwen'){url=qwenEndpoint(config.options);body={model,messages,stream:false,enable_thinking:false,preserve_thinking:false,max_tokens:qwenMaxOutputTokens,temperature:.2,response_format:{type:'json_schema',json_schema:{name:'akronikl_answer',strict:true,schema}}};}
   else if(id==='openai'){body={model,instructions:messages[0].content,input:messages.slice(1),store:false,max_output_tokens:1024,text:{format:{type:'json_schema',name:'akronikl_answer',strict:true,schema:{...schema,properties:{...schema.properties,citations:{type:'array',items:{type:'string',enum:data.allowedCitations}}}}}}};}
   else if(id==='anthropic'){headers['anthropic-version']='2026-10-21';if(config.options.workspaceId)headers['anthropic-workspace-id']=config.options.workspaceId;body={model,system:messages[0].content,messages:messages.slice(1),max_tokens:1024,output_config:{format:{type:'json_schema',schema:{...schema,properties:{...schema.properties,citations:{type:'array',items:{type:'string',enum:data.allowedCitations}}}}}}};}
   else if(id==='gemini'){url+=encodeURIComponent(model.replace(/^models\//u,''))+':generateContent';headers={'Content-Type':'application/json','x-goog-api-key':key};body={systemInstruction:{parts:[{text:messages[0].content}]},contents:messages.slice(1).map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content},...(m.images??[]).map(a=>({inlineData:{mimeType:a.mime,data:a.data}}))]})),generationConfig:{maxOutputTokens:2048,responseMimeType:'application/json',responseJsonSchema:schema}};}
   else{
    body={model,messages,stream:false};
    if(id==='kimi'){body.max_completion_tokens=2048;if(/^kimi-k3/u.test(model))body.reasoning_effort='low';else body.thinking={type:'disabled'};}
    else if(id==='deepseek'){body.max_tokens=1024;body.thinking={type:'disabled'};body.response_format={type:'json_object'};}
    else if(id==='openrouter'){body.max_tokens=1024;body.provider={allow_fallbacks:false};}
    else if(id==='gigachat'){headers.Authorization='Bearer '+await gigaToken(combined);body.max_tokens=1024;}
   }
   const r=await send(url,{method:'POST',headers,body:JSON.stringify(body)},combined);httpStatus=r.status;const result=await boundedJson(r,combined);combined.throwIfAborted();usage=usageOf(result,id);providerReportedModel=typeof result.model==='string'?result.model.slice(0,160):null;
   if(id==='openai'){
    if(result.status!=='completed'||result.output?.some(p=>!['message','reasoning'].includes(p.type)))throw Error('CLOUD_RESPONSE_INVALID');reasoningRedacted=result.output?.some(p=>p.type==='reasoning')??false;
    rawFinal=(result.output??[]).filter(p=>p.type==='message').flatMap(p=>p.content??[]).filter(p=>p.type==='output_text').map(p=>p.text).join('');
   }else if(id==='anthropic'){
    if(result.stop_reason!=='end_turn'||result.content?.some(p=>!['text','thinking','redacted_thinking'].includes(p.type)))throw Error('CLOUD_RESPONSE_INVALID');reasoningRedacted=result.content?.some(p=>p.type!=='text')??false;rawFinal=(result.content??[]).filter(p=>p.type==='text').map(p=>p.text).join('');
   }else if(id==='gemini'){
    const candidate=result.candidates?.[0];if(candidate?.finishReason!=='STOP'||candidate.content?.parts?.some(p=>p.functionCall||p.executableCode))throw Error('CLOUD_RESPONSE_INVALID');reasoningRedacted=candidate.content?.parts?.some(p=>p.thought===true)??false;rawFinal=(candidate.content?.parts??[]).filter(p=>p.thought!==true).map(p=>p.text??'').join('');
   }else{
    const c=result.choices?.[0];if(c?.finish_reason!=='stop'||c.message?.tool_calls?.length||c.message?.function_call)throw Error('CLOUD_RESPONSE_INVALID');reasoningRedacted=!!c.message?.reasoning_content;rawFinal=c.message?.content??'';
   }
   if(rawFinal.includes(key)||access&&rawFinal.includes(access))throw Error('CLOUD_RESPONSE_INVALID');
   const response=parseFinal(rawFinal,data.allowedCitations);status='complete';return {response,rawFinal,measurements:{providerId:id,model,totalMs:performance.now()-started,usage,firstOutputChunkMs:null,remoteComputeStoppedProven:false,memoryScope:'not-measured-remote'}};
  }catch(e){
   httpStatus=e?.httpStatus??httpStatus;
   if(combined.aborted){status='cancelled';throw Error('CLOUD_REQUEST_CANCELLED');}
   if(/^CLOUD_[A-Z_]+$/u.test(e?.message))throw e;
   if(['DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','SELF_SIGNED_CERT_IN_CHAIN'].includes(e?.cause?.code))throw Error('CLOUD_TLS_FAILED');throw Error('CLOUD_SERVICE_UNAVAILABLE');
  }finally{
   clearTimeout(timer);current=null;busy=false;const tagged=/<\/?think(?:ing)?>/iu.test(rawFinal),safeRaw=rawFinal&&!rawFinal.includes(key)&&(!access||!rawFinal.includes(access))&&!tagged?rawFinal:null;
   try{onOutcome?.({providerId:config.providerId,modelId:config.modelId,providerReportedModel,status,rawContent:safeRaw,httpStatus,reasoningRedacted:reasoningRedacted||tagged,usage,totalMs:performance.now()-started});}catch{}
  }
 },dispose(){disposed=true;current?.abort();key='';access=null;expires=0;}
 };return Object.freeze(adapter);
}
