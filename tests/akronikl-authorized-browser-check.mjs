// Native ESM собранного Nexus + реальные серверные проверки в изолированном стенде.
// Виртуальный CTAP2, SQLite вместо D1, синтетический gateway envelope и тестовые данные.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {authenticatedFixture} from './helpers/akronikl-authenticated-fixture.mjs';
const out=path.resolve(process.env.NEXUS_AKRONIKL_EVIDENCE);await mkdir(out,{recursive:true});
const f=await authenticatedFixture(path.resolve(process.env.NEXUS_FRONTEND_DIR));
let page,projectId,vaultId,fatal=null,version=null;const checks=[];
const phrase='SYNTHETIC_LOCAL_ONLY_DO_NOT_USE_20261026';
const source='// SYNTHETIC_BOUNDARY_BEFORE\nSELECTED_SYNTHETIC_A\n// SYNTHETIC_BOUNDARY_AFTER';
const panel=()=>page.locator('[data-akronikl-panel]');
const check=async(name,fn)=>{await fn();checks.push({name,status:'PASS'});console.log('PASS '+name)};
async function route(hash,selector){await page.evaluate(h=>location.hash=h,hash);await page.locator(selector).waitFor();await page.waitForFunction(()=>{const n=document.querySelector('#offlineApp')||document.querySelector('#app');return n?.dataset.akroniklRoute===location.hash})}
async function open(){await page.locator('[data-akronikl-open],#askAkronikl').first().click();await panel().waitFor()}
async function preview(){await page.locator('#editor').evaluate(e=>{const s=e.value.indexOf('SELECTED_SYNTHETIC_A');e.setSelectionRange(s,s+20)});await open();await panel().locator('input[type=checkbox]').check();await panel().getByRole('button',{name:'Показать контекст',exact:true}).click();await panel().locator('pre').waitFor();assert.equal(await panel().locator('pre').textContent(),'SELECTED_SYNTHETIC_A');}
async function search(){await panel().locator('input[type=search]').fill('указатели');await panel().locator('button[type=submit]').click();await panel().locator('article').first().waitFor()}
async function waitHeld(){const end=Date.now()+5000;while(!f.held&&Date.now()<end)await page.waitForTimeout(20);assert.ok(f.held,'Ответ Account действительно задержан');assert.equal(f.held.status,200)}
try{
 page=await f.launch();version=f.context.browser().version();
 await check('Вход через UI: виртуальный ключ, настоящая проверка подписи и серверная сессия',async()=>{
  await f.enrollOwner(page);
  assert.equal(f.backend.db.prepare('SELECT count(*) n FROM nexus_passkey_credentials').get().n,1);
  const cookies=await f.context.cookies();const c=cookies.find(x=>x.name==='__Host-nexus_session');assert.ok(c?.secure&&c.httpOnly&&c.sameSite==='Strict');
  assert.equal(await page.evaluate(()=>document.cookie.includes('__Host-nexus_session')),false);
  assert.equal(await page.evaluate(async prefix=>(await import(prefix+'core/account-storage.js')).verifiedAccount()?.accountId,f.prefix),'synthetic-owner');
 });
 await check('Разрешённый контекст, поиск и переход к настоящему уроку через UI',async()=>{
  await route('#view=akronikl','[data-akronikl-open]');await open();await panel().getByRole('button',{name:'Показать контекст',exact:true}).click();
  await panel().getByText('Фрагмент кода не включён.',{exact:true}).waitFor();await search();
  await panel().locator('article').first().getByRole('button',{name:'Открыть урок',exact:true}).click();await page.locator('#editor').waitFor();
  assert.match(await page.evaluate(()=>location.hash),/^#course=cpp&lesson=cpp\./);
 });
 await check('Личный проект и прогресс создаются в верифицированном хранилище A',async()=>{
  projectId=await page.evaluate(async({prefix,source})=>{
   const p=await import(prefix+'project-studio/project-store.js'),s=await import(prefix+'core/storage.js');
   const project=p.createProject({title:'Синтетический проект E2E A',entryFile:'main.cpp',files:[{path:'main.cpp',content:source}]});
   s.patchLesson('cpp.programming-process',{completed:true});return project.id;
  },{prefix:f.prefix,source});
  await route('#view=code-studio&project='+projectId,'#editor');await preview();
  assert.equal((await panel().textContent()).includes('SYNTHETIC_BOUNDARY'),false);await page.keyboard.press('Escape');
 });
 await check('Pending Account recheck немедленно скрывает старый код',async()=>{
  await preview();f.holdNextAccount();await page.evaluate(()=>location.hash='#view=akronikl');await panel().waitFor({state:'detached'});await waitHeld();
  const opened=await page.evaluate(()=>{document.querySelector('[data-akronikl-open]')?.click();return !!document.querySelector('[data-akronikl-panel]')});assert.equal(opened,false);
  f.release();await page.locator('[data-akronikl-open]').waitFor();await page.waitForFunction(()=>document.querySelector('#app')?.dataset.akroniklRoute===location.hash);await open();await page.keyboard.press('Escape');
 });
 await check('Настоящий UI подготавливает личную копию из серверного аккаунта',async()=>{
  await route('#view=offline','[data-offline-center]');const form=page.locator('[data-local-create]');
  await form.locator('[name=localPhrase]').fill(phrase);await form.locator('[name=localRepeat]').fill(phrase);await form.locator('button').click();
  await page.locator('[data-local-status]').filter({hasText:'личная копия сохранены'}).waitFor({timeout:90000});
  const href=await page.locator('[data-open-local]').getAttribute('href');vaultId=new URLSearchParams(href.split('#')[1]).get('copy');assert.ok(vaultId);
  await page.locator('[data-open-local]').click();await page.locator('#localPhrase').waitFor();
 });
 await check('Локальная копия: явная разблокировка, сохранение, блокировка и холодный перезапуск',async()=>{
  await page.locator('#localPhrase').fill(phrase);await page.locator('#unlockLocal button').click();await page.locator('#psNewProject').waitFor();
  await route('#view=code-studio&project='+projectId,'#editor');await preview();await page.keyboard.press('Escape');
  await page.locator('#editor').fill(source+'\n// SAVED_BY_REAL_UI');await page.waitForFunction(()=>/^Сохранено на устройстве/.test(document.querySelector('#saveStatus')?.textContent||''));
  await page.locator('#lockLocal').click();await page.locator('#localPhrase').waitFor();assert.equal(await page.locator('#editor').count(),0);
  await f.disconnect();await f.stopBrowser();page=await f.launch();await page.goto(f.origin+'/#copy='+vaultId);await page.locator('#localPhrase').waitFor();
  assert.equal(await page.locator('#editor').count(),0);await page.locator('#localPhrase').fill(phrase);await page.locator('#unlockLocal button').click();await page.locator('#psNewProject').waitFor();
  await route('#view=code-studio&project='+projectId,'#editor');assert.equal(await page.locator('#editor').inputValue(),source+'\n// SAVED_BY_REAL_UI');await preview();
  assert.equal(await page.evaluate(async prefix=>(await import(prefix+'core/account-storage.js')).verifiedAccount(),f.prefix),null);
  await page.screenshot({path:path.join(out,'authorized-to-private.png')});await page.keyboard.press('Escape');await page.locator('#lockLocal').click();await page.locator('#localPhrase').waitFor();
 });
 await f.reconnect();await f.virtualKey(page);
 // Повторная регистрация не нужна: для проверки logout достаточно сохранённой серверной сессии.
 await page.goto(f.origin+'/index.html#view=code-studio&project='+projectId);await page.locator('#editor').waitFor();
 await check('Logout при задержанном реальном ответе 200 не возобновляет доступ к коду',async()=>{
  await preview();f.holdNextAccount();await page.evaluate(()=>location.hash='#view=akronikl');await waitHeld();
  await page.locator('#accountMenuButton').click();await page.locator('[data-unified-logout]').first().click();
  await page.locator('[data-login]').waitFor();f.release();
  assert.equal(await page.locator('#editor,[data-akronikl-panel]').count(),0);
  assert.equal(f.backend.db.prepare("SELECT count(*) n FROM account_sessions WHERE status='active'").get().n,0);
 });
 await check('Обычный аккаунт B через UI не получает проекты A и административные полномочия',async()=>{
  await page.goto(f.origin+'/account/access/');await f.virtualKey(page);const form=page.locator('#public-register');await form.waitFor();
  await form.locator('[name=username]').fill('synthetic-b-final');await form.locator('[name=displayName]').fill('Синтетический B');await form.locator('button').click();
  await page.locator('#status').filter({hasText:'Аккаунт и ключ созданы'}).waitFor();await page.locator('#login').click();await page.locator('.visual-home').waitFor();
  const safe=await page.evaluate(async prefix=>{const storage=await import(prefix+'core/account-storage.js'),projects=await import(prefix+'project-studio/project-store.js');
   const account=storage.verifiedAccount(),caps=await fetch('/api/v2/account/control/capabilities',{headers:{'x-nexus-account-expectation':account.accountId}}).then(r=>r.json());
   return{notA:account?.accountId!=='synthetic-owner',projects:projects.listProjects().length,canManage:caps.canManage};},f.prefix);
  assert.equal(safe.notA,true);assert.equal(safe.projects,0);assert.equal(safe.canManage,false);
  await route('#view=akronikl','[data-akronikl-open]');await open();await panel().getByRole('button',{name:'Показать контекст',exact:true}).click();await panel().getByText('Фрагмент кода не включён.',{exact:true}).waitFor();
  assert.equal((await panel().textContent()).includes('SELECTED_SYNTHETIC_A'),false);await page.keyboard.press('Escape');
 });
 await check('Серверная блокировка B отзывает сессию и закрывает реальное приложение',async()=>{
  await open();const id=await page.evaluate(async prefix=>(await import(prefix+'core/account-storage.js')).verifiedAccount().accountId,f.prefix);
  f.backend.db.prepare("UPDATE nexus_alpha_members SET state='blocked',updated_at=? WHERE account_id=?").run(new Date().toISOString(),id);
  await page.evaluate(()=>location.hash='#view=code-studio');await page.locator('[data-login]').waitFor();assert.equal(await panel().count(),0);
  assert.equal(f.backend.db.prepare("SELECT count(*) n FROM account_sessions WHERE subject_id=? AND status='active'").get(id).n,0);
 });
 assert.deepEqual(f.errors,[]);
}catch(e){fatal={name:e.name,message:e.message};process.exitCode=1;console.error(e.name+': '+e.message);await page?.screenshot({path:path.join(out,'FAILURE.png'),mask:[page.locator('input[type=password],#invitation')]}).catch(()=>{})}
finally{f.release();await f.close();await writeFile(path.join(out,'AUTHORIZED_E2E.json'),JSON.stringify({status:fatal?'FAIL':'PASS',sourceCommit:process.env.NEXUS_SOURCE_COMMIT,checks,fatal,browser:version,node:process.version,errors:f.errors,network:f.network,real:['built-native-ESM','entry-bootstrap-app','BFF','Worker','WebAuthn-signature-verification','server-session-policy','ACL','IndexedDB-encryption','service-worker','CodeStudio-autosave'],fixtures:['virtual-CTAP2','SQLite-D1-adapter','gateway-cookie-envelope','disabled-external-provider-catalogue','synthetic-accounts-projects','disposable-TLS-profile'],realUserLogin:false,productionLive:false,physicalDevices:false},null,2)+'\n')}
