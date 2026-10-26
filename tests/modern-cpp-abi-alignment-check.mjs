import assert from 'node:assert/strict';
import {wasmRuntimeProvider} from '../sandbox/providers/wasm-runtime.js';
import {nativeCppExceptionsAvailable} from '../sandbox/cpp-exceptions.js';
import {parseRuntimeError,analyzeSource} from '../sandbox/diagnostics.js';
const source='int main(){try{throw 1;}catch(...){return 0;}}',native=nativeCppExceptionsAvailable();
const inspect=()=>wasmRuntimeProvider.inspect({languageId:'cpp',source});
assert.equal(wasmRuntimeProvider.capabilities.cppExceptions,native);
assert.equal(inspect().features.find(x=>x.id==='cpp.exceptions').support,native?'guaranteed':'unsupported');
assert.equal(inspect().support,native?'guaranteed':'best-effort');
const original=globalThis.WebAssembly;
try{
 globalThis.WebAssembly={...original,validate:()=>false};
 assert.equal(wasmRuntimeProvider.capabilities.cppExceptions,false);
 assert.equal(inspect().support,'best-effort');
 assert.ok(inspect().requires.includes('native-wasm-final-eh-for-cpp-exceptions'));
 assert.equal(wasmRuntimeProvider.inspect({languageId:'c',source:'int main(){return 0;}'}).support,'guaranteed');
}finally{globalThis.WebAssembly=original}
const error=Object.assign(new Error('Браузер не поддерживает standard WebAssembly EH'),{code:'WASM_CPP_EXCEPTIONS_UNSUPPORTED',anxProviderLimit:true});
const diag=parseRuntimeError(error,source,{analysis:analyzeSource(source,[]),locale:'ru'});
assert.equal(diag.providerLimit,true);assert.equal(diag.line,null);
console.log('MODERN_CPP_ABI_ALIGNMENT_PASS: feature-sensitive native EH; older browser best-effort no-EH; actual execution is a separate browser gate');
