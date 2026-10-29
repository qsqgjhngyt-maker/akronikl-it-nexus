export const NARRATOR=Object.freeze({voiceURI:'uyut7:narrator',name:'Прежний рассказчик «Уют-7» · локальный Qwen',lang:'ru-RU',localService:true,kind:'local-server'});
export function createLocalSpeaker({request,windowRef=globalThis.window,isCurrent=()=>true,voice=NARRATOR}={}){
 if(typeof request!=='function'||typeof windowRef?.Audio!=='function')throw Error('SPEECH_UNAVAILABLE');
 const cache=new Map(),jobs=new Set();let disposed=false,cacheBytes=0;
 const valid=()=>{try{return !disposed&&isCurrent()===true;}catch{return false;}};
 function dispose(){disposed=true;cache.clear();cacheBytes=0;for(const job of [...jobs])job.cancel();}
 return Object.freeze({voice,dispose,speak(text,{onstart,onend,onerror}={}){
  const controller=new AbortController();let audio=null,url=null,dead=false,rate=1;
  const cleanup=()=>{jobs.delete(job);if(url){windowRef.URL.revokeObjectURL(url);url=null;}};
  const job=Object.freeze({cancel(){dead=true;controller.abort();if(audio){audio.pause();audio.removeAttribute('src');audio.load();}cleanup();},pause(){audio?.pause();},resume(){if(audio&&valid()&&!dead)void audio.play().catch(()=>{if(!dead)onerror?.();});},setRate(value){rate=value;if(audio)audio.playbackRate=value;}});jobs.add(job);
  void(async()=>{try{
   if(!valid())throw Error('SPEECH_CONTEXT_CHANGED');let blob=cache.get(text);
   if(blob){cache.delete(text);cache.set(text,blob);}else{blob=await request(text,{signal:controller.signal});if(dead)return;if(!valid()){dispose();return;}if(blob.size<=6000000){while(cache.size>=8||cacheBytes+blob.size>8000000){const [key,value]=cache.entries().next().value??[];if(key===undefined)break;cache.delete(key);cacheBytes-=value.size;}cache.set(text,blob);cacheBytes+=blob.size;}}
   if(dead)return;if(!valid()){dispose();return;}url=windowRef.URL.createObjectURL(blob);audio=new windowRef.Audio(url);audio.preload='auto';audio.playbackRate=rate;audio.onplaying=()=>{if(!dead){if(!valid()){dispose();return;}onstart?.();}};audio.onended=()=>{if(!dead){cleanup();if(valid())onend?.();else dispose();}};audio.onerror=()=>{if(!dead){cleanup();onerror?.();}};await audio.play();
  }catch{if(!dead){cleanup();if(!valid())dispose();onerror?.();}}})();
  return job;
 }});
}
