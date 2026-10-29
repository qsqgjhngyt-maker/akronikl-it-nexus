import{MODERN_CPP_TOOLCHAIN}from'../runtime-assets.js';
import{flatFilesToVirtualTree}from'../virtual-files.js';
import{qtProject,qtCompilerArgs}from'./project.js';
import{fetchVerified,digest}from'./verified-pack.js';
import{QT_BROWSER_PROFILE}from'./profile.js';
let busy=false;
self.onmessage=async({data})=>{
 if(busy||data?.type!=='compile'||typeof data.id!=='string')return;busy=true;
 const{id}=data,send=(type,value={})=>self.postMessage({id,type,...value});let output='',phase='config';
 const collect=value=>{const text=typeof value==='string'?value:value instanceof Uint8Array?new TextDecoder().decode(value):String(value??'');output=(output+text).slice(-65536)};
 try{
  const project=qtProject(data.workspace,data.includeRoots);
  phase='headers';send('progress',{phase:'headers'});
  const raw=await fetchVerified(QT_BROWSER_PROFILE.headers),headers=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
  if(Object.keys(headers).length!==QT_BROWSER_PROFILE.headerFiles||Object.entries(headers).some(([p,v])=>typeof v!=='string'||! /^(qt\/(include|mkspecs)|emscripten\/include)\//.test(p)||p.split('/').some(x=>['','..','.','__proto__','constructor','prototype'].includes(x))))throw Error('QT_HEADERS_INVALID');
  const input={...headers};for(const[p,v]of Object.entries(project.files))input['__nexus_student__/'+p]=v;
  phase='compiler';send('progress',{phase:'compiler'});
  const{runClang}=await import(MODERN_CPP_TOOLCHAIN.compilerModuleUrl);
  phase='compile';send('progress',{phase:'compile'});const start=performance.now();
  const result=await runClang(qtCompilerArgs(project),flatFilesToVirtualTree(input),{decodeASCII:false,stdout:collect,stderr:collect});
  const wasm=result?.['student.wasm'];
  if(!(wasm instanceof Uint8Array)||!wasm.length||wasm.length>QT_BROWSER_PROFILE.maxStudentBytes)throw Error('QT_COMPILE_FAILED');
  const module=await WebAssembly.compile(wasm),exports=WebAssembly.Module.exports(module);
  if(!exports.some(r=>['__main_argc_argv','__main_void','__original_main'].includes(r.name)))throw Error('QT_MAIN_REQUIRED');
  const wasmHash=await digest(wasm);
  self.postMessage({id,type:'compiled',wasm,wasmHash,compileMs:Math.round(performance.now()-start),output},[wasm.buffer]);
 }catch(e){const network=/Failed to fetch|fetch failed|network|dynamically imported module|Importing a module script failed/i.test(String(e.message));send('error',{code:e.code||(network?'QT_RUNTIME_UNAVAILABLE':phase==='compile'?'QT_COMPILE_FAILED':phase==='config'?'QT_PROJECT_CONFIG':'QT_RUNTIME_UNAVAILABLE'),message:String(e.message).slice(0,1000),output})}
 // Родитель прекращает worker перед открытием GUI: память Clang освобождается.
};
