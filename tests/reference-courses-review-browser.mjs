// Адресный review MASTER: настоящая вёрстка, синтетический отказ среды, без рабочих данных.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {staticMime} from '../pwa/static-mime.js';

export async function runMasterReviewScenarios(frontend,out){
 await mkdir(out,{recursive:true});
 const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration;
 let fault='none';const checks=[],failures=[],screens=[],performanceRecords=[];let profileSummary=null;
 const runtimeDouble=`export function createSandboxController({codeStudio,stdin,runObserver}){let runs=0;return{dispose(){},async run(){if(++runs>1)throw Error('SYNTHETIC_RUN_REJECTED');const request=codeStudio.runtimeRequest(stdin.value),ticket=runObserver.capture(request);await runObserver.complete(ticket,{provider:{id:'wasm-cpp'},result:{stdout:globalThis.reviewExpected,exitCode:0}});}}}`;
 const server=http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://127.0.0.1');
  if(u.pathname==='/qa'){res.setHeader('content-type','text/html');return res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+prefix+'/styles/app.css"><main id="app"></main>');}
  if(/^\/(api|account)\//.test(u.pathname)){res.writeHead(401);return res.end();}
  if(u.pathname===prefix+'/sandbox/sandbox.js'&&fault!=='none'){
   if(fault==='unavailable'){res.writeHead(503);return res.end('Synthetic unavailable runtime');}
   res.setHeader('content-type','text/javascript');return res.end(fault==='initialize'?'export function createSandboxController(){throw Error("SYNTHETIC_INITIALIZATION_FAILED")}':runtimeDouble);
  }
  const relative=decodeURIComponent(u.pathname);if(relative.includes('..')||relative.includes('\\'))throw Error('PATH');
  const target=path.resolve(frontend,'.'+relative);if(!target.startsWith(frontend+path.sep))throw Error('PATH');
  res.setHeader('content-type',staticMime(relative));res.end(await readFile(target));
 }catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
 const browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH});
 async function contextPage(){const context=await browser.newContext({serviceWorkers:'block'});await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());return{context,page:await context.newPage()};}
 async function mount(page,id,locale,editable=false){
  return page.evaluate(async({prefix,id,locale,editable})=>{
   const start=performance.now();
   const {mountClarityLesson}=await import(prefix+'/core/cpp-clarity-r3-renderer.mjs');
   let adapter=null;
   if(editable){
    const {canonicalJson,sha256Utf8,prepareClarityDraft}=await import(prefix+'/core/cpp-clarity-r3-state.mjs');
    const lesson=await(await fetch(prefix+'/courses/clarity/lessons/'+id+'.'+locale+'.json')).json(),source=lesson.practice.referenceSolution.source;globalThis.reviewExpected=lesson.practice.runAssessment.lines.join('\n')+'\n';
    let work={code:source,stdin:'',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:0,files:[{path:'main.cpp',content:source,languageId:'cpp',readOnly:false}]}},draft=null,token=0;
    const binding=()=>({kind:'lesson',topicId:id,workspaceDigest:sha256Utf8(canonicalJson(work))});
    adapter={isCurrent:()=>true,read:()=>({work:structuredClone(work),draft:structuredClone(draft),workToken:token,binding:binding()}),async saveWork(next,expected){if(expected!==token)throw Error('TOKEN');work=structuredClone(next);return{workToken:++token,binding:binding()};},async saveDraft(next,expected){draft=prepareClarityDraft(id,next,{previous:draft,expectedStateRevision:expected}).value;return{stateRevision:draft.stateRevision};}};
   }
   globalThis.reviewController?.dispose();
   globalThis.reviewController=await mountClarityLesson(document.querySelector('#app'),{topicId:id,locale,adapter});
   await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   return{mountedMs:performance.now()-start};
  },{prefix,id,locale,editable});
 }
 try{
  // История проверяется как видимый текст, включая телефон, а не только как JSON.
  {const {context,page}=await contextPage();await page.goto(origin+'/qa#course=cpp&lesson=cpp.programming-process&stage=explanation&learningRoute=reference-start');
   for(const locale of ['ru','en']){
    await mount(page,'cpp.programming-process',locale);
    for(const width of [1366,320]){await page.setViewportSize({width,height:900});const history=page.locator('#history');await history.scrollIntoViewIfNeeded();
     for(const year of ['1979','1983','1985','1998'])assert.equal(await history.getByText(year,{exact:true}).isVisible(),true);
     const table=history.locator('table');assert.equal(await table.locator('tbody tr').count(),4);assert.equal(await table.locator('caption').isVisible(),true);
     const geometry=await table.evaluate(n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,width:innerWidth}});assert.ok(geometry.left>=0&&geometry.right<=geometry.width+1,JSON.stringify(geometry));
     const name='history-'+locale+'-'+width+'.png';await table.screenshot({path:path.join(out,name)});screens.push(name);
    }
   }checks.push({name:'Visible C++ chronology',status:'PASS',locales:['ru','en'],widths:[1366,320],years:[1979,1983,1985,1998]});await context.close();}
  // Три разных отрицательных пути; previous pass берётся из синтетического observer-контроля.
  for(const mode of ['unavailable','initialize','reject'])for(const locale of ['ru','en']){
   fault=mode;const {context,page}=await contextPage();await page.goto(origin+'/qa#course=cpp&lesson=cpp.data-types&stage=practice&locale='+locale);
   await mount(page,'cpp.data-types',locale,true);const button=page.locator('#runCode'),assessment=page.locator('[data-reference-assessment]');
   if(mode==='reject'){await button.click();await page.locator('[data-reference-assessment][data-state="passed"]').waitFor();}
   const prior=await page.evaluate(()=>structuredClone(reviewController.session.draft.lastResult));
   const before=await page.locator('#editor').inputValue();await button.click();await page.waitForFunction(()=>!document.querySelector('#runCode').disabled);
   const state=await assessment.getAttribute('data-state'),text=await assessment.innerText(),output=await page.locator('#output').innerText();
   const record={mode,locale,state,text,output,buttonEnabled:await button.isEnabled(),codePreserved:before===await page.locator('#editor').inputValue(),syntheticRuntime:true};
   const name='runtime-'+mode+'-'+locale+'.png';await assessment.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,name)});screens.push(name);
   if(state!=='error'||!record.buttonEnabled||!record.codePreserved||/20\.5/.test(output))failures.push(record);
   else{assert.equal(await page.locator('[data-r3-snapshot]').isHidden(),true);assert.deepEqual(await page.evaluate(()=>reviewController.session.draft.lastResult),prior);await button.click();await page.waitForFunction(()=>!document.querySelector('#runCode').disabled);assert.equal(await assessment.getAttribute('data-state'),'error');checks.push({...record,status:'PASS',retryAvailable:true,oldResultNotCurrent:true,historicalSnapshotPreserved:true});}
   await context.close();
  }
  fault='none';
  // Реальный mount и переключение без перезагрузки; никакого production benchmark.
  {const {context,page}=await contextPage();await page.goto(origin+'/qa#stage=explanation');const profiler=await context.newCDPSession(page);await profiler.send('Profiler.enable');
   for(let repeat=0;repeat<3;repeat++)for(const id of ['cpp.data-types','onec.p2.topic-1','1c-enterprise.a2.topic-1']){
    const before=await page.evaluate(()=>performance.getEntriesByType('resource').length);
    const profiling=repeat===0&&id==='onec.p2.topic-1';if(profiling)await profiler.send('Profiler.start');
    const timing=await mount(page,id,'ru');
    if(profiling){const {profile}=await profiler.send('Profiler.stop');await writeFile(path.join(out,'BSL_MOUNT_CPU_PROFILE.json'),JSON.stringify(profile));
     const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();for(const n of profile.nodes)for(const child of n.children||[])parents.set(child,n.id);
     let totalMs=0,annotationMs=0;const leafMs=new Map();for(const [i,sample]of (profile.samples||[]).entries()){const ms=(profile.timeDeltas[i]||0)/1000;totalMs+=ms;const name=nodes.get(sample)?.callFrame.functionName||'(anonymous)';leafMs.set(name,(leafMs.get(name)||0)+ms);for(let at=sample;at;at=parents.get(at))if(nodes.get(at)?.callFrame.functionName==='annotateReferenceTerms'){annotationMs+=ms;break;}}
     profileSummary={id,totalSampledMs:totalMs,annotationInclusiveMs:annotationMs,topLeafFunctions:[...leafMs].sort((a,b)=>b[1]-a[1]).slice(0,8),method:'Chromium sampled CPU call stacks during first BSL mount in this context, including idle; approximate diagnostic attribution, not a production latency estimate'};
    }
    const resources=await page.evaluate(before=>performance.getEntriesByType('resource').slice(before).map(r=>({path:new URL(r.name).pathname,bytes:r.encodedBodySize,duration:r.duration})),before);
    performanceRecords.push({id,repeat,...timing,resources,cardsLoaded:resources.some(r=>/cards\.(ru|en)\.json$/.test(r.path))});
   }
   assert.equal(performanceRecords.some(r=>r.cardsLoaded),false,'Full syntax cards remain lazy');
   assert.ok(performanceRecords.filter(r=>r.repeat>0).every(r=>r.resources.length===0),'Warm mounts must reuse module and JSON caches');
   checks.push({name:'Warm lesson switch reuses resources; syntax cards remain lazy',status:'PASS',samples:performanceRecords.length});await context.close();}
 }catch(error){failures.push({unexpectedError:error.message,stack:error.stack});throw error;}finally{
  await writeFile(path.join(out,'MASTER_REVIEW_RESULT.json'),JSON.stringify({status:failures.length?'FAIL':'PASS',checks,failures,screens,performanceRecords,profileSummary,method:'Actual renderer, isolated loopback contexts, in-memory synthetic work. Runtime faults and prior successful stdout are explicit doubles; real compiler/WASI is checked separately. Three repeats diagnose resource reuse, not production speed.',physicalDevices:false,realAccounts:false},null,2));
  await browser.close();await new Promise(r=>server.close(r));
 }
 assert.equal(failures.length,0,JSON.stringify(failures));return checks;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){await runMasterReviewScenarios(path.resolve(process.env.NEXUS_FRONTEND_DIR),path.resolve(process.env.NEXUS_REFERENCE_EVIDENCE));console.log('MASTER review: chronology, runtime faults and resource reuse PASS');}
