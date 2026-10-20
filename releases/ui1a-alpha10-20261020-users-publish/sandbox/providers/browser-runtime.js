import {normalizeRuntimeRequest,runtimeResult,runtimeProjectFileCount,RUNTIME_SUPPORT} from '../provider-contract.js';

const RUNNER_URL='https://felixhao28.github.io/JSCPP/dist/JSCPP.es5.min.js';
let runnerPromise=null;

const FEATURE_RULES=[
  {id:'cpp.class',labelRu:'классы',labelEn:'classes',pattern:/\b(class|struct)\s+[A-Za-z_]\w*/},
  {id:'cpp.inheritance',labelRu:'наследование',labelEn:'inheritance',pattern:/\b(class|struct)\s+[A-Za-z_]\w*\s*:\s*(public|protected|private)?\s*[A-Za-z_]\w*/},
  {id:'cpp.virtual',labelRu:'virtual-функции',labelEn:'virtual functions',pattern:/\bvirtual\b/},
  {id:'cpp.override',labelRu:'override',labelEn:'override',pattern:/\boverride\b/},
  {id:'cpp.final',labelRu:'final',labelEn:'final',pattern:/\bfinal\b/},
  {id:'cpp.templates',labelRu:'шаблоны',labelEn:'templates',pattern:/\btemplate\s*</},
  {id:'cpp.exceptions',labelRu:'исключения',labelEn:'exceptions',pattern:/\b(try|catch|throw)\b/},
  {id:'cpp.smart-pointers',labelRu:'умные указатели',labelEn:'smart pointers',pattern:/\b(unique_ptr|shared_ptr|weak_ptr|make_unique|make_shared)\b/},
  {id:'cpp.threads',labelRu:'потоки',labelEn:'threads',pattern:/\b(std::)?(thread|jthread|mutex|atomic)\b/}
];

const BEST_EFFORT=new Set([
  'cpp.class','cpp.constructor','cpp.inheritance','cpp.virtual','cpp.override','cpp.final',
  'cpp.templates','cpp.exceptions','cpp.smart-pointers','cpp.threads'
]);

const EXTENDED_STDLIB_HEADERS=new Set([
  'algorithm','array','atomic','chrono','deque','exception','filesystem','format','fstream','functional','future','iomanip','list','map','memory','mutex','optional','queue','random','ranges','regex','set','sstream','stdexcept','string','string_view','thread','tuple','type_traits','unordered_map','unordered_set','utility','variant','vector'
]);

function sourceFrom(input){return normalizeRuntimeRequest(typeof input==='string'?{languageId:'cpp',source:input}:input).source}

function detectFeatures(input=''){
  const code=sourceFrom(input);
  const features=FEATURE_RULES.filter(x=>x.pattern.test(code)).map(x=>({id:x.id,labelRu:x.labelRu,labelEn:x.labelEn,support:BEST_EFFORT.has(x.id)?RUNTIME_SUPPORT.BEST_EFFORT:RUNTIME_SUPPORT.GUARANTEED}));
  const classNames=[...code.matchAll(/\b(?:class|struct)\s+([A-Za-z_]\w*)/g)].map(x=>x[1]);
  if(classNames.some(name=>new RegExp(`\\b${name}\\s*\\(`).test(code))){
    features.push({id:'cpp.constructor',labelRu:'конструкторы',labelEn:'constructors',support:RUNTIME_SUPPORT.BEST_EFFORT});
  }
  for(const match of code.matchAll(/^\s*#\s*include\s*<([^>]+)>/gm)){
    const header=String(match[1]||'').trim();
    if(EXTENDED_STDLIB_HEADERS.has(header))features.push({id:`cpp.stdlib.${header}`,labelRu:`стандартная библиотека <${header}>`,labelEn:`standard library <${header}>`,support:RUNTIME_SUPPORT.BEST_EFFORT});
  }
  return features;
}

function isParseLike(error){
  const raw=String(error?.message||error||'');
  return /Parsing Failure|Expected|parse|syntax|unexpected token/i.test(raw);
}

function stripOverrideForCompatibility(code){
  if(!/\boverride\b/.test(code))return null;
  return code.replace(/\s+override\b/g,'');
}

async function runWithRuntime(runtime,code,stdin){
  let stdout='';
  const started=performance.now();
  const result=runtime.run(code,String(stdin??''),{stdio:{write:value=>{stdout+=String(value)}}});
  const exitCode=result&&result.v!==undefined?result.v:result;
  return{stdout,stderr:'',exitCode,elapsedMs:Math.max(0,Math.round(performance.now()-started))};
}

export const browserRuntimeProvider={
  id:'browser-jscpp',
  label:'Nexus Browser Runtime',
  tier:'browser',
  priority:30,
  languages:['cpp'],
  lifecycle:'ready-on-demand',
  capabilities:{
    stdin:true,stdout:true,unicode:true,files:false,threads:false,gui:false,fullStdlib:false,multiFile:false,
    guaranteed:['console-io','variables','expressions','conditions','loops','functions','basic-arrays'],
    bestEffort:['classes','constructors','inheritance','virtual','override','templates','exceptions','smart-pointers','extended-stdlib']
  },
  async available(input={}){return normalizeRuntimeRequest(input).languageId==='cpp'},
  inspect(input=''){
    const request=normalizeRuntimeRequest(typeof input==='string'?{languageId:'cpp',source:input}:input);
    if(request.languageId!=='cpp')return{support:RUNTIME_SUPPORT.UNSUPPORTED,confidence:RUNTIME_SUPPORT.UNSUPPORTED,features:[],bestEffort:[],reasons:['language-not-supported']};
    if(runtimeProjectFileCount(request)>1)return{support:RUNTIME_SUPPORT.UNSUPPORTED,confidence:RUNTIME_SUPPORT.UNSUPPORTED,features:[],bestEffort:[],reasons:['multi-file-not-supported'],requires:['wasm-or-secure-build']};
    const features=detectFeatures(request);
    const bestEffort=features.filter(x=>x.support===RUNTIME_SUPPORT.BEST_EFFORT);
    const support=bestEffort.length?RUNTIME_SUPPORT.BEST_EFFORT:RUNTIME_SUPPORT.GUARANTEED;
    return{features,bestEffort,support,confidence:support,reasons:bestEffort.length?['lightweight-cpp-subset']:[]};
  },
  async load(){
    if(window.JSCPP)return window.JSCPP;
    if(runnerPromise)return runnerPromise;
    runnerPromise=new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);fn(value)};
      document.querySelector('script[data-anx-cpp-runner]')?.remove();
      const script=document.createElement('script');
      script.src=RUNNER_URL;script.async=true;script.dataset.anxCppRunner='1';
      const timer=setTimeout(()=>finish(reject,new Error('Nexus Browser Runtime не загрузился за 20 секунд. Проверьте соединение и повторите попытку.')),20000);
      script.onload=()=>window.JSCPP?finish(resolve,window.JSCPP):finish(reject,new Error('Runtime загружен, но API выполнения недоступен.'));
      script.onerror=()=>finish(reject,new Error('Не удалось загрузить Nexus Browser Runtime. Для первого запуска требуется подключение к runtime-пакету.'));
      document.head.appendChild(script);
    });
    try{return await runnerPromise}catch(err){runnerPromise=null;throw err}
  },
  normalize(source){
    const original=String(source??'').replace(/\r\n?/g,'\n');
    let code=original;
    const changes=[];
    const replacements=[
      ['std::cout','cout'],['std::cin','cin'],['std::cerr','cerr'],['std::endl','endl'],
      ['std::string','string'],['std::fixed','fixed'],['std::setprecision','setprecision']
    ];
    for(const [from,to] of replacements){
      if(code.includes(from)){code=code.split(from).join(to);changes.push(`${from} → ${to}`)}
    }
    let lineOffset=0;
    if(changes.length>0&&!/using\s+namespace\s+std\s*;/.test(code)){
      const lines=code.split('\n');let lastInclude=-1;for(let i=0;i<lines.length;i++)if(/^\s*#\s*include\b/.test(lines[i]))lastInclude=i;
      lines.splice(lastInclude+1,0,'using namespace std;');code=lines.join('\n');changes.push('added using namespace std;');lineOffset=1;
    }
    return{original,code,adapted:changes.length>0,changes,lineOffset,capability:this.inspect({languageId:'cpp',source:original})};
  },
  async run(input,legacyStdin=''){
    const request=normalizeRuntimeRequest(typeof input==='string'?{languageId:'cpp',source:input,stdin:legacyStdin}:input);
    if(request.languageId!=='cpp')throw new Error(`Nexus Browser Runtime does not support ${request.languageId}.`);
    const runtime=await this.load();
    const normalized=this.normalize(request.source);
    try{
      const first=await runWithRuntime(runtime,normalized.code,request.stdin);
      return runtimeResult(this,first,{normalized,capability:normalized.capability,compatibilityRetry:false,languageId:'cpp'});
    }catch(firstError){
      // `override` is a compile-time correctness annotation. Removing it in the
      // temporary Browser Runtime copy preserves the intended virtual-dispatch
      // semantics when the lightweight parser simply does not recognise the keyword.
      const retryCode=isParseLike(firstError)?stripOverrideForCompatibility(normalized.code):null;
      if(retryCode&&retryCode!==normalized.code){
        try{
          const retry=await runWithRuntime(runtime,retryCode,request.stdin);
          const retryNormalized={...normalized,code:retryCode,adapted:true,changes:[...normalized.changes,'override → removed in temporary Browser Runtime copy']};
          return runtimeResult(this,retry,{normalized:retryNormalized,capability:normalized.capability,compatibilityRetry:true,languageId:'cpp'});
        }catch(secondError){
          try{secondError.anxCompatibilityRetry=true;secondError.anxFirstError=String(firstError?.message||firstError||'');}catch{}
          firstError=secondError;
        }
      }
      try{
        firstError.anxLineOffset=normalized.lineOffset||0;
        firstError.anxNormalized=normalized;
        firstError.anxProvider=this;
        firstError.anxCapability=normalized.capability;
      }catch{}
      throw firstError;
    }
  }
};
