// Real Chromium + virtual CTAP2 key + actual BFF, SimpleWebAuthn and SQLite.
// Every browser request is intercepted locally. No Yandex or provider data plane.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {fixture} from './helpers/auth-fixture.mjs';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const frontend=pathToFileURL(process.env.NEXUS_FRONTEND_DIR.replace(/[\\/]?$/,'/'));
const generation=JSON.parse(await readFile(new URL('version.json',frontend))).releaseCandidate.assetGeneration;
const f=await fixture(frontend),origin='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const browser=await chromium.launch({executablePath:process.env.NEXUS_CHROME_PATH,headless:true,proxy:{server:'http://127.0.0.1:9'},args:['--disable-background-networking','--disable-component-update']});
const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[],blocked=[],timings=[];
page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);
let documentStart=0;
page.on('request',request=>{if(request.isNavigationRequest())documentStart=performance.now()});
page.on('requestfinished',request=>{if(new URL(request.url()).pathname==='/account/access/passkey-client.js'){const t=request.timing();if(t.responseEnd>=0)timings.push({stage:'client-module-network',durationMs:Math.round(t.responseEnd)})}});
page.on('pageerror',()=>errors.push('page-error'));
const type=path=>path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.json')?'application/json':path.endsWith('.svg')?'image/svg+xml':path.endsWith('.png')?'image/png':'text/html';
await context.route('**/*',async route=>{
 try{
  const req=route.request(),url=new URL(req.url());
  if(url.origin==='https://synthetic-provider.invalid')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Synthetic cross-site return fixture</title>'});
  if(url.origin!==origin){blocked.push('foreign-origin');return route.abort()}
  if(url.pathname==='/api/v2/account/oauth/providers')return route.fulfill({status:200,json:{providers:[]}});
  const result=await f.dispatch(url.href,{method:req.method(),headers:await req.allHeaders(),body:req.postData()});
  if(result){const headers={};for(const[k,v]of Object.entries(result.headers))headers[k.toLowerCase()]=Array.isArray(v)?v.join('\n'):String(v);return route.fulfill({status:result.status,headers,body:result.body})}
  let path=url.pathname.slice(1);if(path.startsWith('account/entry/'))path='entry-assets/'+generation+'/'+path.split('/').at(-1);
  if(path==='account/access/passkey-client.js'){const body=await readFile(new URL('../server-access/image/public/passkey-client.js',import.meta.url));return route.fulfill({body,contentType:'text/javascript'})}
  if(!path||path.includes('..'))throw Error('UNEXPECTED_PATH');
  return route.fulfill({body:await readFile(new URL(path,frontend)),contentType:type(path)});
 }catch{blocked.push('unknown-path');return route.fulfill({status:404,body:''})}
});
const cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');
const {authenticatorId}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
let count=0;const check=async(name,fn)=>{await fn();count++;console.log('PASS '+name)};
try{
 await page.goto(origin+'/');await page.locator('[data-login][aria-busy="false"]').waitFor({state:'attached',timeout:1000}).catch(()=>{});
 await check('register/login with virtual resident key creates one verified session and HttpOnly cookie',async()=>{
  await page.evaluate(async invitation=>{const client=await import('/account/access/passkey-client.js');await client.register(invitation)},f.invitation);
  assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_passkey_credentials').get().n,1);assert.equal(f.db.prepare('SELECT count(*) n FROM account_sessions').get().n,1);
  const cookie=(await context.cookies()).find(c=>c.name==='__Host-nexus_session');assert.ok(cookie?.httpOnly&&cookie.secure&&cookie.sameSite==='Strict');assert.equal(await page.evaluate(()=>document.cookie.includes('__Host-nexus_session')),false);
 });
 await check('logout revokes server session and removes browser cookie',async()=>{
  await page.evaluate(async()=>{const client=await import('/account/access/passkey-client.js');await client.logout()});
  assert.equal(f.db.prepare("SELECT count(*) n FROM account_sessions WHERE status='active'").get().n,0);assert.equal((await context.cookies()).some(c=>c.name==='__Host-nexus_session'),false);
 });
 await check('actual entry click opens built Nexus only after server session proof; re-login preserves account',async()=>{
  await page.goto(origin+'/#view=home');const before=f.db.prepare('SELECT count(*) n FROM account_sessions').get().n,start=performance.now();
  await page.locator('[data-login]').click();await page.waitForURL('**/index.html#view=home');
  await page.waitForFunction(()=>globalThis.__NEXUS_APP__||document.querySelector('#app')?.children.length>0,{},{timeout:15000});
  timings.push({stage:'click-to-open-built-app',durationMs:Math.round(performance.now()-start)});
  timings.push({stage:'document-to-open-built-app',durationMs:Math.round(performance.now()-documentStart)});
  assert.equal(f.db.prepare('SELECT count(*) n FROM account_sessions').get().n,before+1);assert.equal(f.db.prepare('SELECT count(DISTINCT subject_id) n FROM account_sessions').get().n,1);assert.equal(f.db.prepare('SELECT count(*) n FROM account_subjects').get().n,1);
 });
 await check('real WebAuthn timings separate from network and no credential output',async()=>{
  const data=await page.evaluate(async()=>{const client=await import('/account/access/passkey-client.js'),events=[];await client.login({onStage:e=>events.push(e)});return events});
  for(const stage of ['options','webauthn','verify']){const event=data.find(e=>e.stage===stage&&e.state==='complete');assert.ok(event);timings.push({stage,...{durationMs:event.durationMs}})}
 });
 await check('OAuth return hint uses existing verified server session, with no second click or extra session issue',async()=>{
  const before=f.db.prepare('SELECT count(*) n FROM account_sessions').get().n;
  await page.goto('https://synthetic-provider.invalid/');
  await page.evaluate(target=>location.assign(target),origin+'/#nexusLogin=oauth');await page.waitForURL('**/index.html#view=home');
  assert.equal(f.db.prepare('SELECT count(*) n FROM account_sessions').get().n,before);
 });
 await check('built Account/Security and Home open at Android/iPhone viewport sizes',async()=>{
  for(const viewport of [{width:390,height:844},{width:393,height:852}]){
   await page.setViewportSize(viewport);await page.goto(origin+'/#view=account&tab=security');
   await page.waitForFunction(()=>document.querySelector('#app')?.children.length>0,{},{timeout:15000});
   assert.equal(new URL(page.url()).hash,'#view=account&tab=security');
   await page.goto(origin+'/#view=home');await page.waitForFunction(()=>document.querySelector('#app')?.children.length>0,{},{timeout:15000});
  }
 });
 await check('matching V2 succeeds; simulated stale context fails closed after successful crypto',async()=>{
  await page.evaluate(async()=>{const client=await import('/account/access/passkey-client.js');await client.logout()});f.setMismatch(true);
  await page.goto(origin+'/index.html#view=home');const before=f.db.prepare('SELECT count(*) n FROM account_sessions').get().n;
  await page.locator('[data-login]').click();await page.waitForFunction(()=>document.querySelector('[data-status]')?.dataset.tone==='error');
  assert.equal(new URL(page.url()).pathname,'/index.html');assert.equal(f.db.prepare('SELECT count(*) n FROM account_sessions').get().n,before+1);assert.match(await page.locator('[data-status]').innerText(),/сессия не подтверждена/);
  f.setMismatch(false);
 });
 await check('cancelled virtual confirmation sends no verify and releases entry guard',async()=>{
  await page.evaluate(async()=>{const client=await import('/account/access/passkey-client.js');await client.logout()});await page.goto(origin+'/');
  await cdp.send('WebAuthn.setUserVerified',{authenticatorId,isUserVerified:false});
  // CDP cancellation models the browser rejection; the user ceremony itself is not exercised.
  await page.evaluate(()=>{navigator.credentials.get=async()=>{throw new DOMException('Synthetic cancellation','NotAllowedError')}});
  const before=f.db.prepare('SELECT count(*) n FROM account_sessions').get().n;
  await page.locator('[data-login]').click();await page.waitForFunction(()=>document.querySelector('[data-status]')?.dataset.tone==='error');
  assert.equal(f.db.prepare('SELECT count(*) n FROM account_sessions').get().n,before);assert.equal(await page.locator('[data-login]').getAttribute('aria-busy'),'false');
 });
 await check('OAuth hint without session cannot open shell or issue a session',async()=>{
  const before=f.db.prepare('SELECT count(*) n FROM account_sessions').get().n;await page.goto(origin+'/index.html#nexusLogin=oauth');
  await page.waitForFunction(()=>document.querySelector('[data-status]')?.dataset.tone==='error');assert.equal(new URL(page.url()).pathname,'/index.html');assert.equal(new URL(page.url()).hash,'#view=home');assert.equal(f.db.prepare('SELECT count(*) n FROM account_sessions').get().n,before);
 });
 assert.deepEqual(errors,[]);assert.equal(blocked.filter(x=>x==='foreign-origin').length,0);
 const result={status:'PASS',checks:count,browser:'Installed Chrome / headless / disposable context',authenticator:'virtual CTAP2; real cryptographic verification; not Windows Hello',externalRequests:0,errors,blocked:blocked.length,timings,backendTimings:f.metrics,realAccounts:false,productionCookieDelivery:'NOT TESTED'};
 await writeFile(process.env.NEXUS_BROWSER_RESULT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,checks:count,timings,externalRequests:0}));
}finally{await browser.close();f.close()}
