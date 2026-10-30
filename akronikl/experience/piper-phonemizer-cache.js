import {PIPER_PUBLIC_ASSETS} from './piper-assets.js';
import {readPiperChunks} from './piper-asset-loader.js';

// One worker owns only these immutable public bytes. No text, audio or credentials.
const files=new Set(['piper_phonemize.data','piper_phonemize.wasm']);
const sha=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
export function createPiperPhonemizerCache({base,fetchResource=fetch,chunked=false,assets=PIPER_PUBLIC_ASSETS}={}){
 const ready=new Map(),pending=new Map();
 async function load(file,record,signal,progress){
  const r=chunked&&record.chunks?await readPiperChunks(file,{base,fetchResource,signal,onProgress:progress}):await fetchResource(new URL(file,base),{credentials:'omit',redirect:'error',signal});
  if(!r.ok||r.redirected){await r.body?.cancel();throw Error('PIPER_ASSET_UNAVAILABLE');}
  const reader=r.body?.getReader();if(!reader)throw Error('PIPER_ASSET_UNAVAILABLE');const parts=[];let size=0;
  try{for(;;){signal.throwIfAborted();const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>record.bytes)throw Error('PIPER_ASSET_INVALID');parts.push(p.value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}
  if(size!==record.bytes||await sha(bytes)!==record.sha256)throw Error('PIPER_ASSET_INVALID');signal.throwIfAborted();return bytes;
 }
 return async function read(file,{signal,onProgress}={}){
  if(!files.has(file)||!assets[file])throw Error('PIPER_NETWORK_DENIED');signal?.throwIfAborted();const record=assets[file];
  const response=bytes=>new Response(bytes,{headers:{'content-type':record.mime,'content-length':String(record.bytes)}});
  if(ready.has(file))return response(ready.get(file));
  let entry=pending.get(file);
  if(!entry){
   entry={controller:new AbortController(),users:new Set()};pending.set(file,entry);
   entry.promise=Promise.resolve().then(()=>load(file,record,entry.controller.signal,(loaded,total)=>{for(const user of entry.users)try{user.progress?.(loaded,total);}catch{}})).then(bytes=>{if(pending.get(file)===entry){ready.set(file,bytes);pending.delete(file);}return bytes;},error=>{if(pending.get(file)===entry)pending.delete(file);throw error;});
  }
  return new Promise((resolve,reject)=>{
   const user={progress:onProgress};let active=true;entry.users.add(user);
   const clean=()=>{active=false;entry.users.delete(user);signal?.removeEventListener('abort',abort);};
   const abort=()=>{if(!active)return;clean();reject(signal.reason??new DOMException('Aborted','AbortError'));if(!entry.users.size&&pending.get(file)===entry){pending.delete(file);entry.controller.abort();}};
   signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
   entry.promise.then(bytes=>{if(!active)return;clean();resolve(response(bytes));},error=>{if(!active)return;clean();reject(error);});
  });
 };
}
