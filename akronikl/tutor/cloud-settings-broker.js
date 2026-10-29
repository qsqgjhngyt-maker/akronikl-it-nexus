import {createPiperSpeaker} from '../experience/piper-speaker.js';import {PIPER_VOICE,PIPER_NARRATOR} from '../experience/piper-voice.js';
import {createLocalSpeaker,NARRATOR} from '../experience/local-speaker.js';
import {imageCapable} from '../experience/attachments.js';
import {checkSignal} from '../connections/probe.js';
import {cloudSelection} from '../connections/cloud-catalog.js';
const PREFIX='/api/akronikl/cloud';
const codes=new Set(['SPEECH_BUSY','SPEECH_UNAVAILABLE','SPEECH_CANCELLED','SPEECH_SYNTHESIS_FAILED','SPEECH_REQUEST_INVALID','SPEECH_AUDIO_INVALID','SPEECH_CLEANUP_FAILED','CLOUD_REQUEST_DENIED','CLOUD_GENERATION_DISABLED','CHAT_IMAGE_UNSUPPORTED','CHAT_ATTACHMENT_INVALID','CLOUD_SETTINGS_CONFLICT','CLOUD_SETTINGS_INVALID','CLOUD_ACCOUNT_REQUIRED','CLOUD_KEY_INVALID','CLOUD_AUTH_FAILED','CLOUD_ACCESS_DENIED','CLOUD_MODEL_NOT_FOUND','CLOUD_NOT_CONNECTED','CLOUD_RATE_LIMITED','CLOUD_BUDGET_EXHAUSTED','CLOUD_BUDGET_UNAVAILABLE','CLOUD_REQUEST_REJECTED','CLOUD_REQUEST_CANCELLED','CLOUD_SERVICE_UNAVAILABLE','CLOUD_BUSY','CLOUD_RESPONSE_INVALID','CLOUD_TLS_FAILED','CLOUD_VAULT_UNAVAILABLE']);
async function readResponse(response,signal,limit=65536){
 if(response.redirected||!response.headers.get('content-type')?.startsWith('application/json'))throw Error('CLOUD_SERVICE_UNAVAILABLE');
 const reader=response.body?.getReader();if(!reader)throw Error('CLOUD_RESPONSE_INVALID');const parts=[];let count=0;
 try{for(;;){checkSignal(signal);const r=await reader.read();if(r.done)break;count+=r.value.length;if(count>limit)throw Error('CLOUD_RESPONSE_INVALID');parts.push(r.value);}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 checkSignal(signal);const bytes=new Uint8Array(count);let offset=0;for(const b of parts){bytes.set(b,offset);offset+=b.length;}let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Error('CLOUD_RESPONSE_INVALID');}
 if(!response.ok)throw Error(codes.has(data?.code)?data.code:'CLOUD_SERVICE_UNAVAILABLE');return data;
}
export function createCloudSettingsBroker({origin=globalThis.location?.origin,fetchResource=globalThis.fetch,windowRef=globalThis.window,onOutcome=null,readIdentity=null}={}){
 let url;try{url=new URL(origin);}catch{throw Error('CLOUD_CONFIG_INVALID');}
 if(url.origin!==origin||globalThis.location?.origin&&globalThis.location.origin!==origin||url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))||typeof fetchResource!=='function')throw Error('CLOUD_CONFIG_INVALID');
 let localVoice=NARRATOR,localVoices=[NARRATOR];const identity=readIdentity?.();const current=()=>{if(readIdentity&&(!identity?.accountId||readIdentity()!==identity))throw Error('CLOUD_ACCOUNT_REQUIRED');};
 const send=(suffix,body,{signal,keepalive=false}={})=>{current();return fetchResource(origin+PREFIX+suffix,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{...(identity?.accountId?{'x-nexus-account-expectation':identity.accountId}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal,keepalive}).then(r=>{current();return r;});};
 const disconnect=version=>send('/disconnect',{connectionVersion:version}, {signal:AbortSignal.timeout(5000)}).then(r=>readResponse(r));
 const localDescriptor=v=>{if(!v||![NARRATOR.voiceURI,PIPER_VOICE.voiceURI,PIPER_NARRATOR.voiceURI].includes(v.voiceURI)||v.kind!==(v.voiceURI!==NARRATOR.voiceURI?'local-browser':'local-server')||v.localService!==true||v.lang!=='ru-RU')throw Error('CLOUD_RESPONSE_INVALID');return v.voiceURI===PIPER_VOICE.voiceURI?PIPER_VOICE:v.voiceURI===PIPER_NARRATOR.voiceURI?PIPER_NARRATOR:NARRATOR;};
 function makeLocalSpeaker(voice){if(voice.kind==='local-browser')return createPiperSpeaker({voice,windowRef,isCurrent:()=>{current();return true;}});return createLocalSpeaker({voice,windowRef,isCurrent:()=>{current();return true;},request:async(text,{signal})=>{if(typeof text!=='string'||!text.trim()||text.length>240)throw Error('SPEECH_REQUEST_INVALID');const r=await send('/speech',{text},{signal});if(!r.ok){await readResponse(r,signal);throw Error('SPEECH_UNAVAILABLE');}if(!r.headers.get('content-type')?.startsWith('audio/wav')||!r.body)throw Error('SPEECH_AUDIO_INVALID');const reader=r.body.getReader(),parts=[];let bytes=0;try{for(;;){checkSignal(signal);current();const p=await reader.read();if(p.done)break;bytes+=p.value.length;if(bytes>6000000)throw Error('SPEECH_AUDIO_INVALID');parts.push(p.value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}checkSignal(signal);current();return new Blob(parts,{type:'audio/wav'});}});}
 return Object.freeze({settings:true,accountBound:!!readIdentity,
  async capabilities(){const r=await readResponse(await send('/ready'));if(!r||typeof r!=='object'||typeof r.available!=='boolean'||r.stateAvailable!==undefined&&typeof r.stateAvailable!=='boolean'||r.generationEnabled!==undefined&&typeof r.generationEnabled!=='boolean')throw Error('CLOUD_RESPONSE_INVALID');const descriptors=r.localSpeechVoices??(r.localSpeechVoice?[r.localSpeechVoice]:[]);if(!Array.isArray(descriptors)||descriptors.length>3)throw Error('CLOUD_RESPONSE_INVALID');localVoices=descriptors.map(localDescriptor);if(new Set(localVoices.map(v=>v.voiceURI)).size!==localVoices.length)throw Error('CLOUD_RESPONSE_INVALID');const primary=r.localSpeechVoice?localDescriptor(r.localSpeechVoice):localVoices[0]??null;if(primary&&!localVoices.some(v=>v.voiceURI===primary.voiceURI))throw Error('CLOUD_RESPONSE_INVALID');localVoice=primary??NARRATOR;return Object.freeze({stateAvailable:r.stateAvailable??r.available,generationEnabled:r.generationEnabled??r.available,localSpeechVoice:primary,localSpeechVoices:Object.freeze([...localVoices])});},
  localSpeaker(){return makeLocalSpeaker(localVoice);},localSpeakers(){return localVoices.map(makeLocalSpeaker);},
  async loadState(key){current();if(!['preferences','chats'].includes(key))throw Error('CLOUD_REQUEST_INVALID');const data=await readResponse(await send('/'+key),undefined,3500000);current();return data;},
  async saveState(key,value,revision){current();if(!['preferences','chats'].includes(key))throw Error('CLOUD_REQUEST_INVALID');const data=await readResponse(await send('/'+key,{value,revision}),undefined,3500000);current();return data;},
  async listSaved(){const data=await readResponse(await send('/saved'));if(!Array.isArray(data.connections)||data.connections.length>8)throw Error('CLOUD_RESPONSE_INVALID');return data.connections.map(cloudSelection);},
  async forget(providerId){const selection=cloudSelection({providerId,modelId:'validation-only'});return readResponse(await send('/forget',{providerId:selection.providerId}));},
  async inspect({signal}={}){checkSignal(signal);try{const r=await readResponse(await send('/ready',undefined,{signal}),signal);return {code:r.available?'CLOUD_READY':'CLOUD_UNAVAILABLE',readyToLoad:r.available===true,generationTested:false};}catch(error){checkSignal(signal);return {code:error?.message==='CLOUD_ACCOUNT_REQUIRED'?'CLOUD_ACCOUNT_REQUIRED':'CLOUD_UNAVAILABLE',readyToLoad:false,generationTested:false};}},
  async connect({providerId,modelId,options={},apiKey='',remember=false,useSaved=false,signal}={}){
   const selection=cloudSelection({providerId,modelId,options});checkSignal(signal);if(typeof apiKey!=='string'||!apiKey.trim()&&!useSaved||apiKey.length>4096)throw Error('CLOUD_KEY_INVALID');
   let connected;try{connected=await readResponse(await send('/connect',{...selection,apiKey:apiKey.trim(),remember:remember===true,useSaved:useSaved===true},{signal}),signal);}finally{apiKey='';}
   if(typeof connected.connectionVersion!=='string'||!/^[A-Za-z0-9_-]{16,80}$/u.test(connected.connectionVersion)||connected.connected!==true||connected.verified!==true||connected.providerId!==selection.providerId||connected.modelId!==selection.modelId)throw Error('CLOUD_RESPONSE_INVALID');
   const version=connected.connectionVersion;
   let dead=false,busy=false,active=null,idle=Promise.resolve(),releaseIdle,last=null,closing=null;
   const pagehide=()=>{void send('/disconnect',{connectionVersion:version}, {keepalive:true}).catch(()=>{});};windowRef?.addEventListener?.('pagehide',pagehide,{once:true});
   const engine={kind:'cloud',transport:'trusted-broker',providerId:selection.providerId,modelId:selection.modelId,connectionVerified:true,remembered:connected.remembered===true,
    chat({signal,onProgress,...data}){return engine.generate({conversation:data,allowedCitations:['U1'],signal,onProgress});},
    async generate({messages,allowedCitations,signal,onProgress,conversation}){
     checkSignal(signal);if(dead||busy)throw Error('CLOUD_BUSY');busy=true;last=null;active=new AbortController();idle=new Promise(r=>releaseIdle=r);const combined=signal?AbortSignal.any([signal,active.signal]):active.signal,start=performance.now();
     try{
      try{onProgress?.({phase:'prompt',elapsedMs:0,pieces:0});}catch{}
      const body={...(conversation??{messages,allowedCitations}),connectionVersion:version};if(JSON.stringify(body).length>(conversation?3500000:16000))throw Error('CLOUD_REQUEST_REJECTED');const data=await readResponse(await send(conversation?'/chat':'/generate',body,{signal:combined}),combined),r=data.response;
      if(!r||Object.keys(r).sort().join(',')!=='answer,citations'||typeof r.answer!=='string'||!r.answer.trim()||r.answer.length>6000||!Array.isArray(r.citations)||!r.citations.length||r.citations.some(c=>!allowedCitations.includes(c))||new Set(r.citations).size!==r.citations.length)throw Error('CLOUD_RESPONSE_INVALID');
      const m=data.measurements??{},usage={};for(const k of ['prompt_tokens','completion_tokens','total_tokens'])if(Number.isSafeInteger(m.usage?.[k])&&m.usage[k]>=0)usage[k]=m.usage[k];
      last=Object.freeze({providerId:selection.providerId,model:selection.modelId,totalCallerMs:performance.now()-start,totalMs:Number.isFinite(m.totalMs)&&m.totalMs>=0?m.totalMs:null,usage:Object.freeze(usage),remoteComputeStoppedProven:false});
      const tagged=typeof data.rawFinal==='string'&&/<\/?think(?:ing)?>/iu.test(data.rawFinal);try{onOutcome?.({status:'complete',rawContent:!tagged&&typeof data.rawFinal==='string'?data.rawFinal:null,reasoningRedacted:tagged,measurements:last});}catch{}return r;
     }finally{busy=false;active=null;releaseIdle();}
    },measurements:()=>last,lifecycle:()=>({busy,disposed:dead,remoteComputeStoppedProven:false}),
    dispose(){if(closing)return closing;dead=true;active?.abort();windowRef?.removeEventListener?.('pagehide',pagehide);closing=(async()=>{await idle;await disconnect(version);})();return closing;}
   };return Object.freeze(engine);
  }
 });
}
