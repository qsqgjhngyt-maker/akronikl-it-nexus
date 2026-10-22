// Нативный Chrome + actual BFF sanitization + signed Worker service + SQLite. Synthetic only.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {Readable} from 'node:stream';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {controlFixture} from './helpers/control-fixture.mjs';
import {createAccountControlHandler} from '../server-access/bff/account-control.mjs';
import {createContentHandler} from '../server-access/bff/content.mjs';
import {handleAdminService} from '../server-access/worker/admin-service.mjs';
import {publicContent} from '../server-access/worker/content-service.mjs';
import {GATEWAY_ORIGIN} from '../server-access/bff/account-read.mjs';
import {decodeBlogLayout} from '../core/blog-layout.js';
const f=await controlFixture(),env={...f.env,CONTENT_ENABLED:'true',CONTENT_MEDIA_ENABLED:'true',CONTENT_MEDIA_UPLOAD_ENABLED:'true',CONTENT_PROXY_ENABLED:'true',ACCOUNT_CONTROL_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',COOKIE_INGRESS_V3_ENABLED:'true'};
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE)),frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR),out=path.resolve(process.env.NEXUS_NATIVE_EVIDENCE);await mkdir(out,{recursive:false});
const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration,checks=[],errors=[],calls=[];let context,browser,page,conflict=false,uploadsOff=false,mediaFailure=false,mediaHold=null,releaseMedia=null;
const jpeg=createRequire(new URL('../server-access/package.json',import.meta.url))('jpeg-js'),photo=color=>Buffer.from(jpeg.encode({width:80,height:50,data:Buffer.alloc(80*50*4,color)},75).data),photos=[photo(220),photo(120)];
const upstream=async(url,options)=>{if(url.includes('/internal/control')&&JSON.parse(options.body)?.payload?.target==='media'){if(mediaHold)await mediaHold;if(mediaFailure)return Response.json({error:{code:'CONTROL_UNAVAILABLE'}},{status:503,headers:{'cache-control':'no-store',vary:'*'}})}assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(new Headers(options.headers).has('cookie'),false);return url.includes('/internal/control')?handleAdminService(new Request(url,options),{...env,...(uploadsOff?{CONTENT_MEDIA_UPLOAD_ENABLED:'false'}:{})}):publicContent(new Request(url,options),env)};
const control=createAccountControlHandler({env,fetchImpl:upstream}),content=createContentHandler({env,fetchImpl:upstream});
const mime=f=>f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':f.endsWith('.webp')?'image/webp':'text/html';
const check=async(name,fn)=>{const t=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-t)});console.log('PASS '+name)};
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH});context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{const request=route.request(),u=new URL(request.url());if(u.origin!==GATEWAY_ORIGIN)return route.abort();
  if(u.pathname==='/synthetic-cms.html'){const html='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+prefix+'/styles/app.css"><main style="max-width:1300px;margin:auto;padding:20px" id="fixture"></main><script type="module">import {initializeAccountStorage} from "'+prefix+'/core/account-storage.js";import {contentEditorMarkup,bindContentEditor} from "'+prefix+'/core/content-editor.js";initializeAccountStorage({accountId:'+JSON.stringify(f.owner.id)+',displayName:"Synthetic editor",status:"active"});fixture.innerHTML=contentEditorMarkup();await bindContentEditor(fixture.querySelector("[data-content-admin]"));window.fixtureReady=true;</script>';return route.fulfill({status:200,contentType:'text/html',body:html})}
  if(u.pathname==='/account/access/passkey-client.js')return route.fulfill({contentType:'text/javascript',body:'export async function login(){window.confirmCalls=(window.confirmCalls||0)+1;if(window.confirmMode==="cancel")throw new DOMException("Synthetic cancellation","NotAllowedError");if(window.confirmMode==="hold")await new Promise(resolve=>window.releaseConfirm=resolve)}'});
  if(u.pathname.startsWith('/api/')){
   calls.push({method:request.method(),path:u.pathname,query:u.searchParams.has('media')?'media':u.searchParams.has('mediaStatus')?'mediaStatus':'',body:request.method()==='POST'?JSON.parse(request.postData()):null});
   if(conflict&&request.method()==='POST'&&JSON.parse(request.postData())?.target==='post')return route.fulfill({status:409,headers:{'content-type':'application/json','cache-control':'no-store',vary:'Accept-Encoding, *'},body:'{"error":{"code":"CONTROL_CONFLICT"}}'});
   const req=Readable.from(request.postData()?[Buffer.from(request.postData())]:[]),h={...request.headers(),host:new URL(GATEWAY_ORIGIN).host,'x-yc-apigateway-operation-context':Buffer.from('{"accountControlContract":"v3"}').toString('base64'),cookie:'__Host-nexus_session='+f.owner.secret};
   delete h['content-length'];Object.assign(req,{url:u.pathname+u.search,method:request.method(),headers:h,rawHeaders:Object.entries(h).flat()});let status,headers,body;const res={writeHead(s,h){status=s;headers=h},end(b){body=b}};
   if(!await control(req,res)&&!await content(req,res)){status=404;headers={'content-type':'application/json','cache-control':'no-store',vary:'*'};body='{}'}
   if(headers.vary==='*')headers.vary='Accept-Encoding, *';return route.fulfill({status,headers:Object.fromEntries(Object.entries(headers).map(([k,v])=>[k,String(v)])),body});
  }
  try{const target=path.resolve(frontend,u.pathname.slice(1));assert.ok(target.startsWith(frontend+path.sep));return route.fulfill({status:200,contentType:mime(target),body:await readFile(target)})}catch{return route.fulfill({status:404,body:'NOT_FOUND'})}
 });
 await page.goto(GATEWAY_ORIGIN+'/synthetic-cms.html');await page.waitForFunction(()=>window.fixtureReady===true);

 await page.locator('[data-content-new]').click();await page.locator('input[name=slug]').fill('synthetic-upload-feedback');await page.locator('input[name=title]').fill('Проверка фотографий');await page.locator('[data-add=text]').click();await page.locator('[data-text]').fill('Текст, который нельзя потерять.');await page.locator('[data-add-photo]:not([disabled])').waitFor();
 await check('expired admin freshness is explained next to photo picker and preserves draft without retry',async()=>{
  f.db.prepare('UPDATE account_sessions SET created_at=? WHERE id=?').run(new Date(Date.now()-360000).toISOString(),f.owner.session);
  const before=calls.filter(c=>c.method==='POST'&&c.body.target==='media').length;
  const chooser=page.waitForEvent('filechooser');await page.locator('[data-add-photo]').click();await(await chooser).setFiles({name:'expired.jpg',mimeType:'image/jpeg',buffer:photos[0]});
  await page.locator('[data-content-status]').filter({hasText:'Подтвердите вход ключом доступа'}).waitFor();
  assert.match(await page.locator('.blog-editor-upload-status').innerText(),/Подтвердите.*ключом/);
  assert.equal(await page.locator('[data-text]').inputValue(),'Текст, который нельзя потерять.');assert.equal(await page.locator('[data-block-id]').count(),1);
  assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_content_media').get().n,0);
  await page.waitForTimeout(300);assert.equal(calls.filter(c=>c.method==='POST'&&c.body.target==='media').length,before+1);
  await page.screenshot({path:path.join(out,'freshness-error-inline.png'),fullPage:true});
 });

 await check('cancelled key confirmation is recoverable, keeps inline action and never retries upload',async()=>{
  const before=calls.filter(c=>c.method==='POST').length;await page.evaluate(()=>window.confirmMode='cancel');
  await page.locator('[data-photo-confirm]').click();await page.locator('.blog-editor-upload-status').filter({hasText:'Подтверждение отменено'}).waitFor();
  assert.equal(await page.locator('[data-photo-confirm]').isVisible(),true);assert.equal(calls.filter(c=>c.method==='POST').length,before);assert.equal(await page.locator('[data-text]').inputValue(),'Текст, который нельзя потерять.');
 });
 await check('one explicit key confirmation permits a later explicit upload without resubmitting on its own',async()=>{
  const before=calls.filter(c=>c.method==='POST').length;await page.evaluate(()=>window.confirmMode='hold');
  await page.locator('[data-photo-confirm]').click();await page.waitForFunction(()=>!!window.releaseConfirm);
  await page.evaluate(()=>document.querySelector('[data-content-key]').click());assert.equal(await page.evaluate(()=>window.confirmCalls),2,'cancelled attempt plus one shared pending confirmation');
  f.db.prepare('UPDATE account_sessions SET created_at=? WHERE id=?').run(new Date().toISOString(),f.owner.session);
  await page.evaluate(()=>releaseConfirm());await page.locator('.blog-editor-upload-status').filter({hasText:'Вход подтверждён'}).waitFor();
  assert.equal(calls.filter(c=>c.method==='POST').length,before);assert.equal(await page.locator('[data-text]').inputValue(),'Текст, который нельзя потерять.');
 });
 await check('visible successful cover survives later render; cancelling file picker makes no request',async()=>{
  const chooser=page.waitForEvent('filechooser');await page.locator('[data-add-cover]').click();await(await chooser).setFiles({name:'synthetic-cover.jpg',mimeType:'image/jpeg',buffer:photos[0]});
  await page.locator('.blog-editor-upload-status').filter({hasText:'Обложка загружена и добавлена в макет'}).waitFor();await page.waitForFunction(()=>document.querySelector('[data-editor-cover] img')?.naturalWidth>0);
  const before=calls.filter(c=>c.method==='POST').length;await page.locator('[data-cover-file]').setInputFiles([]);await page.waitForTimeout(100);assert.equal(calls.filter(c=>c.method==='POST').length,before);
  await page.locator('[data-add=heading]').click();assert.match(await page.locator('.blog-editor-upload-status').innerText(),/Обложка загружена/);assert.equal(await page.locator('[data-editor-cover] img').count(),1);
 });
 await check('actual BFF upstream 503 stays visible next to picker and preserves existing cover and text',async()=>{
  mediaFailure=true;const before=calls.filter(c=>c.method==='POST').length;
  await page.locator('[data-photo-file]').setInputFiles({name:'upstream-error.jpg',mimeType:'image/jpeg',buffer:photos[1]});
  await page.locator('.blog-editor-upload-status[data-state=error]').filter({hasText:'Сервис управления аккаунтом сейчас недоступен'}).waitFor();
  assert.equal(await page.locator('[data-text]').first().inputValue(),'Текст, который нельзя потерять.');assert.equal(await page.locator('[data-editor-cover] img').count(),1);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_content_media').get().n,1);
  await page.locator('[data-add=quote]').click();assert.match(await page.locator('.blog-editor-upload-status').innerText(),/Сервис управления аккаунтом сейчас недоступен/);
  await page.waitForTimeout(200);assert.equal(calls.filter(c=>c.method==='POST').length,before+1);mediaFailure=false;
  await page.screenshot({path:path.join(out,'upstream-error-inline.png'),fullPage:true});
 });
 await check('pending upload blocks repeated clicks and draft submission while keeping form values',async()=>{
  mediaHold=new Promise(resolve=>releaseMedia=resolve);const before=calls.filter(c=>c.method==='POST').length;
  await page.locator('[data-photo-file]').setInputFiles({name:'held.jpg',mimeType:'image/jpeg',buffer:photos[1]});
  await page.waitForFunction(()=>document.querySelector('[data-add-photo]')?.disabled===true);
  await page.evaluate(()=>{document.querySelector('[data-add-photo]').click();document.querySelector('[data-content-editor] form').requestSubmit()});
  await page.locator('[data-content-status]').filter({hasText:'Дождитесь загрузки фотографий'}).waitFor();
  assert.equal(calls.filter(c=>c.method==='POST'&&c.body.target==='post').length,0);mediaHold=null;releaseMedia();
  await page.locator('.blog-editor-upload-status').filter({hasText:'Фото загружены и добавлены в макет'}).waitFor();await page.waitForFunction(()=>document.querySelector('[data-layout-canvas] img')?.naturalWidth>0);
  assert.equal(calls.filter(c=>c.method==='POST').length,before+1);
 });
 await check('phone preview, save/reopen and separate publication retain the cover and photo',async()=>{
  await page.locator('[data-preview-width]').selectOption('phone');await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:path.join(out,'phone-with-cover-photo.png'),fullPage:true});
  await page.locator('[data-content-editor] form> .account-actions button[type=submit]').click();await page.locator('[data-publish]').waitFor();await page.waitForFunction(()=>document.querySelector('[data-editor-cover] img')?.naturalWidth>0);
  const row=f.db.prepare('SELECT * FROM nexus_content_posts WHERE slug=?').get('synthetic-upload-feedback'),layout=decodeBlogLayout(JSON.parse(row.draft_json).body);assert.ok(layout.cover);assert.equal(layout.blocks.filter(b=>b.kind==='image').length,1);assert.match(layout.blocks[0].text,/Текст, который нельзя потерять/);
  page.once('dialog',d=>d.accept());await page.locator('[data-publish]').click();await page.getByText('Опубликовано.',{exact:true}).waitFor();
  for(const id of [layout.cover.mediaId,...layout.blocks.flatMap(b=>b.images).map(i=>i.mediaId)])assert.equal((await publicContent(new Request('https://synthetic.invalid/api/v2/content/feed?media='+id),env)).status,200);
 });
 assert.deepEqual(errors,[]);
}catch(e){process.exitCode=1;checks.push({status:'FAIL',name:e.message,stack:e.stack});console.error(e.stack);await page?.screenshot({path:path.join(out,'FAILURE.png'),fullPage:true}).catch(()=>{})}
finally{await browser?.close();f.close();const safeCalls=calls.map(({body,...c})=>({...c,...(body?{target:body.target,action:body.action}:{})}));await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:process.exitCode?'FAIL':'PASS',checks,errors,calls:safeCalls,physical:false,realCredentials:false,syntheticCookieIngressV3Only:true,productionWrites:0,authenticatorMock:true},null,2)+'\n')}
