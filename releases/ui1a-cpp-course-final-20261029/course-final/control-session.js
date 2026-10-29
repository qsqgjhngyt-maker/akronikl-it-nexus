import{submissionProject}from'./contract.js';import{sourceIdentity}from'./automatic-policy.js';import{parseControlOutput}from'./practical-runner.js';
import{createProjectBuildPlan}from'../project-studio/project-build.js';import{wasmRuntimeProvider}from'../sandbox/providers/wasm-runtime.js';import{createQtCompiler}from'../sandbox/qt/compiler.js';import{QT_BROWSER_PROFILE as profile}from'../sandbox/qt/profile.js';import{digest}from'../sandbox/qt/verified-pack.js';
const root='__nexus_control__',entryFile=root+'/driver.cpp',abort=()=>Object.assign(Error('ASSESSMENT_CHECK_CANCELLED'),{code:'ASSESSMENT_CHECK_CANCELLED'});
export const modelUnits=source=>{const p=createProjectBuildPlan(source,'tests');return p.translationUnits.filter(f=>f!==source.workspace.entryFile&&!/(^|\/)(?:main|gui)\.(?:cpp|cc|cxx)$/.test(f)&&!p.testRoots.some(r=>r==='.'||f===r||f.startsWith(r+'/')))};
export function createControlSession({current=()=>true,previewHost,progress=()=>{}}={}){
 let generation=0,active=false,ownWasi=false,compiler=null,frame=null,rejectPreview=null,contextTimer=null;
 function cancel(){generation++;clearInterval(contextTimer);contextTimer=null;if(ownWasi){wasmRuntimeProvider.shutdown();ownWasi=false}compiler?.cancel();rejectPreview?.(abort());rejectPreview=null;frame?.remove();frame=null;active=false}
 async function run(input,work){
  if(active||['loading-toolchain','loading-wasi-runner','compiling','running'].includes(wasmRuntimeProvider.getState().status))throw Object.assign(Error('ASSESSMENT_RUNTIME_BUSY'),{code:'ASSESSMENT_RUNTIME_BUSY'});
  const source=structuredClone(input);submissionProject(source);if(source.workspace.files.some(f=>f.path===root||f.path.startsWith(root+'/')))throw Error('ASSESSMENT_RESERVED_PATH');
  active=true;const token=++generation,valid=()=>current()&&token===generation,check=()=>{if(!valid())throw abort()},tell=phase=>{check();progress({phase})};contextTimer=setInterval(()=>{if(token===generation&&!current())cancel()},250);
  try{
   const sourceHash=await digest(new TextEncoder().encode(sourceIdentity(source)));check();
   async function wasm(project,program,ids,nonce){
    check();tell('model-running');const files=Object.fromEntries(project.workspace.files.map(f=>[f.path,f.content]));files[entryFile]=program;ownWasi=true;
    try{const r=await wasmRuntimeProvider.run({languageId:'cpp',source:program,entryFile,files,metadata:{entryFile,translationUnits:[entryFile,...modelUnits(project)],includeRoots:project.manifest.includeRoots}});check();return{build:true,outcomes:parseControlOutput(r.stdout,nonce,ids),output:[r.compilerStderr,r.stdout,r.stderr].filter(Boolean).join('\n').slice(-65536)}}
    catch(e){check();if(['WASM_COMPILE_ERROR','WASM_LINK_ERROR'].includes(e.code))return{build:false,outcomes:{},output:e.anxCompilerOutput||e.message};if(e.anxPhase==='run')return{build:true,outcomes:{},output:e.message};throw e}
    finally{if(ownWasi){wasmRuntimeProvider.shutdown();ownWasi=false}}
   }
   async function qt(project,program,ids,nonce){
    check();if(!previewHost?.isConnected)throw Error('ASSESSMENT_PREVIEW_REQUIRED');const workspace=structuredClone(project.workspace),configFile=workspace.files.find(f=>f.path==='nexus-application.json');let config;
    try{config=JSON.parse(configFile.content)}catch{throw Object.assign(Error('QT_PROJECT_CONFIG'),{code:'QT_PROJECT_CONFIG'})}
    config.targets={...config.targets,gui:[entryFile,...modelUnits(project)]};configFile.content=JSON.stringify(config);workspace.files.push({path:entryFile,content:program,languageId:'cpp'});
    compiler=createQtCompiler({current:valid,progress:phase=>tell('qt-'+phase)});let compiled;
    try{compiled=await compiler.compile(workspace,project.manifest.includeRoots)}catch(e){check();if(['QT_COMPILE_FAILED','QT_MAIN_REQUIRED','QT_PROJECT_CONFIG'].includes(e.code))return{build:false,outcomes:{},output:e.compilerOutput||e.message};throw e}check();tell('qt-opening');
    return new Promise((resolve,reject)=>{
     let output='',timer,started=false;const url=new URL(profile.previewUrl);if(url.protocol!=='https:'||url.origin===location.origin){reject(Error('QT_PREVIEW_ORIGIN_INVALID'));return}
     url.hash=new URLSearchParams({run:nonce,parent:location.origin});const ownFrame=document.createElement('iframe');frame=ownFrame;ownFrame.title='Nexus · C++ project controls';ownFrame.setAttribute('sandbox','allow-scripts');ownFrame.referrerPolicy='no-referrer';ownFrame.style.cssText='width:100%;height:540px;border:1px solid #34516b;border-radius:8px';
     const finish=(error,value)=>{clearTimeout(timer);window.removeEventListener('message',onMessage);ownFrame.remove();if(frame===ownFrame)frame=null;rejectPreview=null;error?reject(error):resolve(value)};
     const onMessage=event=>{
      const d=event.data;if(event.source!==ownFrame.contentWindow||event.origin!=='null'||d?.nonce!==nonce||d.profile!==profile.id||!valid())return;
      if(d.type==='nexus-qt-ready'&&!started){started=true;ownFrame.contentWindow.postMessage({type:'nexus-qt-start',nonce,profile:profile.id,snapshotHash:sourceHash,wasm:compiled.wasm,wasmHash:compiled.wasmHash,outputDataFiles:config.outputDataFiles,files:{}},'*',[compiled.wasm.buffer]);return}
      if(d.snapshotHash!==sourceHash)return;
      if(d.type==='nexus-qt-output'&&typeof d.text==='string'){
       if(output.length+d.text.length>65536){finish(Object.assign(Error('ASSESSMENT_OUTPUT_LIMIT'),{code:'ASSESSMENT_OUTPUT_LIMIT'}));return}output+='\n'+d.text;
       try{const outcomes=parseControlOutput(output,nonce,ids);if(ids.every(id=>Object.hasOwn(outcomes,id)))finish(null,{build:true,outcomes,output})}catch(e){finish(e)}
      }else if(d.type==='nexus-qt-running'){clearTimeout(timer);timer=setTimeout(()=>finish(null,{build:true,outcomes:{},output:'Qt execution timeout'}),30000)}
      else if(d.type==='nexus-qt-error')finish(Object.assign(Error(String(d.message).slice(0,1000)),{code:'ASSESSMENT_GUI_UNAVAILABLE'}));
     };
     rejectPreview=e=>finish(e);window.addEventListener('message',onMessage);timer=setTimeout(()=>finish(Object.assign(Error('QT_PREVIEW_TIMEOUT'),{code:'QT_PREVIEW_TIMEOUT'})),profile.toolchainTimeoutMs);previewHost.append(ownFrame);ownFrame.src=url.href;
    });
   }
   return await work({source,sourceHash,wasm,qt,check,tell});
  }finally{if(token===generation)cancel()}
 }
 return{run,cancel,get busy(){return active}};
}
