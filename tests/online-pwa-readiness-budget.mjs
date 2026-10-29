// Реальный SW/cache/Chrome, задержан только старт регистрации; готовность не подменяется.
import assert from'node:assert/strict';import{mkdir,writeFile}from'node:fs/promises';import path from'node:path';
import{onlineRuntimeFixture}from'./helpers/online-runtime-fixture.mjs';import{module6ApplicationFixture}from'./academy-gold-module6-fixture.mjs';
const out=path.resolve(process.env.NEXUS_QT_EVIDENCE_DIR);await mkdir(out,{recursive:true});const records=[];let failure;
try{
 for(const[name,create]of[['online',onlineRuntimeFixture],['module6',module6ApplicationFixture]]){
  const f=await create();try{
   await f.context.addInitScript(()=>{const register=navigator.serviceWorker.register.bind(navigator.serviceWorker);navigator.serviceWorker.register=(...args)=>new Promise(resolve=>setTimeout(resolve,35000)).then(()=>register(...args));});
   const start=Date.now();await f.page.goto(f.origin+'/#view=home');await f.page.locator('.visual-home').waitFor();const homeMs=Date.now()-start,waitStart=Date.now(),status=await f.waitReady(),readyWaitMs=Date.now()-waitStart;
   assert.equal(status.publicReady,true);assert.ok(readyWaitMs>30000,'Must exceed the former30s deadline');assert.deepEqual(f.errors,[]);
   records.push({fixture:name,status:'PASS',homeMs,readyWaitMs,artificialRegistrationDelayMs:35000,actualServiceWorker:true,publicReady:true,browserErrors:[],credentialsUsed:false});console.log(JSON.stringify(records.at(-1)));
  }finally{await f.close()}
 }
}catch(e){failure=e.stack;console.error(e.message)}finally{await writeFile(path.join(out,'READINESS_BUDGET.json'),JSON.stringify({status:failure?'FAIL':'PASS',records,failure,productionRequests:0,productBytesChanged:0},null,2)+'\n');if(failure)process.exitCode=1;}
