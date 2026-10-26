// Сквозной built Nexus, настоящий BFF/Worker/SQL и виртуальный CTAP2.
// Транспорт, Gateway context и D1 binding локальные; это не вход владельца и не cloud LIVE.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {acceptanceHarness,origin,enroll,signOut,appReady} from './helpers/akronikl-acceptance-harness.mjs';
const out=process.env.NEXUS_AKRONIKL_EVIDENCE;
if(!out||!process.env.NEXUS_FRONTEND_DIR)throw Error('ACCEPTANCE_ENV_REQUIRED');
await mkdir(out,{recursive:true});
const h=await acceptanceHarness({candidate:process.env.NEXUS_FRONTEND_DIR});
const prefix='/'+h.current.manifest.prefix,f=h.current.f;
const checks=[],errors=[];let context,page,profile,fatal=null,version=null,copyA,copyB;
const projectId='synthetic-ak02-same-project',phraseA=randomBytes(24).toString('base64url'),phraseB=randomBytes(24).toString('base64url');
const original='// synthetic before\nSELECTED_A\n// synthetic after',edited=original+'\n// SAVED_IN_PRIVATE_COPY';
async function launch(){const x=await h.launch({profile});context=x.context;profile=x.profile;version=context.browser()?.version();page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));}
const panel=()=>page.locator('[data-akronikl-panel]');
async function route(hash){await page.evaluate(hash=>location.hash=hash,hash);await page.waitForFunction(()=>document.querySelector('#app')?.dataset.akroniklRoute===location.hash||document.querySelector('#offlineApp')?.dataset.akroniklRoute===location.hash);}
async function open(){await page.locator('[data-akronikl-open],#askAkronikl').first().click();await panel().waitFor();}
async function search(query='указатели'){await panel().locator('input[type=search]').fill(query);await panel().locator('button[type=submit]').click();await panel().locator('article').first().waitFor();}
async function seedProject(marker){return page.evaluate(async({prefix,id,marker})=>{
 const store=await import(prefix+'project-studio/project-store.js');
 const created=store.createProject({id,title:'Синтетический проект проверки',entryFile:'main.cpp',files:[{path:'main.cpp',languageId:'cpp',content:marker}]});
 (await import(prefix+'core/storage.js')).patchLesson('cpp.programming-process',{completed:true});return created.id;
},{prefix,id:projectId,marker});}
async function makeCopy(phrase){
 await route('#view=offline');const form=page.locator('[data-local-create]');await form.locator('[name=localPhrase]').fill(phrase);await form.locator('[name=localRepeat]').fill(phrase);await form.locator('button').click();
 await page.waitForFunction(()=>document.querySelector('[data-local-status]')?.textContent.includes('личная копия сохранены'),{},{timeout:90000});
 return new URLSearchParams((await page.locator('[data-open-local]').getAttribute('href')).split('#')[1]).get('copy');
}
async function unlock(id,phrase){await page.goto(origin+'/offline.html#copy='+id);await page.locator('#localPhrase').fill(phrase);await page.locator('#unlockLocal button').click();await page.locator('#psNewProject').waitFor();await route('#view=code-studio&project='+projectId);await page.locator('#editor').waitFor();}
async function preview(marker){
 await page.locator('#editor').evaluate((n,marker)=>{const start=n.value.indexOf(marker);if(start<0)throw Error('SYNTHETIC_SELECTION_MISSING');n.setSelectionRange(start,start+marker.length)},marker);
 await open();await panel().locator('input[type=checkbox]').check();await panel().getByRole('button',{name:'Показать контекст',exact:true}).click();await panel().locator('pre').waitFor();assert.equal(await panel().locator('pre').textContent(),marker);
}
async function check(name,fn){const start=performance.now();await fn();checks.push({name,status:'PASS',ms:Math.round(performance.now()-start)});console.log('PASS '+name);}
try{
 await launch();await page.goto(origin+'/index.html#view=akronikl');
 await check('Анонимный запрос не получает личную оболочку или Akronikl',async()=>{
  await page.locator('[data-login]').waitFor();assert.equal(await panel().count(),0);
  assert.equal(h.requests.some(r=>r.path.endsWith('/core/app.js')),false);
  assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/v2/account');return r.status}),401);
 });
 await enroll(page,f.invitation);f.enableControl();await signOut(page);await page.goto(origin+'/');
 await check('Нажатие входа проходит виртуальный WebAuthn и настоящий серверный proof',async()=>{
  await page.locator('[data-login]').click();await appReady(page);
  const c=(await context.cookies()).find(c=>c.name==='__Host-nexus_session');assert.ok(c?.httpOnly&&c.secure&&c.sameSite==='Strict');
  assert.equal(await page.evaluate(()=>document.cookie.includes('__Host-nexus_session')),false);
  assert.equal(await page.evaluate(async prefix=>(await import(prefix+'core/account-storage.js')).verifiedAccount()?.accountId,prefix),'synthetic-owner');
  assert.equal(f.db.prepare("SELECT count(*) n FROM account_sessions WHERE status='active'").get().n,1);
 });
 await check('Настоящее приложение показывает разрешённый контекст и открывает урок из поиска',async()=>{
  await route('#view=akronikl');await open();await panel().getByRole('button',{name:'Показать контекст',exact:true}).click();
  await panel().getByText('Фрагмент кода не включён.',{exact:true}).waitFor();await search();
  await panel().locator('article').first().getByRole('button',{name:'Открыть урок',exact:true}).click();await page.locator('#editor').waitFor();
  assert.match(new URL(page.url()).hash,/lesson=cpp\./);assert.equal(await panel().count(),0);
 });
 await seedProject(original);await route('#view=code-studio&project='+projectId);
 await check('Выбранный код из реального личного проекта; чтение не изменяет исходники/прогресс',async()=>{
  await preview('SELECTED_A');const values=await page.evaluate(async({prefix,id})=>{
   const project=(await import(prefix+'project-studio/project-store.js')).getProject(id);return{code:project.workspace.files[0].content,completed:(await import(prefix+'core/storage.js')).lessonState('cpp.programming-process').completed};
  },{prefix,id:projectId});assert.equal(values.code,original);assert.equal(values.completed,true);
 });
 await check('Панель очищается до ответа настоящей задержанной проверки сессии',async()=>{
  h.holdAccount();await page.evaluate(()=>location.hash='#view=academy');
  await panel().waitFor({state:'detached'});const end=Date.now()+5000;while(!h.pendingAccount&&Date.now()<end)await page.waitForTimeout(20);assert.ok(h.pendingAccount);
  assert.equal(await page.evaluate(()=>document.querySelector('#app')?.dataset.akroniklRoute===location.hash),false);
  h.releaseAccount();await page.waitForFunction(()=>document.querySelector('#app')?.dataset.akroniklRoute===location.hash);
 });
 await check('Личная копия создаётся штатным UI после повторного Account proof',async()=>{copyA=await makeCopy(phraseA);assert.ok(copyA);});
 await check('Штатная offline-оболочка сохраняет изменение и закрывает доступ к коду',async()=>{
  await unlock(copyA,phraseA);await page.locator('#editor').fill(edited);await page.waitForFunction(()=>document.querySelector('#saveStatus')?.textContent.startsWith('Сохранено на устройстве'));
  await preview('SELECTED_A');await page.keyboard.press('Escape');await page.locator('#lockLocal').click();await page.locator('#unlockLocal').waitFor();
  assert.equal(await panel().count(),0);assert.equal(await page.locator('#editor').count(),0);assert.equal((await page.locator('body').textContent()).includes('SELECTED_A'),false);
 });
 await check('Полный перезапуск без сети сохраняет копию, но не выдаёт локальную фразу за server proof',async()=>{
  await context.close();h.setOffline(true);await launch();const response=await page.goto(origin+'/#copy='+copyA);assert.equal(response.fromServiceWorker(),true);
  assert.equal(await page.locator('#editor').count(),0);await page.locator('#localPhrase').fill(phraseA);await page.locator('#unlockLocal button').click();await page.locator('#psNewProject').waitFor();
  await route('#view=code-studio&project='+projectId);assert.equal(await page.locator('#editor').inputValue(),edited);
  assert.equal(await page.evaluate(async prefix=>(await import(prefix+'core/account-storage.js')).verifiedAccount(),prefix),null);
  await preview('SELECTED_A');await page.screenshot({path:path.join(out,'authorized-to-cold-private.png')});await page.keyboard.press('Escape');await page.locator('#lockLocal').click();
 });
 h.setOffline(false);await page.goto(origin+'/index.html#view=offline');await appReady(page);
 await check('После возвращения сети явный импорт переносит сохранённое изменение в тот же аккаунт',async()=>{
  const form=page.locator('[data-local-import]');await form.locator('select').selectOption(copyA);await form.locator('input').fill(phraseA);await form.locator('button').click();
  await page.waitForFunction(()=>document.querySelector('[data-local-status]')?.textContent.startsWith('Изменения перенесены.'));
  assert.equal(await page.evaluate(async({prefix,id})=>(await import(prefix+'project-studio/project-store.js')).getProject(id).workspace.files[0].content,{prefix,id:projectId}),edited);
 });
 await route('#view=code-studio&project='+projectId);await preview('SELECTED_A');
 await check('Смена серверного аккаунта A → B закрывает старый документ и не открывает проекты A',async()=>{
  const other=await context.newPage();await other.goto(origin+'/');await signOut(other);
  const invitation=h.seedSecondAccount();await enroll(other,invitation);await other.close();
  await page.evaluate(()=>location.hash='#view=akronikl');await panel().waitFor({state:'detached'});
  await page.waitForURL('**/account/entry/**');await page.goto(origin+'/index.html#view=akronikl');await appReady(page);
  const result=await page.evaluate(async({prefix,id})=>({account:(await import(prefix+'core/account-storage.js')).verifiedAccount()?.accountId,project:(await import(prefix+'project-studio/project-store.js')).getProject(id),completed:(await import(prefix+'core/storage.js')).lessonState('cpp.programming-process').completed}),{prefix,id:projectId});
  assert.equal(result.account,'synthetic-ak02-b');assert.equal(result.project,null);assert.notEqual(result.completed,true);
 });
 await seedProject('// synthetic B\nSELECTED_B');
 await check('Непривилегированный B не получает административный список и не импортирует копию A',async()=>{
  assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/v2/account/control/users',{headers:{'x-nexus-account-expectation':'synthetic-ak02-b'}});return r.status}),403);
  await route('#view=offline');const form=page.locator('[data-local-import]');await form.locator('select').selectOption(copyA);await form.locator('input').fill(phraseA);await form.locator('button').click();
  await page.locator('[data-local-status]').filter({hasText:'принадлежит другому аккаунту'}).waitFor();
  assert.equal(await page.evaluate(async({prefix,id})=>(await import(prefix+'project-studio/project-store.js')).getProject(id).workspace.files[0].content,{prefix,id:projectId}),'// synthetic B\nSELECTED_B');
 });
 copyB=await makeCopy(phraseB);await unlock(copyB,phraseB);await preview('SELECTED_B');await page.keyboard.press('Escape');await page.locator('#lockLocal').click();
 await page.goto(origin+'/index.html#view=code-studio&project='+projectId);await appReady(page);await preview('SELECTED_B');
 await check('Logout отзывает реальную тестовую сессию; поздний 200 не восстанавливает панель',async()=>{
  h.holdAccount();await page.evaluate(()=>location.hash='#view=akronikl');await panel().waitFor({state:'detached'});
  const end=Date.now()+5000;while(!h.pendingAccount&&Date.now()<end)await page.waitForTimeout(20);assert.ok(h.pendingAccount);
  await page.evaluate(async prefix=>{void(await import(prefix+'core/account-unified.js')).endUnifiedSession()},prefix);
  await page.waitForURL('**/account/entry/**');h.releaseAccount();await page.waitForTimeout(100);assert.equal(await panel().count(),0);
  assert.equal(f.db.prepare("SELECT count(*) n FROM account_sessions WHERE subject_id='synthetic-ak02-b' AND status='active'").get().n,0);
  assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/v2/account');return r.status}),401);
 });
 assert.deepEqual(errors,[]);assert.deepEqual(h.serverErrors,[]);
}catch(e){const clean=x=>String(x||'').replaceAll(phraseA,'[TEST_LOCAL_PHRASE]').replaceAll(phraseB,'[TEST_LOCAL_PHRASE]');fatal={name:e.name,message:clean(e.message),stack:clean(e.stack)};console.error(fatal.name+': '+fatal.message);await page?.screenshot({path:path.join(out,'FAILURE.png'),mask:[page.locator('input[type=password]')]}).catch(()=>{});}
finally{
 h.releaseAccount();await h.close();
 await writeFile(path.join(out,'AUTHORIZED_E2E.json'),JSON.stringify({status:fatal?'FAIL':'PASS',source:process.env.NEXUS_SOURCE_COMMIT||null,generation:h.current.manifest.assetGeneration,browser:version,node:process.version,checks,fatal,pageErrors:errors,serverErrors:h.serverErrors,unhandledPaths:h.unexpected,requests:h.requests,real:['built entry/bootstrap/app/Academy/CodeStudio/Akronikl','BFF+Worker JavaScript','WebAuthn cryptographic verification','SQLite','HttpOnly browser cookie','TLS test transport','service worker','AES/IndexedDB/autosave'],fixtures:['virtual CTAP2','in-process Worker transport','SQLite D1 adapter','synthetic Gateway operation context','disposable TLS','synthetic accounts','provider list disabled'],notProved:['real owner authenticator','Yandex Gateway IAM','workerd/D1 cloud runtime','physical devices','live Cloud sync'],physical:false,production:false,requestBodiesRecorded:false,credentialsRecorded:false},null,2)+'\n');if(fatal)process.exitCode=1;
}
