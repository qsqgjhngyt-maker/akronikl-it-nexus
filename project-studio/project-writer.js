// Общая координация account DB: все browser writers обязаны держать этот lock.
import {verifiedAccount} from '../core/account-storage.js';
let heldAccount=null;
const account=()=>{const id=verifiedAccount()?.accountId;if(!id)throw Error('VERIFIED_ACCOUNT_REQUIRED');return id};
const locks=()=>{if(!globalThis.navigator?.locks?.request)throw Error('PROJECT_WRITER_UNAVAILABLE');return globalThis.navigator.locks};
const key=id=>'nexus:project-store:writer:'+encodeURIComponent(id);
const check=id=>{if(account()!==id)throw Error('ACCOUNT_STORAGE_CONTEXT_CHANGED')};
export function assertProjectWriter(){if(globalThis.window===globalThis&&typeof document!=='undefined'&&heldAccount!==account())throw Error('PROJECT_WRITER_REQUIRED')}
export function withProjectWriter(fn,{allowReentry=true}={}){
 const id=account();if(allowReentry&&heldAccount===id){check(id);return Promise.resolve().then(()=>{check(id);return fn()})}
 if(globalThis.window!==globalThis&&!globalThis.navigator?.locks?.request)return Promise.resolve().then(()=>{check(id);return fn()});
 return locks().request(key(id),{ifAvailable:true},async lock=>{if(!lock)throw Error('PROJECT_WRITER_BUSY');check(id);heldAccount=id;try{return await fn()}finally{heldAccount=null}});
}
export function leaseProjectWriter({granted,unavailable}){
 const id=account(),abort=new AbortController();let closed=false,release=null;
 const dispose=()=>{closed=true;abort.abort();release?.()};
 try{locks().request(key(id),{signal:abort.signal},lock=>{if(closed)return;check(id);heldAccount=id;return new Promise((resolve,reject)=>{release=resolve;try{granted()}catch(e){reject(e)}}).finally(()=>{heldAccount=null})}).catch(e=>{if(!closed)unavailable(e)})}catch(e){unavailable(e)}
 return{dispose};
}
