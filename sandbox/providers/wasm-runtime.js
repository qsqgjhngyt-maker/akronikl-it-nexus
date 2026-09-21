import {normalizeRuntimeRequest,RUNTIME_SUPPORT} from '../provider-contract.js';

const MODERN_CPP_PATTERNS=[
  /#\s*include\s*<(string|vector|memory|map|unordered_map|set|algorithm|ranges|filesystem|thread|future|optional|variant|tuple|regex|format)>/,
  /\b(virtual|override|final|template|concept|constexpr|unique_ptr|shared_ptr|make_unique|make_shared)\b/
];

const state={status:'idle',lastProbe:null};
const listeners=new Set();
const emit=()=>listeners.forEach(fn=>{try{fn({...state})}catch{}});

function needsModernCpp(source=''){return MODERN_CPP_PATTERNS.some(pattern=>pattern.test(String(source||'')))}

export const wasmRuntimeProvider={
  id:'wasm-cpp',
  label:'Nexus WASM C++ Runtime',
  tier:'wasm',
  priority:40,
  languages:['c','cpp'],
  planned:true,
  lifecycle:'foundation-worker-ready/compiler-planned',
  workerUrl:'./sandbox/workers/wasm-runtime-worker.js',
  capabilities:{stdin:true,stdout:true,unicode:true,files:'virtual-planned',threads:'planned',gui:false,fullStdlib:'planned-full',multiFile:'planned'},
  getState(){return{...state}},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},
  inspect(input={}){
    const request=normalizeRuntimeRequest(input);
    if(!this.languages.includes(request.languageId))return{support:RUNTIME_SUPPORT.UNSUPPORTED,confidence:RUNTIME_SUPPORT.UNSUPPORTED,reasons:['language-not-supported']};
    const modern=request.languageId==='cpp'&&needsModernCpp(request.source);
    return{
      support:RUNTIME_SUPPORT.GUARANTEED,
      confidence:RUNTIME_SUPPORT.GUARANTEED,
      features:modern?[{id:'cpp.modern-runtime',labelRu:'Modern C++ / STL',labelEn:'Modern C++ / STL',support:RUNTIME_SUPPORT.GUARANTEED}]:[],
      bestEffort:[],
      reasons:[modern?'modern-cpp-preferred':'wasm-toolchain-capable'],
      scoreHint:modern?80:-80
    };
  },
  async available(){return false},
  async probeFoundation(){
    if(typeof Worker==='undefined')return{ok:false,state:'worker-unavailable',compilerReady:false,reason:'web-worker-api-unavailable'};
    state.status='loading';emit();
    const result=await new Promise((resolve,reject)=>{
      const worker=new Worker(new URL('../workers/wasm-runtime-worker.js',import.meta.url),{type:'module'});
      const requestId=`probe-${Date.now()}`;
      const timer=setTimeout(()=>{worker.terminate();reject(new Error('WASM foundation worker probe timeout.'))},5000);
      worker.onmessage=event=>{if(event.data?.requestId!==requestId)return;clearTimeout(timer);worker.terminate();resolve(event.data)};
      worker.onerror=event=>{clearTimeout(timer);worker.terminate();reject(new Error(event.message||'WASM foundation worker failed.'))};
      worker.postMessage({type:'probe',requestId});
    });
    state.status=result.ok?'foundation-ready':'unavailable';state.lastProbe=result;emit();return result;
  },
  async run(input={}){
    const request=normalizeRuntimeRequest(input);
    const error=new Error(`Nexus WASM Runtime compiler is not integrated yet for ${request.languageId}.`);
    error.code='WASM_COMPILER_NOT_READY';
    error.anxProvider=this;
    error.anxCapability=this.inspect(request);
    throw error;
  }
};
