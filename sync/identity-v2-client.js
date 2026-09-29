import {loadCloudflareSyncConfig} from './cloudflare-config.js';

const SESSION_KEY='akronikl:it-nexus:identity-v2:session:v1';
const COOKIE_MARKER_KEY='akronikl:it-nexus:identity-v2:cookie-session:v1';
const trimBase=value=>String(value||'').trim().replace(/\/+$/,'');
const sessionStore=()=>globalThis.sessionStorage||null;
const markerStore=()=>globalThis.localStorage||null;

async function readJson(response){
  const text=await response.text();
  try{return text?JSON.parse(text):{}}catch{return{raw:text}}
}

const validSessionToken=value=>/^nxs_[A-Za-z0-9_-]{24,}$/.test(String(value||''));

export class IdentityV2ClientError extends Error{
  constructor(message,{status=0,code='IDENTITY_V2_ERROR',payload=null}={}){
    super(message||code);
    this.name='IdentityV2ClientError';
    this.status=Number(status||0);
    this.code=String(code||'IDENTITY_V2_ERROR');
    this.payload=payload;
  }
}

export function identityV2SessionStorageKey(){return SESSION_KEY}

export function loadIdentityV2SessionCredential(){
  const value=String(sessionStore()?.getItem(SESSION_KEY)||'');
  if(!validSessionToken(value)){
    if(value)sessionStore()?.removeItem(SESSION_KEY);
    return '';
  }
  return value;
}

export function saveIdentityV2SessionCredential(token){
  const value=String(token||'').trim();
  if(!validSessionToken(value))throw new Error('Invalid Nexus session credential.');
  sessionStore()?.setItem(SESSION_KEY,value);
  return true;
}

export function clearIdentityV2SessionCredential(){
  sessionStore()?.removeItem(SESSION_KEY);
  return true;
}

export function identityV2CookieMarkerStorageKey(){return COOKIE_MARKER_KEY}

export function loadIdentityV2CookieSessionMarker(){
  const cloud=loadCloudflareSyncConfig();
  const endpoint=trimBase(cloud.baseUrl);
  const marker=String(markerStore()?.getItem(COOKIE_MARKER_KEY)||'');

  if(!marker||!endpoint||marker!==endpoint){
    if(marker)markerStore()?.removeItem(COOKIE_MARKER_KEY);
    return '';
  }

  return marker;
}

export function saveIdentityV2CookieSessionMarker(endpoint){
  const value=trimBase(endpoint);
  if(!value)throw new Error('Invalid first-party cookie endpoint.');
  markerStore()?.setItem(COOKIE_MARKER_KEY,value);
  return true;
}

export function clearIdentityV2CookieSessionMarker(){
  markerStore()?.removeItem(COOKIE_MARKER_KEY);
  return true;
}

export function identityV2CredentialState(){
  const cloud=loadCloudflareSyncConfig();
  const endpoint=trimBase(cloud.baseUrl);
  const cookieSessionPresent=Boolean(loadIdentityV2CookieSessionMarker());
  const sessionCredential=loadIdentityV2SessionCredential();
  const legacyCredential=String(cloud.token||'');
  const mode=cookieSessionPresent
    ? 'nexus-cookie'
    : sessionCredential
      ? 'nexus-session'
      : legacyCredential
        ? 'legacy-token'
        : 'none';

  return{
    mode,
    cookieSessionPresent,
    sessionCredentialPresent:Boolean(sessionCredential),
    legacyCredentialPresent:Boolean(legacyCredential),
    cloudConfigured:Boolean(cloud.baseUrl&&cloud.subjectId),
    endpoint,
    rollbackAvailable:Boolean(legacyCredential)
  };
}

function credentialCandidates(){
  const cloud=loadCloudflareSyncConfig();
  const endpoint=trimBase(cloud.baseUrl);
  const cookieSessionPresent=Boolean(loadIdentityV2CookieSessionMarker());
  const sessionCredential=loadIdentityV2SessionCredential();
  const legacyCredential=String(cloud.token||'');
  const list=[];

  if(cookieSessionPresent)list.push({mode:'nexus-cookie',cookie:true});
  if(sessionCredential)list.push({mode:'nexus-session',token:sessionCredential});
  if(legacyCredential)list.push({mode:'legacy-token',token:legacyCredential});

  return{
    endpoint,
    candidates:list
  };
}

async function authenticatedRequest(path,{method='GET',body=null,allowLegacyFallback=true}={}){
  const {endpoint,candidates}=credentialCandidates();
  if(!endpoint)throw new IdentityV2ClientError('Nexus Cloud endpoint is not configured.',{code:'CLOUD_NOT_CONFIGURED'});
  if(!candidates.length)throw new IdentityV2ClientError('Nexus identity credential is not available.',{code:'IDENTITY_CREDENTIAL_MISSING'});

  let last=null;
  for(let i=0;i<candidates.length;i++){
    const candidate=candidates[i];
    if(i>0&&!allowLegacyFallback)break;

    let response;
    try{
      response=await fetch(endpoint+path,{
        method,
        ...(candidate.cookie?{credentials:'include'}:{}),
        headers:{
          'accept':'application/json',
          ...(body!==null?{'content-type':'application/json'}:{}),
          ...(!candidate.cookie?{'authorization':`Bearer ${candidate.token}`}:{})
        },
        ...(body!==null?{body:JSON.stringify(body)}:{})
      });
    }catch(error){
      throw new IdentityV2ClientError(error?.message||'Identity v2 network error.',{code:'NETWORK_ERROR'});
    }

    const payload=await readJson(response);

    if(response.ok){
      return{
        payload,
        credentialMode:candidate.mode,
        legacyFallback:i>0
      };
    }

    const code=payload?.error?.code||`HTTP_${response.status}`;
    last={status:response.status,code,payload};

    // A stale/expired server session may safely fall back to the legacy
    // account credential during migration. Never fall back for arbitrary
    // authorization failures.
    const mayFallback=
      ['nexus-cookie','nexus-session'].includes(candidate.mode) &&
      allowLegacyFallback &&
      Boolean(candidates[i+1]) &&
      response.status===401 &&
      ['INVALID_SESSION','UNAUTHORIZED'].includes(code);

    if(mayFallback){
      if(candidate.mode==='nexus-cookie'){
        clearIdentityV2CookieSessionMarker();
      }else{
        clearIdentityV2SessionCredential();
      }
      continue;
    }

    throw new IdentityV2ClientError(
      payload?.error?.message||`Identity v2 request failed (${code}).`,
      {status:response.status,code,payload}
    );
  }

  throw new IdentityV2ClientError(
    last?.payload?.error?.message||'Identity v2 authentication failed.',
    last||{code:'IDENTITY_AUTH_FAILED'}
  );
}

export async function identityV2AuthenticatedRequest(path,options={}){
  return authenticatedRequest(path,options);
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
      legacyTokenCompatible:Boolean(body?.legacyTokenCompatible),
      cookieSessionEnabled:Boolean(body?.cookieSessionEnabled),
      cookieSessionFoundation:Boolean(body?.cookieSessionFoundation),
      firstPartyDeploymentRequired:body?.firstPartyDeploymentRequired!==false,
      cookie:body?.cookie||null,
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

export async function identityV2UpgradeSessionToCookie(){
  const config=loadCloudflareSyncConfig();
  const endpoint=trimBase(config.baseUrl);
  const token=loadIdentityV2SessionCredential();

  if(!endpoint){
    throw new IdentityV2ClientError('Nexus Cloud endpoint is not configured.',{code:'CLOUD_NOT_CONFIGURED'});
  }
  if(!token){
    throw new IdentityV2ClientError('A Nexus server session is required for HttpOnly upgrade.',{code:'SESSION_BEARER_REQUIRED'});
  }

  const capabilities=await identityV2Capabilities();
  if(!capabilities.cookieSessionEnabled){
    throw new IdentityV2ClientError(
      'First-party HttpOnly session transport is not enabled for this deployment.',
      {code:'FIRST_PARTY_SESSION_DISABLED'}
    );
  }

  const response=await fetch(endpoint+'/api/v2/session/cookie/upgrade',{
    method:'POST',
    credentials:'include',
    headers:{
      'accept':'application/json',
      'authorization':`Bearer ${token}`
    }
  });
  const payload=await readJson(response);

  if(!response.ok){
    throw new IdentityV2ClientError(
      payload?.error?.message||'HttpOnly session upgrade failed.',
      {status:response.status,code:payload?.error?.code||`HTTP_${response.status}`,payload}
    );
  }

  saveIdentityV2CookieSessionMarker(endpoint);
  clearIdentityV2SessionCredential();

  return payload;
}

export async function identityV2ProbeFirstPartyCookie(){
  const config=loadCloudflareSyncConfig();
  const endpoint=trimBase(config.baseUrl);
  if(!endpoint)return{ok:false,reason:'cloud-not-configured'};

  const capabilities=await identityV2Capabilities();
  if(!capabilities.cookieSessionEnabled){
    clearIdentityV2CookieSessionMarker();
    return{ok:false,reason:'cookie-session-disabled'};
  }

  const response=await fetch(endpoint+'/api/v2/session',{
    method:'GET',
    credentials:'include',
    headers:{'accept':'application/json'}
  });
  const payload=await readJson(response);

  if(response.ok&&payload?.authMode==='nexus-cookie'){
    saveIdentityV2CookieSessionMarker(endpoint);
    return{ok:true,session:payload.session||null,subject:payload.subject||null};
  }

  if(response.status===401){
    clearIdentityV2CookieSessionMarker();
    return{ok:false,reason:payload?.error?.code||'UNAUTHORIZED'};
  }

  throw new IdentityV2ClientError(
    payload?.error?.message||'HttpOnly session probe failed.',
    {status:response.status,code:payload?.error?.code||`HTTP_${response.status}`,payload}
  );
}

export async function identityV2ClearFirstPartyCookie(){
  const config=loadCloudflareSyncConfig();
  const endpoint=trimBase(config.baseUrl);
  clearIdentityV2CookieSessionMarker();
  if(!endpoint)return{ok:true,skipped:true};

  try{
    const response=await fetch(endpoint+'/api/v2/session/cookie/clear',{
      method:'POST',
      credentials:'include',
      headers:{'accept':'application/json'}
    });
    const payload=await readJson(response);
    if(!response.ok){
      return{ok:false,status:response.status,code:payload?.error?.code||`HTTP_${response.status}`};
    }
    return payload;
  }catch{
    return{ok:false,code:'NETWORK_ERROR'};
  }
}

export async function identityV2CurrentSession(){
  const result=await authenticatedRequest('/api/v2/session');
  return{
    ...(result.payload||{}),
    credentialMode:result.credentialMode,
    legacyFallback:result.legacyFallback
  };
}

export async function listIdentityV2Sessions(){
  const result=await authenticatedRequest('/api/v2/sessions');
  return{
    sessions:Array.isArray(result.payload?.sessions)?result.payload.sessions:[],
    credentialMode:result.credentialMode,
    legacyFallback:result.legacyFallback
  };
}

export async function listIdentityV2Devices(){
  const result=await authenticatedRequest('/api/v2/devices');
  return{
    devices:Array.isArray(result.payload?.devices)?result.payload.devices:[],
    credentialMode:result.credentialMode,
    legacyFallback:result.legacyFallback
  };
}

export async function revokeCurrentIdentityV2Session(){
  const state=identityV2CredentialState();
  if(!['nexus-cookie','nexus-session'].includes(state.mode)){
    return{ok:true,skipped:true,reason:'no-server-session'};
  }

  const result=await authenticatedRequest('/api/v2/session',{
    method:'DELETE',
    allowLegacyFallback:false
  });

  clearIdentityV2SessionCredential();
  clearIdentityV2CookieSessionMarker();

  return{
    ...(result.payload||{}),
    credentialMode:result.credentialMode,
    legacyFallback:false,
    skipped:false
  };
}

export async function revokeIdentityV2Session(sessionId,{current=false}={}){
  const id=String(sessionId||'').trim();
  if(!id)throw new IdentityV2ClientError('Session id is required.',{code:'SESSION_ID_REQUIRED'});
  const result=await authenticatedRequest(`/api/v2/sessions/${encodeURIComponent(id)}`,{method:'DELETE'});
  if(current){clearIdentityV2SessionCredential();clearIdentityV2CookieSessionMarker();}
  return{
    ...(result.payload||{}),
    credentialMode:result.credentialMode,
    legacyFallback:result.legacyFallback
  };
}

export async function revokeIdentityV2Device(deviceId,{currentDevice=false}={}){
  const id=String(deviceId||'').trim();
  if(!id)throw new IdentityV2ClientError('Device id is required.',{code:'DEVICE_ID_REQUIRED'});
  const result=await authenticatedRequest(`/api/v2/devices/${encodeURIComponent(id)}`,{method:'DELETE'});
  if(currentDevice){clearIdentityV2SessionCredential();clearIdentityV2CookieSessionMarker();}
  return{
    ...(result.payload||{}),
    credentialMode:result.credentialMode,
    legacyFallback:result.legacyFallback
  };
}

export async function revokeAllIdentityV2Sessions({keepCurrent=true}={}){
  const result=await authenticatedRequest('/api/v2/sessions/revoke-all',{
    method:'POST',
    body:{keepCurrent:Boolean(keepCurrent)}
  });
  if(!keepCurrent){clearIdentityV2SessionCredential();clearIdentityV2CookieSessionMarker();}
  return{
    ...(result.payload||{}),
    credentialMode:result.credentialMode,
    legacyFallback:result.legacyFallback
  };
}
