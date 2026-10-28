// Парные новые профили SW/IDB, только loopback. Доставка без сжатия, RTT120 мс.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const out=path.resolve(process.env.NEXUS_NATIVE_EVIDENCE);await mkdir(out,{recursive:true});
let build,records=[];const runs=[],latencyMs=120;
const mime=f=>({'.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.md':'text/markdown'}[path.extname(f)]||'text/html');
const server=http.createServer(async(req,res)=>{
 if(req.url==='/fixture.html'){res.writeHead(200,{'content-type':'text/html'});return res.end('<!doctype html><meta charset="utf-8"><title>Замер установки</title>')}
 const u=new URL(req.url,'http://127.0.0.1'),file=u.pathname.slice(1),target=path.resolve(build,file);
 if(!target.startsWith(build+path.sep)){res.writeHead(403);return res.end()}
 try{const b=await readFile(target);await new Promise(r=>setTimeout(r,latencyMs));records.push({file,bytes:b.length});res.writeHead(200,{'content-type':mime(file),'cache-control':file==='service-worker.js'?'no-store':'public,max-age=0'});res.end(b)}catch{res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser,failure;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking']});
 for(let i=0;i<2;i++)for(const dir of i%2?[process.env.NEXUS_FRONTEND_DIR,process.env.NEXUS_BASELINE_DIR]:[process.env.NEXUS_BASELINE_DIR,process.env.NEXUS_FRONTEND_DIR]){
  build=path.resolve(dir);records=[];const m=JSON.parse(await readFile(path.join(build,'BUILD_MANIFEST.json'))),context=await browser.newContext(),page=await context.newPage();
  await page.goto(origin+'/fixture.html');const started=performance.now();
  const proof=await page.evaluate(async generation=>{
   await navigator.serviceWorker.register('/service-worker.js',{scope:'/',updateViaCache:'none'});
   await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Установка не завершена за90с')),90000))]);
   return (await import('/releases/'+generation+'/pwa/client.js')).ensureVerifiedRuntime();
  },m.assetGeneration);
  const installMs=performance.now()-started;assert.equal(proof.publicReady,true);assert.equal(records.some(r=>r.file.includes('/intro-media/')),false);
  const run={iteration:i,build:path.basename(build),installMs,requests:records.length,responseBytes:records.reduce((s,r)=>s+r.bytes,0),mediaRequests:0};runs.push(run);console.log(JSON.stringify(run));await context.close();
 }
}catch(error){failure={message:error.message,stack:error.stack};console.error(error)}
finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:failure?'FAIL':'PASS',failure,runs,latencyMs,compression:false,synthetic:true,physical:false},null,2));if(failure)process.exitCode=1}
