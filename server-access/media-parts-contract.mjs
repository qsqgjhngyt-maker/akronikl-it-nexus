// Только внутренние signed RPC. Внешний DTO редактора остаётся прежним.
export const MEDIA_PARTS_PATH='/api/v2/account/control/content/media-parts';
export const PUBLIC_MEDIA_PARTS_PATH='/api/v2/content/internal/media-parts';
export const PART_CHARS=8192,MAX_PARTS=16,MAX_ENVELOPE=12000,MAX_BYTES=98304,UPLOAD_TTL_MS=300000;
export const exact=(v,keys)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
export const digestId=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
export const dimension=v=>Number.isInteger(v)&&v>=1&&v<=1600;
export const partCount=length=>Math.ceil(length/PART_CHARS);
export const partLength=(length,index)=>Math.min(PART_CHARS,length-index*PART_CHARS);
export const validMeta=m=>exact(m,['id','mime','encodedLength','bytes','width','height','totalParts'])&&digestId(m.id)&&m.mime==='image/jpeg'&&Number.isInteger(m.bytes)&&m.bytes>=4&&m.bytes<=MAX_BYTES&&m.encodedLength===4*Math.ceil(m.bytes/3)&&m.totalParts===partCount(m.encodedLength)&&m.totalParts>=1&&m.totalParts<=MAX_PARTS&&dimension(m.width)&&dimension(m.height);
export const metaOf=m=>({id:m.id,mime:m.mime,encodedLength:m.data.length,bytes:Math.floor(m.data.length/4)*3-(m.data.endsWith('==')?2:m.data.endsWith('=')?1:0),width:m.width,height:m.height,totalParts:partCount(m.data.length)});
export function jpegSizeMatches(bytes,width,height){
 if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)return false;
 let i=2;
 while(i+3<bytes.length){
  if(bytes[i++]!==255)return false;
  while(bytes[i]===255)i++;
  const marker=bytes[i++];if(marker===0xda||marker===0xd9)return false;
  const n=(bytes[i]<<8)|bytes[i+1];if(n<2||i+n>bytes.length)return false;
  if([0xc0,0xc1,0xc2].includes(marker))return n>=8&&bytes[i+2]===8&&((bytes[i+3]<<8)|bytes[i+4])===height&&((bytes[i+5]<<8)|bytes[i+6])===width;
  i+=n;
 }
 return false;
}
