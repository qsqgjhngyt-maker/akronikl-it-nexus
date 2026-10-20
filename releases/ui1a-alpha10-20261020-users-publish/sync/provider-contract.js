export const SYNC_PROVIDER_CONTRACT_VERSION=1;
export function assertSyncProvider(provider){
  const required=['id','status','pullProject','pushProject'];
  for(const key of required)if(key==='id'?typeof provider?.[key]!=='string':typeof provider?.[key]!=='function')throw new Error(`Invalid sync provider: ${key}`);
  return provider;
}
export function syncProviderCapabilities(provider){
  return{providerId:provider?.id||'none',configured:Boolean(provider?.configured),supportsTeam:Boolean(provider?.supportsTeam),supportsAudit:Boolean(provider?.supportsAudit),supportsSnapshots:Boolean(provider?.supportsSnapshots)};
}
