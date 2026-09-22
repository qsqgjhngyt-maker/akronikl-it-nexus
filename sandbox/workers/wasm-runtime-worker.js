import {MODERN_CPP_TOOLCHAIN,MODERN_CPP_LIMITS,modernCppToolchainLabel} from '../runtime-assets.js';

const FOUNDATION_VERSION='0.1.6-alpha.2.1';
let compilerModulePromise=null;
let wasiModulePromise=null;
let compilerReady=false;
let state='idle';

const now=()=>typeof performance!=='undefined'?performance.now():Date.now();
const elapsed=start=>Math.max(0,Math.round(now()-start));
const safeMessage=error=>String(error?.message||error||'Unknown runtime error');
const post=(payload)=>self.postMessage(payload);

function progress(requestId,phase,status,extra={}){
  state=status;
  post({type:'runtime-progress',requestId,phase,status,...extra});
}

function makeByteCollector(limit=MODERN_CPP_LIMITS.maxOutputChars){
  const decoder=new TextDecoder();
  let text='';
  let truncated=false;
  return{
    push(bytes){
      if(bytes===null||bytes===undefined)return;
      const chunk=typeof bytes==='string'?bytes:decoder.decode(bytes,{stream:true});
      if(text.length>=limit){truncated=true;return;}
      const room=limit-text.length;
      text+=chunk.slice(0,room);
      if(chunk.length>room)truncated=true;
    },
    flush(){try{text+=decoder.decode()}catch{}},
    value(){return text+(truncated?'\n[Nexus: output truncated]':'')}
  };
}

async function loadCompiler(requestId){
  if(!compilerModulePromise){
    progress(requestId,'toolchain','loading-toolchain',{label:modernCppToolchainLabel()});
    compilerModulePromise=import(MODERN_CPP_TOOLCHAIN.compilerModuleUrl).then(module=>{
      if(typeof module.runClang!=='function')throw new Error('YoWASP Clang module loaded without runClang().');
      return module;
    }).catch(error=>{compilerModulePromise=null;compilerReady=false;throw error});
  }
  return compilerModulePromise;
}

async function loadWasiRunner(requestId){
  if(!wasiModulePromise){
    progress(requestId,'runner','loading-wasi-runner',{label:`Runno WASI ${MODERN_CPP_TOOLCHAIN.wasiRunnerVersion}`});
    wasiModulePromise=import(MODERN_CPP_TOOLCHAIN.wasiModuleUrl).then(module=>{
      if(typeof module.WASI!=='function')throw new Error('WASI runner loaded without WASI API.');
      return module;
    }).catch(error=>{wasiModulePromise=null;throw error});
  }
  return wasiModulePromise;
}

function byteLength(value){
  if(value instanceof Uint8Array)return value.byteLength;
  return new TextEncoder().encode(String(value??'')).byteLength;
}

function guardInputFootprint(files){
  let total=0;
  for(const value of Object.values(files||{})){
    total+=byteLength(value);
    if(total>MODERN_CPP_LIMITS.maxTotalInputBytes){
      const error=new Error('Total source/file input exceeds the in-browser compiler memory safety limit.');
      error.code='WASM_INPUT_TOO_LARGE';
      throw error;
    }
  }
  return total;
}

function normalizedFiles(request,entryFile){
  const files={};
  if(request?.files&&typeof request.files==='object'){
    for(const [name,value] of Object.entries(request.files)){
      const safe=String(name||'').replace(/\\/g,'/').replace(/^\/+/, '');
      if(!safe||safe.includes('../'))continue;
      if(typeof value==='string'||value instanceof Uint8Array)files[safe]=value;
    }
  }
  files[entryFile]=String(request?.source??files[entryFile]??'');
  return files;
}

function collectTranslationUnits(files,languageId='cpp',entryFile='main.cpp'){
  const isC=languageId==='c';
  const sourceRe=isC?/\.c$/i:/\.(?:cc|cpp|cxx|c\+\+)$/i;
  const units=Object.keys(files||{}).filter(path=>sourceRe.test(path));
  if(!units.includes(entryFile)&&sourceRe.test(entryFile))units.unshift(entryFile);
  units.sort((a,b)=>a===entryFile?-1:b===entryFile?1:a.localeCompare(b));
  return units;
}

async function compile(requestId,request){
  const source=String(request?.source??'');
  if(new TextEncoder().encode(source).byteLength>MODERN_CPP_LIMITS.maxSourceBytes){
    const error=new Error('Source file is too large for the in-browser compiler safety limit.');
    error.code='WASM_SOURCE_TOO_LARGE';
    throw error;
  }
  const languageId=String(request?.languageId||'cpp').toLowerCase();
  const isC=languageId==='c';
  const defaultEntry=isC?'main.c':'main.cpp';
  const entryFile=String(request?.entryFile||request?.metadata?.entryFile||defaultEntry).replace(/\\/g,'/').replace(/^\/+/, '')||defaultEntry;
  const compiler=isC?'clang':'clang++';
  const stdFlag=isC?'-std=c17':'-std=c++20';
  const outputFile='program.wasm';
  const compilerOut=makeByteCollector();
  const compilerErr=makeByteCollector();
  const started=now();
  const {runClang}=await loadCompiler(requestId);
  progress(requestId,'compile','compiling',{compiler,entryFile});
  try{
    const virtualFiles=normalizedFiles(request,entryFile);
    guardInputFootprint(virtualFiles);
    for(const [path,value] of Object.entries(virtualFiles)){
      if(byteLength(value)>MODERN_CPP_LIMITS.maxSourceBytes){
        const error=new Error(`Source file ${path} is too large for the in-browser compiler safety limit.`);
        error.code='WASM_SOURCE_TOO_LARGE';
        throw error;
      }
    }
    const translationUnits=collectTranslationUnits(virtualFiles,languageId,entryFile);
    if(!translationUnits.length){
      const error=new Error('No compilable translation units were found in the Nexus workspace.');
      error.code='WASM_NO_TRANSLATION_UNITS';
      throw error;
    }
    const filesOut=await runClang(
      [compiler,stdFlag,...(isC?[]:['-fno-exceptions']),'-O0','-g0','-fdiagnostics-color=never',...translationUnits,'-o',outputFile],
      virtualFiles,
      {
        decodeASCII:false,
        stdout:value=>compilerOut.push(value),
        stderr:value=>compilerErr.push(value),
        fetchProgress:({totalLength=0,doneLength=0})=>{
          const percent=totalLength>0?Math.min(100,Math.round(doneLength/totalLength*100)):null;
          progress(requestId,'toolchain','loading-toolchain',{doneLength,totalLength,percent,label:modernCppToolchainLabel()});
        }
      }
    );
    compilerOut.flush();compilerErr.flush();
    const wasm=filesOut?.[outputFile];
    if(!(wasm instanceof Uint8Array)){
      const error=new Error('Clang finished without producing program.wasm.');
      error.code='WASM_COMPILER_NO_OUTPUT';
      error.compilerOutput=compilerErr.value()||compilerOut.value();
      throw error;
    }
    if(wasm.byteLength>MODERN_CPP_LIMITS.maxCompiledWasmBytes){
      const error=new Error('Compiled WebAssembly output exceeds the Nexus in-browser memory safety limit.');
      error.code='WASM_OUTPUT_TOO_LARGE';
      error.compilerOutput=compilerErr.value()||compilerOut.value();
      throw error;
    }
    compilerReady=true;
    return{
      wasm,
      entryFile,
      compiler,
      compilerStdout:compilerOut.value(),
      compilerStderr:compilerErr.value(),
      compileMs:elapsed(started),
      translationUnits
    };
  }catch(error){
    compilerOut.flush();compilerErr.flush();
    error.compilerOutput=error.compilerOutput||compilerErr.value()||compilerOut.value()||safeMessage(error);
    throw error;
  }
}

function stdinCallback(text=''){
  const source=String(text??'');
  if(!source)return()=>null;
  const chunks=source.match(/[^\n]*\n|[^\n]+$/g)||[];
  let index=0;
  return()=>index<chunks.length?chunks[index++]:null;
}

async function execute(requestId,request,compiled){
  const {WASI}=await loadWasiRunner(requestId);
  progress(requestId,'run','running',{label:'WASI Preview 1'});
  let stdout='';let stderr='';let outputTruncated=false;
  const append=(kind,value)=>{
    const text=String(value??'');
    const current=kind==='stdout'?stdout:stderr;
    if(current.length>=MODERN_CPP_LIMITS.maxOutputChars){outputTruncated=true;return;}
    const room=MODERN_CPP_LIMITS.maxOutputChars-current.length;
    const next=current+text.slice(0,room);
    if(text.length>room)outputTruncated=true;
    if(kind==='stdout')stdout=next;else stderr=next;
  };
  const wasi=new WASI({
    args:['program.wasm'],
    env:{ANX_RUNTIME:'Nexus WASM C++ Runtime'},
    stdin:stdinCallback(request?.stdin||''),
    stdout:value=>append('stdout',value),
    stderr:value=>append('stderr',value),
    fs:{}
  });
  const started=now();
  const instantiated=await WebAssembly.instantiate(compiled.wasm,{...wasi.getImportObject()});
  const startResult=await wasi.start(instantiated);
  const exitCode=Number.isFinite(startResult)?Number(startResult):(Number.isFinite(startResult?.exitCode)?Number(startResult.exitCode):0);
  if(outputTruncated)stderr+=(stderr?'\n':'')+'[Nexus: output truncated]';
  return{stdout,stderr,exitCode,runMs:elapsed(started)};
}

function classifyFailure(error,phase='compile'){
  const raw=String(error?.compilerOutput||safeMessage(error));
  if(phase==='compile'&&/(?:^|\n).+?:\d+:\d+:\s*(?:fatal\s+)?error:/i.test(raw))return'WASM_COMPILE_ERROR';
  if(phase==='compile'&&/(undefined symbol|linker command failed|wasm-ld: error|ld\.lld: error)/i.test(raw))return'WASM_LINK_ERROR';
  if(/Failed to fetch|fetch failed|network|ERR_|module script|dynamically imported module|Importing a module script failed/i.test(raw))return'WASM_TOOLCHAIN_UNAVAILABLE';
  return error?.code||'WASM_RUNTIME_FAILURE';
}

async function handleRun(message){
  const requestId=message.requestId||null;
  const request=message.request||{};
  let phase='toolchain';
  const totalStarted=now();
  try{
    phase='compile';
    const compiled=await compile(requestId,request);
    phase='run';
    const executed=await execute(requestId,request,compiled);
    state='ready';
    post({
      type:'runtime-result',requestId,state,compilerReady:true,
      result:{
        stdout:executed.stdout,
        stderr:executed.stderr,
        exitCode:executed.exitCode,
        elapsedMs:elapsed(totalStarted),
        compileMs:compiled.compileMs,
        runMs:executed.runMs,
        compilerStdout:compiled.compilerStdout,
        compilerStderr:compiled.compilerStderr,
        compiler:modernCppToolchainLabel(),
        entryFile:compiled.entryFile,
        translationUnits:compiled.translationUnits,
        target:MODERN_CPP_TOOLCHAIN.target,
        languageId:String(request.languageId||'cpp').toLowerCase()
      }
    });
  }catch(error){
    const code=classifyFailure(error,phase);
    if(code==='WASM_TOOLCHAIN_UNAVAILABLE')compilerReady=false;
    state=code==='WASM_COMPILE_ERROR'||code==='WASM_LINK_ERROR'?'ready':'error';
    post({
      type:'runtime-error',requestId,state,compilerReady,phase,code,
      message:safeMessage(error),
      raw:String(error?.compilerOutput||safeMessage(error)),
      compilerOutput:String(error?.compilerOutput||''),
      errorName:String(error?.name||'Error')
    });
  }
}

self.addEventListener('message',event=>{
  const message=event.data||{};
  if(message.type==='probe'){
    post({
      type:'probe-result',requestId:message.requestId||null,ok:true,state,
      foundationVersion:FOUNDATION_VERSION,compilerReady,
      lazy:true,toolchain:modernCppToolchainLabel(),
      capabilities:{workerIsolation:true,virtualFilesystem:true,multiFile:true,compiler:'clang',wasiRunner:'preview1',cppStandard:'c++20',stdlib:true},
      reason:compilerReady?'modern-cpp-compiler-ready':'modern-cpp-compiler-lazy-load'
    });
    return;
  }
  if(message.type==='run')void handleRun(message);
});
