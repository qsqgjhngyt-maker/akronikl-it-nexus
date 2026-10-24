import test from 'node:test';
import assert from 'node:assert/strict';
import {browserRuntimeProvider as browser} from '../sandbox/providers/browser-runtime.js';
import {wasmRuntimeProvider as wasm} from '../sandbox/providers/wasm-runtime.js';
import {NexusRuntimeRouter} from '../sandbox/runtime-router.js';
import {parseRuntimeError,analyzeSource} from '../sandbox/diagnostics.js';
const program=body=>'#include <iostream>\nint main(){int n;'+body+'return 0;}';
const cases=[
 'if (!(std::cin >> n)) return 1;',
 'if ( ! ( std :: cin >> n ) ) return 1;',
 'if(std::cin >> n) std::cout<<n;',
 'while(cin >> n) cout<<n;',
 'std::cin >> std::ws; if(!std::cin.eof()) return 1;',
 'std::cin >> n; if(std::cin.fail()) return 1;',
 'std::cin >> n; if(std::cin.good()) std::cout<<n;',
 'bool ok=static_cast<bool>(std::cin >> n);',
 'std::cin >> n; auto& input=std::cin; if(!(input >> n)) return 1;'
];
test('Стандартные stream-state конструкции выбирают настоящий C++, исходник сохраняется',async()=>{
 const old=globalThis.Worker;globalThis.Worker=class{};
 try{for(const body of cases){const source=program(body),router=new NexusRuntimeRouter([browser,wasm]);assert.equal(browser.inspect(source).support,'unsupported',body);const route=await router.route({languageId:'cpp',source});assert.equal(route.provider.id,'wasm-cpp',body);assert.equal(route.request.source,source);}}
 finally{if(old===undefined)delete globalThis.Worker;else globalThis.Worker=old;}
});
test('Недоступный настоящий C++ не заменяется несовместимым JSCPP',async()=>{
 const router=new NexusRuntimeRouter([browser,{...wasm,available:async()=>false}]);
 await assert.rejects(router.route({languageId:'cpp',source:program(cases[0])}),/not available/);
});
test('Простой ввод/вывод остаётся быстрым; комментарии и строки не меняют маршрут',async()=>{
 for(const source of [program('std::cin >> n; std::cout<<n;'),program('std::cout<<"cin ! fail()"; /* if (!(std::cin>>n)) */'),program('// std::cin.fail()\nstd::cout<<8;')]){
  assert.equal(browser.inspect(source).support,'guaranteed');assert.equal((await new NexusRuntimeRouter([browser,wasm]).route({languageId:'cpp',source})).provider.id,'browser-jscpp');
 }
});
test('Прямой вызов JSCPP отклоняет ограничение среды без ложной ошибки имени/строки',async()=>{
 const source=program(cases[0]);let error;try{await browser.run({languageId:'cpp',source})}catch(e){error=e;}
 assert.equal(error?.code,'BROWSER_CPP_STANDARD_UNSUPPORTED');const diagnostic=parseRuntimeError(error,source,{analysis:analyzeSource(source),locale:'ru'});
 assert.equal(diagnostic.kind,'provider-limit');assert.equal(diagnostic.line,null);assert.equal(diagnostic.providerLimit,true);
});
test('Неявный return main выполняет настоящий C++, включая ранний условный return',async()=>{
 const old=globalThis.Worker;globalThis.Worker=class{};
 try{for(const source of ['int main(){}',program('std::cout<<360;').replace('return 0;',''), 'int main(){int n=1; if(n){return 0;} n++;}']){
  assert.equal(browser.inspect(source).features[0].id,'cpp.main-return');assert.equal((await new NexusRuntimeRouter([browser,wasm]).route({languageId:'cpp',source})).provider.id,'wasm-cpp');
 }}finally{if(old===undefined)delete globalThis.Worker;else globalThis.Worker=old;}
});
