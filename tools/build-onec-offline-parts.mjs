import fs from'node:fs/promises';import path from'node:path';import{createHash}from'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function writeOnecOfflineParts(bytes,out){
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>1500000)throw Error('OFFLINE_COMPRESSED_BUDGET');
 await fs.mkdir(path.join(out,'data'));const parts=[];
 for(let start=0;start<bytes.length;start+=196608){const index=parts.length,chunk=bytes.subarray(start,start+196608),data=chunk.toString('base64'),file=`data/onec-public-${String(index+1).padStart(2,'0')}.html`;
  const script=`addEventListener('message',event=>{const v=event.data;if(event.source!==parent||!v||v.type!=='nexus-onec-public-request-v1'||typeof v.nonce!=='string'||!/^[a-f0-9-]{36}$/.test(v.nonce))return;parent.postMessage({type:'nexus-onec-public-data-v1',index:${index},nonce:v.nonce,data:'${data}'},'*');});\n`;
  const hash=createHash('sha256').update(script).digest('base64'),html=`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; connect-src 'none'; base-uri 'none'; form-action 'none'"><script>${script}</script>`;
  if(Buffer.byteLength(html)>650000)throw Error('OFFLINE_PART_HTML_BUDGET');await fs.writeFile(path.join(out,file),html,{flag:'wx'});parts.push({file,bytes:chunk.length,base64Chars:data.length,sha256:sha(chunk),htmlBytes:Buffer.byteLength(html),htmlSha256:sha(html)});
 }
 return{schemaVersion:1,compressedBytes:bytes.length,sha256:sha(bytes),parts};
}
