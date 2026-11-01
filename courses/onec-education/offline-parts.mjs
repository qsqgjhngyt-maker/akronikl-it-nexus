// Только публичный корпус. Изолированным документам не передаются Account,
// storage, прогресс, работы или запрос ученика. Полученные данные не являются JS.
export async function loadOnecOfflineParts(manifest,{documentRef=globalThis.document,windowRef=globalThis.window,timeoutMs=15000}={}){
 const reject=()=>{throw Error('OFFLINE_PART_MANIFEST');},hash=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(manifest?.schemaVersion!==1||!Array.isArray(manifest.parts)||!manifest.parts.length||manifest.parts.length>8||!Number.isSafeInteger(manifest.compressedBytes)||manifest.compressedBytes<1||manifest.compressedBytes>1500000||!/^[a-f0-9]{64}$/.test(manifest.sha256||''))reject();
 let total=0;for(const[p,row]of manifest.parts.entries()){if(row.file!==`data/onec-public-${String(p+1).padStart(2,'0')}.html`||!Number.isSafeInteger(row.bytes)||row.bytes<1||row.bytes>196608||row.base64Chars!==Math.ceil(row.bytes/3)*4||!/^[a-f0-9]{64}$/.test(row.sha256||''))reject();total+=row.bytes;}if(total!==manifest.compressedBytes)reject();
 if(!Number.isFinite(timeoutMs)||timeoutMs<20||timeoutMs>15000)reject();
 const pending=new Set();let chunks;try{chunks=await Promise.all(manifest.parts.map((part,index)=>new Promise((resolve,reject)=>{
  const frame=documentRef.createElement('iframe'),nonce=crypto.randomUUID();let done=false,checking=false,timer;
  frame.hidden=true;frame.setAttribute('aria-hidden','true');frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';
  const cancel=()=>finish(Error('OFFLINE_PART_CANCELLED'));
  const clean=()=>{clearTimeout(timer);pending.delete(cancel);windowRef.removeEventListener('message',receive);frame.remove();};
  const finish=(error,bytes)=>{if(done)return;done=true;clean();error?reject(error):resolve(bytes);};
  async function receive(event){if(done||checking||event.source!==frame.contentWindow)return;const v=event.data;if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!=='data,index,nonce,type'||v.type!=='nexus-onec-public-data-v1'||v.nonce!==nonce||v.index!==index)return;
   checking=true;try{if(typeof v.data!=='string'||v.data.length!==part.base64Chars||!/^[A-Za-z0-9+/]*={0,2}$/.test(v.data))throw Error('OFFLINE_PART_LIMIT');const bytes=Uint8Array.from(atob(v.data),c=>c.charCodeAt(0));if(bytes.length!==part.bytes||await hash(bytes)!==part.sha256)throw Error('OFFLINE_PART_INTEGRITY');finish(null,bytes);}catch(error){finish(error);}
  }
  pending.add(cancel);windowRef.addEventListener('message',receive);frame.onload=()=>{if(!done)frame.contentWindow.postMessage({type:'nexus-onec-public-request-v1',nonce},'*');};frame.onerror=()=>finish(Error('OFFLINE_PART_LOAD'));
  timer=setTimeout(()=>finish(Error('OFFLINE_PART_TIMEOUT')),timeoutMs);frame.src=new URL(part.file,windowRef.location.href).href;documentRef.body.append(frame);
 })));}catch(error){for(const cancel of [...pending])cancel();throw error;}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}if(await hash(bytes)!==manifest.sha256)throw Error('OFFLINE_PACKAGE_INTEGRITY');return bytes;
}
