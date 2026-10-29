import {open,realpath,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzip} from 'node:zlib';
import {promisify} from 'node:util';

const compress=promisify(gzip),fail=(code,status=503)=>Object.assign(Error(code),{code,status});
export const ARTIFACT_LIMITS=Object.freeze({fileBytes:64*1024*1024,active:4,activePerJob:2,bufferBytes:192*1024*1024,requestsPerJobMinute:120,bytesPerJobMinute:128*1024*1024,bytesPerMinute:512*1024*1024,sendTimeoutMs:180000});
const known=/^(?:program\.(?:js|wasm|data)|qtloader\.js|qtlogo\.svg)$/;
export function artifactRecord(artifacts,name){
 if(!known.test(name))throw fail('STUDIO_NOT_FOUND',404);
 const rows=artifacts?.filter(a=>a.name===name);
 if(!rows?.length)throw fail('STUDIO_NOT_FOUND',404);
 const a=rows[0];
 if(rows.length!==1||!Number.isSafeInteger(a.bytes)||a.bytes<0||a.bytes>ARTIFACT_LIMITS.fileBytes||!/^[a-f0-9]{64}$/.test(a.sha256||''))throw fail('STUDIO_ARTIFACT_INVALID');
 return a;
}

// Проверяем ровно тот буфер, который отправим. После проверки замена файла на диске
// не может подменить содержимое ответа; oversized/growing files не читаются без границы.
export async function verifiedArtifact(directory,record){
 artifactRecord([record],record?.name);
 let handle;
 try{
  const base=await realpath(directory),file=path.join(base,record.name);
  if(!(await lstat(file)).isFile()||await realpath(file)!==file)throw fail('STUDIO_ARTIFACT_INVALID');
  handle=await open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  const stat=await handle.stat();
  if(!stat.isFile()||stat.size!==record.bytes||stat.nlink!==1)throw fail('STUDIO_ARTIFACT_INVALID');
  const bytes=Buffer.alloc(record.bytes);let offset=0;
  while(offset<bytes.length){const r=await handle.read(bytes,offset,bytes.length-offset,offset);if(!r.bytesRead)throw fail('STUDIO_ARTIFACT_INVALID');offset+=r.bytesRead;}
  if((await handle.read(Buffer.alloc(1),0,1,offset)).bytesRead||createHash('sha256').update(bytes).digest('hex')!==record.sha256)throw fail('STUDIO_ARTIFACT_INVALID');
  return bytes;
 }catch(e){if(e.code==='STUDIO_ARTIFACT_INVALID')throw e;throw fail('STUDIO_ARTIFACT_UNAVAILABLE');}
 finally{await handle?.close();}
}

export function createArtifactDelivery({limits={},now=()=>Date.now()}={}){
 const cap={...ARTIFACT_LIMITS,...limits};let active=0,buffered=0,windowStart=now(),minuteBytes=0;
 const jobs=new Map();
 function reserve(id,bytes){
  const time=now();if(time-windowStart>=60000){windowStart=time;minuteBytes=0;for(const[key,j]of jobs)if(!j.active)jobs.delete(key);}
  let j=jobs.get(id);if(!j){j={active:0,requests:0,bytes:0,window:windowStart};jobs.set(id,j)}
  if(j.window!==windowStart){j.requests=0;j.bytes=0;j.window=windowStart;}
  const memory=2*bytes+256*1024;
  if(active>=cap.active||j.active>=cap.activePerJob||buffered+memory>cap.bufferBytes)throw fail('STUDIO_DOWNLOAD_BUSY',429);
  if(j.requests>=cap.requestsPerJobMinute||j.bytes+bytes>cap.bytesPerJobMinute||minuteBytes+bytes>cap.bytesPerMinute)throw fail('STUDIO_DOWNLOAD_LIMIT',429);
  j.active++;j.requests++;j.bytes+=bytes;active++;buffered+=memory;minuteBytes+=bytes;let released=false;
  return()=>{if(released)return;released=true;j.active--;active--;buffered-=memory;};
 }
 async function send(req,res,bytes,headers){
  if(res.destroyed)throw fail('STUDIO_DOWNLOAD_CANCELLED',499);
  let body=bytes;const accept=String(req.headers['accept-encoding']||'');
  // Не игнорируем q=0. Brotli пока не предлагаем: gzip уже ограничен памятью/слотами.
  const encodings=accept.split(',').map(s=>s.trim().split(';').map(t=>t.trim()));
  const gzipAllowed=encodings.some(([name,...params])=>name.toLowerCase()==='gzip'&&!params.some(p=>/^q\s*=\s*0(?:\.0*)?$/i.test(p)));
  if(gzipAllowed&&bytes.length>=1024){body=await compress(bytes,{level:6,maxOutputLength:bytes.length+128*1024});headers={...headers,'content-encoding':'gzip'};}
  if(res.destroyed)throw fail('STUDIO_DOWNLOAD_CANCELLED',499);
  res.writeHead(200,{...headers,'content-length':body.length,vary:'Accept-Encoding'});
  if(typeof res.once!=='function'){res.end(body);return;}
  // Держим лимит до finish/close, а не только до res.end: медленный клиент
  // иначе мог бы удерживать много уже проверенных буферов вне квоты.
  await new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);res.removeListener('finish',done);res.removeListener('close',done);res.removeListener('error',done);resolve()};res.once('finish',done);res.once('close',done);res.once('error',done);timer=setTimeout(()=>{res.destroy();done()},cap.sendTimeoutMs);timer.unref?.();res.end(body);});
 }
 return{async guard(id,bytes,action){const release=reserve(id,bytes);try{return await action()}finally{release()}},send,activeJobs:()=>new Set([...jobs].filter(([,j])=>j.active).map(([id])=>id)),stats:()=>({active,buffered})};
}
