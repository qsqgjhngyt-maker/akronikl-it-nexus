import{submissionProject}from'./contract.js';
import{PRACTICAL_CHECKS,emptyChecks,sourceIdentity}from'./automatic-policy.js';
import{practicalControlSource,practicalGuiControlSource}from'./practical-controls.js';
import{wasmRuntimeProvider}from'../sandbox/providers/wasm-runtime.js';
import{createProjectBuildPlan}from'../project-studio/project-build.js';
import{createQtCompiler}from'../sandbox/qt/compiler.js';
import{QT_BROWSER_PROFILE as profile}from'../sandbox/qt/profile.js';
import{digest}from'../sandbox/qt/verified-pack.js';
const controlRoot='__nexus_control__',entryFile=controlRoot+'/driver.cpp',busy=()=>['loading-toolchain','loading-wasi-runner','compiling','running'].includes(wasmRuntimeProvider.getState().status);
const aborted=()=>Object.assign(Error('ASSESSMENT_CHECK_CANCELLED'),{code:'ASSESSMENT_CHECK_CANCELLED'});
export function parseControlOutput(stdout,nonce,ids){
 const out={},seen=new Set();for(const line of String(stdout).split(/\r?\n/)){
  if(!line.startsWith('NEXUS_CONTROL '+nonce+' '))continue;
  const parts=line.split(' ');if(parts.length!==4||!ids.includes(parts[2])||!['0','1'].includes(parts[3])||seen.has(parts[2]))throw Error('ASSESSMENT_CONTROL_OUTPUT_INVALID');seen.add(parts[2]);out[parts[2]]=parts[3]==='1';
 }return out;
}
export function createPracticalControlRunner({current=()=>true,progress=()=>{},previewHost}={}){
 let generation=0,active=false,ownWasi=false,frame=null,qt=null,rejectQt=null,contextTimer=null;
 function cancel(){generation++;clearInterval(contextTimer);contextTimer=null;if(ownWasi){wasmRuntimeProvider.shutdown();ownWasi=false}qt?.cancel();frame?.remove();frame=null;rejectQt?.(aborted());rejectQt=null;active=false}
 const valid=token=>current()&&token===generation;
 async function gui(source,variant,nonce,token,sourceHash){
  if(!previewHost?.isConnected)throw Object.assign(Error('ASSESSMENT_PREVIEW_REQUIRED'),{code:'ASSESSMENT_PREVIEW_REQUIRED'});
  const workspace=structuredClone(source.workspace),configFile=workspace.files.find(f=>f.path==='nexus-application.json');let config;
  try{config=JSON.parse(configFile.content)}catch{throw Object.assign(Error('QT_PROJECT_CONFIG'),{code:'QT_PROJECT_CONFIG'})}
  // Исходник GUI входит в driver через include; повторно как TU не компилируется.
  config.targets={...config.targets,gui:[entryFile,...modelUnits(source)]};configFile.content=JSON.stringify(config);workspace.files.push({path:entryFile,content:practicalGuiControlSource(variant,nonce),languageId:'cpp'});
  qt=createQtCompiler({current:()=>valid(token),progress:phase=>progress({phase:'qt-'+phase})});const compiled=await qt.compile(workspace,source.manifest.includeRoots);if(!valid(token))throw aborted();
  progress({phase:'qt-running'});
  return new Promise((resolve,reject)=>{
   let stdout='',timer,started=false,url=new URL(profile.previewUrl);if(url.protocol!=='https:'||url.origin===location.origin){reject(Error('QT_PREVIEW_ORIGIN_INVALID'));return}
   url.hash=new URLSearchParams({run:nonce,parent:location.origin});frame=document.createElement('iframe');const ownFrame=frame;frame.title='Nexus · C++ GUI control check';frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';frame.style.cssText='width:100%;height:520px;border:1px solid #34516b;border-radius:8px';
   const finish=(error,value)=>{clearTimeout(timer);window.removeEventListener('message',onMessage);ownFrame.remove();if(frame===ownFrame)frame=null;rejectQt=null;error?reject(error):resolve(value)};
   rejectQt=error=>finish(error);
   const onMessage=event=>{
    const d=event.data;if(event.source!==ownFrame.contentWindow||event.origin!=='null'||d?.nonce!==nonce||d.profile!==profile.id||!valid(token))return;
    if(d.type==='nexus-qt-ready'&&!started){started=true;ownFrame.contentWindow.postMessage({type:'nexus-qt-start',nonce,profile:profile.id,snapshotHash:sourceHash,wasm:compiled.wasm,wasmHash:compiled.wasmHash,outputDataFiles:config.outputDataFiles,files:{}},'*',[compiled.wasm.buffer]);return}
    if(d.snapshotHash!==sourceHash)return;
    if(d.type==='nexus-qt-output'&&typeof d.text==='string'){
     stdout=(stdout+'\n'+d.text).slice(-65536);try{const out=parseControlOutput(stdout,nonce,['guiAction']);if(Object.hasOwn(out,'guiAction'))finish(null,{build:true,guiAction:out.guiAction,output:stdout})}catch(error){finish(error)}
    }else if(d.type==='nexus-qt-running'){clearTimeout(timer);timer=setTimeout(()=>finish(null,{build:true,guiAction:false,output:'Qt control execution timeout'}),30000)}
    else if(d.type==='nexus-qt-error')finish(Object.assign(Error(String(d.message).slice(0,1000)),{code:'ASSESSMENT_GUI_UNAVAILABLE'}));
   };
   window.addEventListener('message',onMessage);timer=setTimeout(()=>finish(Object.assign(Error('QT_PREVIEW_TIMEOUT'),{code:'QT_PREVIEW_TIMEOUT'})),profile.toolchainTimeoutMs);previewHost.append(frame);frame.src=url.href;
  });
 }
 function modelUnits(source){
  const plan=createProjectBuildPlan(source,'tests');return plan.translationUnits.filter(p=>p!==source.workspace.entryFile&&!/(^|\/)(?:gui|main)\.(?:cpp|cc|cxx)$/.test(p)&&!plan.testRoots.some(root=>root==='.'||p===root||p.startsWith(root+'/')));
 }
 async function run(input,{variant,part}){
  if(active||busy())throw Object.assign(Error('ASSESSMENT_RUNTIME_BUSY'),{code:'ASSESSMENT_RUNTIME_BUSY'});
  const source=structuredClone(input);submissionProject(source);if(source.workspace.files.some(f=>f.path===controlRoot||f.path.startsWith(controlRoot+'/')))throw Error('ASSESSMENT_RESERVED_PATH');
  const ids=Object.keys(PRACTICAL_CHECKS[part]||{});if(!ids.length||!['A','B','C'].includes(variant))throw Error('ASSESSMENT_CONTROL_INVALID');
  active=true;const token=++generation,nonce=crypto.randomUUID(),checks=emptyChecks(PRACTICAL_CHECKS[part]);let output='';
  contextTimer=setInterval(()=>{if(token===generation&&!current())cancel()},250);
  try{
   const sourceHash=await digest(new TextEncoder().encode(sourceIdentity(source)));if(!valid(token))throw aborted();
   const files=Object.fromEntries(source.workspace.files.map(f=>[f.path,f.content]));files[entryFile]=practicalControlSource(variant,part,nonce);const units=[entryFile,...modelUnits(source)];
   progress({phase:'model-running'});ownWasi=true;
   try{
    const result=await wasmRuntimeProvider.run({languageId:'cpp',source:files[entryFile],entryFile,files,metadata:{entryFile,translationUnits:units,includeRoots:source.manifest.includeRoots}});
    if(!valid(token))throw aborted();checks.build=true;output=[result.compilerStderr,result.stdout,result.stderr].filter(Boolean).join('\n').slice(-65536);Object.assign(checks,parseControlOutput(result.stdout,nonce,ids.filter(id=>id!=='build'&&id!=='guiAction')));
   }catch(error){
    if(!valid(token))throw aborted();if(['WASM_COMPILE_ERROR','WASM_LINK_ERROR'].includes(error.code)){output=error.anxCompilerOutput||error.message;return{sourceHash,checks,output}}
    if(error.anxPhase==='run'){checks.build=true;output=error.message}else throw error;
   }finally{if(ownWasi){wasmRuntimeProvider.shutdown();ownWasi=false}}
   if(part==='P4'){
    try{const result=await gui(source,variant,nonce,token,sourceHash);checks.build&&=result.build;checks.guiAction=result.guiAction;output=(output+'\n'+result.output).slice(-65536)}
    catch(error){if(!valid(token))throw aborted();if(['QT_COMPILE_FAILED','QT_MAIN_REQUIRED','QT_PROJECT_CONFIG'].includes(error.code)){checks.build=false;checks.guiAction=false;output=(output+'\n'+(error.compilerOutput||error.message)).slice(-65536)}else throw error}
   }
   if(!valid(token))throw aborted();return{sourceHash,checks,output};
  }finally{if(token===generation)cancel()}
 }
 return{run,cancel,get busy(){return active}};
}
