// Secure public entry for INVITED participants only. Browser never calls Worker.
// Password KDF stays in the trusted Node BFF; Cloudflare Worker verifies a
// per-attempt HMAC challenge and issues ordinary Nexus Account sessions.
import {createHash,createHmac,randomBytes,scrypt,promises as ignored} from 'node:crypto';
import {promisify} from 'node:util';
import {isIP} from 'node:net';
import {readV2CookieContext} from './gateway-cookie-context.mjs';

const KDF=promisify(scrypt);
const INTERNAL='/api/v2/account/internal/invited-password';
const PREFIX='/api/v2/account/password/';
const METHODS=new Map([['enroll','enroll'],['login','login'],['logout','logout']]);
const sha=v=>createHash('sha256').update(v).digest('hex');
const reply=(res,status,data,cookies=[])=>{
 const body=JSON.stringify(data);
 res.writeHead(status,{
  'content-type':'application/json; charset=utf-8',
  'content-length':Buffer.byteLength(body),
  'cache-control':'no-store','vary':'*','x-content-type-options':'nosniff','referrer-policy':'no-referrer',
  ...(cookies.length?{'set-cookie':cookies}:{})
 });
 res.end(body);return true;
};
const cookie=(value,age)=>'__Host-nexus_session='+value+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+age;
const count=(req,name)=>{
 let n=0;
 for(let i=0;i<(req.rawHeaders||[]).length;i+=2)if(req.rawHeaders[i].toLowerCase()===name)n++;
 return n;
};
const normalEmail=value=>{
 if(typeof value!=='string')return null;
 const text=value.trim().toLowerCase();
 if(text.length<6||text.length>254||!/^[a-z0-9.!#$%&'*+/=?^_~{|}-]+@[a-z0-9.-]+\.[a-z]{2,63}$/.test(text)||
    text.includes('..')||text.startsWith('.')||text.includes('@.')||text.includes('.@'))return null;
 return text;
};
const validPassword=value=>typeof value==='string'&&Array.from(value).length>=12&&Array.from(value).length<=128&&
 Buffer.byteLength(value,'utf8')<=512&&!/[\u0000-\u001f\u007f]/.test(value);
const isObject=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const isHash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const fixedURL=value=>{
 const u=new URL(value);
 if(u.origin!==value||u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('CONFIG');
 return u;
};
async function boundedJSON(req){
 const chunks=[];let len=0;
 for await(const part of req){
  len+=part.length;
  if(len>4096)throw Error('BAD_INPUT');
  chunks.push(part);
 }
 let value;
 try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,len)))}catch{throw Error('BAD_INPUT')}
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('BAD_INPUT');
 return value;
}
async function responseJSON(upstream){
 if(!upstream.headers.get('content-type')?.startsWith('application/json'))throw Error('UPSTREAM');
 const reader=upstream.body?.getReader();
 if(!reader)throw Error('UPSTREAM');
 let len=0;const chunks=[];
 try{
  while(true){
   const{done,value}=await reader.read();
   if(done)break;
   len+=value.length;
   if(len>8192)throw Error('UPSTREAM');
   chunks.push(value);
  }
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
 try{return JSON.parse(Buffer.concat(chunks,len).toString('utf8'))}catch{throw Error('UPSTREAM')}
}
let busy=0;
async function derive(password,salt){
 if(busy>=4)throw Error('BUSY');
 busy++;
 try{
  return await KDF(password,salt,32,{N:32768,r:8,p:3,maxmem:96*1024*1024});
 }finally{busy--}
}
export function createInvitedPasswordHandler({env,fetchImpl=fetch}){
 return async(req,res)=>{
  if(!req.url?.startsWith(PREFIX))return false;
  const action=req.url.slice(PREFIX.length);
  if(!METHODS.has(action))return reply(res,404,{error:{code:'NOT_FOUND'}});
  if(req.method!=='POST')return reply(res,405,{error:{code:'METHOD_NOT_ALLOWED'}});
  if(env.INVITED_PASSWORD_PROXY_ENABLED!=='true'||env.PRIVATE_GATEWAY_CONFIRMED!=='true'||
     typeof env.INVITED_PASSWORD_SERVICE_KEY!=='string'||env.INVITED_PASSWORD_SERVICE_KEY.length<32)
   return reply(res,503,{error:{code:'PASSWORD_UNAVAILABLE'}});
  let origin,worker;
  try{origin=fixedURL(env.INVITED_PASSWORD_ORIGIN);worker=fixedURL(env.INVITED_PASSWORD_WORKER_ORIGIN)}
  catch{return reply(res,503,{error:{code:'PASSWORD_UNAVAILABLE'}})}
  if(req.headers.host!==origin.host||count(req,'host')!==1||req.headers.authorization||
     count(req,'origin')!==1||req.headers.origin!==origin.origin||
     req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin'||
     req.headers['content-type']!=='application/json'||
     req.headers['x-nexus-password-write']!=='1'||count(req,'x-nexus-password-write')!==1)
   return reply(res,403,{error:{code:'ORIGIN_REJECTED'}});
  // Do not trust claimed client identity. IP is used only for a rate-limit scope.
  const forwarded=String(req.headers['x-forwarded-for']||'').split(',').at(-1).trim();
  const networkHash=createHmac('sha256',env.INVITED_PASSWORD_SERVICE_KEY)
   .update(isIP(forwarded)?forwarded:String(req.socket?.remoteAddress||'unknown')).digest('hex');
  async function service(data){
   const body=JSON.stringify(data),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
   const canonical=['v1','POST',INTERNAL,timestamp,nonce,sha(body)].join('\n');
   const upstream=await fetchImpl(worker.origin+INTERNAL,{
    method:'POST',body,redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{
     accept:'application/json','content-type':'application/json',
     'x-nexus-service-timestamp':timestamp,
     'x-nexus-service-nonce':nonce,
     'x-nexus-service-signature':createHmac('sha256',env.INVITED_PASSWORD_SERVICE_KEY).update(canonical).digest('hex')
    }
   });
   const result=await responseJSON(upstream);
   if(!upstream.ok){
    const codes=['INVALID_INPUT','INPUT_TOO_LARGE','ENROLLMENT_REQUIRED','USERNAME_UNAVAILABLE','AUTH_FAILED','RATE_LIMITED','PASSWORD_UNAVAILABLE','AUTH_UNCONFIRMED','ENROLLMENT_UNCONFIRMED'];
    const code=codes.includes(result?.error?.code)?result.error.code:'PASSWORD_UNAVAILABLE';
    const error=Error(code);error.status=[400,401,403,409,413,429,503].includes(upstream.status)?upstream.status:502;
    throw error;
   }
   return result;
  }
  try{
   const input=await boundedJSON(req);
   if(action==='enroll'){
    if(!isObject(input,['invitationToken','email','password','username','displayName'])||
       typeof input.invitationToken!=='string'||!/^npi_[A-Za-z0-9_-]{43}$/.test(input.invitationToken)||
       !normalEmail(input.email)||!validPassword(input.password)||
       typeof input.username!=='string'||typeof input.displayName!=='string')
     throw Error('BAD_INPUT');
    const salt=randomBytes(16),hash=await derive(input.password,salt);
    const data=await service({
     op:'enroll',inviteHash:sha(input.invitationToken),emailHash:sha(normalEmail(input.email)),
     username:input.username,displayName:input.displayName,
     saltB64:salt.toString('base64url'),hashB64:hash.toString('base64url'),networkHash
    });
    if(data.ok!==true||'sessionSecret' in data)throw Error('UPSTREAM');
    return reply(res,200,{ok:true});
   }
   if(action==='login'){
    if(!isObject(input,['email','password'])||!normalEmail(input.email)||!validPassword(input.password))
     throw Error('BAD_INPUT');
    const emailHash=sha(normalEmail(input.email));
    const begun=await service({op:'begin',emailHash,networkHash});
    if(typeof begun.challengeId!=='string'||!/^[a-f0-9-]{36}$/.test(begun.challengeId)||
       typeof begun.saltB64!=='string'||!/^[A-Za-z0-9_-]{22}$/.test(begun.saltB64))
     throw Error('UPSTREAM');
    const derived=await derive(input.password,Buffer.from(begun.saltB64,'base64url'));
    const proof=createHmac('sha256',derived).update(['v1',begun.challengeId,emailHash,networkHash].join('\n')).digest('hex');
    const issued=await service({op:'finish',challengeId:begun.challengeId,emailHash,networkHash,proof});
    if(issued.ok!==true||!/^nxs_[A-Za-z0-9_-]{43}$/.test(issued.sessionSecret||''))
     throw Error('UPSTREAM');
    return reply(res,200,{ok:true},[cookie(issued.sessionSecret,43200)]);
   }
   if(!isObject(input,[]))throw Error('BAD_INPUT');
   const cookies=readV2CookieContext(req,'passwordIngressContract',{env});
   const session=cookies?.get('__Host-nexus_session');
   if(!session||!/^nxs_[A-Za-z0-9_-]{43}$/.test(session))throw Error('AUTH_FAILED');
   const result=await service({op:'logout',sessionHash:sha(session)});
   if(result.ok!==true||result.clearSession!==true)throw Error('UPSTREAM');
   return reply(res,200,{ok:true},[cookie('',0)]);
  }catch(error){
   const code=error.message==='BAD_INPUT'?'INVALID_INPUT':
    error.message==='BUSY'?'RATE_LIMITED':
    ['ENROLLMENT_REQUIRED','USERNAME_UNAVAILABLE','RATE_LIMITED','PASSWORD_UNAVAILABLE','ENROLLMENT_UNCONFIRMED','AUTH_UNCONFIRMED'].includes(error.message)?error.message:
    'AUTH_FAILED';
   const status=code==='INVALID_INPUT'?400:code==='RATE_LIMITED'?429:
    code==='USERNAME_UNAVAILABLE'?409:code==='ENROLLMENT_REQUIRED'?403:
    code==='PASSWORD_UNAVAILABLE'||code==='ENROLLMENT_UNCONFIRMED'||code==='AUTH_UNCONFIRMED'?503:401;
   return reply(res,status,{error:{code}});
  }
 };
}
