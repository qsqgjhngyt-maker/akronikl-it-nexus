import test from 'node:test';
import assert from 'node:assert/strict';
import {browserRuntimeProvider as browser} from '../sandbox/providers/browser-runtime.js';
import {wasmRuntimeProvider as wasm} from '../sandbox/providers/wasm-runtime.js';
import {NexusRuntimeRouter} from '../sandbox/runtime-router.js';
import {parseRuntimeError,analyzeSource} from '../sandbox/diagnostics.js';
import {M2_PROBES} from './fixtures/cpp-module2-probes.mjs';
const program=body=>'#include <iostream>\nint main(){int n;'+body+'return 0;}';
const sources=[
 ...M2_PROBES.map(p=>p.source),
 program('if (!(std::cin >> n)) return 1;'),
 program('std::cin >> n; auto& input=std::cin; if(!(input >> n)) return 1;'),
 program('std::cout<<"cin ! fail()"; /* if (!(std::cin>>n)) */'),
 'int main(){}',
 '#define COUNT 7\nint main(){int value=COUNT; return value/3;}'
];
test('Обычный C++20 и ошибочные исходники идут к настоящему compiler без изменения source',async()=>{
 const old=globalThis.Worker;globalThis.Worker=class{};
 try{for(const source of sources){
  const request={languageId:'cpp',source,stdin:'8\n'};
  assert.equal(browser.inspect(request).support,'unsupported');
  const route=await new NexusRuntimeRouter([browser,wasm]).route(request);
  assert.equal(route.provider.id,'wasm-cpp');assert.equal(route.request.source,source);
  assert.equal(route.request.stdin,request.stdin);
 }}finally{if(old===undefined)delete globalThis.Worker;else globalThis.Worker=old;}
});
test('Недоступный C++ compiler запрещает fallback для любых исходников',async()=>{
 const router=new NexusRuntimeRouter([browser,{...wasm,available:async()=>false}]);
 for(const source of sources){
  await assert.rejects(router.route({languageId:'cpp',source}),e=>{
   assert.equal(e.code,'WASM_ENVIRONMENT_UNAVAILABLE');assert.equal(e.anxProviderLimit,true);
   const diagnostic=parseRuntimeError(e,source,{analysis:analyzeSource(source),locale:'ru'});
   assert.equal(diagnostic.kind,'provider-limit');assert.equal(diagnostic.line,null);return true;
  });
 }
});
test('Прямой вызов старого provider не запускает JSCPP, не адаптирует и не принимает код',async()=>{
 let calls=0;const old=globalThis.window;
 globalThis.window={JSCPP:{run(){calls++;return 0;}}};
 try{for(const source of sources){
  assert.equal(await browser.available({languageId:'cpp',source}),false);
  await assert.rejects(browser.run({languageId:'cpp',source}),e=>e.code==='BROWSER_CPP_STANDARD_UNSUPPORTED'&&e.anxProviderLimit===true);
  const n=browser.normalize(source);assert.equal(n.code,source);assert.equal(n.original,source);assert.equal(n.adapted,false);
 }}finally{if(old===undefined)delete globalThis.window;else globalThis.window=old;}
 assert.equal(calls,0);
});
test('C остаётся на WASM, другие языки не получают C++ fallback',async()=>{
 const old=globalThis.Worker;globalThis.Worker=class{};
 try{const router=new NexusRuntimeRouter([browser,wasm]);
  assert.equal((await router.route({languageId:'c',source:'int main(void){return 0;}'})).provider.id,'wasm-cpp');
  await assert.rejects(router.route({languageId:'python',source:'print(1)'}),/no provider supports/);
 }finally{if(old===undefined)delete globalThis.Worker;else globalThis.Worker=old;}
});
