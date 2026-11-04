// SESSION-REMEMBER-P1A: isolated BFF transport. NOT imported into production router.
// Activation requires separately audited Gateway cookie ingress + IAM + D1 migration.
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from './account-read.mjs';
import {readV2CookieContext} from './gateway-cookie-context.mjs';
import {REMEMBER_ROUTES,REMEMBER_COOKIE,SESSION_COOKIE,REMEMBER_MAX_AGE,
 REMEMBER_INTERNAL_PATH,validRememberToken,validSessionToken} from '../remember-device-transport-contract.mjs';
const maxRequestBytes=96,maxResponseBytes=900;
const gateHost=new URL(GATEWAY_ORIGIN).host;
const cookieAttr='; Path=/; HttpOnly; Secure; SameSite=Strict';
function count(req,name){if(!Array.isArray(req.rawHeaders)||req.rawHeaders.length%2!==0)return -1;
 let n=0;for(let i=0;i<req.rawHeaders.length;i+=2)if(req.rawHeaders[i]?.toLowerCase()===name)n++;return n;}
function send(res,status,cookies=[],code='REMEMBER_UNAVAILABLE'){
 const body=status===204?'':JSON.stringify({error:{code}});
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(body),
  'cache-control':'no-store',vary:'*','x-content-type-options':'nosniff','referrer-policy':'no-referrer',
  ...(cookies.length?{'set-cookie':cookies}:{} )});res.end(body);return true;
}
const clearRemember=()=>`${REMEMBER_COOKIE}=; Max-Age=0${cookieAttr}`;
const setRemember=(token,expiresAt,clock)=>{
 if(!validRememberToken(token))throw Error('BAD_SERVER_TOKEN');
 const timestamp=Date.parse(expiresAt),duration=timestamp-clock();
 if(!Number.isFinite(timestamp)||duration<=0||duration>REMEMBER_MAX_AGE*1000+2000)throw Error('BAD_EXPIRY');
 return `${REMEMBER_COOKIE}=${token}; Max-Age=${Math.min(REMEMBER_MAX_AGE,Math.floor(duration/1000))}${cookieAttr}`;
};
const setSession=token=>{
 if(!validSessionToken(token))throw Error('BAD_SERVER_SESSION');
 return `${SESSION_COOKIE}=${token}; Max-Age=43200${cookieAttr}`;
};
async function requestBytes(req){
 const chunks=[];let total=0;
 for await(const chunk of req){total+=chunk.length;if(total>maxRequestBytes)throw Error('BODY_TOO_LARGE');chunks.push(chunk)}
 return Buffer.concat(chunks,total).toString('utf8');
}
async function responseJson(response){
 if(![200,401,409].includes(response.status)||response.redirected||response.headers.has('set-cookie')||
  !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||'')||
  !response.headers.get('cache-control')?.split(',').some(v=>v.trim().toLowerCase()==='no-store')||
  !response.headers.get('vary')?.split(',').some(v=>v.trim()==='*'))throw Error('UPSTREAM_CONTRACT');
 const reader=response.body?.getReader();if(!reader)throw Error('UPSTREAM_EMPTY');
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;
  size+=value.byteLength;if(size>maxResponseBytes)throw Error('UPSTREAM_OVERSIZE');chunks.push(value);
 }return JSON.parse(Buffer.concat(chunks.map(x=>Buffer.from(x))).toString('utf8'));
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}
function ingress(req,env){
 // Only dedicated v3 Gateway marker, no V1 fallback or unsigned raw-cookie mode.
 if(count(req,'x-yc-apigateway-operation-context')!==1||count(req,'cookie')>1)return null;
 const input=req.headers['x-yc-apigateway-operation-context'];
 if(typeof input!=='string'||input.length>8192)return null;
 let parsed;try{parsed=JSON.parse(Buffer.from(input,'base64').toString('utf8'))}catch{return null}
 if(!parsed||Object.keys(parsed).length!==1||parsed.rememberIngressContract!=='v3')return null;
 const cookies=readV2CookieContext(req,'rememberIngressContract',{env});
 if(!(cookies instanceof Map))return null;
 // Existing protected cookie set does not yet include REMEMBER_COOKIE: deny duplicates here.
 const raw=req.headers.cookie;
 if(raw!==undefined&&raw.split(';').filter(pair=>pair.trim().startsWith(REMEMBER_COOKIE+'=')).length!==1&&cookies.has(REMEMBER_COOKIE))return null;
 return cookies;
}
/** A new route will be added by Security branch ONLY after approval. */
export function createRememberBffHandler({env={},fetchImpl=fetch,clock=()=>Date.now()}={}){
 return async(req,res)=>{
  const action=REMEMBER_ROUTES[req.url];if(!action)return false;
  if(env.REMEMBER_DEVICE_ENABLED!=='true'||env.PRIVATE_GATEWAY_CONFIRMED!=='true'||
   env.COOKIE_INGRESS_V3_ENABLED!=='true'||typeof env.REMEMBER_SERVICE_KEY!=='string'||
   env.REMEMBER_SERVICE_KEY.length<32)return send(res,404);
  if(req.method!=='POST'||count(req,'host')!==1||req.headers.host!==gateHost||
   count(req,'origin')!==1||req.headers.origin!==GATEWAY_ORIGIN||
   req.headers['sec-fetch-site']!=='same-origin'||count(req,'x-nexus-remember-write')!==1||
   req.headers['x-nexus-remember-write']!=='1'||req.headers.authorization!==undefined||
   req.headers['content-type']!=='application/json')return send(res,403);
  try{
   const rawBody=await requestBytes(req),body=JSON.parse(rawBody);
   if(!body||typeof body!=='object'||Array.isArray(body)||
    Object.keys(body).sort().join(',')!==(action==='enroll'?'remember':'')||
    (action==='enroll'&&body.remember!==true))return send(res,400);
   const cookies=ingress(req,env);if(!cookies)return send(res,403);
   const sessionCookie=cookies.get(SESSION_COOKIE)??null,rememberCookie=cookies.get(REMEMBER_COOKIE)??null;
   if(sessionCookie!==null&&!validSessionToken(sessionCookie)||
      rememberCookie!==null&&!validRememberToken(rememberCookie))return send(res,403);
   if(action==='enroll'&&(!sessionCookie||rememberCookie)||
      action!=='enroll'&&!rememberCookie)return send(res,401);
   const payload=JSON.stringify({action,sessionCookie,rememberCookie,explicitOptIn:action==='enroll'}),
    stamp=String(clock()),nonce=randomBytes(16).toString('hex'),hash=createHash('sha256').update(payload).digest('hex'),
    canonical=`v1\nPOST\n${REMEMBER_INTERNAL_PATH}\n${stamp}\n${nonce}\n${hash}`,
    signature=createHmac('sha256',env.REMEMBER_SERVICE_KEY).update(canonical).digest('hex');
   const response=await fetchImpl(WORKER_ORIGIN+REMEMBER_INTERNAL_PATH,{method:'POST',
    credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),body:payload,
    headers:{accept:'application/json','content-type':'application/json',
     'x-nexus-service-timestamp':stamp,'x-nexus-service-nonce':nonce,
     'x-nexus-service-signature':signature}});
   const dto=await responseJson(response);
   if(response.status===401)return send(res,401);
   if(response.status===409&&dto?.kind==='wait-for-other-tab')return send(res,409,[],'REMEMBER_RETRY');
   if(response.status!==200)return send(res,502);
   if(action==='enroll'&&dto?.kind==='issued'&&Object.keys(dto).sort().join(',')==='expiresAt,kind,rememberCookieValue')
    return send(res,204,[setRemember(dto.rememberCookieValue,dto.expiresAt,clock)]);
   if(action==='renew'&&dto?.kind==='renewed'&&Object.keys(dto).sort().join(',')==='expiresAt,kind,rememberCookieValue,sessionCookieValue')
    return send(res,204,[setRemember(dto.rememberCookieValue,dto.expiresAt,clock),setSession(dto.sessionCookieValue)]);
   if(action==='revoke'&&dto?.kind==='revoked'&&Object.keys(dto).join(',')==='kind')
    return send(res,204,[clearRemember()]);
   return send(res,502);
  }catch{return send(res,502)} // No credentials, error details or bodies echoed.
 };
}
