import {command,showSettings,leaveSettings,findMaterials,showContext} from './helpers/akronikl-experience-actions.mjs';
// Gate B1: настоящий публичный offline.html + native ESM + собранный SW.
// Только loopback и новый синтетический persistent-профиль. Account/backend/Cloud
// не подменяются и не вызываются. Не отменяет политики браузера и не публикует сайт.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const frontend=process.env.NEXUS_FRONTEND_DIR, out=process.env.NEXUS_AKRONIKL_EVIDENCE;
if (!frontend || !out || !process.env.NEXUS_PLAYWRIGHT_MODULE) throw Error('GATE_B_ENV_REQUIRED');
await mkdir(out,{recursive:true});
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const build=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json')));
const prefix='/'+build.prefix, manifest=JSON.parse(await readFile(path.join(frontend,build.prefix+'akronikl/knowledge/manifest.json')));
const ru=manifest.indexes.find(x=>x.locale==='ru');
const allowed=new Set(build.files.map(r=>'/'+r.file));
const profile=await mkdtemp(path.join(tmpdir(),'ak02-public-gate-'));
let available=true, context=null, page=null, browserVersion=null, phase='prepare', fatal=null, restarted=false, verifiedWorker=false;
const checks=[],network=[],errors=[],measurements=[];
const mime=file=>({'.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.md':'text/markdown'}[path.extname(file)]||'text/html');
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1'); const row={phase,path:u.pathname,method:req.method,served:false};network.push(row);
  if (!available) {req.socket.destroy(); return;}
  if (req.method!=='GET') {res.writeHead(405);res.end();return;}
  if (u.pathname==='/__ak02__/prepare.html') {
    row.served=true;res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});
    res.end('<!doctype html><meta charset="utf-8"><title>Akronikl Gate B — публичная подготовка</title>');return;
  }
  if (u.pathname==='/favicon.ico') {res.writeHead(204);res.end();return;}
  if (!allowed.has(u.pathname)) {res.writeHead(404);res.end();return;}
  try {
    const file=u.pathname.slice(1),bytes=await readFile(path.join(frontend,file));
    row.served=true;
    res.writeHead(200,{'content-type':mime(file),'cache-control':file==='service-worker.js'?'no-store':'public, max-age=0',...(file==='service-worker.js'?{'service-worker-allowed':'/'}:{})});res.end(bytes);
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
async function launch(directory=profile,offline=false) {
  const ctx=await chromium.launchPersistentContext(directory,{headless:true,serviceWorkers:'allow',offline,viewport:{width:1366,height:900},
    ...(process.env.NEXUS_CHROME_PATH?{executablePath:process.env.NEXUS_CHROME_PATH}:{}),args:['--disable-background-networking']});
  browserVersion=ctx.browser()?.version()||browserVersion;
  // Страница не обращается к внешним ресурсам. SW получает только точные public
  // records локальной staging-сборки. Request fulfillment/подмена модулей не используются.
  await ctx.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  return ctx;
}
async function newPage() {
  page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(20000);
  page.on('pageerror',e=>errors.push({phase,message:e.message}));return page;
}
const panel=()=>page.locator('[data-akronikl-panel]');
async function ready(){await page.waitForFunction(()=>document.querySelector('#offlineApp')?.dataset.akroniklRoute===location.hash);}
async function open(){await page.locator('#offlineApp [data-akronikl-open],#offlineApp #askAkronikl').first().click();await panel().waitFor();}
async function search(query='указатели'){const start=performance.now();await findMaterials(page,query);measurements.push({phase,operation:'search-to-first-card',durationMs:Math.round(performance.now()-start)});assert.ok(await panel().locator('.ak-assistant').last().locator('.ak-source').count()<=5);}
async function check(name,fn){const start=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-start)});console.log('PASS '+name);}
async function setPublicLanguage(locale){
  await page.evaluate(locale=>{
    const key='akronikl:it-nexus:prefs:v1',old=JSON.parse(localStorage.getItem(key)||'{}');
    localStorage.setItem(key,JSON.stringify({...old,uiLocale:locale,mentorLocale:locale,courseLocale:locale,effectsQuality:'off'}));
  },locale);
}
async function damagePublicRecord(kind){
  await page.evaluate(async({hash,kind})=>{
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nexus-verified-public-assets-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    try {await new Promise((resolve,reject)=>{
      const tx=db.transaction('assets','readwrite'),store=tx.objectStore('assets');
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);
      if(kind==='missing')store.delete(hash);
      else {const req=store.get(hash);req.onsuccess=()=>{const record=req.result;if(!record){tx.abort();return}const bytes=new Uint8Array(record.data.slice(0));bytes[0]^=1;store.put({...record,data:bytes.buffer})}}
    });}finally{db.close()}
  },{hash:ru.sha256,kind});
}
async function readPublicStatus(){
  return page.evaluate(()=>new Promise((resolve,reject)=>{
    const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(Error('PUBLIC_STATUS_TIMEOUT'))},30000);
    channel.port1.onmessage=e=>{if(e.data?.type==='checking')return;clearTimeout(timer);channel.port1.close();resolve(e.data)};
    navigator.serviceWorker.controller.postMessage({type:'nexus-pwa-status',progress:true},[channel.port2]);
  }));
}
try {
  context=await launch();await newPage();await page.goto(origin+'/__ak02__/prepare.html');
  await check('Подготовлено полное staging-поколение с настоящим SW',async()=>{
    const status=await page.evaluate(async prefix=>{const {ensureVerifiedRuntime}=await import(prefix+'pwa/client.js');return ensureVerifiedRuntime()},prefix);
    assert.equal(status.publicReady,true);assert.equal(status.generation,build.assetGeneration);verifiedWorker=true;
    await setPublicLanguage('ru');await page.evaluate(()=>localStorage.setItem('synthetic-ak02-preservation','UNCHANGED'));
  });
  phase='online-public';
  await check('Собранная offline-оболочка открывает ленивый Akronikl',async()=>{
    await page.goto(origin+'/offline.html#view=akronikl');await ready();assert.equal(await panel().count(),0);await open();
    assert.equal(await panel().locator('[data-ak-code-consent]').isDisabled(),true);await search();
    const first=panel().locator('.ak-assistant').last().locator('.ak-source').first();await first.locator('summary').first().click();assert.match(await first.locator('details').textContent(),/courses\/cpp\//);
  });
  await check('Публичный режим не предлагает личные проекты или серверный Account',async()=>{
    for(const cmd of ['Открой проекты','Открой аккаунт']){await panel().locator('[data-akronikl-message]').fill(cmd);await panel().locator('[data-akronikl-message]').press('Enter');assert.equal(await panel().locator('[data-akronikl-confirm]').count(),0);}
    await command(page,'Где я?');assert.match(await panel().locator('[data-akronikl-messages]').textContent(),/Личная копия закрыта/);
  });
  await check('Карточка открывает настоящий урок без доступа к личному редактору',async()=>{
    await search();await panel().locator('.ak-assistant').last().locator('.ak-source').first().getByRole('button',{name:'Открыть урок',exact:true}).click();await ready();
    assert.match(new URL(page.url()).hash,/^#course=cpp&lesson=cpp\./);assert.equal(await panel().count(),0);
    assert.equal(await page.locator('#editor').isDisabled(),true);await open();
    assert.equal(await panel().locator('[data-ak-code-consent]').isDisabled(),true);await page.keyboard.press('Escape');
  });
  await context.close();context=null;available=false;phase='cold-offline';
  context=await launch(profile,true);restarted=true;await newPage();
  await check('После закрытия процесса корневой адрес открывается из SW без сети',async()=>{
    const response=await page.goto(origin+'/#view=akronikl');assert.equal(response.fromServiceWorker(),true);await ready();
    assert.equal(await page.evaluate(()=>navigator.onLine),false);
    assert.equal(await page.evaluate(()=>localStorage.getItem('synthetic-ak02-preservation')),'UNCHANGED');
  });
  await check('Холодный RU поиск работает с native ESM и проверенным индексом',async()=>{
    await open();await search();assert.equal(await panel().locator('[data-ak-code-consent]').isDisabled(),true);
    for(const width of [320,390,1366]){await page.setViewportSize({width,height:900});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.ok(await panel().evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.screenshot({path:path.join(out,'cold-public-'+width+'.png')})}
    await page.keyboard.press('Escape');await panel().waitFor({state:'detached'});
  });
  await check('Холодная перезагрузка EN не использует RU индекс',async()=>{
    await setPublicLanguage('en');await page.goto(origin+'/offline.html#view=akronikl');await ready();await open();await search('pointers');
    assert.ok(await panel().getByRole('button',{name:'Send',exact:true}).isVisible());assert.match(await panel().locator('.ak-assistant').last().locator('.ak-source').first().textContent(),/pointer/i);
    await page.keyboard.press('Escape');await setPublicLanguage('ru');
    // Тот же URL с hash может быть same-document navigation. Нужен новый документ.
    await page.reload();await ready();assert.equal(await page.locator('html').getAttribute('lang'),'ru');
  });
  await check('Смена маршрута закрывает окно и позволяет открыть его заново',async()=>{
    await open();await search();await page.evaluate(()=>location.hash='#view=academy');await ready();assert.equal(await panel().count(),0);
    await page.evaluate(()=>location.hash='#view=akronikl');await ready();await open();await search();await page.keyboard.press('Escape');
  });
  for (const kind of ['corrupt','missing']) {
    phase=kind+'-offline';
    await check((kind==='corrupt'?'Повреждённый':'Отсутствующий')+' публичный индекс не считается готовым',async()=>{
      await damagePublicRecord(kind);
      const rejected=await page.evaluate(async url=>{try{await fetch(url);return false}catch{return true}},prefix+ru.path);assert.equal(rejected,true);
      assert.equal((await readPublicStatus()).publicReady,false);
    });
    phase=kind+'-repair';available=true;await context.setOffline(false);
    await check('Восстановление '+kind+' через проверяемый ресурс SW без очистки пользовательских данных',async()=>{
      const digest=await page.evaluate(async url=>{const response=await fetch(url);await response.arrayBuffer();return response.headers.get('x-nexus-verified-sha256')},prefix+ru.path);
      assert.equal(digest,ru.sha256);assert.equal((await readPublicStatus()).publicReady,true);
      assert.equal(await page.evaluate(()=>localStorage.getItem('synthetic-ak02-preservation')),'UNCHANGED');
    });
    available=false;await context.setOffline(true);
  }
  phase='final-offline';
  await check('После восстановления повторная офлайн-навигация и поиск проходят',async()=>{
    await page.goto(origin+'/offline.html#view=akronikl');await ready();await open();await search();await page.keyboard.press('Escape');
    assert.equal(network.filter(r=>r.method!=='GET').length,0);
    assert.equal(network.filter(r=>/^\/(api|account)\//.test(r.path)).length,0);
    assert.equal(network.filter(r=>r.phase.endsWith('offline')&&r.served).length,0);
    assert.deepEqual(errors,[]);
  });
  await context.close();context=null;phase='unprepared-offline';
  const emptyProfile=await mkdtemp(path.join(tmpdir(),'ak02-empty-gate-'));context=await launch(emptyProfile,true);await newPage();
  await check('Неподготовленный профиль без сети не получает фиктивную готовность',async()=>{
    let error;try{await page.goto(origin+'/offline.html#view=akronikl')}catch(e){error=e}
    assert.ok(error);assert.match(error.message,/ERR_(INTERNET_DISCONNECTED|EMPTY_RESPONSE|CONNECTION_CLOSED|CONNECTION_REFUSED)/);
    assert.equal(await panel().count(),0);
  });
} catch(error) {
  fatal={phase,message:error.message,stack:error.stack};console.error(error);process.exitCode=1;
  await page?.screenshot({path:path.join(out,'FAILURE.png')}).catch(()=>{});
} finally {
  await context?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  await writeFile(path.join(out,'OFFLINE_BROWSER.json'),JSON.stringify({status:fatal?'FAIL':'PASS',sourceCommit:process.env.NEXUS_SOURCE_COMMIT||null,generation:build.assetGeneration,checks,fatal,errors,measurements,network,browser:browserVersion,node:process.version,realServiceWorker:verifiedWorker,nativeESM:true,browserProcessRestarted:restarted,scope:'built-public-offline-shell',fullAuthenticatedNexusE2E:false,physicalDevices:false,productionLive:false,realCredentials:false,productionMutations:0,profile},null,2)+'\n');
}
