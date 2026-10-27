import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{RUNTIME_GRAPH_ID}from'../pwa/runtime-manifest.js';
const oldGraph='3eb53dcb260f33d040d58e304ae5922c5d842ef3164e3e4a63bae940d3a1efe0',protocol='nexus-verified-public-v1';
async function client(graph){const source=(await readFile(new URL('../pwa/client.js',import.meta.url),'utf8')).replace("import {RUNTIME_GRAPH_ID} from './runtime-manifest.js';",'const RUNTIME_GRAPH_ID='+JSON.stringify(graph)+';');return import('data:text/javascript;base64,'+Buffer.from(source+'\n// '+crypto.randomUUID()).toString('base64'));}
const controller=value=>({postMessage(_request,ports){ports[0].postMessage(value);ports[0].close();}});
test('Account transport принимает проверенный public policy независимо от версии C++ graph: обе стороны перехода',async()=>{
 for(const[expected,actual]of[[oldGraph,RUNTIME_GRAPH_ID],[RUNTIME_GRAPH_ID,oldGraph]]){
  const c=await client(expected),proof={protocol,graphId:actual,publicReady:true};let updates=0;
  const nav={serviceWorker:{controller:controller(proof),register:async()=>({update:async()=>{updates++;throw Error('UNEXPECTED_RUNTIME_UPDATE_ON_ACCOUNT_ENTRY')}})}};
  assert.deepEqual(await c.ensureSafeController({navigatorImpl:nav,locationImpl:{hostname:'synthetic.invalid'}}),proof);assert.equal(updates,0);
 }
});
test('Verified runtime сохраняет exact graph guard даже при корректном public policy',async()=>{
 const c=await client(RUNTIME_GRAPH_ID),old={protocol,graphId:oldGraph,publicReady:true},current={...old,graphId:RUNTIME_GRAPH_ID};let updates=0;
 const nav={serviceWorker:{controller:controller(old),register:async()=>({update:async()=>{updates++;nav.serviceWorker.controller=controller(current)}})}};
 assert.deepEqual(await c.ensureSafeController({navigatorImpl:nav,locationImpl:{hostname:'synthetic.invalid'},requireController:true}),current);assert.equal(updates,1);
});
test('Неверный protocol, незавершённые bytes и некорректный graph не дают Account transport',async()=>{
 for(const value of[{protocol:'legacy',graphId:RUNTIME_GRAPH_ID,publicReady:true},{protocol,graphId:RUNTIME_GRAPH_ID,publicReady:false},{protocol,graphId:'forged',publicReady:true},{protocol,publicReady:true}]){
  const c=await client(RUNTIME_GRAPH_ID),nav={serviceWorker:{controller:controller(value),register:async()=>{throw Error('EXPECTED_SAFE_UPDATE_FAILURE')}}};
  await assert.rejects(c.ensureSafeController({navigatorImpl:nav,locationImpl:{hostname:'synthetic.invalid'}}),/EXPECTED_SAFE_UPDATE_FAILURE/);
 }
});
