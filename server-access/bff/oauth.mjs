import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from './account-read.mjs';
import {configuredOAuthProviders,oauthAuthorizationURL,exchangeOAuthProfile} from './oauth-providers.mjs';
import {readV2CookieContext} from './gateway-cookie-context.mjs';
const PREFIX='/api/v2/account/oauth/',INTERNAL='/api/v2/account/internal/oauth';
const sha=value=>createHash('sha256').update(value).digest('hex');
const random=()=>randomBytes(32).toString('base64url');
const count=(req,name)=>{
 if(!Array.isArray(req.rawHeaders)||req.rawHeaders.length%2!==0)return-1;
 let total=0;for(let i=0;i<req.rawHeaders.length;i+=2){if(typeof req.rawHeaders[i]!=='string')return-1;if(req.rawHeaders[i].toLowerCase()===name)total++}return total;
};
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const flowCookie=(value,age)=>`__Host-nexus_oauth_flow=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const sessionCookie=value=>`__Host-nexus_session=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`;
const reply=(res,status,body,cookies=[],extra={})=>{
 const data=body===null?'':JSON.stringify(body);
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(data),'cache-control':'no-store','vary':'*','x-content-type-options':'nosniff','referrer-policy':'no-referrer',...(cookies.length?{'set-cookie':cookies}:{}),...extra});res.end(data);return true;
};
function htmlCallbackError(req,res,status,code,cookies){
 if(typeof req.headers.accept!=='string'||!req.headers.accept.split(',').some(value=>/^text\/html(?:\s*;|$)/i.test(value.trim())&&!/;\s*q=0(?:\.0*)?(?:\s*;|\s*$)/i.test(value)))return false;
 const linking=code==='EXPLICIT_LINK_REQUIRED';
 const title=linking?'Привяжите способ входа':'Не удалось завершить вход';
 const message=linking?'Этот способ входа ещё не привязан к существующему аккаунту. Войдите ключом и привяжите его в разделе безопасности — проекты и права сохранятся.':'Попробуйте начать вход заново. Если проблема повторяется, войдите существующим ключом доступа.';
 const data=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Nexus</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#091321;color:#eaf4ff;font:17px/1.6 system-ui,sans-serif}main{box-sizing:border-box;max-width:680px;margin:24px;padding:clamp(24px,5vw,48px);border:1px solid #506278;border-radius:24px;background:#132033}small{color:#93ded7;letter-spacing:.12em}h1{font-size:clamp(25px,5vw,36px);line-height:1.2}p{color:#c5d2e3}nav{display:flex;flex-wrap:wrap;gap:14px;margin-top:28px}a{color:#a8eee0;text-underline-offset:4px}a:first-child{padding:10px 16px;border:1px solid #7bcfc1;border-radius:12px}a:focus-visible{outline:3px solid #fff;outline-offset:4px}</style><main><small>AKRONIKL · IT NEXUS</small><h1>${title}</h1><p>${message}</p><nav><a href="${GATEWAY_ORIGIN}/account/access/">Войти ключом доступа</a>${linking?`<a href="${GATEWAY_ORIGIN}/#view=account&amp;tab=security">Открыть безопасность аккаунта</a>`:`<a href="${GATEWAY_ORIGIN}/account/entry/">Начать вход заново</a>`}</nav></main></html>`;
 res.writeHead(status,{'content-type':'text/html; charset=utf-8','content-length':Buffer.byteLength(data),'cache-control':'no-store','vary':'*','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",...(cookies.length?{'set-cookie':cookies}:{})});res.end(data);return true;
}
class Rejected extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status}}
const deny=(code,status)=>{throw new Rejected(code,status)};
const INGRESS_PROBE_REASONS=new Set(['context_count','base64','utf8','json','shape','shape_other','session_format','flow_format','cookie_count','syntax','session_mismatch','flow_mismatch',
 'v2_raw_headers','v2_marker_argument','v2_context_count','v2_context_base64','v2_context_utf8','v2_context_json','v2_context_shape',
 'v2_cookie_header_count','v2_absent_context','v2_absent_raw','v2_context_cookie_syntax','v2_raw_cookie_syntax','v2_protected_duplicate',
 'v2_cookie_mismatch_expected_S','v2_cookie_mismatch_expected_F','v2_cookie_mismatch_expected_P','v2_cookie_mismatch_expected_SPF','v2_cookie_mismatch_expected_OTHER','v2_rejected']);
const SYNTHETIC_COOKIE_PAIRS=new Set([
 '__Host-nexus_session=nxs_'+'A'.repeat(43),
 '__Host-nexus_oauth_flow=nof_'+'B'.repeat(43),
 '__Host-nexus_passkey_flow=npf_'+'C'.repeat(43)
]);
function syntheticIngressProbe(req){
 if(count(req,'x-nexus-transport-probe')!==1||req.headers['x-nexus-transport-probe']!=='cookie-shape-v1'||typeof req.headers.cookie!=='string'||!req.headers.cookie||req.headers.cookie.length>512)return false;
 const pairs=req.headers.cookie.split(';').map(value=>value.trim());
 return pairs.length>0&&pairs.length<=3&&new Set(pairs).size===pairs.length&&pairs.every(value=>SYNTHETIC_COOKIE_PAIRS.has(value));
}
function ingress(req,env){
 const fail=reason=>{const error=new Rejected('INGRESS_REJECTED',401);error.probeReason=reason;throw error};
 if(count(req,'x-yc-apigateway-operation-context')!==1)fail('context_count');
 const raw=req.headers['x-yc-apigateway-operation-context'];
 if(typeof raw!=='string'||raw.length>8192||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))fail('base64');
 const bytes=Buffer.from(raw,'base64');if(bytes.toString('base64')!==raw)fail('base64');
 let text,data;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{fail('utf8')}
 try{data=JSON.parse(text)}catch{fail('json')}
 if(data?.oauthIngressContract==='v2'||data?.oauthIngressContract==='v3'){
  let v2;try{v2=readV2CookieContext(req,'oauthIngressContract',{env})}catch(error){fail(INGRESS_PROBE_REASONS.has(error.cookieContextReason)?error.cookieContextReason:'v2_rejected')}
  if(v2===undefined)deny('INGRESS_REJECTED',401);
  const session=v2.get('__Host-nexus_session')??null,flow=v2.get('__Host-nexus_oauth_flow')??null;
  if(session!==null&&!/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session))fail('session_format');
  if(flow!==null&&!/^nof_[A-Za-z0-9_-]{43}$/.test(flow))fail('flow_format');
  return{session,flow};
 }
 if(raw.length>4096)fail('base64');
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).sort().join(',')!=='oauthFlowCookie,oauthIngressContract,sessionCookie'||text.match(/"(?:[^"\\]|\\.)*"/g)?.length!==6||data.oauthIngressContract!=='v1'||typeof data.sessionCookie!=='string'||typeof data.oauthFlowCookie!=='string')fail(data?.oauthIngressContract==='v1'?'shape':'shape_other');
 const optional=value=>value==='-'?null:value;
 const session=optional(data.sessionCookie),flow=optional(data.oauthFlowCookie);
 if(session!==null&&!/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session))fail('session_format');
 if(flow!==null&&!/^nof_[A-Za-z0-9_-]{43}$/.test(flow))fail('flow_format');
 if(req.headers.cookie!==undefined){
  if(count(req,'cookie')!==1||typeof req.headers.cookie!=='string'||req.headers.cookie.length>8192)fail('cookie_count');
  const found={};
  for(const part of req.headers.cookie.split(';')){
   const pair=part.trim(),at=pair.indexOf('=');if(at<1)fail('syntax');
   const name=pair.slice(0,at),value=pair.slice(at+1);
   if(!/^[!#$%&'*+.^_`|~A-Za-z0-9-]+$/.test(name)||!/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(value))fail('syntax');
   if(['__Host-nexus_session','__Host-nexus_oauth_flow'].includes(name)){if(Object.hasOwn(found,name))fail('syntax');found[name]=value}
  }
  const fromCookie=found['__Host-nexus_session']??null,fromFlow=found['__Host-nexus_oauth_flow']??null;
  if(!(fromCookie===null&&session===null)&&!same(fromCookie,session))fail('session_mismatch');
  if(!(fromFlow===null&&flow===null)&&!same(fromFlow,flow))fail('flow_mismatch');
 }else if(count(req,'cookie')!==0)fail('cookie_count');
 return{session,flow};
}
async function boundedJSON(source,max,flatIntent=false){
 let length=0;const parts=[];
 for await(const part of source){const bytes=Buffer.from(part);length+=bytes.length;if(length>max)deny('INPUT_TOO_LARGE',413);parts.push(bytes)}
 let value;try{
  const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts,length));
  value=JSON.parse(text);
  if(flatIntent&&text.match(/"(?:[^"\\]|\\.)*"/g)?.length!==2)deny('INVALID_INPUT');
 }catch{deny('INVALID_INPUT')}
 if(!value||typeof value!=='object'||Array.isArray(value))deny('INVALID_INPUT');return value;
}
async function service(env,fetchImpl,payload){
 const body=JSON.stringify(payload),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
 const signature=createHmac('sha256',env.OAUTH_SERVICE_KEY).update(`v1\nPOST\n${INTERNAL}\n${timestamp}\n${nonce}\n${sha(body)}`).digest('hex');
 const upstream=await fetchImpl(WORKER_ORIGIN+INTERNAL,{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(2500),body,headers:{accept:'application/json','content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature}});
 if(upstream.redirected||!/^application\/json(?:\s*;|$)/i.test(upstream.headers.get('content-type')||'')){await upstream.body?.cancel();deny('OAUTH_UNAVAILABLE',502)}
 const data=await boundedJSON(upstream.body,16384);
 if(upstream.status!==200){
  const safe=['ACCOUNT_SESSION_CHANGED','FRESH_PASSKEY_REQUIRED','EXPLICIT_LINK_REQUIRED','OWNER_EMAIL_REQUIRED','IDENTITY_ALREADY_LINKED','IDENTITY_REJECTED','TRANSACTION_REJECTED','RATE_LIMITED'];
  deny(safe.includes(data.error?.code)?data.error.code:'OAUTH_UNAVAILABLE',[400,401,403,409,429,503].includes(upstream.status)?upstream.status:502);
 }
 if(data.ok!==true)deny('OAUTH_UNAVAILABLE',502);return data;
}
export function createOAuthHandler({env={},fetchImpl=fetch}={}){
 return async(req,res)=>{
  if(typeof req.url!=='string'||!req.url.startsWith(PREFIX))return false;
  let callback=false;
  try{
   if(req.url.length>8192)deny('INVALID_INPUT');
   const url=new URL(req.url,GATEWAY_ORIGIN),route=url.pathname.slice(PREFIX.length).split('/');
   callback=route.length===2&&route[1]==='callback';
   if(req.url.split('?')[0]!==url.pathname||url.hash)deny('INVALID_INPUT');
   if(env.OAUTH_PROXY_ENABLED!=='true'||env.PRIVATE_GATEWAY_CONFIRMED!=='true'||typeof env.OAUTH_SERVICE_KEY!=='string'||env.OAUTH_SERVICE_KEY.length<32)deny('OAUTH_UNAVAILABLE',503);
   if(req.headers.host!==new URL(GATEWAY_ORIGIN).host||count(req,'host')!==1||req.headers.authorization!==undefined||count(req,'authorization')>0||(req.headers.origin!==undefined&&req.headers.origin!==GATEWAY_ORIGIN))deny('ORIGIN_REJECTED',403);
   const providers=configuredOAuthProviders(env);
   if(req.url===PREFIX+'providers'){
    if(req.method!=='GET')deny('METHOD_NOT_ALLOWED',405);
    return reply(res,200,{providers});
   }
   const [provider,action]=route;
   if(route.length!==2||!['start','callback'].includes(action))deny('NOT_FOUND',404);
   if(!providers.some(item=>item.id===provider))deny('OAUTH_PROVIDER_UNAVAILABLE',503);
   if(req.method!==(action==='start'?'POST':'GET'))deny('METHOD_NOT_ALLOWED',405);
   const context=ingress(req,env);
   if(action==='start'){
    if(url.search||req.url!==url.pathname)deny('INVALID_INPUT');
    if(req.headers.origin!==GATEWAY_ORIGIN||count(req,'origin')!==1||req.headers['x-nexus-oauth-request']!=='1'||count(req,'x-nexus-oauth-request')!==1||req.headers['content-type']!=='application/json'||(req.headers['sec-fetch-site']!==undefined&&req.headers['sec-fetch-site']!=='same-origin'))deny('WRITE_ORIGIN_REQUIRED',403);
    const input=await boundedJSON(req,1024,true);
    if(Object.keys(input).join(',')!=='intent'||!['login','link'].includes(input.intent))deny('INVALID_INPUT');
    const expectedAccountId=req.headers['x-nexus-oauth-account'],expectationHeaders=count(req,'x-nexus-oauth-account');
    if(input.intent==='link'){
     if(expectationHeaders!==1||typeof expectedAccountId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(expectedAccountId))deny('ACCOUNT_EXPECTATION_REQUIRED');
    }else if(expectedAccountId!==undefined||expectationHeaders!==0)deny('INVALID_INPUT');
    if(input.intent==='link'&&!context.session)deny('FRESH_PASSKEY_REQUIRED',401);
    const state=random(),codeVerifier=random(),nonce=random(),flow='nof_'+random();
    const result=await service(env,fetchImpl,{op:'begin',provider,intent:input.intent,stateHash:sha(state),flowHash:sha(flow),codeVerifier,nonce,...(input.intent==='link'?{sessionHash:sha(context.session),expectedAccountId}:{})});
    if(typeof result.txId!=='string'||result.txId.length>80||typeof result.expiresAt!=='string')deny('OAUTH_UNAVAILABLE',502);
    return reply(res,200,{authorizationURL:oauthAuthorizationURL({provider,env,state,codeVerifier,nonce})},[flowCookie(flow,600)]);
   }
   if(!context.flow)deny('FLOW_REQUIRED',401);
   const params=url.searchParams;
   if([...params.keys()].some(name=>params.getAll(name).length!==1))deny('INVALID_INPUT');
   // Яндекс добавляет служебный cid в реальный callback. Это opaque metadata:
   // он не заменяет state/PKCE или проверку client_id authenticated /info.
   const metadata=provider==='google'?['scope','authuser','prompt','iss']:provider==='vk'?['type','expires_in']:provider==='yandex'?['cid']:[];
   if([...params.keys()].some(name=>!['code','state',...(provider==='vk'?['device_id']:[]),...metadata].includes(name)))deny('INVALID_INPUT');
   if(params.has('cid')&&!/^[A-Za-z0-9_-]{1,256}$/.test(params.get('cid')||''))deny('INVALID_INPUT');
   const code=params.get('code'),state=params.get('state'),deviceId=params.get('device_id');
   if(typeof code!=='string'||!code.length||code.length>4096||/[\x00-\x20\x7f]/.test(code)||!(/^[A-Za-z0-9_-]{43}$/.test(state||''))||provider==='vk'&&(typeof deviceId!=='string'||!deviceId.length||deviceId.length>512||/[\x00-\x20\x7f]/.test(deviceId)))deny('INVALID_INPUT');
   if(params.has('iss')&&!['https://accounts.google.com','accounts.google.com'].includes(params.get('iss')))deny('PROVIDER_REJECTED',401);
   const claim=await service(env,fetchImpl,{op:'claim',provider,stateHash:sha(state),flowHash:sha(context.flow)});
   if(typeof claim.txId!=='string'||claim.txId.length>80||!['login','link'].includes(claim.intent)||typeof claim.codeVerifier!=='string'||!/^[A-Za-z0-9._~-]{43,128}$/.test(claim.codeVerifier)||typeof claim.nonce!=='string'||!/^[A-Za-z0-9_-]{22,128}$/.test(claim.nonce))deny('OAUTH_UNAVAILABLE',502);
   const profile=await exchangeOAuthProfile({provider,env,code,state,deviceId,codeVerifier:claim.codeVerifier,nonce:claim.nonce,fetchImpl});
   const completed=await service(env,fetchImpl,{op:'complete',txId:claim.txId,flowHash:sha(context.flow),profile});
   if(!/^nxs_[A-Za-z0-9_-]{43}$/.test(completed.sessionSecret||''))deny('OAUTH_UNAVAILABLE',502);
   return reply(res,303,null,[sessionCookie(completed.sessionSecret),flowCookie('',0)],{location:GATEWAY_ORIGIN+(claim.intent==='link'?'/#view=account':'/#nexusLogin=oauth')});
  }catch(error){
   const known=error instanceof Rejected;
   const probeReason=known&&error.code==='INGRESS_REJECTED'&&INGRESS_PROBE_REASONS.has(error.probeReason)&&syntheticIngressProbe(req)?error.probeReason:null;
   const status=known?error.status:error.message==='PROVIDER_REJECTED'?401:502,code=known?error.code:error.message==='PROVIDER_REJECTED'?'PROVIDER_REJECTED':'OAUTH_UNAVAILABLE',cookies=callback?[flowCookie('',0)]:[];
   if(callback&&htmlCallbackError(req,res,status,code,cookies))return true;
   return reply(res,status,{error:{code,...(probeReason?{probeReason}:{})}},cookies);
  }
 };
}
