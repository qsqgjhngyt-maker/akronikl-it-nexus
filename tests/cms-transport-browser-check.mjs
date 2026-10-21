// Two disposable Chromium profiles, actual BFF/Worker/SQLite, virtual CTAP2. No network or real people.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {fixture} from './helpers/auth-fixture.mjs';
import {communityBrowserScenarios} from './helpers/community-browser-scenarios.mjs';
const jpeg=createRequire(new URL('../server-access/package.json',import.meta.url))('jpeg-js');
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const frontend=pathToFileURL(process.env.NEXUS_FRONTEND_DIR.replace(/[\\/]?$/,'/'));
const generation=JSON.parse(await readFile(new URL('version.json',frontend))).releaseCandidate.assetGeneration;
const origin='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net',f=await fixture(frontend,{control:true});
const browser=await chromium.launch({executablePath:process.env.NEXUS_CHROME_PATH,headless:true,proxy:{server:'http://127.0.0.1:9'},args:['--disable-background-networking','--disable-component-update']});
let readFailures=0,dropWrite=false,capsDelay=0;const contexts=[],checks=[],boundaries=[],errors=[];let external=0,unknown=[];
const contentType=p=>p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':'text/html';
async function profile(){
 const context=await browser.newContext({serviceWorkers:'block'});contexts.push(context);
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==origin){external++;return route.abort()}
  try{
   if(url.pathname.endsWith('/control/capabilities')&&capsDelay)await new Promise(r=>setTimeout(r,capsDelay));
   if(url.pathname.endsWith('/control/content')&&req.method()==='GET'&&readFailures>0){readFailures--;return route.fulfill({status:503,json:{error:{code:'CONTROL_UNAVAILABLE'}},headers:{'cache-control':'no-store',vary:'Accept-Encoding, *'}})}
   const start=performance.now(),result=await f.dispatch(url.href,{method:req.method(),headers:await req.allHeaders(),body:req.postData()});
   if(result){const headers={};for(const[k,v]of Object.entries(result.headers))headers[k]=Array.isArray(v)?v.join('\n'):String(v);if(url.pathname.includes('/control/'))headers.vary='Accept-Encoding, *';boundaries.push({path:url.pathname,method:req.method(),status:result.status,vary:headers.vary,durationMs:Math.round(performance.now()-start)});if(dropWrite&&url.pathname.endsWith('/control/content')&&req.method()==='POST'){dropWrite=false;return route.fulfill({status:503,json:{error:{code:'CONTROL_UNAVAILABLE'}},headers:{'cache-control':'no-store',vary:'Accept-Encoding, *'}})};return route.fulfill({status:result.status,headers,body:result.body})}
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:{code:'LOCAL_FIXTURE_NOT_ENABLED'}},headers:{'cache-control':'no-store',vary:'*'}});
   let file=url.pathname.slice(1);
   if(file==='account/entry/')file='index.html';
   else if(file.startsWith('account/entry/'))file='entry-assets/'+generation+'/'+file.split('/').at(-1);
   if(file==='account/access/')return route.fulfill({body:await readFile(new URL('../server-access/image/public/index.html',import.meta.url)),contentType:'text/html'});
   if(file.startsWith('account/access/'))return route.fulfill({body:await readFile(new URL('../server-access/image/public/'+file.split('/').at(-1),import.meta.url)),contentType:'text/javascript'});
   if(!file||file.includes('..'))throw Error('UNKNOWN_PATH');
   return route.fulfill({body:await readFile(new URL(file,frontend)),contentType:contentType(file)});
  }catch{unknown.push(url.pathname);return route.fulfill({status:404,body:''})}
 });
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',()=>errors.push('page-error'));
 const cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');
 await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
 return {context,page};
}
const check=async(name,fn)=>{const start=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-start)});console.log('PASS '+name)};
const member=id=>f.db.prepare('SELECT * FROM nexus_alpha_members WHERE account_id=?').get(id);
const owner=await profile();let tester,inviteURL,testerId,avatarBefore;
const {BLOG_DRAFTS}=await import('../core/blog-seeds.js');
const writes=()=>boundaries.filter(x=>x.path.endsWith('/control/content')&&x.method==='POST').length;
const form=()=>owner.page.locator('[data-content-editor] form');
const title=()=>form().locator('[name=title]');
const ready=()=>owner.page.locator('[data-content-admin][data-content-state=ready]').waitFor();
try{
 await owner.page.goto(origin+'/');await owner.page.evaluate(async token=>{await(await import('/account/access/passkey-client.js')).register(token)},f.invitation);f.enableControl();
 for(let n=0;n<3;n++){const p=BLOG_DRAFTS[n];f.db.prepare("INSERT INTO nexus_content_posts(id,slug,draft_json,state,version,updated_at) VALUES(?,?,?,'draft',1,?)").run('00000000-0000-4000-8000-00000000000'+n,p.slug,JSON.stringify({title:p.title,summary:p.summary,body:p.body.trim()}),new Date().toISOString())}
 await check('normalized proxy Vary: all three existing drafts and separate Publish are visible',async()=>{
  await owner.page.goto(origin+'/index.html#view=admin&tab=content');await ready();assert.equal(await owner.page.locator('[data-content-list] button').count(),3);
  await owner.page.locator('.blog-seed-list summary').click();await owner.page.locator('[data-content-seeds] button').first().click();
  assert.equal(await owner.page.locator('[data-content-editor] h2').innerText(),'Статья блога');assert.equal(await form().locator('[data-publish]').count(),1);assert.equal(writes(),0);
  if(process.env.NEXUS_SCREENSHOT_DIR)await owner.page.screenshot({path:process.env.NEXUS_SCREENSHOT_DIR+'/cms-fixed.png',fullPage:true});
 });
 await check('publish cancellation writes nothing; explicit publication exposes the saved version',async()=>{
  owner.page.once('dialog',d=>d.dismiss());await form().locator('[data-publish]').click();assert.equal(writes(),0);
  owner.page.once('dialog',d=>d.accept());await form().locator('[data-publish]').click();await owner.page.getByText('Опубликовано.',{exact:true}).waitFor();assert.equal(writes(),1);
  assert.equal(f.db.prepare('SELECT state FROM nexus_content_posts WHERE slug=?').get(BLOG_DRAFTS[0].slug).state,'published');
  await owner.page.goto(origin+'/#view=blog&article='+BLOG_DRAFTS[0].slug);await owner.page.getByRole('heading',{name:BLOG_DRAFTS[0].title,exact:true}).waitFor();
 });
 await check('initial read failure cannot be hidden by seed buttons; manual read recovers existing drafts',async()=>{
  readFailures=1;await owner.page.goto(origin+'/#view=admin&tab=content');await owner.page.locator('[data-content-state=read-error]').waitFor();
  assert.equal(await owner.page.locator('[data-content-new]').isDisabled(),true);assert.equal(await owner.page.locator('[data-content-seeds] button').first().isDisabled(),true);assert.equal(await form().count(),0);
  const before=writes();await owner.page.locator('[data-content-refresh]').click();await ready();assert.equal(writes(),before);assert.equal(await owner.page.locator('[data-content-list] button').count(),3);
 });
 await check('acknowledged save plus read failure preserves fields and recovers by GET without duplicate write',async()=>{
  await owner.page.locator('[data-content-list] button').nth(1).click();await title().fill('SYNTHETIC_ACKNOWLEDGED_DRAFT');const before=writes();readFailures=1;
  await form().locator('button[type=submit]').click();await owner.page.getByText('Сервер подтвердил изменение, но список не обновился.',{exact:false}).waitFor();
  assert.equal(await title().inputValue(),'SYNTHETIC_ACKNOWLEDGED_DRAFT');assert.equal(await form().locator('button[type=submit]').isDisabled(),true);assert.equal(writes(),before+1);
  await owner.page.locator('[data-content-refresh]').click();await ready();assert.equal(await title().inputValue(),'SYNTHETIC_ACKNOWLEDGED_DRAFT');assert.equal(writes(),before+1);assert.equal(await form().locator('[data-publish]').isEnabled(),true);
 });
 await check('unknown write outcome is reconciled once by read; operation is never resent',async()=>{
  await title().fill('SYNTHETIC_UNKNOWN_WRITE_CONFIRMED');dropWrite=true;const before=writes();await form().locator('button[type=submit]').click();
  await owner.page.getByText('Сохранённая версия подтверждена сервером.',{exact:false}).waitFor();assert.equal(writes(),before+1);assert.equal(await title().inputValue(),'SYNTHETIC_UNKNOWN_WRITE_CONFIRMED');
 });
 await check('409 conflict preserves unsaved text, requires explicit server-version selection and never overwrites',async()=>{
  const slug=await form().locator('[name=slug]').inputValue(),old=f.db.prepare('SELECT draft_json,version FROM nexus_content_posts WHERE slug=?').get(slug),other={...JSON.parse(old.draft_json),title:'SYNTHETIC_OTHER_TAB_VERSION'};
  f.db.prepare('UPDATE nexus_content_posts SET draft_json=?,version=version+1 WHERE slug=?').run(JSON.stringify(other),slug);
  await title().fill('SYNTHETIC_UNSAVED_TEXT_MUST_SURVIVE');const before=writes();await form().locator('button[type=submit]').click();await owner.page.locator('[data-content-state=conflict]').waitFor();
  assert.equal(await title().inputValue(),'SYNTHETIC_UNSAVED_TEXT_MUST_SURVIVE');assert.equal(await form().locator('button[type=submit]').isDisabled(),true);assert.equal(writes(),before+1);
  assert.equal(JSON.parse(f.db.prepare('SELECT draft_json FROM nexus_content_posts WHERE slug=?').get(slug).draft_json).title,other.title);
  await owner.page.locator('[data-content-refresh]').click();assert.equal(await title().inputValue(),'SYNTHETIC_UNSAVED_TEXT_MUST_SURVIVE');assert.equal(writes(),before+1);
  await owner.page.getByRole('button',{name:'SYNTHETIC_OTHER_TAB_VERSION · Черновик',exact:true}).click();assert.equal(await title().inputValue(),other.title);
 });
 await check('temporary list failure preserves unsaved editor fields during manual refresh',async()=>{
  await title().fill('SYNTHETIC_LOCAL_EDIT_ONLY');readFailures=1;const before=writes();await owner.page.locator('[data-content-refresh]').click();await owner.page.locator('[data-content-state=read-error]').waitFor();
  assert.equal(await title().inputValue(),'SYNTHETIC_LOCAL_EDIT_ONLY');await owner.page.locator('[data-content-refresh]').click();await ready();assert.equal(await title().inputValue(),'SYNTHETIC_LOCAL_EDIT_ONLY');assert.equal(writes(),before);
 });
 await check('native CacheStorage rejects private mixed wildcard responses',async()=>{
  const result=await owner.page.evaluate(async()=>{const cache=await caches.open('synthetic-private-header-negative');const out=[];for(const vary of ['*','Accept-Encoding, *','*, Accept-Encoding']){try{await cache.put('/api/v2/account/control/content',new Response('SYNTHETIC_ONLY',{headers:{vary,'cache-control':'no-store'}}));out.push('UNSAFE')}catch(e){out.push(e.name)}}return {out,entries:(await cache.keys()).length}});
  assert.deepEqual(result,{out:['TypeError','TypeError','TypeError'],entries:0});
 });
 await check('team navigation survives rerender while fresh capabilities are delayed; protected body waits',async()=>{
  capsDelay=700;await owner.page.evaluate(()=>{location.hash='view=home'});await owner.page.locator('#visualHomeTitle').waitFor();assert.equal(await owner.page.locator('[data-team-navigation]').count(),1);
  await owner.page.evaluate(()=>{location.hash='view=admin&tab=content'});await owner.page.locator('[data-administration]').waitFor();assert.equal(await owner.page.locator('[data-team-navigation]').count(),1);assert.equal(await owner.page.locator('[data-administration-body]').isHidden(),true);
  await ready();capsDelay=0;
 });
 await check('expired navigation hint cannot grant a protected panel; coalesced reads remain server-gated',async()=>{
  const result=await owner.page.evaluate(async generation=>{const mod=await import('/releases/'+generation+'/core/administration.js');const now=Date.now;Date.now=()=>now()+61000;const a=mod.bindAdministration({tab:'content'}),b=mod.bindAdministration({tab:'content'});const before=document.querySelectorAll('[data-team-navigation]').length;Date.now=now;await Promise.all([a,b]);return {before,after:document.querySelectorAll('[data-team-navigation]').length}},generation);
  assert.equal(result.before,0);assert.equal(result.after,1);
 });
 await check('server role revocation removes navigation and denies content even after a prior positive hint',async()=>{
  const now=new Date().toISOString();f.db.prepare("INSERT INTO nexus_alpha_members(account_id,state,created_at,updated_at) VALUES('synthetic-owner','active',?,?)").run(now,now);f.db.exec("UPDATE nexus_admin_grants SET status='revoked' WHERE account_id='synthetic-owner'");
  await owner.page.evaluate(()=>{location.hash='view=home'});await owner.page.locator('#visualHomeTitle').waitFor();await owner.page.waitForFunction(()=>!document.querySelector('[data-team-navigation]'));
  await owner.page.evaluate(()=>{location.hash='view=admin&tab=content'});await owner.page.getByText('Этот раздел доступен только команде Nexus.',{exact:true}).waitFor();assert.equal(await owner.page.locator('[data-content-editor]').count(),0);
 });
 await check('anonymous context never inherits team navigation or saved draft content',async()=>{
  const anonymous=await profile();await anonymous.page.goto(origin+'/index.html#view=admin&tab=content');await anonymous.page.locator('[data-login]').first().waitFor();assert.equal(await anonymous.page.locator('[data-team-navigation]').count(),0);assert.equal(await anonymous.page.locator('[data-content-list]').count(),0);
 });
 assert.equal(external,0);assert.deepEqual(errors,[]);
 await writeFile(process.env.NEXUS_BROWSER_RESULT,JSON.stringify({status:'PASS',checks,boundaries,externalRequests:0,realAccounts:false,productionWrites:0,pageErrors:errors},null,2)+'\n',{flag:'wx'});
}catch(error){await writeFile(process.env.NEXUS_BROWSER_RESULT,JSON.stringify({status:'FAIL',checks,error:{name:error.name,message:error.message},statusText:await owner.page.locator('[data-content-status]').innerText().catch(()=>''),boundaries,pageErrors:errors,productionWrites:0},null,2)+'\n',{flag:'wx'});console.error(error.message);process.exitCode=1}
finally{await browser.close();f.close()}
