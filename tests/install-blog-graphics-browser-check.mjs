// Нативный Chrome; только синтетические локальные профили и mock public feed.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {BLOG_DRAFTS} from '../core/blog-seeds.js';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR),out=path.resolve(process.env.NEXUS_UX_EVIDENCE);await mkdir(out,{recursive:false});
const {assetGeneration:generation}=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json')));
const prefix='/releases/'+generation,checks=[],errors=[],requests=[],profile=await mkdtemp(path.join(tmpdir(),'nx-extra-ux-'));
let context,page,offline=false,emptyFeed=false,id,graphicsId;
const phrase='SYNTHETIC graphics local phrase 2026';
const mime=f=>f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':f.endsWith('.webmanifest')?'application/manifest+json':f.endsWith('.png')?'image/png':f.endsWith('.webp')?'image/webp':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.md')?'text/markdown':'text/html';
const posts=BLOG_DRAFTS.map(p=>({...p,publishedAt:'2026-10-22T00:00:00Z'}));
const server=http.createServer(async(req,res)=>{if(offline){req.socket.destroy();return}try{const u=new URL(req.url,'http://127.0.0.1');
 if(u.pathname==='/api/v2/content/feed'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});return res.end(JSON.stringify({home:{},posts:emptyFeed?[]:u.searchParams.has('slug')?posts.filter(p=>p.slug===u.searchParams.get('slug')):posts.map(({body,...p})=>p)}))}
 if(/^\/(api|account)\//.test(u.pathname)){res.writeHead(401,{'content-type':'application/json','cache-control':'no-store'});return res.end('{"error":{"code":"SYNTHETIC_NO_SESSION"}}')}
 if(u.pathname==='/install-fixture.html'){res.writeHead(200,{'content-type':'text/html'});return res.end('<!doctype html><html><body><div data-install-mount></div><script type="module">import {bindInstallButton} from "'+prefix+'/pwa/install.js";window.bindInstallButton=bindInstallButton;window.disposeInstall=bindInstallButton();window.fixtureReady=true;</script></body></html>')}
 if(u.pathname==='/blog-fixture.html'){res.writeHead(200,{'content-type':'text/html'});return res.end('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+prefix+'/styles/app.css"></head><body><main style="max-width:1160px;margin:auto;padding:24px" id="fixture"></main><script type="module">import {blogMarkup,bindPublicContent} from "'+prefix+'/core/content-public.js";const render=()=>{fixture.innerHTML=blogMarkup();bindPublicContent({view:"blog"})};addEventListener("hashchange",render);render();</script></body></html>')}
 const file=u.pathname==='/'?'offline.html':u.pathname.slice(1),target=path.resolve(frontend,file);assert.ok(target.startsWith(frontend+path.sep));const bytes=await readFile(target);res.writeHead(200,{'content-type':mime(file),'cache-control':'public, max-age=0'});res.end(bytes)
 }catch{if(!res.headersSent)res.writeHead(404);res.end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
async function launch(dead=false){context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.NEXUS_CHROME_PATH,...(dead?{proxy:{server:'http://127.0.0.1:9'}}:{}),args:['--disable-background-networking','--disable-sync','--no-first-run']});context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));context.on('request',r=>requests.push({path:new URL(r.url()).pathname,origin:new URL(r.url()).origin,method:r.method()}));page=await context.newPage();page.setDefaultTimeout(30000)}
async function check(name,fn){const start=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-start)});console.log('PASS '+name)}
async function shot(name){await page.screenshot({path:path.join(out,name+'.png'),fullPage:true})}
async function unlock(){await page.goto(origin+'/offline.html#copy='+id);await page.locator('#localPhrase').fill(phrase);await page.locator('#unlockLocal button').click();await page.locator('#newProject').waitFor()}
async function installFixture(){await page.goto(origin+'/install-fixture.html');await page.waitForFunction(()=>window.fixtureReady)}
try{
 await launch();
 await check('install prompt remains user initiated, single use, double-click protected; cancellation recovers',async()=>{
  await installFixture();await page.evaluate(()=>{window.promptCalls=0;window.dispatches=0;const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=()=>{promptCalls++;return new Promise(resolve=>window.resolvePrompt=resolve)};e.userChoice=new Promise(resolve=>window.resolveChoice=resolve);window.promptPrevented=!dispatchEvent(e)});
  assert.equal(await page.evaluate(()=>window.promptCalls),0);await page.locator('[data-install]').click();assert.equal(await page.locator('[data-install]').isDisabled(),true);await page.evaluate(()=>document.querySelector('[data-install]').click());assert.equal(await page.evaluate(()=>window.promptCalls),1);
  await page.evaluate(()=>{resolveChoice({outcome:'dismissed'});resolvePrompt()});await page.getByText(/Установка отменена/).waitFor();assert.equal(await page.locator('[data-install]').isDisabled(),false);await page.locator('[data-install]').click();assert.equal(await page.evaluate(()=>window.promptCalls),1);assert.equal(await page.evaluate(()=>window.promptPrevented),true);
 });
 await check('new browser event permits a new attempt; accepted does not falsely mean installed; cleanup is idempotent',async()=>{
  await page.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=()=>{promptCalls++;return Promise.resolve()};e.userChoice=Promise.resolve({outcome:'accepted'});dispatchEvent(e);bindInstallButton()});assert.equal(await page.locator('[data-install]').count(),1);await page.locator('[data-install]').click();await page.getByText(/Завершение выполняет браузер/).waitFor();assert.equal(await page.locator('[data-install]').isVisible(),true);await page.evaluate(()=>dispatchEvent(new Event('appinstalled')));assert.equal(await page.locator('[data-install]').isVisible(),false);await page.evaluate(()=>{disposeInstall();disposeInstall()});assert.equal(await page.locator('[data-install]').count(),0);
 });
 await check('Yandex Android and iOS fallback instructions are truthful; standalone hides install action',async()=>{
  for(const [ua,expected]of [['Mozilla Android YaBrowser/26','Яндекс'],['Mozilla iPhone YaBrowser/26','Поделиться']]){await installFixture();await page.evaluate(ua=>{disposeInstall();bindInstallButton({navigatorRef:{userAgent:ua,platform:'',maxTouchPoints:0}})},ua);await page.locator('[data-install]').click();assert.match(await page.locator('.install-note').textContent(),new RegExp(expected));}
  await page.evaluate(()=>{document.querySelector('.nexus-install').remove();bindInstallButton({navigatorRef:{standalone:true,userAgent:'iPhone'}})});assert.equal(await page.locator('[data-install]').isVisible(),false);
 });
 await check('published Blog uses photo feature/grid, responsive article typography and safe contents navigation',async()=>{
  await page.goto(origin+'/blog-fixture.html#view=blog');await page.locator('.blog-card').nth(2).waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.blog-photo')].every(i=>i.complete&&i.naturalWidth>0));assert.equal(await page.locator('.blog-card-featured').count(),1);await shot('blog-desktop');
  await page.locator('.blog-card h2 a').first().click();await page.locator('.blog-prose h2').first().waitFor();await page.locator('[data-blog-section]').last().click();assert.ok(page.url().includes('article='));await shot('article-desktop');
  for(const width of [360,390,412]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true)}await shot('article-mobile');
 });
 await check('unpublished and missing articles remain unavailable; server feed is authoritative',async()=>{emptyFeed=true;await page.reload();await page.getByText('Статья не опубликована или снята с публикации.',{exact:true}).waitFor();assert.equal(await page.locator('.blog-article').count(),0);await page.goto(origin+'/blog-fixture.html#view=blog');await page.getByText('Готовим первые истории',{exact:true}).waitFor();assert.equal(await page.locator('.blog-card').count(),0);emptyFeed=false});
 await check('normal Academy catalog, Code Hub and public offline Blog work in the prepared shell',async()=>{
  await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/offline.html#view=academy');await page.locator('[data-visual-academy]').waitFor();await page.locator('#academySearch').fill('NO_SYNTHETIC_MATCH');await page.locator('#academyEmpty:not([hidden])').waitFor();await page.locator('#academyEmptyReset').click();await shot('academy-catalog');
  await page.goto(origin+'/offline.html#view=programming');await page.locator('.code-hub').waitFor();await page.locator('[data-language-journey]').first().click();await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');await shot('code-hub');
  await page.goto(origin+'/offline.html#view=blog');await page.locator('.blog-card').nth(2).waitFor();await shot('offline-blog');
 });
 await check('same editable 3D workshop runs inside an opaque sandbox with unchanged parent CSP',async()=>{
  id=await page.evaluate(async({generation,phrase})=>{const {createVaultStore}=await import('/releases/'+generation+'/pwa/local-vault.js'),{makeLocalPayload}=await import('/releases/'+generation+'/pwa/offline-transfer.js');const session=await createVaultStore().create(makeLocalPayload({account:{accountId:'synthetic-extra-a',displayName:'Synthetic scene',status:'active'},state:{},projects:[],isOwner:()=>true}),phrase);const id=session.id;await session.lock();return id},{generation,phrase});await unlock();
  await page.goto(origin+'/offline.html#view=computer-graphics');await page.locator('[data-graphics-stage][data-graphics-runtime-state="ready"]').waitFor({timeout:45000});assert.ok(Number(await page.locator('[data-graphics-stage]').getAttribute('data-graphics-bodies'))>0);assert.equal(await page.locator('iframe[data-graphics-frame]').getAttribute('sandbox'),'allow-scripts allow-same-origin');assert.equal(await page.evaluate(()=>{try{document.querySelector('[data-graphics-frame]').contentWindow.document;return false}catch(e){return e.name==='SecurityError'}}),true);assert.equal(await page.frameLocator('[data-graphics-frame]').locator('body').evaluate(()=>self.origin),'null');assert.ok(!(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).includes("'unsafe-eval'"));await shot('graphics-desktop');
 });
 await check('3D saving is durable and single flight; checkpoint and library retain the same project',async()=>{
  await page.locator('[data-graphics-project-name]').fill('Synthetic saved universe');await page.locator('[data-graphics-save-top]').click();await page.evaluate(()=>document.querySelector('[data-graphics-save-top]').click());await page.waitForFunction(()=>new URLSearchParams(location.hash.slice(1)).has('project'));graphicsId=new URLSearchParams(new URL(page.url()).hash.slice(1)).get('project');await page.waitForFunction(()=>document.querySelector('[data-graphics-save-top]').disabled===false);assert.equal(await page.locator('[data-graphics-project-open] option[value^="project:"]').count(),1);
  page.once('dialog',d=>d.accept('Synthetic checkpoint'));await page.locator('[data-studio-checkpoint]').click();await page.locator('[data-studio-restore]').waitFor();
 });
 await check('full process restart without network restores the editable scene, checkpoint and photo articles',async()=>{
  await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent.includes('Сохранено'));await context.close();offline=true;await launch(true);await unlock();await page.goto(origin+'/offline.html#view=project-studio&project='+graphicsId);await page.locator('[data-graphics-stage][data-graphics-runtime-state="ready"]').waitFor({timeout:45000});assert.equal(await page.locator('[data-graphics-project-name]').inputValue(),'Synthetic saved universe');assert.equal(await page.locator('[data-studio-restore]').count(),1);await shot('graphics-cold-offline');await page.goto(origin+'/offline.html#view=blog&article=nexus-bez-interneta');await page.locator('.blog-prose h2').first().waitFor();await page.waitForFunction(()=>document.querySelector('.blog-cover img').naturalWidth>0);await shot('blog-cold-offline');
 });
 assert.deepEqual(errors,[]);assert.equal(requests.filter(r=>/^\/api\//.test(r.path)&&r.path!=='/api/v2/content/feed').length,0);
}catch(error){checks.push({name:error.message,status:'FAIL',stack:error.stack});console.error(error.stack);await page?.screenshot({path:path.join(out,'FAILURE.png'),fullPage:true}).catch(()=>{});process.exitCode=1}
finally{await context?.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:process.exitCode?'FAIL':'PASS',checks,errors,requests,generation,profile,physical:false,cloudWrites:0,userDataDeleted:0,cacheOrDatabaseDeleted:0},null,2)+'\n')}
