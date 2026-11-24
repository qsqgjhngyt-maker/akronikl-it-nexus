
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const repo=process.env.NEXUS_REPO;
const frontend=process.env.NEXUS_FRONTEND_DIR;
const output=process.env.NEXUS_PERF_REPORT;
assert.ok(repo && frontend && output);
const build=await readFile(path.join(frontend,'BUILD_MANIFEST.json'));
const {onlineRuntimeFixture}=await import(pathToFileURL(path.join(repo,'tests/helpers/online-runtime-fixture.mjs')));
process.env.NEXUS_JSCPP_FIXTURE ||= path.join(process.env.NEXUS_PINNED_RUNTIME_DIR,'jscpp.js');
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS='1';

const profiles=[
  {name:'desktop',width:1366,height:860,cpu:1,rt:0,download:-1,upload:-1},
  {name:'mobile-390',width:390,height:844,cpu:3,rt:80,download:625000,upload:200000},
  {name:'mobile-320',width:320,height:760,cpu:3,rt:80,download:625000,upload:200000},
];
const repeats=Number(process.env.NEXUS_PERF_REPEATS || 3);
const only=process.env.NEXUS_PERF_PROFILE;
const routes=[
  ['academy','#view=academy','[data-visual-academy]'],
  ['codeHub','#view=programming','.code-hub'],
  ['lesson','#course=c&lesson=c.array-bounds&stage=explanation&locale=ru','[data-c-course] [data-c-heading]'],
  ['codeStudio','#view=code-studio','[data-code-studio-home]'],
  ['projects','#view=projects','[data-studio-library]'],
  ['blog','#view=blog','[data-blog-feed],.blog-snapshot,.blog-card'],
  ['account','#view=account','.account-grid'],
  ['admin','#view=admin','[data-administration]'],
];
const sampleRows=[];
const measureFailures=[];
const round=value=>typeof value==='number' ? Math.round(value*10)/10 : null;

function installObservers() {
  performance.setResourceTimingBufferSize(3000);
  const metrics={lcp:[],cls:[],long:[],event:[]};
  window.__nexusPerf=metrics;
  for (const [type,key] of [['largest-contentful-paint','lcp'],['layout-shift','cls'],['longtask','long'],['event','event']]) {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
    new PerformanceObserver(list=>{
      for(const entry of list.getEntries()) metrics[key].push({
        start:entry.startTime,duration:entry.duration,value:entry.value,input:entry.hadRecentInput,
      });
    }).observe({type,buffered:true,...(key==='event'?{durationThreshold:16}:{})});
  }
}
async function painted(page) {
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function bytesAndMetrics(page,cdp,from,to) {
  const result=await page.evaluate(({from,to})=>{
    const active=e=>e.startTime>=from&&e.startTime<=to;
    const metrics=window.__nexusPerf;
    const resources=performance.getEntriesByType('resource').filter(active);
    const count=(p)=>resources.filter(p).length;
    const sum=(selector)=>resources.reduce((total,resource)=>total+(selector(resource)||0),0);
    const sameOrigin=e=>new URL(e.name).origin===location.origin;
    const network=resources.filter(sameOrigin);
    return {
      fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,
      lcp:metrics.lcp.filter(active).at(-1)?.start??null,
      cls:metrics.cls.filter(e=>active(e)&&!e.input).reduce((n,e)=>n+(e.value??0),0),
      longTasks:metrics.long.filter(active).length,
      longTaskMs:metrics.long.filter(active).reduce((n,e)=>n+e.duration,0),
      eventMax:Math.max(0,...metrics.event.filter(active).map(e=>e.duration)),
      requests:network.length,
      transferred:sum(e=>sameOrigin(e)?e.transferSize:0),
      encoded:sum(e=>sameOrigin(e)?e.encodedBodySize:0),
      js:sum(e=>sameOrigin(e)&&/\.(?:m?js)(?:\?|$)/.test(e.name)?e.encodedBodySize:0),
      images:count(e=>sameOrigin(e)&&e.initiatorType==='img'),
      api:count(e=>sameOrigin(e)&&new URL(e.name).pathname.startsWith('/api/')),
      runtime:network.filter(e=>/\/(?:runtime-packs|sandbox\/qt|clang)\//.test(new URL(e.name).pathname)).map(e=>new URL(e.name).pathname),
      css:count(e=>sameOrigin(e)&&e.initiatorType==='link'&&new URL(e.name).pathname.endsWith('.css')),
      fonts:count(e=>sameOrigin(e)&&/\.woff2?$/.test(new URL(e.name).pathname)),
    };
  },{from,to});
  const {metrics}=await cdp.send('Performance.getMetrics');
  return {...result,lcp:round(result.lcp),fcp:round(result.fcp),cls:Math.round(result.cls*10000)/10000,longTaskMs:round(result.longTaskMs),
    jsHeapUsed:metrics.find(entry=>entry.name==='JSHeapUsedSize')?.value??null};
}
async function home(page,cdp,origin,warm) {
  if (warm) {
    await page.evaluate(()=>{location.hash='view=home';});
    await page.reload({waitUntil:'domcontentloaded'});
  } else await page.goto(origin+'/#view=home',{waitUntil:'domcontentloaded'});
  await page.locator('#app .visual-home').waitFor({timeout:25000});
  await painted(page);
  const ready=await page.evaluate(()=>performance.now());
  await page.waitForTimeout(450);
  const snapshot=await page.evaluate(()=>performance.now());
  return {readyMs:round(ready),...await bytesAndMetrics(page,cdp,0,snapshot)};
}
async function routeSample(page,cdp,[name,hash,selector]) {
  const start=await page.evaluate(hash=>{
    const time=performance.now();
    location.hash=hash;
    return time;
  },hash);
  await page.locator('#app '+selector.split(',').join(',#app ')).first().waitFor({timeout:16000});
  await painted(page);
  const done=await page.evaluate(()=>performance.now());
  const metrics=await bytesAndMetrics(page,cdp,start,done);
  delete metrics.fcp;
  delete metrics.lcp;
  return {name,readyMs:round(done-start),...metrics};
}
async function measure(profile,iteration) {
  const fixture=await onlineRuntimeFixture();
  const {page,origin}=fixture;
  let phase='init';
  try {
    await page.setViewportSize({width:profile.width,height:profile.height});
    await page.addInitScript(installObservers);
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Performance.enable');
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile.cpu});
    if(profile.rt) await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:profile.rt,downloadThroughput:profile.download,uploadThroughput:profile.upload});
    phase='cold home';
    const cold=await home(page,cdp,origin,false);
    // Keep public-pack preparation out of route timings while storing its duration.
    phase='verified PWA';
    const start=await page.evaluate(()=>performance.now());
    await fixture.waitReady();
    const pwaWait=await page.evaluate(start=>performance.now()-start,start);
    phase='warm home';
    const warm=await home(page,cdp,origin,true);
    const navigation=[];
    for(const route of routes) {
      phase=route[0];
      try { navigation.push(await routeSample(page,cdp,route)); }
      catch(error) { measureFailures.push({profile:profile.name,iteration,phase,error:String(error.message).split('\n')[0]}); }
    }
    sampleRows.push({profile:profile.name,iteration,cold,warm,pwaAfterFirstPaintMs:round(pwaWait),navigation,
      pageErrors:fixture.errors.map(error=>String(error)).slice(0,8),
      requestsHandledByFixture:fixture.requests.length});
    console.log(JSON.stringify({profile:profile.name,iteration,cold:cold.readyMs,warm:warm.readyMs,nav:navigation.map(n=>[n.name,n.readyMs])}));
  } catch(error) {
    measureFailures.push({profile:profile.name,iteration,phase,error:String(error.message).split('\n')[0]});
  } finally {
    await fixture.close();
  }
}
for(const profile of profiles.filter(p=>!only||only===p.name)) for(let i=1;i<=repeats;i++) await measure(profile,i);
const stat=values=>{
  const v=values.filter(Number.isFinite).sort((a,b)=>a-b);
  const mid=Math.floor(v.length/2);
  return {n:v.length,median:v.length?round(v.length%2?v[mid]:(v[mid-1]+v[mid])/2):null,min:v.at(0)??null,max:v.at(-1)??null};
};
const summary={};
for(const profile of profiles.filter(p=>!only||only===p.name)){
  const samples=sampleRows.filter(row=>row.profile===profile.name);
  function summarize(entries) {
    return Object.fromEntries(['readyMs','fcp','lcp','cls','longTasks','longTaskMs','requests','encoded','transferred','js','images','api','jsHeapUsed']
      .map(field=>[field,stat(entries.map(entry=>entry[field]))]));
  }
  summary[profile.name]={
    cold:summarize(samples.map(row=>row.cold)),warm:summarize(samples.map(row=>row.warm)),
    pwaAfterFirstPaintMs:stat(samples.map(row=>row.pwaAfterFirstPaintMs)),
    navigation:Object.fromEntries(routes.map(([name])=>[name,summarize(samples.flatMap(row=>row.navigation.filter(r=>r.name===name)))])),
  };
}
await writeFile(output,JSON.stringify({
  status:measureFailures.length?'PARTIAL':'PASS',
  source:process.env.NEXUS_PERF_SOURCE,
  buildManifestSha256:createHash('sha256').update(build).digest('hex'),
  environment:{os:os.platform()+' '+os.release(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,node:process.version,
    memory:os.totalmem(),chrome:process.env.NEXUS_CHROME_VERSION,headless:true,syntheticAccount:true},
  profiles,method:'Loopback TLS and verified PWA; desktop native CPU, mobile emulated size/CPU/network; route change to two painted frames. Resource timings report document requests and exclude worker-only requests. Event duration is an observed laboratory entry, not production INP. Chromium routing affects HTTP cache; warm path uses the verified public Service Worker cache.',
  summary,sampleRows,measureFailures,
},null,2)+'\n');
assert.ok(sampleRows.length,JSON.stringify(measureFailures));
