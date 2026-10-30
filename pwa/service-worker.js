import {createAssetStore} from './durable-store.js';
import {stagePublicGeneration} from './public-install.js';
import {publicRecord,verifyResponse,assetResponse,failure} from './policy.js';
import {RUNTIME_GRAPH_ID,RUNTIME_RESOURCES} from './runtime-manifest.js';
const config=__NEXUS_PWA_CONFIG__,store=createAssetStore(),origin=self.location.origin;
const base=new URL(self.registration.scope).pathname;
const publicAssets=config.assets.map(r=>({...r,url:new URL(r.url,self.registration.scope).pathname})),records=[...publicAssets,...(config.lazyAssets??[]).map(r=>({...r,url:new URL(r.url,self.registration.scope).pathname})),...RUNTIME_RESOURCES];
let publicCheck;
const checkPublic=()=>publicCheck??=(store.ready(config.generation,publicAssets).finally(()=>{publicCheck=null}));
const resolveURL=record=>new URL(record.url,origin).href;
async function acquire(record,{signal}={}){
 const controller=new AbortController(),abort=()=>controller.abort(signal.reason);
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(new DOMException('Public resource timeout','TimeoutError')),240000);
 try{
  const response=await fetch(resolveURL(record),{credentials:'omit',mode:'cors',cache:'no-store',redirect:'error',signal:controller.signal});
  return await verifyResponse(record,response);
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 await stagePublicGeneration({generation:config.generation,records:publicAssets,store,acquire});
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 if(!await store.ready(config.generation,publicAssets))throw failure('PUBLIC_GENERATION_INCOMPLETE');
 await store.activate(config.generation);await self.clients.claim();
 // Existing tabs and every historical cache/database are preserved. No forced reload.
 for(const client of await self.clients.matchAll({type:'window'}))client.postMessage({type:'nexus-update-ready',generation:config.generation});
})()));
async function verified(record){
 let bytes;try{bytes=await store.read(record)}catch{/* corrupt bytes never reach a consumer */}
 if(!bytes){bytes=await acquire(record);try{await store.put(record,bytes)}catch{/* verified online operation remains possible; no offline durability claim */}}
 return assetResponse(record,bytes);
}
async function networkOnly(request){
 try{return await fetch(new Request(request,{cache:'no-store'}))}
 catch(error){
  // Самостоятельная публичная оболочка; внутри нет Account proof или данных.
  const u=new URL(request.url);
  // Fragment выбирает локальный экран и не расширяет public asset authority.
  // Прямая ссылка из offline-center должна переживать холодный запуск без сети.
  if(request.method==='GET'&&request.mode==='navigate'&&u.origin===origin&&!u.username&&!u.password&&[base,base+'index.html',base+'offline.html'].includes(u.pathname)&&!u.search){
   const offline=publicAssets.find(r=>r.url===base+'offline.html');if(offline)return verified(offline);
  }
  throw error;
 }
}
self.addEventListener('fetch',event=>{
 const request=event.request,record=publicRecord(request,origin,records,config.version),url=new URL(request.url);
 // Classification precedes every cache/IndexedDB read, including legacy cache fallback.
 if(record){event.respondWith(verified(record));return}
 if(url.origin==='https://cdn.jsdelivr.net'&&/^\/npm\/@(?:yowasp\/clang|runno\/wasi)/.test(url.pathname)){
  event.respondWith(Promise.resolve(new Response('Unapproved runtime resource',{status:502,headers:{'cache-control':'no-store'}})));return;
 }
 if(url.origin===origin)event.respondWith(networkOnly(request));
});
self.addEventListener('message',event=>{
 const port=event.ports?.[0];if(!port||!['nexus-pwa-status','nexus-runtime-prepare'].includes(event.data?.type))return;
 event.waitUntil((async()=>{
  try{
   if(event.data.type==='nexus-pwa-status'&&event.data.progress===true&&event.data.includeRuntime!==true)port.postMessage({type:'checking',protocol:'nexus-verified-public-v1',graphId:RUNTIME_GRAPH_ID});
   if(event.data.type==='nexus-runtime-prepare'){
    let completed=0;
    for(const record of RUNTIME_RESOURCES){
     let bytes;try{bytes=await store.read(record)}catch{}
     if(!bytes){bytes=await acquire(record);await store.put(record,bytes)}
     completed++;port.postMessage({type:'progress',completed,total:RUNTIME_RESOURCES.length});
    }
    if(!await store.runtimeReady(RUNTIME_RESOURCES))throw failure('RUNTIME_INCOMPLETE');
   }
   port.postMessage({protocol:'nexus-verified-public-v1',generation:config.generation,graphId:RUNTIME_GRAPH_ID,publicReady:await checkPublic(),runtimeReady:event.data.includeRuntime===true||event.data.type==='nexus-runtime-prepare'?await store.runtimeReady(RUNTIME_RESOURCES):null});
  }catch(error){port.postMessage({protocol:'nexus-verified-public-v1',publicReady:false,runtimeReady:false,error:error.code||'OFFLINE_PREPARATION_FAILED'})}
 })());
});
