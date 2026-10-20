// The purpose-specific HMAC authenticates the BFF-normalized pixels. No expensive codec runs in Worker.
import {Buffer} from 'node:buffer';
import {AlphaError} from './alpha-admission.mjs';
const deny=()=>{throw new AlphaError('AVATAR_INVALID',400)};
export function validateAvatarEnvelope(value){
 if(typeof value!=='string'||value.length>131072||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))deny();
 const bytes=Buffer.from(value,'base64');
 if(bytes.toString('base64')!==value||bytes.length>98304||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)deny();
 let offset=2,frame=false;
 while(offset<bytes.length){
  if(bytes[offset++]!==255)deny();
  while(bytes[offset]===255)offset++;
  const marker=bytes[offset++];
  if(marker===218){if(!frame)deny();return value}
  if(marker===0||marker===216||marker===217||marker===254||marker>=225&&marker<=239||offset+2>bytes.length)deny();
  const length=bytes.readUInt16BE(offset);if(length<2||offset+length>bytes.length)deny();
  if(marker===192){
   if(frame||length<8||bytes[offset+2]!==8)deny();
   const height=bytes.readUInt16BE(offset+3),width=bytes.readUInt16BE(offset+5);
   if(width!==height||![128,192,256].includes(width))deny();frame=true;
  }
  offset+=length;
 }
 deny();
}
