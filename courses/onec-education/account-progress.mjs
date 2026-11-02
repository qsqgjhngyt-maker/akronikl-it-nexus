import {verifiedAccount,accountStoragePrefix} from '../../core/account-storage.js';

const allowed=new Set(['onec','1c-enterprise'].flatMap(id=>[
 'akronikl:it-nexus:onec-candidate:v1:'+id,
 'akronikl:it-nexus:onec-final:v1:'+id
]));

// Local course data uses the existing verified account namespace. It does not
// change Identity transport or claim cloud synchronization/server grading.
export function createOnecAccountStorage({raw=globalThis.localStorage,readAccount=verifiedAccount,isCurrent=()=>true}={}){
 const captured=readAccount();
 const current=key=>{
  if(!allowed.has(key))throw Error('ONEC_PROGRESS_KEY_REJECTED');
  if(!isCurrent()||readAccount()!==captured)throw Error('ONEC_ACCOUNT_CHANGED');
  if(!captured||captured.status!=='active')throw Error('ONEC_ACCOUNT_REQUIRED');
  return accountStoragePrefix(captured.accountId)+key;
 };
 return Object.freeze({
  authenticated:!!captured&&captured.status==='active',
  getItem(key){
   if(!allowed.has(key))throw Error('ONEC_PROGRESS_KEY_REJECTED');
   if(!captured){if(!isCurrent()||readAccount()!==captured)throw Error('ONEC_ACCOUNT_CHANGED');return null;}
   return raw.getItem(current(key));
  },
  setItem(key,value){raw.setItem(current(key),String(value));},
  removeItem(){throw Error('ONEC_PROGRESS_DELETE_FORBIDDEN');},
  clear(){throw Error('BROAD_STORAGE_CLEAR_FORBIDDEN');}
 });
}
