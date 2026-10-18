import assert from 'node:assert/strict';
import {RELEASE_CONTRACTS} from '../core/ui1a-release-contracts.js';
import {fetchPublicJSON} from '../core/offline-assets.js';
import {feedbackApi} from '../feedback/client.js';
assert.deepEqual(RELEASE_CONTRACTS,{pwa:false,serverPasskeyAccess:false,serverFeedback:false});
let network=0,cacheReads=0;
const oldFetch=globalThis.fetch,oldCaches=globalThis.caches;
globalThis.caches={match(){cacheReads++;return new Response('private canary',{headers:{'content-type':'application/json'}})}};
globalThis.fetch=async()=>{network++;throw Error('offline fixture')};
try{
 await assert.rejects(fetchPublicJSON('./courses/catalog.json'),/offline fixture/);
 assert.equal(cacheReads,0,'Старый cache не может выдать тело после network failure');
 for(const url of ['/api/v2/account','./courses/catalog.json?account=A','https://untrusted.invalid/courses/catalog.json'])await assert.rejects(fetchPublicJSON(url),TypeError);
 assert.equal(network,1,'Private/unknown запросы не проходят public adapter');
 for(const method of ['GET','POST'])await assert.rejects(feedbackApi('/api/v2/feedback/mine',{method,body:{text:'public fixture'}}),e=>e.code==='FEEDBACK_UNAVAILABLE');
 assert.equal(network,1,'Непринятый feedback contract не обращается к сети');
 assert.equal(cacheReads,0);
 console.log('UI1A_RELEASE_ISOLATION_PASS: cache replay=0, disabled transport writes=0');
}finally{globalThis.fetch=oldFetch;if(oldCaches===undefined)delete globalThis.caches;else globalThis.caches=oldCaches}
