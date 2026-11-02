// Только публичный JSON: ограниченная распаковка, точная длина и SHA до разбора.
export const GUIDE_PACKED_MAX_BYTES=1500000,GUIDE_DATA_MAX_BYTES=4000000;
export async function decodePackedOnecGuide(packed,descriptor){
 const reject=()=>{throw Error('GUIDE_PACKED_SHAPE');};
 if(!packed||Object.keys(packed).sort().join(',')!=='dataBytes,dataSha256,encoding,gzipBase64'||packed.encoding!=='gzip-base64-json-v1'||descriptor?.encoding!==packed.encoding||!Number.isSafeInteger(packed.dataBytes)||packed.dataBytes<1||packed.dataBytes>GUIDE_DATA_MAX_BYTES||packed.dataBytes!==descriptor.dataBytes||!/^[a-f0-9]{64}$/.test(packed.dataSha256||'')||packed.dataSha256!==descriptor.dataSha256||typeof packed.gzipBase64!=='string'||packed.gzipBase64.length>GUIDE_PACKED_MAX_BYTES||packed.gzipBase64.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(packed.gzipBase64))reject();
 const binary=atob(packed.gzipBase64),compressed=Uint8Array.from(binary,c=>c.charCodeAt(0));if(compressed.length<18||compressed[0]!==31||compressed[1]!==139)reject();
 const reader=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),chunks=[];let size=0;
 try{for(;;){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>packed.dataBytes||size>GUIDE_DATA_MAX_BYTES){await reader.cancel();throw Error('GUIDE_PACKED_BUDGET');}chunks.push(value);}}finally{reader.releaseLock();}
 if(size!==packed.dataBytes)throw Error('GUIDE_PACKED_LENGTH');const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
 const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');if(sha!==packed.dataSha256)throw Error('GUIDE_PACKED_INTEGRITY');
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
