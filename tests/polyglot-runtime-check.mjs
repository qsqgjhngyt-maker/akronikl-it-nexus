import fs from 'node:fs';
import {programmingLanguages,resolveLanguage,languageEntryFile} from '../sandbox/languages.js';
import {NexusRuntimeRouter} from '../sandbox/runtime-router.js';
import {browserRuntimeProvider} from '../sandbox/providers/browser-runtime.js';
import {wasmRuntimeProvider} from '../sandbox/providers/wasm-runtime.js';
import {cloudRuntimeProvider} from '../sandbox/providers/cloud-runtime.js';

const assert=(v,m)=>{if(!v)throw new Error(m)};
const required=['c','cpp','rust','python','java','csharp','go','javascript','typescript','kotlin','swift','dart','php','ruby','bash','powershell','r','julia','lua','onec'];
assert(programmingLanguages.length>=20,'language registry is unexpectedly small');
for(const id of required)assert(resolveLanguage(id),`missing programming language ${id}`);
assert(resolveLanguage('js')?.id==='javascript','JavaScript alias resolution failed');
assert(resolveLanguage('1c')?.id==='onec','1C alias resolution failed');
assert(languageEntryFile('java')==='Main.java','Java entry file metadata failed');

const router=new NexusRuntimeRouter([browserRuntimeProvider,wasmRuntimeProvider,cloudRuntimeProvider]);
const simple=await router.route({languageId:'cpp',source:'#include <iostream>\nint main(){return 0;}'});
assert(simple.provider.id==='browser-jscpp','simple C++ should stay on the fast Browser provider');
assert(simple.reason==='best-supported-ready-provider','simple C++ route reason mismatch');

const modern=await router.route({languageId:'cpp',source:'#include <string>\n#include <vector>\nint main(){std::vector<int> x;return 0;}'});
assert(modern.provider.id==='browser-jscpp','modern C++ must temporarily fall back to Browser while WASM compiler is unavailable');
assert(modern.reason==='preferred-provider-unavailable-fallback','modern C++ must expose explicit preferred-provider fallback');
assert(modern.preferredUnavailable?.provider?.id==='wasm-cpp','WASM must be the preferred future provider for modern C++');

const pythonProvider={
  id:'test-python',label:'Test Python Runtime',tier:'browser',priority:1,languages:['python'],capabilities:{},
  async available(){return true},
  inspect(){return{support:'guaranteed'}},
  async run(){return{stdout:'PY_OK',stderr:'',exitCode:0,elapsedMs:0}}
};
const neutralRouter=new NexusRuntimeRouter([pythonProvider,browserRuntimeProvider]);
const py=await neutralRouter.route({languageId:'python',source:'print("ok")'});
assert(py.provider.id==='test-python','Router is not language-neutral for Python');

const worker=fs.readFileSync(new URL('../sandbox/workers/wasm-runtime-worker.js',import.meta.url),'utf8');
assert(worker.includes("message.type==='probe'"),'WASM worker probe protocol missing');
assert(worker.includes('runClang'),'Modern C++ Worker must invoke the real Clang API');
assert(worker.includes('WebAssembly.instantiate'),'Modern C++ Worker must instantiate the compiled WASI module');
assert(worker.includes("type:'runtime-result'"),'Modern C++ Worker result protocol missing');
console.log('POLYGLOT_RUNTIME_PASS',programmingLanguages.length,modern.reason);
