// Координация S1 между вкладками. Общий legacy Project Store этот lock не принимает.
import {onecAccount} from './studio-store.mjs';
const manager=()=>{const locks=globalThis.navigator?.locks;if(!locks?.request)throw Error('S1_WRITER_UNAVAILABLE');return locks};
const key=id=>'nexus:onec-s1:writer:'+encodeURIComponent(id);
const context=id=>{if(onecAccount()!==id)throw Error('ACCOUNT_STORAGE_CONTEXT_CHANGED')};
export function withOnecWriter(fn){const id=onecAccount();return manager().request(key(id),{ifAvailable:true},lock=>{if(!lock)throw Error('S1_WRITER_BUSY');context(id);return fn()})}
export function leaseOnecWriter({granted,unavailable}){
 let closed=false,release=null;const id=onecAccount(),abort=new AbortController();
 const dispose=()=>{closed=true;abort.abort();release?.()};
 try{manager().request(key(id),{signal:abort.signal},lock=>{if(closed)return;context(id);return new Promise(resolve=>{release=resolve;if(closed){resolve();return}try{granted()}catch(error){resolve();throw error}})}).catch(error=>{if(!closed)unavailable(error)})}catch(error){unavailable(error)}
 return{dispose};
}
