const normalizePath=value=>{
  const raw=String(value||'').trim().replace(/\\/g,'/').replace(/^\.\//,'');
  if(!raw)return'main.cpp';
  const parts=[];
  for(const part of raw.split('/')){
    if(!part||part==='.')continue;
    if(part==='..'){parts.pop();continue}
    parts.push(part.replace(/[\0<>:"|?*]/g,'_'));
  }
  return parts.join('/')||'main.cpp';
};

const inferLanguageFromPath=path=>{
  const ext=(String(path).split('.').pop()||'').toLowerCase();
  if(['cc','cpp','cxx','c++','hpp','hh','hxx','h++'].includes(ext))return'cpp';
  if(ext==='c'||ext==='h')return'c';
  if(ext==='py')return'python';
  if(['js','mjs','cjs'].includes(ext))return'javascript';
  if(['ts','tsx'].includes(ext))return'typescript';
  if(ext==='rs')return'rust';
  if(ext==='go')return'go';
  if(ext==='java')return'java';
  if(ext==='cs')return'csharp';
  return null;
};

export function createCodeWorkspace({languageId='cpp',entryFile='main.cpp',files=null}={}){
  const map=new Map();
  const listeners=new Set();
  const safeEntry=normalizePath(entryFile);
  const seed=Array.isArray(files)&&files.length?files:[{path:safeEntry,content:''}];
  for(const item of seed){
    const path=normalizePath(item?.path||safeEntry);
    map.set(path,{path,content:String(item?.content??''),languageId:item?.languageId||inferLanguageFromPath(path)||languageId,readOnly:Boolean(item?.readOnly)});
  }
  if(!map.has(safeEntry))map.set(safeEntry,{path:safeEntry,content:'',languageId,readOnly:false});
  let activeFile=safeEntry;
  let revision=0;
  const emit=(type,payload={})=>{revision++;const snapshot=api.snapshot();for(const fn of listeners)fn({type,payload,revision,snapshot})};
  const get=path=>map.get(normalizePath(path));
  const api={
    get languageId(){return languageId},
    get entryFile(){return safeEntry},
    get activeFile(){return activeFile},
    get revision(){return revision},
    listFiles(){return [...map.values()].map(file=>({...file}))},
    getFile(path=activeFile){const file=get(path);return file?{...file}:null},
    hasFile(path){return map.has(normalizePath(path))},
    addFile(path,content='',options={}){
      const safe=normalizePath(path);
      if(map.has(safe))throw new Error(`Workspace file already exists: ${safe}`);
      map.set(safe,{path:safe,content:String(content),languageId:options.languageId||inferLanguageFromPath(safe)||languageId,readOnly:Boolean(options.readOnly)});
      emit('file-added',{path:safe});return api.getFile(safe);
    },
    removeFile(path){
      const safe=normalizePath(path);
      if(safe===safeEntry)throw new Error('The workspace entry file cannot be removed.');
      const removed=map.delete(safe);if(!removed)return false;
      if(activeFile===safe)activeFile=safeEntry;
      emit('file-removed',{path:safe});return true;
    },
    renameFile(path,nextPath){
      const safe=normalizePath(path),next=normalizePath(nextPath);const file=map.get(safe);
      if(!file)throw new Error(`Workspace file not found: ${safe}`);
      if(map.has(next)&&next!==safe)throw new Error(`Workspace file already exists: ${next}`);
      if(safe===safeEntry)throw new Error('The workspace entry file cannot be renamed in this foundation release.');
      map.delete(safe);map.set(next,{...file,path:next,languageId:inferLanguageFromPath(next)||file.languageId});
      if(activeFile===safe)activeFile=next;
      emit('file-renamed',{from:safe,to:next});return api.getFile(next);
    },
    setActiveFile(path){const safe=normalizePath(path);if(!map.has(safe))throw new Error(`Workspace file not found: ${safe}`);activeFile=safe;emit('active-file',{path:safe});return api.getFile(safe)},
    updateFile(path,content){
      const safe=normalizePath(path),file=map.get(safe);if(!file)throw new Error(`Workspace file not found: ${safe}`);if(file.readOnly)throw new Error(`Workspace file is read-only: ${safe}`);
      const next=String(content??'');if(file.content===next)return api.getFile(safe);
      map.set(safe,{...file,content:next});emit('file-updated',{path:safe});return api.getFile(safe);
    },
    setActiveContent(content){return api.updateFile(activeFile,content)},
    subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn)},
    snapshot(){return{languageId,entryFile:safeEntry,activeFile,revision,files:[...map.values()].map(file=>({...file}))}},
    serialize(){return JSON.stringify(api.snapshot())}
  };
  return api;
}

export {normalizePath as normalizeWorkspacePath,inferLanguageFromPath};
