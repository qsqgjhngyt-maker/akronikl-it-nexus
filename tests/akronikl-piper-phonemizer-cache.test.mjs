import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createPiperPhonemizerCache} from '../akronikl/experience/piper-phonemizer-cache.js';
import {installPiperXHR} from '../akronikl/experience/piper-xhr.js';
const base=new URL('https://public.example/piper/'),file='piper_phonemize.data',bytes=new TextEncoder().encode('verified public phonemizer');
const record={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),mime:'application/octet-stream'},assets={[file]:record,'piper_phonemize.wasm':record};
const tick=()=>new Promise(r=>setImmediate(r));
test('distinct utterances and concurrent consumers reuse verified bytes with independent response bodies',async()=>{
 let calls=0,release;const gate=new Promise(r=>release=r);const read=createPiperPhonemizerCache({base,assets,fetchResource:async(url,init)=>{calls++;assert.equal(new URL(url).origin,base.origin);assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');await gate;return new Response(bytes);}});
 const a=read(file),b=read(file);release();const [ra,rb]=await Promise.all([a,b]);const changed=new Uint8Array(await ra.arrayBuffer());changed.fill(0);assert.deepEqual(new Uint8Array(await rb.arrayBuffer()),bytes);
 assert.deepEqual(new Uint8Array(await(await read(file)).arrayBuffer()),bytes);assert.equal(calls,1);
 await read('piper_phonemize.wasm');await read('piper_phonemize.wasm');assert.equal(calls,2);
 await assert.rejects(read('private-user-text'),/NETWORK_DENIED/);assert.equal(calls,2);
});
test('bad hash, oversized body and network failure never poison the cache',async()=>{
 for(const fail of [()=>new Response(new Uint8Array(bytes.length)),()=>new Response(new Uint8Array(bytes.length+1)),()=>{throw Error('offline')}]){
  let calls=0;const read=createPiperPhonemizerCache({base,assets,fetchResource:async()=>++calls===1?fail():new Response(bytes)});
  await assert.rejects(read(file));assert.deepEqual(new Uint8Array(await(await read(file)).arrayBuffer()),bytes);await read(file);assert.equal(calls,2);
 }
});
test('one caller can abort without cancelling another; last caller abort cancels the public transfer',async()=>{
 let calls=0,release,lastSignal;const gate=new Promise(r=>release=r);const read=createPiperPhonemizerCache({base,assets,fetchResource:async(url,{signal})=>{calls++;lastSignal=signal;await gate;signal.throwIfAborted();return new Response(bytes);}});
 const c=new AbortController(),a=read(file,{signal:c.signal}),b=read(file);await tick();c.abort();await assert.rejects(a,{name:'AbortError'});assert.equal(lastSignal.aborted,false);release();await b;assert.equal(calls,1);
 const d=new AbortController(),x=read('piper_phonemize.wasm',{signal:d.signal});await tick();d.abort();await assert.rejects(x,{name:'AbortError'});assert.equal(lastSignal.aborted,true);await read('piper_phonemize.wasm');assert.equal(calls,3);
 const before=calls;await assert.rejects(read(file,{signal:d.signal}),{name:'AbortError'});assert.equal(calls,before);
});
test('real XHR adapter and fetch reader share cached data; abort cannot emit a late load',async()=>{
 const old=globalThis.ProgressEvent;globalThis.ProgressEvent=class extends Event{constructor(type,values){super(type);Object.assign(this,values);}};
 class Native extends EventTarget{set withCredentials(v){} open(){throw Error('unexpected native transfer')}get response(){return null}}
 const scope={XMLHttpRequest:Native};let calls=0;const read=createPiperPhonemizerCache({base,assets,fetchResource:async()=>{calls++;await tick();return new Response(bytes);}}),restore=installPiperXHR({scope,base,readResource:read});
 try{
  const request=()=>{const x=new scope.XMLHttpRequest();x.open('GET',new URL(file,base).href);x.responseType='arraybuffer';return x;};
  const cancelled=request(),events=[];for(const name of ['load','abort','loadend'])cancelled.addEventListener(name,()=>events.push(name));cancelled.send();cancelled.abort();await tick();assert.deepEqual(events,['abort','loadend']);
  const x=request(),done=new Promise((resolve,reject)=>{x.addEventListener('load',resolve);x.addEventListener('error',reject)});x.send();await done;assert.equal(x.status,200);assert.deepEqual(new Uint8Array(x.response),bytes);
  await read(file);const y=request(),again=new Promise(r=>y.addEventListener('load',r));y.send();await again;assert.deepEqual(new Uint8Array(y.response),bytes);assert.equal(calls,2);
  const wasm=new scope.XMLHttpRequest();assert.throws(()=>wasm.open('GET',new URL('piper_phonemize.wasm',base),false),/NETWORK_DENIED/);
  wasm.open('GET',new URL('piper_phonemize.wasm',base));wasm.responseType='arraybuffer';const wasmDone=new Promise(r=>wasm.addEventListener('load',r));wasm.send();await wasmDone;await read('piper_phonemize.wasm');assert.equal(calls,3);assert.deepEqual(new Uint8Array(wasm.response),bytes);
 }finally{restore();if(old===undefined)delete globalThis.ProgressEvent;else globalThis.ProgressEvent=old;}
});
