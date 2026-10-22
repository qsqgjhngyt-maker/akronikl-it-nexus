import {verifyBytes,failure} from './policy.js';
const requestResult=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
export function createAssetStore({indexedDB=globalThis.indexedDB,name='nexus-verified-public-assets-v1'}={}){
 let opening;
 const open=()=>opening??=(new Promise((resolve,reject)=>{
  if(!indexedDB)return reject(failure('DURABLE_STORE_UNAVAILABLE'));
  const req=indexedDB.open(name,1);
  req.onupgradeneeded=()=>{for(const store of ['assets','generations','control'])req.result.createObjectStore(store,{keyPath:'id'})};
  req.onerror=()=>reject(req.error);req.onblocked=()=>reject(failure('DURABLE_STORE_BLOCKED'));
  req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();opening=null};resolve(db)};
 })).catch(e=>{opening=null;throw e});
 async function get(store,id){const db=await open();return requestResult(db.transaction(store,'readonly').objectStore(store).get(id))}
 async function write(stores,work){
  const db=await open();
  return new Promise((resolve,reject)=>{
   let tx;try{tx=db.transaction(stores,'readwrite',{durability:'strict'});if(tx.durability!=='strict')throw failure('STRICT_DURABILITY_REQUIRED')}
   catch(e){return reject(e)}
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||failure('DURABLE_WRITE_FAILED'));tx.onabort=()=>reject(tx.error||failure('DURABLE_WRITE_ABORTED'));
   try{work(tx)}catch(e){try{tx.abort()}catch{}reject(e)}
  });
 }
 const read=async record=>{const row=await get('assets',record.sha256);if(!row)return null;await verifyBytes(record,row.data);return row.data};
 return Object.freeze({
  read,
  async put(record,bytes){await verifyBytes(record,bytes);await write(['assets'],tx=>tx.objectStore('assets').put({id:record.sha256,data:bytes}))},
  async stage(id,records,buffers){
   for(const record of records)await verifyBytes(record,buffers.get(record.url));
   await write(['assets','generations'],tx=>{
    for(const record of records)tx.objectStore('assets').put({id:record.sha256,data:buffers.get(record.url)});
    tx.objectStore('generations').put({id,hashes:records.map(r=>r.sha256)});
   });
  },
  async ready(id,records){
   const row=await get('generations',id);
   if(!row||JSON.stringify(row.hashes)!==JSON.stringify(records.map(r=>r.sha256)))return false;
   for(const record of records){try{if(!await read(record))return false}catch{return false}}
   return true;
  },
  async activate(id){await write(['control'],tx=>{const store=tx.objectStore('control'),req=store.get('active');req.onsuccess=()=>store.put({id:'active',generation:id,previous:req.result?.generation||null})})},
  active:()=>get('control','active'),
  async runtimeReady(records){for(const record of records){try{if(!await read(record))return false}catch{return false}}return true},
  async close(){if(opening)(await opening).close();opening=null}
 });
}
