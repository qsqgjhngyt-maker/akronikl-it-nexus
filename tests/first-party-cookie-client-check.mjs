import {
  identityV2UpgradeSessionToCookie,
  identityV2ClearFirstPartyCookie,
  identityV2CredentialState,
  identityV2CookieMarkerStorageKey,
  loadIdentityV2SessionCredential,
  saveIdentityV2SessionCredential,
  listIdentityV2Devices
} from '../sync/identity-v2-client.js';
import {saveCloudflareSyncConfig,clearCloudflareSyncConfig} from '../sync/cloudflare-config.js';

const assert=(value,message)=>{if(!value)throw new Error(message)};
const local=new Map();
const session=new Map();

globalThis.localStorage={
  getItem:key=>local.has(key)?local.get(key):null,
  setItem:(key,value)=>local.set(key,String(value)),
  removeItem:key=>local.delete(key),
  clear:()=>local.clear()
};
globalThis.sessionStorage={
  getItem:key=>session.has(key)?session.get(key):null,
  setItem:(key,value)=>session.set(key,String(value)),
  removeItem:key=>session.delete(key),
  clear:()=>session.clear()
};

const endpoint='https://api.example.test';
const legacy='nxk_'+'L'.repeat(32);
const nxs='nxs_'+'S'.repeat(32);

saveCloudflareSyncConfig({
  baseUrl:endpoint,
  token:legacy,
  subjectId:'user-cookie-client',
  displayName:'Akronikl'
});
saveIdentityV2SessionCredential(nxs);

let calls=[];
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;
  calls.push({path,options});

  if(path==='/api/v2/auth/capabilities'){
    return Response.json({
      ok:true,
      sessionFoundation:true,
      bridgeEnabled:false,
      legacyTokenCompatible:true,
      cookieSessionFoundation:true,
      cookieSessionEnabled:true,
      firstPartyDeploymentRequired:false,
      cookie:{name:'__Host-nexus_session',httpOnly:true,secure:true,sameSite:'Strict',hostOnly:true}
    });
  }

  if(path==='/api/v2/session/cookie/upgrade'){
    assert(options.credentials==='include','upgrade must include credentials');
    assert(options.headers?.authorization===`Bearer ${nxs}`,'upgrade must authenticate with current nxs bearer');
    return Response.json({ok:true,cookieSession:true,authMode:'nexus-cookie',clearBrowserSessionCredential:true});
  }

  return Response.json({error:{code:'UNEXPECTED_REQUEST'}},{status:500});
};

await identityV2UpgradeSessionToCookie();
assert(loadIdentityV2SessionCredential()==='','upgrade must clear browser-readable nxs token');
assert(local.get(identityV2CookieMarkerStorageKey())===endpoint,'non-secret cookie marker missing');
assert(identityV2CredentialState().mode==='nexus-cookie','credential state did not switch to nexus-cookie');
assert(!local.get(identityV2CookieMarkerStorageKey()).includes('nxs_'),'cookie marker must never contain raw nxs');

calls=[];
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;
  calls.push({path,options});
  if(path==='/api/v2/devices'){
    assert(options.credentials==='include','cookie candidate must use credentials include');
    assert(!options.headers?.authorization,'cookie candidate must not send Authorization header');
    return Response.json({devices:[{id:'device-cookie'}]});
  }
  return Response.json({error:{code:'UNEXPECTED_REQUEST'}},{status:500});
};

let devices=await listIdentityV2Devices();
assert(devices.devices[0]?.id==='device-cookie','cookie-authenticated API result missing');
assert(devices.credentialMode==='nexus-cookie'&&!devices.legacyFallback,'cookie candidate should be primary');

// Stale cookie marker: one 401 then controlled legacy fallback.
calls=[];
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;
  const auth=String(options.headers?.authorization||'');
  calls.push({path,options,auth});

  if(path==='/api/v2/devices'&&options.credentials==='include'&&!auth){
    return Response.json({error:{code:'INVALID_SESSION',message:'expired'}},{status:401});
  }
  if(path==='/api/v2/devices'&&auth===`Bearer ${legacy}`){
    return Response.json({devices:[{id:'device-legacy'}]});
  }
  return Response.json({error:{code:'UNEXPECTED_REQUEST'}},{status:500});
};

devices=await listIdentityV2Devices();
assert(devices.devices[0]?.id==='device-legacy','legacy fallback after stale cookie failed');
assert(devices.legacyFallback===true,'fallback flag missing');
assert(calls.length===2,'stale cookie must cause exactly one fallback retry');
assert(!local.has(identityV2CookieMarkerStorageKey()),'stale cookie marker must be cleared');

// Explicit clear endpoint uses credentials and clears local marker regardless of server result.
local.set(identityV2CookieMarkerStorageKey(),endpoint);
globalThis.fetch=async(url,options={})=>{
  assert(new URL(url).pathname==='/api/v2/session/cookie/clear','wrong clear route');
  assert(options.method==='POST'&&options.credentials==='include','cookie clear transport is wrong');
  return Response.json({ok:true,cookieCleared:true});
};
const cleared=await identityV2ClearFirstPartyCookie();
assert(cleared.ok===true&&!local.has(identityV2CookieMarkerStorageKey()),'cookie clear did not clear marker');

clearCloudflareSyncConfig();
console.log('FIRST_PARTY_COOKIE_CLIENT_PASS');
