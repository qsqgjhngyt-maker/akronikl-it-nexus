// P1A: UNWIRED internal signed RPC, no route entry and no production flag.
// Only a trusted private Worker deployment with D1 nonce DB may instantiate it.
import {REMEMBER_INTERNAL_PATH,REMEMBER_RPC_MAX_BYTES,validRpcInput} from '../remember-device-transport-contract.mjs';
import {createRememberFreshProofResolver} from './remember-device-proof.mjs';
const encode=new TextEncoder();
const sha=async input=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',input))]
 .map(x=>x.toString(16).padStart(2,'0')).join('');
const deny=(status=401)=>Response.json({error:{code:'REMEMBER_UNAVAILABLE'}},{status,headers:{'cache-control':'no-store',vary:'*','x-content-type-options':'nosniff'}});
const reply=(status,data)=>Response.json(data,{status,headers:{'cache-control':'no-store',vary:'*','x-content-type-options':'nosniff'}});
const signedHeaders=Object.freeze(['x-nexus-service-timestamp','x-nexus-service-nonce','x-nexus-service-signature']);
const good=regex=>v=>typeof v==='string'&&regex.test(v);
const nonceValid=good(/^[a-f0-9]{32}$/),stampValid=good(/^\d{13}$/),signatureValid=good(/^[a-f0-9]{64}$/);
async function collect(request){
 const reader=request.body?.getReader();if(!reader)throw Error('RPC_BODY_REQUIRED');
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;
  size+=value.byteLength;if(size>REMEMBER_RPC_MAX_BYTES)throw Error('RPC_TOO_LARGE');chunks.push(value);
 }const result=new Uint8Array(size);let pos=0;for(const value of chunks){result.set(value,pos);pos+=value.byteLength}return result;
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}
/** Requires external real IAM gate, signed ingress and migration approval BEFORE routing. */
export function createRememberInternalHandler({env={},core,resolveFreshProof,clock=()=>Date.now()}={}){
 return async request=>{
  const url=new URL(request.url);
  if(url.pathname!==REMEMBER_INTERNAL_PATH)return null;
  if(env.REMEMBER_DEVICE_ENABLED!=='true'||env.PRIVATE_GATEWAY_CONFIRMED!=='true'||
     !env.DB?.prepare||typeof env.REMEMBER_SERVICE_KEY!=='string'||env.REMEMBER_SERVICE_KEY.length<32||
     !core)return deny(404);
  if(request.method!=='POST'||url.search||url.hash||request.headers.has('cookie')||
     request.headers.has('authorization')||request.headers.get('content-type')!=='application/json')return deny();
  const stamp=request.headers.get(signedHeaders[0]),nonce=request.headers.get(signedHeaders[1]),signature=request.headers.get(signedHeaders[2]);
  if(!stampValid(stamp)||!nonceValid(nonce)||!signatureValid(signature)||Math.abs(clock()-Number(stamp))>30000)return deny();
  try{
   const raw=await collect(request),bodyHash=await sha(raw);
   const canonical=`v1\nPOST\n${REMEMBER_INTERNAL_PATH}\n${stamp}\n${nonce}\n${bodyHash}`;
   const key=await crypto.subtle.importKey('raw',encode.encode(env.REMEMBER_SERVICE_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']);
   const verified=await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g),p=>parseInt(p,16)),encode.encode(canonical));
   if(!verified)return deny();
   const input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
   if(!validRpcInput(input))return deny();
   // No raw cookie, service credential or session hash is stored in this table.
   const inserted=await env.DB.prepare('INSERT OR IGNORE INTO account_service_nonces(nonce,expires_at) VALUES(?1,?2)')
    .bind(nonce,new Date(Number(stamp)+30000).toISOString()).run();
   if(!inserted?.success||Number(inserted.meta?.changes)!==1)return deny();
   if(input.action==='enroll'){
    const proof=await (resolveFreshProof??createRememberFreshProofResolver(env.DB,{env,clock}))(input.sessionCookie);
    if(!proof)return deny();
    const result=await core.createGrant({...proof,explicitOptIn:true});
    if(result.kind!=='issued')return deny();
    return reply(200,{kind:'issued',rememberCookieValue:result.rememberCookieValue,expiresAt:result.expiresAt});
   }
   if(input.action==='renew'){
    const result=await core.renew(input.rememberCookie);
    if(result.kind==='wait-for-other-tab')return reply(409,{kind:'wait-for-other-tab'});
    if(result.kind!=='renewed')return deny();
    return reply(200,{kind:'renewed',rememberCookieValue:result.rememberCookieValue,sessionCookieValue:result.sessionCookieValue,expiresAt:result.expiresAt});
   }
   // Dedicated opt-out only: integration with full logout needs atomic D1 revoke!
   if(input.action==='revoke'){
    const result=await core.revokeByCookie(input.rememberCookie);
    return result?reply(200,{kind:'revoked'}):deny();
   }
   return deny();
  }catch{return deny(503)} // No credentials/headers/errors in user-facing error or logs.
 };
}
