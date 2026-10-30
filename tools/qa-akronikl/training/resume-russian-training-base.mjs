// Resume the failed, hash-pinned checkpoint download without replacing its logs.
import {readFile,writeFile,open,rename,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const metadata=JSON.parse(await readFile('evidence/CHECKPOINT_CANDIDATES.json','utf8'));
const entry=metadata.candidates.find(x=>x.voice==='dmitri').files.find(x=>x.path.endsWith('.ckpt'));
const url='https://huggingface.co/datasets/rhasspy/piper-checkpoints/resolve/'+metadata.revision+'/'+entry.path;
const directory=path.resolve('dependencies/training-base-dmitri'),partSize=Math.ceil(entry.size/8);
const progress={status:'RESUMING_PINNED_DOWNLOAD',total:entry.size,parts:[],failures:[],startedAt:new Date().toISOString()};
const save=()=>writeFile('evidence/RUSSIAN_BASE_RESUME_PROGRESS.json',JSON.stringify(progress,null,2)+'\n');
const length=async file=>{try{return(await stat(file)).size;}catch(e){if(e.code==='ENOENT')return 0;throw e;}};
if(await length(path.join(directory,'base.ckpt')))throw Error('REFUSE_BASE_OVERWRITE');
async function part(i){
 const first=i*partSize,last=Math.min(entry.size-1,first+partSize-1),size=last-first+1;
 const file=path.join(directory,'part-'+String(i).padStart(2,'0')),partial=file+'.partial';
 if(await length(file)===size){progress.parts[i]={complete:true,bytes:size};return;}
 for(let attempt=1;attempt<=6;attempt++){
  let bytes=await length(partial);if(bytes>size)throw Error('EXISTING_RANGE_TOO_LARGE');
  if(bytes===size){await rename(partial,file);progress.parts[i]={complete:true,bytes};await save();return;}
  let handle;
  try{
   const start=first+bytes;
   const response=await fetch(url,{headers:{Range:`bytes=${start}-${last}`},signal:AbortSignal.timeout(900000)});
   if(response.status!==206||response.headers.get('content-range')!==`bytes ${start}-${last}/${entry.size}`){await response.body?.cancel();throw Error('SERVER_RANGE_NOT_HONORED_'+response.status);}
   handle=await open(partial,'a');
   for await(const chunk of response.body){if(bytes+chunk.length>size)throw Error('RANGE_TOO_LARGE');let offset=0;while(offset<chunk.length){const written=await handle.write(chunk,offset,chunk.length-offset);offset+=written.bytesWritten;}bytes+=chunk.length;progress.parts[i]={complete:false,bytes,attempt};}
   await handle.close();handle=null;if(bytes!==size)throw Error('INCOMPLETE_RANGE');
   await rename(partial,file);progress.parts[i]={complete:true,bytes,attempt};await save();return;
  }catch(e){await handle?.close();progress.failures.push({part:i,attempt,bytes:await length(partial),error:String(e),cause:String(e.cause||'')});await save();if(attempt===6)throw e;await new Promise(r=>setTimeout(r,1000*attempt));}
 }
}
await save();
const timer=setInterval(()=>{save().catch(()=>{});},5000);
try{
 // Four connections are gentler than the failed eight-connection transfer.
 let next=0;await Promise.all(Array.from({length:4},async()=>{while(next<8){const i=next++;await part(i);}}));
 clearInterval(timer);const target=path.join(directory,'base.ckpt'),output=await open(target+'.partial','wx'),hash=createHash('sha256');let bytes=0;
 try{for(let i=0;i<8;i++)for await(const chunk of createReadStream(path.join(directory,'part-'+String(i).padStart(2,'0')))){hash.update(chunk);bytes+=chunk.length;let offset=0;while(offset<chunk.length){const written=await output.write(chunk,offset,chunk.length-offset);offset+=written.bytesWritten;}}}finally{await output.close();}
 const actual=hash.digest('hex');if(bytes!==entry.size||actual!==entry.lfs.oid)throw Error('RUSSIAN_BASE_HASH_INVALID');await rename(target+'.partial',target);
 const proof={status:'OFFICIAL_CHECKPOINT_SHA256_VERIFIED',voice:'dmitri',source:url,revision:metadata.revision,bytes,sha256:actual,weightsRepositoryLicense:'MIT as published',targetDatasetLicense:'CC0 per MODEL_CARD',lineage:'MODEL_CARD states fine-tuned from English Lessac medium; retain this provenance for distribution review before an official release.',usedInProduction:false};
 await writeFile('evidence/TRAIN_BASE_DMITRI.json',JSON.stringify(proof,null,2)+'\n');progress.status='VERIFIED';await save();console.log(JSON.stringify(proof));
}catch(e){clearInterval(timer);progress.status='FAIL';progress.failure=String(e);await save();throw e;}
