import test from 'node:test';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {startCloudSettingsServer} from '../tools/qa-akronikl/cloud-settings-gateway.mjs';import {createCloudSettingsBroker} from '../akronikl/tutor/cloud-settings-broker.js';import {createModelConnections} from '../akronikl/connections/controller.js';import {cloudPreferences} from '../akronikl/connections/preferences.js';
const root=fileURLToPath(new URL('../',import.meta.url)),choice={providerId:'qwen',modelId:'qwen3.8-max',options:{region:'singapore',workspaceId:''}},key='SYNTHETIC_RESUME_KEY_ONLY_20261029',tick=()=>new Promise(r=>setImmediate(r));
test('resume reuses only the same verified live connection and never probes or replaces its cookie',async()=>{
 let calls=0,clock=Date.now();const s=await startCloudSettingsServer({root,personalPreview:true,now:()=>clock,ttlMs:1000,createAdapter:()=>({async complete(){calls++;return{response:{answer:'SYNTHETIC',citations:['S1']}}},dispose(){}})});
 const post=(data,cookie='')=>fetch(s.origin+'/api/akronikl/cloud/connect',{method:'POST',headers:{origin:s.origin,'content-type':'application/json',cookie},body:JSON.stringify(data)});
 try{const first=await post({...choice,apiKey:key});assert.equal(first.status,200);const cookie=first.headers.get('set-cookie').split(';')[0],v=await first.json();
  for(const change of [{modelId:'other'}, {options:{region:'beijing',workspaceId:''}}])assert.equal((await post({...choice,...change,resume:true},cookie)).status,401);
  assert.equal((await post({...choice,resume:true,apiKey:key},cookie)).status,400);
  const r=await post({...choice,resume:true},cookie);assert.equal(r.status,200);assert.equal(r.headers.get('set-cookie'),null);assert.equal((await r.json()).connectionVersion,v.connectionVersion);assert.equal(calls,1);
  clock+=1001;assert.equal((await post({...choice,resume:true},cookie)).status,401);assert.equal(calls,1);
 }finally{await s.close()}
});
test('client suspend revokes the old engine locally; resume has no key payload or automatic paid fallback',async()=>{
 const requests=[],win=new EventTarget();const broker=createCloudSettingsBroker({origin:'http://127.0.0.1:23456',windowRef:win,fetchResource:async(url,init)=>{requests.push({url,body:JSON.parse(init.body)});return Response.json(url.endsWith('/disconnect')?{disconnected:true}:{connected:true,verified:true,connectionVersion:'SYNTHETIC_RESUME_VERSION_12345',providerId:'qwen',modelId:choice.modelId})}});
 const engine=await broker.resume(choice);assert.deepEqual(requests[0].body,{...choice,resume:true});await engine.suspend();win.dispatchEvent(new Event('pagehide'));assert.equal(requests.length,1);await assert.rejects(engine.generate({}),/CLOUD_BUSY/);
 const newer=await broker.resume(choice);await newer.dispose();assert.equal(requests.filter(x=>x.url.endsWith('/disconnect')).length,1);
 let failedCalls=0;const failed=createCloudSettingsBroker({origin:'http://127.0.0.1:23456',fetchResource:async()=>{failedCalls++;return Response.json({code:'CLOUD_NOT_CONNECTED'},{status:401})}});await assert.rejects(failed.resume(choice),/CLOUD_NOT_CONNECTED/);assert.equal(failedCalls,1);
});
test('ordinary close can suspend a cloud lease; explicit disconnect and account loss revoke it',async()=>{
 for(const mode of ['close','disconnect','account-loss']){let suspended=0,disposed=0,active=true;const c=createModelConnections({isCurrent:()=>active,loadLocal:async()=>{},cloudBroker:{settings:true,inspect:async()=>({code:'CLOUD_READY',readyToLoad:true}),connect:async()=>({kind:'cloud',transport:'trusted-broker',connectionVerified:true,modelId:choice.modelId,generate:async()=>({}),suspend(){suspended++},dispose(){disposed++}})}});c.configureCloud(choice);c.select('external');await c.connect({apiKey:key});const lease=c.lease();if(mode==='close')c.dispose({retainCloudConnection:true});else if(mode==='disconnect'){c.disconnect();c.dispose()}else{active=false;c.dispose({retainCloudConnection:true})}await tick();assert.equal(suspended,mode==='close'?1:0);assert.equal(disposed,mode==='close'?0:1);await assert.rejects(lease.generate({}),/EXPIRED/);}
});
test('model mode and chat preference accept old records and reject credentials or invalid modes',()=>{
 const p=cloudPreferences();assert.equal(p.modelProfile,'sources');assert.equal(p.generalChat,true);assert.equal(cloudPreferences({...p,modelProfile:'external',generalChat:false}).modelProfile,'external');for(const extra of [{modelProfile:'admin'},{generalChat:'true'},{apiKey:key}])assert.throws(()=>cloudPreferences({...p,...extra}));
});
test('a late resume after ordinary close cannot disconnect the same lease reopened by a new panel',async()=>{
 let release,entered,suspended=0,disconnected=0;const gate=new Promise(r=>release=r),ready=new Promise(r=>entered=r),engine=()=>({kind:'cloud',transport:'trusted-broker',connectionVerified:true,modelId:choice.modelId,generate:async()=>({}),suspend(){suspended++},dispose(){disconnected++}});
 const c=createModelConnections({isCurrent:()=>true,loadLocal:async()=>{},cloudBroker:{settings:true,inspect:async()=>({code:'CLOUD_READY',readyToLoad:true}),connect:async()=>{throw Error('PAID_CONNECT_FORBIDDEN')},async resume(){entered();await gate;return engine()}}});c.configureCloud(choice);c.select('external');const task=c.resume();await ready;c.dispose({retainCloudConnection:true});release();await task;await tick();await tick();assert.equal(suspended,1);assert.equal(disconnected,0);assert.equal(c.snapshot().phase,'closed');
});
