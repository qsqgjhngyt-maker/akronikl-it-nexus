// A trusted host may offer this same-origin broker explicitly. No key, remote
// URL, fallback, storage or network request exists at module import time.
import {checkSignal} from '../connections/probe.js';
export const QWEN_CLOUD_MODEL='qwen3.7-plus';
export const QWEN_BROKER_PATH='/api/akronikl/qwen';
async function readJson(response,signal){
  if(!response.ok||response.redirected||!response.headers.get('content-type')?.startsWith('application/json'))throw Error('CLOUD_UNAVAILABLE');
  const reader=response.body?.getReader();if(!reader)throw Error('CLOUD_UNAVAILABLE');
  const parts=[];let length=0;
  try{for(;;){checkSignal(signal);const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>65536)throw Error('CLOUD_RESPONSE_INVALID');parts.push(value);}}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  checkSignal(signal);const bytes=new Uint8Array(length);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Error('CLOUD_RESPONSE_INVALID');}
}
export function createQwenBrokerConnection({fetchResource=globalThis.fetch,origin=globalThis.location?.origin,onOutcome=null}={}){
  let url;try{url=new URL(origin);}catch{throw Error('CLOUD_CONFIG_INVALID');}
  if(globalThis.location?.origin&&origin!==globalThis.location.origin||url.origin!==origin||url.username||url.password||!['http:','https:'].includes(url.protocol)||url.protocol==='http:'&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||typeof fetchResource!=='function'||onOutcome!==null&&typeof onOutcome!=='function')throw Error('CLOUD_CONFIG_INVALID');
  const endpoint=new URL(QWEN_BROKER_PATH,origin).href;
  const request=(suffix,options)=>fetchResource(endpoint+suffix,{credentials:'omit',redirect:'error',cache:'no-store',...options});
  async function inspect({signal}={}){
    checkSignal(signal);
    try{const data=await readJson(await request('/ready',{method:'GET',signal}),signal);return Object.freeze({code:data.model===QWEN_CLOUD_MODEL&&data.ready===true?'CLOUD_READY':'CLOUD_KEY_REQUIRED',readyToLoad:data.model===QWEN_CLOUD_MODEL&&data.ready===true,generationTested:false});}
    catch{checkSignal(signal);return Object.freeze({code:'CLOUD_UNAVAILABLE',readyToLoad:false,generationTested:false});}
  }
  return Object.freeze({inspect,async connect({signal}={}){
    const ready=await inspect({signal});if(!ready.readyToLoad)throw Error(ready.code);
    let dead=false,busy=false,active=null,last=null,idle=Promise.resolve(),releaseIdle;
    return Object.freeze({kind:'cloud',transport:'trusted-broker',modelId:QWEN_CLOUD_MODEL,
      async generate({messages,allowedCitations,signal,onProgress}){
        checkSignal(signal);if(dead||busy)throw Error('CLOUD_UNAVAILABLE');
        busy=true;idle=new Promise(r=>releaseIdle=r);active=new AbortController();const combined=signal?AbortSignal.any([signal,active.signal]):active.signal;
        const started=performance.now();last=null;
        try{
          // Only the existing bounded, consent-filtered session prompt crosses
          // the broker. Host objects, auth, full files and evidence metadata do not.
          const body=JSON.stringify({messages,allowedCitations});if(body.length>16000)throw Error('CLOUD_REQUEST_INVALID');
          try{onProgress?.(Object.freeze({phase:'prompt',elapsedMs:0,pieces:0}));}catch{}
          const data=await readJson(await request('',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:combined}),combined);
          const response=data.response;
          if(!response||typeof response.answer!=='string'||!response.answer.trim()||response.answer.length>6000||!Array.isArray(response.citations)||!response.citations.length||response.citations.some(c=>!allowedCitations.includes(c))||new Set(response.citations).size!==response.citations.length||Object.keys(response).sort().join(',')!=='answer,citations')throw Error('CLOUD_RESPONSE_INVALID');
          const reported=data.measurements??{},numeric=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null,usage={};
          for(const k of ['prompt_tokens','completion_tokens','total_tokens'])if(Number.isSafeInteger(reported.usage?.[k])&&reported.usage[k]>=0)usage[k]=reported.usage[k];
          last=Object.freeze({scope:'network-broker-reported-not-local-runtime',model:QWEN_CLOUD_MODEL,region:'ap-southeast-1',firstOutputChunkMs:numeric(reported.firstOutputChunkMs),totalMs:numeric(reported.totalMs),usage:Object.freeze(usage),requestId:typeof reported.requestId==='string'&&/^[\w-]{1,160}$/u.test(reported.requestId)?reported.requestId:null,remoteComputeStoppedProven:false,memoryScope:'not-measured-remote',totalCallerMs:performance.now()-started});
          const tagged=typeof data.rawFinal==='string'&&/<\/?think(?:ing)?>/iu.test(data.rawFinal);
          try{onOutcome?.(Object.freeze({status:'complete',rawContent:!tagged&&typeof data.rawFinal==='string'?data.rawFinal:null,reasoningRedacted:tagged,response,measurements:last}));}catch{}
          return response;
        }finally{busy=false;active=null;releaseIdle();}
      },measurements:()=>last,
      lifecycle:()=>Object.freeze({busy,disposed:dead,remoteComputeStoppedProven:false}),
      dispose(){dead=true;active?.abort();return idle;}
    });
  }});
}
