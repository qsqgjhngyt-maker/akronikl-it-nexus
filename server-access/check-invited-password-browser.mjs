// Real headless browser UI with intercepted synthetic HTTPS endpoints only.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '../tools/qa-browser-driver/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,...(process.env.NEXUS_BROWSER_CHANNEL?{channel:process.env.NEXUS_BROWSER_CHANNEL}:{})});
const checks=[],requests=[],errors=[];
try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await context.addInitScript(()=>{
   window.passkeyCalls=0;
   Object.defineProperty(navigator,'credentials',{value:{get(){window.passkeyCalls++;throw Error('UNEXPECTED_PASSKEY')},create(){window.passkeyCalls++;throw Error('UNEXPECTED_PASSKEY')}}});
  });
  await context.route('**/*',async route=>{
   const r=route.request(),url=new URL(r.url());assert.equal(url.origin,'https://nexus.invalid');
   if(url.pathname==='/account/password/')return route.fulfill({contentType:'text/html',body:await readFile(new URL('public/password.html',import.meta.url),'utf8')});
   if(url.pathname==='/account/password/password.js')return route.fulfill({contentType:'text/javascript',body:await readFile(new URL('public/password.js',import.meta.url),'utf8')});
   if(url.pathname.startsWith('/api/v2/account/password/')){
    assert.equal(r.method(),'POST');assert.equal(r.headers()['x-nexus-password-write'],'1');const body=r.postDataJSON();requests.push({path:url.pathname,body});
    const rejected=url.pathname.endsWith('/login')&&body.email==='unknown@example.com';
    return route.fulfill({status:rejected?401:200,contentType:'application/json',body:JSON.stringify(rejected?{error:{code:'AUTH_FAILED'}}:{ok:true})});
   }
   assert.equal(url.pathname,'/index.html');return route.fulfill({contentType:'text/html',body:'<h1>Synthetic Nexus home</h1>'});
  });
  await page.goto('https://nexus.invalid/account/password/#invite=npi_'+'I'.repeat(43));
  await page.waitForFunction(()=>document.getElementById('enroll-section').open);
  assert.equal(new URL(page.url()).hash,'');
  await page.locator('#enroll-email').fill('guest@example.com');await page.locator('#verify-email').click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Если данные подходят'));
  await page.locator('#email-code').fill('C'.repeat(43));await page.locator('#username').fill('guest.ui');await page.locator('#display-name').fill('Гость Nexus');
  await page.locator('#new-password').fill('My synthetic UI password 123');await page.locator('#confirm-password').fill('My synthetic UI password 123');
  await page.locator('#enroll-form button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Пароль создан'));
  assert.equal(await page.locator('#new-password').inputValue(),'');assert.equal(await page.locator('#email-code').inputValue(),'');
  await page.locator('#recovery-section summary').click();await page.locator('#recovery-email').fill('guest@example.com');await page.locator('#request-recovery').click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Если данные подходят'));
  await page.locator('#recovery-code').fill('R'.repeat(43));await page.locator('#recovery-password').fill('My replacement UI password 567');await page.locator('#recovery-confirm').fill('My replacement UI password 567');
  await page.locator('#recovery-form button[type=submit]').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Пароль изменён'));
  await page.locator('#login-email').fill('unknown@example.com');await page.locator('#login-password').fill('Wrong synthetic password 123');await page.locator('#login-form button').click();
  await page.waitForFunction(()=>document.getElementById('status').dataset.error==='true');assert.equal(await page.locator('#login-password').inputValue(),'');
  assert.equal(await page.evaluate(()=>window.passkeyCalls),0);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#login-email').fill('guest@example.com');await page.locator('#login-password').fill('My replacement UI password 567');await page.locator('#login-form button').click();await page.waitForURL('**/index.html#view=home');
  checks.push('Enrollment, recovery, neutral failure and login without WebAuthn at '+viewport.width+'px');await context.close();
 }
 assert.deepEqual(errors,[]);assert.equal(requests.filter(r=>r.path.endsWith('/enroll')).length,2);assert.equal(requests.filter(r=>r.path.endsWith('/reset')).length,2);
 console.log(JSON.stringify({result:'PASS',checks,syntheticOnly:true},null,2));
}finally{await browser.close()}
