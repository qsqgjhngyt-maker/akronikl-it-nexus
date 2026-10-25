import test from 'node:test';import assert from 'node:assert/strict';
import {runtimeFilePath,runtimeInputFiles,runtimeOutputFiles,guardRuntimeFileImports} from '../sandbox/runtime-files.js';
import {normalizeRuntimeRequest} from '../sandbox/provider-contract.js';
import {createCodeWorkspace} from '../sandbox/code-workspace.js';
test('Файлы запроса: относительные пути, binary copy, отсутствие aliases и traversal',()=>{
 for(const path of ['../x','a/../x','/etc/synthetic','C:/x','a\\x','x\0y','a//b','./x','__proto__','a/constructor']){
  assert.throws(()=>runtimeFilePath(path),{code:'WASM_FILE_PATH_INVALID'});
  assert.throws(()=>normalizeRuntimeRequest({files:Object.fromEntries([[path,'x']])}),{code:'WASM_FILE_PATH_INVALID'});
 }
 const bytes=new Uint8Array([0,255,3]),fs=runtimeInputFiles({'data/a.bin':bytes});assert.equal(fs['/data/a.bin'].path,'/data/a.bin');bytes[0]=4;assert.equal(fs['/data/a.bin'].content[0],0);
 assert.throws(()=>runtimeInputFiles({'x.txt':'x'.repeat(512*1024+1)}),{code:'WASM_FILE_QUOTA'});
 assert.throws(()=>runtimeInputFiles(Object.fromEntries(Array.from({length:129},(_,i)=>['file'+i,'']))),{code:'WASM_FILE_QUOTA'});
});
test('Результаты: только изменённые файлы; UTF-8 и binary без потери байтов',()=>{
 const fs=runtimeInputFiles({'unchanged.txt':'same','changed.txt':'old'});fs['/changed.txt'].content=new TextEncoder().encode('новое');fs['/raw.bin']={content:new Uint8Array([0,255,1])};
 const out=runtimeOutputFiles(fs,{'unchanged.txt':'same','changed.txt':'old'});assert.equal(out['unchanged.txt'],undefined);assert.equal(out['changed.txt'],'новое');assert.deepEqual(out['raw.bin'],new Uint8Array([0,255,1]));
});
test('VFS принимает результат одним событием; code/entry/active и пользовательские поля сохранены',()=>{
 const w=createCodeWorkspace({files:[{path:'main.cpp',content:'// personal'},{path:'data.txt',content:'old'},{path:'notes.txt',content:'keep',readOnly:true}],activeFile:'main.cpp'}),base=w.runtimeFiles(),events=[];w.subscribe(e=>events.push(e));
 w.applyRuntimeFiles({'data.txt':'new','result.txt':'42'},base);assert.equal(events.length,1);assert.equal(events[0].type,'runtime-files-applied');assert.equal(w.getFile('main.cpp').content,'// personal');assert.equal(w.activeFile,'main.cpp');assert.equal(w.entryFile,'main.cpp');assert.equal(w.getFile('notes.txt').readOnly,true);
});
test('VFS отклоняет весь batch при конфликте, binary, readonly или изменении кода',()=>{
 for(const invalid of [{'main.cpp':'clobber'},{'a.hpp':'clobber'},{'locked.txt':'clobber'},{'raw.bin':new Uint8Array([255])},{'../x':'clobber'}]){
  const w=createCodeWorkspace({files:[{path:'main.cpp',content:'// keep'},{path:'locked.txt',content:'keep',readOnly:true}]}),before=w.serialize();assert.throws(()=>w.applyRuntimeFiles({'valid.txt':'new',...invalid},w.runtimeFiles()));assert.equal(w.serialize(),before);
 }
 const w=createCodeWorkspace({files:[{path:'main.cpp',content:'// keep'},{path:'data.txt',content:'old'}]}),base=w.runtimeFiles();w.updateFile('data.txt','personal edit');const before=w.serialize();assert.throws(()=>w.applyRuntimeFiles({'new.txt':'new','data.txt':'runtime'},base),/RUNTIME_FILE_CONFLICT/);assert.equal(w.serialize(),before);
 w.addFile('new.txt','personal addition');assert.throws(()=>w.applyRuntimeFiles({'new.txt':'runtime'},base),/RUNTIME_FILE_CONFLICT/);
});
test('WASI imports: большой write/allocate/resize отклоняется до вызова выделяющего память runner',()=>{
 const memory=new WebAssembly.Memory({initial:1}),bytes=new Uint8Array(memory.buffer),v=new DataView(memory.buffer);bytes.set(new TextEncoder().encode('report.txt'),32);let calls=0;
 const imports=guardRuntimeFileImports({path_open(...a){v.setUint32(a[8],10,true);return 0},fd_write(){calls++;return 0},fd_allocate(){calls++;return 0},fd_filestat_set_size(){calls++;return 0}},()=>memory,{});
 assert.equal(imports.path_open(3,0,32,10,1,0n,0n,0,80),0);
 v.setUint32(104,512*1024+1,true);assert.throws(()=>imports.fd_write(10,100,1,120),{code:'WASM_FILE_QUOTA'});
 assert.throws(()=>imports.fd_allocate(10,0n,2n**40n),{code:'WASM_FILE_QUOTA'});assert.throws(()=>imports.fd_filestat_set_size(10,2n**40n),{code:'WASM_FILE_QUOTA'});assert.equal(calls,0);
});
