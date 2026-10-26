// Адресное A/B сравнение в одном CI runner. Не доказательство скорости телефонов.
// Cold = новый процесс/профиль с действующей синтетической HttpOnly-сессией;
// Warm = reload того же документа/профиля. Вход и подготовка тестовых данных вне замера.
// SW блокируется одинаково в обеих online-ветках; cold PWA измеряется владельцем отдельно.
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createKnowledgeIndex} from '../akronikl/core/knowledge.js';
import {acceptanceHarness,origin,enroll,appReady} from './helpers/akronikl-acceptance-harness.mjs';
const out=process.env.NEXUS_AKRONIKL_EVIDENCE,n=Number(process.env.NEXUS_PERF_SAMPLES||20);
if(!out||!process.env.NEXUS_BASELINE_DIR||!Number.isInteger(n)||n<10||n>40)throw Error('PERF_ENV_REQUIRED');
await mkdir(out,{recursive:true});
const h=await acceptanceHarness({baseline:process.env.NEXUS_BASELINE_DIR,candidate:process.env.NEXUS_FRONTEND_DIR});
h.setLatency(15);
const lessonId=createKnowledgeIndex(JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,h.variants.candidate.manifest.prefix,'akronikl/knowledge/core-index.ru.json')))).search('указатели')[0].lessonId;
const cookies={},samples=[],errors=[];let fatal=null,version=null;
async function preferences(context){await context.addInitScript(()=>{
 localStorage.setItem('akronikl:it-nexus:prefs:v1',JSON.stringify({uiLocale:'ru',mentorLocale:'ru',courseLocale:'ru',effectsQuality:'off'}));
 window.__ak02LongTasks=[];try{new PerformanceObserver(list=>{for(const e of list.getEntries())window.__ak02LongTasks.push(e.duration)}).observe({type:'longtask',buffered:true})}catch{}
});}
async function hashMetric(page,hash,selector){return page.evaluate(({hash,selector})=>new Promise((resolve,reject)=>{
 const start=performance.now();let finishing=false;
 const timer=setTimeout(()=>{observer.disconnect();reject(Error('PERF_ROUTE_TIMEOUT'))},20000);
 const inspect=()=>{if(!finishing&&document.querySelector(selector)&&location.hash===hash&&!document.querySelector('#boot-status')){finishing=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timer);observer.disconnect();resolve(performance.now()-start)}))}};
 const observer=new MutationObserver(inspect);observer.observe(document.body,{childList:true,subtree:true,attributes:true});location.hash=hash;
}),{hash,selector});}
async function uiMetric(page,kind){return page.evaluate(kind=>new Promise((resolve,reject)=>{
 const start=performance.now();let finishing=false;
 const timer=setTimeout(()=>{observer.disconnect();reject(Error('PERF_ASSISTANT_TIMEOUT'))},20000);
 const selector=kind==='open'?'[data-akronikl-panel]':'[data-akronikl-panel] article';
 const inspect=()=>{if(!finishing&&document.querySelector(selector)){finishing=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timer);observer.disconnect();resolve(performance.now()-start)}))}};
 const observer=new MutationObserver(inspect);observer.observe(document.body,{childList:true,subtree:true});
 if(kind==='open')document.querySelector('[data-akronikl-open],#askAkronikl').click();
 else{const input=document.querySelector('[data-akronikl-panel] input[type=search]');input.value='указатели';input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-akronikl-panel] form').requestSubmit();}
 inspect();
}),kind);}
async function run(variant,pair){
 h.choose(variant);const {context}=await h.launch({serviceWorkers:'block'});version=context.browser()?.version();
 await preferences(context);await context.addCookies(cookies[variant]);const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push({variant,message:e.message}));
 const prefix='/'+h.current.manifest.prefix,cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
 try{
  for(const temperature of ['cold','warm']){
   const begin=h.requests.length;
   if(temperature==='cold')await page.goto(origin+'/index.html#view=home');else await page.goto(origin+'/index.html#view=home').then(()=>page.reload());
   await page.locator('.visual-home').waitFor();await appReady(page);
   const ready=await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(performance.now())))));
   const before=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
   const heavy=h.requests.slice(begin).filter(r=>/\/akronikl\/(ui|core|knowledge)\//.test(r.path));assert.equal(heavy.length,0);
   const startup=await page.evaluate(()=>({resources:performance.getEntriesByType('resource').length,encodedBytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.encodedBodySize,0),longTasks:window.__ak02LongTasks||[]}));
   const academy=await hashMetric(page,'#view=academy','[data-visual-academy]');
   await page.evaluate(async prefix=>{const s=await import(prefix+'project-studio/project-store.js');if(!s.getProject('synthetic-perf-project'))s.createProject({id:'synthetic-perf-project',title:'Synthetic performance',entryFile:'main.cpp',files:[{path:'main.cpp',languageId:'cpp',content:'// SYNTHETIC PERF ONLY'}]})},prefix);
   const editor=await hashMetric(page,'#view=code-studio&project=synthetic-perf-project','#editor');
   const row={pair,variant,temperature,startupMs:ready,academyMs:academy,editorMs:editor,startup,heapUsedBytes:before.JSHeapUsedSize,domNodes:before.Nodes,taskSeconds:before.TaskDuration,layoutSeconds:before.LayoutDuration};
   if(variant==='candidate'){
    await hashMetric(page,'#view=akronikl','[data-akronikl-open]');row.assistantOpenMs=await uiMetric(page,'open');row.firstSearchMs=await uiMetric(page,'search');
    // Повторный запрос не сбрасывает память индекса; это отдельный warm-search.
    row.repeatedSearchMs=await uiMetric(page,'search');
    row.lessonNavigationMs=await page.evaluate(()=>new Promise((resolve,reject)=>{
     const start=performance.now();let done=false;const timer=setTimeout(()=>{observer.disconnect();reject(Error('PERF_LESSON_TIMEOUT'))},20000);
     const observer=new MutationObserver(()=>{if(!done&&document.querySelector('#editor')&&!document.querySelector('[data-akronikl-panel]')&&location.hash.includes('lesson=')){done=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timer);observer.disconnect();resolve(performance.now()-start)}))}});
     observer.observe(document.body,{childList:true,subtree:true});document.querySelector('[data-akronikl-panel] article button').click();
    }));
    const after=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));row.afterAssistantHeapBytes=after.JSHeapUsedSize;
   }
   if(variant==='baseline')await hashMetric(page,'#course=cpp&lesson='+lessonId,'#editor');
   samples.push(row);console.log('MEASURE '+variant+' '+temperature+' '+pair);
  }
 }finally{await context.close();}
}
try{
 for(const variant of ['baseline','candidate']){
  h.choose(variant);const {context}=await h.launch({serviceWorkers:'block'});await preferences(context);const page=await context.newPage();
  await enroll(page,h.current.f.invitation);h.current.f.enableControl();cookies[variant]=await context.cookies();await context.close();
 }
 // Порядок чередуется AB/BA; пары последовательны, не запускаются параллельно.
 for(let i=0;i<n;i++)for(const variant of i%2?['candidate','baseline']:['baseline','candidate'])await run(variant,i+1);
 assert.deepEqual(errors,[]);assert.deepEqual(h.serverErrors,[]);
}catch(e){fatal={name:e.name,message:e.message,stack:e.stack};console.error(e);}
finally{
 await h.close();const quantile=(xs,p)=>[...xs].sort((a,b)=>a-b)[Math.ceil(xs.length*p)-1];
 const summary={};for(const v of ['baseline','candidate'])for(const t of ['cold','warm']){
  const rows=samples.filter(r=>r.variant===v&&r.temperature===t);const metrics={};
  for(const key of ['startupMs','academyMs','editorMs','assistantOpenMs','firstSearchMs','repeatedSearchMs','lessonNavigationMs','heapUsedBytes','domNodes','taskSeconds']){
   const values=rows.map(r=>r[key]).filter(Number.isFinite);if(values.length)metrics[key]={n:values.length,p50:quantile(values,.5),p95:quantile(values,.95)};
  }summary[v+'-'+t]=metrics;
 }
 await writeFile(path.join(out,'PERFORMANCE.json'),JSON.stringify({status:fatal?'FAIL':'MEASURED',source:process.env.NEXUS_SOURCE_COMMIT,baselineSource:'065606a788198045cadf250fea663246ddbb2d56',browser:version,node:process.version,design:{pairs:n,order:'AB/BA alternation',latencyPerResponseMs:15,bandwidthLimit:null,viewport:'1366x900',effects:'off',serviceWorkers:'blocked-equally',cold:'fresh process/profile; valid synthetic session cookie restored before navigation',warm:'reload same process/profile; HTTP/module cache retained',authCeremonyInTiming:false,physical:false},samples,summary,fatal,errors,unknownPaths:h.unexpected,thresholds:'Diagnostic only: investigate median startup/navigation increase exceeding both 50 ms and 15%. No phone/production claim.',baselineAssistant:'NOT AVAILABLE: no functional assistant; not treated as zero milliseconds',resourceCaveat:'CDP JS heap and DOM nodes are not OS process RSS; no forced GC; warm trace includes route preparation; first/repeated search labelled separately'},null,2)+'\n');if(fatal)process.exitCode=1;
}
