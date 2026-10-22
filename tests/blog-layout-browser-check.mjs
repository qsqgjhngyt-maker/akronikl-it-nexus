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
const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration,checks=[],errors=[],calls=[];let context,browser,page,conflict=false,uploadsOff=false;
const jpeg=createRequire(new URL('../server-access/package.json',import.meta.url))('jpeg-js'),photo=color=>Buffer.from(jpeg.encode({width:80,height:50,data:Buffer.alloc(80*50*4,color)},75).data),photos=[photo(220),photo(120)];
const upstream=async(url,options)=>{assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(new Headers(options.headers).has('cookie'),false);return url.includes('/internal/control')?handleAdminService(new Request(url,options),{...env,...(uploadsOff?{CONTENT_MEDIA_UPLOAD_ENABLED:'false'}:{})}):publicContent(new Request(url,options),env)};
const control=createAccountControlHandler({env,fetchImpl:upstream}),content=createContentHandler({env,fetchImpl:upstream});
const mime=f=>f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':f.endsWith('.webp')?'image/webp':'text/html';
const check=async(name,fn)=>{const t=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-t)});console.log('PASS '+name)};
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH});context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{const request=route.request(),u=new URL(request.url());if(u.origin!==GATEWAY_ORIGIN)return route.abort();
  if(u.pathname==='/synthetic-cms.html'){const html='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+prefix+'/styles/app.css"><main style="max-width:1300px;margin:auto;padding:20px" id="fixture"></main><script type="module">import {initializeAccountStorage} from "'+prefix+'/core/account-storage.js";import {contentEditorMarkup,bindContentEditor} from "'+prefix+'/core/content-editor.js";initializeAccountStorage({accountId:'+JSON.stringify(f.owner.id)+',displayName:"Synthetic editor",status:"active"});fixture.innerHTML=contentEditorMarkup();await bindContentEditor(fixture.querySelector("[data-content-admin]"));window.fixtureReady=true;</script>';return route.fulfill({status:200,contentType:'text/html',body:html})}
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
 await check('new visual editor starts with server-confirmed upload capability and no public draft data',async()=>{await page.locator('[data-content-new]').click();await page.locator('input[name=slug]').fill('synthetic-layout');await page.locator('input[name=title]').fill('Собственная история с фотографиями');await page.locator('textarea[name=summary]').fill('Синтетическая проверка визуального редактора');await page.locator('[data-add-photo]:not([disabled])').waitFor();assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_content_posts').get().n,0)});
 await check('upload two real raster photos through BFF re-encoding and keep them private',async()=>{await page.locator('[data-photo-file]').setInputFiles(photos.map((buffer,i)=>({name:'synthetic-'+i+'.jpg',mimeType:'image/jpeg',buffer})));await page.locator('[data-block-id]').nth(1).waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('[data-layout-canvas] img')].length===2&&[...document.querySelectorAll('[data-layout-canvas] img')].every(i=>i.naturalWidth>0));assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_content_media').get().n,2);const id=f.db.prepare('SELECT id FROM nexus_content_media LIMIT 1').get().id;assert.equal((await publicContent(new Request('https://synthetic.invalid/api/v2/content/feed?media='+id),env)).status,404)});
 await check('move photos, change adaptive width/crop/caption and preview phone without horizontal overflow',async()=>{const cards=page.locator('[data-block-id]');const first=await cards.first().getAttribute('data-block-id');await cards.first().locator('[data-down]').click();assert.equal(await cards.nth(1).getAttribute('data-block-id'),first);await cards.first().locator('[data-setting=width]').selectOption('50');await cards.first().locator('[data-setting=align]').selectOption('right');await cards.first().locator('[data-setting=ratio]').selectOption('square');await cards.first().locator('[data-image-text=alt]').fill('Фото <svg onload=alert(1)>');await cards.first().locator('[data-image-text=caption]').fill('Подпись к своему фото');await page.locator('[data-preview-width]').selectOption('phone');assert.equal(await page.locator('.blog-editor-preview').getAttribute('data-preview-size'),'phone');await page.screenshot({path:path.join(out,'layout-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:path.join(out,'layout-phone.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000})});
 await check('canvas supports direct drag order, resize and cover/gallery preparation',async()=>{
  await page.locator('[data-preview-width]').selectOption('desktop');
  const blocks=page.locator('[data-layout-canvas] [data-blog-block]'),first=await blocks.first().getAttribute('data-blog-block');
  await blocks.first().dragTo(blocks.nth(1));assert.equal(await page.locator('[data-block-id]').nth(1).getAttribute('data-block-id'),first);
  // Вернём исходный порядок кнопкой: оба способа меняют одну и ту же модель.
  await page.locator('[data-block-id]').nth(1).locator('[data-up]').click();
  const resize=page.locator('[data-layout-canvas] .blog-canvas-resize').first(),box=await resize.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+180,box.y+box.height/2,{steps:5});await page.mouse.up();
  assert.notEqual(await page.locator('[data-block-id]').first().locator('[data-setting=width]').inputValue(),'50');
  await page.locator('[data-block-id]').first().locator('[data-setting=width]').selectOption('50');
  const handle=page.locator('[data-layout-canvas] .blog-canvas-resize').first();await handle.evaluate(n=>n.addEventListener('pointerdown',e=>window.syntheticPointerId=e.pointerId,{once:true}));const bounds=await handle.boundingBox();
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+200,bounds.y+bounds.height/2,{steps:5});
  await handle.evaluate(n=>n.dispatchEvent(new PointerEvent('pointercancel',{pointerId:window.syntheticPointerId,bubbles:true})));await page.mouse.up();
  assert.equal(await page.locator('[data-block-id]').first().locator('[data-setting=width]').inputValue(),'50','cancelled pointer resize must restore the previous width');
  await page.locator('[data-cover-file]').setInputFiles({name:'synthetic-cover.jpg',mimeType:'image/jpeg',buffer:photos[0]});
  await page.locator('[data-editor-cover] img').waitFor();
  const before=await page.locator('[data-block-id]').count();await page.locator('[data-add-gallery]').click({trial:true});
  const chooser=page.waitForEvent('filechooser');await page.locator('[data-add-gallery]').click();await(await chooser).setFiles(photos.map((buffer,i)=>({name:'gallery-'+i+'.jpg',mimeType:'image/jpeg',buffer})));
  await page.waitForFunction(n=>document.querySelectorAll('[data-block-id]').length===n+1,before);
  assert.equal(await page.locator('[data-block-id]').last().locator('[data-images] img').count(),2);
 });
 await check('non-photo upload fails locally without an API mutation or layout loss',async()=>{
  const before=calls.filter(c=>c.method==='POST'&&c.body.target==='media').length,count=await page.locator('[data-block-id]').count();
  await page.locator('[data-photo-file]').setInputFiles({name:'synthetic.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg onload="alert(1)"/>')});
  await page.locator('[data-content-status]').filter({hasText:'Выберите JPEG, PNG или WebP'}).waitFor();
  assert.equal(calls.filter(c=>c.method==='POST'&&c.body.target==='media').length,before);assert.equal(await page.locator('[data-block-id]').count(),count);
 });
 await check('save/reopen preserves layout and publish exposes only the saved snapshot and referenced photos',async()=>{await page.locator('[data-content-editor] form> .account-actions button[type=submit]').click();await page.locator('[data-publish]').waitFor();const row=f.db.prepare('SELECT * FROM nexus_content_posts WHERE slug=?').get('synthetic-layout'),layout=decodeBlogLayout(JSON.parse(row.draft_json).body);assert.equal(layout.blocks.length,3);assert.ok(layout.cover);assert.equal(layout.blocks[2].kind,'gallery');assert.equal(layout.blocks[0].width,50);assert.equal(layout.blocks[0].images[0].caption,'Подпись к своему фото');page.once('dialog',d=>d.accept());await page.locator('[data-publish]').click();await page.getByText('Опубликовано.',{exact:true}).waitFor();const feed=await publicContent(new Request('https://synthetic.invalid/api/v2/content/feed?slug=synthetic-layout'),env);assert.equal(feed.status,200);assert.ok(decodeBlogLayout((await feed.json()).posts[0].body));for(const id of layout.blocks.map(b=>b.images[0].mediaId))assert.equal((await publicContent(new Request('https://synthetic.invalid/api/v2/content/feed?media='+id),env)).status,200)});
 await check('409 preserves edited layout and does not automatically retry a mutation',async()=>{await page.locator('[data-block-id]').first().locator('[data-image-text=caption]').fill('Не потерять при конфликте');const before=calls.filter(c=>c.method==='POST'&&c.body.target==='post').length;conflict=true;await page.locator('[data-content-editor] form> .account-actions button[type=submit]').click();await page.locator('[data-content-admin][data-content-state=conflict]').waitFor();assert.equal(await page.locator('[data-block-id]').first().locator('[data-image-text=caption]').inputValue(),'Не потерять при конфликте');assert.equal(calls.filter(c=>c.method==='POST'&&c.body.target==='post').length,before+1);conflict=false});
 await check('legacy article with over 32 paragraphs opens and saves without truncating its last paragraphs',async()=>{
  const body=Array.from({length:60},(_,i)=>'Старый абзац '+i).join('\n\n'),id=crypto.randomUUID();
  const saved=await f.call('/api/v2/account/control/content',{method:'POST',payload:{requestId:crypto.randomUUID(),target:'post',id,slug:'legacy-long',version:0,action:'save',content:{title:'Старая длинная статья',summary:'',body}}},env);assert.equal(saved.status,200);
  await page.reload();await page.waitForFunction(()=>window.fixtureReady===true);await page.locator('[data-content-list] button').filter({hasText:'Старая длинная статья'}).click();
  assert.equal((await page.locator('[data-text]').evaluateAll(nodes=>nodes.map(node=>node.value))).join(''),body);
  await page.locator('[data-content-editor] form> .account-actions button[type=submit]').click();await page.getByText('Изменение сохранено.',{exact:true}).waitFor();
  const row=f.db.prepare('SELECT draft_json FROM nexus_content_posts WHERE id=?').get(id);assert.equal(decodeBlogLayout(JSON.parse(row.draft_json).body).blocks.map(b=>b.text).join(''),body);
 });
 await check('default-off upload leaves text editing available and photo actions disabled',async()=>{uploadsOff=true;await page.reload();await page.waitForFunction(()=>window.fixtureReady===true);await page.locator('[data-content-new]').click();await page.getByText('Загрузка фотографий на сервере пока не включена. Оформление текста доступно.',{exact:true}).waitFor();assert.equal(await page.locator('[data-add-photo]').isDisabled(),true);assert.equal(await page.locator('[data-add=text]').isEnabled(),true)});
 assert.deepEqual(errors,[]);
}catch(e){process.exitCode=1;checks.push({status:'FAIL',name:e.message,stack:e.stack});console.error(e.stack);await page?.screenshot({path:path.join(out,'FAILURE.png'),fullPage:true}).catch(()=>{})}
finally{await browser?.close();f.close();const safeCalls=calls.map(({body,...c})=>({...c,...(body?{target:body.target,action:body.action}:{})}));await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:process.exitCode?'FAIL':'PASS',checks,errors,calls:safeCalls,physical:false,realCredentials:false,syntheticCookieIngressV3Only:true,productionWrites:0},null,2)+'\n')}
