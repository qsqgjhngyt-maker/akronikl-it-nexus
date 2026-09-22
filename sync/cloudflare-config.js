const KEY='akronikl:it-nexus:cloudflare-sync:v1';
const clone=value=>JSON.parse(JSON.stringify(value));
const storage=()=>globalThis.localStorage||null;
const parse=(raw,fallback)=>{try{return raw?JSON.parse(raw):fallback}catch{return fallback}};
const trimBase=value=>String(value||'').trim().replace(/\/+$/,'');

export function loadCloudflareSyncConfig(){
  const raw=parse(storage()?.getItem(KEY),{});
  return{schemaVersion:1,baseUrl:trimBase(raw.baseUrl),token:String(raw.token||''),subjectId:raw.subjectId||null,displayName:raw.displayName||null,connectedAt:raw.connectedAt||null};
}
export function saveCloudflareSyncConfig(patch={}){
  const current=loadCloudflareSyncConfig();const next={...current,...clone(patch),schemaVersion:1,baseUrl:trimBase(patch.baseUrl??current.baseUrl)};
  storage()?.setItem(KEY,JSON.stringify(next));return clone(next);
}
export function clearCloudflareSyncConfig(){storage()?.removeItem(KEY)}
export function cloudflareSyncConfigured(){const cfg=loadCloudflareSyncConfig();return Boolean(cfg.baseUrl&&cfg.token&&cfg.subjectId)}
export function cloudflareSyncStorageKey(){return KEY}
export function cloudflareSyncSummary(){const cfg=loadCloudflareSyncConfig();let host='—';try{host=cfg.baseUrl?new URL(cfg.baseUrl).host:'—'}catch{}return{configured:cloudflareSyncConfigured(),host,subjectId:cfg.subjectId,displayName:cfg.displayName}}
