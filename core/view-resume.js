import {accountSessionStorage} from './account-storage.js';

const VIEW_RESUME_KEY='akronikl:it-nexus:view-resume:v1';

const safeParse=(raw,fallback={})=>{try{return raw?JSON.parse(raw):fallback}catch{return fallback}};
const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const routeKey=value=>String(value||'#view=home');

export function createViewResume({
  storage=accountSessionStorage(),
  getPosition=()=>({x:globalThis.scrollX||0,y:globalThis.scrollY||0}),
  applyPosition=pos=>globalThis.scrollTo?.({left:pos.x,top:pos.y,behavior:'auto'}),
  scheduleFrame=fn=>globalThis.requestAnimationFrame?globalThis.requestAnimationFrame(fn):setTimeout(fn,0),
  addListener=(...args)=>globalThis.addEventListener?.(...args),
  removeListener=(...args)=>globalThis.removeEventListener?.(...args),
  historyObject=globalThis.history,
  maxEntries=60,
  debounceMs=160
}={}){
  let currentKey=null;
  let timer=null;
  let installed=false;
  let ready=true,revision=0;

  const loadMap=()=>{try{return safeParse(storage?.getItem?.(VIEW_RESUME_KEY),{})||{}}catch{return{}}};
  const saveMap=map=>{try{storage?.setItem?.(VIEW_RESUME_KEY,JSON.stringify(map))}catch{}};
  const read=key=>{const item=loadMap()[routeKey(key)];if(!item)return null;return{x:safeNumber(item.x),y:safeNumber(item.y),at:safeNumber(item.at)}};
  const save=(key=currentKey,position=getPosition())=>{
    if(!key)return null;
    const map=loadMap();
    map[routeKey(key)]={x:Math.max(0,safeNumber(position?.x)),y:Math.max(0,safeNumber(position?.y)),at:Date.now()};
    const entries=Object.entries(map).sort((a,b)=>(b[1]?.at||0)-(a[1]?.at||0)).slice(0,Math.max(5,maxEntries));
    saveMap(Object.fromEntries(entries));
    return map[routeKey(key)];
  };
  const scheduleSave=()=>{if(!currentKey||!ready)return;clearTimeout(timer);const key=currentKey,version=revision;timer=setTimeout(()=>{if(ready&&currentKey===key&&revision===version)save(key)},debounceMs)};
  const begin=(key)=>{
    const next=routeKey(key);
    clearTimeout(timer);timer=null;
    if(currentKey&&ready)save(currentKey);
    currentKey=next;
    ready=false;revision++;
    return currentKey;
  };
  const restore=(key=currentKey)=>{
    const pos=read(key);if(!pos){ready=true;return false;}
    ready=false;
    const version=revision;
    scheduleFrame(()=>scheduleFrame(()=>{if(currentKey===routeKey(key)&&revision===version){applyPosition(pos);ready=true}}));
    return true;
  };
  const onScroll=()=>scheduleSave();
  const onPageHide=()=>{clearTimeout(timer);if(ready)save()};
  const install=()=>{
    if(installed)return;installed=true;
    try{if(historyObject&&'scrollRestoration'in historyObject)historyObject.scrollRestoration='manual'}catch{}
    addListener?.('scroll',onScroll,{passive:true});
    addListener?.('pagehide',onPageHide);
  };
  const destroy=()=>{
    if(!installed)return;installed=false;clearTimeout(timer);ready=false;revision++;
    removeListener?.('scroll',onScroll);
    removeListener?.('pagehide',onPageHide);
  };
  return{install,destroy,begin,save,restore,read,getCurrentKey:()=>currentKey,key:VIEW_RESUME_KEY};
}

export {VIEW_RESUME_KEY};
