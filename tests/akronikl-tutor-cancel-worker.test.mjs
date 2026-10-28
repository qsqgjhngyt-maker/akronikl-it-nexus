import test from 'node:test';
import assert from 'node:assert/strict';
import {createWllamaProvider} from '../akronikl/tutor/local-model.js';
const tick=()=>new Promise(r=>setTimeout(r,0));
const request=signal=>({messages:[],allowedCitations:['S1'],signal});
const answer=x=>x.onData({choices:[{finish_reason:'stop',delta:{content:'{"answer":"fresh","citations":["S1"]}'}}]});

test('abort closes a non-cooperative worker and settles its orphaned RPC',async()=>{
 let start,closed=0;const ready=new Promise(r=>start=r);
 const p=createWllamaProvider({createChatCompletion(){start();return new Promise(()=>{});},async exit(){closed++;}});
 const c=new AbortController(),task=p.generate(request(c.signal));await ready;c.abort();
 await assert.rejects(task,/CANCELLED/);assert.equal(closed,1);assert.equal(p.lifecycle().resident,false);assert.equal(p.lifecycle().busy,false);
 assert.equal(p.measurements().cancelStrategy,'terminate-runtime-worker');await p.dispose();assert.equal(closed,1);
});
test('next request uses a fresh engine; late output from cancelled worker is ignored',async()=>{
 let emit,closed=0,reloaded=0;const p=createWllamaProvider({createChatCompletion(x){emit=x;return new Promise(()=>{});},async exit(){closed++;}},
  {recreate:async()=>{reloaded++;return{async createChatCompletion(x){answer(x);},async exit(){closed++;}};}});
 const c=new AbortController(),task=p.generate(request(c.signal));c.abort();await assert.rejects(task);
 emit.onData({choices:[{finish_reason:'stop',delta:{content:'{"answer":"STALE_PRIVATE","citations":[]}'}}]});
 assert.equal((await p.generate(request())).answer,'fresh');assert.equal(reloaded,1);assert.equal(p.lifecycle().epoch,2);await p.dispose();assert.equal(closed,2);
});
test('dispose settles active inference and never reopens an engine',async()=>{
 let closed=0,reloads=0;const p=createWllamaProvider({createChatCompletion(){return new Promise(()=>{});},async exit(){closed++;}},{recreate:async()=>{reloads++;}});
 const task=p.generate(request());const rejected=assert.rejects(task);await p.dispose();await rejected;await p.dispose();
 assert.equal(closed,1);assert.equal(reloads,0);await assert.rejects(p.generate(request()),/UNAVAILABLE/);
});
test('failed physical cleanup blocks reuse instead of claiming cancellation succeeded',async()=>{
 const p=createWllamaProvider({createChatCompletion(){return new Promise(()=>{});},async exit(){throw Error('private');}});
 const c=new AbortController(),task=p.generate(request(c.signal));c.abort();await assert.rejects(task,/CLEANUP_FAILED/);
 assert.equal(p.lifecycle().cleanupFailed,true);await assert.rejects(p.generate(request()),/UNAVAILABLE/);await p.dispose();
});
test('cancellation while reloading retains ownership until the late engine is closed',async()=>{
 let release,closed=0;const p=createWllamaProvider({createChatCompletion(){return new Promise(()=>{});},async exit(){closed++;}},
  {recreate:()=>new Promise(r=>release=r)});
 const first=new AbortController(),a=p.generate(request(first.signal));first.abort();await assert.rejects(a);
 const next=new AbortController(),b=p.generate(request(next.signal));const rejected=assert.rejects(b);while(!release)await tick();next.abort();
 assert.equal(p.lifecycle().busy,true);release({async createChatCompletion(){assert.fail('cancelled load must not infer');},async exit(){closed++;}});
 await rejected;assert.equal(closed,2);assert.equal(p.lifecycle().busy,false);await p.dispose();
});
test('a synchronously finished RPC does not outrun physical worker cleanup',async()=>{
 let releaseExit,settled=false;const c=new AbortController();
 const p=createWllamaProvider({async createChatCompletion(){c.abort();},exit(){return new Promise(r=>releaseExit=r);}});
 const task=p.generate(request(c.signal)).finally(()=>settled=true);const rejected=assert.rejects(task);
 while(!releaseExit)await tick();assert.equal(settled,false);assert.equal(p.lifecycle().busy,true);
 releaseExit();await rejected;assert.equal(p.lifecycle().busy,false);await p.dispose();
});

test('reload receives the caller signal and can settle cancellation without returning a late engine',async()=>{let entered;const started=new Promise(r=>entered=r);const p=createWllamaProvider({createChatCompletion(){return new Promise(()=>{});},async exit(){}},{recreate:({signal})=>{assert.ok(signal instanceof AbortSignal);entered();return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('LOAD_CANCELLED')),{once:true}));}});const first=new AbortController(),a=p.generate(request(first.signal));first.abort();await assert.rejects(a);const next=new AbortController(),b=p.generate(request(next.signal));await started;next.abort();await assert.rejects(b);assert.equal(p.lifecycle().busy,false);assert.equal(p.lifecycle().resident,false);assert.equal(p.lifecycle().cleanupFailed,false);await p.dispose();});
