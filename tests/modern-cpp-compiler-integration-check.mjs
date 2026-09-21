import {NexusRuntimeRouter} from '../sandbox/runtime-router.js';
import {browserRuntimeProvider} from '../sandbox/providers/browser-runtime.js';
import {wasmRuntimeProvider} from '../sandbox/providers/wasm-runtime.js';
import {parseRuntimeError,analyzeSource} from '../sandbox/diagnostics.js';
import {MODERN_CPP_TOOLCHAIN} from '../sandbox/runtime-assets.js';

const assert=(value,message)=>{if(!value)throw new Error(message)};

assert(MODERN_CPP_TOOLCHAIN.version==='22.0.0-git20542-10','Clang package must be pinned to an exact version');
assert(MODERN_CPP_TOOLCHAIN.compilerModuleUrl.includes('@yowasp/clang@22.0.0-git20542-10'),'unpinned compiler URL');
assert(MODERN_CPP_TOOLCHAIN.wasiModuleUrl.includes('@runno/wasi@0.10.0'),'unpinned WASI runner URL');

const acceptance=`#include <iostream>
#include <string>
#include <vector>
#include <memory>
class Device { public: virtual ~Device() = default; virtual std::string name() const = 0; };
class Printer final : public Device { public: std::string name() const override { return "Printer"; } };
int main(){ std::vector<std::unique_ptr<Device>> devices; devices.push_back(std::make_unique<Printer>()); std::cout << devices[0]->name() << '\\n'; }`;

const realWorker=globalThis.Worker;
class FakeWorker{
  constructor(){this.onmessage=null;this.onerror=null;this.terminated=false}
  postMessage(message){
    queueMicrotask(()=>this.onmessage?.({data:{type:'runtime-progress',requestId:message.requestId,phase:'compile',status:'compiling'}}));
    queueMicrotask(()=>this.onmessage?.({data:{type:'runtime-progress',requestId:message.requestId,phase:'run',status:'running'}}));
    queueMicrotask(()=>this.onmessage?.({data:{type:'runtime-result',requestId:message.requestId,state:'ready',compilerReady:true,result:{stdout:'Printer\n',stderr:'',exitCode:0,elapsedMs:25,compileMs:20,runMs:5,compiler:'Clang/LLVM test',target:'wasm32-wasip1',languageId:'cpp'}}}));
  }
  terminate(){this.terminated=true}
}
globalThis.Worker=FakeWorker;

const router=new NexusRuntimeRouter([browserRuntimeProvider,wasmRuntimeProvider]);
const route=await router.route({languageId:'cpp',source:acceptance});
assert(route.provider.id==='wasm-cpp','Modern C++ must route to the WASM provider when Worker/WebAssembly are available');
const result=await route.provider.run({languageId:'cpp',source:acceptance,stdin:''});
assert(result.stdout==='Printer\n','WASM provider result normalization failed');
assert(result.exitCode===0,'WASM provider exit code failed');
assert(result.compileMs===20&&result.runMs===5,'compile/run timings missing');
wasmRuntimeProvider.shutdown();

const broken=`#include <iostream>
int main(){
  std::cout << "broken" << ;
}`;
const compilerError=new Error('main.cpp:3:28: error: expected expression');
compilerError.code='WASM_COMPILE_ERROR';
compilerError.anxPhase='compile';
compilerError.anxCompilerOutput='main.cpp:3:28: error: expected expression\n  std::cout << "broken" << ;\n                           ^';
const diag=parseRuntimeError(compilerError,broken,{analysis:analyzeSource(broken,[]),locale:'ru'});
assert(diag.kind==='compiler-error','real Clang diagnostic must be classified as compiler-error');
assert(diag.providerLimit===false,'real Clang error must never be hidden as provider limitation');
assert(diag.line===3&&diag.column===28,'Clang line/column parsing failed');
assert(diag.explanation.includes('expected expression'),'human explanation must preserve the compiler message');

const networkError=new Error('Failed to fetch dynamically imported module');
networkError.code='WASM_TOOLCHAIN_UNAVAILABLE';
networkError.anxProviderLimit=true;
const networkDiag=parseRuntimeError(networkError,acceptance,{analysis:analyzeSource(acceptance,[]),locale:'ru'});
assert(networkDiag.providerLimit===true,'toolchain network failure must be an environment limitation');
assert(networkDiag.line===null,'environment limitation must not mark learner source line');

if(realWorker===undefined)delete globalThis.Worker;else globalThis.Worker=realWorker;
console.log('MODERN_CPP_COMPILER_INTEGRATION_PASS',route.provider.id,result.stdout.trim());
