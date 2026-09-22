const IDENTITY_KEY='akronikl:it-nexus:identity:v1';

const clone=value=>JSON.parse(JSON.stringify(value));
const now=()=>new Date().toISOString();
const randomPart=()=>{
  try{return globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36)}catch{return Math.random().toString(36).slice(2)+Date.now().toString(36)}
};
const storage=()=>globalThis.localStorage||null;
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
    accountSubjectId:null,
    accountState:'local-only',
    createdAt:stamp,
    updatedAt:stamp
  };
  storage()?.setItem(IDENTITY_KEY,JSON.stringify(identity));
  return clone(identity);
}

export function updateLocalIdentity(patch={}){
  const current=loadLocalIdentity();
  const next={...current,...clone(patch),schemaVersion:1,updatedAt:now()};
  storage()?.setItem(IDENTITY_KEY,JSON.stringify(next));
  return clone(next);
}

export function activePrincipalId(){
  const identity=loadLocalIdentity();
  return identity.accountSubjectId||identity.localPrincipalId;
}

export function personalWorkspaceId(){return loadLocalIdentity().personalWorkspaceId}
export function identityStorageKey(){return IDENTITY_KEY}
