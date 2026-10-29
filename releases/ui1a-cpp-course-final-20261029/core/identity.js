import {accountLocalStorage,verifiedAccount} from './account-storage.js';

const IDENTITY_KEY='akronikl:it-nexus:identity:v1';

const clone=value=>JSON.parse(JSON.stringify(value));
const now=()=>new Date().toISOString();
const randomPart=()=>{
  try{return globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36)}catch{return Math.random().toString(36).slice(2)+Date.now().toString(36)}
};
const storage=()=>accountLocalStorage();
const parse=(raw,fallback)=>{try{return raw?JSON.parse(raw):fallback}catch{return fallback}};

export function loadLocalIdentity(){
  const saved=parse(storage()?.getItem(IDENTITY_KEY),null);
  if(saved?.deviceId&&saved?.localPrincipalId&&saved?.personalWorkspaceId)return clone(saved);
  const stamp=now();
  const suffix=randomPart().replace(/[^a-zA-Z0-9-]/g,'').slice(0,48);
  const identity={
    schemaVersion:1,
    deviceId:`device-${suffix}`,
    localPrincipalId:`local-${suffix}`,
    personalWorkspaceId:`workspace-personal-${suffix}`,
    accountSubjectId:verifiedAccount().accountId,
    accountState:'server-session',
    createdAt:stamp,
    updatedAt:stamp
  };
  storage()?.setItem(IDENTITY_KEY,JSON.stringify(identity));
  return clone(identity);
}

export function updateLocalIdentity(patch={}){
  if(patch.accountSubjectId&&patch.accountSubjectId!==verifiedAccount()?.accountId)throw Object.assign(new Error('Cloud subject differs from the verified Nexus account.'),{code:'ACCOUNT_SUBJECT_MISMATCH'});
  const current=loadLocalIdentity();
  const next={...current,...clone(patch),schemaVersion:1,updatedAt:now()};
  storage()?.setItem(IDENTITY_KEY,JSON.stringify(next));
  return clone(next);
}

export function activePrincipalId(){
  loadLocalIdentity();
  return verifiedAccount().accountId;
}

// Alias действует только внутри проверенного account namespace и его личной workspace.
export function isCurrentProjectOwner(access){
  const account=verifiedAccount();if(!account)return false;
  if(access?.ownerId===account.accountId)return true;
  const identity=loadLocalIdentity();
  return access?.workspaceKind==='personal'&&access.workspaceId===identity.personalWorkspaceId&&access.ownerId===identity.localPrincipalId;
}

export function currentProjectSubjectAlias(access,subjectId){
  const account=verifiedAccount();
  if(!account||subjectId!==account.accountId||!isCurrentProjectOwner(access))return subjectId;
  return access.ownerId;
}

export function personalWorkspaceId(){return loadLocalIdentity().personalWorkspaceId}
export function identityStorageKey(){return IDENTITY_KEY}
