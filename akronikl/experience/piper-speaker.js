import {createLocalSpeaker} from './local-speaker.js';import {PIPER_VOICE} from './piper-voice.js';
export function createPiperSpeaker({windowRef=globalThis.window,isCurrent=()=>true,voice=PIPER_VOICE,createWorker=()=>{const url=new URL('./piper-worker.js',import.meta.url);url.searchParams.set('voice',voice.modelId==='ru_RU-uyut7-pilot3-medium'?'uyut7-pilot3':'irina');return new windowRef.Worker(url,{type:'module'});},timeoutMs=120000}={}){
 if(!['ru_RU-irina-medium','ru_RU-uyut7-pilot3-medium'].includes(voice.modelId))throw Error('SPEECH_UNAVAILABLE');
 let worker=null,ready=null,rejectReady=null,pending=null,closed=false,loadTimer=null,sequence=0;
 const counts={processStarts:0,requests:0,generated:0,cancelled:0,externalModelCalls:0,downloads:0};let timings=null,lastSynthesisMs=null;
 const hash=async text=>[...new Uint8Array(await windowRef.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
 function stop(code='SPEECH_CANCELLED'){clearTimeout(loadTimer);worker?.terminate();worker=null;ready=null;timings=null;rejectReady?.(Error(code));rejectReady=null;pending?.reject(Error(code));pending=null;}
 function current(){let valid=false;try{valid=!closed&&isCurrent()===true;}catch{}if(!valid){closed=true;stop('SPEECH_UNAVAILABLE');}return valid;}
 function start(){if(closed)throw Error('SPEECH_UNAVAILABLE');if(ready)return ready;
  ready=new Promise((resolve,reject)=>{rejectReady=reject;const current=worker=createWorker();counts.processStarts++;loadTimer=setTimeout(()=>stop('SPEECH_UNAVAILABLE'),timeoutMs);
   current.onerror=()=>{if(worker===current)stop('SPEECH_UNAVAILABLE');};
   current.onmessage=({data})=>{if(worker!==current)return;if(Object.hasOwn(data??{},'ready')){clearTimeout(loadTimer);if(data.ready===true&&data.localOnly===true&&data.model===voice.modelId){timings=data.timings;rejectReady=null;resolve();}else stop('SPEECH_UNAVAILABLE');return;}
    if(!pending||data?.id!==pending.id)return;const p=pending;pending=null;if(data.code){p.reject(Error('SPEECH_SYNTHESIS_FAILED'));return;}
    const audio=data.audio;if(data.textSha256!==p.hash||!(audio instanceof ArrayBuffer)||audio.byteLength<44||audio.byteLength>6000000||new TextDecoder().decode(new Uint8Array(audio,0,4))!=='RIFF'||new TextDecoder().decode(new Uint8Array(audio,8,4))!=='WAVE'){p.reject(Error('SPEECH_AUDIO_INVALID'));return;}
    counts.generated++;lastSynthesisMs=data.synthesisMs;p.resolve(new Blob([audio],{type:'audio/wav'}));
   };
  });void ready.catch(()=>{});return ready;
 }
 let busy=false;
 async function request(text,{signal}={}){
  if(!current())throw Error('SPEECH_UNAVAILABLE');signal?.throwIfAborted();if(busy)throw Error('SPEECH_BUSY');busy=true;counts.requests++;
  let timer,abort;const cancelled=new Promise((_,reject)=>{abort=()=>{counts.cancelled++;stop();reject(Error('SPEECH_CANCELLED'));};signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(abort,timeoutMs);});
  try{const result=await Promise.race([(async()=>{await start();signal?.throwIfAborted();if(!current())throw Error('SPEECH_UNAVAILABLE');const textSha256=await hash(text);signal?.throwIfAborted();if(!current())throw Error('SPEECH_UNAVAILABLE');return new Promise((resolve,reject)=>{const id=String(++sequence);pending={id,hash:textSha256,resolve,reject};worker.postMessage({id,text,textSha256});});})(),cancelled]);if(!current())throw Error('SPEECH_UNAVAILABLE');return result;}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);busy=false;}
 }
 const speaker=createLocalSpeaker({request,windowRef,isCurrent,voice});void start().catch(()=>{});
 return Object.freeze({...speaker,status:()=>({...counts,ready:!!worker&&!!timings,busy,timings,lastSynthesisMs}),dispose(){if(closed)return;closed=true;speaker.dispose();stop();}});
}
