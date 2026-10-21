import assert from 'node:assert/strict';
import {SERVER_ACCOUNT_ORIGIN,isServerAccountOrigin,serverAccountURL} from '../core/server-account-origin.js';
const prior=globalThis.location;
try{
 for(const origin of ['https://qsqgjhngyt-maker.github.io','https://foreign.invalid','http://localhost:8080']){
  globalThis.location={origin};
  assert.equal(isServerAccountOrigin(),false);
  const c=await import('../core/ui1a-release-contracts.js?origin='+encodeURIComponent(origin));
  assert.equal(c.RELEASE_CONTRACTS.serverPasskeyAccess,false);
  assert.equal(c.RELEASE_CONTRACTS.serverFeedback,false);
 }
 globalThis.location={origin:SERVER_ACCOUNT_ORIGIN};
 const c=await import('../core/ui1a-release-contracts.js?origin=server');
 assert.equal(c.RELEASE_CONTRACTS.serverPasskeyAccess,true);assert.equal(c.RELEASE_CONTRACTS.serverFeedback,true);assert.equal(c.RELEASE_CONTRACTS.pwa,true);
 for(const view of ['account','feedback','reviews','feedback-admin','access'])assert.equal(new URL(serverAccountURL(view)).origin,SERVER_ACCOUNT_ORIGIN);
 for(const view of ['https://foreign.invalid','javascript:alert(1)','../api/v2/account'])assert.throws(()=>serverAccountURL(view),TypeError);
 console.log('SERVER_ACCOUNT_ORIGIN_PASS: foreign/static origins cannot enable credential transports; fixed same-origin destinations');
}finally{if(prior===undefined)delete globalThis.location;else globalThis.location=prior}
