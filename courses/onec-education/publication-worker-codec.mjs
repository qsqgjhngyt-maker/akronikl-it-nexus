import{expandPublicWorkerConfiguration}from'../../tools/published-worker-configuration.mjs';
// Только инструмент публикационной сборки; не часть начального frontend graph.
export function packPublicationWorkerConfiguration(config){
 const assetGroups=[];
 for(const{url,...row}of config.assets){
  const prefix=/^(?:releases|entry-assets)\/[^/]+\//.exec(url)?.[0]||'';
  if(assetGroups.at(-1)?.[0]!==prefix)assetGroups.push([prefix,[]]);
  assetGroups.at(-1)[1].push([url.slice(prefix.length),row]);
 }
 const packed={...config,assets:[],assetEncoding:'prefix-groups-v1',assetGroups};
 const expanded=expandPublicWorkerConfiguration(packed);
 if(JSON.stringify(expanded)!==JSON.stringify(config))throw Error('PUBLIC_WORKER_ROUNDTRIP_REQUIRED');
 return packed;
}
