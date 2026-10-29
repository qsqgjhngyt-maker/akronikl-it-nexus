import{validateProjectWorkspace}from'./project-transfer.js';
import{createProjectBuildPlan}from'./project-build.js';
const encoder=new TextEncoder(),crcTable=Uint32Array.from({length:256},(_,i)=>{for(let k=0;k<8;k++)i=i&1?0xedb88320^(i>>>1):i>>>1;return i>>>0});
const crc=bytes=>{let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0};
const cat=chunks=>{const out=new Uint8Array(chunks.reduce((n,b)=>n+b.length,0));let p=0;for(const b of chunks){out.set(b,p);p+=b.length}return out};
const cmakeArg=s=>{if(/[;$]/.test(s))throw Error('PORTABLE_CMAKE_PATH_UNSUPPORTED');let n='=';while(s.includes(']'+n+']'))n+='=';return'['+n+'['+s+']'+n+']'};
export function portableSourceFiles(project){
 const workspace=validateProjectWorkspace(project.workspace),files=Object.fromEntries(workspace.files.map(f=>[f.path,f.content]));
 if(!Object.hasOwn(files,'CMakeLists.txt')){const plan=createProjectBuildPlan({...project,workspace},'run');if(!plan.translationUnits.length)throw Error('PORTABLE_NO_SOURCES');files['CMakeLists.txt']='cmake_minimum_required(VERSION 3.16)\nproject(NexusProject LANGUAGES CXX)\nset(CMAKE_CXX_STANDARD 20)\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\nadd_executable(program\n'+plan.translationUnits.map(x=>' '+cmakeArg(x)).join('\n')+'\n)\n'+(plan.includeRoots.length?'target_include_directories(program PRIVATE '+plan.includeRoots.map(cmakeArg).join(' ')+')\n':'');}
 if(!Object.hasOwn(files,'README.md'))files['README.md']='# C++20 project\n\nAdditional external build:\n\n    cmake -S . -B build\n    cmake --build build\n\nNexus account/session is not required. Source files are preserved.\n';
 return files;
}
export function portableProjectArchive(project){
 const entries=Object.entries(portableSourceFiles(project)).sort(([a],[b])=>a<b?-1:a>b?1:0),local=[],central=[];let offset=0;
 for(const[name,text]of entries){const file=encoder.encode(name),data=encoder.encode(text),c=crc(data),h=new Uint8Array(30),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,c,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,file.length,true);local.push(h,file,data);
  const z=new Uint8Array(46),w=new DataView(z.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(14,33,true);w.setUint32(16,c,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,file.length,true);w.setUint32(42,offset,true);central.push(z,file);offset+=h.length+file.length+data.length;
 }
 const c=cat(central),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,c.length,true);v.setUint32(16,offset,true);return cat([...local,c,end]);
}
export function downloadPortableProject(project){const bytes=portableProjectArchive(project),url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'})),a=document.createElement('a');a.href=url;a.download=(String(project.title||'project').replace(/[^\p{L}\p{N}._-]+/gu,'-').slice(0,80)||'project')+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return bytes;}
