// Реальные Chrome/MP4/WebM и собранные документы entry/shell; Account синтетический.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {RUNTIME_GRAPH_ID} from '../pwa/runtime-manifest.js';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const root=path.resolve(import.meta.dirname,'..'),candidate=path.resolve(process.env.NEXUS_FRONTEND_DIR),baseline=path.resolve(process.env.NEXUS_BASELINE_DIR),out=path.resolve(process.env.NEXUS_NATIVE_EVIDENCE);
await mkdir(out,{recursive:true});
const origin='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net',key='akronikl:it-nexus:startup-intro:v1',handoff='akronikl:it-nexus:startup-intro:auth-handoff:v1';
const rows=[],sessions=[],errors=[],measurements=[];let browser,fatal,current;
const check=async(name,fn)=>{const t=performance.now();await fn();rows.push({name,status:'PASS',ms:Math.round(performance.now()-t)});console.log('PASS '+name)};
const mime=f=>({'.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm'}[path.extname(f)]||'text/html');
async function session({frontend=candidate,surface='shell',width=1440,height=900,pref={schema:1,enabled:true,simplified:false,seen:'cinematic-v1'},accountDelay=250,guest=false,mediaDelay=0,missing=false,hidden=false,reducedMotion='no-preference',noLocks=false,lowDevice=false,oauth=false,online=true,descriptorBad=false,codec='auto',logout=false}={}){
 const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),state={surface,guest},record={surface,width,height,frontend:path.basename(frontend),requests:[],writes:[],syntheticLogouts:0};sessions.push(record);
 const context=await browser.newContext({viewport:{width,height},reducedMotion});
 await context.addInitScript(({key,handoff,pref,hidden,noLocks,lowDevice,online,oauth,graph,codec})=>{
  if(window!==window.top)return;
  if(pref&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(pref));
  if(oauth)sessionStorage.setItem(handoff,JSON.stringify({schema:1,kind:'auth-navigation',at:Date.now()}));
  window.__testHidden=hidden;Object.defineProperty(document,'hidden',{get:()=>window.__testHidden});
  Object.defineProperty(navigator,'onLine',{get:()=>online});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>lowDevice?2:8});Object.defineProperty(navigator,'deviceMemory',{get:()=>lowDevice?2:8});
  Object.defineProperty(navigator,'connection',{get:()=>({effectiveType:lowDevice?'3g':'4g',saveData:false,addEventListener(){}})});
  if(noLocks)Object.defineProperty(navigator,'locks',{get:()=>undefined});
  if(codec==='webm'){const can=HTMLMediaElement.prototype.canPlayType;HTMLMediaElement.prototype.canPlayType=function(t){return t.includes('mp4')?'':can.call(this,t)}}
  if(navigator.serviceWorker){Object.defineProperty(navigator.serviceWorker,'controller',{get:()=>({postMessage(_r,ports){ports[0].postMessage({protocol:'nexus-verified-public-v1',graphId:graph,publicReady:true})}})});navigator.serviceWorker.register=async()=>{throw Error('SYNTHETIC_SW_DISABLED')}}
  window.__introFinishes=[];window.__introAt=null;window.__appAt=null;window.__introVideoEnd=null;window.__fadeIn=[];
  addEventListener('nexus:intro-finished',e=>window.__introFinishes.push({...e.detail,at:performance.now()}));
  addEventListener('nexus:intro-video-ended',e=>{const video=(document.querySelector('[data-startup-intro] video[data-current]')||document.querySelector('[data-startup-intro] video'));window.__introVideoEnd={...e.detail,at:performance.now(),source:video.currentSrc,opacity:Number(getComputedStyle(video.closest('.nexus-intro-visual')||video).opacity),phase:video.closest('dialog').dataset.phase,frames:video.getVideoPlaybackQuality?.().totalVideoFrames}});
  document.addEventListener('playing',e=>{if(window.__fadeIn.length||!e.target.matches?.('[data-startup-intro] video'))return;const v=e.target;const sample=()=>window.__fadeIn.push({at:performance.now(),opacity:Number(getComputedStyle(v.closest('.nexus-intro-visual')||v).opacity)});requestAnimationFrame(sample);setTimeout(sample,350);setTimeout(sample,1350)},{capture:true});
  new MutationObserver(()=>{if(!window.__introAt&&document.querySelector('[data-startup-intro]'))window.__introAt=performance.now();if(!window.__appAt&&document.querySelector('#app .visual-shell'))window.__appAt=performance.now()}).observe(document,{childList:true,subtree:true});
 },{key,handoff,pref,hidden,noLocks,lowDevice,online,oauth,graph:RUNTIME_GRAPH_ID,codec});
 await context.route('**/*',async route=>{try{
  const req=route.request(),u=new URL(req.url()),cdn=u.origin==='https://qsqgjhngyt-maker.github.io'&&!u.search&&/^\/akronikl-it-nexus\/intro-media\/(?:cinematic-v4\/(?:desktop|mobile)\.(?:mp4|webm)|cinematic-v3\/mobile\/(?:mp4\/part-00[0-3]\.mp4|webm\/part-00[0-3]\.webm))$/.test(u.pathname);if(u.origin!==origin&&!cdn){errors.push('Внешний запрос '+u.origin);return route.abort()}
  if(logout&&req.method()==='POST'&&u.pathname==='/api/v2/account/passkey/logout'){state.guest=true;state.surface='entry';record.syntheticLogouts++;return route.fulfill({status:200,contentType:'application/json',body:'{}'})}
  if(!['GET','HEAD'].includes(req.method())){record.writes.push(u.pathname);return route.abort()}
  if(u.pathname.startsWith('/api/')){
   await new Promise(r=>setTimeout(r,accountDelay));let status=200,body;
   if(u.pathname==='/api/v2/account'){
    if(state.guest){status=401;body={error:{code:'SESSION_REQUIRED'}}}
    else body={account:{accountId:'synthetic-launch',displayName:'Проверка запуска',status:'active'},loginMethods:[{id:'synthetic-key',kind:'passkey',status:'active',createdAt:'2026-10-28T00:00:00Z',disabledAt:null}],enrollmentAvailable:false};
   }else if(u.pathname==='/api/v2/account/profile')body={accountId:'synthetic-launch',displayName:'Проверка запуска',status:'active',username:null,avatar:null,avatarVersion:0};
   else if(u.pathname==='/api/v2/account/oauth/providers')body={providers:[]};
   else if(u.pathname==='/api/v2/account/control/capabilities')body={canManage:false,canModerate:false,canPurge:false,freshPasskey:false};
   else if(u.pathname==='/api/v2/content/feed')body={posts:[],home:{}};
   else if(u.pathname==='/api/v2/cloud/me')body={account:{accountId:'synthetic-launch',displayName:'Проверка запуска',status:'active'}};
   else{status=403;body={error:{code:'SYNTHETIC_DENIED'}}}
   record.requests.push({file:u.pathname,api:true,status});return route.fulfill({status,headers:{'content-type':'application/json','cache-control':'no-store',vary:'*'},body:JSON.stringify(body)});
  }
  let file=cdn?u.pathname.replace('/akronikl-it-nexus/',''):u.pathname.slice(1),source=frontend;if(cdn){const headers=await req.allHeaders();assert.equal(headers.authorization,undefined);assert.equal(headers.cookie,undefined)}
  if(['/','/index.html'].includes(u.pathname)){file=state.surface==='entry'?'server-access/public/entry.html':'nexus-shell.html';if(state.surface==='entry')source=root}
  if(u.pathname==='/account/entry/'){file='server-access/public/entry.html';source=root}
  if(u.pathname.startsWith('/account/entry/')&&/\.(js|css)$/.test(file))file='entry-assets/'+manifest.assetGeneration+'/'+path.basename(file);
  if(u.pathname==='/favicon.ico')return route.fulfill({status:204,body:''});
  const movie=/\.(mp4|webm)$/.test(file);if(movie&&mediaDelay)await new Promise(r=>setTimeout(r,mediaDelay));
  if(movie&&missing)return route.fulfill({status:404,body:''});
  let bytes;if(file==='startup-intro.json'&&descriptorBad)bytes=Buffer.from('{"schema":1,"module":"https://outside.invalid/malicious.js"}');else bytes=await readFile(path.resolve(source,file));
  const headers={'content-type':mime(file),'cache-control':file==='service-worker.js'?'no-store':'public,max-age=0','x-content-type-options':'nosniff'};
  if(cdn)headers['access-control-allow-origin']='*';
  if(file==='server-access/public/entry.html')headers['content-security-policy']="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; media-src 'self' https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/intro-media/; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
  record.requests.push({file,bytes:bytes.length,movie});return route.fulfill({status:200,headers,body:bytes});
 }catch(e){try{await route.fulfill({status:404,body:''})}catch{}}});
 const page=await context.newPage();current=page;page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 return {page,context,state,record,async open(hash='#view=home'){await page.goto(origin+'/'+hash,{waitUntil:'domcontentloaded'})}};
}
const layer=s=>s.page.locator('[data-startup-intro]');
const playing=s=>s.page.waitForFunction(()=>document.querySelector('[data-startup-intro]')?.dataset.playback==='video');
const ready=s=>s.page.locator('#app .visual-shell').waitFor();
const ended=s=>layer(s).waitFor({state:'detached',timeout:25000});
const shot=(s,name)=>s.page.screenshot({path:path.join(out,name+'.png')});
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking']});
 await check('Поведение принятой базы при фоновом обновлении #app зафиксировано',async()=>{
  const s=await session({frontend:baseline,pref:{schema:1,enabled:true,simplified:false,seen:''}});await s.open();await playing(s);
  await s.page.evaluate(()=>{(document.querySelector('video[data-current]')||document.querySelector('video')).pause();const app=document.querySelector('#app');app.replaceChildren(...app.childNodes)});
  if(JSON.parse(await readFile(path.join(baseline,'BUILD_MANIFEST.json'))).assetGeneration!=='ui1a-startup-cinematic-candidate-20261028'){await s.page.waitForTimeout(200);assert.equal(await layer(s).count(),1);await s.page.keyboard.press('Escape')}
  await ended(s);await s.context.close();
 });
 await check('Desktop: новый widescreen целиком10секунд, до Account, медленное проявление и финальный логотип',async()=>{
  const s=await session({accountDelay:2500,lowDevice:true,noLocks:true});await s.open();await playing(s);assert.equal(await s.page.evaluate(()=>window.__appAt),null);
  await ready(s);await s.page.evaluate(()=>{const app=document.querySelector('#app');app.replaceChildren(...app.childNodes);document.querySelector('#menuBtn')?.focus();location.hash='#view=academy'});
  await s.page.waitForTimeout(1100);assert.equal(await layer(s).count(),1);await shot(s,'desktop-full-video');
  const alpha=await s.page.evaluate(()=>window.__fadeIn);assert.ok(alpha[0].opacity<.2);assert.ok(alpha[1].opacity>alpha[0].opacity&&alpha[1].opacity<.9);assert.ok(alpha[2].opacity>.95);
  await s.page.waitForFunction(()=>window.__introVideoEnd);const logo=await s.page.evaluate(()=>window.__introVideoEnd);assert.equal(logo.phase,'hold');assert.match(logo.source,/cinematic-v4\/desktop\.mp4/);assert.ok(Math.abs(logo.duration-10)<.05);assert.ok(logo.playedSeconds>=9.95);assert.ok(logo.opacity>.99);assert.equal(await s.page.locator('.nexus-intro-wordmark').count(),0);await shot(s,'desktop-final-logo');await ended(s);
  const done=await s.page.evaluate(()=>window.__introFinishes.at(-1));assert.equal(done.reason,'ended');assert.ok(done.at-logo.at>=1750,'Затухание должно завершиться после финального кадра');assert.equal(s.record.writes.length,0);s.record.fullPlayback={...done,logo,fadeIn:alpha};await s.context.close();
 });
 await check('Mobile: 8 секунд целиком, открытие без сессии и независимо от окончания проверки Account',async()=>{
  const s=await session({surface:'entry',guest:true,width:390,height:844,accountDelay:2500});await s.open();await playing(s);assert.equal(await layer(s).getAttribute('data-variant'),'mobile');await shot(s,'mobile-before-login');await ended(s);
  const done=await s.page.evaluate(()=>window.__introFinishes.at(-1)),last=await s.page.evaluate(()=>window.__introVideoEnd);assert.equal(done.reason,'ended');assert.ok(done.playedSeconds>=8);assert.match(last.source,/cinematic-v3\/mobile\/mp4\/part-003\.mp4/);assert.ok(done.at-last.at>=1750);assert.equal(await s.page.locator('[data-login]').count(),1);s.record.fullPlayback={...done,logo:last};await s.context.close();
 });
 await check('WebM Desktop: реальные10секунд и работа Пропустить во время удержания финального кадра',async()=>{
  const s=await session({surface:'entry',guest:true,codec:'webm'});await s.open();await playing(s);await s.page.waitForFunction(()=>window.__introVideoEnd);
  const end=await s.page.evaluate(()=>window.__introVideoEnd);assert.match(end.source,/cinematic-v4\/desktop\.webm/);assert.ok(Math.abs(end.duration-10)<.05);assert.ok(end.playedSeconds>=9.95);
  await s.page.locator('.nexus-intro-skip').click();await ended(s);assert.equal(await s.page.evaluate(()=>window.__introFinishes.at(-1).reason),'skip');await s.context.close();
 });
 await check('Задержка видео 3.5 секунды не даёт секундную вспышку; Nexus загружается параллельно',async()=>{
  const s=await session({mediaDelay:3500});await s.open();await ready(s);assert.equal(await layer(s).count(),1);assert.notEqual(await layer(s).getAttribute('data-playback'),'poster');await playing(s);await shot(s,'slow-network-full-video');await ended(s);assert.equal(await s.page.evaluate(()=>window.__introFinishes.at(-1).reason),'ended');await s.context.close();
 });
 await check('Пропуск полупрозрачный сразу; настройка старой просмотренной версии не подавляет новое открытие',async()=>{
  const s=await session();await s.open();await layer(s).waitFor();assert.equal(await s.page.locator('.nexus-intro-skip').evaluate(n=>getComputedStyle(n).opacity),'0.55');await s.page.locator('.nexus-intro-skip').click();await ended(s);
  await s.page.reload();await playing(s);await s.page.keyboard.press('Escape');await ended(s);await s.context.close();
 });
 await check('Переход entry→Continue→Nexus не запускает второй ролик; следующее открытие запускает',async()=>{
  const s=await session({surface:'entry'});await s.open();await playing(s);await s.page.locator('.nexus-intro-skip').click();await ended(s);await s.page.getByText('Вы вошли. Ваше пространство готово.',{exact:true}).waitFor();
  s.state.surface='shell';await s.page.locator('[data-login]').click();await ready(s);await s.page.waitForTimeout(450);assert.equal(await layer(s).count(),0);
  assert.equal(await s.page.evaluate(k=>sessionStorage.getItem(k),handoff),null);
  await s.page.reload();await playing(s);await s.page.locator('.nexus-intro-skip').click();await ended(s);await s.context.close();
 });
 for(const button of ['switch','logout'])await check('Настоящая кнопка '+button+': выход на entry без видео; новое открытие снова показывает заставку',async()=>{
  const s=await session({logout:true});await s.open('#view=account');await playing(s);await s.page.locator('.nexus-intro-skip').click();await ended(s);await s.page.locator('[data-unified-account]').waitFor();
  const before=s.record.requests.filter(r=>r.movie).length;await s.page.locator('[data-unified-account] [data-unified-logout]').nth(button==='switch'?0:1).click();await s.page.waitForURL(origin+'/account/entry/');await s.page.locator('[data-entry-launch-settings]').waitFor();await s.page.waitForTimeout(400);
  assert.equal(s.record.syntheticLogouts,1);assert.equal(await layer(s).count(),0);assert.equal(s.record.requests.filter(r=>r.movie).length,before);assert.equal(await s.page.evaluate(k=>sessionStorage.getItem(k),handoff),null);assert.equal(await s.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).enabled,key),true);
  await s.page.reload();await playing(s);await s.page.locator('.nexus-intro-skip').click();await ended(s);await s.context.close();
 });
 await check('OAuth return внутри запуска не включает заставку после авторизации',async()=>{
  const s=await session({oauth:true});await s.open('#view=home&nexusLogin=oauth');await ready(s);await s.page.waitForTimeout(450);assert.equal(await layer(s).count(),0);await s.context.close();
 });
 await check('Настройки у обычного пользователя в меню режимов и диалоге оформления; в Account/админке панели нет',async()=>{
  const s=await session({pref:{schema:1,enabled:false,simplified:false,seen:'cinematic-v1'}});await s.open();await ready(s);
  await s.page.locator('#visualSettings summary').click();await s.page.locator('#nexusSettingsPanel [data-intro-settings]').waitFor();await shot(s,'all-users-settings-menu');
  await s.page.locator('#nexusSettingsPanel [data-nexus-appearance]').click();await s.page.locator('.nexus-appearance-dialog [data-intro-settings]').waitFor();await s.page.locator('.nexus-appearance-dialog [data-intro-simplified]').check();await shot(s,'appearance-settings');
  await s.page.locator('.nexus-appearance-dialog [data-intro-preview]').click();await layer(s).waitFor();await s.page.locator('.nexus-intro-skip').click();await ended(s);
  await s.page.locator('.nexus-appearance-dialog [data-intro-enabled]').check();await s.page.locator('.nexus-appearance-dialog [data-intro-simplified]').uncheck();await s.page.locator('[data-appearance-close]').click();
  await s.page.evaluate(()=>location.hash='#view=account');await s.page.locator('[data-unified-account]').waitFor();assert.equal(await s.page.locator('[data-unified-account] [data-intro-settings]').count(),0);
  await s.page.reload();await playing(s);await s.page.locator('.nexus-intro-skip').click();await ended(s);
  await s.page.setViewportSize({width:390,height:844});await s.page.evaluate(()=>location.hash='#view=home');await s.page.locator('.visual-home').waitFor();await s.page.locator('#visualSettings summary').click();
  await s.page.locator('#nexusSettingsPanel [data-intro-enabled]').scrollIntoViewIfNeeded();const box=await s.page.locator('#nexusSettingsPanel').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391);await shot(s,'mobile-settings-menu');
  await s.page.locator('#nexusSettingsPanel [data-intro-enabled]').uncheck();await s.page.reload();await ready(s);await s.page.waitForTimeout(450);assert.equal(await layer(s).count(),0);await s.context.close();
 });
 await check('Настройки доступны и до входа; отключение сохраняется после нового открытия',async()=>{
  const s=await session({surface:'entry',guest:true});await s.open();await layer(s).waitFor();await s.page.locator('.nexus-intro-skip').click();await ended(s);
  await s.page.locator('[data-entry-launch-settings]').click();await s.page.locator('[data-entry-intro-settings] [data-intro-enabled]').uncheck();await shot(s,'guest-settings');await s.page.locator('[data-intro-close]').click();await s.page.reload();await s.page.waitForTimeout(650);assert.equal(await layer(s).count(),0);await s.context.close();
 });
 await check('Скрытая при открытии вкладка ждёт показа; переключение окна ставит видео на паузу, без исчезновения',async()=>{
  const s=await session({surface:'entry',guest:true,hidden:true});await s.open();await s.page.waitForTimeout(500);assert.equal(await layer(s).count(),0);
  await s.page.evaluate(()=>{window.__testHidden=false;document.dispatchEvent(new Event('visibilitychange'))});await playing(s);
  await s.page.evaluate(()=>{window.__testHidden=true;document.dispatchEvent(new Event('visibilitychange'))});const t=await s.page.locator('.nexus-intro video:not([data-sequence-slot]),.nexus-intro video[data-current]').evaluate(v=>v.currentTime);await s.page.waitForTimeout(1100);assert.equal(await layer(s).count(),1);assert.ok(Math.abs(await s.page.locator('.nexus-intro video:not([data-sequence-slot]),.nexus-intro video[data-current]').evaluate(v=>v.currentTime)-t)<.1);
  await s.page.evaluate(()=>{window.__testHidden=false;document.dispatchEvent(new Event('visibilitychange'))});await playing(s);await s.page.locator('.nexus-intro-skip').click();await ended(s);await s.context.close();
 });
 await check('Поворот планшета меняет формат и сохраняет сцену; 404 media не ломает ранний bootstrap',async()=>{
  const s=await session({width:768,height:1024});await s.open();await playing(s);await s.page.setViewportSize({width:1024,height:768});await s.page.waitForFunction(()=>document.querySelector('[data-startup-intro]')?.dataset.variant==='desktop');await playing(s);await shot(s,'tablet-rotation');await s.page.locator('.nexus-intro-skip').click();await ended(s);await s.context.close();
  const f=await session({missing:true,accountDelay:1800});await f.open();await layer(f).waitFor();await ended(f);await ready(f);assert.equal(await f.page.locator('.boot-error').count(),0);await f.context.close();
 });
 await check('Reduced-motion/offline/выключенная настройка не загружают видео; неизвестный descriptor отклоняется',async()=>{
  for(const opts of [{reducedMotion:'reduce'},{online:false},{pref:{schema:1,enabled:false,simplified:false,seen:''}},{surface:'entry',guest:true,descriptorBad:true}]){
   const s=await session(opts);await s.open();await s.page.waitForTimeout(2200);assert.equal(s.record.requests.some(x=>x.movie),false);assert.equal(await layer(s).count(),0);await s.context.close();
  }
 });
 await check('Парные замеры готовности Home/Академия/Code Studio: ожидание видео не блокирует приложение',async()=>{
  for(let iteration=0;iteration<3;iteration++)for(const view of ['home','academy','code-studio'])for(const frontend of iteration%2?[candidate,baseline]:[baseline,candidate]){
   const isNew=frontend===candidate,s=await session({frontend,mediaDelay:isNew?10000:0,pref:{schema:1,enabled:isNew,simplified:false,seen:'cinematic-v1'}});
   await s.open('#view='+view);await ready(s);const timing=await s.page.evaluate(()=>({readyMs:window.__appAt,introMs:window.__introAt,playback:document.querySelector('[data-startup-intro]')?.dataset.playback}));
   measurements.push({iteration,view,build:isNew?'candidate':'baseline',...timing});if(isNew)assert.notEqual(timing.playback,'video','Приложение готово, пока медиазапрос ещё ждёт');await s.context.close();
  }
  const median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)];
  for(const view of ['home','academy','code-studio']){const old=median(measurements.filter(x=>x.view===view&&x.build==='baseline').map(x=>x.readyMs)),now=median(measurements.filter(x=>x.view===view&&x.build==='candidate').map(x=>x.readyMs));assert.ok(now<=old*1.25+80,'Задержка bootstrap '+view+': '+old+'→'+now)}
 });
 assert.deepEqual(errors,[]);assert.equal(sessions.some(s=>s.writes.length),false);
}catch(e){fatal={message:e.message,stack:e.stack};console.error(e);if(current&&!current.isClosed())await current.screenshot({path:path.join(out,'failure.png')}).catch(()=>{})}
finally{await browser?.close();await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:fatal?'FAIL':'PASS',rows,fatal,errors,sessions,measurements,syntheticAccount:true,actualBrowserDecoder:true,physical:false,production:false},null,2)+'\n');if(fatal)process.exitCode=1}
