import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {stagePublicGeneration,PUBLIC_INSTALL_CONCURRENCY} from '../pwa/public-install.js';
import {sha256,verifyBytes,verifyResponse} from '../pwa/policy.js';

const records=await Promise.all(Array.from({length:25},async(_,i)=>{
 const data=new TextEncoder().encode('SYNTHETIC_PUBLIC_'+i).buffer;
 return {url:'/releases/synthetic/asset-'+i+'.js',mime:'text/javascript',bytes:data.byteLength,sha256:await sha256(data),data};
}));
let checks=0;
async function check(name,run){await run();checks++;console.log('PASS '+name)}
function fixture(){
 const state={stages:0,reads:0,fetches:0,buffers:null};
 const store={async read(){state.reads++;return null},async stage(id,rows,buffers){
  for(const row of rows)await verifyBytes(row,buffers.get(row.url));
  state.stages++;state.buffers=buffers;state.id=id;
 }};
 const acquire=async record=>{state.fetches++;return record.data};
 return {state,store,acquire};
}
await check('свежее поколение проверено полностью до единственного stage',async()=>{
 const f=fixture();await stagePublicGeneration({generation:'fresh',records,...f});
 assert.equal(f.state.id,'fresh');assert.equal(f.state.fetches,25);assert.equal(f.state.stages,1);assert.equal(f.state.buffers.size,25);
});
await check('не более восьми одновременных загрузок и реальная параллельная работа',async()=>{
 const f=fixture();let active=0,peak=0;
 await stagePublicGeneration({generation:'bounded',records,store:f.store,acquire:async r=>{
  active++;peak=Math.max(peak,active);await delay(5);active--;return r.data;
 }});
 assert.equal(peak,PUBLIC_INSTALL_CONCURRENCY);assert.equal(peak,8);assert.equal(active,0);assert.equal(f.state.stages,1);
});
await check('одинаковые SHA256/размер разных поколений загружаются один раз, все URL сохранены',async()=>{
 const f=fixture(),aliases=records.flatMap(r=>[r,{...r,url:r.url.replace('synthetic/','synthetic-old/')}]);
 await stagePublicGeneration({generation:'aliases',records:aliases,...f});
 assert.equal(f.state.fetches,25);assert.equal(f.state.reads,25);assert.equal(f.state.buffers.size,50);assert.equal(f.state.stages,1);
});
await check('проверенные durable bytes переиспользуются без сети',async()=>{
 const f=fixture();f.store.read=async r=>{await verifyBytes(r,r.data);return r.data};
 await stagePublicGeneration({generation:'cached',records,...f});assert.equal(f.state.fetches,0);assert.equal(f.state.stages,1);
});
await check('поддельная Boolean-готовность вместо bytes не даёт stage',async()=>{
 const f=fixture();f.store.read=async()=>true;
 await assert.rejects(stagePublicGeneration({generation:'forged',records,...f}),e=>e.code==='ASSET_BYTES_INVALID');
 assert.equal(f.state.stages,0);
});
await check('повреждённый durable объект требует повторной сетевой SHA256-проверки',async()=>{
 const f=fixture();f.store.read=async()=>{throw Object.assign(Error('corrupt'),{code:'ASSET_INTEGRITY_MISMATCH'})};
 await stagePublicGeneration({generation:'repair',records,...f});assert.equal(f.state.fetches,25);assert.equal(f.state.stages,1);
});
await check('подмена сетевого тела запрещает частичную установку',async()=>{
 const f=fixture();f.acquire=async r=>new Uint8Array(r.bytes).buffer;
 await assert.rejects(stagePublicGeneration({generation:'tampered',records,...f}),e=>e.code==='ASSET_INTEGRITY_MISMATCH');assert.equal(f.state.stages,0);
});
await check('неверный размер тела запрещает stage',async()=>{
 const f=fixture();f.acquire=async()=>new ArrayBuffer(1);
 await assert.rejects(stagePublicGeneration({generation:'short',records,...f}),e=>e.code==='ASSET_SIZE_MISMATCH');assert.equal(f.state.stages,0);
});
await check('первая ошибка прерывает соседние fetch и не запускает оставшиеся задания',async()=>{
 const f=fixture(),original=Error('SYNTHETIC_NETWORK_FAILURE');let started=0,aborted=0;
 f.acquire=async(r,{signal})=>{started++;if(r===records[0]){await delay(5);throw original}
  return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted++;reject(signal.reason)},{once:true}));
 };
 await assert.rejects(stagePublicGeneration({generation:'interrupted',records,...f}),e=>e===original);
 assert.equal(started,8);assert.equal(aborted,7);assert.equal(f.state.stages,0);
});
await check('quota fault не возвращает успешное завершение',async()=>{
 const f=fixture();f.store.stage=async()=>{throw new DOMException('Synthetic full storage','QuotaExceededError')};
 await assert.rejects(stagePublicGeneration({generation:'quota',records,...f}),e=>e.name==='QuotaExceededError');assert.equal(f.state.stages,0);
});
await check('ошибка durable read не подменяется готовностью при недоступном stage',async()=>{
 const f=fixture();f.store.read=async()=>{throw Error('IDB_UNAVAILABLE')};f.store.stage=async()=>{throw Error('IDB_UNAVAILABLE')};
 await assert.rejects(stagePublicGeneration({generation:'no-idb',records,...f}),/IDB_UNAVAILABLE/);
});
for(const [name,headers,code] of [
 ['MIME',{'content-type':'text/html'},'ASSET_MIME_REJECTED'],
 ['private',{'content-type':'text/javascript','cache-control':'private'},'ASSET_PRIVATE_RESPONSE_REJECTED'],
 ['Set-Cookie',{'content-type':'text/javascript','set-cookie':'synthetic=forbidden'},'ASSET_PRIVATE_RESPONSE_REJECTED'],
 ['Vary:*',{'content-type':'text/javascript',vary:'*'},'ASSET_PRIVATE_RESPONSE_REJECTED']
])await check('загрузка отвергает '+name+' без stage',async()=>{
 const f=fixture();f.acquire=async r=>verifyResponse(r,new Response(r.data,{headers}));
 await assert.rejects(stagePublicGeneration({generation:'headers',records,...f}),e=>e.code===code);assert.equal(f.state.stages,0);
});
await check('корректный public response проходит прежние MIME и SHA256 guards',async()=>{
 const f=fixture();f.acquire=async r=>verifyResponse(r,new Response(r.data,{headers:{'content-type':r.mime,'cache-control':'public,max-age=0'}}));
 await stagePublicGeneration({generation:'policy',records,...f});assert.equal(f.state.stages,1);
});
console.log(JSON.stringify({status:'PASS',checks,synthetic:true,networkRequests:0,concurrency:PUBLIC_INSTALL_CONCURRENCY}));
