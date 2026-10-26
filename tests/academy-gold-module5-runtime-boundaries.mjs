// Настоящий компилятор; отрицательный контроль feature probe, не fake compiler/source.
import assert from 'node:assert/strict';import {readFile,mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';
const out=path.resolve(process.env.NEXUS_M5_EVIDENCE),manifest=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration,records=[];await mkdir(out,{recursive:true});
async function run(f,source,{languageId='cpp',files={}}={}){return f.page.evaluate(async({prefix,source,languageId,files})=>{
 const {pickProvider}=await import(prefix+'/sandbox/sandbox.js'),request={languageId,source,files,entryFile:languageId==='c'?'main.c':'main.cpp'},before=JSON.stringify(request);const route=await pickProvider(request);let result;
 try{const r=await route.provider.run(request);result={ok:true,stdout:r.stdout,stderr:r.stderr,exitCode:r.exitCode,cppExceptions:r.cppExceptions}}catch(e){const {parseRuntimeError,analyzeSource}=await import(prefix+'/sandbox/diagnostics.js'),d=parseRuntimeError(e,source,{analysis:analyzeSource(source,[]),locale:'ru'});result={ok:false,code:e.code,phase:e.anxPhase,providerLimit:!!e.anxProviderLimit,line:d.line,message:e.message}}
 return{...result,provider:route.provider.id,assessment:route.assessment,sourceUnchanged:before===JSON.stringify(request)};
},{prefix,source,languageId,files})}
for(const native of [true,false]){const f=await onlineRuntimeFixture();try{
 if(!native)await f.context.addInitScript(()=>{
  // Явная симуляция отсутствия final-EH feature probe в page и module Worker.
  // Все программы всё равно разбираются и исполняются настоящим Clang/WASI.
  const install=()=>{const validate=WebAssembly.validate;WebAssembly.validate=function(bytes){return bytes?.byteLength===36?false:validate.call(WebAssembly,bytes)}};
  install();const NativeWorker=Worker;
  globalThis.Worker=class extends NativeWorker{constructor(url,options){if(options?.type==='module'){const script='('+install.toString()+')();const queued=[];const hold=e=>{queued.push(e.data);e.stopImmediatePropagation()};self.addEventListener("message",hold);await import('+JSON.stringify(new URL(url,location.href).href)+');self.removeEventListener("message",hold);for(const data of queued)self.dispatchEvent(new MessageEvent("message",{data}));',blob=URL.createObjectURL(new Blob([script],{type:'text/javascript'}));super(blob,options);URL.revokeObjectURL(blob)}else super(url,options)}};
 });
 await f.page.goto(f.origin+'/#view=home');await f.page.locator('.visual-home').waitFor();await f.waitReady();
 assert.equal(await f.page.evaluate(async prefix=>(await import(prefix+'/sandbox/cpp-exceptions.js')).nativeCppExceptionsAvailable(),prefix),native,'Environment feature control failed');
 const cases=[
  {id:'raw-literal',source:'#include <iostream>\nint main(){std::cout<<R"tag(" throw ")tag"<<"\\n";}',stdout:'" throw "\n'},
  {id:'data-file-is-not-source',source:'#include <fstream>\n#include <iostream>\nint main(){std::ifstream in("words.txt");std::string s;while(in>>s)std::cout<<s<<" ";}',files:{'words.txt':'throw catch try'},stdout:'throw catch try '},
  {id:'macro-exception',source:'#include <iostream>\n#define DO_THROW throw\nint main(){try{DO_THROW 7;}catch(int n){std::cout<<n<<"\\n";}}',stdout:'7\n',exception:true},
  {id:'c-identifiers',source:'#include <stdio.h>\nint main(){int try=1,throw=2,catch=3;printf("%d\\n",try+throw+catch);}',languageId:'c',stdout:'6\n'},
 ];
 for(const c of cases){console.log(JSON.stringify({nativeEh:native,case:c.id}));const r=await run(f,c.source,c);assert.equal(r.provider,'wasm-cpp');assert.equal(r.sourceUnchanged,true);
  if(c.exception&&!native){assert.equal(r.ok,false);assert.equal(r.code,'WASM_CPP_EXCEPTIONS_UNSUPPORTED');assert.equal(r.providerLimit,true);assert.equal(r.line,null);assert.equal(r.assessment.support,'best-effort')}
  else{assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.stdout,c.stdout);assert.equal(r.exitCode,0);assert.equal(r.stderr,'')}
  records.push({nativeEh:native,id:c.id,status:'PASS',result:r});
 }
 if(native){const r=await run(f,'int main(){throw 7;}');assert.equal(r.ok,false);assert.equal(r.phase,'run');assert.notEqual(r.code,'WASM_CPP_EXCEPTIONS_UNSUPPORTED');assert.equal(r.providerLimit,false);records.push({nativeEh:true,id:'uncaught-terminates',status:'PASS',result:r});}
 const recovered=await run(f,'#include <iostream>\nint main(){std::cout<<"recovered\\n";}');assert.equal(recovered.ok,true);assert.equal(recovered.stdout,'recovered\n');records.push({nativeEh:native,id:'recovery',status:'PASS',result:recovered});
 assert.deepEqual(f.errors,[]);
}finally{await f.close()}}
const result={status:'PASS',cases:records.length,realCompiler:true,realWorker:true,noEhSimulatedByFeatureProbe:true,physicalOldBrowser:false,sourceRewrite:false,productionRequests:0,cloudWrites:0,records};await writeFile(path.join(out,'BOUNDARIES.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,records:undefined}));
