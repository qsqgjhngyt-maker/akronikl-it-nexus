export const DOCUMENT=/\.(?:pdf|docx|xlsx|pptx)$/iu;
const TEXT=/\.(?:txt|md|csv|json|log|ya?ml|xml|html?|css|js|mjs|ts|tsx|jsx|py|c|h|cpp|hpp|cc|cs|java|rs|go|sql|sh|ps1)$/iu;
export function imageCapable({providerId,modelId}){
 return providerId==='qwen'&&/^(?:qwen3\.[5-8]-(?:plus|flash|max)|qwen3-vl-)/u.test(modelId)||providerId==='openai'&&/^(?:gpt-[456]|o[34])/u.test(modelId)||providerId==='anthropic'&&/^claude-/u.test(modelId)||providerId==='gemini'&&/^gemini-/u.test(modelId);
}
export function validateAttachment(value){
 if(!value||Object.keys(value).sort().join(',')!=='data,mime,name,type'||typeof value.name!=='string'||!value.name||value.name.length>120||/[\x00-\x1f\\/]/u.test(value.name)||typeof value.data!=='string')throw Error('CHAT_ATTACHMENT_INVALID');
 if(value.type==='text'){if(!(TEXT.test(value.name)||DOCUMENT.test(value.name))||DOCUMENT.test(value.name)&&!/^(?:Extracted document text\.|TEXT ONLY,|All \d+ pages rendered)/u.test(value.data)||value.mime!=='text/plain'||value.data.length>64000||value.data.includes('\0'))throw Error('CHAT_ATTACHMENT_INVALID');}
 else if(value.type==='image'){if(!['image/png','image/jpeg','image/webp'].includes(value.mime)||value.data.length>1400000||value.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/u.test(value.data))throw Error('CHAT_ATTACHMENT_INVALID');const head=value.data.slice(0,16);if(!(value.mime==='image/png'&&head.startsWith('iVBORw0KGgo')||value.mime==='image/jpeg'&&head.startsWith('/9j/')||value.mime==='image/webp'&&head.startsWith('UklGR')))throw Error('CHAT_ATTACHMENT_INVALID');}
 else throw Error('CHAT_ATTACHMENT_INVALID');return structuredClone(value);
}
export async function readChatAttachment(file,{imageAllowed=false,signal}={}){
 if(!file||file.size>6*1024*1024)throw Error('CHAT_FILE_TOO_LARGE');const name=file.name.replace(/[\x00-\x1f\\/]/gu,'_').slice(0,120);
 signal?.throwIfAborted();if(DOCUMENT.test(name)){const {readDocument}=await import('./document-readers.js');const parts=await readDocument(file,{imageAllowed,signal});signal?.throwIfAborted();return parts.map(a=>validateAttachment({...a,name:a.name.replace(/[\x00-\x1f\\/]/gu,'_').slice(0,120)}));}
 if(['image/png','image/jpeg','image/webp'].includes(file.type)){
  if(!imageAllowed)throw Error('CHAT_IMAGE_UNSUPPORTED');const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,1536/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.85).split(',')[1];return validateAttachment({name,type:'image',mime:'image/jpeg',data});}finally{bitmap.close();}
 }
 if(!TEXT.test(name)||file.size>128000)throw Error('CHAT_FORMAT_UNSUPPORTED');let data;try{data=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());}catch{throw Error('CHAT_TEXT_UTF8_REQUIRED');}return validateAttachment({name,type:'text',mime:'text/plain',data});
}
