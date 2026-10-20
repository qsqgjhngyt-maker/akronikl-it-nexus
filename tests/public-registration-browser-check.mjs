// Real Chromium/CTAP2 + BFF + Worker + SQLite. Every request stays in this fixture.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {fixture} from './helpers/auth-fixture.mjs';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const frontend=pathToFileURL(process.env.NEXUS_FRONTEND_DIR.replace(/[\\/]?$/,'/'));
const generation=JSON.parse(await readFile(new URL('version.json',frontend))).releaseCandidate.assetGeneration;
const f=await fixture(frontend,{control:true}),origin='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const browser=await chromium.launch({executablePath:process.env.NEXUS_CHROME_PATH,headless:true,args:['--disable-background-networking','--disable-component-update']});
const checks=[],requests=[],errors=[],unknown=[];let external=0,race=false,lastRegistration=null;
const ct=file=>file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.svg')?'image/svg+xml':'text/html';
async function profile(){
 const context=await browser.newContext();
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin!==origin){external++;return route.abort()}
  try{
   const input={method:req.method(),headers:await req.allHeaders(),body:req.postData()};
   if(url.pathname.endsWith('/register/verify')){lastRegistration={url:url.href,input};if(race){race=false;f.beforeBatch(()=>f.db.exec("UPDATE nexus_alpha_settings SET registration_mode='invite_only',version=version+1"))}}
   const start=performance.now(),r=await f.dispatch(url.href,input);
   if(r){requests.push({path:url.pathname,status:r.status,durationMs:Math.round(performance.now()-start)});return route.fulfill({status:r.status,headers:Object.fromEntries(Object.entries(r.headers).map(([k,v])=>[k,Array.isArray(v)?v.join('\n'):String(v)])),body:r.body})}
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:{code:'LOCAL_FIXTURE_DISABLED'}}});
   let file=url.pathname.slice(1);if(file==='account/entry/')file='index.html';else if(file.startsWith('account/entry/'))file='entry-assets/'+generation+'/'+file.split('/').at(-1);
   if(file==='account/access/')return route.fulfill({body:await readFile(new URL('../server-access/image/public/index.html',import.meta.url)),contentType:'text/html'});
   if(file.startsWith('account/access/'))return route.fulfill({body:await readFile(new URL('../server-access/image/public/'+file.split('/').at(-1),import.meta.url)),contentType:'text/javascript'});
   if(!file||file.includes('..'))throw Error('INVALID_PATH');return route.fulfill({body:await readFile(new URL(file,frontend)),contentType:ct(file)});
  }catch{unknown.push(url.pathname);return route.fulfill({status:404,body:''})}
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',()=>errors.push('page-error'));
 const cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
 return {context,page};
}
const check=async(name,fn)=>{const start=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-start)});console.log('PASS '+name)};
const count=table=>f.db.prepare('SELECT count(*) n FROM '+table).get().n;
const owner=await profile();let user,other,userId;
try{
 await owner.page.goto(origin+'/');await owner.page.evaluate(async token=>{await(await import('/account/access/passkey-client.js')).register(token)},f.invitation);f.enableControl();f.enablePublicRegistration();user=await profile();
 await check('testing shows invitation guidance and denies a direct public registration request',async()=>{
  await user.page.goto(origin+'/account/access/');await user.page.locator('#registration-policy').filter({hasText:'по приглашению'}).waitFor();assert.equal(await user.page.locator('#public-register').isHidden(),true);
  const denied=await user.page.evaluate(async()=>{const r=await fetch('/api/v2/account/passkey/register/options',{method:'POST',headers:{'content-type':'application/json','x-nexus-passkey-write':'1'},body:JSON.stringify({registration:'open',username:'closed.person',displayName:'Closed'})});return r.status});assert.equal(denied,403);assert.equal(count('account_subjects'),1);
 });
 f.db.exec("UPDATE nexus_alpha_settings SET registration_mode='open',max_testers=1,version=version+1");
 await check('cancelling creation releases the only place; duplicate clicks create no extra requests',async()=>{
  await user.page.reload();await user.page.locator('#public-register').waitFor({state:'visible'});await user.page.locator('#public-username').fill('nexus.person');await user.page.locator('#public-display-name').fill('Новый Пользователь');
  await user.page.evaluate(()=>{const real=navigator.credentials.create.bind(navigator.credentials);navigator.credentials.create=async options=>{navigator.credentials.create=real;await new Promise(resolve=>setTimeout(resolve,150));throw new DOMException('Synthetic user cancellation','NotAllowedError')}});
  const before=requests.filter(r=>r.path.endsWith('/register/options')).length;
  await user.page.locator('#public-register button').click();await user.page.evaluate(()=>document.querySelector('#public-register').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await user.page.locator('#status').filter({hasText:'Подтверждение отменено'}).waitFor();assert.equal(await user.page.locator('#public-register button').isEnabled(),true);
  assert.equal(requests.filter(r=>r.path.endsWith('/register/options')).length,before+1);assert.equal(requests.filter(r=>r.path.endsWith('/register/verify')).length,1); // owner only
  assert.equal(count('account_subjects'),1);assert.equal(count('nexus_alpha_occupied'),0);assert.equal(count('account_sessions'),1);
 });
 await check('real CTAP2 creates the chosen login/name and admits the account without a session',async()=>{
  await user.page.locator('#public-register button').click();await user.page.locator('#status').filter({hasText:'Аккаунт и ключ созданы'}).waitFor();
  userId=f.db.prepare("SELECT account_id FROM nexus_account_profiles WHERE username='nexus.person'").get().account_id;
  assert.equal(f.db.prepare('SELECT display_name FROM account_subjects WHERE id=?').get(userId).display_name,'Новый Пользователь');assert.equal(f.db.prepare('SELECT state FROM nexus_alpha_members WHERE account_id=?').get(userId).state,'active');assert.equal(count('account_sessions'),1);
  assert.equal((await user.context.cookies()).some(c=>c.name==='__Host-nexus_session'),false);assert.equal(await user.page.locator('#public-register').isHidden(),true);
  const replay=await f.dispatch(lastRegistration.url,lastRegistration.input);assert.equal(replay.status,401);assert.equal(count('account_sessions'),1);
 });
 await check('explicit sign-in establishes HttpOnly session and opens Nexus after Account proof',async()=>{
  await user.page.locator('#login').click();await user.page.waitForURL('**/index.html#view=home');await user.page.waitForFunction(()=>document.querySelector('#app')?.children.length>0);
  const cookie=(await user.context.cookies()).find(c=>c.name==='__Host-nexus_session');assert.ok(cookie.httpOnly&&cookie.secure&&cookie.sameSite==='Strict');assert.equal(await user.page.evaluate(()=>document.cookie.includes('__Host-nexus_session')),false);
  assert.equal(f.db.prepare('SELECT subject_id FROM account_sessions ORDER BY created_at DESC LIMIT 1').get().subject_id,userId);assert.equal(count('account_subjects'),2);
 });
 await check('logout and another explicit login preserve the same account and unique profile',async()=>{
  await user.page.evaluate(async()=>{await(await import('/account/access/passkey-client.js')).logout()});assert.equal((await user.context.cookies()).some(c=>c.name==='__Host-nexus_session'),false);
  await user.page.goto(origin+'/');await user.page.locator('[data-login]').click();await user.page.waitForURL('**/index.html#view=home');assert.equal(count('account_subjects'),2);assert.equal(count('nexus_account_profiles'),1);
 });
 other=await profile();
 await check('full capacity hides public signup while unlimited mode preserves username uniqueness',async()=>{
  await other.page.goto(origin+'/account/access/');await other.page.locator('#registration-policy').filter({hasText:'Свободных мест'}).waitFor();assert.equal(await other.page.locator('#public-register').isHidden(),true);
  f.db.exec('UPDATE nexus_alpha_settings SET limit_enabled=0,version=version+1');await other.page.reload();await other.page.locator('#public-register').waitFor({state:'visible'});await other.page.locator('#public-username').fill('nexus.person');await other.page.locator('#public-display-name').fill('Another');
  await other.page.locator('#public-register button').click();await other.page.locator('#status').filter({hasText:'логин уже занят'}).waitFor();assert.equal(count('account_subjects'),2);
 });
 await check('switching to testing during final commit rolls back verified registration atomically',async()=>{
  await other.page.locator('#public-username').fill('nexus.other');race=true;await other.page.locator('#public-register button').click();await other.page.locator('#status').filter({hasText:'Самостоятельная регистрация закрыта'}).waitFor();
  assert.equal(f.db.prepare("SELECT account_id FROM nexus_account_profiles WHERE username='nexus.other'").get(),undefined);assert.equal(count('nexus_passkey_credentials'),2);assert.equal(count('nexus_passkey_receipts'),5);assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length,0);
 });
 assert.equal(external,0);assert.deepEqual(errors,[]);assert.deepEqual(unknown,[]);
 await writeFile(process.env.NEXUS_BROWSER_RESULT,JSON.stringify({status:'PASS',checks,requests,externalRequests:external,realCredentials:false,authenticator:'virtual CTAP2 with actual verification',pageErrors:errors},null,2)+'\n',{flag:'wx'});
}catch(error){await writeFile(process.env.NEXUS_BROWSER_RESULT,JSON.stringify({status:'FAIL',failure:error.name,detail:String(error.message).slice(0,600),checks,requests,externalRequests:external,pageErrors:errors,unknownPaths:unknown},null,2)+'\n',{flag:'wx'});console.log('FAIL '+error.name);process.exitCode=1}
finally{await browser.close();f.close()}
