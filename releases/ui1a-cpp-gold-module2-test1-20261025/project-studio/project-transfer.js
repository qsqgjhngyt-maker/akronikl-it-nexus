import {createCodeWorkspace} from '../sandbox/code-workspace.js';
import {flatFilesToVirtualTree} from '../sandbox/virtual-files.js';
import {blankCppProjectTemplate} from './project-templates.js';
export const IMPORT_LIMITS=Object.freeze({files:64,fileBytes:262144,totalBytes:1048576,jsonBytes:2097152});
const bytes=s=>new TextEncoder().encode(s).length;
const bad=code=>{throw Object.assign(Error(code),{code})};
const title=value=>{const t=String(value||'').trim();if(!t||t.length>120||/[\u0000-\u001f\u007f]/.test(t))bad('TITLE');return t};
export function strictProjectPath(value){
 if(typeof value!=='string'||!value||value.length>240||value!==value.normalize('NFC')||/^[/.\\]|[\\\u0000-\u001f\u007f<>:"|?*]/.test(value))bad('PATH');
 if(value.split('/').some(p=>!p||['.','..','__proto__','constructor','prototype'].includes(p)||p!==p.trim()))bad('PATH');
 return value;
}
export function standaloneCppTemplate(name,kind='starter'){
 const template=blankCppProjectTemplate(title(name));
 if(!['empty','starter'].includes(kind))bad('FORMAT');
 return {...template,description:'',files:kind==='empty'?[{path:'src/main.cpp',content:'',languageId:'cpp'}]:template.files};
}
export function validateProjectWorkspace(value){
 if(!value||value.languageId!==undefined&&value.languageId!=='cpp'||!Array.isArray(value.files)||!value.files.length||value.files.length>IMPORT_LIMITS.files)bad('FORMAT');
 const seen=new Set();let total=0;
 const files=value.files.map(file=>{
  const path=strictProjectPath(file?.path);if(seen.has(path))bad('DUPLICATE');seen.add(path);
  if(typeof file.content!=='string'||file.content.includes('\u0000'))bad('FORMAT');
  const n=bytes(file.content);if(n>IMPORT_LIMITS.fileBytes||(total+=n)>IMPORT_LIMITS.totalBytes)bad('SIZE');
  if(!/\.(cpp|cc|cxx|c\+\+|h|hpp|hh|hxx|txt|md|json)$/i.test(path))bad('FORMAT');
  return {path,content:file.content,languageId:'cpp',readOnly:false};
 });
 const entry=strictProjectPath(value.entryFile||chooseEntry(files));
 if(!seen.has(entry)||!/\.(cpp|cc|cxx|c\+\+)$/i.test(entry))bad('ENTRY');
 // Проверка file/directory conflicts прежним VFS до создания проекта.
 try{flatFilesToVirtualTree(Object.fromEntries(files.map(f=>[f.path,f.content])))}catch{bad('PATH_CONFLICT')}
 const active=value.activeFile&&seen.has(value.activeFile)?value.activeFile:entry;
 return createCodeWorkspace({languageId:'cpp',entryFile:entry,activeFile:active,files}).snapshot();
}
function chooseEntry(files){
 const mains=files.filter(f=>/(^|\/)main\.(cpp|cc|cxx|c\+\+)$/i.test(f.path));if(mains.length===1)return mains[0].path;
 const cpp=files.filter(f=>/\.(cpp|cc|cxx|c\+\+)$/i.test(f.path));if(cpp.length===1)return cpp[0].path;
 bad('ENTRY');
}
function roots(value,fallback){
 if(value===undefined)return fallback;
 if(!Array.isArray(value)||value.length>64)bad('FORMAT');
 return [...new Set(value.map(v=>v==='.'?'.':strictProjectPath(v)))];
}
export function importedProjectInput(value,{name='Imported C++ project'}={}){
 if(value?.languageId!==undefined&&value.languageId!=='cpp')bad('FORMAT');
 const workspace=validateProjectWorkspace(value?.workspace||value);
 const manifest=value?.manifest||{},dirs=workspace.files.map(f=>f.path.split('/').slice(0,-1).join('/'));
 const includes=[...new Set(dirs.filter(d=>/(^|\/)include$/.test(d)))],tests=[...new Set(dirs.filter(d=>/(^|\/)tests$/.test(d)))];
 return {title:title(value?.title||name),description:typeof value?.description==='string'?value.description.slice(0,2000):'',languageId:'cpp',
  entryFile:workspace.entryFile,activeFile:workspace.activeFile,files:workspace.files,
  sourceRoots:roots(manifest.sourceRoots,['.']),includeRoots:roots(manifest.includeRoots,includes),testRoots:roots(manifest.testRoots,tests.length?tests:['tests']),
  origin:{kind:'user'}};
}
export async function readProjectImport(selection,{name='Imported C++ project'}={}){
 const chosen=Array.from(selection||[]);if(!chosen.length||chosen.length>IMPORT_LIMITS.files)bad('FORMAT');
 let total=0;
 for(const f of chosen){if(!Number.isSafeInteger(f.size)||f.size<0||f.size>(chosen.length===1&&/\.json$/i.test(f.name)?IMPORT_LIMITS.jsonBytes:IMPORT_LIMITS.fileBytes)||(total+=f.size)>IMPORT_LIMITS.jsonBytes)bad('SIZE')}
 const texts=await Promise.all(chosen.map(async f=>{try{return new TextDecoder('utf-8',{fatal:true}).decode(await f.arrayBuffer())}catch{bad('FORMAT')}}));
 if(chosen.length===1&&/\.json$/i.test(chosen[0].name)){
  let data;try{data=JSON.parse(texts[0])}catch{bad('FORMAT')}
  return importedProjectInput(data,{name});
 }
 return importedProjectInput({files:chosen.map((f,i)=>({path:f.webkitRelativePath||f.name,content:texts[i]}))},{name});
}
export function exportProjectSources(project){
 const workspace=validateProjectWorkspace(project?.workspace);
 // Не переносим id/ACL/owner/сессию/Cloud config/учебные события в импортируемый файл.
 return JSON.stringify({title:title(project.title),description:project.description||'',languageId:'cpp',manifest:{schemaVersion:1,entryFile:workspace.entryFile,sourceRoots:roots(project.manifest?.sourceRoots,['.']),includeRoots:roots(project.manifest?.includeRoots,[]),testRoots:roots(project.manifest?.testRoots,['tests'])},workspace},null,2);
}
export function portableBuildManifest(project){
 const entryFile=project.workspace?.entryFile||project.manifest?.entryFile;
 return {schemaVersion:1,entryFile:strictProjectPath(entryFile),sourceRoots:roots(project.manifest?.sourceRoots,['.']),includeRoots:roots(project.manifest?.includeRoots,['include']),testRoots:roots(project.manifest?.testRoots,['tests']),build:{profile:'wasm-debug',standard:'c++20',runtime:'auto'}};
}
export function downloadProjectSources(project){
 const body=exportProjectSources(project),url=URL.createObjectURL(new Blob([body],{type:'application/json;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=(project.title.replace(/[^\p{L}\p{N}._-]+/gu,'-').slice(0,80)||'project')+'.nexus.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 return body;
}
