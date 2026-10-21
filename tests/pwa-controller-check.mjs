import assert from 'node:assert/strict';
import {RUNTIME_GRAPH_ID} from '../pwa/runtime-manifest.js';
const module=()=>import('../pwa/client.js?fixture='+crypto.randomUUID());
const location={hostname:'synthetic.invalid'},good={protocol:'nexus-verified-public-v1',graphId:RUNTIME_GRAPH_ID,publicReady:true};
const controller=value=>({postMessage(message,ports){assert.equal(message.type,'nexus-pwa-status');ports[0].postMessage(value)}});
let checks=0;
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
await check('checking signal never grants control before final public byte verification',async()=>{
 const {ensureSafeController:ensure}=await module();let complete=false;
 const slow={postMessage(message,ports){ports[0].postMessage({type:'checking',protocol:good.protocol,graphId:RUNTIME_GRAPH_ID});setTimeout(()=>{complete=true;ports[0].postMessage(good)},20)}};
 const nav={serviceWorker:{controller:slow,register:async()=>({update:async()=>{}})}};
 const result=await ensure({navigatorImpl:nav,locationImpl:location});assert.equal(complete,true);assert.equal(result.publicReady,true);
});
await check('no SW cannot claim a verified runtime; credential transport has no cache interceptor',async()=>{
 const {ensureSafeController:ensure}=await module();assert.deepEqual(await ensure({navigatorImpl:{},locationImpl:location}),{controlled:false});
 await assert.rejects(ensure({navigatorImpl:{},locationImpl:location,requireController:true}),/VERIFIED_RUNTIME_CONTROLLER_REQUIRED/);
});
await check('fresh page installs at stable scope without holding account proof or forcing reload',async()=>{
 const {ensureSafeController:ensure}=await module();let registrations=0;
 const nav={serviceWorker:{controller:null,register:async(url,options)=>{registrations++;assert.equal(url,'/service-worker.js');assert.deepEqual(options,{scope:'/',updateViaCache:'none'});return {update:async()=>{}}}}};
 assert.deepEqual(await ensure({navigatorImpl:nav,locationImpl:location}),{controlled:false});assert.equal(registrations,1);
});
await check('legacy, forged protocol, wrong graph and incomplete generation require a safe takeover',async()=>{
 for(const old of [{protocol:'legacy'}, {...good,graphId:'forged'},{...good,publicReady:false}]){
  const {ensureSafeController:ensure}=await module();let waited=0,updates=0;
  const nav={serviceWorker:{controller:controller(old),register:async()=>({update:async()=>{updates++;nav.serviceWorker.controller=controller(good)}})}};
  assert.deepEqual(await ensure({navigatorImpl:nav,locationImpl:location,onWaiting:()=>waited++}),good);assert.equal(waited,1);assert.equal(updates,1);
 }
});
await check('migration failure rejects; no Boolean flag or protocol-only value can grant authority',async()=>{
 const {ensureSafeController:ensure}=await module();
 await assert.rejects(ensure({navigatorImpl:{serviceWorker:{controller:controller({...good,publicReady:false}),register:async()=>{throw Error('SYNTHETIC_INSTALL_FAILURE')}}},locationImpl:location}),/SYNTHETIC_INSTALL_FAILURE/);
});
console.log(JSON.stringify({status:'PASS',checks,synthetic:true,networkRequests:0}));
