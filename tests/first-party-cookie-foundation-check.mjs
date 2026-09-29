import workerModule from '../cloudflare/nexus-sync-worker/src/index.js';

const assert=(value,message)=>{if(!value)throw new Error(message)};
const token='nxs_'+'C'.repeat(32);
const cookieName='__Host-nexus_session';

const state={invalidSession:false,securityEvents:0,revoked:false};

class Stmt{
  constructor(sql){
    this.sql=sql;
    this.norm=sql.replace(/\s+/g,' ').trim();
    this.args=[];
  }
  bind(...args){this.args=args;return this}
  async first(){
    if(this.norm.includes('SELECT id FROM account_sessions LIMIT 1'))return null;

    if(this.norm.includes('FROM account_sessions x JOIN account_subjects s')){
      if(state.invalidSession)return null;
      return{
        subject_id:'user-cookie-test',
        display_name:'Akronikl',
        session_id:'session-cookie-test',
        device_id:'device-cookie-test',
        auth_strength:'legacy-bridge',
        idle_expires_at:'2099-01-01T00:00:00.000Z',
        absolute_expires_at:'2099-01-01T01:00:00.000Z'
      };
    }

    if(this.norm.includes('FROM account_sessions x LEFT JOIN account_devices d')){
      return{
        id:'session-cookie-test',
        device_id:'device-cookie-test',
        status:state.revoked?'revoked':'active',
        auth_strength:'legacy-bridge',
        created_at:'2026-09-29T00:00:00.000Z',
        last_seen_at:'2026-09-29T00:00:00.000Z',
        idle_expires_at:'2099-01-01T00:00:00.000Z',
        absolute_expires_at:'2099-01-01T01:00:00.000Z',
        device_label:'Cookie Test',
        device_platform:'test'
      };
    }

    if(this.norm.includes('SELECT id, subject_id, device_id, status FROM account_sessions')){
      return{
        id:'session-cookie-test',
        subject_id:'user-cookie-test',
        device_id:'device-cookie-test',
        status:state.revoked?'revoked':'active'
      };
    }

    if(this.norm.includes('FROM account_tokens t JOIN account_subjects s'))return null;
    return null;
  }
  async run(){
    if(this.norm.startsWith('INSERT INTO identity_security_events'))state.securityEvents++;
    if(this.norm.includes("UPDATE account_sessions SET status = 'revoked'"))state.revoked=true;
    return{success:true,meta:{changes:1}};
  }
}

const DB={
  prepare:sql=>new Stmt(sql),
  batch:async statements=>{
    const results=[];
    for(const stmt of statements)results.push(await stmt.run());
    return results;
  }
};

const baseEnv={
  DB,
  AUTH_MODE:'nexus-token',
  ENVIRONMENT:'production',
  ALLOWED_ORIGIN:'https://app.example.test',
  IDENTITY_V2_BRIDGE_ENABLED:'false',
  FIRST_PARTY_SESSION_ENABLED:'true',
  FIRST_PARTY_DEPLOYMENT_CONFIRMED:'true'
};

const req=(path,{method='GET',headers={},env=baseEnv}={})=>
  workerModule.fetch(
    new Request(`https://api.example.test${path}`,{method,headers}),
    env
  );

let res=await req('/api/v2/auth/capabilities');
let body=await res.json();
assert(res.status===200,'capabilities failed');
assert(body.cookieSessionFoundation===true,'cookie foundation missing');
assert(body.cookieSessionEnabled===true,'cookie session should be enabled in confirmed first-party env');
assert(body.firstPartyDeploymentRequired===false,'confirmed first-party env still marked required');
assert(body.cookie?.name===cookieName&&body.cookie?.httpOnly&&body.cookie?.secure&&body.cookie?.sameSite==='Strict'&&body.cookie?.hostOnly,'cookie security metadata mismatch');

res=await req('/api/v2/auth/capabilities',{env:{...baseEnv,FIRST_PARTY_DEPLOYMENT_CONFIRMED:'false'}});
body=await res.json();
assert(body.cookieSessionEnabled===false&&body.firstPartyDeploymentRequired===true,'two-key deployment gate failed');

res=await req('/api/v2/session/cookie/clear',{
  method:'POST',
  headers:{origin:baseEnv.ALLOWED_ORIGIN},
  env:{...baseEnv,FIRST_PARTY_SESSION_ENABLED:'false'}
});
body=await res.json();
assert(res.status===409&&body.error?.code==='FIRST_PARTY_SESSION_DISABLED','disabled clear route must be rejected');

res=await req('/api/v2/session/cookie/clear',{
  method:'POST',
  headers:{origin:baseEnv.ALLOWED_ORIGIN}
});
body=await res.json();
let setCookie=res.headers.get('set-cookie')||'';
assert(res.status===200&&body.cookieCleared===true,'cookie clear route failed');
assert(setCookie.includes(`${cookieName}=`)&&setCookie.includes('HttpOnly')&&setCookie.includes('Secure')&&setCookie.includes('SameSite=Strict')&&setCookie.includes('Max-Age=0'),'clear cookie flags invalid');
assert(res.headers.get('access-control-allow-credentials')==='true','credentialed CORS missing for enabled first-party transport');

res=await req('/api/v2/session/cookie/clear',{
  method:'POST',
  headers:{origin:'https://evil.example.test'}
});
body=await res.json();
assert(res.status===403&&body.error?.code==='FIRST_PARTY_ORIGIN_REQUIRED','wrong origin must be rejected');

state.invalidSession=false;
state.revoked=false;
res=await req('/api/v2/session',{
  headers:{origin:baseEnv.ALLOWED_ORIGIN,cookie:`${cookieName}=${token}`}
});
body=await res.json();
assert(res.status===200&&body.authMode==='nexus-cookie'&&body.session?.id==='session-cookie-test','cookie-authenticated current session failed');

res=await req('/api/v2/session',{
  headers:{origin:'https://evil.example.test',cookie:`${cookieName}=${token}`}
});
body=await res.json();
assert(res.status===403&&body.error?.code==='FIRST_PARTY_ORIGIN_REQUIRED','cookie auth must enforce exact app origin');

const eventsBefore=state.securityEvents;
res=await req('/api/v2/session/cookie/upgrade',{
  method:'POST',
  headers:{origin:baseEnv.ALLOWED_ORIGIN,authorization:`Bearer ${token}`}
});
body=await res.json();
setCookie=res.headers.get('set-cookie')||'';
assert(res.status===200&&body.cookieSession===true&&body.authMode==='nexus-cookie'&&body.clearBrowserSessionCredential===true,'cookie upgrade failed');
assert(!('token' in body),'cookie upgrade response must not return raw session credential');
assert(setCookie.includes(`${cookieName}=${token}`)&&setCookie.includes('HttpOnly')&&setCookie.includes('Secure')&&setCookie.includes('SameSite=Strict')&&setCookie.includes('Path=/'),'upgraded cookie flags invalid');
assert(!setCookie.toLowerCase().includes('domain='),'__Host cookie must not set Domain');
assert(state.securityEvents===eventsBefore+1,'cookie upgrade security event missing');

state.revoked=false;
res=await req('/api/v2/session',{
  method:'DELETE',
  headers:{origin:baseEnv.ALLOWED_ORIGIN,cookie:`${cookieName}=${token}`}
});
body=await res.json();
setCookie=res.headers.get('set-cookie')||'';
assert(res.status===200&&body.revoked===true&&state.revoked,'cookie logout did not revoke session');
assert(setCookie.includes('Max-Age=0'),'cookie logout must clear HttpOnly cookie');

state.invalidSession=true;
res=await req('/api/v2/session',{
  headers:{origin:baseEnv.ALLOWED_ORIGIN,cookie:`${cookieName}=${token}`}
});
body=await res.json();
setCookie=res.headers.get('set-cookie')||'';
assert(res.status===401&&body.error?.code==='INVALID_SESSION','invalid cookie session must return INVALID_SESSION');
assert(setCookie.includes('Max-Age=0'),'invalid cookie response must clear stale HttpOnly cookie');
state.invalidSession=false;

res=await req('/api/v2/session',{
  headers:{
    origin:baseEnv.ALLOWED_ORIGIN,
    cookie:`${cookieName}=${token}`,
    authorization:'Bearer nxk_invalid_invalid_invalid_invalid'
  }
});
body=await res.json();
assert(res.status===401&&body.error?.code==='INVALID_TOKEN','explicit Authorization must remain authoritative over cookie');

res=await req('/api/v2/session/cookie/clear',{
  method:'OPTIONS',
  headers:{origin:baseEnv.ALLOWED_ORIGIN,'access-control-request-method':'POST'},
  env:{...baseEnv,FIRST_PARTY_SESSION_ENABLED:'false'}
});
assert(!res.headers.get('access-control-allow-credentials'),'disabled first-party deployment must not advertise credentialed CORS');

console.log('FIRST_PARTY_COOKIE_FOUNDATION_PASS');
