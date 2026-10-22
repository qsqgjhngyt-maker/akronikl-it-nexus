import {createHash,randomUUID} from 'node:crypto';
import {MEDIA_PARTS_PATH,PUBLIC_MEDIA_PARTS_PATH,PART_CHARS,MAX_ENVELOPE,exact,uuid,digestId,validMeta,metaOf,partLength,jpegSizeMatches} from '../media-parts-contract.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
export class MediaPartsError extends Error{constructor(code='CONTENT_MEDIA_PARTS_REJECTED',status=502){super(code);this.name='MediaPartsError';this.code=code;this.status=status}}
const reject=()=>{throw new MediaPartsError()};
function scope(envelope,rpc,signal){
 const controller=new AbortController(),combined=AbortSignal.any([signal||AbortSignal.timeout(12000),controller.signal]);
 return {signal:combined,async call(payload,path=MEDIA_PARTS_PATH){
  combined.throwIfAborted();
  const result=await rpc({...envelope,path,method:'POST',payload},{signal:combined,limit:MAX_ENVELOPE});
  combined.throwIfAborted();return result;
 },async pool(indices,fn){
  let next=0,firstError;
  const run=async()=>{try{while(next<indices.length){combined.throwIfAborted();const i=indices[next++];await fn(i)}}catch(e){firstError??=e;controller.abort();throw e}};
  await Promise.allSettled(Array.from({length:Math.min(2,indices.length)},run));
  if(firstError)throw firstError;
 }};
}
export async function uploadPhotoParts(envelope,rpc,{signal}={}){
 const p=envelope.payload,m=p?.content;
 if(!exact(p,['requestId','target','id','slug','version','action','content'])||!uuid(p.requestId)||!uuid(p.id)||p.target!=='media'||p.action!=='upload'||p.slug!==''||p.version!==0||!exact(m,['id','mime','data','width','height'])||typeof m.data!=='string')throw new MediaPartsError('INVALID_INPUT',400);
 const meta=metaOf(m);if(!validMeta(meta)||Buffer.from(m.data,'base64').toString('base64')!==m.data||sha(Buffer.from(m.data,'base64'))!==m.id)throw new MediaPartsError('INVALID_INPUT',400);
 const s=scope(envelope,rpc,signal),uploadId=randomUUID();
 const begin=await s.call({requestId:randomUUID(),phase:'begin',uploadId,originalRequestId:p.requestId,externalId:p.id,meta});
 if(!exact(begin,['ok','uploadId','meta'])||begin.ok!==true||begin.uploadId!==uploadId||!sameMeta(begin.meta,meta))reject();
 await s.pool(Array.from({length:meta.totalParts},(_,i)=>i),async index=>{
  const data=m.data.slice(index*PART_CHARS,(index+1)*PART_CHARS),digest=sha(data);
  const r=await s.call({requestId:randomUUID(),phase:'part',uploadId,index,data,sha256:digest});
  if(!exact(r,['ok','uploadId','index','sha256'])||r.ok!==true||r.uploadId!==uploadId||r.index!==index||r.sha256!==digest)reject();
 });
 // Нет автоматического retry/abort после неопределённого результата commit: TTL освободит reservation.
 const result=await s.call({requestId:randomUUID(),phase:'commit',uploadId,sha256:m.id});
 if(!exact(result,['ok','media'])||result.ok!==true||!exact(result.media,['id','mime','width','height'])||result.media.id!==m.id||result.media.mime!==m.mime||result.media.width!==m.width||result.media.height!==m.height)reject();
 return result;
}
const sameMeta=(a,b)=>validMeta(a)&&Object.keys(b).every(k=>a[k]===b[k]);
export async function readPhotoParts(envelope,mediaId,rpc,{publishedOnly=false,signal}={}){
 if(!digestId(mediaId))throw new MediaPartsError('INVALID_INPUT',400);
 const s=scope(envelope,rpc,signal),path=publishedOnly?PUBLIC_MEDIA_PARTS_PATH:MEDIA_PARTS_PATH,parts=[];
 let meta;
 const read=async index=>{
  const result=await s.call({requestId:randomUUID(),phase:'read',mediaId,index},path),p=result?.part;
  if(!exact(result,['part'])||!exact(p,['meta','index','data','sha256'])||!validMeta(p.meta)||p.meta.id!==mediaId||p.index!==index||typeof p.data!=='string'||p.data.length!==partLength(p.meta.encodedLength,index)||!digestId(p.sha256)||sha(p.data)!==p.sha256||Buffer.from(p.data,'base64').toString('base64')!==p.data||index<p.meta.totalParts-1&&p.data.includes('='))reject();
  if(meta&&!sameMeta(p.meta,meta))reject();meta??=p.meta;parts[index]=p.data;
 };
 await read(0);
 await s.pool(Array.from({length:meta.totalParts-1},(_,i)=>i+1),read);
 const data=parts.join(''),bytes=Buffer.from(data,'base64');
 if(data.length!==meta.encodedLength||bytes.length!==meta.bytes||bytes.toString('base64')!==data||sha(bytes)!==mediaId||!jpegSizeMatches(bytes,meta.width,meta.height))reject();
 return {media:{id:mediaId,mime:meta.mime,data,width:meta.width,height:meta.height}};
}
