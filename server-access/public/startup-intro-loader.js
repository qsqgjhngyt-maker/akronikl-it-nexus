// Публичный UI: нет credentials, cookie, auth решений или ожидания видео.
import {prepareIntroCover,releaseIntroCover} from '../../core/startup-intro-cover.js';
export function startPublicIntro(){
 prepareIntroCover();
 requestAnimationFrame(()=>setTimeout(()=>{
  void fetch('/startup-intro.json',{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(4000)})
   .then(async response=>{
    if(!response.ok||!response.headers.get('content-type')?.startsWith('application/json'))throw Error('Intro descriptor недоступен');
    const text=await response.text();if(text.length>1024)throw Error('Intro descriptor слишком велик');const value=JSON.parse(text);
    if(value?.schema!==1||!/^\/releases\/ui1a-[a-z0-9-]+\/core\/startup-intro\.js$/.test(value.module))throw Error('Intro descriptor не разрешён');
    const module=await import(value.module);return module.installStartupIntro({surface:'entry'});
   }).catch(()=>releaseIntroCover(true));
 },0));
}
