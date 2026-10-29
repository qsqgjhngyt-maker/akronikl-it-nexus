import{open,rename,unlink,stat,statfs,lstat,realpath}from'node:fs/promises';import path from'node:path';import{randomUUID}from'node:crypto';
const fail=(code,status=507)=>Object.assign(Error(code),{code,status});
export const STORAGE_LIMITS=Object.freeze({sourceBytes:8*1024**3,accountSourceBytes:1024**3,artifactBytes:512*1024**2,artifactRetentionMs:24*3600000,minimumFreeBytes:512*1024**2,records:20000,metadataReserve:256*1024});
export async function durableJSON(file,value,{exclusive=false}={}){
 const temp=file+'.'+randomUUID()+'.tmp';let handle;
 try{handle=await open(exclusive?file:temp,'wx',0o600);await handle.writeFile(JSON.stringify(value));await handle.sync();await handle.close();handle=null;if(!exclusive)await rename(temp,file);
  // fsync каталога поддерживается Linux; Windows не позволяет open directory.
  if(process.platform!=='win32'){const dir=await open(path.dirname(file),'r');try{await dir.sync()}finally{await dir.close()}}
 }catch(e){await handle?.close().catch(()=>{});if(!exclusive)await unlink(temp).catch(()=>{});throw e;}
}
export async function createStudioStorage({root,jobs,limits={},now=()=>Date.now()}={}){
 const cap={...STORAGE_LIMITS,...limits},owners=new Map();let used=0,reserved=0;
 const charge=(owner,bytes)=>{used+=bytes;owners.set(owner,(owners.get(owner)||0)+bytes)};
 for(const j of jobs.values()){let size=0;try{size=(await stat(path.join(root,j.id,'snapshot.json'))).size}catch{}charge(j.owner,size+cap.metadataReserve);}
 async function reserve(owner,bytes){
  const cost=bytes+cap.metadataReserve;
  // Резервируем синхронно до первого await, чтобы параллельные POST не обходили квоту.
  if(jobs.size+reserved>=cap.records||used+cost>cap.sourceBytes||(owners.get(owner)||0)+cost>cap.accountSourceBytes)throw fail('STUDIO_SOURCE_QUOTA',429);
  reserved++;charge(owner,cost);let held=true;
  const release=()=>{if(held){held=false;reserved--;charge(owner,-cost)}};
  try{const disk=await statfs(root);if(Number(disk.bavail)*Number(disk.bsize)<cap.minimumFreeBytes+cost)throw fail('STUDIO_DISK_RESERVE');}
  catch(e){release();if(e.code==='STUDIO_DISK_RESERVE')throw e;throw fail('STUDIO_STORAGE_UNAVAILABLE')}
  return{commit(){if(held){held=false;reserved--}},release};
 }
 async function trimArtifacts({persist,pinned=new Set()}={}){
  const rows=[...jobs.values()].filter(j=>j.kind==='build'&&j.mode==='qt-wasm'&&j.result?.artifacts?.length&&!j.artifactsEvictedAt&&j.finishedAt).map(j=>({j,size:j.result.artifacts.reduce((n,a)=>n+(Number.isSafeInteger(a.bytes)?a.bytes:0),0)})).sort((a,b)=>Date.parse(a.j.finishedAt)-Date.parse(b.j.finishedAt));
  let total=rows.reduce((n,r)=>n+r.size,0),evicted=0;
  for(const{j,size}of rows){if(pinned.has(j.id)||j.preview?.expiresAt>now())continue;if(total<=cap.artifactBytes&&now()-Date.parse(j.finishedAt)<cap.artifactRetentionMs)continue;
   const directory=path.resolve(root,j.id,'execution/output'),expected=path.join(await realpath(root),j.id,'execution','output');
   try{
    if(await realpath(directory)!==expected)throw fail('STUDIO_CACHE_PATH_INVALID');
    // Удаляется только известный восстанавливаемый output. snapshot/job/review и
    // файлы проекта не затрагиваются. Symlink не разрешает уход из store.
    for(const a of j.result.artifacts){if(!/^(?:program\.(?:js|wasm|data)|qtloader\.js|qtlogo\.svg)$/.test(a.name))throw fail('STUDIO_CACHE_PATH_INVALID');const file=path.join(directory,a.name);try{const s=await lstat(file);if(s.isDirectory())throw fail('STUDIO_CACHE_PATH_INVALID');await unlink(file)}catch(e){if(e.code!=='ENOENT')throw e}}
   }catch(e){if(e.code!=='ENOENT')throw e;}
   const next={...j,preview:null,artifactsEvictedAt:new Date(now()).toISOString()};await persist(next);Object.assign(j,next);total-=size;evicted++;
  }
  return{cachedBytes:total,evicted};
 }
 return{reserve,trimArtifacts,usage:owner=>({sourceBytesCharged:owners.get(owner)||0,accountSourceLimit:cap.accountSourceBytes,maxRecords:cap.records}),limits:cap};
}
