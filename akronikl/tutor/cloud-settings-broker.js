import {checkSignal} from '../connections/probe.js';
import {cloudSelection} from '../connections/cloud-catalog.js';
const PREFIX='/api/akronikl/cloud';
const codes=new Set(['CLOUD_KEY_INVALID','CLOUD_AUTH_FAILED','CLOUD_ACCESS_DENIED','CLOUD_MODEL_NOT_FOUND','CLOUD_NOT_CONNECTED','CLOUD_RATE_LIMITED','CLOUD_REQUEST_REJECTED','CLOUD_REQUEST_CANCELLED','CLOUD_SERVICE_UNAVAILABLE','CLOUD_BUSY','CLOUD_RESPONSE_INVALID','CLOUD_TLS_FAILED','CLOUD_VAULT_UNAVAILABLE']);
async function readResponse(response,signal){
 if(response.redirected||!response.headers.get('content-type')?.startsWith('application/json'))throw Error('CLOUD_SERVICE_UNAVAILABLE');
 const reader=response.body?.getReader();if(!reader)throw Error('CLOUD_RESPONSE_INVALID');const parts=[];let count=0;
 try{for(;;){checkSignal(signal);const r=await reader.read();if(r.done)break;count+=r.value.length;if(count>65536)throw Error('CLOUD_RESPONSE_INVALID');parts.push(r.value);}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 checkSignal(signal);const bytes=new Uint8Array(count);let offset=0;for(const b of parts){bytes.set(b,offset);offset+=b.length;}let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Error('CLOUD_RESPONSE_INVALID');}
 if(!response.ok)throw Error(codes.has(data?.code)?data.code:'CLOUD_SERVICE_UNAVAILABLE');return data;
}
export function createCloudSettingsBroker({origin=globalThis.location?.origin,fetchResource=globalThis.fetch,windowRef=globalThis.window,onOutcome=null}={}){
 let url;try{url=new URL(origin);}catch{throw Error('CLOUD_CONFIG_INVALID');}
 if(url.origin!==origin||globalThis.location?.origin&&globalThis.location.origin!==origin||url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))||typeof fetchResource!=='function')throw Error('CLOUD_CONFIG_INVALID');
 const send=(suffix,body,{signal,keepalive=false}={})=>fetchResource(origin+PREFIX+suffix,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),signal,keepalive});
 const disconnect=version=>send('/disconnect',{connectionVersion:version}, {signal:AbortSignal.timeout(5000)}).then(r=>readResponse(r));
 return Object.freeze({settings:true,
  async listSaved(){const data=await readResponse(await send('/saved'));if(!Array.isArray(data.connections)||data.connections.length>8)throw Error('CLOUD_RESPONSE_INVALID');return data.connections.map(cloudSelection);},
  async forget(providerId){const selection=cloudSelection({providerId,modelId:'validation-only'});return readResponse(await send('/forget',{providerId:selection.providerId}));},
  async inspect({signal}={}){checkSignal(signal);try{const r=await readResponse(await send('/ready',undefined,{signal}),signal);return {code:r.available?'CLOUD_READY':'CLOUD_UNAVAILABLE',readyToLoad:r.available===true,generationTested:false};}catch{checkSignal(signal);return {code:'CLOUD_UNAVAILABLE',readyToLoad:false,generationTested:false};}},
  async connect({providerId,modelId,options={},apiKey='',remember=false,useSaved=false,signal}={}){
   const selection=cloudSelection({providerId,modelId,options});checkSignal(signal);if(typeof apiKey!=='string'||!apiKey.trim()&&!useSaved||apiKey.length>4096)throw Error('CLOUD_KEY_INVALID');
   let connected;try{connected=await readResponse(await send('/connect',{...selection,apiKey:apiKey.trim(),remember:remember===true,useSaved:useSaved===true},{signal}),signal);}finally{apiKey='';}
   if(typeof connected.connectionVersion!=='string'||!/^[A-Za-z0-9_-]{16,80}$/u.test(connected.connectionVersion)||connected.connected!==true||connected.verified!==true||connected.providerId!==selection.providerId||connected.modelId!==selection.modelId)throw Error('CLOUD_RESPONSE_INVALID');
   const version=connected.connectionVersion;
   let dead=false,busy=false,active=null,idle=Promise.resolve(),releaseIdle,last=null,closing=null;
   const pagehide=()=>{void send('/disconnect',{connectionVersion:version}, {keepalive:true}).catch(()=>{});};windowRef?.addEventListener?.('pagehide',pagehide,{once:true});
   return Object.freeze({kind:'cloud',transport:'trusted-broker',providerId:selection.providerId,modelId:selection.modelId,connectionVerified:true,remembered:connected.remembered===true,
    async generate({messages,allowedCitations,signal,onProgress}){
     checkSignal(signal);if(dead||busy)throw Error('CLOUD_BUSY');busy=true;last=null;active=new AbortController();idle=new Promise(r=>releaseIdle=r);const combined=signal?AbortSignal.any([signal,active.signal]):active.signal,start=performance.now();
     try{
      try{onProgress?.({phase:'prompt',elapsedMs:0,pieces:0});}catch{}
      const body={messages,allowedCitations,connectionVersion:version};if(JSON.stringify(body).length>16000)throw Error('CLOUD_REQUEST_REJECTED');const data=await readResponse(await send('/generate',body,{signal:combined}),combined),r=data.response;
      if(!r||Object.keys(r).sort().join(',')!=='answer,citations'||typeof r.answer!=='string'||!r.answer.trim()||r.answer.length>6000||!Array.isArray(r.citations)||!r.citations.length||r.citations.some(c=>!allowedCitations.includes(c))||new Set(r.citations).size!==r.citations.length)throw Error('CLOUD_RESPONSE_INVALID');
      const m=data.measurements??{},usage={};for(const k of ['prompt_tokens','completion_tokens','total_tokens'])if(Number.isSafeInteger(m.usage?.[k])&&m.usage[k]>=0)usage[k]=m.usage[k];
      last=Object.freeze({providerId:selection.providerId,model:selection.modelId,totalCallerMs:performance.now()-start,totalMs:Number.isFinite(m.totalMs)&&m.totalMs>=0?m.totalMs:null,usage:Object.freeze(usage),remoteComputeStoppedProven:false});
      const tagged=typeof data.rawFinal==='string'&&/<\/?think(?:ing)?>/iu.test(data.rawFinal);try{onOutcome?.({status:'complete',rawContent:!tagged&&typeof data.rawFinal==='string'?data.rawFinal:null,reasoningRedacted:tagged,measurements:last});}catch{}return r;
     }finally{busy=false;active=null;releaseIdle();}
    },measurements:()=>last,lifecycle:()=>({busy,disposed:dead,remoteComputeStoppedProven:false}),
    dispose(){if(closing)return closing;dead=true;active?.abort();windowRef?.removeEventListener?.('pagehide',pagehide);closing=(async()=>{await idle;await disconnect(version);})();return closing;}
   });
  }
 });
}
