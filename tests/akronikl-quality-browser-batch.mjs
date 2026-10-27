// P4-Q: реальные Qwen/Wllama/Tutor, публичный корпус; без Account и облачных API.
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.resolve(process.env.NEXUS_AKRONIKL_EVIDENCE||'evidence-quality');
await mkdir(out,{recursive:true});
const model=process.env.NEXUS_TUTOR_MODEL_FILE;if(!model)throw Error('Укажите существующий проверенный GGUF');
const hash=createHash('sha256');for await(const b of createReadStream(model))hash.update(b);
assert.equal(hash.digest('hex'),'9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031');
const corpus=JSON.parse(await readFile(path.join(root,'tests/fixtures/akronikl-tutor-quality-v1.json')));
assert.equal(corpus.cases.length,32);
for(const c of corpus.cases){if(c.source){const b=await readFile(path.join(root,c.source.path));assert.equal(createHash('sha256').update(b).digest('hex'),c.source.sha256);}}
const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><title>P4-Q: реальная модель, публичный корпус</title><body><h1>Akronikl — изолированная проверка</h1><input id="file" type="file"><button id="stop">Остановить</button><pre id="answer"></pre><script type="module">
import {loadLocalModel} from '/akronikl/tutor/local-model.js';
import {probeWebGPU} from '/akronikl/connections/probe.js';
import {makeIndices,makeQualityProbe} from '/tests/helpers/akronikl-quality-probe.mjs';
const read=async l=>(await fetch('/akronikl/knowledge/core-index.'+l+'.json',{credentials:'omit'})).json();
const indices=makeIndices(await read('ru'),await read('en'));
let engine=null,probe=null;
const qa=window.qa={loadInfo:null,last:null,active:false,stopAt:null};
document.querySelector('#stop').onclick=()=>{qa.stopAt=performance.now();probe?.session.cancel();};
qa.load=async()=>{const t=performance.now();let importedAt=null,weightsStart=null,weightsEnd=null;
 engine=await loadLocalModel(document.querySelector('#file').files[0],{loadRuntime:async()=>{
  importedAt=performance.now();const {Wllama}=await import('/akronikl/tutor/runtime/index.js');
  return {Wllama:class extends Wllama{async loadModel(...args){weightsStart=performance.now();const r=await super.loadModel(...args);weightsEnd=performance.now();return r;}}};
 }});
 document.querySelector('#file').value='';
 qa.loadInfo={totalMs:performance.now()-t,fileCheckMs:importedAt-t,weightsMs:weightsEnd-weightsStart,profile:'local-cpu',gpuPreflight:await probeWebGPU({})};return qa.loadInfo;
};
qa.run=async(c,options={})=>{probe?.dispose();probe=makeQualityProbe(c,engine,indices,options);return qa.execute(c,()=>probe.run(),false);};
qa.follow=async()=>qa.execute({id:'follow-up-ru',prompt:'Объясни проще',locale:'ru'},()=>probe.session.ask({text:'Объясни проще',intent:'simpler',followUp:true,include:[]}),true);
qa.execute=async(c,operation,followUp)=>{
 const t=performance.now();let maxDriftMs=0,ticks=0,prev=t;qa.active=true;qa.stopAt=null;
 const timer=setInterval(()=>{const n=performance.now();maxDriftMs=Math.max(maxDriftMs,n-prev-25);prev=n;ticks++;},25);
 let result,settled=false;
 try{result=await operation();const received=performance.now();document.querySelector('#answer').textContent=result.text;
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const visible=performance.now();
  settled=await probe.settle();const d=probe.details();
  qa.last={caseId:c.id,prompt:c.prompt,locale:c.locale,followUp,result,details:d,totalRequestMs:received-t,firstDisplayedAnswerMs:visible-t,stopToReturnMs:qa.stopAt===null?null:received-qa.stopAt,settled,uiHeartbeat:{ticks,maxDriftMs},measurementScope:'QA-page-render; first display only after complete validated result, not production UI'};
  return qa.last;
 }finally{clearInterval(timer);qa.active=false;}
};
qa.unload=async()=>{probe?.dispose();const t=performance.now();await engine?.dispose();engine=null;return{unloadMs:performance.now()-t}};
</script></body></html>`;
const requests=[],blocked=[],errors=[],answers=[],extras=[],loads=[],resources=[];let fatal=null;
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');requests.push({path:u.pathname,method:req.method});
 try{if(req.method!=='GET')throw Error('METHOD');if(u.pathname==='/'){res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});res.end(html);return;}
 if(u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 if(!u.pathname.startsWith('/akronikl/')&&u.pathname!=='/tests/helpers/akronikl-quality-probe.mjs')throw Error('PATH');
 const file=path.resolve(root,decodeURIComponent(u.pathname.slice(1)));if(!file.startsWith(root+path.sep)&&!file.startsWith(root))throw Error('PATH');
 const b=await readFile(file);res.writeHead(200,{'content-type':({'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.wasm':'application/wasm'}[path.extname(file)]||'application/octet-stream'),'cache-control':'no-store'});res.end(b);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking']});
const cdp=await browser.newBrowserCDPSession();
const concurrency=Math.min(3,Math.max(1,Math.floor(os.totalmem()/(4*1024**3))));
const workers=[];
async function sample(label){
 try{const {processInfo}=await cdp.send('SystemInfo.getProcessInfo');let rss=0,pss=0,count=0;for(const p of processInfo){try{const s=await readFile('/proc/'+p.id+'/smaps_rollup','utf8');rss+=+(s.match(/^Rss:\s+(\d+)/m)?.[1]||0)*1024;pss+=+(s.match(/^Pss:\s+(\d+)/m)?.[1]||0)*1024;count++;}catch{}}
 const row={label,cpuSeconds:processInfo.reduce((a,p)=>a+p.cpuTime,0),sampledRssBytes:count?rss:null,sampledPssBytes:count?pss:null,processesRead:count,scope:'CDP-listed Chrome processes; aggregate shared by concurrent probes; not OS peak'};resources.push(row);return row;
 }catch{return null;}
}
async function worker(id){const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1024,height:768}});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin||r.request().method()!=='GET'){blocked.push({origin:u.origin,path:u.pathname,method:r.request().method()});return r.abort();}return r.continue();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push({worker:id,message:e.message}));page.setDefaultTimeout(15000);
 await page.goto(origin);await page.waitForFunction(()=>!!window.qa);await page.locator('#file').setInputFiles(model);
 const load=await page.evaluate(()=>qa.load());loads.push({worker:id,...load});const w={id,page,context};workers.push(w);return w;
}
async function run(w,c,{extra=false,options={}}={}){
 const before=await sample('before:'+c.id);const row=await w.page.evaluate(({c,options})=>qa.run(c,options),{c,options});
 row.worker=w.id;row.concurrentWorkers=workers.length;row.offline=w.offline===true;row.expectedSource=c.source??null;row.reviewCriteriaRu=c.reviewCriteriaRu??[];
 row.sourceAlignment=c.source?(row.result.sources||[]).some(s=>s.sourcePath===c.source.path):null;
 row.expectedSourceReached=c.source&&row.details.packet?row.sourceAlignment:null;
 row.resourcesBefore=before;row.resourcesAfter=await sample('after:'+c.id);
 (extra?extras:answers).push(row);await writeFile(path.join(out,c.id+'.json'),JSON.stringify(row,null,2)+'\n');
 console.log('CASE',c.id,row.result.status,'generated='+!!row.result.generated,'ms='+Math.round(row.totalRequestMs),'settled='+row.settled);
 if(!row.settled)throw Error('MODEL_DID_NOT_SETTLE_AFTER_CANCEL');return row;
}
try{
 await sample('before-load');const first=await worker(0);const initial=await run(first,corpus.cases[0]);
 await first.context.setOffline(true);first.offline=true;
 if(initial.result.generated){const follow=await first.page.evaluate(()=>qa.follow());follow.concurrentWorkers=1;follow.offline=true;extras.push(follow);await writeFile(path.join(out,'follow-up-ru.json'),JSON.stringify(follow,null,2));console.log('FOLLOWUP',follow.result.status,Math.round(follow.totalRequestMs));if(!follow.settled)throw Error('FOLLOWUP_DID_NOT_SETTLE');}
 for(let i=1;i<concurrency;i++){const w=await worker(i);await w.context.setOffline(true);w.offline=true;}
 const queue=corpus.cases.slice(1);
 await Promise.all(workers.map(async w=>{while(queue.length){const c=queue.shift();await run(w,c);}}));
 // Узкие реальные сравнения стиля, не гарантия полного companion-качества.
 for(const [id,humor,situation] of [['style-quiet-ru',0,'routine'],['style-humor-ru',100,'routine'],['style-serious-ru',100,'exam']]){
  await run(first,{...corpus.cases[0],id,prompt:'Объясни RAII'},{extra:true,options:{humor,situation}});
 }
 // Реальная отмена; не подставной зависший provider. После этого не используем старый ответ.
 const cancelCase={...corpus.cases[2],id:'cancel-real-ru'};
 const task=first.page.evaluate(c=>qa.run(c),cancelCase);await first.page.waitForFunction(()=>qa.active===true);await first.page.waitForTimeout(1500);
 await first.page.locator('#stop').click();const cancellation=await task;extras.push(cancellation);await writeFile(path.join(out,'cancel-real-ru.json'),JSON.stringify(cancellation,null,2));assert.equal(cancellation.result.status,'cancelled');
 await first.page.screenshot({path:path.join(out,'qa-real-model.png')});
 assert.equal(answers.length,32);assert.equal(requests.filter(x=>x.method!=='GET').length,0);assert.equal(blocked.length,0);assert.deepEqual(errors,[]);
}catch(e){fatal={name:e.name,message:e.message};console.error('QA FAILED',fatal);}
finally{
 for(const w of workers){try{loads.find(x=>x.worker===w.id).unload=await w.page.evaluate(()=>qa.unload());}catch{}await w.context.close().catch(()=>{});}
 await sample('after-unload');const version=browser.version();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));
 const result={status:fatal?'PARTIAL':'TECHNICAL_RUN_COMPLETE',qualityAcceptance:false,independentReview:false,source:process.env.NEXUS_SOURCE_COMMIT||null,runtimeBaseline:'51b0e025dd8ff1513aa76d0e706ca34f09c6e044',model:{id:'Qwen3-0.6B-Q8_0',bytes:(await stat(model)).size,sha256:'9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031',runtime:'wllama@3.8.1'},environment:{node:process.version,browser:version,arch:os.arch(),cpu:os.cpus()[0]?.model,cpus:os.cpus().length,totalMemory:os.totalmem(),concurrency},fatal,loads,resources,answers,extras,errors,requests,blocked,physicalDevices:false,hardwareWebGPU:'NOT_RUN',productionLive:false};
 await writeFile(path.join(out,'RESULT.json'),JSON.stringify(result,null,2)+'\n');if(fatal)process.exitCode=1;
}
