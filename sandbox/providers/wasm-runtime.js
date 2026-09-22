import {normalizeRuntimeRequest,runtimeResult,runtimeProjectFileCount,runtimeProjectSource,RUNTIME_SUPPORT} from '../provider-contract.js';
import {MODERN_CPP_LIMITS,modernCppToolchainLabel} from '../runtime-assets.js';

const CPP_EXCEPTION_SYNTAX=/\b(?:try|catch|throw)\b/;

const MODERN_CPP_PATTERNS=[
  /#\s*include\s*<(string|string_view|vector|memory|map|unordered_map|set|unordered_set|algorithm|ranges|filesystem|thread|future|optional|variant|tuple|regex|format|array|deque|list|queue|stack)>/,
  /\b(virtual|override|final|template|concept|constexpr|unique_ptr|shared_ptr|weak_ptr|make_unique|make_shared|std::vector|std::string|std::map|std::unordered_map)\b/
];

const BUSY_STATES=new Set(['loading-toolchain','loading-wasi-runner','compiling','running']);
const state={status:'idle',phase:null,percent:null,compilerReady:false,lastProbe:null,lastError:null};
const listeners=new Set();
const pending=new Map();
let worker=null;
let sequence=0;

const emit=()=>listeners.forEach(fn=>{try{fn({...state})}catch{}});
const patchState=update=>{Object.assign(state,update);emit()};
const needsModernCpp=source=>MODERN_CPP_PATTERNS.some(pattern=>pattern.test(String(source||'')));
const codeOnly=source=>String(source||'').replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/.*$/gm,' ').replace(/\"(?:\\.|[^\"\\])*\"/g,'""').replace(/'(?:\\.|[^'\\])*'/g,"''");
const usesCppExceptions=source=>CPP_EXCEPTION_SYNTAX.test(codeOnly(source));
const workerSupported=()=>typeof Worker!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof URL!=='undefined';

function resetWorker(reason='reset'){
  try{worker?.terminate()}catch{}
  worker=null;
  for(const [id,entry] of pending){
    clearTimeout(entry.timer);
    const error=new Error(`Nexus WASM Runtime worker stopped: ${reason}`);
    error.code='WASM_WORKER_RESET';
    entry.reject(error);
    pending.delete(id);
  }
  patchState({status:'idle',phase:null,percent:null});
}

function timeoutForPhase(phase){
  if(phase==='toolchain'||phase==='runner')return MODERN_CPP_LIMITS.toolchainTimeoutMs;
  if(phase==='compile')return MODERN_CPP_LIMITS.compileTimeoutMs;
  if(phase==='run')return MODERN_CPP_LIMITS.executionTimeoutMs;
  return MODERN_CPP_LIMITS.toolchainTimeoutMs;
}

function arm(entry,phase='toolchain'){
  clearTimeout(entry.timer);
  entry.phase=phase;
  entry.timer=setTimeout(()=>{
    const error=new Error(phase==='run'
      ?'Программа не завершилась за допустимое время выполнения в Nexus WASM Runtime.'
      :'Nexus WASM Runtime превысил допустимое время подготовки или компиляции.');
    error.code=phase==='run'?'WASM_EXECUTION_TIMEOUT':'WASM_COMPILER_TIMEOUT';
    error.anxPhase=phase;
    error.anxProvider=wasmRuntimeProvider;
    error.anxCapability=entry.capability;
    pending.delete(entry.requestId);
    try{worker?.terminate()}catch{}
    worker=null;
    patchState({status:'error',phase,lastError:error.message});
    entry.reject(error);
  },timeoutForPhase(phase));
}

function ensureWorker(){
  if(worker)return worker;
  if(!workerSupported())throw Object.assign(new Error('Web Worker / WebAssembly API недоступны в этом браузере.'),{code:'WASM_ENVIRONMENT_UNAVAILABLE'});
  worker=new Worker(new URL('../workers/wasm-runtime-worker.js',import.meta.url),{type:'module'});
  worker.onmessage=event=>{
    const message=event.data||{};
    const entry=pending.get(message.requestId);
    if(message.type==='runtime-progress'){
      const phase=message.phase||entry?.phase||null;
      if(entry)arm(entry,phase);
      patchState({status:message.status||phase||'busy',phase,percent:Number.isFinite(message.percent)?message.percent:null,lastError:null});
      return;
    }
    if(message.type==='probe-result'){
      if(entry){clearTimeout(entry.timer);pending.delete(message.requestId);entry.resolve(message)}
      patchState({status:message.compilerReady?'ready':'idle',phase:null,percent:null,compilerReady:Boolean(message.compilerReady),lastProbe:message,lastError:null});
      return;
    }
    if(message.type==='runtime-result'){
      if(!entry)return;
      clearTimeout(entry.timer);pending.delete(message.requestId);
      patchState({status:'ready',phase:null,percent:100,compilerReady:true,lastError:null});
      entry.resolve(runtimeResult(wasmRuntimeProvider,message.result,{compiler:message.result?.compiler,target:message.result?.target,compileMs:message.result?.compileMs,runMs:message.result?.runMs,languageId:message.result?.languageId,compilerStdout:message.result?.compilerStdout,compilerStderr:message.result?.compilerStderr,entryFile:message.result?.entryFile,translationUnits:Array.isArray(message.result?.translationUnits)?message.result.translationUnits:[]}));
      return;
    }
    if(message.type==='runtime-error'){
      if(!entry)return;
      clearTimeout(entry.timer);pending.delete(message.requestId);
      const raw=String(message.compilerOutput||message.raw||message.message||'WASM runtime failure');
      const error=new Error(raw||String(message.message||'WASM runtime failure'));
      error.code=message.code||'WASM_RUNTIME_FAILURE';
      error.anxPhase=message.phase||entry.phase||null;
      error.anxProvider=wasmRuntimeProvider;
      error.anxCapability=entry.capability;
      error.anxCompilerOutput=String(message.compilerOutput||message.raw||'');
      error.anxProviderLimit=['WASM_TOOLCHAIN_UNAVAILABLE','WASM_ENVIRONMENT_UNAVAILABLE','WASM_COMPILER_TIMEOUT'].includes(error.code);
      patchState({status:message.state==='ready'?'ready':'error',phase:error.anxPhase,percent:null,compilerReady:Boolean(message.compilerReady),lastError:error.message});
      if(error.code==='WASM_TOOLCHAIN_UNAVAILABLE'){
        try{worker?.terminate()}catch{}
        worker=null;
      }
      entry.reject(error);
    }
  };
  worker.onerror=event=>{
    const message=event?.message||'Nexus WASM Runtime worker failed.';
    const entries=[...pending.values()];
    pending.clear();
    for(const entry of entries){
      clearTimeout(entry.timer);
      const error=new Error(message);
      error.code='WASM_WORKER_FAILURE';
      error.anxProvider=wasmRuntimeProvider;
      error.anxCapability=entry.capability;
      error.anxProviderLimit=true;
      entry.reject(error);
    }
    try{worker?.terminate()}catch{}
    worker=null;
    patchState({status:'error',phase:null,percent:null,lastError:message});
  };
  return worker;
}

function requestWorker(type,payload,capability){
  const requestId=`wasm-${Date.now()}-${++sequence}`;
  const runtimeWorker=ensureWorker();
  return new Promise((resolve,reject)=>{
    const entry={requestId,resolve,reject,capability,timer:null,phase:'toolchain'};
    pending.set(requestId,entry);arm(entry,'toolchain');
    runtimeWorker.postMessage({type,requestId,...payload});
  });
}

export const wasmRuntimeProvider={
  id:'wasm-cpp',
  label:'Nexus WASM C++ Runtime',
  tier:'wasm',
  priority:40,
  languages:['c','cpp'],
  planned:false,
  lifecycle:'ready-on-demand/pinned-clang-wasi',
  toolchain:modernCppToolchainLabel(),
  capabilities:{stdin:true,stdout:true,unicode:true,files:true,threads:false,gui:false,fullStdlib:true,multiFile:'basic',cppStandard:'c++20',cppExceptions:false,compilerDiagnostics:true,workerIsolation:true},
  getState(){return{...state}},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},
  inspect(input={}){
    const request=normalizeRuntimeRequest(input);
    if(!this.languages.includes(request.languageId))return{support:RUNTIME_SUPPORT.UNSUPPORTED,confidence:RUNTIME_SUPPORT.UNSUPPORTED,reasons:['language-not-supported']};
    const projectFiles=runtimeProjectFileCount(request);
    const projectSource=runtimeProjectSource(request);
    const modern=request.languageId==='cpp'&&needsModernCpp(projectSource);
    const multiFile=projectFiles>1;
    return{
      support:RUNTIME_SUPPORT.GUARANTEED,
      confidence:RUNTIME_SUPPORT.GUARANTEED,
      features:[...(modern?[{id:'cpp.modern-runtime',labelRu:'Modern C++ / STL',labelEn:'Modern C++ / STL',support:RUNTIME_SUPPORT.GUARANTEED}]:[]),...(multiFile?[{id:'project.multi-file',labelRu:'многофайловая сборка',labelEn:'multi-file build',support:RUNTIME_SUPPORT.GUARANTEED}]:[])],
      bestEffort:[],
      reasons:[multiFile?'multi-file-wasm-required':modern?'modern-cpp-preferred':'wasm-toolchain-capable'],
      scoreHint:multiFile?180:(modern?110:-90)
    };
  },
  async available(input={}){
    const request=normalizeRuntimeRequest(input);
    return this.languages.includes(request.languageId)&&workerSupported();
  },
  async probeFoundation(){
    const result=await requestWorker('probe',{},this.inspect({languageId:'cpp',source:''}));
    state.lastProbe=result;return result;
  },
  async run(input={}){
    const request=normalizeRuntimeRequest(input);
    if(!this.languages.includes(request.languageId))throw new Error(`Nexus WASM Runtime does not support ${request.languageId}.`);
    if(BUSY_STATES.has(state.status)){
      const error=new Error('Nexus WASM Runtime уже выполняет другую задачу. Дождитесь завершения текущей компиляции.');
      error.code='WASM_RUNTIME_BUSY';throw error;
    }
    const capability=this.inspect(request);
    if(request.languageId==='cpp'&&usesCppExceptions(runtimeProjectSource(request))){
      const error=new Error('The pinned Nexus WASM C++ sysroot is built without C++ exception support; try/throw/catch requires a future exception-enabled provider.');
      error.code='WASM_CPP_EXCEPTIONS_UNSUPPORTED';
      error.anxProvider=wasmRuntimeProvider;
      error.anxCapability=capability;
      error.anxProviderLimit=true;
      throw error;
    }
    patchState({status:'loading-toolchain',phase:'toolchain',percent:0,lastError:null});
    return requestWorker('run',{request},capability);
  },
  shutdown(){resetWorker('shutdown')}
};
