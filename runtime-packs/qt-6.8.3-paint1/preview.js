import{QT_BROWSER_PROFILE as profile}from'./profile.js';
import{fetchVerified,digest}from'./verified-pack.js';
import{installQtAccessibleControls}from'./a11y.js';
const params=new URLSearchParams(location.hash.slice(1)),nonce=params.get('run'),expectedParent=params.get('parent');
let instance=null,started=false,snapshotHash=null,allowed=[],outputBytes=0;
const encoder=new TextEncoder(),status=document.querySelector('#status');
const send=(type,value={})=>parent.postMessage({type,nonce,snapshotHash,profile:profile.id,...value},expectedParent);
const output=(value,error=false)=>{const text=String(value).slice(0,32768);outputBytes+=encoder.encode(text).length;if(outputBytes<=65536)send('nexus-qt-output',{text,error})};
function snapshot(){if(!instance)return;try{const files={};for(const name of allowed){try{const value=instance.FS.readFile('/'+name,{encoding:'utf8'});if(encoder.encode(value).length>65536)throw Error('QT_DATA_TOO_LARGE');files[name]=value}catch(e){if(e.errno!==44)throw e}}send('nexus-qt-data',{files})}catch(e){send('nexus-qt-error',{message:String(e.message).slice(0,1000)})}}
function entry(config){
 return new Promise((resolve,reject)=>{
  const initialized=config.onRuntimeInitialized,aborted=config.onAbort;
  globalThis.Module={...config,onRuntimeInitialized(){try{initialized?.();resolve(globalThis.Module)}catch(e){reject(e)}},onAbort(reason){try{aborted?.(reason)}finally{reject(Error(String(reason)))}}};
  const script=document.createElement('script');script.src=profile.program.url;script.integrity=profile.program.integrity;script.crossOrigin='anonymous';script.async=false;
  script.onerror=()=>reject(Error('QT_RUNTIME_SCRIPT_UNAVAILABLE'));document.head.append(script);
 });
}
function accessibility(){let attempts=0;const activate=()=>{const shadow=document.querySelector('#qt-shadow-container')?.shadowRoot,button=shadow?.querySelector('.hidden-visually-read-by-screen-reader');
 if(button){button.click();installQtAccessibleControls(shadow);for(const input of shadow.querySelectorAll('input,textarea'))if(!input.getAttribute('aria-label')&&input.textContent.trim())input.setAttribute('aria-label',input.textContent.trim())}
 else if(++attempts<40)setTimeout(activate,50)};setTimeout(activate,0);
}
async function start(data){
 if(!(data.wasm instanceof Uint8Array)||data.wasm.byteLength>profile.maxStudentBytes||!data.wasm.byteLength||! /^[a-f0-9]{64}$/.test(data.wasmHash)||await digest(data.wasm)!==data.wasmHash||! /^[a-f0-9]{64}$/.test(data.snapshotHash))throw Error('QT_MODULE_INVALID');
 snapshotHash=data.snapshotHash;
 if(!Array.isArray(data.outputDataFiles)||data.outputDataFiles.length>8||new Set(data.outputDataFiles).size!==data.outputDataFiles.length||data.outputDataFiles.some(p=>typeof p!=='string'||p.length>240||!/^taskflow\.txt$|^data\/[\p{L}\p{N}._/-]+\.(?:txt|json)$/u.test(p)||p.split('/').some(x=>['','.','..','__proto__','constructor','prototype'].includes(x))))throw Error('QT_DATA_INVALID');
 allowed=data.outputDataFiles;const files=data.files||{};
 if(typeof files!=='object'||Array.isArray(files)||Object.keys(files).some(p=>!allowed.includes(p)||typeof files[p]!=='string'||encoder.encode(files[p]).length>65536))throw Error('QT_DATA_INVALID');
 const wasm=await fetchVerified(profile.wasm),module=await WebAssembly.compile(wasm);
 instance=await qtLoad({qt:{entryFunction:entry,module:Promise.resolve(module),containerElements:[document.querySelector('#screen')],onExit(){send('nexus-qt-exited')}},
  print:v=>output(v),printErr:v=>output(v,true),preRun:[m=>{
   m.FS.writeFile('/student.wasm',data.wasm);
   for(const[name,value]of Object.entries(files)){const parts=name.split('/');if(parts.length>1)m.FS.mkdirTree('/'+parts.slice(0,-1).join('/'));m.FS.writeFile('/'+name,value)}
   const close=m.FS.close;let scheduled=false;
   m.FS.close=function(stream){const name=stream.path?.replace(/^\//,''),writing=(stream.flags&3)!==0,result=close.call(this,stream);
    if(writing&&allowed.includes(name)&&!scheduled){scheduled=true;setTimeout(()=>{scheduled=false;snapshot()},0)}return result};
  }]});
 const code=instance._nexus_load_student();if(code!==0)throw Error('QT_APPLICATION_EXIT_'+code);
 status.hidden=true;accessibility();send('nexus-qt-running');
}
// Открытая страница без sandbox не должна исполнять пользовательский модуль.
if(parent===self||self.origin!=='null'||!profile.parentOrigins.includes(expectedParent)||! /^[a-f0-9-]{36}$/.test(nonce||'')){
 status.textContent='Open this application from Nexus Studio.';
}else{
 addEventListener('message',async e=>{
  if(e.source!==parent||e.origin!==expectedParent||e.data?.nonce!==nonce||e.data?.profile!==profile.id)return;
  if(e.data.type==='nexus-qt-start'&&!started){started=true;try{await start(e.data)}catch(error){status.textContent='Application could not start';send('nexus-qt-error',{message:String(error.message).slice(0,1000)})}}
  else if(e.data.type==='nexus-qt-snapshot'&&e.data.snapshotHash===snapshotHash)snapshot();
 });send('nexus-qt-ready');
}
