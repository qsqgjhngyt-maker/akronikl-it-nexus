// Настоящие HTTP/Range, throttle Chrome и presented frames. API/аккаунтов здесь нет.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {withStartupCover} from '../core/startup-intro-cover.js';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const candidate=path.resolve(process.env.NEXUS_FRONTEND_DIR),baseline=path.resolve(process.env.NEXUS_BASELINE_DIR),out=path.resolve(process.env.NEXUS_NATIVE_EVIDENCE);
await mkdir(out,{recursive:true});
const key='akronikl:it-nexus:startup-intro:v1',rows=[],runs=[],requests=[];
const manifest=async root=>JSON.parse(await readFile(path.join(root,'BUILD_MANIFEST.json')));
const generations={candidate:(await manifest(candidate)).assetGeneration,baseline:(await manifest(baseline)).assetGeneration};
const mime=f=>({'.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.mp4':'video/mp4','.webm':'video/webm','.html':'text/html'}[path.extname(f)]||'application/octet-stream');
let browser,failure,activeRoot=candidate,activeKind='candidate',delayJS=0,brokenJS=false;
const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost'),file=u.pathname.slice(1),generation=generations[activeKind];
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return}
 if(u.pathname==='/fixture.html'){
  let html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#060b14;color:white"><canvas id="galaxy" style="position:fixed;inset:0"></canvas><main class="entry-shell" style="position:relative"><h1>Проверка параллельной оболочки</h1><button id="working">Рабочий интерфейс</button></main><footer class="entry-footer"></footer><script type="module" src="/fixture.js"></script></body></html>';
  res.writeHead(200,{'content-type':'text/html','cache-control':'no-store','content-security-policy':"default-src 'self';script-src 'self';style-src 'self' 'unsafe-inline';media-src 'self';object-src 'none'"}).end(withStartupCover(html));return;
 }
 if(u.pathname==='/fixture.js'){
  if(brokenJS){res.writeHead(404).end();return}if(delayJS)await new Promise(r=>setTimeout(r,delayJS));
  res.writeHead(200,{'content-type':'text/javascript','cache-control':'no-store'}).end(`import {initGalaxy} from '/entry-assets/${generation}/galaxy.js';import {installStartupIntro} from '/releases/${generation}/core/startup-intro.js';window.__galaxy=initGalaxy(document.querySelector('#galaxy'));window.__shellReady=performance.now();await installStartupIntro({surface:'entry',videoBase:location.origin+'/intro-media/cinematic-v4/'});`);return;
 }
 const target=path.resolve(activeRoot,file);if(!target.startsWith(activeRoot+path.sep)){res.writeHead(403).end();return}
 const bytes=await readFile(target),headers={'content-type':mime(file),'cache-control':'no-store','accept-ranges':'bytes','access-control-allow-origin':'*'};
 const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);let body=bytes,status=200;
 if(range){const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):bytes.length-1,bytes.length-1);if(start>=bytes.length){res.writeHead(416,{'content-range':'bytes */'+bytes.length}).end();return}body=bytes.subarray(start,end+1);headers['content-range']=`bytes ${start}-${end}/${bytes.length}`;status=206}
 headers['content-length']=String(body.length);requests.push({kind:activeKind,file,status,bytes:body.length,range:req.headers.range||null});res.writeHead(status,headers);res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404).end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
async function session({old=false,mobile=false,mbps=0,cpu=1,delay=0,broken=false,noJS=false,off=false}={}){
 activeKind=old?'baseline':'candidate';activeRoot=old?baseline:candidate;delayJS=delay;brokenJS=broken;
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},javaScriptEnabled:!noJS});
 await context.addInitScript(({key,off})=>{
  if(off)localStorage.setItem(key,JSON.stringify({schema:1,enabled:false,simplified:false,seen:'cinematic-v3'}));
  window.__events=[];window.__frames=[];window.__logo=[];window.__finishes=[];window.__draws=0;window.__activeDraws=0;window.__exposed=[];
  const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...a){if(this.canvas.id==='galaxy'){__draws++;if(document.documentElement.dataset.nexusIntroActive==='true')__activeDraws++}return clear.apply(this,a)};
  const attached=new WeakSet();new MutationObserver(()=>{for(const video of document.querySelectorAll('[data-startup-intro] video'))if(!attached.has(video)){attached.add(video);let prior;
   const frame=(at,m)=>{if(!video.paused&&video.hasAttribute('data-current')&&m.mediaTime>0){__frames.push({at,media:m.mediaTime,presented:m.presentedFrames,src:video.currentSrc,gap:window.__lastActiveFrame?at-window.__lastActiveFrame:0});window.__lastActiveFrame=at}video.requestVideoFrameCallback(frame)};video.requestVideoFrameCallback?.(frame);
   for(const type of ['playing','waiting','stalled','ended','error','emptied'])video.addEventListener(type,()=>__events.push({type,at:performance.now(),media:video.currentTime,src:video.currentSrc,quality:video.getVideoPlaybackQuality?.()}));
  }}).observe(document,{childList:true,subtree:true});
  const sample=()=>{const intro=document.querySelector('[data-startup-intro]'),v=intro?.querySelector('video[data-current]')||intro?.querySelector('video'),word=intro?.querySelector('.nexus-intro-wordmark');if(word)__logo.push({time:v.currentTime,opacity:Number(getComputedStyle(word).opacity),phase:intro.dataset.phase});if(!__finishes.length&&document.querySelector('.entry-shell')){const hit=document.elementFromPoint(innerWidth*.5,innerHeight*.5);__exposed.push({at:performance.now(),exposed:!hit?.closest('[data-startup-cover],[data-startup-intro]')})}requestAnimationFrame(sample)};requestAnimationFrame(sample);
  addEventListener('nexus:intro-video-ended',e=>window.__end={...e.detail,at:performance.now()});addEventListener('nexus:intro-finished',e=>__finishes.push({...e.detail,at:performance.now()}));
 },{key,off});
 const page=await context.newPage();page.setDefaultTimeout(20000);await page.bringToFront();
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');if(mbps)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:mbps*1000000/8,uploadThroughput:1000000/8});if(cpu!==1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
 return{context,page,cdp,open:()=>page.goto(origin+'/fixture.html',{waitUntil:'commit'}),async close(){await context.close()}};
}
const playing=s=>s.page.waitForFunction(()=>document.querySelector('[data-startup-intro]')?.dataset.playback==='video');
const done=s=>s.page.waitForFunction(()=>__finishes.length,null,{timeout:35000});
const screenshot=async(s,name)=>{const {data}=await s.cdp.send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(out,name+'.png'),Buffer.from(data,'base64'))};
const check=async(name,fn)=>{await fn();rows.push({name,status:'PASS'});console.log('PASS '+name)};
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking']});
 await check('Тёмный первый кадр при задержке JS и нативный пропуск до загрузки',async()=>{
  const s=await session({delay:1800});await s.open();await s.page.locator('[data-startup-cover]>summary').waitFor();await screenshot(s,'first-paint-dark');await s.page.locator('[data-startup-cover]>summary').click();await s.page.waitForTimeout(2300);assert.equal(await s.page.locator('[data-startup-intro]').count(),0);await s.close();
 });
 await check('Без JavaScript интерфейс доступен; при ошибке модуля покрытие отпускает его через12с',async()=>{
  const n=await session({noJS:true});await n.open();await n.page.locator('.entry-shell').waitFor();assert.equal(await n.page.locator('[data-startup-cover]').isVisible(),false);await n.close();const s=await session({broken:true});await s.open();await s.page.locator('[data-startup-cover]').waitFor();await s.page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-startup-cover]')).visibility==='hidden',null,{timeout:15000});await s.close();
 });
 for(const mobile of [false,true])for(const old of [true,false])await check(`${old?'База':'Кандидат'} ${mobile?'Mobile':'Desktop'}: полный ролик при8Mbps/CPU×4`,async()=>{
  const s=await session({old,mobile,mbps:8,cpu:4});await s.open();await playing(s);if(!old)assert.equal(await s.page.locator('[data-startup-intro] video').count(),1);
  await done(s);const record=await s.page.evaluate(()=>({events:__events,frames:__frames,logo:__logo,finishes:__finishes,end:__end,draws:__draws,activeDraws:__activeDraws,shellReady:__shellReady,exposed:__exposed}));
  record.old=old;record.mobile=mobile;record.networkMbps=8;record.cpuSlowdown=4;
  const frames=record.frames,validGaps=frames.filter(x=>x.gap>0).map(x=>x.gap).sort((a,b)=>a-b),first=record.events.find(x=>x.type==='playing');
  record.metrics={presentedFrames:frames.length,maxFrameGapMs:Math.max(0,...validGaps),p95FrameGapMs:validGaps[Math.floor(validGaps.length*.95)]||0,waitingAfterStart:record.events.filter(x=>x.type==='waiting'&&x.at>first.at+100).length,sources:[...new Set(frames.map(x=>x.src))].length,timeToFirstPlayingMs:first.at};
  runs.push(record);assert.equal(record.finishes.at(-1).reason,'ended');assert.ok(record.end.playedSeconds>=(mobile?7.95:9.95));assert.ok(record.finishes.at(-1).at-record.end.at>=1750);
  if(!old){assert.equal(record.metrics.sources,1);assert.equal(record.activeDraws,0);assert.equal(record.metrics.waitingAfterStart,0,'Непрерывное видео не должно прерываться в выбранном профиле');assert.ok(record.shellReady<first.at);if(mobile){assert.ok(record.logo.filter(x=>x.time>1&&x.time<5.9).every(x=>x.opacity===0));assert.ok(record.logo.some(x=>x.time>6&&x.time<7.5&&x.opacity>0&&x.opacity<1));assert.ok(record.logo.some(x=>x.time>7.5&&x.opacity>.99))}}
  const before=record.draws;await s.page.waitForTimeout(250);assert.ok(await s.page.evaluate(()=>__draws)>before,'Декоративный фон должен возобновиться');await screenshot(s,`${old?'before':'after'}-${mobile?'mobile':'desktop'}-complete`);await s.close();
 });
 await check('Мобильный логотип отсутствует в начале, проявляется в финале и плавно гаснет',async()=>{
  const s=await session({mobile:true});await s.open();await playing(s);await s.page.waitForFunction(()=>document.querySelector('[data-startup-intro] video').currentTime>1);assert.equal(await s.page.locator('.nexus-intro-wordmark').evaluate(n=>getComputedStyle(n).opacity),'0');await screenshot(s,'mobile-start-no-logo');await s.page.waitForFunction(()=>document.querySelector('[data-startup-intro] video').currentTime>7.5);await screenshot(s,'mobile-final-logo');const box=await s.page.locator('.nexus-intro-wordmark').boundingBox();assert.ok(box.x>=20&&box.x+box.width<=370&&box.y+box.height<810);await s.page.waitForFunction(()=>document.querySelector('[data-startup-intro]')?.dataset.phase==='fade-video');await s.page.waitForTimeout(450);const alpha=await s.page.locator('.nexus-intro-wordmark').evaluate(n=>Number(getComputedStyle(n).opacity));assert.ok(alpha>0&&alpha<1);await done(s);await s.close();
 });
 await check('Слишком медленный канал даёт ограниченный fallback, оболочка загружается независимо',async()=>{
  const s=await session({mbps:1});await s.open();await done(s);assert.equal(await s.page.evaluate(()=>__finishes.at(-1).reason),'fallback');assert.ok(await s.page.evaluate(()=>__shellReady)<8000);await s.close();
 });
 await check('Отключение заставки не меняет настройку и не запускает video',async()=>{
  const s=await session({off:true});await s.open();await s.page.waitForFunction(()=>window.__shellReady);await s.page.waitForTimeout(500);assert.equal(await s.page.locator('[data-startup-intro]').count(),0);assert.equal(await s.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).enabled,key),false);await s.close();
 });
}catch(error){failure={message:error.message,stack:error.stack};console.error(error)}finally{
 await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:failure?'FAIL':'PASS',rows,runs,requests,failure,physicalDevice:false,realHTTP:true,production:false},null,2)+'\n');if(failure)process.exitCode=1;
}
