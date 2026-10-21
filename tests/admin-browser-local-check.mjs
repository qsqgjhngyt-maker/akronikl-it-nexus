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
const contexts=[],checks=[],boundaries=[],errors=[];let external=0,unknown=[];
const contentType=p=>p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':'text/html';
async function profile(){
 const context=await browser.newContext({serviceWorkers:'block'});contexts.push(context);
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==origin){external++;return route.abort()}
  try{
   const start=performance.now(),result=await f.dispatch(url.href,{method:req.method(),headers:await req.allHeaders(),body:req.postData()});
   if(result){const headers={};for(const[k,v]of Object.entries(result.headers))headers[k]=Array.isArray(v)?v.join('\n'):String(v);boundaries.push({path:url.pathname,status:result.status,durationMs:Math.round(performance.now()-start)});return route.fulfill({status:result.status,headers,body:result.body})}
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
try{
 await owner.page.goto(origin+'/');
 await owner.page.evaluate(async token=>{await(await import('/account/access/passkey-client.js')).register(token)},f.invitation);
 f.enableControl();
 await owner.page.goto(origin+'/index.html#view=account&tab=admin');
 await check('actual admin UI recognizes verified owner and protects its account',async()=>{
  await owner.page.locator('[data-admin-users] tr').waitFor();
  assert.match(await owner.page.locator('[data-admin-users]').innerText(),/Защищённый аккаунт/);
  assert.equal(await owner.page.locator('[data-admin-nav]').count(),1);
 });
 await check('administrator can switch testing/open and finite/unlimited access without changing identities',async()=>{
  const settings=owner.page.locator('[data-admin-settings]');
  await settings.locator('[name=capacity]').selectOption('unlimited');
  assert.equal(await settings.locator('[name=limit]').isDisabled(),true);
  await settings.locator('[name=mode]').selectOption('open');await settings.locator('button').click();
  await owner.page.waitForFunction(()=>document.querySelector('[data-admin-status]')?.textContent==='Настройки сохранены.');
  assert.equal(f.db.prepare('SELECT limit_enabled FROM nexus_alpha_settings').get().limit_enabled,0);
  assert.equal(f.db.prepare('SELECT registration_mode FROM nexus_alpha_settings').get().registration_mode,'open');
  await settings.locator('[name=capacity]').selectOption('limited');
  assert.equal(await settings.locator('[name=limit]').isDisabled(),false);
  await settings.locator('[name=mode]').selectOption('invite_only');await settings.locator('[name=limit]').fill('2');await settings.locator('button').click();
  await owner.page.waitForFunction(()=>document.querySelector('[data-admin-status]')?.textContent==='Настройки сохранены.');
  assert.equal(f.db.prepare('SELECT limit_enabled FROM nexus_alpha_settings').get().limit_enabled,1);
  assert.equal(f.db.prepare('SELECT registration_mode FROM nexus_alpha_settings').get().registration_mode,'invite_only');
 });
 await check('admin saves user limit and generates one invitation reserving one place',async()=>{
  const settings=owner.page.locator('[data-admin-settings]');await settings.locator('[name=limit]').fill('2');
  await settings.locator('button').click();await owner.page.waitForFunction(()=>document.querySelector('[data-admin-status]')?.textContent==='Настройки сохранены.');
  await owner.page.locator('[data-admin-invite] button').click();
  await owner.page.waitForFunction(()=>document.querySelector('[data-invite-link]')?.value.includes('#invite='));
  inviteURL=await owner.page.locator('[data-invite-link]').inputValue();
  assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_admin_invites').get().n,1);
  testerId=f.db.prepare('SELECT account_id FROM nexus_admin_invites').get().account_id;
  assert.equal(member(testerId).state,'invited');
 });
 tester=await profile();
 await check('invitation is removed from URL before first key and separate login/name are required',async()=>{
  await tester.page.goto(inviteURL);await tester.page.locator('#invitation-profile').waitFor({state:'visible'});
  assert.equal(new URL(tester.page.url()).hash,'');
  assert.equal((await tester.context.cookies()).some(c=>c.name==='__Host-nexus_session'),false);
  await tester.page.locator('#new-username').fill('tester.one');await tester.page.locator('#new-display-name').fill('Новый Пользователь');
  await tester.page.locator('#register').click();await tester.page.waitForURL('**/index.html#view=home');
  await tester.page.waitForFunction(()=>document.querySelector('#app')?.children.length>0);
  assert.equal(f.db.prepare('SELECT username FROM nexus_account_profiles WHERE account_id=?').get(testerId).username,'tester.one');
  assert.equal(f.db.prepare('SELECT display_name FROM account_subjects WHERE id=?').get(testerId).display_name,'Новый Пользователь');
  assert.equal(member(testerId).state,'active');
  assert.ok(f.db.prepare("SELECT id FROM account_sessions WHERE subject_id=? AND status='active'").get(testerId));
 });
 await check('ordinary user cannot expose admin list, and profile photo is saved for its own account',async()=>{
  await tester.page.goto(origin+'/#view=account&tab=admin');await tester.page.locator('[data-admin-status]').waitFor();
  await tester.page.waitForFunction(()=>document.querySelector('[data-admin-status]')?.textContent.includes('только администратору'));
  assert.equal(await tester.page.locator('[data-admin-nav]').count(),0);assert.equal(await tester.page.locator('[data-admin-users] tr').count(),0);
  await tester.page.goto(origin+'/#view=account');await tester.page.locator('[data-personalize]').waitFor();
  const pixels=Buffer.alloc(128*128*4,170);for(let n=3;n<pixels.length;n+=4)pixels[n]=255;
  const image=jpeg.encode({data:pixels,width:128,height:128},80).data;
  await tester.page.locator('[data-photo-file]').setInputFiles({name:'synthetic-avatar.jpg',mimeType:'image/jpeg',buffer:image});
  await tester.page.waitForFunction(()=>document.querySelector('[data-photo-save]')?.disabled===false);
  assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_account_avatars').get().n,0);
  await tester.page.locator('[data-photo-save]').click();await tester.page.waitForFunction(()=>document.querySelector('[data-photo-status]')?.textContent==='Фото сохранено.');
  avatarBefore=f.db.prepare('SELECT jpeg_base64 FROM nexus_account_avatars WHERE account_id=?').get(testerId).jpeg_base64;
  assert.ok(avatarBefore);assert.equal(await tester.page.locator('.account-avatar img').count()>0,true);
  assert.equal(f.db.prepare("SELECT count(*) n FROM nexus_account_avatars WHERE account_id='synthetic-owner'").get().n,0);
  await tester.page.evaluate(id=>localStorage.setItem('akronikl:it-nexus:account-store:v1:'+encodeURIComponent(id)+':akronikl:it-nexus:projects:v1','synthetic-local-project-preservation'),testerId);
 });
 await check('blocking from admin UI revokes the tester session; next navigation is denied',async()=>{
  await owner.page.locator('[data-admin-refresh]').click();
  const row=owner.page.locator('tr[data-account-id="'+testerId+'"]');
  owner.page.once('dialog',d=>d.accept());await row.getByRole('button',{name:'Заблокировать',exact:true}).click();
  await owner.page.waitForFunction(()=>[...document.querySelectorAll('[data-admin-users] tr')].some(r=>r.textContent.includes('Заблокирован')));
  assert.equal(member(testerId).state,'blocked');assert.equal(f.db.prepare("SELECT count(*) n FROM account_sessions WHERE subject_id=? AND status='active'").get(testerId).n,0);
  await tester.page.goto(origin+'/index.html#view=account');await tester.page.locator('[data-login]').waitFor();
  assert.equal(await tester.page.locator('[data-unified-account]').count(),0);
  const sessions=f.db.prepare('SELECT count(*) n FROM account_sessions WHERE subject_id=?').get(testerId).n;
  await tester.page.locator('[data-login]').click();await tester.page.locator('[data-status][data-tone=error]').waitFor();
  assert.match(await tester.page.locator('[data-status]').innerText(),/Доступ к Nexus закрыт/);
  assert.equal(f.db.prepare('SELECT count(*) n FROM account_sessions WHERE subject_id=?').get(testerId).n,sessions);
 });
 await check('restoring access preserves data and photo; new explicit Passkey login uses the same account',async()=>{
  const row=owner.page.locator('tr[data-account-id="'+testerId+'"]');await row.getByRole('button',{name:'Восстановить доступ',exact:true}).click();
  await owner.page.waitForFunction(()=>[...document.querySelectorAll('[data-admin-users] tr')].some(r=>r.textContent.includes('tester.one')&&r.textContent.includes('Активен')));
  await tester.page.locator('[data-login]').click();
  await tester.page.locator('[data-personalize]').waitFor();
  assert.equal(await tester.page.evaluate(id=>localStorage.getItem('akronikl:it-nexus:account-store:v1:'+encodeURIComponent(id)+':akronikl:it-nexus:projects:v1'),testerId),'synthetic-local-project-preservation');
  assert.equal(f.db.prepare('SELECT jpeg_base64 FROM nexus_account_avatars WHERE account_id=?').get(testerId).jpeg_base64,avatarBefore);
  assert.equal(f.db.prepare('SELECT count(*) n FROM account_subjects').get().n,2);
 });
 await check('photo rejects SVG, supports explicit removal/reload and saves a replacement',async()=>{
  await tester.page.waitForFunction(()=>document.querySelector('[data-photo-remove]')?.disabled===false);
  await tester.page.locator('[data-photo-file]').setInputFiles({name:'synthetic-invalid.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')});
  await tester.page.waitForFunction(()=>document.querySelector('[data-photo-status]')?.textContent.includes('фото'));
  assert.equal(f.db.prepare('SELECT jpeg_base64 FROM nexus_account_avatars WHERE account_id=?').get(testerId).jpeg_base64,avatarBefore);
  await tester.page.locator('[data-photo-remove]').click();
  await tester.page.waitForFunction(()=>document.querySelector('[data-photo-status]')?.textContent==='Фото удалено.');
  assert.equal(f.db.prepare('SELECT jpeg_base64 FROM nexus_account_avatars WHERE account_id=?').get(testerId)?.jpeg_base64??null,null);
  assert.equal(f.db.prepare('SELECT version FROM nexus_account_avatars WHERE account_id=?').get(testerId).version,2);
  await tester.page.reload();await tester.page.locator('[data-personalize]').waitFor();
  await tester.page.waitForFunction(()=>document.querySelector('[data-photo-preview]')?.hidden===true);
  assert.equal(await tester.page.locator('.account-avatar img').count(),0);
  const pixels=Buffer.alloc(128*128*4,255),image=jpeg.encode({data:pixels,width:128,height:128},80).data;
  await tester.page.locator('[data-photo-file]').setInputFiles({name:'synthetic-new.jpg',mimeType:'image/jpeg',buffer:image});
  await tester.page.waitForFunction(()=>document.querySelector('[data-photo-save]')?.disabled===false);
  await tester.page.locator('[data-photo-save]').click();
  await tester.page.waitForFunction(()=>document.querySelector('[data-photo-status]')?.textContent==='Фото сохранено.');
  assert.equal(f.db.prepare('SELECT version FROM nexus_account_avatars WHERE account_id=?').get(testerId).version,3);
  if(process.env.NEXUS_SCREENSHOT_DIR){
   await owner.page.evaluate(()=>{const field=document.querySelector('[data-invite-link]');if(field)field.value='';const result=document.querySelector('[data-invite-result]');if(result)result.hidden=true});
   await owner.page.setViewportSize({width:1360,height:900});
   await owner.page.screenshot({path:process.env.NEXUS_SCREENSHOT_DIR+'/admin-desktop.png',fullPage:true});
   await tester.page.setViewportSize({width:1360,height:900});
   await tester.page.screenshot({path:process.env.NEXUS_SCREENSHOT_DIR+'/profile-desktop.png',fullPage:true});
   await tester.page.setViewportSize({width:390,height:844});
   await tester.page.screenshot({path:process.env.NEXUS_SCREENSHOT_DIR+'/profile-mobile.png',fullPage:true});
   await owner.page.setViewportSize({width:390,height:844});
   await owner.page.screenshot({path:process.env.NEXUS_SCREENSHOT_DIR+'/admin-mobile.png',fullPage:true});
  }
 });
 await communityBrowserScenarios({owner,tester,testerId,f,origin,check});
 await check('archive keeps server data; irreversible deletion requires preview and separate typed confirmation',async()=>{
  const row=owner.page.locator('tr[data-account-id="'+testerId+'"]');owner.page.once('dialog',d=>d.accept());await row.getByRole('button',{name:'Закрыть доступ',exact:true}).click();
  await row.getByRole('button',{name:'Удалить безвозвратно',exact:true}).waitFor();
  assert.equal(member(testerId).state,'removed');assert.ok(f.db.prepare('SELECT account_id FROM nexus_account_avatars WHERE account_id=?').get(testerId));
  await row.getByRole('button',{name:'Удалить безвозвратно',exact:true}).click();await owner.page.locator('[data-purge-dialog][open]').waitFor();
  await owner.page.locator('[data-purge-cancel]').click();assert.ok(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(testerId));
  await row.getByRole('button',{name:'Удалить безвозвратно',exact:true}).click();
  await owner.page.locator('[data-purge-confirm]').fill('DELETE tester.one');await owner.page.locator('[data-purge-agree]').check();
  await owner.page.locator('[data-purge-execute]').click();await owner.page.waitForFunction(()=>document.querySelector('[data-admin-status]')?.textContent==='Аккаунт и его серверные данные удалены.');
  assert.equal(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(testerId),undefined);
  assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_account_avatars').get().n,0);
  assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length,0);
  assert.ok(f.db.prepare("SELECT id FROM nexus_admin_audit WHERE action='purge'").get());
 });
 assert.equal(external,0);assert.deepEqual(errors,[]);
 const result={status:'PASS',checks,boundaries,externalRequests:0,realAccounts:false,authenticator:'virtual CTAP2 with real verification',unknownStaticPaths:unknown,pageErrors:errors};
 await writeFile(process.env.NEXUS_BROWSER_RESULT,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
}catch(error){
 const safe={status:'FAIL',failure:error.name,checks,boundaries,externalRequests:external,pageErrors:errors,unknownStaticPaths:unknown,ownerStatus:await owner.page.locator('[data-admin-status]').innerText().catch(()=>''),testerStatus:tester?await tester.page.locator('#status,[data-status],[data-photo-status]').first().innerText().catch(()=>''):undefined};
 await writeFile(process.env.NEXUS_BROWSER_RESULT,JSON.stringify(safe,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'FAIL',failure:error.name,checks:checks.length,ownerStatus:safe.ownerStatus,testerStatus:safe.testerStatus}));process.exitCode=1;
}finally{await browser.close();f.close()}
