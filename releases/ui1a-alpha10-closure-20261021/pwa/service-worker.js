import {createAssetStore} from './durable-store.js';
import {publicRecord,verifyResponse,assetResponse,failure} from './policy.js';
import {RUNTIME_GRAPH_ID,RUNTIME_RESOURCES} from './runtime-manifest.js';
const config=__NEXUS_PWA_CONFIG__,store=createAssetStore(),origin=self.location.origin;
const base=new URL(self.registration.scope).pathname;
const publicAssets=config.assets.map(r=>({...r,url:new URL(r.url,self.registration.scope).pathname})),records=[...publicAssets,...RUNTIME_RESOURCES];
const resolveURL=record=>new URL(record.url,origin).href;
async function acquire(record){
 const response=await fetch(resolveURL(record),{credentials:'omit',mode:'cors',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(240000)});
 return verifyResponse(record,response);
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const buffers=new Map();
 // No control record is published until the complete public generation commits.
 for(const record of publicAssets)buffers.set(record.url,await acquire(record));
 await store.stage(config.generation,publicAssets,buffers);await self.skipWaiting();
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
  // An offline public notice is not an authenticated shell or cached API result.
  const u=new URL(request.url);
  if(request.mode==='navigate'&&u.origin===origin&&[base,base+'index.html'].includes(u.pathname)&&!u.search){
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
 const port=event.ports?.[0];if(!port||event.data?.type!=='nexus-pwa-status')return;
 event.waitUntil((async()=>{
  try{port.postMessage({protocol:'nexus-verified-public-v1',generation:config.generation,graphId:RUNTIME_GRAPH_ID,publicReady:await store.ready(config.generation,publicAssets),runtimeReady:event.data.includeRuntime===true?await store.runtimeReady(RUNTIME_RESOURCES):null})}
  catch{port.postMessage({protocol:'nexus-verified-public-v1',publicReady:false,runtimeReady:false})}
 })());
});
