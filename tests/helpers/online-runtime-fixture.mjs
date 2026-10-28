// Настоящий bootstrap/app/SW/Worker на canonical origin, физически только loopback.
import https from 'node:https';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {GATEWAY_ORIGIN} from '../../server-access/bff/account-read.mjs';
import {bindRuntimeTransport} from './runtime-transport.mjs';
export async function onlineRuntimeFixture({chromiumArgs=[]}={}){
 const frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR),cache=process.env.NEXUS_PINNED_RUNTIME_DIR;
 const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
 const account={account:{accountId:'synthetic-runtime-online',displayName:'Synthetic Runtime',status:'active'},loginMethods:[{id:'synthetic-key',kind:'passkey',status:'active',createdAt:'2026-10-24T00:00:00Z',disabledAt:null}],enrollmentAvailable:false};
 const requests=[],errors=[],workerEvents=[];
 const mime=f=>({'.js':'text/javascript','.json':'application/json','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.md':'text/markdown','.mp4':'video/mp4','.webm':'video/webm','.jpg':'image/jpeg'}[path.extname(f)]||'text/html');
 const server=https.createServer({key:await readFile(path.join(cache,'qa-key.pem')),cert:await readFile(path.join(cache,'qa-cert.pem'))},async(req,res)=>{
  requests.push({path:new URL(req.url,GATEWAY_ORIGIN).pathname,method:req.method});
  try{const u=new URL(req.url,GATEWAY_ORIGIN);if(req.method!=='GET'){res.writeHead(403);return res.end('SYNTHETIC_WRITE_DENIED');}
   if(u.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
   if(u.pathname.startsWith('/api/')){let dto,status=200;
    if(u.pathname==='/api/v2/account')dto=account;
    else if(u.pathname==='/api/v2/account/profile')dto={...account.account,username:null,avatar:null,avatarVersion:0};
    else if(u.pathname==='/api/v2/account/control/capabilities')dto={canManage:false,canModerate:false,canPurge:false,freshPasskey:false};
    else if(u.pathname==='/api/v2/content/feed')dto={posts:[],home:{}};
    else if(u.pathname==='/api/v2/feedback/reviews')dto={reviews:[],ratings:0,average:0,total:0};
    else{dto={error:{code:'SYNTHETIC_DENIED'}};status=403;}
    res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',vary:'*'});return res.end(JSON.stringify(dto));
   }
   const name=u.pathname==='/'?'nexus-shell.html':u.pathname.slice(1),file=path.resolve(frontend,name);if(!file.startsWith(frontend+path.sep))throw Error('PATH');
   const bytes=await readFile(file);res.writeHead(200,{'content-type':mime(name),'cache-control':'public, max-age=0'});res.end(bytes);
  }catch{res.writeHead(404);res.end('SYNTHETIC_NOT_FOUND');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const hostname=new URL(GATEWAY_ORIGIN).hostname;
 const browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking','--no-proxy-server','--ignore-certificate-errors','--host-resolver-rules=MAP '+hostname+' 127.0.0.1:'+server.address().port,...chromiumArgs]});
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1366,height:900}});
 // Отдельный пустой профиль. Тестовый TLS не влияет на браузер владельца/системное доверие.
 await context.route('**/*',async route=>new URL(route.request().url()).origin===GATEWAY_ORIGIN?route.continue():route.abort());
 // Четыре публичных video URL читаются из точной QA-сборки, без live CDN.
 // Все прочие внешние запросы по-прежнему запрещены; errors не фильтруются.
 await context.route('https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/intro-media/cinematic-v4/**',async route=>{
  const req=route.request(),u=new URL(req.url()),headers=await req.allHeaders();
  assert.match(u.href,/^https:\/\/qsqgjhngyt-maker\.github\.io\/akronikl-it-nexus\/intro-media\/cinematic-v4\/(?:desktop|mobile)\.(?:mp4|webm)$/);
  assert.equal(req.method(),'GET');assert.equal(Boolean(headers.cookie||headers.authorization),false,'Публичное видео не получает credentials');
  const file=u.pathname.replace('/akronikl-it-nexus/','');requests.push({path:u.pathname,method:req.method(),publicMediaFixture:true});
  await route.fulfill({status:200,headers:{'content-type':file.endsWith('.mp4')?'video/mp4':'video/webm','access-control-allow-origin':'*','cache-control':'no-store'},body:await readFile(path.join(frontend,file))});
 });
 await bindRuntimeTransport(context);
 await context.route('https://felixhao28.github.io/JSCPP/dist/JSCPP.es5.min.js',async route=>route.fulfill({status:200,contentType:'application/javascript',body:await readFile(process.env.NEXUS_JSCPP_FIXTURE)}));
 const page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
 page.on('console',message=>{if(message.type()==='error')errors.push('console: '+message.text());});
 const cdp=await context.newCDPSession(page);await cdp.send('ServiceWorker.enable');
 cdp.on('ServiceWorker.workerErrorReported',e=>errors.push('SW: '+e.errorMessage.errorMessage));
 cdp.on('ServiceWorker.workerVersionUpdated',e=>workerEvents.push(...e.versions.map(v=>({status:v.status,runningStatus:v.runningStatus,scriptURL:v.scriptURL}))));
 async function waitReady(){
  const until=Date.now()+30000;let last;
  while(Date.now()<until){last=await page.evaluate(()=>new Promise(resolve=>{const worker=navigator.serviceWorker.controller;if(!worker)return resolve(null);const channel=new MessageChannel(),timer=setTimeout(()=>resolve(null),10000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data)};worker.postMessage({type:'nexus-pwa-status'},[channel.port2]);}));if(last?.publicReady===true)return last;await page.waitForTimeout(100);}
  throw Error('ONLINE_PUBLIC_PWA_NOT_READY '+JSON.stringify({last,errors,workerEvents}));
 }
 return{page,context,requests,errors,workerEvents,origin:GATEWAY_ORIGIN,waitReady,async close(){await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
