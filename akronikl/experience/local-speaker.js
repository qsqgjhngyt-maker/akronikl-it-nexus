export const NARRATOR=Object.freeze({voiceURI:'uyut7:narrator',name:'Прежний рассказчик «Уют-7» · локальный Qwen',lang:'ru-RU',localService:true,kind:'local-server'});
export function createLocalSpeaker({request,windowRef=globalThis.window,isCurrent=()=>true,voice=NARRATOR,cacheEnabled=true}={}){
 if(typeof request!=='function'||typeof windowRef?.Audio!=='function')throw Error('SPEECH_UNAVAILABLE');
 const cache=new Map(),jobs=new Set(),pending=new Map();let disposed=false,cacheBytes=0;
 const valid=()=>{try{return !disposed&&isCurrent()===true;}catch{return false;}};
 function dispose(){disposed=true;for(const job of [...jobs])job.cancel();cache.clear();cacheBytes=0;}
 function prepare(text){
  const existing=pending.get(text);if(existing)return existing;
  const controller=new AbortController();let cancelled=false;
  const job={cancel(){cancelled=true;controller.abort();jobs.delete(job);if(pending.get(text)===job)pending.delete(text);},promise:null};jobs.add(job);
  job.promise=(async()=>{
   await Promise.resolve();
   if(cancelled)throw Error('SPEECH_CANCELLED');
   if(!valid()){dispose();throw Error('SPEECH_CONTEXT_CHANGED');}
   let blob=cache.get(text);
   if(blob){cache.delete(text);cache.set(text,blob);return blob;}
   blob=await request(text,{signal:controller.signal});
   if(cancelled)throw Error('SPEECH_CANCELLED');
   if(!valid()){dispose();throw Error('SPEECH_CONTEXT_CHANGED');}
   if(cacheEnabled&&blob.size<=6000000){while(cache.size>=8||cacheBytes+blob.size>8000000){const [key,value]=cache.entries().next().value??[];if(key===undefined)break;cache.delete(key);cacheBytes-=value.size;}cache.set(text,blob);cacheBytes+=blob.size;}return blob;
  })().finally(()=>{jobs.delete(job);if(pending.get(text)===job)pending.delete(text);});
  // Preparations may be cancelled without ever being consumed by playback.
  void job.promise.catch(()=>{});Object.freeze(job);pending.set(text,job);return job;
 }
 return Object.freeze({voice,dispose,prepare,speak(text,{onstart,onend,onerror}={}){
  const preparation=prepare(text);let audio=null,url=null,dead=false,rate=1;
  const cleanup=()=>{jobs.delete(job);if(url){windowRef.URL.revokeObjectURL(url);url=null;}};
  const job=Object.freeze({cancel(){dead=true;preparation.cancel();if(audio){audio.pause();audio.removeAttribute('src');audio.load();}cleanup();},pause(){audio?.pause();},resume(){if(audio&&valid()&&!dead)void audio.play().catch(()=>{if(!dead)onerror?.();});},setRate(value){rate=value;if(audio)audio.playbackRate=value;}});jobs.add(job);
  void(async()=>{try{
   const blob=await preparation.promise;
   if(dead)return;if(!valid()){dispose();return;}url=windowRef.URL.createObjectURL(blob);audio=new windowRef.Audio(url);audio.preload='auto';audio.playbackRate=rate;audio.onplaying=()=>{if(!dead){if(!valid()){dispose();return;}onstart?.();}};audio.onended=()=>{if(!dead){cleanup();if(valid())onend?.();else dispose();}};audio.onerror=()=>{if(!dead){cleanup();onerror?.();}};await audio.play();
  }catch{if(!dead){cleanup();if(!valid())dispose();onerror?.();}}})();
  return job;
 }});
}
