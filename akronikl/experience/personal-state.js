import {accountLocalStorage} from '../../core/account-storage.js';
import {cloudPreferences} from '../connections/preferences.js';
import {validateChatTree} from './chat-tree.js';
const KEY='akronikl:it-nexus:assistant-cache:v1',KEYS=['preferences','chats'],LIMIT=1048576;
const clone=v=>structuredClone(v),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const validValue=(key,value)=>value===null?null:key==='preferences'?cloudPreferences(value):validateChatTree(value);
const unavailable=e=>e instanceof TypeError||['CLOUD_SERVICE_UNAVAILABLE','CLOUD_VAULT_UNAVAILABLE'].includes(e?.message);
function serverValue(key,v){if(!v||Object.keys(v).sort().join(',')!=='revision,value'||!Number.isSafeInteger(v.revision)||v.revision<0)throw Error('CLOUD_RESPONSE_INVALID');return {revision:v.revision,value:validValue(key,v.value)};}

// Only one window owns the local outbox. Other windows can use server CAS,
// but never overwrite another window's unsent snapshot in browser storage.
export async function acquirePersonalCache(accountId,{locks=globalThis.navigator?.locks,getStorage=accountLocalStorage}={}){
 if(!locks?.request)return {storage:null,release(){},reason:'unsupported'};
 let release,ready;const held=new Promise(r=>release=r),result=new Promise(r=>ready=r);
 void locks.request('nexus-assistant-cache:'+accountId,{ifAvailable:true},async lock=>{
  if(!lock){ready({storage:null,release(){},reason:'busy'});return;}
  try{ready({storage:getStorage(),release,reason:null});await held;}catch{release();ready({storage:null,release(){},reason:'unavailable'});}
 }).catch(()=>ready({storage:null,release(){},reason:'unavailable'}));
 return result;
}

export function createPersonalState({broker,readIdentity,isCurrent=()=>true,onChange=()=>{},onAuthLost=()=>{},cacheLease=null}={}){
 const identity=readIdentity?.(),accountId=identity?.accountId;
 if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u.test(accountId??'')||!broker?.loadState||!broker?.saveState)throw Error('CLOUD_ACCOUNT_REQUIRED');
 let dead=false,lease=null,localError=null,mode='loading',queue=Promise.resolve(),loaded=false,recoveryWarning=false;
 const entries=Object.fromEntries(KEYS.map(k=>[k,{revision:0,value:null,dirty:false,edit:0}])),conflicts=new Map();
 const current=()=>!dead&&isCurrent()&&readIdentity()===identity;
 const check=()=>{if(!current())throw Error('CLOUD_ACCOUNT_REQUIRED');};
 const snapshot=()=>({mode,localAvailable:current()&&!!lease?.storage&&!localError,localError,recoveryWarning,conflicts:current()?[...conflicts.keys()]:[],values:Object.fromEntries(KEYS.map(k=>[k,current()&&mode!=='error'?clone(entries[k].value):null])),dirty:current()?KEYS.filter(k=>entries[k].dirty):[]});
 const emit=()=>{if(current())try{onChange(snapshot());}catch{}};
 const leaseReady=cacheLease?Promise.resolve(cacheLease):acquirePersonalCache(accountId);
 function rejectAuth(error){if(['CLOUD_ACCOUNT_REQUIRED','CLOUD_REQUEST_DENIED'].includes(error?.message)){dead=true;lease?.release();for(const k of KEYS)entries[k].value=null;conflicts.clear();try{onAuthLost();}catch{}throw error;}}
 function persist(){
  check();if(!lease?.storage){localError=lease?.reason??'unavailable';return false;}
  try{lease.storage.setItem(KEY+':validity','error');}catch{try{lease.storage.removeItem(KEY);}catch{}localError='storage';return false;}
  const value=JSON.stringify({version:1,accountId,entries});
  if(new TextEncoder().encode(value).length>LIMIT){localError='limit';return false;}
  try{lease.storage.setItem(KEY,value);lease.storage.setItem(KEY+':validity','valid');localError=null;return true;}catch{localError='storage';return false;}
 }
 function readCache(){
  if(!lease?.storage)return;
  if(lease.storage.getItem(KEY+':validity')==='error')throw Error('LOCAL_STATE_UNPERSISTED');
  const raw=lease.storage.getItem(KEY);if(raw===null)return;
  if(new TextEncoder().encode(raw).length>LIMIT)throw Error('LOCAL_STATE_INVALID');
  let data;try{data=JSON.parse(raw);}catch{throw Error('LOCAL_STATE_INVALID');}
  if(data?.version!==1||data.accountId!==accountId||Object.keys(data).sort().join(',')!=='accountId,entries,version'||Object.keys(data.entries??{}).sort().join(',')!=='chats,preferences')throw Error('LOCAL_STATE_INVALID');
  for(const k of KEYS){const e=data.entries[k];if(!e||Object.keys(e).sort().join(',')!=='dirty,edit,revision,value'||!Number.isSafeInteger(e.revision)||e.revision<0||!Number.isSafeInteger(e.edit)||e.edit<0||typeof e.dirty!=='boolean')throw Error('LOCAL_STATE_INVALID');entries[k]={...e,value:validValue(k,e.value)};}
 }
 function updateMode(){mode=conflicts.size?'conflict':KEYS.some(k=>entries[k].dirty)?'pending':'saved';emit();}
 async function reconcile(key,remote){
  check();const e=entries[key];
  if(!e.dirty){e.revision=remote.revision;e.value=remote.value;conflicts.delete(key);persist();return;}
  if(equal(e.value,remote.value)){e.revision=remote.revision;e.dirty=false;conflicts.delete(key);persist();return;}
  if(e.revision!==remote.revision){conflicts.set(key,remote);return;}
  await write(key,e.revision);
 }
 async function write(key,revision){
  check();const e=entries[key],edit=e.edit,value=clone(e.value);
  try{
   const result=serverValue(key,await broker.saveState(key,value,revision));check();
   if(!equal(result.value,value)||result.revision!==revision+1)throw Error('CLOUD_RESPONSE_INVALID');
   e.revision=result.revision;if(e.edit===edit)e.dirty=false;conflicts.delete(key);persist();
  }catch(error){
   check();if(error.message==='CLOUD_SETTINGS_CONFLICT'){const remote=serverValue(key,await broker.loadState(key));check();conflicts.set(key,remote);return;}
   throw error;
  }
 }
 async function sync(){
  check();try{for(const key of KEYS){if(!entries[key].dirty||conflicts.has(key))continue;const remote=serverValue(key,await broker.loadState(key));check();await reconcile(key,remote);}updateMode();return snapshot();}
  catch(error){rejectAuth(error);check();if(unavailable(error)){mode='offline';emit();return snapshot();}mode='error';emit();throw error;}
 }
 function enqueue(fn){const task=queue.then(fn);queue=task.catch(()=>{});return task;}
 return Object.freeze({snapshot,
  async load(){
   lease=await leaseReady;if(!lease.storage)localError=lease.reason??'unavailable';if(!current()){lease.release();throw Error('CLOUD_ACCOUNT_REQUIRED');}
   return enqueue(async()=>{try{if(!loaded){try{readCache();}catch(error){if(!['LOCAL_STATE_INVALID','LOCAL_STATE_UNPERSISTED'].includes(error.message))throw error;recoveryWarning=true;localError='invalid';for(const k of KEYS)entries[k]={revision:0,value:null,dirty:false,edit:0};}loaded=true;}for(const key of KEYS){const remote=serverValue(key,await broker.loadState(key));check();await reconcile(key,remote);}updateMode();return snapshot();}
    catch(error){rejectAuth(error);check();if(unavailable(error)){mode='offline';emit();return snapshot();}mode='error';emit();throw error;}});
  },
  save(key,value){
   check();if(!KEYS.includes(key))throw Error('CLOUD_SETTINGS_INVALID');const e=entries[key];e.value=validValue(key,value);e.dirty=true;e.edit++;persist();mode='pending';emit();return enqueue(sync);
  },
  flush(){return enqueue(sync);},
  resolve(choice){if(!['local','server'].includes(choice))throw Error('CLOUD_SETTINGS_INVALID');return enqueue(async()=>{check();try{for(const [key,remote]of [...conflicts]){if(choice==='server'){const edit=entries[key].edit,fresh=serverValue(key,await broker.loadState(key));check();if(entries[key].edit!==edit){conflicts.set(key,fresh);continue;}entries[key]={revision:fresh.revision,value:fresh.value,dirty:false,edit:edit+1};conflicts.delete(key);persist();}else await write(key,remote.revision);}updateMode();return snapshot();}catch(error){rejectAuth(error);check();if(unavailable(error)){mode='offline';emit();return snapshot();}mode='error';emit();throw error;}});},
  dispose(){if(dead)return;dead=true;lease?.release();leaseReady.then(l=>l.release()).catch(()=>{});}
 });
}
