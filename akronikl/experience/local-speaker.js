export const NARRATOR=Object.freeze({voiceURI:'uyut7:narrator',name:'Рассказчик «Уют-7» · Kitsune локально',lang:'ru-RU',localService:true,kind:'local-server'});
export function createLocalSpeaker({request,windowRef=globalThis.window}={}){
 if(typeof request!=='function'||typeof windowRef?.Audio!=='function')throw Error('SPEECH_UNAVAILABLE');
 return Object.freeze({voice:NARRATOR,speak(text,{onstart,onend,onerror}={}){
  const controller=new AbortController();let audio=null,url=null,dead=false,rate=1;
  const cleanup=()=>{if(url){windowRef.URL.revokeObjectURL(url);url=null;}};
  void(async()=>{try{const blob=await request(text,{signal:controller.signal});if(dead)return;url=windowRef.URL.createObjectURL(blob);audio=new windowRef.Audio(url);audio.preload='auto';audio.playbackRate=rate;audio.onplaying=()=>{if(!dead)onstart?.();};audio.onended=()=>{if(!dead){cleanup();onend?.();}};audio.onerror=()=>{if(!dead){cleanup();onerror?.();}};await audio.play();}catch{if(!dead){cleanup();onerror?.();}}})();
  return Object.freeze({cancel(){dead=true;controller.abort();if(audio){audio.pause();audio.removeAttribute('src');audio.load();}cleanup();},pause(){audio?.pause();},resume(){if(audio)void audio.play().catch(()=>onerror?.());},setRate(value){rate=value;if(audio)audio.playbackRate=value;}});
 }});
}
