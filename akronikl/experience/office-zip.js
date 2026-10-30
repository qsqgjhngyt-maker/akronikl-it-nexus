import {Inflate} from '../vendor/documents/fflate.mjs';
const fail=()=>{throw Error('CHAT_DOCUMENT_INVALID');};
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
// Reads a bounded ZIP in memory; never writes or resolves archive paths on disk.
export function officeParts(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length>6*1024*1024||bytes.length<22)fail();const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u16=p=>d.getUint16(p,true),u32=p=>d.getUint32(p,true);let end=-1;
 for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(u32(p)===0x06054b50&&p+22+u16(p+20)===bytes.length){end=p;break;}if(end<0||u16(end+4)||u16(end+6)||u16(end+8)!==u16(end+10))fail();const count=u16(end+10),offset=u32(end+16),size=u32(end+12);if(!count||count>512||offset+size!==end)fail();let p=offset,total=0;const entries=[],names=new Set(),decode=new TextDecoder('utf-8',{fatal:true});
 for(let i=0;i<count;i++){
  if(p+46>end||u32(p)!==0x02014b50)fail();const flags=u16(p+8),method=u16(p+10),crc=u32(p+16),compressed=u32(p+20),original=u32(p+24),nl=u16(p+28),xl=u16(p+30),cl=u16(p+32),local=u32(p+42);if(flags&1||![0,8].includes(method)||original>16*1024*1024||local+30>offset||p+46+nl+xl+cl>end)fail();let name;try{name=decode.decode(bytes.subarray(p+46,p+46+nl));}catch{fail();}if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').some(x=>x==='..'||x==='.')||names.has(name)||name.length>240||/vbaProject\.bin$/iu.test(name))fail();names.add(name);total+=original;if(total>16*1024*1024)throw Error('CHAT_DOCUMENT_TOO_LARGE');if(u32(local)!==0x04034b50||u16(local+8)!==method||u16(local+6)&1)fail();const start=local+30+u16(local+26)+u16(local+28);if(start+compressed>offset)fail();entries.push({name,method,crc,compressed,original,start});p+=46+nl+xl+cl;
 }if(p!==end)fail();const parts={};let produced=0;
 const wanted=n=>n==='[Content_Types].xml'||/^word\/(?:document|header\d+|footer\d+|footnotes|endnotes)\.xml$/u.test(n)||/^xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|styles\.xml|worksheets\/sheet\d+\.xml)$/u.test(n)||/^ppt\/(?:presentation\.xml|_rels\/presentation\.xml\.rels|slides\/slide\d+\.xml)$/u.test(n);
 for(const e of entries){if(!wanted(e.name))continue;if(e.original>2*1024*1024)throw Error('CHAT_DOCUMENT_TOO_LARGE');const chunks=[];let length=0;const receive=b=>{length+=b.length;produced+=b.length;if(length>e.original||produced>16*1024*1024)throw Error('CHAT_DOCUMENT_TOO_LARGE');chunks.push(b.slice());};
  if(e.method===0)receive(bytes.subarray(e.start,e.start+e.compressed));else{const inflater=new Inflate((b)=>receive(b));for(let i=0;i<e.compressed;i+=1024)inflater.push(bytes.subarray(e.start+i,e.start+Math.min(e.compressed,i+1024)),i+1024>=e.compressed);}
  if(length!==e.original)fail();const data=new Uint8Array(length);let at=0;for(const b of chunks){data.set(b,at);at+=b.length;}if(crc32(data)!==e.crc)fail();let text;try{text=decode.decode(data);}catch{fail();}if(/<!DOCTYPE|<!ENTITY/iu.test(text))fail();parts[e.name]=text;
 }if(!parts['[Content_Types].xml'])fail();return parts;
}
