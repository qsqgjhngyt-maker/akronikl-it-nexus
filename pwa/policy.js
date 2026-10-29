// Only exact, producer-hashed public bytes have offline authority. No legacy cache lookup.
export const failure=code=>Object.assign(new Error(code),{code});
export const sha256=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
export function privateTarget(url){
 let path;try{path=decodeURIComponent(url.pathname)}catch{return true}
 return /[\\\u0000-\u001f\u007f]/.test(path)||/^\/(?:api|account|oauth|auth)(?:\/|$)/i.test(path)||/^\/(?:index\.html|nexus-shell\.html)?$/.test(path);
}
export function publicRecord(request,origin,records,version){
 const u=new URL(request.url);
 if(request.method!=='GET'||u.username||u.password||privateTarget(u))return null;
 const key=u.origin===origin?u.pathname:u.href;
 const record=records.find(r=>r.url===key);
 // Fragment идентифицирует одноразовую навигацию opaque 3D loader. Authority всё ещё
 // только exact manifest record с прежними bytes/SHA256/CSP; другие hash URL запрещены.
 if(u.hash&&!(record&&u.origin===origin&&request.mode==='navigate'&&record.mime==='text/html'&&/^\/releases\/ui1a-[a-z0-9-]+\/pwa\/graphics-frame\.html$/.test(u.pathname)&&/^#[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(u.hash)))return null;
 const piperQuery=record&&u.origin===origin&&/\/akronikl\/experience\/piper-worker\.js$/.test(u.pathname)&&['?voice=uyut7-pilot5&transport=chunks-v1&source=yandex-public-v1','?voice=uyut7-pilot5&transport=chunks-v1','?voice=uyut7-pilot5','?voice=irina'].includes(u.search);
 if(u.search&&!piperQuery&&!(u.origin===origin&&u.search==='?v='+(record?.version||version)))return null;
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
export const GRAPHICS_FRAME_CSP="sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; worker-src blob:; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'";
export function assetResponse(record,bytes){
 const headers={'content-type':record.mime,'cache-control':'no-store','x-content-type-options':'nosniff','access-control-allow-origin':'*','x-nexus-verified-sha256':record.sha256};
 // Sandbox задаётся HTTP policy: навигация остаётся SW-eligible, результат opaque.
 if(/^\/releases\/ui1a-[a-z0-9-]+\/pwa\/graphics-frame\.html$/.test(record.url)&&record.mime==='text/html')headers['content-security-policy']=GRAPHICS_FRAME_CSP;
 return new Response(bytes,{headers});
}
