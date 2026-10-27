// P4 read-only quality evaluation. No deploy, production Account or paid API.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const repo=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const out=path.resolve(process.env.NEXUS_AKRONIKL_EVIDENCE||'evidence-final-quality');await mkdir(out,{recursive:true});
const shard=Number(process.env.AK_QUALITY_SHARD||0),shards=Number(process.env.AK_QUALITY_SHARDS||1);
assert.ok(Number.isInteger(shard)&&Number.isInteger(shards)&&shard>=0&&shard<shards);
const model=process.env.NEXUS_TUTOR_MODEL_FILE;assert.ok(model,'Model file must be explicitly supplied');
const corpusPath=path.join(repo,'tests/fixtures/akronikl-tutor-quality-v1.json');
const corpusBytes=await readFile(corpusPath),corpus=JSON.parse(corpusBytes);
const cases=corpus.cases.filter((c,i)=>i%shards===shard);
const records=[],network=[],pageErrors=[],extras=[];let infrastructureFailure=null;
const html='<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles/app.css"><title>Akronikl quality QA</title><body style="background:#07111f"><main id="root"><button id="open">Akronikl</button><textarea id="editor"></textarea></main><script type="module" src="/tests/helpers/akronikl-final-quality-page.mjs"></script></body></html>';
const mime={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://127.0.0.1');network.push({path:u.pathname,method:req.method});
  if(req.method!=='GET')throw Error('READ_ONLY');
  if(u.pathname==='/'){res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});res.end(html);return;}
  if(u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const file=path.resolve(repo,decodeURIComponent(u.pathname.slice(1)));if(!file.startsWith(repo+path.sep))throw Error('PATH');
  const b=await readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(b);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking']});
const sys=await browser.newBrowserCDPSession();let hardware=null;
try{const h=await sys.send('SystemInfo.getInfo');hardware={gpu:h.gpu.devices,modelName:h.modelName};}catch{}
const ctx=await browser.newContext({viewport:{width:1366,height:900},serviceWorkers:'block'});
const blocked=[];await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin)return r.continue();blocked.push({origin:u.origin,method:r.request().method()});return r.abort();});
let samples=[],sampling=false;
async function resourceSample(){if(sampling)return;sampling=true;try{
  const {processInfo}=await sys.send('SystemInfo.getProcessInfo');const items=[];
  for(const p of processInfo){let rss=null;try{const s=await readFile('/proc/'+p.id+'/status','utf8');rss=Number(s.match(/^VmRSS:\s+(\d+) kB/m)?.[1])*1024;if(!Number.isFinite(rss))rss=null;}catch{}
    items.push({id:p.id,type:p.type,cpuTime:p.cpuTime,rssBytes:rss});}
  samples.push({at:performance.now(),processes:items});
}catch{}finally{sampling=false;}}
const sampler=setInterval(()=>void resourceSample(),1000);
async function flush(){await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:infrastructureFailure?'INFRASTRUCTURE_FAILURE':'MEASURED_NOT_QUALITY_ACCEPTED',source:process.env.NEXUS_SOURCE_COMMIT,
  acceptedRuntime:'fe1564ba7192495370385002a81d0db98f67254f',corpusSha256:createHash('sha256').update(corpusBytes).digest('hex'),shard,shards,assignedCases:cases.map(c=>c.id),records,extras,
  infrastructureFailure,pageErrors,network,blocked,environment:{node:process.version,browser:browser.version(),cpus:os.cpus().map(c=>c.model),memoryBytes:os.totalmem(),hardware},
  qualityAcceptance:false,independentReview:false,physicalDevices:false,accountBackend:false,realModel:true,profile:'local-cpu',gpuBenchmark:'NOT_RUN_NO_CONFIRMED_HARDWARE',
  resourceScope:'CDP process CPU counters and sum of RSS; shared pages can be counted multiple times; one sample/sec; no GPU VRAM claim'},null,2)+'\n');}
async function command(page,text){await page.evaluate(()=>qualityFixture.begin());const p=page.locator('[data-akronikl-panel]');await p.locator('[data-akronikl-message]').fill(text);await p.locator('[data-akronikl-send]').click();await p.locator('.ak-composer[aria-busy="false"]').waitFor({timeout:135000});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));return page.evaluate(()=>qualityFixture.capture());}
function resourceSummary(from){const chosen=samples.slice(from);const byId=new Map();let peak=0;for(const s of chosen){peak=Math.max(peak,s.processes.reduce((n,p)=>n+(p.rssBytes||0),0));for(const p of s.processes){const v=byId.get(p.id);if(v)v.max=Math.max(v.max,p.cpuTime);else byId.set(p.id,{min:p.cpuTime,max:p.cpuTime});}}
return {sampleCount:chosen.length,sumRssPeakBytes:peak||null,cpuSecondsObserved:[...byId.values()].reduce((n,v)=>n+Math.max(0,v.max-v.min),0),samples:chosen};}
try{
 for(const c of cases){
  const record={caseId:c.id,kind:c.kind,locale:c.locale,prompt:c.prompt,source:c.source??null,startedAt:new Date().toISOString(),status:'NOT_RUN'};records.push(record);let page;
  const sampleStart=samples.length;
  try{
   page=await ctx.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>pageErrors.push({caseId:c.id,message:e.message}));
   await page.goto(origin);await page.waitForFunction(()=>typeof window.prepareQualityCase==='function');await page.evaluate(c=>prepareQualityCase(c),c);
   const panel=page.locator('[data-akronikl-panel]');await panel.waitFor();
   await panel.locator('[data-akronikl-settings]').click();await panel.locator('[aria-controls="ak-settings-model"]').click();
   await panel.locator('[data-akronikl-model-profile]').selectOption('local-cpu');
   await panel.locator('[data-akronikl-model-file]').setInputFiles(model);
   await panel.getByRole('button',{name:c.locale==='ru'?'Подключить выбранную модель':'Connect selected model',exact:true}).click();
   await page.waitForFunction(()=>{const n=document.querySelector('[data-akronikl-connection-status]');return n?.dataset.connectionPhase==='connected'||n?.dataset.connectionCode==='MODEL_LOAD_FAILED';},null,{timeout:180000});
   assert.equal(await panel.locator('[data-akronikl-connection-status]').getAttribute('data-connection-phase'),'connected');
   await panel.locator('.ak-back').click();
   record.ui=await command(page,c.prompt);record.status='MEASURED';
   if(c.kind==='compiler-diagnostic')record.diagnosticContract=await page.evaluate(()=>qualityFixture.diagnosticContract());
   if(c.id==='raii-ru'){
    await ctx.setOffline(true);const before=network.length;
    const continuation=await command(page,'Объясни проще');extras.push({id:'raii-offline-follow-up',...continuation,networkDelta:network.length-before});await ctx.setOffline(false);
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'real-model-dialogue-390.png')});await page.setViewportSize({width:1366,height:900});
    await page.evaluate(()=>qualityFixture.begin());await panel.locator('[data-akronikl-message]').fill(c.prompt);await panel.locator('[data-akronikl-send]').click();
    await page.waitForTimeout(700);const t=performance.now();await panel.locator('[data-akronikl-stop]').click();await panel.locator('.ak-composer[aria-busy="false"]').waitFor();const uiStopMs=performance.now()-t;
    let settled=false;try{await page.waitForFunction(()=>qualityFixture.pending===0,null,{timeout:15000});settled=true;}catch{}
    extras.push({id:'real-cpu-stop',uiStopMs,runtimeSettledWithin15s:settled,cleanupMs:settled?performance.now()-t:null,lateAnswerCount:await panel.locator('[data-ak-message="assistant"]').count(),captured:await page.evaluate(()=>qualityFixture.capture())});
    if(settled){
      await panel.locator('[data-akronikl-settings]').click();await panel.locator('[aria-controls="ak-settings-privacy"]').click();await panel.locator('[data-ak-code-consent]').check();await panel.locator('.ak-back').click();
      await page.evaluate(()=>qualityFixture.begin());await panel.locator('[data-akronikl-message]').fill('Разбери выбранный код');await panel.locator('[data-akronikl-send]').click();await page.waitForTimeout(500);
      await panel.locator('[data-akronikl-settings]').click();await panel.locator('[aria-controls="ak-settings-privacy"]').click();await panel.locator('[data-ak-code-consent]').uncheck();
      const immediately=await panel.locator('[data-ak-message]').count();await page.waitForTimeout(1000);extras.push({id:'real-model-consent-revocation',messagesImmediately:immediately,messagesAfter1s:await panel.locator('[data-ak-message]').count()});
      await page.evaluate(()=>window.dispatchEvent(new Event('nexus:context-invalidated')));await panel.waitFor({state:'detached'});extras.push({id:'real-model-context-invalidated',panelRemoved:true});
    }
   }
  }catch(e){record.status='ERROR';record.error=String(e.message).slice(0,1500);if(page)await page.screenshot({path:path.join(out,'FAILURE-'+c.id+'.png')}).catch(()=>{});}
  finally{record.resources=resourceSummary(sampleStart);if(page)await page.close().catch(()=>{});await ctx.setOffline(false);await flush();console.log(record.caseId,record.status,record.ui?.generated,record.ui?.fullUiMs);}
 }
 assert.equal(records.length,cases.length);
}catch(e){infrastructureFailure=String(e.message);}
finally{clearInterval(sampler);await flush();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));if(infrastructureFailure)process.exitCode=1;}
