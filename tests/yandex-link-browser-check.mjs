// Actual built frontend, BFF, Worker and SQLite; disposable Chrome, synthetic identity only.
// All requests are fulfilled locally. No provider network, real credentials or browser profile.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {fixture} from './helpers/auth-fixture.mjs';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const frontend=pathToFileURL(process.env.NEXUS_FRONTEND_DIR.replace(/[\\/]?$/,'/'));
const generation=JSON.parse(await readFile(new URL('version.json',frontend))).releaseCandidate.assetGeneration;
const origin='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const f=await fixture(frontend,{oauth:true}),results=[],boundaries=[],providerRequests=[],pageErrors=[],navigations=[];
const browser=await chromium.launch({executablePath:process.env.NEXUS_CHROME_PATH,headless:true,proxy:{server:'http://127.0.0.1:9'},args:['--disable-background-networking','--disable-component-update']});
const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
page.setDefaultTimeout(4000);
page.on('pageerror',()=>pageErrors.push('page-error'));
const clockStart=performance.now();
page.on('framenavigated',frame=>{if(frame===page.mainFrame()){const u=new URL(frame.url());navigations.push({path:u.pathname,hash:u.hash.startsWith('#view=')?u.hash:'',atMs:Math.round(performance.now()-clockStart)})}});
const type=p=>p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':'text/html';
let unauthorizedNetwork=0,strictReturnRequests=0,pendingStrictReturn=false,forcedStrictReturns=0;
await context.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 try{
  if(url.origin==='https://oauth.yandex.ru'&&url.pathname==='/authorize'){
   providerRequests.push({forceConfirm:url.searchParams.get('force_confirm')==='yes',pkce:url.searchParams.get('code_challenge_method')==='S256'});
   const target=new URL('/api/v2/account/oauth/yandex/callback',origin);
   target.search=new URLSearchParams({code:'synthetic-approved-code',state:url.searchParams.get('state')});
   const cancel=new URL(target);cancel.searchParams.delete('code');cancel.searchParams.set('error','access_denied');
   return route.fulfill({status:200,contentType:'text/html',body:`<!doctype html><meta name="referrer" content="no-referrer"><title>Synthetic consent</title><a id="confirm" href="${target.href.replaceAll('&','&amp;')}">Confirm synthetic account</a><a id="cancel" href="${cancel.href.replaceAll('&','&amp;')}">Cancel</a>`});
  }
  if(url.origin!==origin){unauthorizedNetwork++;return route.abort()}
  const headers=await req.allHeaders();
  // Deterministic Strict-cookie navigation boundary, independent of Chromium version
  // and the synthetic consent page's route.fulfill redirect classification.
  // Browser HttpOnly cookies remain intact; subsequent same-origin fetch sends them.
  if(url.pathname==='/'&&pendingStrictReturn){delete headers.cookie;pendingStrictReturn=false;forcedStrictReturns++}
  if(req.isNavigationRequest()&&url.pathname==='/'&&!headers.cookie?.includes('__Host-nexus_session='))strictReturnRequests++;
  const result=await f.dispatch(url.href,{method:req.method(),headers,body:req.postData()});
  if(result){
   if(url.pathname==='/api/v2/account/oauth/yandex/callback'&&result.status===303)pendingStrictReturn=true;
   boundaries.push({path:url.pathname,status:result.status,durationMs:f.metrics.at(-1).durationMs});
   const h={};for(const[k,v]of Object.entries(result.headers))h[k]=Array.isArray(v)?v.join('\n'):String(v);
   // Playwright does not route a redirect chain's subsequent network hop. Keep the
   // real BFF 303/Set-Cookie assertion, then deliver its fixed public destination
   // as a new explicit navigation. A dead proxy denies every unhandled request.
   if(result.status===303){
    const destination=new URL(h.location);assert.equal(destination.origin,origin);assert.equal(destination.pathname,'/');assert.equal(destination.search,'');
    delete h.location;delete h['content-length'];h['content-type']='text/html';
    return route.fulfill({status:200,headers:h,body:'<!doctype html><script>location.replace('+JSON.stringify(destination.href)+')</script>'});
   }
   return route.fulfill({status:result.status,headers:h,body:result.body});
  }
  let path=url.pathname.slice(1);
  if(path==='account/access/passkey-client.js')return route.fulfill({body:await readFile(new URL('../server-access/image/public/passkey-client.js',import.meta.url)),contentType:'text/javascript'});
  if(path==='account/entry/')path='index.html';
  else if(path.startsWith('account/entry/'))path='entry-assets/'+generation+'/'+path.split('/').at(-1);
  if(!path||path.includes('..'))return route.fulfill({status:404,body:''});
  return route.fulfill({body:await readFile(new URL(path,frontend)),contentType:type(path)});
 }catch{return route.fulfill({status:500,body:'SYNTHETIC_FIXTURE_FAILED'})}
});
const check=async(name,fn)=>{const start=performance.now();try{await fn();results.push({name,status:'PASS',durationMs:Math.round(performance.now()-start)})}catch(error){results.push({name,status:'FAIL',failure:error.name,detail:String(error.message).slice(0,1200),pageState:await page.evaluate(()=>({path:location.pathname,hash:location.hash,boot:document.querySelector('#boot-status')?.textContent?.slice(0,300)||null,hasAccount:!!document.querySelector('[data-unified-account]'),hasApp:!!document.querySelector('#app')})).catch(()=>null),durationMs:Math.round(performance.now()-start)})}console.log(results.at(-1).status+' '+name)};
const count=table=>f.db.prepare('SELECT count(*) n FROM '+table).get().n;
const app=async()=>{await page.locator('[data-unified-account]').waitFor()};
try{
 const cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');
 await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
 await page.goto(origin+'/');
 await page.evaluate(async invitation=>{await(await import('/account/access/passkey-client.js')).register(invitation)},f.invitation);
 await page.goto(origin+'/index.html#view=account&tab=security');await app();
 await check('built security link starts one transaction, with explicit Yandex account confirmation',async()=>{
  const before=count('nexus_oauth_transactions');await page.locator('[data-provider=yandex]').click();await page.locator('#confirm').waitFor();
  assert.equal(count('nexus_oauth_transactions'),before+1);assert.equal(providerRequests.at(-1).pkce,true);assert.equal(providerRequests.at(-1).forceConfirm,true);
 });
 await check('link callback returns automatically to built Security through Strict-cookie server proof',async()=>{
  await page.locator('#confirm').click();
  // An account element from a departing document is not proof of a completed return.
  const deadline=Date.now()+4000;while(!forcedStrictReturns&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,25));
  await page.waitForURL(url=>url.origin===origin&&url.pathname==='/index.html'&&url.hash==='#view=account&tab=security');await app();
  assert.equal(new URL(page.url()).hash,'#view=account&tab=security');
  assert.equal(count('oauth_identities'),1);assert.equal(count('account_subjects'),1);
  assert.equal(f.db.prepare('SELECT account_id FROM oauth_identities').get().account_id,'synthetic-owner');
  assert.equal(forcedStrictReturns,1);assert.ok(strictReturnRequests>=1);
 });
 // Allow later checks to execute on the broken baseline while retaining the preceding failure.
 await page.goto(origin+'/index.html#view=account');await app();
 await page.evaluate(()=>localStorage.setItem('akronikl:it-nexus:account-store:v1:synthetic-owner:akronikl:it-nexus:projects:v1','synthetic-project-preservation'));
 await check('actual Account logout revokes OAuth session and keeps account projects',async()=>{
  const activeBefore=f.db.prepare("SELECT count(*) n FROM account_sessions WHERE status='active'").get().n;
  await page.locator('[data-unified-logout]').last().click();await page.waitForURL('**/account/entry/');
  assert.equal(f.db.prepare("SELECT count(*) n FROM account_sessions WHERE status='active'").get().n,activeBefore-1);
  assert.equal((await context.cookies()).some(c=>c.name==='__Host-nexus_session'),false);
 });
 // The real static entry document is served by the BFF server in production.
 await page.goto(origin+'/');
 await check('Yandex repeat login opens the same Account automatically without a second click',async()=>{
  await page.locator('[data-provider=yandex]').click();await page.locator('#confirm').waitFor();
  assert.equal(providerRequests.at(-1).forceConfirm,true);await page.locator('#confirm').click();
  await page.waitForURL('**/index.html#view=home');await page.locator('#app .app-shell').waitFor().catch(async()=>assert.ok(await page.locator('#app').evaluate(n=>n.children.length>0)));
  assert.equal(count('account_subjects'),1);assert.equal(count('oauth_identities'),1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('akronikl:it-nexus:account-store:v1:synthetic-owner:akronikl:it-nexus:projects:v1')),'synthetic-project-preservation');
 });
 await check('provider cancellation creates no session, clears only flow and keeps the existing account',async()=>{
  await page.goto(origin+'/');const before=count('account_sessions');
  // Use the public entry to request a new explicit provider login while a session exists.
  await page.goto(origin+'/account/entry/');await page.locator('[data-provider=yandex]').click();await page.locator('#cancel').click();
  await page.getByRole('heading',{name:'Не удалось завершить вход'}).waitFor();
  assert.equal(count('account_sessions'),before);assert.equal(count('oauth_identities'),1);
  const cookies=await context.cookies();assert.ok(cookies.some(c=>c.name==='__Host-nexus_session'));assert.equal(cookies.some(c=>c.name==='__Host-nexus_oauth_flow'),false);
  await page.goto(origin+'/index.html#view=account');await app();
 });
 await check('forged OAuth link hint after logout cannot open private app or create a session',async()=>{
  await page.locator('[data-unified-logout]').last().click();await page.waitForURL('**/account/entry/');
  const before=count('account_sessions');await page.goto(origin+'/#nexusLogin=oauth&view=account&tab=security');
  await page.locator('[data-status][data-tone=error]').waitFor();
  assert.equal(await page.locator('[data-unified-account]').count(),0);assert.equal(count('account_sessions'),before);
  assert.equal(new URL(page.url()).hash,'#view=account&tab=security');
 });
 assert.equal(unauthorizedNetwork,0);
 const result={status:results.every(x=>x.status==='PASS')?'PASS':'FAIL',checks:results,boundaries,providerRequests,strictReturnRequests,forcedStrictReturns,externalRequests:0,realAccounts:false,pageErrors,navigations};
 await writeFile(process.env.NEXUS_BROWSER_RESULT,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 if(result.status!=='PASS')process.exitCode=1;
}catch(error){
 const diagnostics={status:'FIXTURE_OR_SETUP_FAIL',failure:error.name,checks:results,boundaries,providerRequests,pageErrors,navigations,currentPath:new URL(page.url()).pathname,externalRequests:unauthorizedNetwork};
 await writeFile(process.env.NEXUS_BROWSER_RESULT,JSON.stringify(diagnostics,null,2)+'\n',{flag:'wx'});process.exitCode=1;
 console.log(JSON.stringify({status:diagnostics.status,failure:diagnostics.failure,currentPath:diagnostics.currentPath,boundaries}));
}finally{await browser.close();f.close()}
