import assert from 'node:assert/strict';
import {initializeAccountStorage,accountLocalStorage,verifiedAccount} from '../core/account-storage.js';
import {serverCloudRequest} from '../sync/server-cloud-client.js';
class MemoryStorage{data=new Map();get length(){return this.data.size}key(i){return [...this.data.keys()][i]??null}getItem(k){return this.data.get(k)??null}setItem(k,v){this.data.set(k,String(v))}removeItem(k){this.data.delete(k)}}
globalThis.localStorage=new MemoryStorage();globalThis.sessionStorage=new MemoryStorage();globalThis.location={origin:'https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net'};globalThis.window=new EventTarget();
initializeAccountStorage({accountId:'synthetic-expired-account',displayName:'Synthetic',status:'active'});
const facade=accountLocalStorage(),key='akronikl:it-nexus:state:v1';facade.setItem(key,'{"synthetic":true}');
const before=new Map(localStorage.data);let ended=0;window.addEventListener('nexus:session-ended',()=>ended++);
await assert.rejects(serverCloudRequest('/api/v1/projects',{},async()=>Response.json({error:{code:'SESSION_REQUIRED'}},{status:401})),error=>error.status===401&&error.code==='SESSION_REQUIRED');
assert.equal(ended,1);assert.equal(verifiedAccount(),null);assert.throws(()=>facade.setItem(key,'late-autosave'),{code:'VERIFIED_ACCOUNT_REQUIRED'});assert.deepEqual(localStorage.data,before);
console.log(JSON.stringify({status:'PASS',checks:3,expiredSessionImmediatelyLocked:true,lateAutosaveBlocked:true,syntheticOnly:true,network:false}));
