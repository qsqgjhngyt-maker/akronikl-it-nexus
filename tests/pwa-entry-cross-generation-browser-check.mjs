// Настоящие Chrome/SW/entry/bootstrap/logout, только loopback и synthetic session.
import assert from'node:assert/strict';import https from'node:https';import path from'node:path';
import{readFile,writeFile,mkdir}from'node:fs/promises';import{execFileSync}from'node:child_process';
import{createRequire}from'node:module';import{pathToFileURL}from'node:url';
import{GATEWAY_ORIGIN}from'../server-access/bff/account-read.mjs';import{RUNTIME_GRAPH_ID}from'../pwa/runtime-manifest.js';
const root=path.resolve(import.meta.dirname,'..'),frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR),out=path.resolve(process.env.NEXUS_ENTRY_GRAPH_EVIDENCE),cache=process.env.NEXUS_PINNED_RUNTIME_DIR;
await mkdir(out,{recursive:false});const{build}=createRequire(new URL('../server-access/package.json',import.meta.url))('esbuild');
const m=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),prefix='/releases/'+m.assetGeneration;
const oldManifest=execFileSync('git',['show','065606a788198045cadf250fea663246ddbb2d56:pwa/runtime-manifest.js'],{cwd:root}).toString();
const oldEntry=execFileSync('git',['show','5e0e290c9bf74dde87f3169b9d7e122952fd0c57:server-access/image/public/entry.js'],{cwd:root,maxBuffer:1000000});
assert.ok(oldEntry.includes(Buffer.from('3eb53dcb260f33d040d58e304ae5922c5d842ef3164e3e4a63bae940d3a1efe0')));
const compile=async old=>(await build({absWorkingDir:root,entryPoints:[path.join(root,'server-access/public/entry.js')],bundle:true,platform:'browser',format:'esm',target:'es2022',external:['/account/access/passkey-client.js'],write:false,...(old?{plugins:[{name:'synthetic-previous-sdk-pin',setup(b){b.onLoad({filter:/[\\/]pwa[\\/]runtime-manifest\.js$/},()=>({contents:oldManifest,loader:'js',resolveDir:path.join(root,'pwa')}))}}]}:{})})).outputFiles[0].contents;
const bundles={before:oldEntry,'fixed-previous-sdk':Buffer.from(await compile(true)),'fixed-current-sdk':Buffer.from(await compile(false))};
await writeFile(path.join(out,'candidate-entry.js'),bundles['fixed-current-sdk']);
const{chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));const rows=[];let fatal;
const account={account:{accountId:'synthetic-entry-graph',displayName:'SYNTHETIC Entry Graph',status:'active'},loginMethods:[{id:'synthetic-method',kind:'passkey',status:'active',createdAt:'2026-10-24T00:00:00Z',disabledAt:null}],enrollmentAvailable:false};
const mime=f=>({'.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json','.md':'text/markdown'}[path.extname(f)]||'text/html');
const variants=Object.keys(bundles);
cases:for(const variant of variants)for(const width of[390,1366]){
 let signedIn=true,logoutCount=0,qaLogins=0,entryAccountReads=0,browser,server,page;const requests=[],errors=[];
 try{
  server=https.createServer({key:await readFile(path.join(cache,'qa-key.pem')),cert:await readFile(path.join(cache,'qa-cert.pem'))},async(req,res)=>{
   const u=new URL(req.url,GATEWAY_ORIGIN);requests.push({path:u.pathname,method:req.method});
   try{
    const json=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',vary:'*'});res.end(JSON.stringify(data));};
    if(u.pathname==='/api/v2/account/passkey/logout'&&req.method==='POST'){assert.equal(req.headers['x-nexus-passkey-write'],'1');signedIn=false;logoutCount++;return json(200,{ok:true});}
    if(u.pathname==='/__qa/session'&&req.method==='POST'){signedIn=true;qaLogins++;return json(200,{ok:true});}
    if(u.pathname.startsWith('/api/')){
     if(req.method!=='GET')return json(403,{error:{code:'SYNTHETIC_DENIED'}});
     if(u.pathname==='/api/v2/account'){if(logoutCount)entryAccountReads++;return json(signedIn?200:401,signedIn?account:{error:{code:'SESSION_REQUIRED'}});}
     if(u.pathname==='/api/v2/account/profile')return json(200,{...account.account,username:null,avatar:null,avatarVersion:0});
     if(u.pathname==='/api/v2/account/control/capabilities')return json(200,{canManage:false,canModerate:false,canPurge:false,freshPasskey:false});
     if(u.pathname==='/api/v2/content/feed')return json(200,{posts:[],home:{}});
     if(u.pathname==='/api/v2/feedback/reviews')return json(200,{reviews:[],ratings:0,average:0,total:0});
     return json(403,{error:{code:'SYNTHETIC_DENIED'}});
    }
    if(u.pathname==='/account/entry/entry.js'){res.writeHead(200,{'content-type':'text/javascript','cache-control':'no-store'});return res.end(bundles[variant]);}
    if(u.pathname==='/account/access/passkey-client.js'){
     res.writeHead(200,{'content-type':'text/javascript','cache-control':'no-store'});
     return res.end(`import{ensureSafeController}from'${prefix}/pwa/client.js';export async function login(){await ensureSafeController();await fetch('/__qa/session',{method:'POST'});return{ok:true}}export const message=e=>e.message;`);
    }
    if(u.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
    let file;if(u.pathname==='/account/entry/')file=path.join(root,'server-access/public/entry.html');
    else if(u.pathname==='/account/entry/entry.css')file=path.join(root,'server-access/public/entry.css');
    else{file=path.resolve(frontend,u.pathname==='/'||u.pathname==='/index.html'?'nexus-shell.html':u.pathname.slice(1));if(!file.startsWith(frontend+path.sep))throw Error('PATH');}
    const bytes=await readFile(file),privateDocument=u.pathname==='/'||u.pathname==='/index.html'||u.pathname.startsWith('/account/');
    res.writeHead(200,{'content-type':mime(file),'cache-control':privateDocument||u.pathname==='/service-worker.js'?'no-store':'public, max-age=0'});res.end(bytes);
   }catch{res.writeHead(404);res.end('SYNTHETIC_NOT_FOUND');}
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
  // DNS ограничен loopback; navigation и fetch идут через настоящий SW.
  browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking','--no-proxy-server','--ignore-certificate-errors','--host-resolver-rules=MAP '+new URL(GATEWAY_ORIGIN).hostname+' 127.0.0.1:'+server.address().port+', MAP * ~NOTFOUND']});
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width,height:900}});
  page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));await page.goto(GATEWAY_ORIGIN+'/');await page.locator('.visual-home').waitFor();
  let ready;const deadline=Date.now()+120000;
  while(Date.now()<deadline){ready=await page.evaluate(()=>{const w=navigator.serviceWorker.controller;if(!w)return null;return new Promise(r=>{const c=new MessageChannel(),t=setTimeout(()=>{c.port1.close();r(null)},10000);c.port1.onmessage=e=>{if(e.data.type==='checking')return;clearTimeout(t);r(e.data);c.port1.close()};w.postMessage({type:'nexus-pwa-status',progress:true},[c.port2])})});if(ready?.publicReady===true)break;await page.waitForTimeout(150);}
  assert.equal(ready?.publicReady,true,'Обязателен активный verified SW до logout');assert.equal(ready.graphId,RUNTIME_GRAPH_ID);
  const before=await page.evaluate(async prefix=>{
   const{patchLesson,loadState}=await import(prefix+'/core/storage.js'),{createProject,patchProject,createCheckpoint,getProject}=await import(prefix+'/project-studio/project-store.js');
   patchLesson('cpp.oop-principles',{completed:true,quiz:2,code:'// SYNTHETIC retained code',stdin:'17'});const p=createProject({id:'synthetic-entry-keep',title:'SYNTHETIC keep project',languageId:'cpp'});patchProject(p.id,{workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',files:[{path:'main.cpp',content:'// SYNTHETIC project retained',languageId:'cpp'}]}});createCheckpoint(p.id,'SYNTHETIC checkpoint');localStorage.setItem('synthetic.keep.marker','retained');
   await(await caches.open('synthetic-legacy-private')).put('/api/v2/account',Response.json({stalePrivateCanary:true}));
   return{lesson:loadState().courses.cpp.lessons['cpp.oop-principles'],project:getProject(p.id)};
  },prefix);
  await page.evaluate(()=>{location.hash='#view=account'});await page.locator('[data-unified-account]').waitFor();await page.locator('[data-unified-account] [data-unified-logout]').last().click();await page.waitForURL('**/account/entry/');
  if(variant==='before'){
   await page.waitForTimeout(3000);assert.ok((await page.locator('[data-status]').textContent()).includes('Обновляем офлайн-защиту'));
   assert.equal(logoutCount,1);assert.equal(signedIn,false);assert.equal(entryAccountReads,0);await page.screenshot({path:path.join(out,'before-'+width+'.png')});rows.push({variant,width,status:'EXPECTED_DEFECT_REPRODUCED',logoutConfirmed:true,entryBlockedBeforeAccountRead:true,workerGraph:RUNTIME_GRAPH_ID});
  }else{
   // Текст такой же уже есть в HTML. data-tone появляется только после bindEntry.
   await page.waitForFunction(()=>{const n=document.querySelector('[data-status]');return n?.hasAttribute('data-tone')&&n.textContent.includes('Вход ключом доступа:')});
   assert.equal(await page.locator('[data-account]').isVisible(),false);assert.ok(entryAccountReads>0);assert.equal(signedIn,false);
   assert.equal(await page.evaluate(async prefix=>(await import(prefix+'/core/account-storage.js')).verifiedAccount(),prefix),null);
   await page.screenshot({path:path.join(out,variant+'-'+width+'.png')});await page.locator('[data-login]').click();await page.locator('.visual-home').waitFor();
   const after=await page.evaluate(async prefix=>{const{loadState}=await import(prefix+'/core/storage.js'),{getProject}=await import(prefix+'/project-studio/project-store.js'),{verifiedAccount}=await import(prefix+'/core/account-storage.js');return{lesson:loadState().courses.cpp.lessons['cpp.oop-principles'],project:getProject('synthetic-entry-keep'),accountId:verifiedAccount()?.accountId,marker:localStorage.getItem('synthetic.keep.marker'),legacyCachePreserved:await caches.has('synthetic-legacy-private')};},prefix);
   assert.deepEqual(after.lesson,before.lesson);assert.deepEqual(after.project,before.project);assert.equal(after.accountId,account.account.accountId);assert.equal(after.marker,'retained');assert.equal(after.legacyCachePreserved,true);assert.equal(logoutCount,1);assert.equal(qaLogins,1);assert.deepEqual(errors,[]);
   rows.push({variant,width,status:'PASS',logoutConfirmed:true,entryReadsServer401:true,privateCacheIgnoredAndPreserved:true,sameAccountProgressCodeProjectCheckpoint:true,hardReloads:0,cacheOrStorageDeleted:0,passkeyCeremonies:0,syntheticLoginStub:true});
  }
 }catch(e){const debug=await page?.evaluate(()=>({status:document.querySelector('[data-status]')?.textContent,url:location.href,controller:navigator.serviceWorker.controller?.scriptURL,scripts:[...document.scripts].map(s=>s.src)})).catch(()=>null);fatal={variant,width,message:e.message,stack:e.stack,debug,errors,entryAccountReads,requests:requests.slice(-12)};await page?.screenshot({path:path.join(out,'FAILURE-'+variant+'-'+width+'.png')}).catch(()=>{});console.error(JSON.stringify(fatal));break cases;}
 finally{await browser?.close();server?.closeAllConnections();if(server)await new Promise(r=>server.close(r));}
}
const result={status:!fatal&&rows.length===variants.length*2?'PASS':'FAIL',checks:rows,fatal,synthetic:true,loopbackOnly:true,productionRequests:0,realCredentials:false,realWebAuthn:false};await writeFile(path.join(out,'RESULT.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1;
