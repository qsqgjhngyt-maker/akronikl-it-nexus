import{bindIntroTransport}from'./helpers/intro-transport.mjs';
import{createStudioService}from'../studio-build/service.mjs';
// Настоящий bootstrap/app/SW/Worker на canonical origin, физически только loopback.
import https from 'node:https';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {GATEWAY_ORIGIN} from '../server-access/bff/account-read.mjs';
import {bindRuntimeTransport} from './helpers/runtime-transport.mjs';
import {QT_BROWSER_PROFILE} from '../sandbox/qt/profile.js';
export async function module6ApplicationFixture({chromiumArgs=[]}={}){
 const frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR),cache=process.env.NEXUS_PINNED_RUNTIME_DIR;
 const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
 const account={account:{accountId:'synthetic-runtime-online',displayName:'Synthetic Runtime',status:'active'},loginMethods:[{id:'synthetic-key',kind:'passkey',status:'active',createdAt:'2026-10-24T00:00:00Z',disabledAt:null}],enrollmentAvailable:false};
 const previewOrigin='https://nexus-cpp-preview.invalid';const requests=[],errors=[],workerEvents=[];const actorFor=req=>req.headers['x-nexus-qa-actor']==='synthetic-teacher'?'synthetic-teacher':'synthetic-runtime-online';
 const studio=await createStudioService({root:process.env.NEXUS_STUDIO_TEST_STORE,image:process.env.NEXUS_QT_IMAGE,allowedOrigin:GATEWAY_ORIGIN,previewOrigin,authenticate:async req=>({accountId:actorFor(req),status:'active',displayName:'SYNTHETIC '+actorFor(req)}),ready:async()=>true,reviewerAssignments:{'synthetic-teacher':['cpp.taskflow-capstone.v1']}});
 const mime=f=>({'.js':'text/javascript','.json':'application/json','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.md':'text/markdown'}[path.extname(f)]||'text/html');
 const tls={key:await readFile(path.join(cache,'qa-key.pem')),cert:await readFile(path.join(cache,'qa-cert.pem'))};const previewServer=https.createServer(tls,(req,res)=>void studio.previewHandler(req,res));await new Promise(resolve=>previewServer.listen(0,'127.0.0.1',resolve));
 const server=https.createServer(tls,async(req,res)=>{
  requests.push({path:new URL(req.url,GATEWAY_ORIGIN).pathname,method:req.method});
  try{const actor=actorFor(req),u=new URL(req.url,GATEWAY_ORIGIN);if(await studio.handler(req,res))return;if(req.method!=='GET'){res.writeHead(403);return res.end('SYNTHETIC_WRITE_DENIED');}
   if(u.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
   if(u.pathname.startsWith('/api/')){let dto,status=200;
    if(u.pathname==='/api/v2/account')dto={...account,account:{...account.account,accountId:actor,displayName:'SYNTHETIC '+actor}};
    else if(u.pathname==='/api/v2/account/profile')dto={...account.account,accountId:actor,displayName:'SYNTHETIC '+actor,username:null,avatar:null,avatarVersion:0};
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
 const browser=await chromium.launch({headless:true,channel:process.env.NEXUS_CHROME_PATH?undefined:'chromium',executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking','--no-proxy-server','--ignore-certificate-errors','--host-resolver-rules=MAP '+hostname+' 127.0.0.1:'+server.address().port+', MAP nexus-cpp-preview.invalid 127.0.0.1:'+previewServer.address().port,...chromiumArgs]});
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1366,height:900}});
 // Отдельный пустой профиль. Тестовый TLS не влияет на браузер владельца/системное доверие.
 await context.route('**/*',async route=>[GATEWAY_ORIGIN,previewOrigin].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
 await bindIntroTransport(context,{frontend,requests});
 await bindRuntimeTransport(context);
 if(process.env.NEXUS_QT_BROWSER_PACK){
  const base=QT_BROWSER_PROFILE.previewUrl.replace('index.html','');
  await context.route(base+'**',async route=>{const name=route.request().url().slice(base.length);if(!/^(index\.html|preview\.js|a11y\.js|profile\.js|verified-pack\.js|qtloader\.js|program\.js|program\.wasm\.bin|headers\.bin)$/.test(name))return route.abort();await route.fulfill({status:200,body:await readFile(path.join(process.env.NEXUS_QT_BROWSER_PACK,name)),headers:{'content-type':name.endsWith('.js')?'text/javascript':name.endsWith('.html')?'text/html':'application/octet-stream','access-control-allow-origin':'*','cross-origin-resource-policy':'cross-origin','cache-control':'no-store'}})});
 }
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
 return{page,context,requests,errors,workerEvents,browserVersion:browser.version(),browserMode:process.env.NEXUS_CHROME_PATH?'system Chrome headless':'bundled Chromium new headless',origin:GATEWAY_ORIGIN,waitReady,studio,async freshLearnerPage(){const c=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844}});await c.route('**/*',r=>[GATEWAY_ORIGIN,previewOrigin].includes(new URL(r.request().url()).origin)?r.continue():r.abort());await bindIntroTransport(c,{frontend,requests});const p=await c.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});return p},async rendererCpu(){const c=await browser.newBrowserCDPSession();try{return(await c.send('SystemInfo.getProcessInfo')).processInfo.filter(p=>p.type==='renderer').map(p=>({id:p.id,cpuTime:p.cpuTime}))}finally{await c.detach()}},async newActorPage(id){if(id!=='synthetic-teacher')throw Error('QA_ACTOR_INVALID');const c=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1366,height:900},extraHTTPHeaders:{'x-nexus-qa-actor':id}});await c.route('**/*',r=>[GATEWAY_ORIGIN,previewOrigin].includes(new URL(r.request().url()).origin)?r.continue():r.abort());await bindIntroTransport(c,{frontend,requests});const p=await c.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});return p},async close(){await studio.close();await browser.close();server.closeAllConnections();previewServer.closeAllConnections();await Promise.all([new Promise(resolve=>server.close(resolve)),new Promise(resolve=>previewServer.close(resolve))]);}};
}
