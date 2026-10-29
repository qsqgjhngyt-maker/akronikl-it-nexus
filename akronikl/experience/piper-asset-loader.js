import {PIPER_PUBLIC_ASSETS} from './piper-assets.js';
const sha=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
export async function readPiperChunks(file,{base,fetchResource=fetch,signal,onProgress}={}){
 const record=PIPER_PUBLIC_ASSETS[file];if(!record?.chunks)throw Error('PIPER_ASSET_INVALID');
 const controller=new AbortController(),combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
 const chunks=new Array(record.chunks.length);let next=0,completed=0;
 try{await Promise.all(Array.from({length:8},async()=>{for(;;){const i=next++;if(i>=record.chunks.length)return;combined.throwIfAborted();const c=record.chunks[i],r=await fetchResource(new URL(c.file,base),{credentials:'omit',redirect:'error',signal:combined});if(!r.ok||r.redirected){await r.body?.cancel();throw Error('PIPER_ASSET_UNAVAILABLE');}
   const reader=r.body?.getReader();if(!reader)throw Error('PIPER_ASSET_UNAVAILABLE');let size=0;const parts=[];try{for(;;){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>c.bytes)throw Error('PIPER_ASSET_INVALID');parts.push(p.value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   if(size!==c.bytes)throw Error('PIPER_ASSET_INVALID');const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}if(await sha(bytes)!==c.sha256)throw Error('PIPER_ASSET_INVALID');chunks[i]=bytes;completed+=size;try{onProgress?.(completed,record.bytes);}catch{}
 }}));}catch(e){controller.abort();throw e;}
 const bytes=new Uint8Array(record.bytes);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}if(at!==record.bytes||await sha(bytes)!==record.sha256)throw Error('PIPER_ASSET_INVALID');
 return new Response(bytes,{headers:{'content-type':record.mime,'content-length':String(record.bytes)}});
}
