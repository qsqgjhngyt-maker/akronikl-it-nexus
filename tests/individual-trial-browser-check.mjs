// Two disposable Chromium profiles, actual BFF/Worker/SQLite, virtual CTAP2. No network or real people.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {fixture} from './helpers/auth-fixture.mjs';
import {sessionContinuityBrowserScenarios} from './helpers/session-continuity-browser-scenarios.mjs';
import {assistantPreferencesBrowserScenarios} from './helpers/assistant-preferences-browser-scenarios.mjs';
import {conversationFilesBrowserScenarios} from './helpers/conversation-files-browser-scenarios.mjs';
import {accountKeyBrowserScenarios} from './helpers/account-key-browser-scenarios.mjs';
import {communityBrowserScenarios} from './helpers/community-browser-scenarios.mjs';
const jpeg=createRequire(new URL('../server-access/package.json',import.meta.url))('jpeg-js');
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const frontend=pathToFileURL(process.env.NEXUS_FRONTEND_DIR.replace(/[\\/]?$/,'/'));
const generation=JSON.parse(await readFile(new URL('version.json',frontend))).releaseCandidate.assetGeneration;
const origin='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net',f=await fixture(frontend,{control:true,productionSchema:true,assistant:true});
const browser=await chromium.launch({executablePath:process.env.NEXUS_CHROME_PATH,headless:true,proxy:{server:'http://127.0.0.1:9'},args:['--disable-background-networking','--disable-component-update']});
const contexts=[],checks=[],boundaries=[],errors=[];let external=0,externalURLs=[],unknown=[];
const contentType=p=>p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':'text/html';
async function profile(){
 const context=await browser.newContext({serviceWorkers:'block'});contexts.push(context);
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==origin){external++;externalURLs.push(url.origin+url.pathname);return route.abort()}
  try{
   const start=performance.now(),result=await f.dispatch(url.href,{method:req.method(),headers:await req.allHeaders(),body:req.postData()});
   if(result){const headers={};for(const[k,v]of Object.entries(result.headers))headers[k]=Array.isArray(v)?v.join('\n'):String(v);boundaries.push({path:url.pathname,status:result.status,durationMs:Math.round(performance.now()-start)});return route.fulfill({status:result.status,headers,body:result.body})}
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:{code:'LOCAL_FIXTURE_NOT_ENABLED'}},headers:{'cache-control':'no-store',vary:'*'}});
   let file=url.pathname.slice(1);if(file.startsWith('releases/'+generation+'/'))file=file.slice(('releases/'+generation+'/').length);
   if(file==='account/entry/')return route.fulfill({body:await readFile(new URL('../server-access/image/public/entry.html',import.meta.url)),contentType:'text/html'});
   if(file.startsWith('account/entry/'))return route.fulfill({body:await readFile(new URL('../server-access/image/public/'+file.split('/').at(-1),import.meta.url)),contentType:contentType(file)});
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
const owner=await profile();
try{
 await owner.page.goto(origin+'/');
 await owner.page.evaluate(async token=>{await(await import('/account/access/passkey-client.js')).register(token)},f.invitation);
 f.enableControl();
 await owner.page.goto(origin+'/index.html#view=account&tab=admin');
 await owner.page.locator('[data-admin-users] tr').waitFor();
 const invite=owner.page.locator('[data-admin-invite]');await invite.locator('[name=trial]').selectOption('custom');await invite.locator('[name=trialHours]').fill('0');await invite.locator('[name=trial]').selectOption('default');assert.equal(await invite.locator('[name=trialHours]').isDisabled(),true);await invite.locator('button').click();
 await owner.page.waitForFunction(()=>document.querySelector('[data-invite-link]')?.value.includes('#invite='));
 const url=await owner.page.locator('[data-invite-link]').inputValue(),id=f.db.prepare('SELECT account_id FROM nexus_admin_invites').get().account_id;
 assert.equal(member(id).trial_minutes,10080);assert.equal(member(id).first_login_at,null);
 assert.match(await owner.page.locator('[data-admin-users]').innerText(),/Создано:|Ссылка до:/);
 const tester=await profile();await tester.page.goto(url);await tester.page.locator('#invitation-profile').waitFor({state:'visible'});await tester.page.locator('#new-username').fill('trial.browser');await tester.page.locator('#new-display-name').fill('Проверка срока');await tester.page.locator('#register').click();await tester.page.waitForURL('**/index.html#view=home');
 const started=member(id);assert.ok(started.first_login_at);assert.equal(Date.parse(started.access_expires_at)-Date.parse(started.first_login_at),604800000);
 await owner.page.locator('[data-admin-refresh]').click();const row=owner.page.locator('[data-admin-users] tr').filter({hasText:'trial.browser'});await row.getByText('Срок доступа',{exact:true}).click();await row.locator('select').selectOption('1440');await row.getByRole('button',{name:'Продлить',exact:true}).click();
 await owner.page.waitForFunction(()=>document.querySelector('[data-admin-status]')?.textContent==='Срок доступа продлён.');assert.equal(Date.parse(member(id).access_expires_at),Date.parse(started.access_expires_at)+86400000);
 const mainSettings=owner.page.locator('[data-admin-settings]');await mainSettings.locator('[name=defaultInvitation]').selectOption('60');await mainSettings.locator('[name=defaultTrial]').selectOption('1440');await mainSettings.locator('button').click();await owner.page.waitForFunction(()=>document.querySelector('[data-admin-status]')?.textContent==='Настройки сохранены.');
 assert.equal(member(id).trial_minutes,11520,'changing defaults keeps the existing access duration');
 await invite.locator('button').click();await owner.page.waitForFunction(old=>document.querySelector('[data-invite-link]')?.value.includes('#invite=')&&document.querySelector('[data-invite-link]').value!==old,url);
 const pending=f.db.prepare('SELECT account_id FROM nexus_admin_invites WHERE account_id<>?').get(id).account_id,beforeInvite=member(pending),pendingRow=owner.page.locator('[data-admin-users] tr[data-account-id="'+pending+'"]');assert.equal(beforeInvite.trial_minutes,1440);
 await pendingRow.getByText('Срок приглашения',{exact:true}).click();const invitationDetails=pendingRow.locator('details').filter({has:owner.page.locator('summary').filter({hasText:'Срок приглашения'})});await invitationDetails.locator('select').selectOption('1440');await invitationDetails.getByRole('button',{name:'Продлить приглашение',exact:true}).click();await owner.page.waitForFunction(()=>document.querySelector('[data-admin-status]')?.textContent==='Приглашение продлено.');assert.equal(Date.parse(member(pending).reserved_until),Date.parse(beforeInvite.reserved_until)+86400000);assert.equal(member(pending).trial_minutes,1440,'invitation extension never changes access duration');
 assert.equal(await row.getByText('Срок приглашения',{exact:true}).count(),0,'accepted invitations cannot be reopened');
 await owner.page.screenshot({path:process.env.NEXUS_TRIAL_SCREENSHOT,fullPage:true});
 console.log(JSON.stringify({errors,blockedExternal:externalURLs,unknown}));assert.deepEqual(errors,[]);assert.deepEqual(unknown,[]);
 console.log(JSON.stringify({status:'TRIAL_ACTUAL_UI_AND_PASSKEY_PASS',checks:['invitation-dates-visible','trial-pending-until-login','real-virtual-passkey-issuance-starts-7-days','ui-extends-existing-deadline-by-24h','independent-main-defaults','hidden-invalid-custom-field-does-not-block-submit','per-user-invitation-extension-leaves-access-unchanged','accepted-link-remains-one-use'],liveCredentials:false,cloudAIRequests:0,externalRequests:0,blockedExternalRequests:external,productionWrites:0}));
}finally{await Promise.all(contexts.map(c=>c.close()));await browser.close();f.close();}
