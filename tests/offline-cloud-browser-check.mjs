import {staticMime} from '../pwa/static-mime.js';
import {INTRO_VIDEO_BASE} from '../core/startup-intro-assets.js';
import {createHash} from 'node:crypto';
// Реальные HTTPS/SW/WebAuthn/BFF/SQLite, весь DNS браузера направлен в loopback.
// Одноразовый TLS key и виртуальный authenticator не являются credentials владельца.
import assert from 'node:assert/strict';
import https from 'node:https';
import {Readable} from 'node:stream';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {fixture} from './helpers/auth-fixture.mjs';
import worker from '../server-access/worker/entry.mjs';
import {createCloudSessionHandler} from '../server-access/bff/cloud-session.mjs';
import {WORKER_ORIGIN} from '../server-access/bff/account-read.mjs';
import {RUNTIME_RESOURCES} from '../pwa/runtime-manifest.js';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR),out=path.resolve(process.env.NEXUS_CLOUD_BROWSER_EVIDENCE),runtime=path.resolve(process.env.NEXUS_RUNTIME_DIR);
await mkdir(out,{recursive:false});
const temp=await mkdtemp(path.join(tmpdir(),'nx-e2e-')),tls=path.join(temp,'tls'),profile=path.join(temp,'profile');
const cert=spawnSync(process.env.NEXUS_PYTHON_PATH,[fileURLToPath(new URL('helpers/make-local-cert.py',import.meta.url)),tls],{encoding:'utf8',windowsHide:true});assert.equal(cert.status,0,cert.stderr);
const buildManifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),generation=buildManifest.assetGeneration;
const origin='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net',host=new URL(origin).host;
const phrase='SYNTHETIC offline phrase for browser 2026',f=await fixture(pathToFileURL(frontend+path.sep),{control:true});
const statement=(sql,args=[])=>({
 bind:(...values)=>statement(sql,values),async first(){return f.db.prepare(sql).get(...args)||null},
 async all(){return{success:true,results:f.db.prepare(sql).all(...args)}},
 async run(){if(/\bRETURNING\b/i.test(sql)){const results=f.db.prepare(sql).all(...args);return{success:true,results,meta:{changes:results.length}}}return{success:true,results:[],meta:{changes:Number(f.db.prepare(sql).run(...args).changes)}}}
});
const DB={prepare:sql=>statement(sql),async batch(commands){f.db.exec('BEGIN');try{const results=[];for(const c of commands)results.push(await c.run());f.db.exec('COMMIT');return results}catch(e){f.db.exec('ROLLBACK');throw e}}};
const key='SYNTHETIC_OFFLINE_CLOUD_HMAC_KEY_ONLY_2026';
const env={DB,CLOUD_SESSION_ENABLED:'true',CLOUD_SERVICE_KEY:key,AUTH_MODE:'nexus-token',ALPHA_ADMISSION_ENABLED:'true'};
let cloudCalls=0,offline=false,context,vaultId,projectId;
const cloud=createCloudSessionHandler({env:{CLOUD_SESSION_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',CLOUD_SERVICE_KEY:key},fetchImpl:async(url,options)=>{assert.equal(url,WORKER_ORIGIN+'/api/v2/cloud/internal');return worker.fetch(new Request(url,options),env,{})}});
const mime=staticMime;
const checks=[],failures=[],requests=[],errors=[],deniedInfrastructure=[],appRequests=[];
const currentIntro=new URL(INTRO_VIDEO_BASE),isCurrentIntro=r=>r.host===currentIntro.host&&r.method==='GET'&&r.path.startsWith(currentIntro.pathname)&&/^(?:desktop|mobile)(?:-lite)?\.(?:mp4|webm)$/.test(r.path.slice(currentIntro.pathname.length));
const runtimeNames=['clang-bundle.js','runno-entry.js','llvm.core.wasm','llvm.core2.wasm','llvm.core3.wasm','llvm.core4.wasm','llvm-resources.tar'];
const server=https.createServer({key:await readFile(path.join(tls,'key.pem')),cert:await readFile(path.join(tls,'cert.pem'))},async(req,res)=>{
 if(offline){req.socket.destroy();return}
 try{
  const u=new URL(req.url,'https://'+req.headers.host);requests.push({host:u.host,path:u.pathname,method:req.method});
  if(u.href.startsWith(INTRO_VIDEO_BASE)){
   const name=u.href.slice(INTRO_VIDEO_BASE.length);assert.match(name,/^(?:desktop|mobile)(?:-lite)?\.(?:mp4|webm)$/);
   assert.equal(req.method,'GET');assert.equal(Boolean(req.headers.cookie||req.headers.authorization),false);
   const file='intro-media/cinematic-v6/'+name,row=buildManifest.files.find(r=>r.file===file);assert.ok(row);
   const bytes=await readFile(path.join(frontend,row.file));assert.equal(bytes.length,row.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
   res.writeHead(200,{'content-type':staticMime(file),'access-control-allow-origin':'*','cache-control':'no-store'});return res.end(bytes);
  }
  // Только новые публичные media bytes, также через loopback, без live CDN.
  if(u.host==='qsqgjhngyt-maker.github.io'&&/^\/akronikl-it-nexus\/intro-media\/(?:cinematic-v4\/(?:desktop|mobile)\.(?:mp4|webm)|cinematic-v3\/mobile\/(?:mp4\/part-00[0-3]\.mp4|webm\/part-00[0-3]\.webm))$/.test(u.pathname)&&!u.search){
   assert.equal(req.method,'GET');assert.equal(Boolean(req.headers.cookie||req.headers.authorization),false,'Публичное видео не получает session credentials');
   const file=u.pathname.replace('/akronikl-it-nexus/','');res.writeHead(200,{'content-type':file.endsWith('.mp4')?'video/mp4':'video/webm','access-control-allow-origin':'*','cache-control':'no-store'});return res.end(await readFile(path.join(frontend,file)));
  }
  if(u.host==='cdn.jsdelivr.net'){
   const i=RUNTIME_RESOURCES.findIndex(r=>r.url===u.href);if(i<0)throw Error('UNAPPROVED_CDN');
   res.writeHead(200,{'content-type':RUNTIME_RESOURCES[i].mime,'cache-control':'public','access-control-allow-origin':'*'});return res.end(await readFile(path.join(runtime,runtimeNames[i])));
  }
  if(u.host!==host){deniedInfrastructure.push({host:u.host,path:u.pathname});res.writeHead(421,{'cache-control':'no-store'});return res.end()}
  const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);
  if(u.pathname==='/api/akronikl/cloud/preferences'){
   assert.equal(req.method,'GET');
   const session=await f.dispatch(origin+'/api/v2/account',{method:'GET',headers:req.headers});
   assert.ok(session,'Synthetic session check required');
   res.writeHead(session.status,{'content-type':'application/json','cache-control':'no-store',vary:'*'});
   return res.end(session.status===200?JSON.stringify({revision:0,value:null}):session.body);
  }
  if(u.pathname==='/favicon.ico'){res.writeHead(204);return res.end()}
  if(u.pathname==='/api/v2/account/oauth/providers'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store',vary:'*'});return res.end('{"providers":[]}')}
  if(u.pathname.startsWith('/api/v2/cloud/')){
   cloudCalls++;const headers={...req.headers,'x-yc-apigateway-operation-context':Buffer.from(JSON.stringify({accountReadContract:'v2',cookieHeader:req.headers.cookie||'-'})).toString('base64')};
   const input=Readable.from(body.length?[body]:[]);Object.assign(input,{url:u.pathname,method:req.method,headers,rawHeaders:Object.entries(headers).flat()});return await cloud(input,res);
  }
  const handled=await f.dispatch(u.href,{method:req.method,headers:req.headers,body:body.length?body.toString():undefined});
  if(handled){res.writeHead(handled.status,handled.headers);return res.end(handled.body)}
  if(u.pathname==='/account/access/passkey-client.js'){res.writeHead(200,{'content-type':'text/javascript','cache-control':'no-store',vary:'*'});return res.end(await readFile(new URL('../server-access/image/public/passkey-client.js',import.meta.url)))}
  let name=decodeURIComponent(u.pathname).slice(1);
  if(name.startsWith('account/entry/'))name='entry-assets/'+generation+'/'+name.split('/').at(-1);
  const target=path.resolve(frontend,name);
  if(!target.startsWith(frontend+path.sep))throw Error('PATH');
  const bytes=await readFile(target);
  res.writeHead(200,{'content-type':mime(name),'cache-control':'public, max-age=0',...(name==='service-worker.js'?{'service-worker-allowed':'/'}:{})});res.end(bytes);
 }catch(error){errors.push('SERVER:'+error.message);if(!res.headersSent)res.writeHead(500,{'cache-control':'no-store'});res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
async function launch(){
 context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.NEXUS_CHROME_PATH,ignoreHTTPSErrors:true,serviceWorkers:'allow',args:['--ignore-certificate-errors','--no-proxy-server','--disable-background-networking','--disable-component-update','--disable-sync','--disable-features=AutofillServerCommunication,DnsOverHttpsUpgrade','--no-first-run','--host-resolver-rules=MAP * 127.0.0.1:'+port]});
 context.on('request',r=>appRequests.push({host:new URL(r.url()).host,path:new URL(r.url()).pathname,method:r.method()}));
 return context.newPage();
}
async function check(name,fn){const start=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-start)});console.log('PASS '+name)}
let page;
async function finishStartup(){
 // Реальный пользователь закрывает launch overlay перед заполнением форм.
 // Прежняя проверка программно печатала в inert фоне модального intro.
 if(await page.locator('script[src*="startup-intro-launch.js"]').count()){
  await page.waitForFunction(()=>Boolean(document.querySelector('link[data-startup-intro-style]')?.sheet));
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 }
 const layer=page.locator('[data-startup-intro]');if(await layer.count()){await layer.locator('.nexus-intro-skip').click();await layer.waitFor({state:'detached'})}
}
try{
 page=await launch();page.setDefaultTimeout(30000);await page.goto(origin+'/');
 const cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
 await page.evaluate(async invitation=>{const client=await import('/account/access/passkey-client.js');await client.register(invitation)},f.invitation);
 f.enableControl();
 await page.goto(origin+'/index.html#view=offline');await page.locator('[data-offline-center]').waitFor();await finishStartup();
 await check('actual account gate and offline-center UI prepare only personal data under local encryption',async()=>{
  projectId=await page.evaluate(async generation=>{
   const s=await import('/releases/'+generation+'/project-studio/project-store.js'),state=await import('/releases/'+generation+'/core/storage.js');
   const project=s.createProject({title:'Synthetic prepared project',entryFile:'main.cpp',files:[{path:'main.cpp',content:'#include <iostream>\nint main(){std::cout<<"OFFLINE_CLOUD_ORIGINAL\\n";}'}]});
   state.patchLesson('cpp.programming-process',{completed:true});return project.id;
  },generation);
  const form=page.locator('[data-local-create]');await form.locator('[name=localPhrase]').fill(phrase);await form.locator('[name=localRepeat]').fill(phrase);await form.locator('button').click();
  await page.waitForFunction(()=>document.querySelector('[data-local-status]')?.textContent.includes('личная копия сохранены'),{},{timeout:90000});
  const href=await page.locator('[data-open-local]').getAttribute('href');vaultId=new URLSearchParams(href.split('#')[1]).get('copy');assert.ok(vaultId);assert.equal(cloudCalls,0);
 });
 await check('complete close and offline restart use public shell; editing never grants a verified server context',async()=>{
  await context.close();offline=true;page=await launch();page.setDefaultTimeout(30000);await page.goto(origin+'/');await page.locator('[data-cpp-learning-path]').waitFor();
  await page.goto(origin+'/#copy='+vaultId);await page.locator('#localPhrase').fill(phrase);await page.locator('#unlockLocal button').click();await page.locator('#psNewProject').waitFor();
  await page.goto(origin+'/#project='+encodeURIComponent(projectId));await page.locator('#editor').fill('#include <iostream>\nint main(){std::cout<<"OFFLINE_CLOUD_EDIT\\n";}');
  await page.waitForFunction(()=>document.querySelector('#saveStatus')?.textContent.includes('Сохранено на устройстве'));await page.waitForTimeout(400);
  const verified=await page.evaluate(async generation=>(await import('/releases/'+generation+'/core/account-storage.js')).verifiedAccount(),generation);assert.equal(verified,null);assert.equal(cloudCalls,0);
  await context.close();page=await launch();await page.goto(origin+'/#copy='+vaultId);await page.locator('#localPhrase').fill(phrase);await page.locator('#unlockLocal button').click();await page.locator('#psNewProject').waitFor();await page.goto(origin+'/#project='+encodeURIComponent(projectId));await page.locator('#editor').waitFor();assert.match(await page.locator('#editor').inputValue(),/OFFLINE_CLOUD_EDIT/);
 });
 await check('network return preserves offline edits; explicit same-account UI import updates local project without Cloud traffic',async()=>{
  offline=false;await page.goto(origin+'/index.html#view=offline');await page.locator('[data-local-import]').waitFor();await finishStartup();
  const form=page.locator('[data-local-import]');await form.locator('select').selectOption(vaultId);await form.locator('input').fill(phrase);await form.locator('button').click();await page.waitForFunction(()=>document.querySelector('[data-local-status]')?.textContent.includes('Изменения перенесены.'));
  const source=await page.evaluate(async({generation,projectId})=>(await import('/releases/'+generation+'/project-studio/project-store.js')).getProject(projectId).workspace.files[0].content,{generation,projectId});assert.match(source,/OFFLINE_CLOUD_EDIT/);assert.equal(cloudCalls,0);
 });
 await check('explicit Cloud PUSH and PULL use real session/ACL/revision engine and retain offline code and learning',async()=>{
  const result=await page.evaluate(async({generation,projectId})=>{
   const cloud=await import('/releases/'+generation+'/sync/cloud-sync.js'),store=await import('/releases/'+generation+'/project-studio/project-store.js'),state=await import('/releases/'+generation+'/core/storage.js');
   await cloud.enableProjectCloud(projectId);await cloud.pullProjectNow(projectId);return {source:store.getProject(projectId).workspace.files[0].content,completed:state.lessonState('cpp.programming-process').completed};
  },{generation,projectId});assert.match(result.source,/OFFLINE_CLOUD_EDIT/);assert.equal(result.completed,true);assert.ok(cloudCalls>=2);
 });
 await check('logout revokes Cloud access and leaves both local projects and encrypted offline copy intact',async()=>{
  const before=f.db.prepare('SELECT snapshot_json FROM project_snapshots WHERE project_id=?').get(projectId);
  await page.evaluate(async()=>{const client=await import('/account/access/passkey-client.js');await client.logout()});
  const status=await page.evaluate(async()=>{const r=await fetch('/api/v2/cloud/projects',{headers:{'x-nexus-cloud-account':'synthetic-owner'}});return r.status});assert.equal(status,401);
  assert.deepEqual(f.db.prepare('SELECT snapshot_json FROM project_snapshots WHERE project_id=?').get(projectId),before);
  const exists=await page.evaluate(async({generation,vaultId,phrase})=>{const {createVaultStore}=await import('/releases/'+generation+'/pwa/local-vault.js'),s=await createVaultStore().unlock(vaultId,phrase);const has=Object.keys(s.read().projects).length>0;await s.lock();return has},{generation,vaultId,phrase});assert.equal(exists,true);
 });
 assert.deepEqual(errors,[]);assert.ok(appRequests.every(r=>[host,'cdn.jsdelivr.net'].includes(r.host)||isCurrentIntro(r)||(r.host==='qsqgjhngyt-maker.github.io'&&r.method==='GET'&&/^\/akronikl-it-nexus\/intro-media\/(?:cinematic-v4\/(?:desktop|mobile)\.(?:mp4|webm)|cinematic-v3\/mobile\/(?:mp4\/part-00[0-3]\.mp4|webm\/part-00[0-3]\.webm))$/.test(r.path))));
 const knownBackground=new Set(['update.googleapis.com','www.gstatic.com','accounts.google.com','www.google.com','content-autofill.googleapis.com','android.clients.google.com']);
 // Observed in Chrome CI: Optimization Guide probes its model metadata.
 // It remains denied by the loopback server; no external request is allowed.
 const unexpectedInfrastructure=deniedInfrastructure.filter(r=>!knownBackground.has(r.host)&&!(r.host==='optimizationguide-pa.googleapis.com'&&r.path==='/v1:GetModels'));
 assert.deepEqual(unexpectedInfrastructure,[],'Unexpected browser infrastructure host; review before acceptance');
}catch(error){failures.push({message:error.message,stack:error.stack,ui:await page?.evaluate(()=>document.querySelector('[data-local-status]')?.textContent||document.body.textContent.slice(0,2000)).catch(()=>null)});await page?.screenshot({path:path.join(out,'FAILURE.png'),fullPage:true}).catch(()=>{});console.error(error.stack)}
finally{
 try{await context?.close()}catch{}await new Promise(resolve=>server.close(resolve));f.close();
 const result={status:failures.length?'FAIL':'PASS',checks,failures,errors,requests,appRequests,deniedInfrastructure,profile,generation,cloudCalls,allBrowserDnsMappedToLoopback:true,syntheticTlsOnly:true,realCredentials:false,productionChanges:0,physical:false,backend:'actual BFF/Worker JavaScript + actual SQLite; separate workerd regression supplies production-date coverage'};
 await writeFile(path.join(out,'RESULT.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,checks:checks.length,failures:failures.length}));if(failures.length)process.exitCode=1;
}
