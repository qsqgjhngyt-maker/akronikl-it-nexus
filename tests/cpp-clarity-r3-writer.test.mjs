import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeAccountStorage,verifiedAccount,accountLocalStorage,lockAccountStorage} from '../core/account-storage.js';
import {withCourseStateWriter,readCourseStateStrict,loadState,saveState,patchLesson,patchPracticum,courseWorkToken,saveCppClarityDraft} from '../core/storage.js';
import {emptyClarityDraft} from '../core/cpp-clarity-r3-state.mjs';
class MemoryStorage {constructor(){this.map=new Map();this.fail=false;this.corruptAck=false;}get length(){return this.map.size;}key(i){return [...this.map.keys()][i]??null;}getItem(k){return this.map.get(k)??null;}setItem(k,v){if(this.fail)throw Object.assign(Error('SYNTHETIC_QUOTA'),{name:'QuotaExceededError'});this.map.set(k,this.corruptAck?'{}':String(v));}removeItem(k){this.map.delete(k);}}
const raw=new MemoryStorage();globalThis.localStorage=raw;globalThis.sessionStorage=new MemoryStorage();
let tail=Promise.resolve(),held=0,maxHeld=0,waiter=null;
const locks={request(name,options,fn){assert.match(name,/^nexus:cpp-course-state:writer:/);const p=tail.then(async()=>{if(waiter)await waiter;held++;maxHeld=Math.max(maxHeld,held);try{return fn({name});}finally{held--;}});tail=p.catch(()=>{});return p;}};
Object.defineProperty(globalThis,'navigator',{value:{locks},configurable:true});
initializeAccountStorage({accountId:'r3-synthetic-owner',status:'active'});const facade=accountLocalStorage(),key='akronikl:it-nexus:state:v1',id='cpp.programming-process';
const expected=verifiedAccount(),read=()=>facade.getItem(key),write=fn=>withCourseStateWriter(fn,{expectedContext:expected});
test('all state mutations require the shared writer, including old progress paths',async()=>{
 assert.throws(()=>patchLesson(id,{completed:true}),{code:'COURSE_WRITER_REQUIRED'});
 await write(()=>patchLesson(id,{completed:true,attempts:[{id:'old-attempt'}]}));assert.equal(loadState().courses.cpp.lessons[id].completed,true);
});
test('queued draft and legacy progress/practicum writers preserve unrelated fields',async()=>{
 const draft=emptyClarityDraft(id);
 await Promise.all([saveCppClarityDraft(id,draft,{expectedStateRevision:0,expectedContext:expected}),write(()=>patchLesson('cpp.first-cpp-program',{completed:true})),write(()=>patchPracticum('practice-1',{tasks:[0]}))]);
 const state=readCourseStateStrict();assert.equal(state.courses.cpp.lessons[id].clarityDraft.stateRevision,1);assert.equal(state.courses.cpp.lessons[id].attempts[0].id,'old-attempt');assert.equal(state.courses.cpp.lessons['cpp.first-cpp-program'].completed,true);assert.deepEqual(state.courses.cpp.practicums['practice-1'].tasks,[0]);assert.equal(maxHeld,1);
});
test('stale draft does not replace another saved revision or legacy progress',async()=>{
 const before=read(),draft=emptyClarityDraft(id);await assert.rejects(saveCppClarityDraft(id,draft,{expectedStateRevision:0,expectedContext:expected}),{code:'R3_STATE_CONFLICT'});assert.equal(read(),before);
});
test('strict reread preserves corrupt raw and rejects unknown container or draft versions',async()=>{
 const good=read();for(const bad of ['{broken','[]','{"schemaVersion":2,"courses":{}}']){facade.setItem(key,bad);await assert.rejects(write(()=>patchLesson(id,{completed:false})));assert.equal(read(),bad);}facade.setItem(key,good);
 const state=JSON.parse(good);state.courses.cpp.lessons[id].clarityDraft.schemaVersion=2;const invalid=JSON.stringify(state);facade.setItem(key,invalid);const draft=emptyClarityDraft(id);draft.stateRevision=1;
 await assert.rejects(saveCppClarityDraft(id,draft,{expectedStateRevision:1}),{code:'R3_SCHEMA_INVALID'});assert.equal(read(),invalid);facade.setItem(key,good);
});
test('whole-object source token cannot be invented or silently refreshed',async()=>{
 const captured=readCourseStateStrict();await write(()=>patchLesson('cpp.tokens-identifiers-keywords',{completed:true}));const current=read();
 await assert.rejects(write(()=>saveState(captured)),{code:'COURSE_STATE_CONFLICT'});assert.equal(read(),current);
 await assert.rejects(write(()=>saveState({...readCourseStateStrict()})),{code:'COURSE_STATE_SOURCE_REQUIRED'});assert.equal(read(),current);
 await write(()=>{const base=readCourseStateStrict();return saveState({...base,skills:{preserved:true}},{expected:base});});assert.equal(readCourseStateStrict().skills.preserved,true);
});
test('workspace writers require their captured work token and never refresh it to avoid conflict',async()=>{
 const initial=courseWorkToken(readCourseStateStrict(),'lesson',id);
 const workspace={languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:1,files:[{path:'main.cpp',content:'int main(){}',languageId:'cpp'}]};
 await write(()=>patchLesson(id,{workspace,code:'int main(){}',stdin:''},{expectedWorkToken:initial}));const before=read();
 await assert.rejects(write(()=>patchLesson(id,{code:'stale'},{expectedWorkToken:initial})),{code:'COURSE_WORK_CONFLICT'});assert.equal(read(),before);
 await assert.rejects(write(()=>patchLesson(id,{code:'unguarded'})),{code:'COURSE_WORK_SOURCE_REQUIRED'});assert.equal(read(),before);
});
test('quota preserves previous raw; missing readback is not rolled back automatically',async()=>{
 const good=read();raw.fail=true;await assert.rejects(write(()=>patchLesson(id,{completed:false})),{name:'QuotaExceededError'});raw.fail=false;assert.equal(read(),good);
 raw.corruptAck=true;await assert.rejects(write(()=>patchLesson(id,{completed:false})),{code:'COURSE_STATE_ACK_MISSING'});raw.corruptAck=false;assert.equal(read(),'{}');facade.setItem(key,good);
});
test('async callback and reentry are rejected; absence of Web Locks has no unsafe fallback',async()=>{
 const before=read();await assert.rejects(write(async()=>{}),{code:'COURSE_WRITER_SYNC_REQUIRED'});
 let nested;await write(()=>{nested=withCourseStateWriter(()=>{});});await assert.rejects(nested,{code:'COURSE_WRITER_REENTRY'});
 const previous=navigator.locks;navigator.locks=null;await assert.rejects(write(()=>patchLesson(id,{completed:false})),{code:'COURSE_WRITER_UNAVAILABLE'});navigator.locks=previous;assert.equal(read(),before);
});
test('context captured before wait cannot write after forced account lock',async()=>{
 const before=read();let release;waiter=new Promise(resolve=>release=resolve);const pending=write(()=>patchLesson(id,{completed:false}));lockAccountStorage();release();await assert.rejects(pending,{code:'ACCOUNT_STORAGE_CONTEXT_CHANGED'});waiter=null;
 assert.equal([...raw.map].find(([k])=>k.endsWith(key))[1],before);await assert.rejects(withCourseStateWriter(()=>{}),{code:'VERIFIED_ACCOUNT_REQUIRED'});
});
