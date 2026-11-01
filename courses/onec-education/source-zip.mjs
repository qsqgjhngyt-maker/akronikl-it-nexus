// Дополнительная выгрузка исходников. Прежний JSON/store/runtime contract не меняется.
import {IMPORT_LIMITS,validateOnecWorkspace} from './studio-profile.mjs';
import {labHelpText} from './lab-help.mjs';
const zipEncoder=new TextEncoder();
const zipCrcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const zipCrc=bytes=>{let n=0xffffffff;for(const b of bytes)n=zipCrcTable[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0;};
const zipJoin=arrays=>{const out=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const a of arrays){out.set(a,offset);offset+=a.length;}return out;};
export function buildOnecSourceZip(exportedJson){
 if(typeof exportedJson!=='string'||zipEncoder.encode(exportedJson).length>IMPORT_LIMITS.jsonBytes)throw Error('ZIP_SOURCE_LIMIT');
 const dto=JSON.parse(exportedJson);if(dto?.format!=='nexus-onec-sources-v1'||dto.languageId!=='onec')throw Error('ZIP_SOURCE_FORMAT');
 const workspace=validateOnecWorkspace(dto.workspace,{metadataEditable:true}),seen=new Set();
 const entries=workspace.files.map(f=>{const lower=f.path.toLowerCase();if(seen.has(lower)||f.path.split('/').some(p=>/[. ]$/.test(p)||/^(con|prn|aux|nul|com[0-9]|lpt[0-9]|conin\$|conout\$)(\.|$)/i.test(p)))throw Error('ZIP_WINDOWS_PATH');seen.add(lower);return{name:'src/'+f.path,bytes:zipEncoder.encode(f.content)};});
 for(const locale of ['ru','en'])entries.push({name:'README_'+locale.toUpperCase()+'.txt',bytes:zipEncoder.encode(labHelpText(locale))});
 const local=[],central=[];let offset=0;
 for(const entry of entries){const name=zipEncoder.encode(entry.name),crc=zipCrc(entry.bytes),header=new Uint8Array(30),h=new DataView(header.buffer);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,0x21,true);h.setUint32(14,crc,true);h.setUint32(18,entry.bytes.length,true);h.setUint32(22,entry.bytes.length,true);h.setUint16(26,name.length,true);
  const index=new Uint8Array(46),v=new DataView(index.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(14,0x21,true);v.setUint32(16,crc,true);v.setUint32(20,entry.bytes.length,true);v.setUint32(24,entry.bytes.length,true);v.setUint16(28,name.length,true);v.setUint32(42,offset,true);
  local.push(header,name,entry.bytes);central.push(index,name);offset+=header.length+name.length+entry.bytes.length;
 }
 const directory=zipJoin(central),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,directory.length,true);e.setUint32(16,offset,true);
 return zipJoin([...local,directory,end]);
}
