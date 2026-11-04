// SESSION-REMEMBER-01: доменное ядро, НЕ подключено к публичным/внутренним маршрутам.
// Только сервер, только после отдельного подписанного ingress proof и активации feature flag.
// Никакие значения с суффиксом Secret/Cookie нельзя логировать или отправлять в frontend JSON.
export const REMEMBER_ABSOLUTE_MS=30*24*60*60*1000;
export const REMEMBER_RETRY_WINDOW_MS=5000;
export const REMEMBER_SESSION_IDLE_MS=30*60*1000;
export const REMEMBER_SESSION_ABSOLUTE_MS=12*60*60*1000;
const textEncoder=new TextEncoder();
const UUID='[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}';
const tokenRE=new RegExp('^nrd_('+UUID+')\\.([A-Za-z0-9_-]{43})$');
const validHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const validAccountId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
const reject=code=>Object.assign(new Error(code),{code});
const asISO=value=>new Date(value).toISOString();
export const tokenParts=raw=>{
 if(typeof raw!=='string'||raw.length>160)return null;
 const match=tokenRE.exec(raw);
 return match?{grantId:match[1],opaque:match[2]}:null;
};
export async function digestSecret(raw){
 const bytes=await crypto.subtle.digest('SHA-256',textEncoder.encode(raw));
 return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}
function sameHash(a,b){
 if(!validHash(a)||!validHash(b))return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
const newRandom=()=>{
 const bytes=crypto.getRandomValues(new Uint8Array(32));
 // Base64url, одинаковый формат для D1/Worker/Node. Не выводить наружу кроме Set-Cookie.
 return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
};
const currentEligibility=(grant,authority)=>
 authority?.accountStatus==='active'&&authority?.deviceStatus==='active'&&
 authority?.loginMethodStatus==='active'&&authority?.alphaAllowed===true&&
 authority.accountId===grant.accountId&&authority.deviceId===grant.deviceId&&
 authority.loginMethodId===grant.loginMethodId;
/**
 * repository контракт только SERVER-SIDE:
 * createGrant(row) — atomic insert + eligibility gate;
 * getGrant(id), getCurrentAuthority(grant), spentTokenStatus(id,hash);
 * atomicRotateAndCreateSession(args) — ОДНА D1 transaction с CAS + session insert;
 * revokeGrant(id,reason) — atomic revoke + все remembered sessions данного grant;
 * revokeAllForAccount(accountId,reason) — atomic batch.
 * Нельзя использовать in-memory mock в production.
 */
export function createRememberDeviceCore({repository,clock=()=>Date.now(),random=newRandom,uuid=()=>crypto.randomUUID()}={}){
 if(!repository)throw reject('REMEMBER_REPOSITORY_REQUIRED');
 const now=()=>{const value=clock();if(!Number.isSafeInteger(value)||value<0)throw reject('REMEMBER_CLOCK_INVALID');return value};
 async function createGrant(proof){
  const time=now();
  if(!proof||proof.explicitOptIn!==true||proof.authStrength!=='account-method-v1'||
     proof.recentProof!==true||!validAccountId(proof.accountId)||
     typeof proof.deviceId!=='string'||!proof.deviceId||
     typeof proof.loginMethodId!=='string'||!proof.loginMethodId||!validHash(proof.sessionHash))throw reject('FRESH_PROOF_REQUIRED');
  const id=uuid(),raw='nrd_'+id+'.'+random(),parts=tokenParts(raw);
  if(!parts)throw reject('REMEMBER_ENTROPY_INVALID');
  const row={id,accountId:proof.accountId,deviceId:proof.deviceId,loginMethodId:proof.loginMethodId,
   currentHash:await digestSecret(raw),generation:1,status:'active',
   createdAt:asISO(time),expiresAt:asISO(time+REMEMBER_ABSOLUTE_MS),lastRotatedAt:asISO(time)};
  if(!await repository.createGrant(row,proof))throw reject('REMEMBER_CREATE_REJECTED');
  return {kind:'issued',rememberCookieValue:raw,expiresAt:row.expiresAt};
 }
 async function renew(raw){
  const time=now(),parts=tokenParts(raw);if(!parts)return {kind:'reauth'};
  const row=await repository.getGrant(parts.grantId);
  if(!row||row.status!=='active'||Date.parse(row.expiresAt)<=time)return {kind:'reauth'};
  const hash=await digestSecret(raw);
  if(!sameHash(row.currentHash,hash)){
   const spent=await repository.spentTokenStatus(row.id,hash);
   if(!spent)return {kind:'reauth'}; // случайный hash не должен отзываться за чужую семью
   if(time-Date.parse(spent.usedAt)<=REMEMBER_RETRY_WINDOW_MS)return {kind:'wait-for-other-tab'};
   await repository.revokeGrant(row.id,'remember-replay');return {kind:'reauth'};
  }
  const authority=await repository.getCurrentAuthority(row);
  if(!currentEligibility(row,authority)){
   await repository.revokeGrant(row.id,'remember-authority-lost');return {kind:'reauth'};
  }
  const newRemember='nrd_'+row.id+'.'+random(),sessionSecret='nxs_'+random();
  if(!tokenParts(newRemember)||!/^[A-Za-z0-9_-]{43}$/.test(sessionSecret.slice(4)))throw reject('REMEMBER_ENTROPY_INVALID');
  const issue={grantId:row.id,accountId:row.accountId,deviceId:row.deviceId,
   loginMethodId:row.loginMethodId,expectedHash:hash,nextHash:await digestSecret(newRemember),
   nextGeneration:row.generation+1,rotatedAt:asISO(time),grantExpiresAt:row.expiresAt,
   sessionId:uuid(),sessionHash:await digestSecret(sessionSecret),
   sessionIdleExpiresAt:asISO(time+REMEMBER_SESSION_IDLE_MS),
   sessionAbsoluteExpiresAt:asISO(time+REMEMBER_SESSION_ABSOLUTE_MS),
   // Важно: понижен до remembered-device-v1; 5-min step-up запрещён.
   sessionAuthStrength:'remembered-device-v1'};
  const applied=await repository.atomicRotateAndCreateSession(issue);
  if(!applied)return {kind:'retry-or-reauth'}; // CAS не даст две сессии на один токен
  return {kind:'renewed',rememberCookieValue:newRemember,sessionCookieValue:sessionSecret,
   expiresAt:row.expiresAt};
 }
 async function revokeByCookie(raw){
  const parts=tokenParts(raw);if(!parts)return false;
  const row=await repository.getGrant(parts.grantId);
  if(!row)return false;
  const hash=await digestSecret(raw);
  if(!sameHash(row.currentHash,hash))return false;
  return Boolean(await repository.revokeGrant(row.id,'user-logout'));
 }
 async function revokeAll(proof){
  if(!proof||!validAccountId(proof.accountId)||proof.recentProof!==true||
    proof.authStrength!=='account-method-v1')throw reject('FRESH_PROOF_REQUIRED');
  return repository.revokeAllForAccount(proof.accountId,'user-logout-all');
 }
 return Object.freeze({createGrant,renew,revokeByCookie,revokeAll});
}
