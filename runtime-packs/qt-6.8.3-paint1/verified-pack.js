// Ограничения применяются до разбора JSON/компиляции WASM. Никаких cookies.
const invalid=()=>Object.assign(Error('QT_RUNTIME_INTEGRITY'),{code:'QT_RUNTIME_INTEGRITY'});
export async function digest(bytes){
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function readBounded(stream,limit){
 if(!stream||!Number.isSafeInteger(limit)||limit<1)throw invalid();
 const reader=stream.getReader(),chunks=[];let total=0;
 try{while(true){const{value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit)throw invalid();chunks.push(value)}}
 catch(e){await reader.cancel().catch(()=>{});throw e}finally{reader.releaseLock()}
 const result=new Uint8Array(total);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength}return result;
}
export async function unpackVerified(bytes,record){
 if(bytes.byteLength!==record.bytes||await digest(bytes)!==record.sha256)throw invalid();
 if(record.encoding!=='gzip')return bytes;
 const raw=await readBounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),record.rawBytes);
 if(raw.byteLength!==record.rawBytes||await digest(raw)!==record.rawSha256)throw invalid();return raw;
}
export async function fetchVerified(record,{signal}={}){
 const response=await fetch(record.url,{credentials:'omit',mode:'cors',redirect:'error',signal});
 if(response.status!==200||response.redirected)throw Object.assign(Error('QT_RUNTIME_UNAVAILABLE'),{code:'QT_RUNTIME_UNAVAILABLE'});
 return unpackVerified(await readBounded(response.body,record.bytes),record);
}
