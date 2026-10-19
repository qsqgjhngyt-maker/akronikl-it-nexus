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
let feedback,browser,browserExit,cdp,chromeExit=null,report=null,failure=null,stderrBytes=0;
const deadline=new AbortController();
const bounded=promise=>{
 if(deadline.signal.aborted)return Promise.reject(deadline.signal.reason);
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(deadline.signal.reason);
  deadline.signal.addEventListener('abort',abort,{once:true});
  Promise.resolve(promise).then(resolve,reject).finally(()=>deadline.signal.removeEventListener('abort',abort));
 });
};
async function connectCDP(endpoint){
 const socket=new WebSocket(endpoint);
 const pending=new Map(),events=[],waiters=new Set();
 let nextId=0,closed=false;
 socket.addEventListener('message',event=>{
  let message;try{message=JSON.parse(event.data)}catch{return}
  if(message.id){
   const request=pending.get(message.id);if(!request)return;
   pending.delete(message.id);
   if(message.error)request.reject(Error('CDP '+request.method+': '+JSON.stringify(message.error)));else request.resolve(message.result);
  }else if(message.method){
   events.push(message);if(events.length>300)events.shift();
   for(const waiter of waiters)if(waiter.matches(message)){waiters.delete(waiter);waiter.resolve(message)}
  }
 });
 const disconnected=()=>{
  closed=true;
  for(const request of pending.values())request.reject(Error('Соединение CDP закрыто до ответа '+request.method));
  pending.clear();
  for(const waiter of waiters)waiter.reject(Error('Соединение CDP закрыто до события '+waiter.method));
  waiters.clear();
 };
 socket.addEventListener('close',disconnected);
 socket.addEventListener('error',disconnected);
 await bounded(new Promise((resolve,reject)=>{
  socket.addEventListener('open',resolve,{once:true});
  socket.addEventListener('error',()=>reject(Error('Не удалось подключиться к локальному CDP')),{once:true});
 }));
 return {
  send(method,params={},sessionId){
   if(closed)return Promise.reject(Error('Соединение CDP уже закрыто'));
   return new Promise((resolve,reject)=>{
    const id=++nextId;pending.set(id,{resolve,reject,method});
    try{socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}))}catch(error){pending.delete(id);reject(error)}
   });
  },
  waitFor(method,predicate){
   const matches=message=>message.method===method&&predicate(message);
   const previous=events.find(matches);if(previous)return Promise.resolve(previous);
   if(closed)return Promise.reject(Error('Соединение CDP уже закрыто'));
   return new Promise((resolve,reject)=>waiters.add({method,matches,resolve,reject}));
  },
  close(){socket.close()}
 };
}
const page=`<!doctype html><html data-result="RUNNING"><meta charset="utf-8"><title>Изолированная проверка Cache API</title><body><pre id="result"></pre><script>
globalThis.cacheBoundaryResult=(async()=>{
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
  return report;
 }catch(error){const report={status:'FAIL',failed:String(error.message),checks};document.querySelector('#result').textContent=JSON.stringify(report);document.documentElement.dataset.result='FAIL';return report}
})();
</script></body></html>`;
const server=http.createServer(async(req,res)=>{
 wire.push({method:req.method,path:req.url});
 if(req.url==='/api/v2/feedback/reviews')return feedback(req,res);
 if(req.url==='/control-no-store'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(controlBody));return}
 if(req.url==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(page);return}
 res.writeHead(404,{'cache-control':'no-store'});res.end();
});
const timeout=setTimeout(()=>{
 deadline.abort(Error('Chrome не завершил проверку за 45 секунд'));
 if(browser?.pid){try{process.kill(-browser.pid,'SIGKILL')}catch{}}
},45000);
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const origin='http://127.0.0.1:'+server.address().port;
 feedback=createFeedbackHandler({env:{FEEDBACK_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',FEEDBACK_GATEWAY_ORIGIN:origin},fetchImpl:async()=>Response.json(privateBody)});
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--disable-default-apps','--no-first-run','--no-default-browser-check','--user-data-dir='+profile,'--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','about:blank'];
 const endpointPromise=new Promise((resolve,reject)=>{
  let stderrTail='';
  browser=spawn(chrome,args,{stdio:['ignore','ignore','pipe'],detached:true});
  browserExit=new Promise(resolveExit=>browser.once('close',(code,signal)=>{chromeExit={code,signal};resolveExit(chromeExit);reject(Error('Chrome завершился до подключения CDP: '+JSON.stringify(chromeExit)))}));
  browser.stderr.on('data',part=>{
   stderrBytes+=part.length;stderrTail=(stderrTail+part.toString('utf8')).slice(-65536);
   const endpoint=stderrTail.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[A-Za-z0-9-]+)/)?.[1];
   if(endpoint)resolve(endpoint);
  });
  browser.once('error',reject);
 });
 cdp=await connectCDP(await bounded(endpointPromise));
 const {targetId}=await bounded(cdp.send('Target.createTarget',{url:'about:blank'}));
 const {sessionId}=await bounded(cdp.send('Target.attachToTarget',{targetId,flatten:true}));
 await bounded(cdp.send('Page.enable',{},sessionId));
 await bounded(cdp.send('Page.setLifecycleEventsEnabled',{enabled:true},sessionId));
 const navigation=await bounded(cdp.send('Page.navigate',{url:origin+'/'},sessionId));
 assert.ok(!navigation.errorText,'Навигация Chrome: '+navigation.errorText);
 assert.ok(navigation.loaderId,'CDP не вернул loaderId новой страницы');
 await bounded(cdp.waitFor('Page.lifecycleEvent',event=>event.sessionId===sessionId&&event.params.loaderId===navigation.loaderId&&event.params.name==='load'));
 // Ожидается сам Promise Cache API; завершение загрузки HTML его не заменяет.
 const evaluation=await bounded(cdp.send('Runtime.evaluate',{expression:'globalThis.cacheBoundaryResult',awaitPromise:true,returnByValue:true},sessionId));
 assert.ok(!evaluation.exceptionDetails,'Ошибка исполнения браузерной проверки: '+JSON.stringify(evaluation.exceptionDetails));
 report=evaluation.result?.value??null;
 assert.equal(report?.status,'PASS','Проверка браузера: '+JSON.stringify(report));
 assert.equal(report?.checks.length,9,'Браузер не подтвердил все условия');
 assert.equal(wire.filter(x=>x.method==='GET'&&x.path==='/control-no-store').length,1,'Нет точного сетевого GET контрольного ответа');
 assert.equal(wire.filter(x=>x.method==='GET'&&x.path==='/api/v2/feedback/reviews').length,1,'Нет точного сетевого GET ответа BFF');
 // Chrome закрывается только после получения результата всех асинхронных проверок.
 try{await bounded(cdp.send('Browser.close'))}catch(error){if(deadline.signal.aborted)throw error}
 await bounded(browserExit);
 assert.equal(chromeExit.code,0,'Chrome завершился с ошибкой: '+JSON.stringify(chromeExit));
}catch(error){
 failure=error;
}finally{
 clearTimeout(timeout);
 cdp?.close();
 if(browser?.pid&&!chromeExit){try{process.kill(-browser.pid,'SIGKILL')}catch{}if(browserExit)await browserExit;}
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 // Удаляется только созданный этим тестом дочерний каталог tmp, никогда профиль пользователя.
 assert.equal(dirname(resolve(profile)),resolve(tmpdir()));
 assert.ok(basename(profile).startsWith('nexus-cache-boundary-'));
 await rm(profile,{recursive:true,force:true});
 const wireChecks={oneControlGET:wire.filter(x=>x.method==='GET'&&x.path==='/control-no-store').length===1,oneBffGET:wire.filter(x=>x.method==='GET'&&x.path==='/api/v2/feedback/reviews').length===1};
 const evidence={...report,status:!failure&&report?.status==='PASS'&&Object.values(wireChecks).every(Boolean)?'PASS':'FAIL',...(failure?{failure:String(failure.message)}:{}),wireChecks,wire,chromeExit,stderrBytes,controlProtocol:'CDP Runtime.evaluate awaitPromise',syntheticOnly:true,windowsBrowserLaunches:0,realAccounts:0,serviceWorkerRegistrations:0};
 if(process.env.CACHE_BOUNDARY_EVIDENCE)await writeFile(resolve(process.env.CACHE_BOUNDARY_EVIDENCE),JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify(evidence));
}
if(failure)throw failure;
