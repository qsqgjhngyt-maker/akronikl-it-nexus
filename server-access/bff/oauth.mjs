import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from './account-read.mjs';
import {configuredOAuthProviders,oauthAuthorizationURL,exchangeOAuthProfile} from './oauth-providers.mjs';
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
class Rejected extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status}}
const deny=(code,status)=>{throw new Rejected(code,status)};
function ingress(req){
 if(count(req,'x-yc-apigateway-operation-context')!==1)deny('INGRESS_REJECTED',401);
 const raw=req.headers['x-yc-apigateway-operation-context'];
 if(typeof raw!=='string'||raw.length>4096||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))deny('INGRESS_REJECTED',401);
 const bytes=Buffer.from(raw,'base64');if(bytes.toString('base64')!==raw)deny('INGRESS_REJECTED',401);
 let text,data;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);data=JSON.parse(text)}catch{deny('INGRESS_REJECTED',401)}
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).sort().join(',')!=='oauthFlowCookie,oauthIngressContract,sessionCookie'||text.match(/"(?:[^"\\]|\\.)*"/g)?.length!==6||data.oauthIngressContract!=='v1'||typeof data.sessionCookie!=='string'||typeof data.oauthFlowCookie!=='string')deny('INGRESS_REJECTED',401);
 const optional=value=>value==='-'?null:value;
 const session=optional(data.sessionCookie),flow=optional(data.oauthFlowCookie);
 if(session!==null&&!/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session)||flow!==null&&!/^nof_[A-Za-z0-9_-]{43}$/.test(flow))deny('INGRESS_REJECTED',401);
 if(req.headers.cookie!==undefined){
  if(count(req,'cookie')!==1||typeof req.headers.cookie!=='string'||req.headers.cookie.length>8192)deny('INGRESS_REJECTED',401);
  const found={};
  for(const part of req.headers.cookie.split(';')){
   const pair=part.trim(),at=pair.indexOf('=');if(at<1)deny('INGRESS_REJECTED',401);
   const name=pair.slice(0,at),value=pair.slice(at+1);
   if(!/^[!#$%&'*+.^_`|~A-Za-z0-9-]+$/.test(name)||!/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(value))deny('INGRESS_REJECTED',401);
   if(['__Host-nexus_session','__Host-nexus_oauth_flow'].includes(name)){if(Object.hasOwn(found,name))deny('INGRESS_REJECTED',401);found[name]=value}
  }
  const fromCookie=found['__Host-nexus_session']??null,fromFlow=found['__Host-nexus_oauth_flow']??null;
  if((!(fromCookie===null&&session===null)&&!same(fromCookie,session))||
     (!(fromFlow===null&&flow===null)&&!same(fromFlow,flow)))deny('INGRESS_REJECTED',401);
 }else if(count(req,'cookie')!==0)deny('INGRESS_REJECTED',401);
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
  const safe=['FRESH_PASSKEY_REQUIRED','EXPLICIT_LINK_REQUIRED','OWNER_EMAIL_REQUIRED','IDENTITY_ALREADY_LINKED','IDENTITY_REJECTED','TRANSACTION_REJECTED','RATE_LIMITED'];
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
   const context=ingress(req);
   if(action==='start'){
    if(url.search||req.url!==url.pathname)deny('INVALID_INPUT');
    if(req.headers.origin!==GATEWAY_ORIGIN||count(req,'origin')!==1||req.headers['x-nexus-oauth-request']!=='1'||count(req,'x-nexus-oauth-request')!==1||req.headers['content-type']!=='application/json'||(req.headers['sec-fetch-site']!==undefined&&req.headers['sec-fetch-site']!=='same-origin'))deny('WRITE_ORIGIN_REQUIRED',403);
    const input=await boundedJSON(req,1024,true);
    if(Object.keys(input).join(',')!=='intent'||!['login','link'].includes(input.intent))deny('INVALID_INPUT');
    if(input.intent==='link'&&!context.session)deny('FRESH_PASSKEY_REQUIRED',401);
    const state=random(),codeVerifier=random(),nonce=random(),flow='nof_'+random();
    const result=await service(env,fetchImpl,{op:'begin',provider,intent:input.intent,stateHash:sha(state),flowHash:sha(flow),codeVerifier,nonce,...(input.intent==='link'?{sessionHash:sha(context.session)}:{})});
    if(typeof result.txId!=='string'||result.txId.length>80||typeof result.expiresAt!=='string')deny('OAUTH_UNAVAILABLE',502);
    return reply(res,200,{authorizationURL:oauthAuthorizationURL({provider,env,state,codeVerifier,nonce})},[flowCookie(flow,600)]);
   }
   if(!context.flow)deny('FLOW_REQUIRED',401);
   const params=url.searchParams;
   if([...params.keys()].some(name=>params.getAll(name).length!==1))deny('INVALID_INPUT');
   const metadata=provider==='google'?['scope','authuser','prompt','iss']:provider==='vk'?['type','expires_in']:[];
   if([...params.keys()].some(name=>!['code','state',...(provider==='vk'?['device_id']:[]),...metadata].includes(name)))deny('INVALID_INPUT');
   const code=params.get('code'),state=params.get('state'),deviceId=params.get('device_id');
   if(typeof code!=='string'||!code.length||code.length>4096||/[\x00-\x20\x7f]/.test(code)||!(/^[A-Za-z0-9_-]{43}$/.test(state||''))||provider==='vk'&&(typeof deviceId!=='string'||!deviceId.length||deviceId.length>512||/[\x00-\x20\x7f]/.test(deviceId)))deny('INVALID_INPUT');
   if(params.has('iss')&&!['https://accounts.google.com','accounts.google.com'].includes(params.get('iss')))deny('PROVIDER_REJECTED',401);
   const claim=await service(env,fetchImpl,{op:'claim',provider,stateHash:sha(state),flowHash:sha(context.flow)});
   if(typeof claim.txId!=='string'||claim.txId.length>80||!['login','link'].includes(claim.intent)||typeof claim.codeVerifier!=='string'||!/^[A-Za-z0-9._~-]{43,128}$/.test(claim.codeVerifier)||typeof claim.nonce!=='string'||!/^[A-Za-z0-9_-]{22,128}$/.test(claim.nonce))deny('OAUTH_UNAVAILABLE',502);
   const profile=await exchangeOAuthProfile({provider,env,code,state,deviceId,codeVerifier:claim.codeVerifier,nonce:claim.nonce,fetchImpl});
   const completed=await service(env,fetchImpl,{op:'complete',txId:claim.txId,flowHash:sha(context.flow),profile});
   if(!/^nxs_[A-Za-z0-9_-]{43}$/.test(completed.sessionSecret||''))deny('OAUTH_UNAVAILABLE',502);
   return reply(res,303,null,[sessionCookie(completed.sessionSecret),flowCookie('',0)],{location:GATEWAY_ORIGIN+(claim.intent==='link'?'/#view=account':'/')});
  }catch(error){
   const known=error instanceof Rejected;
   return reply(res,known?error.status:error.message==='PROVIDER_REJECTED'?401:502,{error:{code:known?error.code:error.message==='PROVIDER_REJECTED'?'PROVIDER_REJECTED':'OAUTH_UNAVAILABLE'}},callback?[flowCookie('',0)]:[]);
  }
 };
}
