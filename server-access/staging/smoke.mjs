// Live staging end-to-end. Secrets are read locally, never printed or placed in URLs.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {resolve,join} from 'node:path';
import {Agent,fetch} from 'undici';
import {chromium} from '../../tools/qa-browser-driver/node_modules/playwright/index.mjs';
import {validateStage} from './contract.mjs';
const directory=resolve(process.argv[2]),s=validateStage(JSON.parse(await readFile(join(directory,'staging.private.json'),'utf8')));
if(s.mailMode!=='capture')throw Error('CAPTURE_SMOKE_ONLY_LIVE_MAIL_REQUIRES_SEPARATE_ACCEPTANCE');
const browser=await chromium.launch({headless:true,...(process.env.NEXUS_BROWSER_CHANNEL?{channel:process.env.NEXUS_BROWSER_CHANNEL}:{})});
const agent=new Agent({connect:{rejectUnauthorized:false}}),checks=[];
try{
 const context=await browser.newContext({ignoreHTTPSErrors:true}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.name));
 const password='Staging '+randomBytes(18).toString('base64url'),replacement='Recovery '+randomBytes(18).toString('base64url');
 const readCode=async purpose=>{
  const list=JSON.parse(await readFile(join(directory,'mail.private.json'),'utf8'));
  const item=list.filter(v=>v.purpose===purpose&&v.to===s.testEmail).at(-1);assert.ok(item,'CAPTURED_MAIL_REQUIRED');return item.code;
 };
 await page.goto('https://localhost:8443/account/password/');
 await page.locator('#enroll-section summary').click();
 await page.locator('#invitation').fill(s.invitation.invitationToken);await page.locator('#enroll-email').fill(s.testEmail);
 await page.locator('#verify-email').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Если данные подходят'));
 await page.locator('#email-code').fill(await readCode('enroll'));await page.locator('#username').fill('staging.guest');await page.locator('#display-name').fill('Staging Guest');
 await page.locator('#new-password').fill(password);await page.locator('#confirm-password').fill(password);
 await page.locator('#enroll-form button[type=submit]').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Пароль создан'));
 checks.push('Fresh email-bound invitation, captured email proof and enrollment against separate cloud D1');
 await page.locator('#login-email').fill(s.testEmail);await page.locator('#login-password').fill(password);await page.locator('#login-form button').click();await page.waitForURL('**/index.html#view=home');
 await page.waitForFunction(id=>document.getElementById('account').textContent.includes(id),s.invitation.accountId);
 const cookie=(await context.cookies()).find(c=>c.name==='__Host-nexus_session');assert.ok(cookie&&cookie.httpOnly&&cookie.secure&&cookie.sameSite==='Strict');
 checks.push('Pinned Node 22 BFF issues Secure HttpOnly cookie and cloud Worker verifies account session');
 await page.goto('https://localhost:8443/account/password/');await page.locator('#recovery-section summary').click();await page.locator('#recovery-email').fill(s.testEmail);await page.locator('#request-recovery').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Если данные подходят'));
 await page.locator('#recovery-code').fill(await readCode('recover'));await page.locator('#recovery-password').fill(replacement);await page.locator('#recovery-confirm').fill(replacement);await page.locator('#recovery-form button[type=submit]').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Пароль изменён'));
 const stale=await fetch('https://localhost:8443/api/staging/account',{dispatcher:agent,headers:{cookie:cookie.name+'='+cookie.value}});assert.equal(stale.status,401);
 checks.push('Recovery on separate cloud D1 revokes the previously issued session');
 await page.locator('#login-email').fill(s.testEmail);await page.locator('#login-password').fill(password);await page.locator('#login-form button').click();await page.waitForFunction(()=>document.getElementById('status').dataset.error==='true');
 await page.locator('#login-password').fill(replacement);await page.locator('#login-form button').click();await page.waitForURL('**/index.html#view=home');await page.waitForFunction(id=>document.getElementById('account').textContent.includes(id),s.invitation.accountId);
 const logout=await page.evaluate(async()=>{const r=await fetch('/api/v2/account/password/logout',{method:'POST',headers:{'content-type':'application/json','x-nexus-password-write':'1'},body:'{}'});return r.status});assert.equal(logout,200);
 assert.equal((await context.request.get('https://localhost:8443/api/staging/account')).status(),401);assert.deepEqual(errors,[]);
 checks.push('Old password rejected, new password accepted, protected logout revokes session');
 const report={result:'PASS',checks,workerOrigin:s.workerOrigin,databaseName:s.name,databaseId:s.databaseId,mailMode:s.mailMode,realEmailsSent:0,productionWrites:0};
 if(process.env.NEXUS_STAGING_RESULT)await writeFile(process.env.NEXUS_STAGING_RESULT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();await agent.close()}
