import assert from 'node:assert/strict';
import {accountClientFixture} from './helpers/account-client-fixture.mjs';
import {accountLocalStorage} from '../core/account-storage.js';
import {SERVER_ACCOUNT_ORIGIN} from '../core/server-account-origin.js';
import {identityV2UpgradeSessionToCookie,identityV2ClearFirstPartyCookie,identityV2CredentialState,identityV2CookieMarkerStorageKey,loadIdentityV2SessionCredential,saveIdentityV2SessionCredential,listIdentityV2Devices} from '../sync/identity-v2-client.js';
import {saveCloudflareSyncConfig} from '../sync/cloudflare-config.js';
import {createNexusBootstrap} from '../core/bootstrap.js';
const f=accountClientFixture('synthetic-cookie-client');f.verify();
assert.throws(()=>saveCloudflareSyncConfig({subjectId:'synthetic-foreign-account'}),{code:'ACCOUNT_SUBJECT_MISMATCH'});
assert.throws(()=>saveCloudflareSyncConfig({token:'nxk_SYNTHETIC'}),{code:'SEPARATE_CLOUD_CREDENTIAL_FORBIDDEN'});
const session='nxs_'+'SYNTHETIC'.repeat(5);saveIdentityV2SessionCredential(session);let calls=0;
globalThis.fetch=async(url,options={})=>{
 calls++;const path=new URL(url).pathname;
 if(path==='/api/v2/auth/capabilities')return Response.json({ok:true,cookieSessionEnabled:true});
 if(path==='/api/v2/session/cookie/upgrade'){
  assert.equal(options.credentials,'include');assert.equal(options.headers.authorization,'Bearer '+session);
  return Response.json({ok:true,cookieSession:true,clearBrowserSessionCredential:true});
 }
 if(path==='/api/v2/devices'){
  assert.equal(options.credentials,'include');assert.equal(options.headers.authorization,undefined);
  return Response.json({devices:[{id:'synthetic-device'}]});
 }
 throw Error('UNEXPECTED_REQUEST');
};
await identityV2UpgradeSessionToCookie();assert.equal(loadIdentityV2SessionCredential(),'');
assert.equal(accountLocalStorage().getItem(identityV2CookieMarkerStorageKey()),SERVER_ACCOUNT_ORIGIN);
assert.equal(f.local.getItem(identityV2CookieMarkerStorageKey()),null);assert.equal(identityV2CredentialState().mode,'nexus-cookie');
assert.equal((await listIdentityV2Devices()).devices[0].id,'synthetic-device');
calls=0;globalThis.fetch=async()=>{calls++;return Response.json({error:{code:'INVALID_SESSION'}},{status:401})};
await assert.rejects(listIdentityV2Devices(),e=>e.status===401);assert.equal(calls,1);
assert.equal(accountLocalStorage().getItem(identityV2CookieMarkerStorageKey()),null);
// A forged local marker is never server proof for the protected application gate.
accountLocalStorage().setItem(identityV2CookieMarkerStorageKey(),SERVER_ACCOUNT_ORIGIN);
const bootstrap=createNexusBootstrap({fetchImpl:async()=>Response.json({error:{code:'INVALID_SESSION'}},{status:401})});
assert.equal(await bootstrap.readVerifiedSession(),null);
globalThis.fetch=async(url,options)=>{
 assert.equal(new URL(url).pathname,'/api/v2/session/cookie/clear');assert.equal(options.method,'POST');assert.equal(options.credentials,'include');
 return Response.json({ok:true,cookieCleared:true});
};
assert.equal((await identityV2ClearFirstPartyCookie()).ok,true);assert.equal(accountLocalStorage().getItem(identityV2CookieMarkerStorageKey()),null);
console.log('FIRST_PARTY_COOKIE_CLIENT_PASS: scoped upgrade/clear; forged marker rejected; no legacy fallback');
