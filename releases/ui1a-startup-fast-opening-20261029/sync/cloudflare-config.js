import {accountLocalStorage,verifiedAccount} from '../core/account-storage.js';
import {SERVER_ACCOUNT_ORIGIN,isServerAccountOrigin} from '../core/server-account-origin.js';

const KEY='akronikl:it-nexus:cloudflare-sync:v1';
const clone=value=>JSON.parse(JSON.stringify(value));
const storage=()=>accountLocalStorage();
const parse=(raw,fallback)=>{try{return raw?JSON.parse(raw):fallback}catch{return fallback}};
const trimBase=value=>String(value||'').trim().replace(/\/+$/,'');

export function loadCloudflareSyncConfig(){
  const account=verifiedAccount();
  if(account&&isServerAccountOrigin())return {schemaVersion:1,baseUrl:SERVER_ACCOUNT_ORIGIN,token:'',subjectId:account.accountId,displayName:account.displayName,connectedAt:null,transport:'server-account'};
  if(account)return {schemaVersion:1,baseUrl:'',token:'',subjectId:null,displayName:null,connectedAt:null,transport:'server-account',reason:'SERVER_ORIGIN_REQUIRED'};
  const raw=parse(storage()?.getItem(KEY),{});
  if(raw.subjectId&&raw.subjectId!==account?.accountId)return{schemaVersion:1,baseUrl:'',token:'',subjectId:null,displayName:null,connectedAt:null,subjectMismatch:true};
  return{schemaVersion:1,baseUrl:trimBase(raw.baseUrl),token:String(raw.token||''),subjectId:raw.subjectId||null,displayName:raw.displayName||null,connectedAt:raw.connectedAt||null};
}
export function saveCloudflareSyncConfig(patch={}){
  const account=verifiedAccount();
  if(patch.subjectId&&patch.subjectId!==account?.accountId)throw Object.assign(new Error('Cloud subject differs from the verified Nexus account.'),{code:'ACCOUNT_SUBJECT_MISMATCH'});
  if(account&&!isServerAccountOrigin())throw Object.assign(new Error('Nexus Cloud requires the canonical first-party origin.'),{code:'SERVER_ORIGIN_REQUIRED'});
  if(account&&isServerAccountOrigin()){
    if(patch.token||patch.baseUrl&&trimBase(patch.baseUrl)!==SERVER_ACCOUNT_ORIGIN)throw Object.assign(new Error('Nexus Cloud uses the current first-party session.'),{code:'SEPARATE_CLOUD_CREDENTIAL_FORBIDDEN'});
    return loadCloudflareSyncConfig();
  }
  const current=loadCloudflareSyncConfig();const next={...current,...clone(patch),schemaVersion:1,baseUrl:trimBase(patch.baseUrl??current.baseUrl)};
  storage()?.setItem(KEY,JSON.stringify(next));return clone(next);
}
export function clearCloudflareSyncConfig(){if(verifiedAccount()&&isServerAccountOrigin())return;storage()?.removeItem(KEY)}
export function cloudflareSyncConfigured(){const cfg=loadCloudflareSyncConfig();return Boolean(cfg.baseUrl&&cfg.subjectId&&(cfg.transport==='server-account'||cfg.token))}
export function cloudflareSyncStorageKey(){return KEY}
export function cloudflareSyncSummary(){const cfg=loadCloudflareSyncConfig();let host='—';try{host=cfg.baseUrl?new URL(cfg.baseUrl).host:'—'}catch{}return{configured:cloudflareSyncConfigured(),host,subjectId:cfg.subjectId,displayName:cfg.displayName}}
