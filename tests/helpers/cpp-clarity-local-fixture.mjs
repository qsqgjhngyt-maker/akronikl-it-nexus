// Loopback only: no production hostname or owner browser profile is used.
import path from 'node:path';
import {nativeOfflineFixture} from './native-offline-fixture.mjs';
import {bindRuntimeTransport} from './runtime-transport.mjs';
export async function clarityLocalFixture(output){
 process.env.NEXUS_NATIVE_EVIDENCE=output;
 const f=await nativeOfflineFixture('cpp-clarity'),page=await f.launch(),phrase='Synthetic CPP clarity local phrase';
 await bindRuntimeTransport(f.context);
 await page.goto(f.origin+'/offline.html#view=home');await f.waitReady();
 const payload={schemaVersion:1,owner:{accountId:'synthetic-clarity',displayName:'Synthetic clarity'},projects:{},state:{courses:{cpp:{lessons:{'cpp.programming-process':{completed:true,quiz:1,attempts:[{synthetic:true,answer:1,revision:'earlier'}]}}}},skills:{}},base:{projects:{},state:{courses:{},skills:{}}}};
 const id=await page.evaluate(async({prefix,payload,phrase})=>{const{createVaultStore}=await import(prefix+'/pwa/local-vault.js'),s=await createVaultStore().create(payload,phrase),id=s.id;await s.lock();return id},{prefix:'/releases/'+f.generation,payload,phrase});
 await page.goto(f.origin+'/offline.html#copy='+id);await page.locator('#localPhrase').fill(phrase);await page.locator('#unlockLocal button').click();await page.locator('#psNewProject').waitFor();
 const read=()=>page.evaluate(async({prefix,id,phrase})=>{const s=await(await import(prefix+'/pwa/local-vault.js')).createVaultStore().unlock(id,phrase),payload=s.read();await s.lock();return payload},{prefix:'/releases/'+f.generation,id,phrase});
 const reopen=async lesson=>{await page.goto(f.origin+'/offline.html#copy='+id);await page.locator('#localPhrase').fill(phrase);await page.locator('#unlockLocal button').click();await page.locator('#psNewProject').waitFor();await page.evaluate(id=>{location.hash='#course=cpp&lesson='+id},lesson);await page.locator('#editor').waitFor()};
 return{...f,page,id,phrase,read,reopen,async close(){await f.finish({method:'Loopback synthetic local vault only; production network absent'})}};
}
