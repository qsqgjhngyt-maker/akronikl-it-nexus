// Настоящие собранные shell/Account/Studio и декодер Chrome. API — синтетические.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {GATEWAY_ORIGIN as origin} from '../server-access/bff/account-read.mjs';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const candidate=path.resolve(process.env.NEXUS_FRONTEND_DIR),baseline=path.resolve(process.env.NEXUS_BASELINE_DIR),out=path.resolve(process.env.NEXUS_NATIVE_EVIDENCE);
await mkdir(out,{recursive:true});
const key='akronikl:it-nexus:startup-intro:v1',version='cinematic-v1';
const checks=[],errors=[],sessions=[],benchmarks=[];let browser,failure,current;
const check=async(name,fn)=>{const t=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-t)});console.log('PASS '+name)};
const mime=file=>({'.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm'}[path.extname(file)]||'text/html');
async function session({frontend=candidate,width=1440,height=900,reducedMotion='no-preference',pref=null,mediaMode='normal',online=true,deniedStorage=false,noLocks=false}={}){
 const m=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),prefix='/'+m.prefix;
 const context=await browser.newContext({viewport:{width,height},reducedMotion});
 await context.addInitScript(({key,pref,online,deniedStorage,noLocks,mediaMode})=>{
  if(window!==window.top)return;
  if(navigator.serviceWorker)navigator.serviceWorker.register=async()=>{throw Error('SYNTHETIC_SW_DISABLED')};
  Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});Object.defineProperty(navigator,'deviceMemory',{get:()=>8});
  Object.defineProperty(navigator,'connection',{get:()=>({effectiveType:'4g',saveData:false,addEventListener(){}})});
  Object.defineProperty(navigator,'onLine',{get:()=>online});
  if(noLocks)Object.defineProperty(navigator,'locks',{get:()=>undefined});
  if(pref&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(pref));
  if(deniedStorage){const get=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k===key)throw Error('SYNTHETIC_DENIED');return get.call(this,k)}}
  if(mediaMode==='unsupported')HTMLMediaElement.prototype.canPlayType=()=>'';
  if(mediaMode==='webm'){const can=HTMLMediaElement.prototype.canPlayType;HTMLMediaElement.prototype.canPlayType=function(t){return t.includes('mp4')?'':can.call(this,t)}}
  if(mediaMode==='blocked')HTMLMediaElement.prototype.play=()=>Promise.reject(new DOMException('SYNTHETIC_AUTOPLAY','NotAllowedError'));
  window.qaReady=null;
  const observer=new MutationObserver(()=>{if(!window.qaReady&&document.querySelector('#app .visual-shell')&&!document.querySelector('#boot-status'))window.qaReady=performance.now()});
  observer.observe(document,{childList:true,subtree:true});
 },{key,pref,online,deniedStorage,noLocks,mediaMode});
 const record={width,height,frontend:path.basename(frontend),mediaMode,requests:[],api:[],missing:[]};sessions.push(record);
 await context.route('**/*',async route=>{
  const request=route.request(),u=new URL(request.url());
  if(u.origin!==origin){errors.push('Внешний запрос: '+u.origin);return route.abort()}
  if(u.pathname.startsWith('/api/')){
   record.api.push({path:u.pathname,method:request.method()});let status=200,body;
   if(u.pathname==='/api/v2/account')body={account:{accountId:'synthetic-intro',displayName:'Проверка заставки',status:'active'},loginMethods:[{id:'synthetic-key',kind:'passkey',status:'active',createdAt:'2026-10-28T00:00:00Z',disabledAt:null}],enrollmentAvailable:false};
   else if(u.pathname==='/api/v2/account/profile')body={accountId:'synthetic-intro',displayName:'Проверка заставки',status:'active',username:null,avatar:null,avatarVersion:0};
   else if(u.pathname==='/api/v2/account/oauth/providers')body={providers:[]};
   else if(u.pathname==='/api/v2/account/control/capabilities')body={canManage:false,canModerate:false,canPurge:false,freshPasskey:false};
   else if(u.pathname==='/api/v2/content/feed')body={posts:[],home:{}};
   else if(u.pathname==='/api/v2/cloud/me')body={account:{accountId:'synthetic-intro',displayName:'Проверка заставки',status:'active'}};
   else{status=403;body={error:{code:'SYNTHETIC_DENIED'}}}
   await new Promise(r=>setTimeout(r,30));return route.fulfill({status,headers:{'content-type':'application/json','cache-control':'no-store',vary:'*'},body:JSON.stringify(body)});
  }
  const file=u.pathname==='/'?'nexus-shell.html':u.pathname.slice(1),target=path.resolve(frontend,file);
  if(!target.startsWith(frontend+path.sep))return route.abort();
  const optional=file.includes('/intro-media/'),movie=/\.(mp4|webm)$/.test(file);
  if(optional&&mediaMode==='missing')return route.fulfill({status:404,body:''});
  if(movie&&mediaMode==='slow'){await new Promise(r=>setTimeout(r,3500));try{return await route.abort()}catch{return}}
  try{
   const bytes=await readFile(target);await new Promise(r=>setTimeout(r,20));
   const at=request.isNavigationRequest()?{}:await request.frame().evaluate(()=>({now:performance.now(),ready:window.qaReady})).catch(()=>({}));
   record.requests.push({file,bytes:bytes.length,optional,...at});
   return await route.fulfill({status:200,contentType:mime(file),body:bytes});
  }catch(error){record.missing.push(file);return route.fulfill({status:404,body:''}).catch(()=>{})}
 });
 const page=await context.newPage();current=page;page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 return {context,page,record,prefix};
}
const ready=async(s,view='home')=>{await s.page.goto(origin+'/#view='+view,{waitUntil:'domcontentloaded'});await s.page.waitForFunction(()=>window.qaReady>0);return s.page.evaluate(()=>window.qaReady)};
const layer=s=>s.page.locator('[data-startup-intro]');
const dismissed=async s=>{await layer(s).waitFor({state:'detached',timeout:11000})};
const shot=async(s,name)=>s.page.screenshot({path:path.join(out,name+'.png'),fullPage:false});
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking']});
 await check('Desktop: реальное видео без звука, shell готов до media, немедленный skip и повторный старт',async()=>{
  const s=await session();await ready(s);await layer(s).waitFor();
  assert.equal(await layer(s).getAttribute('data-variant'),'desktop');await s.page.locator('.nexus-intro-skip').waitFor({state:'visible'});
  assert.equal(await s.page.locator('.nexus-intro-skip').evaluate(n=>getComputedStyle(n).opacity),'0.55');
  await s.page.waitForFunction(()=>document.querySelector('[data-startup-intro]')?.dataset.playback==='video');
  assert.equal(await s.page.locator('.nexus-intro video').evaluate(v=>v.muted&&v.playsInline&&v.videoWidth===1280&&v.videoHeight===720&&v.currentTime>0),true);
  // Декодирование уже доказано выше. На время hover-снимка останавливаем кадр,
  // чтобы завершение 5-секундного ролика не состязалось с медленным CI renderer.
  await s.page.locator('.nexus-intro video').evaluate(v=>v.pause());await shot(s,'desktop-video');await s.page.locator('.nexus-intro-skip').hover();
  await s.page.waitForFunction(()=>{const n=document.querySelector('.nexus-intro-skip');return n?.matches(':hover')&&getComputedStyle(n).opacity==='1'},null,{timeout:2000});
  // Измеряется освобождение слоя внутри браузера: задержка протокола Playwright
  // и скорость screenshot CI-машины не являются задержкой кнопки пользователя.
  await s.page.locator('.nexus-intro-skip').evaluate(n=>{
   let at;const root=n.closest('[data-startup-intro]');
   n.addEventListener('click',()=>{at=performance.now()},{capture:true,once:true});
   // Listener приложения уже установлен; этот listener вызывается после него.
   // Microtask из capture может выполниться ДО target-listener в Chrome.
   n.addEventListener('click',()=>{window.qaSkipProof={released:!root.isConnected||root.style.pointerEvents==='none',delayMs:performance.now()-at}},{once:true});
  });
  await s.page.locator('.nexus-intro-skip').click();await dismissed(s);s.record.skipProof=await s.page.evaluate(()=>window.qaSkipProof);
  assert.equal(s.record.skipProof.released,true);assert.ok(s.record.skipProof.delayMs<1000);
  const movies=s.record.requests.filter(r=>/\.(mp4|webm)$/.test(r.file));assert.equal(movies.length,1);assert.ok(movies[0].ready>0&&movies[0].now>=movies[0].ready);
  await s.page.reload();await s.page.locator('.visual-home').waitFor();await s.page.waitForTimeout(400);assert.equal(await layer(s).count(),0);assert.equal(s.record.requests.filter(r=>/\.(mp4|webm)$/.test(r.file)).length,1);
  await s.context.close();
 });
 await check('Mobile: вертикальный кадр декодируется, естественный ended завершает сцену',async()=>{
  const s=await session({width:390,height:844});await ready(s);await s.page.waitForFunction(()=>document.querySelector('[data-startup-intro]')?.dataset.playback==='video');
  assert.equal(await layer(s).getAttribute('data-variant'),'mobile');assert.equal(await s.page.locator('.nexus-intro video').evaluate(v=>v.videoWidth===720&&v.videoHeight===1280),true);
  await shot(s,'mobile-video');assert.equal(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await dismissed(s);
  assert.equal(await s.page.locator('.visual-home').count(),1);await s.context.close();
 });
 await check('Планшеты, landscape телефона, поворот и Escape не оставляют блокирующий слой',async()=>{
  for(const [w,h,want]of [[768,1024,'mobile'],[1024,1366,'mobile'],[1366,1024,'desktop'],[844,390,'desktop']]){
   const s=await session({width:w,height:h});await ready(s);await layer(s).waitFor();assert.equal(await layer(s).getAttribute('data-variant'),want);
   await shot(s,'viewport-'+w+'x'+h);await s.page.setViewportSize({width:h,height:w});await dismissed(s);await s.context.close();
  }
  const s=await session();await ready(s);await layer(s).waitFor();await s.page.keyboard.press('Escape');await dismissed(s);await s.context.close();
 });
 await check('Account: переключатели сохраняются, preview явный, projects/progress/cache/IDB целы',async()=>{
  const s=await session({pref:{schema:1,enabled:false,simplified:false,seen:version}});await ready(s,'account');await s.page.locator('[data-intro-settings]').waitFor();
  await s.page.evaluate(async()=>{
   localStorage.setItem('synthetic-project-progress','СОХРАНИТЬ');
   await(await caches.open('synthetic-intro-legacy')).put('/synthetic-preserved',new Response('СОХРАНИТЬ'));
   await new Promise((resolve,reject)=>{const r=indexedDB.open('synthetic-intro-preservation',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,t=db.transaction('files','readwrite');t.objectStore('files').put('int main(){return 42;}','main.cpp');t.oncomplete=()=>{db.close();resolve()}}});
  });
  await s.page.locator('[data-intro-enabled]').check();await s.page.locator('[data-intro-simplified]').check();await shot(s,'account-settings');
  await s.page.locator('[data-intro-preview]').click();await layer(s).waitFor();assert.equal(await layer(s).getAttribute('data-playback'),'poster');await dismissed(s);
  assert.equal(s.record.requests.some(r=>/\.(mp4|webm)$/.test(r.file)),false);
  await s.page.reload();await s.page.locator('[data-intro-settings]').waitFor();assert.equal(await s.page.locator('[data-intro-simplified]').isChecked(),true);assert.equal(await layer(s).count(),0);
  await s.page.locator('[data-intro-simplified]').uncheck();await s.page.locator('[data-intro-preview]').click();await layer(s).waitFor();
  await s.page.evaluate(()=>location.hash='#view=code-studio');await s.page.locator('[data-code-studio-home]').waitFor();await dismissed(s);
  await s.page.locator('[data-cs-action=new]').click();await s.page.locator('[data-cs-new] input[name=title]').fill('Проверка сохранности Intro');await s.page.locator('[data-cs-new] input[value=empty]').check();await s.page.locator('[data-cs-new] button[type=submit]').click();await s.page.locator('#editor').fill('// ПРОЕКТ СОХРАНЁН\nint main(){return 42;}');await s.page.locator('#psSaveProject').click();
  const projectHash=new URL(s.page.url()).hash;await s.page.reload();await s.page.locator('#editor').waitFor();assert.match(await s.page.locator('#editor').inputValue(),/ПРОЕКТ СОХРАНЁН/);assert.equal(new URL(s.page.url()).hash,projectHash);
  const preserved=await s.page.evaluate(async()=>({local:localStorage.getItem('synthetic-project-progress'),cache:await(await(await caches.open('synthetic-intro-legacy')).match('/synthetic-preserved')).text(),idb:await new Promise(resolve=>{const r=indexedDB.open('synthetic-intro-preservation');r.onsuccess=()=>{const db=r.result,q=db.transaction('files').objectStore('files').get('main.cpp');q.onsuccess=()=>{db.close();resolve(q.result)}}})}));
  assert.deepEqual(preserved,{local:'СОХРАНИТЬ',cache:'СОХРАНИТЬ',idb:'int main(){return 42;}'});await shot(s,'code-studio-preserved');await s.context.close();
 });
 await check('Reduced motion / simplified / offline: видео не запрашивается, постер быстро закрывается',async()=>{
  for(const opts of [{reducedMotion:'reduce'},{pref:{schema:1,enabled:true,simplified:true,seen:''}},{online:false}]){
   const s=await session(opts);await ready(s);await layer(s).waitFor();assert.equal(await layer(s).getAttribute('data-playback'),'poster');await shot(s,opts.online===false?'offline-fallback':opts.reducedMotion?'reduced-motion':'simplified');await dismissed(s);
   assert.equal(s.record.requests.some(r=>/\.(mp4|webm)$/.test(r.file)),false);if(opts.online===false)assert.equal(s.record.requests.some(r=>r.optional),false);await s.context.close();
  }
 });
 await check('404, slow media, autoplay rejection и отсутствие codec не мешают shell',async()=>{
  for(const mediaMode of ['missing','slow','blocked','unsupported']){
   const s=await session({mediaMode});await ready(s);await layer(s).waitFor();await s.page.waitForFunction(()=>document.querySelector('[data-startup-intro]')?.dataset.playback==='poster');await dismissed(s);assert.equal(await s.page.locator('.visual-home').count(),1);await s.context.close();
  }
 });
 await check('WebM fallback воспроизводится настоящим декодером',async()=>{
  const s=await session({mediaMode:'webm'});await ready(s);await s.page.waitForFunction(()=>document.querySelector('[data-startup-intro]')?.dataset.playback==='video');assert.match(await s.page.locator('.nexus-intro video').getAttribute('src'),/\.webm$/);await s.page.keyboard.press('Escape');await dismissed(s);await s.context.close();
 });
 await check('Недоступный storage, выключенная настройка, уже просмотренная версия и отсутствие locks: нет автопоказа',async()=>{
  for(const opts of [{deniedStorage:true},{noLocks:true},{pref:{schema:1,enabled:false,simplified:false,seen:''}},{pref:{schema:1,enabled:true,simplified:false,seen:version}},{pref:{schema:99}}]){
   const s=await session(opts);await ready(s);await s.page.waitForTimeout(350);assert.equal(await layer(s).count(),0);assert.equal(s.record.requests.some(r=>r.optional),false);await s.context.close();
  }
 });
 await check('Две вкладки используют один маркер показа',async()=>{
  const s=await session();await ready(s);await layer(s).waitFor();const p=await s.context.newPage();await p.goto(origin+'/#view=home');await p.locator('.visual-home').waitFor();await p.waitForTimeout(350);assert.equal(await p.locator('[data-startup-intro]').count(),0);await s.context.close();
 });
 await check('Парные cold-start замеры Home / Academy / Code Studio ДО и ПОСЛЕ',async()=>{
  for(let i=0;i<7;i++)for(const view of ['home','academy','code-studio'])for(const frontend of (i%2?[candidate,baseline]:[baseline,candidate])){
   const s=await session({frontend});const readyMs=await ready(s,view);const entries=await s.page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:r.name,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,start:r.startTime})));
   const before=s.record.requests.filter(r=>r.now<=readyMs);benchmarks.push({iteration:i,view,build:path.basename(frontend),readyMs,preReadyRequests:before.length,preReadyBytes:before.reduce((n,r)=>n+r.bytes,0),introBeforeReady:before.some(r=>/startup-intro|intro-media/.test(r.file)),entries});await s.context.close();
  }
  assert.equal(benchmarks.some(r=>r.introBeforeReady),false);
 });
 assert.deepEqual(errors,[]);assert.equal(sessions.some(s=>s.api.some(r=>r.method!=='GET')),false);
}catch(e){failure={message:e.message,stack:e.stack};console.error(e);if(current&&!current.isClosed())await current.screenshot({path:path.join(out,'failure.png')}).catch(()=>{})}
finally{await browser?.close();await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:failure?'FAIL':'PASS',checks,failure,errors,benchmarks,sessions,syntheticAPI:true,physical:false,production:false,realDecoder:true},null,2)+'\n');if(failure)process.exitCode=1}
