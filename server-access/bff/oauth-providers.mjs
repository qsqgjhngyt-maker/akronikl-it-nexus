// Только server-side Authorization Code + PKCE. Provider tokens живут лишь в RAM.
// Primary contracts, сверены 19.10.2026:
// https://developers.google.com/identity/openid-connect/openid-connect
// https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
// https://accounts.google.com/.well-known/openid-configuration
// https://yandex.ru/dev/id/doc/ru/codes/code-url
// https://yandex.ru/dev/id/doc/ru/codes/screen-code
// https://yandex.ru/dev/id/doc/ru/user-information
// https://yandex.ru/support/id/ru/authorization/registration.html
// https://yandex.ru/support/id/ru/feedback
// https://yandex.ru/support/id/ru/troubleshooting/other-login-problems
// https://github.com/VKCOM/vkid-web-sdk/blob/master/src/auth/auth.ts
// https://github.com/VKCOM/vkid-web-sdk/blob/master/src/auth/types.ts
import {createHash,createPublicKey,verify,timingSafeEqual} from 'node:crypto';
import {GATEWAY_ORIGIN} from './account-read.mjs';

const PROVIDERS=Object.freeze({
 google:{label:'Google',prefix:'GOOGLE',authorize:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token'},
 yandex:{label:'Яндекс ID',prefix:'YANDEX',authorize:'https://oauth.yandex.ru/authorize',token:'https://oauth.yandex.ru/token'},
 vk:{label:'VK ID',prefix:'VK',authorize:'https://id.vk.ru/authorize',token:'https://id.vk.ru/oauth2/auth'}
});
const ENDPOINTS=new Set(['https://oauth2.googleapis.com/token','https://www.googleapis.com/oauth2/v3/certs','https://oauth.yandex.ru/token','https://login.yandex.ru/info','https://id.vk.ru/oauth2/auth','https://id.vk.ru/oauth2/user_info']);
const requireThat=value=>{if(!value)throw Error('PROVIDER_REJECTED')};
const safeSecret=value=>typeof value==='string'&&value.length>0&&value.length<=2048&&!/[\x00-\x20\x7f]/.test(value);
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max&&!/[\x00-\x1f\x7f]/.test(value);
const email=value=>value===undefined||value===null||value===''?null:(requireThat(text(value,320)&&/^\S+@\S+\.\S+$/.test(value)),value.trim().toLowerCase());
const display=(value,fallback)=>text(value,512)&&value.trim()?value.trim():fallback;
const subject=value=>{requireThat(text(value,512)&&value===value.trim());return value};
const digest=value=>createHash('sha256').update(value).digest();
function authoritativeYandexEmail(user,address){
 // Это вывод о текущем владении native mailbox из authenticated /info,
 // не самостоятельное удостоверение личности и не причина слияния аккаунтов.
 // Только literal login@yandex.ru: без contact-email, доменных/dot/hyphen aliases.
 return typeof user.login==='string'&&/^[a-z][a-z0-9.-]{0,63}$/.test(user.login)&&
  address===user.login+'@yandex.ru';
}
export const oauthCallbackURL=provider=>{requireThat(Object.hasOwn(PROVIDERS,provider));return GATEWAY_ORIGIN+'/api/v2/account/oauth/'+provider+'/callback'};

function configuration(env,provider){
 const definition=PROVIDERS[provider];if(!definition)return null;
 const clientId=env[definition.prefix+'_CLIENT_ID'],clientSecret=env[definition.prefix+'_CLIENT_SECRET'];
 // VK SDK использует публичный client_id + PKCE/device_id, без client_secret.
 if(!safeSecret(clientId)||(provider!=='vk'&&!safeSecret(clientSecret)))return null;
 return{...definition,clientId,clientSecret:provider==='vk'?undefined:clientSecret};
}
export function configuredOAuthProviders(env={}){
 // Mail.ru не публикуется даже при credentials: отдельный adapter не утверждён.
 return Object.keys(PROVIDERS).filter(id=>configuration(env,id)).map(id=>({id,label:PROVIDERS[id].label}));
}
export function oauthAuthorizationURL({provider,env,state,codeVerifier,nonce}){
 const config=configuration(env,provider);requireThat(config);
 const url=new URL(config.authorize);
 url.search=new URLSearchParams({client_id:config.clientId,response_type:'code',redirect_uri:oauthCallbackURL(provider),state,
  code_challenge:digest(codeVerifier).toString('base64url'),code_challenge_method:provider==='vk'?'s256':'S256',
  scope:provider==='google'?'openid email profile':provider==='yandex'?'login:info login:email':'email',
  // Яндекс иначе может использовать прежнее согласие без выбора аккаунта.
  ...(provider==='google'?{nonce,prompt:'select_account'}:provider==='yandex'?{force_confirm:'yes'}:{})}).toString();
 return url.href;
}

async function json(fetchImpl,url,options={}){
 const target=new URL(url);requireThat(target.protocol==='https:'&&!target.username&&!target.password&&!target.hash&&ENDPOINTS.has(target.origin+target.pathname));
 const response=await fetchImpl(target.href,{...options,credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(3000)});
 if(response.status!==200||response.redirected||!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||'')){
  await response.body?.cancel();throw Error('PROVIDER_REJECTED');
 }
 const reader=response.body?.getReader();requireThat(reader);const parts=[];let length=0;
 try{while(true){const{done,value}=await reader.read();if(done)break;length+=value.length;requireThat(length<=65536);parts.push(value)}
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts,length)));requireThat(plain(value)&&!Object.hasOwn(value,'error'));return value;
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}
const formHeaders={accept:'application/json','content-type':'application/x-www-form-urlencoded'};
function validateToken(token){
 requireThat(plain(token)&&typeof token.access_token==='string'&&token.access_token.length>0&&token.access_token.length<=8192&&!/[\x00-\x20\x7f]/.test(token.access_token)&&typeof token.token_type==='string'&&token.token_type.toLowerCase()==='bearer'&&Number.isFinite(token.expires_in)&&token.expires_in>0);
}
function jwtJSON(segment){
 requireThat(typeof segment==='string'&&segment.length>0&&/^[A-Za-z0-9_-]+$/.test(segment));
 const bytes=Buffer.from(segment,'base64url');requireThat(bytes.toString('base64url')===segment);
 const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));requireThat(plain(value));return value;
}
async function googleProfile(token,config,nonce,fetchImpl){
 requireThat(typeof token.id_token==='string'&&token.id_token.length<=16384);
 const pieces=token.id_token.split('.');requireThat(pieces.length===3);
 const header=jwtJSON(pieces[0]),claims=jwtJSON(pieces[1]);
 requireThat(header.alg==='RS256'&&text(header.kid,128)&&Object.keys(header).every(key=>['alg','kid','typ'].includes(key))&&(header.typ===undefined||header.typ==='JWT'));
 requireThat(/^[A-Za-z0-9_-]+$/.test(pieces[2]));const signature=Buffer.from(pieces[2],'base64url');requireThat(signature.toString('base64url')===pieces[2]);
 const jwks=await json(fetchImpl,'https://www.googleapis.com/oauth2/v3/certs',{method:'GET',headers:{accept:'application/json'}});
 requireThat(Array.isArray(jwks.keys)&&jwks.keys.length>0&&jwks.keys.length<=20);
 const candidates=jwks.keys.filter(key=>key?.kid===header.kid);requireThat(candidates.length===1);
 const jwk=candidates[0];requireThat(jwk.kty==='RSA'&&(jwk.use===undefined||jwk.use==='sig')&&(jwk.alg===undefined||jwk.alg==='RS256')&&text(jwk.n,2048)&&text(jwk.e,16)&&!Object.hasOwn(jwk,'d'));
 const key=createPublicKey({key:jwk,format:'jwk'}),bits=key.asymmetricKeyDetails?.modulusLength;requireThat(bits>=2048&&bits<=8192);
 requireThat(verify('RSA-SHA256',Buffer.from(pieces[0]+'.'+pieces[1]),key,signature));
 const current=Math.floor(Date.now()/1000),aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
 requireThat(['https://accounts.google.com','accounts.google.com'].includes(claims.iss)&&aud.length>0&&aud.length<=8&&aud.every(x=>typeof x==='string')&&aud.includes(config.clientId));
 requireThat((claims.azp===undefined||claims.azp===config.clientId)&&(aud.length===1||claims.azp===config.clientId));
 requireThat(Number.isInteger(claims.exp)&&claims.exp>current&&Number.isInteger(claims.iat)&&claims.iat<=current+60&&claims.iat>=current-600&&claims.exp>claims.iat&&claims.exp-claims.iat<=7200);
 requireThat(claims.nbf===undefined||(Number.isInteger(claims.nbf)&&claims.nbf<=current+60));
 requireThat(equal(claims.nonce,nonce)&&typeof claims.sub==='string'&&/^[\x21-\x7e]{1,255}$/.test(claims.sub));
 if(claims.at_hash!==undefined)requireThat(equal(claims.at_hash,digest(token.access_token).subarray(0,16).toString('base64url')));
 const address=email(claims.email),domain=address?.split('@').at(-1);
 // Для third-party email Google не гарантирует актуальное владение адресом.
 const authoritative=domain==='gmail.com'||(text(claims.hd,253)&&claims.hd.toLowerCase()===domain);
 return{issuer:'https://accounts.google.com',subject:claims.sub,email:address,emailVerified:claims.email_verified===true&&!!address&&!!authoritative,displayName:display(claims.name,'Пользователь Google')};
}

export async function exchangeOAuthProfile({provider,env,code,state,deviceId,codeVerifier,nonce,fetchImpl=fetch}){
 const config=configuration(env,provider);requireThat(config);
 requireThat(text(code,4096)&&text(state,128)&&/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)&&text(nonce,128));
 const body=new URLSearchParams({grant_type:'authorization_code',code,client_id:config.clientId,redirect_uri:oauthCallbackURL(provider),code_verifier:codeVerifier,...(config.clientSecret?{client_secret:config.clientSecret}:{})});
 let token;
 if(provider==='vk'){
  requireThat(text(deviceId,512));
  // Этот layout соответствует VKCOM SDK: приватные параметры query, code в POST body.
  const target=new URL(config.token);target.search=new URLSearchParams({grant_type:'authorization_code',redirect_uri:oauthCallbackURL(provider),client_id:config.clientId,code_verifier:codeVerifier,state,device_id:deviceId}).toString();
  token=await json(fetchImpl,target.href,{method:'POST',headers:formHeaders,body:new URLSearchParams({code}).toString()});
 }else token=await json(fetchImpl,config.token,{method:'POST',headers:formHeaders,body:body.toString()});
 validateToken(token);
 if(provider==='google')return googleProfile(token,config,nonce,fetchImpl);
 if(provider==='yandex'){
  const user=await json(fetchImpl,'https://login.yandex.ru/info?format=json',{method:'GET',headers:{accept:'application/json',authorization:'OAuth '+token.access_token}});
  requireThat(user.client_id===config.clientId);
  const address=email(user.default_email);
  return{issuer:'https://login.yandex.ru',subject:subject(user.id),email:address,emailVerified:authoritativeYandexEmail(user,address),displayName:display(user.real_name||user.display_name||user.login,'Пользователь Яндекс')};
 }
 requireThat(equal(token.state,state));
 const tokenSubject=typeof token.user_id==='number'&&Number.isSafeInteger(token.user_id)&&token.user_id>0?String(token.user_id):subject(token.user_id);
 const userInfoURL=new URL('https://id.vk.ru/oauth2/user_info');userInfoURL.search=new URLSearchParams({client_id:config.clientId}).toString();
 const data=await json(fetchImpl,userInfoURL.href,{method:'POST',headers:formHeaders,body:new URLSearchParams({access_token:token.access_token}).toString()});
 requireThat(plain(data.user)&&subject(data.user.user_id)===tokenSubject);
 return{issuer:'https://id.vk.ru',subject:tokenSubject,email:email(data.user.email),emailVerified:false,displayName:display([data.user.first_name,data.user.last_name].filter(x=>typeof x==='string').join(' '),'Пользователь VK')};
}
