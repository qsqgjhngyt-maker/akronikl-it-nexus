// Настройка устройства, не часть аккаунта, прогресса или Cloud Sync.
export const INTRO_KEY='akronikl:it-nexus:startup-intro:v1';
export const INTRO_VERSION='cinematic-v2';
export const INTRO_MEDIA=Object.freeze({desktop:{version:'cinematic-v3',mp4Codec:'avc1.4D4028',seconds:10},mobile:{version:'cinematic-v3',mp4Codec:'avc1.4D4028',seconds:8}});
export const INTRO_HANDOFF_KEY='akronikl:it-nexus:startup-intro:auth-handoff:v1';
const defaults=()=>({schema:1,enabled:true,simplified:false,seen:''});
export function readIntroPreference(storage){
 try{
  const raw=storage.getItem(INTRO_KEY);
  if(raw===null)return{value:defaults(),writable:true};
  if(raw.length>1024)throw Error('INTRO_PREF_INVALID');
  const v=JSON.parse(raw);
  if(!v||Array.isArray(v)||v.schema!==1||typeof v.enabled!=='boolean'||typeof v.simplified!=='boolean'||typeof v.seen!=='string'||v.seen.length>80)throw Error('INTRO_PREF_INVALID');
  return{value:{schema:1,enabled:v.enabled,simplified:v.simplified,seen:v.seen},writable:true};
 }catch{return{value:{schema:1,enabled:false,simplified:true,seen:INTRO_VERSION},writable:false}}
}
export function saveIntroPreference(storage,value){
 try{storage.setItem(INTRO_KEY,JSON.stringify(value));return true}catch{return false}
}
export function introVariant(width,height){return height>width&&width<=1200?'mobile':'desktop'}
// Прямая ссылка на рабочее место должна сразу открывать редактор.
// Это только политика заставки; права и настройки пользователя не меняются.
export function isStudioEntry(hash=''){
 const view=new URLSearchParams(String(hash).replace(/^#/, '')).get('view');
 return view==='project-studio'||view==='code-studio';
}
// Обновление продолжает текущую работу. Источник — браузерный Navigation Timing,
// без чтения Account, credentials или изменения настройки показа.
export function skipAutomaticIntro({hash='',navigationType=''}={}){
 return navigationType==='reload'||isStudioEntry(hash);
}
export function staticIntro({simplified,reducedMotion,online,connection,deviceMemory,hardwareConcurrency}){
 // Число ядер и оценка 3G не доказывают неспособность декодировать ролик.
 return simplified||reducedMotion||online===false||connection?.saveData===true;
}
// Только UX-подсказка внутри вкладки; она не подтверждает Account или сессию.
export function readIntroHandoff(storage,now=Date.now()){
 try{const raw=storage.getItem(INTRO_HANDOFF_KEY);if(!raw||raw.length>256)return false;const v=JSON.parse(raw);return v?.schema===1&&v.kind==='auth-navigation'&&Number.isSafeInteger(v.at)&&v.at<=now&&now-v.at<900000}catch{return false}
}
export function saveIntroHandoff(storage,now=Date.now()){
 try{storage.setItem(INTRO_HANDOFF_KEY,JSON.stringify({schema:1,kind:'auth-navigation',at:now}));return true}catch{return false}
}
export function consumeIntroHandoff(storage,now=Date.now()){
 const valid=readIntroHandoff(storage,now);try{storage.removeItem(INTRO_HANDOFF_KEY)}catch{}return valid;
}
