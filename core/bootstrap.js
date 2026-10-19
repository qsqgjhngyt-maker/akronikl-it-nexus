import {initializeAccountStorage,lockAccountStorage,verifiedAccount} from './account-storage.js';
import {SERVER_ACCOUNT_ORIGIN} from './server-account-origin.js';

export const ENTRY_URL=SERVER_ACCOUNT_ORIGIN+'/account/entry/';
const exact=(value,keys)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const text=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max;
export function validAccount(body){
 if(!exact(body,['account','loginMethods','enrollmentAvailable'])||body.enrollmentAvailable!==false||
  !exact(body.account,['accountId','displayName','status'])||body.account.status!=='active'||
  typeof body.account.accountId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(body.account.accountId)||
  typeof body.account.displayName!=='string'||body.account.displayName.length>512||
  !Array.isArray(body.loginMethods)||!body.loginMethods.length||body.loginMethods.length>100)return false;
 let active=false;const ids=new Set();
 for(const method of body.loginMethods){
  if(!exact(method,['id','kind','status','createdAt','disabledAt'])||!text(method.id,256)||ids.has(method.id)||
   !['oauth','password','passkey'].includes(method.kind)||!['pending','active','disabled'].includes(method.status)||
   !text(method.createdAt,64)||(method.status==='disabled'?!text(method.disabledAt,64):method.disabledAt!==null))return false;
  ids.add(method.id);if(method.status==='active')active=true;
 }
 return active;
}

/** Dependency injection — только для синтетических проверок порядка, без загрузки app. */
export function createNexusBootstrap({
 fetchImpl=globalThis.fetch,locationImpl=globalThis.location,documentImpl=globalThis.document,windowImpl=globalThis.window,
 storage={initializeAccountStorage,lockAccountStorage,verifiedAccount},
 importApp=()=>import('./app.js'),
 // Window timers требуют native receiver: вызов через plain DI object иначе даёт Illegal invocation.
 timers={setTimeout:(...args)=>globalThis.setTimeout(...args),clearTimeout:(...args)=>globalThis.clearTimeout(...args),setInterval:(...args)=>globalThis.setInterval(...args),clearInterval:(...args)=>globalThis.clearInterval(...args)}
}={}){
 let phase='idle',startPromise=null,inFlight=null,interval=null,leaving=false,pendingRoute=false;
 const readers=new Set(),listeners=[],releasedHashEvents=new WeakSet();
 const canonical=()=>locationImpl?.origin===SERVER_ACCOUNT_ORIGIN;
 const visible=()=>documentImpl?.hidden!==true;
 const abortReaders=()=>{for(const controller of readers)controller.abort();readers.clear()};
 const stopInterval=()=>{if(interval!==null){timers.clearInterval(interval);interval=null}};
 const listen=(target,type,callback,options)=>{
  target?.addEventListener(type,callback,options);listeners.push(()=>target?.removeEventListener(type,callback,options));
 };
 const removeListeners=()=>{while(listeners.length)listeners.pop()()};
 const entry=()=>ENTRY_URL+(typeof locationImpl?.hash==='string'?locationImpl.hash:'');
 const lock=()=>{storage.lockAccountStorage();abortReaders();stopInterval()};
 const leave=()=>{
  if(leaving)return false;leaving=true;phase='leaving';pendingRoute=false;
  lock();removeListeners();
  try{documentImpl?.querySelector('#app')?.replaceChildren()}finally{locationImpl?.replace(entry())}
  return false;
 };

 async function readSession(){
  if(!canonical())throw Error('SESSION_ORIGIN_REQUIRED');
  const controller=new AbortController();readers.add(controller);
  const timer=timers.setTimeout(()=>controller.abort(),15000);timer?.unref?.();
  try{
   const response=await fetchImpl('/api/v2/account',{credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,headers:{accept:'application/json'}});
   if(controller.signal.aborted||!canonical())throw Error('SESSION_UNAVAILABLE');
   if(response.status===401||response.status===403){await response.body?.cancel();return null}
   if(response.status!==200||response.redirected||!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||'')||
    !response.headers.get('cache-control')?.split(',').some(value=>value.trim().toLowerCase()==='no-store')||!response.headers.get('vary')?.split(',').some(value=>value.trim()==='*')){
    await response.body?.cancel();throw Error('SESSION_UNAVAILABLE');
   }
   const reader=response.body?.getReader();if(!reader)throw Error('SESSION_INVALID');
   const chunks=[];let size=0;
   try{
    while(true){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536||controller.signal.aborted)throw Error('SESSION_INVALID');chunks.push(value)}
   }catch(error){await reader.cancel().catch(()=>{});throw error}finally{reader.releaseLock()}
   if(controller.signal.aborted||!canonical())throw Error('SESSION_UNAVAILABLE');
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
   const dto=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!validAccount(dto))throw Error('SESSION_INVALID');return dto;
  }finally{timers.clearTimeout(timer);readers.delete(controller)}
 }

 function releaseRoute(){
  if(!pendingRoute||phase!=='ready'||leaving||!visible())return;
  pendingRoute=false;
  const EventType=windowImpl?.HashChangeEvent||globalThis.HashChangeEvent||windowImpl?.Event||globalThis.Event;
  const event=new EventType('hashchange');releasedHashEvents.add(event);windowImpl.dispatchEvent(event);
 }
 function recheck(){
  if(leaving||phase!=='ready'||!visible())return Promise.resolve(false);
  if(inFlight)return inFlight;
  inFlight=(async()=>{
   try{
    const next=await readSession();
    if(leaving||phase!=='ready')return false;
    if(!next||next.account.accountId!==storage.verifiedAccount()?.accountId)return leave();
    releaseRoute();return true;
   }catch{return leaving||phase!=='ready'?false:leave()}
   finally{inFlight=null}
  })();return inFlight;
 }
 function installGuards(){
  listen(documentImpl,'visibilitychange',()=>{if(visible())void recheck()});
  listen(windowImpl,'focus',()=>{if(visible())void recheck()});
  listen(windowImpl,'hashchange',event=>{
   if(releasedHashEvents.has(event))return;
   event.stopImmediatePropagation();pendingRoute=true;
   if(phase==='ready'&&visible())void recheck();
  },true);
  listen(windowImpl,'pageshow',event=>{if(event.persisted||phase==='hidden-locked')leave()});
  // Даже сохранённый ранее facade не сможет сделать autosave после pagehide.
  listen(windowImpl,'pagehide',()=>{if(!leaving){phase='hidden-locked';pendingRoute=false;lock()}},{once:true});
  listen(windowImpl,'nexus:session-ended',leave,{once:true});
 }
 function start(){
  if(startPromise)return startPromise;
  startPromise=(async()=>{
   if(!canonical())return leave();
   phase='starting';installGuards();
   try{
    const session=await readSession();
    if(leaving||phase!=='starting')return false;
    if(!session)return leave();
    // До этой точки не читается private storage и не импортируется приложение.
    storage.initializeAccountStorage(session);
    if(leaving||phase!=='starting')return false;
    await importApp();
    if(leaving||phase!=='starting')return false;
    phase='ready';
    interval=timers.setInterval(()=>{if(visible())void recheck()},60000);interval?.unref?.();
    // Deep links и hash, изменённый во время начальной проверки, проходят тот же gate.
    if(pendingRoute)await recheck();
    return !leaving&&phase==='ready';
   }catch{return phase==='hidden-locked'||leaving?false:leave()}
  })();return startPromise;
 }
 return Object.freeze({startNexus:start,readVerifiedSession:readSession,recheck,
  dispose(){if(phase==='disposed')return;phase='disposed';leaving=true;pendingRoute=false;lock();removeListeners()}
 });
}

// Один production bootstrap и тот же account-storage singleton во всём module graph.
let production;
export function startNexus(){production??=createNexusBootstrap();return production.startNexus()}
export function readVerifiedSession(fetchImpl=globalThis.fetch){return createNexusBootstrap({fetchImpl}).readVerifiedSession()}
if(typeof document!=='undefined')startNexus().catch(()=>{lockAccountStorage();globalThis.location.replace(ENTRY_URL)});
