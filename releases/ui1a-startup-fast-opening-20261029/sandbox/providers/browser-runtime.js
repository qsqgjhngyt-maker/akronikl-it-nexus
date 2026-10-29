import {normalizeRuntimeRequest,runtimeProjectFileCount,RUNTIME_SUPPORT} from '../provider-contract.js';

// M2-0 / ADR-0022: JSCPP не сохраняет даже базовую семантику C++20.
// Экспорт и ID оставлены для совместимости импортов/диагностики; выполнение
// отключено целиком. Ни сеть, ни отсутствие Worker не разрешают этот fallback.
function unavailable(provider,request){
  const error=new Error('Standard C++ requires the pinned Clang/WASI provider. The deprecated JSCPP interpreter is disabled because it does not preserve C++ semantics.');
  error.code='BROWSER_CPP_STANDARD_UNSUPPORTED';
  error.anxProvider=provider;error.anxCapability=provider.inspect(request);
  error.anxProviderLimit=true;return error;
}
export const browserRuntimeProvider={
  id:'browser-jscpp',
  label:'Nexus Browser Runtime (deprecated)',
  tier:'browser',priority:30,languages:['cpp'],deprecated:true,lifecycle:'deprecated',
  capabilities:{
    stdin:false,stdout:false,unicode:false,files:false,threads:false,gui:false,
    fullStdlib:false,multiFile:false,guaranteed:[],bestEffort:[]
  },
  async available(){return false},
  inspect(input=''){
    const request=normalizeRuntimeRequest(typeof input==='string'?{languageId:'cpp',source:input}:input);
    return{
      support:RUNTIME_SUPPORT.UNSUPPORTED,confidence:RUNTIME_SUPPORT.UNSUPPORTED,
      features:[],bestEffort:[],
      reasons:request.languageId!=='cpp'?['language-not-supported']:
        [...(runtimeProjectFileCount(request)>1?['multi-file-not-supported']:[]),'deprecated-nonconforming-cpp-interpreter'],
      requires:['wasm-or-secure-build']
    };
  },
  // Старые вызывающие стороны могут получить снимок, без адаптации исходника.
  normalize(source){
    const original=String(source??'');
    return{original,code:original,adapted:false,changes:[],lineOffset:0,capability:this.inspect(original)};
  },
  async load(){throw unavailable(this,{languageId:'cpp'})},
  async run(input,legacyStdin=''){
    const request=normalizeRuntimeRequest(typeof input==='string'?{languageId:'cpp',source:input,stdin:legacyStdin}:input);
    throw unavailable(this,request);
  }
};
