// Only exact, producer-hashed public bytes have offline authority. No legacy cache lookup.
export const failure=code=>Object.assign(new Error(code),{code});
export const sha256=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
export function privateTarget(url){
 let path;try{path=decodeURIComponent(url.pathname)}catch{return true}
 return /[\\\u0000-\u001f\u007f]/.test(path)||/^\/(?:api|account|oauth|auth)(?:\/|$)/i.test(path)||/^\/(?:index\.html|nexus-shell\.html)?$/.test(path);
}
export function publicRecord(request,origin,records,version){
 const u=new URL(request.url);
 if(request.method!=='GET'||u.username||u.password||u.hash||privateTarget(u))return null;
 const key=u.origin===origin?u.pathname:u.href;
 const record=records.find(r=>r.url===key);
 if(u.search&&!(u.origin===origin&&u.search==='?v='+(record?.version||version)))return null;
 return record||null;
}
export async function verifyBytes(record,bytes){
 if(!(bytes instanceof ArrayBuffer)&&!ArrayBuffer.isView(bytes))throw failure('ASSET_BYTES_INVALID');
 if(bytes.byteLength!==record.bytes)throw failure('ASSET_SIZE_MISMATCH');
 if(await sha256(bytes)!==record.sha256)throw failure('ASSET_INTEGRITY_MISMATCH');
 return bytes;
}
export async function verifyResponse(record,response){
 if(response.status!==200||response.redirected||['opaque','opaqueredirect'].includes(response.type))throw failure('ASSET_RESPONSE_REJECTED');
 const mime=response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
 if(mime!==record.mime&&!(['text/javascript','application/javascript'].includes(record.mime)&&['text/javascript','application/javascript'].includes(mime)))throw failure('ASSET_MIME_REJECTED');
 if(/(?:^|,)\s*(?:no-store|private)(?:\s|,|=|$)/i.test(response.headers.get('cache-control')||'')||response.headers.get('vary')?.split(',').some(v=>v.trim()==='*')||response.headers.has('set-cookie'))throw failure('ASSET_PRIVATE_RESPONSE_REJECTED');
 const length=response.headers.get('content-length');
 if(length&&!response.headers.has('content-encoding')&&(!/^\d+$/.test(length)||Number(length)!==record.bytes))throw failure('ASSET_SIZE_MISMATCH');
 const reader=response.body?.getReader();if(!reader)throw failure('ASSET_BODY_MISSING');
 const chunks=[];let size=0;
 try{while(true){const{value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>record.bytes)throw failure('ASSET_SIZE_MISMATCH');chunks.push(value)}}
 catch(error){await reader.cancel().catch(()=>{});throw error}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 await verifyBytes(record,bytes);return bytes.buffer;
}
export function assetResponse(record,bytes){
 return new Response(bytes,{headers:{'content-type':record.mime,'cache-control':'no-store','x-content-type-options':'nosniff','access-control-allow-origin':'*','x-nexus-verified-sha256':record.sha256}});
}
