import fs from 'node:fs';
import {wasmRuntimeProvider} from '../sandbox/providers/wasm-runtime.js';
import {parseRuntimeError,analyzeSource} from '../sandbox/diagnostics.js';

const assert=(v,m)=>{if(!v)throw new Error(m)};
const worker=fs.readFileSync(new URL('../sandbox/workers/wasm-runtime-worker.js',import.meta.url),'utf8');
assert(worker.includes("...(isC?[]:['-fno-exceptions'])"),'C++ compile path must align with the no-exception YoWASP sysroot');
assert(wasmRuntimeProvider.capabilities.cppExceptions===false,'provider must advertise C++ exceptions as unsupported');

const realWorker=globalThis.Worker;
class NeverWorker{constructor(){throw new Error('worker should not start for explicit exception syntax')}}
globalThis.Worker=NeverWorker;
const source='int main(){ try { throw 1; } catch(...) { return 0; } }';
let caught=null;
try{await wasmRuntimeProvider.run({languageId:'cpp',source})}catch(error){caught=error}
assert(caught?.code==='WASM_CPP_EXCEPTIONS_UNSUPPORTED','explicit C++ exceptions must be blocked as provider capability limit');
assert(caught?.anxProviderLimit===true,'exception capability boundary must be marked providerLimit');
const diag=parseRuntimeError(caught,source,{analysis:analyzeSource(source,[]),locale:'ru'});
assert(diag.providerLimit===true,'exception capability boundary must render as provider limitation');
assert(diag.line===null,'provider limitation must not blame a learner source line');
if(realWorker===undefined)delete globalThis.Worker;else globalThis.Worker=realWorker;
console.log('MODERN_CPP_ABI_ALIGNMENT_PASS');
