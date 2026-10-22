import jpeg from 'jpeg-js';
import {Buffer} from 'node:buffer';
import {createHash} from 'node:crypto';
const fail=()=>{throw Object.assign(Error('BLOG_IMAGE_INVALID'),{code:'BLOG_IMAGE_INVALID'})};
// Ограничение проверяется до декодирования. Только pixels -> новый JPEG: без EXIF/GPS/comments.
export function sanitizeBlogImage(value){
 if(typeof value!=='string'||value.length>131072||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))fail();
 const bytes=Buffer.from(value,'base64');if(bytes.toString('base64')!==value||bytes.length>98304||bytes[0]!==255||bytes[1]!==216)fail();
 let n=2,width,height;
 while(n<bytes.length){if(bytes[n++]!==255)fail();while(bytes[n]===255)n++;const marker=bytes[n++];if(marker===218)break;if(marker===217||marker===0||marker===216||marker>=208&&marker<=215||n+2>bytes.length)fail();const size=bytes.readUInt16BE(n);if(size<2||n+size>bytes.length)fail();if([192,193,194].includes(marker)){if(width||size<8||bytes[n+2]!==8)fail();height=bytes.readUInt16BE(n+3);width=bytes.readUInt16BE(n+5);if(!width||!height||width>1600||height>1600)fail()}n+=size}
 if(!width||!height)fail();
 try{const decoded=jpeg.decode(bytes,{useTArray:true,formatAsRGBA:true,tolerantDecoding:false,maxResolutionInMP:3,maxMemoryUsageInMB:64});if(decoded.width!==width||decoded.height!==height)fail();for(const quality of [80,65,50,35]){const out=Buffer.from(jpeg.encode({data:decoded.data,width,height},quality).data);if(out.length<=98304)return {id:createHash('sha256').update(out).digest('hex'),mime:'image/jpeg',data:out.toString('base64'),width,height}}}catch{fail()}fail();
}
