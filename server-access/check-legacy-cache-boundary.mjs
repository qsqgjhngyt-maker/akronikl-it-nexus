// Только синтетическая проверка Linux CI: новый профиль, loopback, без Service Worker.
// Спецификация Cache.put: https://www.w3.org/TR/service-workers/#cache-put
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {access,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {createFeedbackHandler} from './bff/feedback.mjs';

if(process.platform!=='linux')throw Error('Эта браузерная проверка разрешена только в изолированном Linux CI; Windows Chrome не запускается.');
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
await access(chrome,constants.X_OK).catch(()=>{throw Error('Для проверки требуется установленный google-chrome; укажите CHROME_BIN. Проверка не пропущена.');});
const profile=await mkdtemp(join(tmpdir(),'nexus-cache-boundary-'));
const privateBody={marker:'SYNTHETIC_PRIVATE_RESPONSE_ONLY'};
const controlBody={marker:'SYNTHETIC_NO_STORE_CONTROL_ONLY'};
const wire=[];
let feedback,browser;
const page=`<!doctype html><html data-result="RUNNING"><meta charset="utf-8"><title>Изолированная проверка Cache API</title><body><pre id="result"></pre><script>
(async()=>{
 const checks=[];
 const check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name)};
 try{
  check('secure-loopback-and-cache-api',isSecureContext&&!!globalThis.caches);
  check('no-service-worker-controller',navigator.serviceWorker.controller===null);
  const cache=await caches.open('nexus-synthetic-boundary-only');
  const control=await fetch('/control-no-store',{cache:'no-store',credentials:'omit'});
  check('real-control-response',control.status===200&&control.type==='basic'&&control.headers.get('cache-control')==='no-store'&&!control.headers.has('vary'));
  await cache.put('/control-no-store',control.clone());
  const stored=await cache.match('/control-no-store');
  check('no-store-alone-does-not-stop-cache-put',!!stored&&(await stored.json()).marker==='SYNTHETIC_NO_STORE_CONTROL_ONLY');
  const response=await fetch('/api/v2/feedback/reviews',{cache:'no-store',credentials:'omit'});
  check('real-bff-response-200-vary-star',response.status===200&&response.type==='basic'&&response.headers.get('cache-control')==='no-store'&&response.headers.get('vary')==='*');
  let rejection=null;
  try{await cache.put('/api/v2/feedback/reviews',response.clone())}catch(error){rejection=error}
  check('native-cache-put-rejects-vary-star',rejection instanceof TypeError);
  check('response-body-remains-readable',(await response.json()).marker==='SYNTHETIC_PRIVATE_RESPONSE_ONLY');
  check('no-private-cache-match',await cache.match('/api/v2/feedback/reviews')===undefined);
  check('no-private-cache-key',(await cache.keys()).every(key=>new URL(key.url).pathname!=='/api/v2/feedback/reviews'));
  const report={status:'PASS',checks,syntheticOnly:true,serviceWorkerRegistered:false};
  document.querySelector('#result').textContent=JSON.stringify(report);
  document.documentElement.dataset.result='PASS';
 }catch(error){document.querySelector('#result').textContent=JSON.stringify({status:'FAIL',failed:String(error.message),checks});document.documentElement.dataset.result='FAIL'}
})();
</script></body></html>`;
const server=http.createServer(async(req,res)=>{
 wire.push({method:req.method,path:req.url});
 if(req.url==='/api/v2/feedback/reviews')return feedback(req,res);
 if(req.url==='/control-no-store'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(controlBody));return}
 if(req.url==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(page);return}
 res.writeHead(404,{'cache-control':'no-store'});res.end();
});
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const origin='http://127.0.0.1:'+server.address().port;
 feedback=createFeedbackHandler({env:{FEEDBACK_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',FEEDBACK_GATEWAY_ORIGIN:origin},fetchImpl:async()=>Response.json(privateBody)});
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--disable-default-apps','--no-first-run','--no-default-browser-check','--user-data-dir='+profile,'--virtual-time-budget=15000','--dump-dom',origin+'/'];
 let output='',stderrBytes=0;
 const exit=await new Promise((resolve,reject)=>{
  browser=spawn(chrome,args,{stdio:['ignore','pipe','pipe'],detached:true});
  const deadline=setTimeout(()=>{try{process.kill(-browser.pid,'SIGKILL')}catch{}reject(Error('Chrome не завершил проверку за 45 секунд'));},45000);
  browser.stdout.on('data',part=>{output+=part.toString('utf8');if(Buffer.byteLength(output)>1048576){try{process.kill(-browser.pid,'SIGKILL')}catch{}reject(Error('Превышен предел синтетического DOM evidence'));}});
  browser.stderr.on('data',part=>{stderrBytes+=part.length});
  browser.once('error',error=>{clearTimeout(deadline);reject(error)});
  browser.once('close',(code,signal)=>{clearTimeout(deadline);resolve({code,signal})});
 });
 assert.equal(exit.code,0,'Chrome завершился с ошибкой: '+JSON.stringify(exit));
 const resultText=output.match(/<pre id="result">([^<]*)<\/pre>/)?.[1];
 const report=resultText?JSON.parse(resultText.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')):null;
 const wireChecks={oneControlGET:wire.filter(x=>x.method==='GET'&&x.path==='/control-no-store').length===1,oneBffGET:wire.filter(x=>x.method==='GET'&&x.path==='/api/v2/feedback/reviews').length===1};
 const evidence={...report,status:report?.status==='PASS'&&Object.values(wireChecks).every(Boolean)?'PASS':'FAIL',wireChecks,wire,chromeExit:exit,stderrBytes,syntheticOnly:true,windowsBrowserLaunches:0,realAccounts:0,serviceWorkerRegistrations:0};
 if(process.env.CACHE_BOUNDARY_EVIDENCE)await writeFile(resolve(process.env.CACHE_BOUNDARY_EVIDENCE),JSON.stringify(evidence,null,2)+'\n');
 assert.ok(output.includes('data-result="PASS"'),report?'Проверка браузера: '+JSON.stringify(report):'Chrome не вернул завершённый результат Cache API');
 assert.equal(report?.checks.length,9,'Браузер не подтвердил все условия');
 assert.equal(wire.filter(x=>x.method==='GET'&&x.path==='/control-no-store').length,1,'Нет точного сетевого GET контрольного ответа');
 assert.equal(wire.filter(x=>x.method==='GET'&&x.path==='/api/v2/feedback/reviews').length,1,'Нет точного сетевого GET ответа BFF');
 console.log(JSON.stringify(evidence));
}finally{
 if(browser?.pid){try{process.kill(-browser.pid,'SIGTERM')}catch{}}
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 // Удаляется только созданный этим тестом дочерний каталог tmp, никогда профиль пользователя.
 assert.equal(dirname(resolve(profile)),resolve(tmpdir()));
 assert.ok(basename(profile).startsWith('nexus-cache-boundary-'));
 await rm(profile,{recursive:true,force:true});
}
