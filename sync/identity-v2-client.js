import {loadCloudflareSyncConfig} from './cloudflare-config.js';

const trimBase=value=>String(value||'').trim().replace(/\/+$/,'');

async function readJson(response){
  const text=await response.text();
  try{return text?JSON.parse(text):{}}catch{return{raw:text}}
}

export async function identityV2Capabilities(){
  const config=loadCloudflareSyncConfig();
  const endpoint=trimBase(config.baseUrl);

  if(!endpoint){
    return{
      reachable:false,
      sessionFoundation:false,
      bridgeEnabled:false,
      reason:'cloud-not-configured'
    };
  }

  try{
    const response=await fetch(endpoint+'/api/v2/auth/capabilities',{
      method:'GET',
      headers:{'accept':'application/json'}
    });
    const body=await readJson(response);
    if(!response.ok){
      return{
        reachable:true,
        sessionFoundation:false,
        bridgeEnabled:false,
        reason:body?.error?.code||`HTTP_${response.status}`
      };
    }
    return{
      reachable:true,
      sessionFoundation:Boolean(body?.sessionFoundation),
      bridgeEnabled:Boolean(body?.bridgeEnabled),
      cookieSessionEnabled:Boolean(body?.cookieSessionEnabled),
      firstPartyDeploymentRequired:body?.firstPartyDeploymentRequired!==false,
      session:body?.session||null,
      reason:null
    };
  }catch(error){
    return{
      reachable:false,
      sessionFoundation:false,
      bridgeEnabled:false,
      reason:error?.message||'network-error'
    };
  }
}
