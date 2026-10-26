import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {CPP_EXCEPTION_RUNTIME} from '../pwa/runtime-manifest.js';
import {decodeCppExceptionPack,cppExceptionSysroot} from '../sandbox/cpp-exceptions.js';
const bytes=new Uint8Array(await readFile(new URL('../runtime-packs/wasi-sdk33/cpp-exceptions.bin',import.meta.url))),index=JSON.parse(await readFile(new URL('../runtime-packs/wasi-sdk33/cpp-exceptions.json',import.meta.url))),sha=b=>createHash('sha256').update(b).digest('hex');
test('Реальный пакет: pinned digest, полный индекс и неизменённые библиотечные файлы',async()=>{
 assert.equal(bytes.length,CPP_EXCEPTION_RUNTIME.bytes);assert.equal(sha(bytes),CPP_EXCEPTION_RUNTIME.sha256);assert.equal(index.sha256,sha(bytes));
 const files=await decodeCppExceptionPack(bytes);assert.equal(Object.keys(files).length,index.files.length);
 for(const f of index.files){assert.equal(files[f.path].length,f.bytes);assert.equal(sha(files[f.path]),f.sha256,f.path)}
 assert.equal(index.reusedCppHeaderCount,1678);assert.ok(Object.keys(files).every(p=>!p.includes('/noeh/')&&!p.endsWith('.so')&&!p.includes('llvm-lto')));
});
test('Повреждённый или обрезанный пакет не декодируется',async()=>{
 const changed=bytes.slice();changed[changed.length-100]^=1;
 await assert.rejects(decodeCppExceptionPack(changed),{code:'ASSET_INTEGRITY_MISMATCH'});
 await assert.rejects(decodeCppExceptionPack(bytes.subarray(1)),{code:'ASSET_SIZE_MISMATCH'});
});
test('Отказ загрузки не кешируется как готовность: повторная загрузка, omit credentials и общий verified sysroot',async()=>{
 const original=globalThis.fetch,calls=[];let first=true;
 try{
  globalThis.fetch=async(url,options)=>{calls.push({url,options});if(first){first=false;return new Response(new Uint8Array(bytes.length))}return new Response(bytes)};
  await assert.rejects(cppExceptionSysroot(),{code:'WASM_TOOLCHAIN_UNAVAILABLE'});
  const [a,b]=await Promise.all([cppExceptionSysroot(),cppExceptionSysroot()]);assert.equal(a,b);assert.equal(calls.length,2);assert.ok(a['lib/wasm32-wasip1/eh/libunwind.a']);
  for(const call of calls){assert.equal(call.url,CPP_EXCEPTION_RUNTIME.url);assert.equal(call.options.credentials,'omit');assert.equal(call.options.redirect,'error')}
 }finally{globalThis.fetch=original}
});
