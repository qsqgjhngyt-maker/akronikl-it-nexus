// Файлы принадлежат только одному запуску. Нет доступа к host/Cloud/storage.
import {MODERN_CPP_LIMITS as limits} from './runtime-assets.js';
const encoder=new TextEncoder();
const failure=(code,message)=>Object.assign(Error(message),{code,anxProviderLimit:true});
export function runtimeFilePath(value){
 const path=String(value??'');
 if(!path||path.length>256||path.startsWith('/')||/[\\\x00-\x1f:]/.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..')||['__proto__','prototype','constructor','.runno'].some(p=>path.split('/').includes(p)))throw failure('WASM_FILE_PATH_INVALID','Use a relative project file path without traversal.');
 return path;
}
export const runtimeFileBytes=value=>typeof value==='string'?encoder.encode(value):value instanceof Uint8Array?value:new Uint8Array();
export function runtimeInputFiles(files={}){
 const fs=Object.create(null);let total=0;
 if(Object.keys(files).length>limits.maxRuntimeFiles)throw failure('WASM_FILE_QUOTA','Too many project files.');
 for(const [name,content]of Object.entries(files)){
  const path=runtimeFilePath(name),bytes=runtimeFileBytes(content);total+=bytes.length;
  if(bytes.length>limits.maxRuntimeFileBytes||total>limits.maxTotalInputBytes)throw failure('WASM_FILE_QUOTA','Project files exceed the runtime file quota.');
  fs['/'+path]={path:'/'+path,mode:'binary',content:bytes.slice(),timestamps:{access:new Date(0),change:new Date(0),modification:new Date(0)}};
 }
 return fs;
}
export function runtimeOutputFiles(fs={},input={}){
 const files=Object.create(null);let total=0,count=0;
 for(const [absolute,file]of Object.entries(fs)){
  const bytes=runtimeFileBytes(file.content);
  total+=bytes.length;if(++count>limits.maxRuntimeFiles||bytes.length>limits.maxRuntimeFileBytes||total>limits.maxTotalInputBytes)throw failure('WASM_FILE_QUOTA','Runtime files exceed the result quota.');
  if(absolute.endsWith('/.runno'))continue; // Внутренний marker каталога Runno, не пользовательский файл.
  const path=runtimeFilePath(absolute.replace(/^\//,''));
  const old=Object.hasOwn(input,path)?runtimeFileBytes(input[path]):null;
  if(old&&bytes.length===old.length&&bytes.every((v,i)=>v===old[i]))continue;
  try{files[path]=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{files[path]=bytes.slice()}
 }
 return files;
}
// Quotas проверяются ДО потенциальных JS allocations внутри закреплённого WASI.
export function guardRuntimeFileImports(imports,memory,files={}){
 const sizes=new Map(Object.entries(files).map(([p,v])=>[p,runtimeFileBytes(v).length])),fds=new Map([[3,{path:'',directory:true,position:0}]]);
 let written=0;
 const quota=()=>{throw failure('WASM_FILE_QUOTA','Runtime file size, count or write quota exceeded.');};
 const size=(path,next)=>{const total=[...sizes.values()].reduce((a,b)=>a+b,0)-(sizes.get(path)||0)+next;if(!Number.isSafeInteger(next)||next<0||next>limits.maxRuntimeFileBytes||total>limits.maxTotalInputBytes)quota()};
 const view=()=>new DataView(memory().buffer);
 const wrap=(name,fn)=>{if(typeof imports[name]==='function'){const original=imports[name];imports[name]=(...args)=>fn(original,args)}};
 const filePath=(fd,ptr,len)=>{const base=fds.get(fd);if(!base?.directory)return null;try{const p=new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(memory().buffer,ptr,len));if(p==='.')return base.path;return runtimeFilePath((base.path?base.path+'/':'')+runtimeFilePath(p))}catch{return null}};
 wrap('path_open',(run,a)=>{
  const path=filePath(a[0],a[2],a[3]);if(path===null)return 63; // EPERM
  const directory=!!(a[4]&2),create=!!(a[4]&1),truncate=!!(a[4]&8);
  if(create&&!sizes.has(path)&&sizes.size>=limits.maxRuntimeFiles)quota();
  const code=run(...a);if(code===0){const fd=view().getUint32(a[8],true);fds.set(fd,{path,directory,append:!!(a[7]&1),position:0});if(!directory&&(!sizes.has(path)||truncate))sizes.set(path,0)}return code;
 });
 wrap('path_create_directory',(run,a)=>{const path=filePath(a[0],a[1],a[2]);if(!path)return 63;const marker=path+'/.runno';if(!sizes.has(marker)&&sizes.size>=limits.maxRuntimeFiles)quota();const code=run(...a);if(code===0)sizes.set(marker,0);return code});
 const write=(run,a,positional)=>{
  const fd=fds.get(a[0]);if(a[0]<3||!fd||fd.directory)return run(...a);
  if(a[2]>1024)quota();const v=view();let bytes=0;for(let i=0;i<a[2];i++)bytes+=v.getUint32(a[1]+8*i+4,true);
  const position=positional?Number(a[3]):fd.append?(sizes.get(fd.path)||0):fd.position;
  const next=Math.max(sizes.get(fd.path)||0,position+bytes);size(fd.path,next);if(written+bytes>limits.maxRuntimeWriteBytes)quota();
  const code=run(...a);if(code===0){const actual=view().getUint32(a[positional?4:3],true);written+=actual;sizes.set(fd.path,Math.max(sizes.get(fd.path)||0,position+actual));if(!positional)fd.position=position+actual}return code;
 };
 wrap('fd_write',(run,a)=>write(run,a,false));wrap('fd_pwrite',(run,a)=>write(run,a,true));
 wrap('fd_seek',(run,a)=>{const code=run(...a),fd=fds.get(a[0]);if(code===0&&fd){const next=Number(view().getBigUint64(a[3],true));if(next>limits.maxRuntimeFileBytes)quota();fd.position=next}return code});
 wrap('fd_filestat_set_size',(run,a)=>{const fd=fds.get(a[0]);if(fd)size(fd.path,Number(a[1]));const code=run(...a);if(code===0&&fd)sizes.set(fd.path,Number(a[1]));return code});
 wrap('fd_allocate',(run,a)=>{const fd=fds.get(a[0]),next=Number(a[1])+Number(a[2]);if(!fd||fd.directory)return 8;size(fd.path,Math.max(sizes.get(fd.path)||0,next));if(written+Number(a[2])>limits.maxRuntimeWriteBytes)quota();const code=run(...a);if(code===0){written+=Number(a[2]);sizes.set(fd.path,Math.max(sizes.get(fd.path)||0,next))}return code});
 wrap('fd_renumber',(run,a)=>{const old=fds.get(a[0]),code=run(...a);if(code===0){fds.delete(a[0]);if(old)fds.set(a[1],old)}return code});
 wrap('fd_close',(run,a)=>{const code=run(...a);if(code===0)fds.delete(a[0]);return code});
 // Удаление и перемещение файлов проекта требуют отдельного UX/контракта.
 for(const name of ['path_link','path_symlink','path_rename','path_unlink_file','path_remove_directory'])if(imports[name])imports[name]=()=>58; // ENOTSUP
 return imports;
}

export function showRuntimeFileResults({output,result,request,studio,locale='ru',current=()=>output.isConnected}){
 const entries=Object.entries(result.outputFiles||{});if(!entries.length||result.exitCode!==0||!output.isConnected)return;
 const en=locale==='en',panel=document.createElement('section');panel.className='runtime-file-results';panel.dataset.runtimeFiles='';
 const heading=document.createElement('p');heading.textContent=en?'Files produced by this run':'Файлы, полученные при запуске';panel.append(heading);
 for(const [name,content]of entries){runtimeFilePath(name);const row=document.createElement('p'),label=document.createElement('span'),button=document.createElement('button');label.textContent=name+' ('+runtimeFileBytes(content).length+' B) ';button.type='button';button.className='btn';button.textContent=en?'Download':'Скачать';button.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([content],{type:'application/octet-stream'})),link=document.createElement('a');link.href=url;link.download=name.split('/').at(-1);link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});row.append(label,button);panel.append(row)}
 const note=document.createElement('p');note.setAttribute('role','status');note.textContent=en?'Project files stay unchanged until you save these results.':'Файлы проекта изменятся только после сохранения результатов.';
 const save=document.createElement('button');save.type='button';save.className='btn';save.dataset.saveRuntimeFiles='';save.textContent=en?'Save result files to project':'Сохранить файлы результата в проект';save.disabled=!studio?.applyRuntimeFiles;
 save.addEventListener('click',()=>{try{if(!current()||!output.contains(panel))throw Error('RUNTIME_FILE_CONTEXT_CHANGED');studio.applyRuntimeFiles(result.outputFiles,request.files||{});save.disabled=true;note.textContent=en?'Result files saved in this workspace.':'Файлы результата сохранены в этой рабочей области.'}catch{note.textContent=en?'Files changed or cannot be saved as text. Download the results or run again.':'Файлы изменились или не поддерживают сохранение как текст. Скачайте результаты или запустите программу заново.'}});
 panel.append(note,save);output.append(panel);
}
