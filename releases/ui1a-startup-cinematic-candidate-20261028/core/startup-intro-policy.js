// Настройка устройства, не часть аккаунта, прогресса или Cloud Sync.
export const INTRO_KEY='akronikl:it-nexus:startup-intro:v1';
export const INTRO_VERSION='cinematic-v1';
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
export function staticIntro({simplified,reducedMotion,online,connection,deviceMemory,hardwareConcurrency}){
 return simplified||reducedMotion||online===false||connection?.saveData===true||/^(slow-)?2g$/.test(connection?.effectiveType||'')||connection?.effectiveType==='3g'||(deviceMemory>0&&deviceMemory<=2)||(hardwareConcurrency>0&&hardwareConcurrency<=2);
}
