import {sanitizeAvatar,AvatarError} from '../avatar-codec.mjs';
import {HOME_SLOTS} from '../../core/content-contract.js';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from './account-read.mjs';
import {readV2CookieContext} from './gateway-cookie-context.mjs';
import {configuredOAuthProviders,oauthCallbackURL} from './oauth-providers.mjs';
const INTERNAL='/api/v2/account/internal/control',BASE='/api/v2/account/control';
const sha=value=>createHash('sha256').update(value).digest('hex');
const count=(req,name)=>{
 if(!Array.isArray(req.rawHeaders)||req.rawHeaders.length%2)return-1;
 let n=0;for(let i=0;i<req.rawHeaders.length;i+=2){if(typeof req.rawHeaders[i]!=='string'||typeof req.rawHeaders[i+1]!=='string')return-1;if(req.rawHeaders[i].toLowerCase()===name)n++}return n;
};
class Rejected extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status}}
const fail=(code,status)=>{throw new Rejected(code,status)};
const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
const id=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
const safeText=(value,max)=>typeof value==='string'&&value.length<=max&&!/[\u0000-\u001f\u007f]/.test(value);
const safeCodes=new Set(['SESSION_REQUIRED','ACCOUNT_SESSION_CHANGED','ADMIN_REQUIRED','ADMIN_FRESH_PASSKEY_REQUIRED','ADMIN_ACCOUNT_PROTECTED','INVALID_INPUT','INVALID_STATE','RESTORE_WITHOUT_LOGIN_METHOD','NOT_FOUND','CONTROL_CONFLICT','CONTROL_WRITE_UNCONFIRMED','CONTROL_UNAVAILABLE','ALPHA_CONTROL_UNAVAILABLE','ALPHA_ACCESS_CLOSED','ALPHA_CAPACITY_REACHED','ALPHA_LIMIT_BELOW_OCCUPIED','REMOVE_BEFORE_PURGE','PURGE_NOT_ENABLED','PURGE_SCHEMA_REVIEW_REQUIRED','SHARED_PROJECT_TRANSFER_REQUIRED','PURGE_EXTERNAL_STORAGE_REVIEW_REQUIRED','PURGE_APPROVAL_REJECTED','PURGE_CONFIRMATION_REQUIRED','AVATAR_INVALID','AVATAR_DIMENSIONS','AVATAR_TOO_LARGE','USERNAME_UNAVAILABLE','RATE_LIMITED']);
const reply=(res,status,body)=>{const data=JSON.stringify(body);res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(data),'cache-control':'no-store','vary':'*','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(data);return true};
async function bounded(stream){
 const chunks=[];let size=0;
 for await(const b of stream){const bytes=Buffer.from(b);size+=bytes.length;if(size>262144)fail('INPUT_TOO_LARGE',413);chunks.push(bytes)}
 let text,value;try{text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,size));value=JSON.parse(text)}catch{fail('INVALID_INPUT')}
 if(!value||typeof value!=='object'||Array.isArray(value)||text!==JSON.stringify(value))fail('INVALID_INPUT');
 return value;
}
function validateDTO(data,path,expected){
 const valid=()=>fail('CONTROL_UNAVAILABLE',502);
 if(path==='/api/v2/account/profile'||path.startsWith('/api/v2/account/profile/avatar')){
  if(!exact(data,['accountId','username','displayName','avatar','avatarVersion'])||data.accountId!==expected||!safeText(data.displayName,512)||data.username!==null&&!/^[a-z][a-z0-9._-]{2,31}$/.test(data.username)||!Number.isInteger(data.avatarVersion)||data.avatarVersion<0||data.avatar!==null&&(typeof data.avatar!=='string'||data.avatar.length>131100||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(data.avatar)))valid();
 }else if(path===BASE+'/capabilities'){
  if(!exact(data,['canManage','canModerate','canPurge','freshPasskey'])||Object.values(data).some(v=>typeof v!=='boolean'))valid();
 }else if(path.startsWith(BASE+'/users?')||path===BASE+'/users'){
  if(!exact(data,['users','total','offset','settings','counts'])||!Array.isArray(data.users)||data.users.length>50||!Number.isInteger(data.total)||!Number.isInteger(data.offset)||!exact(data.settings,['registrationMode','maxTesters','limitEnabled','version'])||!exact(data.counts,['active','occupied','reserved'])||typeof data.settings.limitEnabled!=='boolean'||!['open','invite_only'].includes(data.settings.registrationMode)||!Number.isInteger(data.settings.maxTesters)||data.settings.maxTesters<1||data.settings.maxTesters>10000||!Number.isInteger(data.settings.version)||data.settings.version<1||Object.values(data.counts).some(v=>!Number.isInteger(v)||v<0))valid();
  for(const u of data.users)if(!exact(u,['accountId','username','displayName','state','version','createdAt','lastLoginAt','activeSessions','reason','protected'])||!id(u.accountId)||!safeText(u.displayName,512)||u.username!==null&&!safeText(u.username,32)||!['active','blocked','removed','invited','unadmitted','administrator'].includes(u.state)||!Number.isInteger(u.version)||!Number.isInteger(u.activeSessions)||typeof u.protected!=='boolean'||!safeText(u.reason,200))valid();
 }else if(path===BASE+'/content'&&!exact(data,['ok'])){
  if(!exact(data,['posts','home'])||!Array.isArray(data.posts)||data.posts.length>100||!exact(data.home,['draft','published','version']))valid();
  const bounded=(v,max)=>typeof v==='string'&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
  const article=v=>exact(v,['title','summary','body'])&&bounded(v.title,160)&&bounded(v.summary,500)&&bounded(v.body,20000);
  for(const key of ['draft','published'])if(!data.home[key]||typeof data.home[key]!=='object'||Array.isArray(data.home[key])||Object.entries(data.home[key]).some(([k,v])=>!Object.hasOwn(HOME_SLOTS,k)||!bounded(v,HOME_SLOTS[k].max)))valid();
  if(!Number.isInteger(data.home.version)||data.home.version<1)valid();
  for(const post of data.posts)if(!exact(post,['id','slug','draft','published','state','version','publishedAt'])||!id(post.id)||!safeText(post.slug,80)||!['draft','published','archived'].includes(post.state)||!Number.isInteger(post.version)||!article(post.draft)||post.published!==null&&!article(post.published)||post.publishedAt!==null&&!safeText(post.publishedAt,64))valid();
 }else if(path===BASE+'/audit'){
  if(!exact(data,['events'])||!Array.isArray(data.events)||data.events.length>100)valid();
  for(const e of data.events)if(!exact(e,['action','targetId','createdAt'])||!safeText(e.action,32)||e.targetId!==null&&!id(e.targetId)||!safeText(e.createdAt,64))valid();
 }else if(path===BASE+'/invites'){
  if(!exact(data,['ok','accountId','invitationToken','expiresAt'])||data.ok!==true||!id(data.accountId)||!/^npi_[A-Za-z0-9_-]{43}$/.test(data.invitationToken)||!safeText(data.expiresAt,64))valid();
 }else if(path.endsWith('/purge-preview')){
  if(!exact(data,['approvalToken','expiresAt','counts','confirmation','serverDataOnly'])||!/^npa_[A-Za-z0-9_-]{43}$/.test(data.approvalToken)||!safeText(data.expiresAt,64)||!safeText(data.confirmation,180)||data.serverDataOnly!==true||!exact(data.counts,['projects','workspaces','feedback','keys','providers'])||Object.values(data.counts).some(v=>!Number.isInteger(v)||v<0))valid();
 }else if(path.endsWith('/purge')){
  if(!exact(data,['ok','deletedServerData','localCopiesRemotelyErased'])||data.ok!==true||data.deletedServerData!==true||data.localCopiesRemotelyErased!==false)valid();
 }else if(path===BASE+'/providers'){
  if(!exact(data,['authorized'])||data.authorized!==true)valid();
 }else if(!exact(data,['ok'])||data.ok!==true)valid();
 return data;
}
async function service(env,fetchImpl,envelope){
 const body=JSON.stringify(envelope),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
   const signature=createHmac('sha256',env.ADMIN_SERVICE_KEY).update(['v1','POST',INTERNAL,timestamp,nonce,sha(body)].join('\n')).digest('hex');
   const upstream=await fetchImpl(WORKER_ORIGIN+INTERNAL,{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),headers:{accept:'application/json','content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature},body});
   if(upstream.redirected||!/^application\/json(?:\s*;|$)/i.test(upstream.headers.get('content-type')||'')||upstream.headers.has('set-cookie')||upstream.headers.get('cache-control')!=='no-store'||upstream.headers.get('vary')!=='*'){await upstream.body?.cancel();fail('CONTROL_UNAVAILABLE',502)}
 const data=await bounded(upstream.body);
 if(upstream.status!==200)fail(safeCodes.has(data.error?.code)?data.error.code:'CONTROL_UNAVAILABLE',[400,401,403,404,409,413,429,503].includes(upstream.status)?upstream.status:502);
 return data;
}
export function createAccountControlHandler({env={},fetchImpl=fetch}={}){
 return async(req,res)=>{
  if(typeof req.url!=='string'||!/^\/api\/v2\/account\/(?:control(?:\/|\?|$)|profile(?:\/|\?|$))/.test(req.url))return false;
  try{
   if(env.ACCOUNT_CONTROL_PROXY_ENABLED!=='true'||env.PRIVATE_GATEWAY_CONFIRMED!=='true'||typeof env.ADMIN_SERVICE_KEY!=='string'||env.ADMIN_SERVICE_KEY.length<32)fail('CONTROL_UNAVAILABLE',503);
   if(req.url.length>512)fail('INVALID_INPUT');const url=new URL(req.url,GATEWAY_ORIGIN),path=url.pathname;
   if(url.hash||req.url.split('?')[0]!==path||!['GET','POST'].includes(req.method)||path.startsWith('/api/v2/account/profile')&&url.search)fail('INVALID_INPUT');
   if(req.headers.host!==new URL(GATEWAY_ORIGIN).host||count(req,'host')!==1||count(req,'authorization')!==0||req.headers.origin!==undefined&&req.headers.origin!==GATEWAY_ORIGIN||req.headers['sec-fetch-site']!==undefined&&req.headers['sec-fetch-site']!=='same-origin')fail('ORIGIN_REJECTED',403);
   const expected=req.headers['x-nexus-account-expectation'];
   if(count(req,'x-nexus-account-expectation')!==1||!id(expected))fail('ACCOUNT_EXPECTATION_REQUIRED',400);
   if(req.method==='POST'&&(req.headers.origin!==GATEWAY_ORIGIN||count(req,'origin')!==1||req.headers['content-type']!=='application/json'||count(req,'content-type')!==1||req.headers['x-nexus-account-control']!=='1'||count(req,'x-nexus-account-control')!==1))fail('WRITE_ORIGIN_REQUIRED',403);
   const cookies=readV2CookieContext(req,'accountControlContract',{env});
   if(!cookies)fail('INGRESS_REJECTED',401);
   const session=cookies.get('__Host-nexus_session');
   if(!session)fail('SESSION_REQUIRED',401);
   if(!/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session))fail('INGRESS_REJECTED',401);
   const payload=req.method==='POST'?await bounded(req):null;
   let prepared=payload;
   if(path==='/api/v2/account/profile/avatar'&&req.method==='POST'){
    if(!exact(payload,['requestId','version','jpegBase64']))fail('INVALID_INPUT');
    const before=await service(env,fetchImpl,{path:'/api/v2/account/profile',method:'GET',payload:null,sessionHash:sha(session),expectedAccountId:expected});
    validateDTO(before,'/api/v2/account/profile',expected);
    if(before.avatarVersion!==payload.version)fail('CONTROL_CONFLICT',409);
    try{prepared={...payload,jpegBase64:sanitizeAvatar(payload.jpegBase64)}}
    catch(error){if(error instanceof AvatarError)fail(error.code,error.status);throw error}
   }
   const data=await service(env,fetchImpl,{path:req.url,method:req.method,payload:prepared,sessionHash:sha(session),expectedAccountId:expected});
   const dto=validateDTO(data,req.url,expected);
   if(path===BASE+'/providers'){
    const configured=new Set(configuredOAuthProviders(env).map(p=>p.id));
    return reply(res,200,{providers:[['yandex','Яндекс ID',['YANDEX_CLIENT_ID','YANDEX_CLIENT_SECRET']],['google','Google',['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET']],['vk','VK ID',['VK_CLIENT_ID']]].map(([id,label,names])=>({id,label,configured:configured.has(id),missing:names.filter(n=>typeof env[n]!=='string'||!env[n]||/[\x00-\x20\x7f]/.test(env[n])),callbackURL:oauthCallbackURL(id)}))});
   }
   return reply(res,200,dto);
  }catch(error){return reply(res,error instanceof Rejected?error.status:error.message==='INGRESS_REJECTED'?401:502,{error:{code:error instanceof Rejected?error.code:error.message==='INGRESS_REJECTED'?'INGRESS_REJECTED':'CONTROL_UNAVAILABLE'}})}
 };
}
