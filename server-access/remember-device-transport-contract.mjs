// P1A: UNWIRED, feature disabled. Shared internal transport shape only.
// Raw remember/session credentials MUST remain private BFF <-> Worker <-> Set-Cookie.
export const REMEMBER_INTERNAL_PATH='/api/v2/account/internal/remember';
export const REMEMBER_ROUTES=Object.freeze({
  '/api/v2/account/remember/enroll':'enroll',
  '/api/v2/account/remember/renew':'renew',
  '/api/v2/account/remember/revoke':'revoke'
});
export const REMEMBER_COOKIE='__Host-nexus_remember';
export const SESSION_COOKIE='__Host-nexus_session';
export const REMEMBER_MAX_AGE=2592000; // 30 days, absolute, not sliding
export const REMEMBER_RPC_MAX_BYTES=800;
const uuid='[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}';
export const validRememberToken=value=>typeof value==='string'&&new RegExp('^nrd_'+uuid+'\\.[A-Za-z0-9_-]{43}$').test(value);
export const validSessionToken=value=>typeof value==='string'&&/^nxs_[A-Za-z0-9_-]{43}$/.test(value);
export const validRpcInput=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
 Object.keys(value).sort().join(',')==='action,explicitOptIn,rememberCookie,sessionCookie'&&
 ['enroll','renew','revoke'].includes(value.action)&&typeof value.explicitOptIn==='boolean'&&
 (value.sessionCookie===null||validSessionToken(value.sessionCookie))&&
 (value.rememberCookie===null||validRememberToken(value.rememberCookie))&&
 (value.action==='enroll'?value.explicitOptIn===true&&value.sessionCookie!==null&&value.rememberCookie===null:
 value.explicitOptIn===false&&value.rememberCookie!==null);
