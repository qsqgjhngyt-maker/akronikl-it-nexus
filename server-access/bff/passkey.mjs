import {createHash,createHmac,randomBytes} from 'node:crypto';
import {isIP} from 'node:net';
import {readV2CookieContext} from './gateway-cookie-context.mjs';
const INTERNAL='/api/v2/account/internal/passkey';
const routes=new Map([
 ['/api/v2/account/passkey/register/options',['POST','register-options']],
 ['/api/v2/account/passkey/register/verify',['POST','register-verify']],
 ['/api/v2/account/passkey/authenticate/options',['POST','authenticate-options']],
 ['/api/v2/account/passkey/authenticate/verify',['POST','authenticate-verify']],
 ['/api/v2/account/passkey/keys',['GET','keys']],
 ['/api/v2/account/passkey/revoke',['POST','revoke']],
 ['/api/v2/account/passkey/logout',['POST','logout']]
]);
const digest=value=>createHash('sha256').update(value).digest('hex');
const reply=(res,status,body,cookies=[])=>{const data=JSON.stringify(body);res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'*','x-content-type-options':'nosniff','content-length':Buffer.byteLength(data),...(cookies.length?{'set-cookie':cookies}:{})});res.end(data)};
const count=(req,name)=>{let value=0;for(let i=0;i<(req.rawHeaders||[]).length;i+=2)if(req.rawHeaders[i].toLowerCase()===name)value++;return value};
const cookies=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
function context(req,env){
 const v2=readV2CookieContext(req,'passkeyIngressContract',{env});
 if(v2!==undefined){
  const flow=v2.get('__Host-nexus_passkey_flow')??null,session=v2.get('__Host-nexus_session')??null;
  if(flow!==null&&!/^npf_[A-Za-z0-9_-]{43}$/.test(flow)||session!==null&&!/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session))throw Error('INGRESS_REJECTED');
  return{flow,session};
 }
 if(count(req,'x-yc-apigateway-operation-context')!==1)throw Error('INGRESS_REJECTED');
 const value=req.headers['x-yc-apigateway-operation-context'];
 if(typeof value!=='string'||value.length>4096||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('INGRESS_REJECTED');
 const bytes=Buffer.from(value,'base64');if(bytes.toString('base64')!==value)throw Error('INGRESS_REJECTED');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),data=JSON.parse(text);
 if(!data||Object.keys(data).sort().join(',')!=='flowCookie,passkeyIngressContract,sessionCookie'||text.match(/"(?:[^"\\]|\\.)*"/g)?.length!==6||data.passkeyIngressContract!=='v1'||typeof data.flowCookie!=='string'||typeof data.sessionCookie!=='string')throw Error('INGRESS_REJECTED');
 const optional=value=>['','-'].includes(value)?null:value;
 const flow=optional(data.flowCookie),session=optional(data.sessionCookie);
 if(flow&&!/^npf_[A-Za-z0-9_-]{43}$/.test(flow)||session&&!/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session))throw Error('INGRESS_REJECTED');
 if(req.headers.cookie!==undefined){
  if(count(req,'cookie')!==1||typeof req.headers.cookie!=='string'||req.headers.cookie.length>8192)throw Error('INGRESS_REJECTED');
  const found={};for(const part of req.headers.cookie.split(';')){const p=part.trim(),at=p.indexOf('=');if(at<1)throw Error('INGRESS_REJECTED');const name=p.slice(0,at),v=p.slice(at+1);if(!/^[!#$%&'*+.^_`|~A-Za-z0-9-]+$/.test(name)||/[\s,;"\\]/.test(v))throw Error('INGRESS_REJECTED');if(['__Host-nexus_session','__Host-nexus_passkey_flow'].includes(name)){if(name in found)throw Error('INGRESS_REJECTED');found[name]=v}}
  if((found['__Host-nexus_session']||null)!==session||(found['__Host-nexus_passkey_flow']||null)!==flow)throw Error('INGRESS_REJECTED');
 }
 return{flow,session};
}
async function readJSON(stream,max){let size=0;const parts=[];for await(const part of stream){size+=part.length;if(size>max)throw Error('INPUT_TOO_LARGE');parts.push(part)}return JSON.parse(Buffer.concat(parts).toString('utf8'))}
async function upstreamJSON(response){const reader=response.body?.getReader();if(!reader)throw Error('UPSTREAM_INVALID');let size=0;const parts=[];try{while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536)throw Error('UPSTREAM_INVALID');parts.push(value)}return JSON.parse(Buffer.concat(parts).toString('utf8'))}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}}
export function createPasskeyHandler({env,fetchImpl=fetch}){
 return async(req,res)=>{
  const route=routes.get(req.url);if(!route)return reply(res,404,{error:{code:'NOT_FOUND'}});
  if(env.PASSKEY_PROXY_ENABLED!=='true'||env.PRIVATE_GATEWAY_CONFIRMED!=='true'||typeof env.PASSKEY_SERVICE_KEY!=='string'||env.PASSKEY_SERVICE_KEY.length<32)return reply(res,503,{error:{code:'PASSKEY_UNAVAILABLE'}});
  let origin,worker;try{origin=new URL(env.PASSKEY_ORIGIN);worker=new URL(env.PASSKEY_WORKER_ORIGIN)}catch{return reply(res,503,{error:{code:'PASSKEY_UNAVAILABLE'}})}
  if(origin.origin!==env.PASSKEY_ORIGIN||worker.origin!==env.PASSKEY_WORKER_ORIGIN||worker.protocol!=='https:')return reply(res,503,{error:{code:'PASSKEY_UNAVAILABLE'}});
  const[method,op]=route;
  if(req.method!==method)return reply(res,405,{error:{code:'METHOD_NOT_ALLOWED'}});
  if(req.headers.host!==origin.host||count(req,'host')!==1||req.headers.authorization||req.headers.origin&&req.headers.origin!==origin.origin||req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin')return reply(res,403,{error:{code:'ORIGIN_REJECTED'}});
  if(method==='POST'&&(req.headers.origin!==origin.origin||count(req,'origin')!==1||req.headers['x-nexus-passkey-write']!=='1'||req.headers['content-type']!=='application/json'))return reply(res,403,{error:{code:'WRITE_ORIGIN_REQUIRED'}});
  try{
   const ingress=context(req,env),isOptions=op.endsWith('-options');
   const flow=isOptions||!op.endsWith('-verify')?'npf_'+randomBytes(32).toString('base64url'):ingress.flow;
   if(!flow)return reply(res,401,{error:{code:'FLOW_REQUIRED'}});
   const input=method==='GET'?{}:await readJSON(req,65536);
   if(!input||typeof input!=='object'||Array.isArray(input))throw Error('INVALID_INPUT');
   let mapped=input;
   if(op==='register-options'){
    if(Object.keys(input).some(k=>k!=='invitationToken'))throw Error('INVALID_INPUT');
    if(input.invitationToken!==undefined){if(typeof input.invitationToken!=='string'||!/^npi_[A-Za-z0-9_-]{43}$/.test(input.invitationToken))throw Error('INVALID_INPUT');mapped={inviteHash:digest(input.invitationToken)}}else mapped={};
   }
   const sessionHash=ingress.session?digest(ingress.session):null;
   // Used for throttling only. It is never an identity or authorization predicate.
   const forwarded=String(req.headers['x-forwarded-for']||'').split(',').at(-1).trim();
   const networkHash=createHmac('sha256',env.PASSKEY_SERVICE_KEY).update(isIP(forwarded)?forwarded:String(req.socket?.remoteAddress||'unknown')).digest('hex');
   const body=JSON.stringify({op,input:mapped,flowHash:digest(flow),sessionHash,networkHash}),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
   const canonical=`v1\nPOST\n${INTERNAL}\n${timestamp}\n${nonce}\n${digest(body)}`;
   const upstream=await fetchImpl(worker.origin+INTERNAL,{method:'POST',body,redirect:'error',signal:AbortSignal.timeout(12000),headers:{accept:'application/json','content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':createHmac('sha256',env.PASSKEY_SERVICE_KEY).update(canonical).digest('hex')}});
   if(!upstream.headers.get('content-type')?.startsWith('application/json'))throw Error('UPSTREAM_INVALID');
   const data=await upstreamJSON(upstream);
   const safeCodes=['PASSKEY_UNAVAILABLE','INVALID_INPUT','INPUT_TOO_LARGE','RATE_LIMITED','ENROLLMENT_REQUIRED','FRESH_LOGIN_REQUIRED','KEY_LIMIT','PASSKEY_REJECTED','CHALLENGE_REJECTED','SESSION_REQUIRED','LAST_KEY_OR_NOT_FOUND','ISSUANCE_UNCONFIRMED'];
   if(!upstream.ok)return reply(res,[400,401,403,409,413,429,503].includes(upstream.status)?upstream.status:502,{error:{code:safeCodes.includes(data?.error?.code)?data.error.code:'PASSKEY_UNAVAILABLE'}});
   if(isOptions){if(typeof data.challengeId!=='string'||!data.options)throw Error('UPSTREAM_INVALID');return reply(res,200,{challengeId:data.challengeId,options:data.options},[cookies('__Host-nexus_passkey_flow',flow,120)])}
   if(op==='register-verify'){if(data.ok!==true||'sessionSecret' in data)throw Error('UPSTREAM_INVALID');return reply(res,200,{ok:true},[cookies('__Host-nexus_passkey_flow','',0)])}
   if(op==='authenticate-verify'){if(data.ok!==true||!/^nxs_[A-Za-z0-9_-]{43}$/.test(data.sessionSecret||''))throw Error('UPSTREAM_INVALID');return reply(res,200,{ok:true},[cookies('__Host-nexus_session',data.sessionSecret,43200),cookies('__Host-nexus_passkey_flow','',0)])}
   if(op==='logout'){if(data.ok!==true||data.clearSession!==true)throw Error('UPSTREAM_INVALID');return reply(res,200,{ok:true},[cookies('__Host-nexus_session','',0),cookies('__Host-nexus_passkey_flow','',0)])}
   if(op==='keys'){if(!Array.isArray(data.keys)||data.keys.length>10)throw Error('UPSTREAM_INVALID');return reply(res,200,{keys:data.keys.map(k=>({id:k.id,status:k.status,createdAt:k.createdAt,deviceType:k.deviceType}))})}
   if(op==='revoke'&&data.ok===true)return reply(res,200,{ok:true});
   throw Error('UPSTREAM_INVALID');
  }catch(error){const code=['INPUT_TOO_LARGE','INVALID_INPUT','INGRESS_REJECTED'].includes(error.message)?error.message:error instanceof SyntaxError?'INVALID_INPUT':'PASSKEY_UNAVAILABLE';return reply(res,code==='INPUT_TOO_LARGE'?413:code==='INGRESS_REJECTED'?401:code==='INVALID_INPUT'?400:502,{error:{code}})}
 };
}
