// Парный лабораторный benchmark; не измерение устройств владельца или production.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {authenticatedFixture} from './helpers/akronikl-authenticated-fixture.mjs';
const out=path.resolve(process.env.NEXUS_AKRONIKL_EVIDENCE);await mkdir(out,{recursive:true});
const samples=Number(process.env.NEXUS_BENCH_SAMPLES||12);assert.ok(Number.isInteger(samples)&&samples>=6&&samples<=30);
const rows=[],errors=[];let fatal=null;
async function measureVariant(variant,pair){
 const f=await authenticatedFixture(path.resolve(variant==='baseline'?process.env.NEXUS_BASELINE_DIR:process.env.NEXUS_FRONTEND_DIR));let page;
 try{
  page=await f.launch();
  await page.addInitScript(()=>{
   localStorage.setItem('akronikl:it-nexus:prefs:v1',JSON.stringify({uiLocale:'ru',mentorLocale:'ru',courseLocale:'ru',effectsQuality:'off'}));
   const observer=new MutationObserver(()=>{if(!document.querySelector('.visual-home')||window.__qaArmed)return;window.__qaArmed=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__qaHomeReady=performance.now();observer.disconnect()}))});
   observer.observe(document,{childList:true,subtree:true});
  });
  await f.enrollOwner(page);await page.waitForFunction(()=>Number.isFinite(window.__qaHomeReady));
  const metrics=await f.context.newCDPSession(page);await metrics.send('Performance.enable');
  const recordBoot=async(temperature)=>{
   const data=await page.evaluate(()=>({readyMs:window.__qaHomeReady,resources:performance.getEntriesByType('resource').filter(e=>e.responseEnd<=window.__qaHomeReady).map(e=>({path:new URL(e.name).pathname,transferBytes:e.transferSize,decodedBytes:e.decodedBodySize}))}));
   const current=(await metrics.send('Performance.getMetrics')).metrics;const get=n=>current.find(m=>m.name===n)?.value??null;
   rows.push({pair,variant,operation:'startup',temperature,ms:data.readyMs,transferBytes:data.resources.reduce((s,r)=>s+r.transferBytes,0),decodedBytes:data.resources.reduce((s,r)=>s+r.decodedBytes,0),resourceCount:data.resources.length,assistantHeavyRequests:data.resources.filter(r=>/\/akronikl\/(core|ui|knowledge)\//.test(r.path)).length,jsHeapUsedBytes:get('JSHeapUsedSize'),domNodes:get('Nodes')});
  };
  await recordBoot('fresh-profile-first-app-document');await page.reload();await page.waitForFunction(()=>Number.isFinite(window.__qaHomeReady));await recordBoot('same-profile-reload');
  const nav=async(hash,selector)=>page.evaluate(({hash,selector})=>new Promise((resolve,reject)=>{const start=performance.now();location.hash=hash;const tick=()=>{if(document.querySelector(selector)&&!document.querySelector('#boot-status'))return requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-start)));if(performance.now()-start>15000)return reject(Error('BENCH_ROUTE_TIMEOUT'));requestAnimationFrame(tick)};requestAnimationFrame(tick)}),{hash,selector});
  for(const temperature of ['first-route','repeat-route']){
   const ms=await nav('#course=cpp&lesson=cpp.programming-process','#editor');rows.push({pair,variant,operation:'lesson-navigation',temperature,ms});
   await nav('#view=home','.visual-home');
  }
  if(variant==='candidate'){
   await nav('#view=akronikl','[data-akronikl-open]');
   for(const temperature of ['first-operation','repeat-operation']){
    const openMs=await page.evaluate(()=>new Promise((resolve,reject)=>{const start=performance.now();document.querySelector('[data-akronikl-open]').click();const tick=()=>{const panel=document.querySelector('[data-akronikl-panel]');if(panel?.open&&getComputedStyle(panel).maxHeight!=='none')return requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-start)));if(performance.now()-start>15000)return reject(Error('BENCH_OPEN_TIMEOUT'));requestAnimationFrame(tick)};requestAnimationFrame(tick)}));
    rows.push({pair,variant,operation:'assistant-open',temperature,ms:openMs});
    const searchMs=await page.evaluate(()=>new Promise((resolve,reject)=>{const p=document.querySelector('[data-akronikl-panel]'),input=p.querySelector('input[type=search]');input.value='указатели';input.dispatchEvent(new Event('input',{bubbles:true}));const start=performance.now();p.querySelector('form').requestSubmit();const tick=()=>{if(p.querySelector('article'))return requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-start)));if(performance.now()-start>15000)return reject(Error('BENCH_SEARCH_TIMEOUT'));requestAnimationFrame(tick)};requestAnimationFrame(tick)}));
    rows.push({pair,variant,operation:'assistant-search',temperature,ms:searchMs});await page.keyboard.press('Escape');
   }
   await page.locator('[data-akronikl-open]').click();await page.locator('[data-akronikl-panel] input[type=search]').fill('указатели');await page.locator('[data-akronikl-panel] button[type=submit]').click();await page.locator('[data-akronikl-panel] article').first().waitFor();
   const ms=await page.evaluate(()=>new Promise((resolve,reject)=>{const start=performance.now();document.querySelector('[data-akronikl-panel] article button').click();const tick=()=>{if(document.querySelector('#editor')&&!document.querySelector('[data-akronikl-panel]'))return requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-start)));if(performance.now()-start>15000)return reject(Error('BENCH_TARGET_TIMEOUT'));requestAnimationFrame(tick)};requestAnimationFrame(tick)}));
   rows.push({pair,variant,operation:'assistant-to-lesson',temperature:'prepared-index',ms});
  }
  assert.deepEqual(f.errors,[]);return f.context.browser().version();
 }finally{await f.close()}
}
let browser;
try{for(let pair=0;pair<samples;pair++){for(const variant of pair%2?['candidate','baseline']:['baseline','candidate']){browser=await measureVariant(variant,pair);console.log('PASS sample '+pair+' '+variant)}}}catch(e){fatal={name:e.name,message:e.message};console.error(e);process.exitCode=1}
const groups={};for(const r of rows){const key=[r.variant,r.operation,r.temperature].join('|');(groups[key]??=[]).push(r)}
const percentile=(xs,p)=>[...xs].sort((a,b)=>a-b)[Math.max(0,Math.ceil(xs.length*p)-1)];
const summary=Object.fromEntries(Object.entries(groups).map(([key,rs])=>[key,{n:rs.length,p50Ms:percentile(rs.map(r=>r.ms),.5),p95Ms:percentile(rs.map(r=>r.ms),.95),minMs:Math.min(...rs.map(r=>r.ms)),maxMs:Math.max(...rs.map(r=>r.ms)),...('transferBytes'in rs[0]?{medianTransferBytes:percentile(rs.map(r=>r.transferBytes),.5),medianHeapUsedBytes:percentile(rs.map(r=>r.jsHeapUsedBytes),.5)}:{})}]));
await writeFile(path.join(out,'PERFORMANCE.json'),JSON.stringify({status:fatal?'FAIL':'PASS',fatal,sourceCommit:process.env.NEXUS_SOURCE_COMMIT,baselineCommit:'065606a788198045cadf250fea663246ddbb2d56',samplesPerVariant:samples,order:'alternating AB/BA',browser,node:process.version,summary,rows,definitions:{cold:'fresh disposable profile; first application document after real test-key registration; excludes registration ceremony',warm:'same profile, immediate document reload; OS cache not reset',ready:'home DOM + two animation frames',navigation:'hash change + target editor DOM + two animation frames',resources:'ResourceTiming completed by home-ready; not full process RSS',memory:'CDP JSHeapUsedSize without forced GC',effects:'off on both variants',baselineAssistant:'NOT_APPLICABLE: assistant absent',network:'loopback HTTPS, real isolated BFF/Worker, SQLite instead of D1'},limitations:['CI runner, not owner devices','p95 on small pilot sample is unstable','no production network latency','not a statistically powered non-inferiority trial'],productionLive:false,physicalDevices:false},null,2)+'\n');
