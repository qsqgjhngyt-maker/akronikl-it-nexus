// Synthetic storage/DTO only. Never reads a browser profile or issues a session.
import {initializeAccountStorage} from '../../core/account-storage.js';
import {SERVER_ACCOUNT_ORIGIN} from '../../core/server-account-origin.js';
export class MemoryStorage{
 constructor(){this.data=new Map()}
 get length(){return this.data.size}key(i){return [...this.data.keys()][i]??null}
 getItem(k){return this.data.get(String(k))??null}
 setItem(k,v){this.data.set(String(k),String(v))}removeItem(k){this.data.delete(String(k))}
}
export function accountClientFixture(accountId='synthetic-client-account'){
 const local=new MemoryStorage(),session=new MemoryStorage();
 globalThis.localStorage=local;globalThis.sessionStorage=session;
 globalThis.location={origin:SERVER_ACCOUNT_ORIGIN};
 const dto={account:{accountId,displayName:'Synthetic',status:'active'},loginMethods:[{id:'synthetic-passkey',kind:'passkey',status:'active',createdAt:'2026-10-21T00:00:00Z',disabledAt:null}],enrollmentAvailable:false};
 return {accountId,local,session,dto,verify(){initializeAccountStorage(dto)}};
}
