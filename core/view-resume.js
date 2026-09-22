const VIEW_RESUME_KEY='akronikl:it-nexus:view-resume:v1';

const safeParse=(raw,fallback={})=>{try{return raw?JSON.parse(raw):fallback}catch{return fallback}};
const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const routeKey=value=>String(value||'#view=home');

export function createViewResume({
  storage=globalThis.sessionStorage,
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
  const scheduleSave=()=>{if(!currentKey)return;clearTimeout(timer);timer=setTimeout(()=>save(),debounceMs)};
  const begin=(key)=>{
    const next=routeKey(key);
    if(currentKey)save(currentKey);
    currentKey=next;
    return currentKey;
  };
  const restore=(key=currentKey)=>{
    const pos=read(key);if(!pos)return false;
    scheduleFrame(()=>scheduleFrame(()=>applyPosition(pos)));
    return true;
  };
  const onScroll=()=>scheduleSave();
  const onPageHide=()=>{clearTimeout(timer);save()};
  const install=()=>{
    if(installed)return;installed=true;
    try{if(historyObject&&'scrollRestoration'in historyObject)historyObject.scrollRestoration='manual'}catch{}
    addListener?.('scroll',onScroll,{passive:true});
    addListener?.('pagehide',onPageHide);
  };
  const destroy=()=>{
    if(!installed)return;installed=false;clearTimeout(timer);
    removeListener?.('scroll',onScroll);
    removeListener?.('pagehide',onPageHide);
  };
  return{install,destroy,begin,save,restore,read,getCurrentKey:()=>currentKey,key:VIEW_RESUME_KEY};
}

export {VIEW_RESUME_KEY};
