import jpeg from 'jpeg-js';
import {Buffer} from 'node:buffer';
export class AvatarError extends Error {
 constructor(code,status=400){super(code);this.code=code;this.status=status}
}
const deny=(code,status)=>{throw new AvatarError(code,status)};
const MAX_JPEG=98304;
// Inspect dimensions before allocating decoder buffers.
export function sanitizeAvatar(value){
 if(typeof value!=='string'||value.length>MAX_JPEG*4/3||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))deny('AVATAR_INVALID');
 const input=Buffer.from(value,'base64');
 if(input.toString('base64')!==value||input.length>MAX_JPEG||input[0]!==255||input[1]!==216)deny('AVATAR_INVALID');
 let offset=2,dimensions;
 while(offset<input.length){
  if(input[offset++]!==255)deny('AVATAR_INVALID');
  while(input[offset]===255)offset++;
  const marker=input[offset++];if(marker===218)break;
  if(marker===217||marker===0||marker===216||marker>=208&&marker<=215||offset+2>input.length)deny('AVATAR_INVALID');
  const length=input.readUInt16BE(offset);if(length<2||offset+length>input.length)deny('AVATAR_INVALID');
  if([192,193,194].includes(marker)){
   if(dimensions||length<8||input[offset+2]!==8)deny('AVATAR_INVALID');
   dimensions={height:input.readUInt16BE(offset+3),width:input.readUInt16BE(offset+5)};
  }
  offset+=length;
 }
 if(!dimensions||dimensions.width!==dimensions.height||![128,192,256].includes(dimensions.width))deny('AVATAR_DIMENSIONS');
 let decoded,encoded;
 try{
  decoded=jpeg.decode(input,{useTArray:true,formatAsRGBA:true,tolerantDecoding:false,maxResolutionInMP:1,maxMemoryUsageInMB:32});
  if(decoded.width!==dimensions.width||decoded.height!==dimensions.height)deny('AVATAR_INVALID');
  // Only pixel data is re-encoded: EXIF, comments, GPS and arbitrary input segments are discarded.
  encoded=jpeg.encode({data:decoded.data,width:decoded.width,height:decoded.height},80).data;
 }catch(error){if(error instanceof AvatarError)throw error;deny('AVATAR_INVALID')}
 if(encoded.length>MAX_JPEG)deny('AVATAR_TOO_LARGE',413);
 return Buffer.from(encoded).toString('base64');
}
