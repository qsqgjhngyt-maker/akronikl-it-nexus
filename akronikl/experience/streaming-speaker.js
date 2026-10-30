import {createLocalSpeaker,NARRATOR} from './local-speaker.js';
// One current utterance and one lookahead; completed audio stays in this account's bounded memory.
export function createStreamingLocalSpeaker({request,windowRef=globalThis.window,isCurrent=()=>true,voice=NARRATOR}={}){
 const Context=windowRef?.AudioContext??windowRef?.webkitAudioContext;
 if(typeof request!=='function'||typeof Context!=='function')throw Error('SPEECH_UNAVAILABLE');
 const cache=new Map(),pending=new Map(),jobs=new Set();let dead=false,cacheBytes=0,tail=Promise.resolve(),context=null;
 const valid=()=>{try{return !dead&&isCurrent()===true;}catch{return false;}};
 const stats={requests:0,packets:0,underruns:0,cacheHits:0};
 function remember(text,blob){if(!valid()||blob.size>6000000)return;while(cache.size>=8||cacheBytes+blob.size>8000000){const [key,old]=cache.entries().next().value??[];if(key===undefined)break;cache.delete(key);cacheBytes-=old.size;}cache.set(text,blob);cacheBytes+=blob.size;}
 function obtain(text){
  if(pending.has(text))return pending.get(text);
  const controller=new AbortController(),saved=cache.get(text),op={packets:[],listeners:new Set(),done:false,cancelled:false,promise:null,cancel(){this.cancelled=true;controller.abort();this.listeners.clear();this.packets=[];if(pending.get(text)===this)pending.delete(text);}};
  if(saved){cache.delete(text);cache.set(text,saved);stats.cacheHits++;op.done=true;op.promise=Promise.resolve(saved);return op;}
  op.promise=tail.catch(()=>{}).then(async()=>{
   if(op.cancelled)throw Error('SPEECH_CANCELLED');if(!valid())throw Error('SPEECH_LOCAL_PAIR_REQUIRED');stats.requests++;
   const blob=await request(text,{signal:controller.signal,onChunk(packet){if(op.cancelled)return;if(!valid()){dispose();throw Error('SPEECH_LOCAL_PAIR_REQUIRED');}stats.packets++;op.packets.push(packet);for(const listener of op.listeners)listener(packet);}});
   if(op.cancelled)throw Error('SPEECH_CANCELLED');if(!valid()){dispose();throw Error('SPEECH_LOCAL_PAIR_REQUIRED');}op.done=true;remember(text,blob);return blob;
  }).finally(()=>{if(pending.get(text)===op)pending.delete(text);});
  tail=op.promise.catch(()=>{});void op.promise.catch(()=>{});pending.set(text,op);return op;
 }
 const normal=createLocalSpeaker({voice,windowRef,isCurrent:valid,cacheEnabled:false,request:async(text,{signal})=>{const op=obtain(text),abort=()=>op.cancel();signal.addEventListener('abort',abort,{once:true});try{return await op.promise;}finally{signal.removeEventListener('abort',abort);}}});
 function dispose(){if(dead)return;dead=true;for(const op of pending.values())op.cancel();pending.clear();for(const job of [...jobs])job.cancel();cache.clear();cacheBytes=0;normal.dispose();void context?.close().catch(()=>{});context=null;}
 function speak(text,{onstart,onend,onerror}={}){
  const op=obtain(text),sources=new Set();let cancelled=false,finished=false,decoding=0,rate=1,fallback=null,started=false,packetCount=0,decodeTail=Promise.resolve(),until=0,startTimer=null;
  const active=()=>!cancelled&&!finished&&valid();
  function cleanup(){jobs.delete(job);op.listeners.delete(receive);clearTimeout(startTimer);}
  function fail(){if(cancelled||finished)return;job.cancel();if(!valid())dispose();onerror?.();}
  function finish(){if(active()&&op.done&&!sources.size&&!decoding&&packetCount){finished=true;cleanup();onend?.();}}
  function native(){if(!active()||fallback)return;op.listeners.delete(receive);fallback=normal.speak(text,{onstart,onend(){if(active()){finished=true;cleanup();onend?.();}else if(!valid())dispose();},onerror:fail});fallback.setRate(rate);}
  async function schedule(packet){
   if(!active())return;if(rate!==1){native();return;}
   const buffer=await context.decodeAudioData(packet.audio.slice(0));if(!active()){if(!valid())dispose();return;}
   const now=context.currentTime,source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
   const at=until?Math.max(until,now+.006):now+(op.packets.length>1?.04:.2);
   if(until&&now>until+.03)stats.underruns++;
   until=at+buffer.duration;packetCount++;sources.add(source);
   source.onended=()=>{sources.delete(source);source.disconnect();if(!active()){if(!valid())dispose();return;}finish();};source.start(at);
   if(!started){started=true;startTimer=setTimeout(()=>{if(active())onstart?.();else if(!valid())dispose();},Math.max(0,(at-context.currentTime)*1000));}
  }
  function receive(packet){if(!active())return;decoding++;decodeTail=decodeTail.then(()=>schedule(packet)).catch(fail).finally(()=>{decoding--;finish();});}
  const job=Object.freeze({cancel(){if(cancelled)return;cancelled=true;op.cancel();fallback?.cancel();for(const source of sources){source.onended=null;try{source.stop();source.disconnect();}catch{}}sources.clear();cleanup();},
   setRate(value){if(started&&value!==1){fail();return;}rate=value;fallback?.setRate(value);},pause(){if(fallback)fallback.pause();else void context?.suspend().catch(fail);},resume(){if(!active()){job.cancel();return;}if(fallback)fallback.resume();else void context?.resume().catch(fail);}});jobs.add(job);
  try{context??=new Context();const resumed=context.resume();
   void Promise.resolve(resumed).then(()=>{if(!active())return;if(op.done||rate!==1){native();return;}op.listeners.add(receive);for(const packet of op.packets)receive(packet);return op.promise.then(()=>decodeTail).then(()=>{if(!active())return;if(!packetCount)native();else finish();});}).catch(fail);
  }catch{queueMicrotask(fail);}
  return job;
 }
 return Object.freeze({voice,speak,prepare(text){const op=obtain(text);return Object.freeze({cancel:()=>op.cancel(),promise:op.promise});},dispose,status:()=>({...stats,pending:pending.size,cacheBytes,streaming:true})});
}
