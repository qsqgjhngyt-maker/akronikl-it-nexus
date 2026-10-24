// Actual entry -> bootstrap -> app, with synthetic server-owned capabilities.
// Official mode serves byte-exact published/build files; source mode maps only
// the declared current generation to source. No live API or private data is used.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {GATEWAY_ORIGIN} from '../server-access/bff/account-read.mjs';

const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
const official=Boolean(process.env.NEXUS_FRONTEND_DIR);
const frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR||sourceRoot);
const metadata=JSON.parse(await readFile(path.join(frontend,official?'BUILD_MANIFEST.json':'version.json'),'utf8'));
const generation=metadata.assetGeneration||metadata.releaseCandidate?.assetGeneration;
assert.ok(generation,'Source/build must declare its asset generation');
const prefix='/releases/'+generation+'/';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const roles={
 owner:{canManage:true,canModerate:true,canPurge:false,freshPasskey:true},
 moderator:{canManage:false,canModerate:true,canPurge:false,freshPasskey:false},
 learner:{canManage:false,canModerate:false,canPurge:false,freshPasskey:false}
};
const checks=[],errors=[],consoleErrors=[],missingAssets=[],externalRequests=[],sessions=[],moduleSha256={};
let browser,page;
const mime=file=>({'.js':'text/javascript','.json':'application/json','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'}[path.extname(file)]||'text/html');
const check=async(name,fn)=>{const started=performance.now();await fn();checks.push({name,status:'PASS',durationMs:Math.round(performance.now()-started)});console.log('PASS '+name)};
const capsCount=s=>s.record.api.filter(x=>x.path==='/api/v2/account/control/capabilities').length;
const privateReads=s=>s.record.api.filter(x=>/^\/api\/v2\/account\/control\/(users|content|providers|audit)(?:\/|$)/.test(x.path));
const nav=s=>s.page.locator('.side-nav [data-team-navigation]');
async function ready(target,selector){
 await target.waitForFunction(selector=>document.querySelector(selector)||document.querySelector('.nexus-route-message,.boot-error'),selector);
 const failure=await target.locator('.route-error-detail,.boot-error').allTextContents();
 assert.deepEqual(failure,[],'Actual app render failed: '+failure.join('\n'));
 assert.equal(await target.locator(selector).count()>0,true);
 assert.equal(await target.locator('#boot-status').count(),0);
}
async function navigation(s,hash,selector){
 const previous=await s.page.locator('#appShell').elementHandle();
 const link=s.page.locator('.side-nav a[href="'+hash+'"]');
 if(await link.count())await link.click();else await s.page.evaluate(value=>{location.hash=value},hash);
 if(previous){await s.page.waitForFunction(node=>!node.isConnected,previous);await previous.dispose()}
 await ready(s.page,selector);
}
async function session(role,{width=1366}={}){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 await context.addInitScript(()=>{
  if(window===window.top&&navigator.serviceWorker)navigator.serviceWorker.register=async()=>{throw Error('SYNTHETIC_ADMIN_SW_DISABLED')};
 });
 const id='synthetic-admin-'+role;
 const account={account:{accountId:id,displayName:'Synthetic '+role,status:'active'},loginMethods:[{id:'synthetic-passkey',kind:'passkey',status:'active',createdAt:'2026-10-23T00:00:00Z',disabledAt:null}],enrollmentAvailable:false};
 const state={caps:roles[role]||{...roles.owner,canManage:'true'},hold:null};
 const record={role,width,assets:[],api:[],documents:[]};sessions.push(record);
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==GATEWAY_ORIGIN){externalRequests.push(request.url());return route.abort()}
  if(url.pathname.startsWith('/api/')){
   record.api.push({path:url.pathname,method:request.method(),accountExpectation:request.headers()['x-nexus-account-expectation']||null});
   let body,status=200;
   if(url.pathname==='/api/v2/account')body=account;
   else if(url.pathname==='/api/v2/account/profile')body={...account.account,username:null,avatar:null,avatarVersion:0};
   else if(url.pathname==='/api/v2/account/oauth/providers')body={providers:[]};
   else if(url.pathname==='/api/v2/content/feed')body={posts:[],home:{}};
   else if(url.pathname==='/api/v2/account/control/capabilities'){
    const caps={...state.caps},hold=state.hold;
    if(hold){hold.started();await hold.promise}
    body=caps;
   }else if(url.pathname.startsWith('/api/v2/account/control/')&&state.caps.canManage===true){
    if(url.pathname.endsWith('/users'))body={settings:{limitEnabled:true,maxTesters:20,registrationMode:'invite_only',version:1},counts:{occupied:1,active:1,reserved:0},users:[{accountId:id,displayName:'Synthetic owner',state:'administrator',protected:true,lastLoginAt:'2026-10-23T00:00:00Z',version:1}],total:1};
    else if(url.pathname.endsWith('/providers'))body={providers:[]};
    else if(url.pathname.endsWith('/audit'))body={events:[]};
    else{status=403;body={error:{code:'ADMIN_REQUIRED'}}}
   }else if(url.pathname==='/api/v2/feedback/reviews')body={reviews:[],ratings:0,average:0,total:0};
   else if(url.pathname==='/api/v2/feedback/me')body={account:{id},canModerate:state.caps.canModerate===true,items:[],total:0};
   else if(url.pathname==='/api/v2/feedback/moderation'&&state.caps.canModerate===true)body={items:[],total:0};
   else{status=403;body={error:{code:'ADMIN_REQUIRED'}}}
   return route.fulfill({status,headers:{'content-type':'application/json','cache-control':'no-store',vary:'*'},body:JSON.stringify(body)});
  }
  let file=url.pathname==='/'?'nexus-shell.html':url.pathname.slice(1);
  if(!official&&url.pathname.startsWith(prefix))file=url.pathname.slice(prefix.length);
  if(url.pathname.startsWith(prefix))record.assets.push(url.pathname.slice(prefix.length));
  if(request.isNavigationRequest())record.documents.push(url.pathname);
  try{
   const target=path.resolve(frontend,file);assert.ok(target.startsWith(frontend+path.sep));
   const body=await readFile(target);
   if(/^core\/(bootstrap|app|administration(?:-navigation)?)\.js$/.test(url.pathname.slice(prefix.length)))moduleSha256[url.pathname.slice(prefix.length)]=createHash('sha256').update(body).digest('hex');
   return route.fulfill({status:200,contentType:mime(file),body});
  }catch{missingAssets.push(file);return route.fulfill({status:404,body:'SYNTHETIC_NOT_FOUND'})}
 });
 const target=await context.newPage();page=target;target.setDefaultTimeout(12000);
 target.on('pageerror',error=>errors.push(error.stack||error.message));
 target.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
 return{context,page:target,record,state,id};
}
async function enter(s){
 await s.page.goto(GATEWAY_ORIGIN+'/index.html#view=home');
 await s.page.waitForFunction(()=>document.querySelector('[data-login-label]')?.textContent==='Продолжить в Nexus');
 await s.page.locator('[data-login]').click();await ready(s.page,'.visual-home');
 assert.equal(new URL(s.page.url()).pathname,'/');
 assert.deepEqual(s.record.documents.slice(0,2),['/index.html','/']);
}
function holdCapabilities(s){
 let release,started;
 const begun=new Promise(resolve=>{started=resolve});
 s.state.hold={promise:new Promise(resolve=>{release=resolve}),started};
 return{begun,release:()=>{s.state.hold=null;release()}};
}

try{
 browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking','--disable-component-update']});
 const owner=await session('owner');
 await check('Cold real entry -> Home discovers owner Administration without loading its heavy UI',async()=>{
  await enter(owner);await nav(owner).waitFor();
  assert.equal(await nav(owner).getAttribute('href'),'#view=admin&tab=users');
  assert.equal(capsCount(owner),1,'Cold Home must read server capabilities once');
  assert.equal(owner.record.assets.includes('core/administration.js'),false);
  assert.equal(owner.record.assets.includes('core/content-editor.js'),false);
  assert.deepEqual(privateReads(owner),[],'Navigation must not preload private admin data');
 });
 await check('Owner menu survives rerender; opening Administration waits for fresh capabilities',async()=>{
  const held=holdCapabilities(owner),before=capsCount(owner);
  await navigation(owner,'#view=academy','[data-visual-academy]');await held.begun;
  assert.equal(await nav(owner).count(),1,'Fresh navigation hint must survive the new shell');
  await nav(owner).click();await ready(owner.page,'[data-administration]');
  assert.equal(await owner.page.locator('[data-administration-body]').isHidden(),true);
  assert.deepEqual(privateReads(owner),[],'Cached navigation proof must not authorize the panel');
  assert.equal(capsCount(owner),before+2,'Navigation and screen share one read; Account Control keeps its independent fresh check');
  held.release();await owner.page.locator('[data-admin-users] tr').waitFor();
  assert.equal(await owner.page.locator('[data-administration-status]').textContent(),'Права подтверждены сервером.');
  assert.equal(await owner.page.locator('[data-team-users]').isVisible(),true);
  assert.equal(await owner.page.locator('[data-team-content]').isVisible(),true);
  assert.equal(owner.record.assets.filter(x=>x==='core/administration.js').length,1);
  await navigation(owner,'#view=home','.visual-home');await nav(owner).waitFor();await owner.page.waitForLoadState('networkidle');
 });
 await check('Server role revocation removes cached navigation and blocks direct Administration',async()=>{
  owner.state.caps=roles.learner;
  await navigation(owner,'#view=academy','[data-visual-academy]');await nav(owner).waitFor({state:'detached'});
  const before=privateReads(owner).length;
  await navigation(owner,'#view=admin&tab=users','[data-administration]');
  await owner.page.getByText('Этот раздел доступен только команде Nexus.',{exact:true}).waitFor();
  assert.equal(await owner.page.locator('[data-administration-body]').isHidden(),true);
  assert.equal(await owner.page.locator('[data-account-control]').count(),0);
  assert.equal(privateReads(owner).length,before);
  await owner.context.close();
 });
 await check('Cold moderator gets only the feedback entry and cannot open users or content',async()=>{
  const moderator=await session('moderator');await enter(moderator);await nav(moderator).waitFor();
  assert.equal(await nav(moderator).getAttribute('href'),'#view=admin&tab=feedback');
  await nav(moderator).click();await ready(moderator.page,'[data-administration]');
  await moderator.page.getByText('Права подтверждены сервером.',{exact:true}).waitFor();
  assert.equal(await moderator.page.locator('[data-administration-body]').isVisible(),true);
  assert.equal(await moderator.page.locator('[data-team-users]').isHidden(),true);
  assert.equal(await moderator.page.locator('[data-team-content]').isHidden(),true);
  for(const tab of ['users','content']){
   await navigation(moderator,'#view=admin&tab='+tab,'[data-administration]');
   await moderator.page.getByText('Вам доступна модерация обращений. Управление пользователями и контентом доступно администратору.',{exact:true}).waitFor();
   assert.equal(await moderator.page.locator('[data-administration-body]').isHidden(),true);
   assert.equal(await moderator.page.locator('[data-account-control],[data-content-admin]').count(),0);
  }
  assert.deepEqual(privateReads(moderator),[]);await moderator.context.close();
 });
 await check('Cold learner never receives the team menu or privileged data, including direct URLs',async()=>{
  const learner=await session('learner');
  const response=learner.page.waitForResponse(url=>new URL(url.url()).pathname==='/api/v2/account/control/capabilities');
  await enter(learner);await response;await learner.page.waitForLoadState('networkidle');
  assert.equal(await nav(learner).count(),0);
  for(const tab of ['users','content']){
   await navigation(learner,'#view=admin&tab='+tab,'[data-administration]');
   await learner.page.getByText('Этот раздел доступен только команде Nexus.',{exact:true}).waitFor();
   assert.equal(await learner.page.locator('[data-administration-body]').isHidden(),true);
   assert.equal(await learner.page.locator('[data-account-control],[data-content-admin]').count(),0);
  }
  assert.deepEqual(privateReads(learner),[]);await learner.context.close();
 });
 await check('Malformed capability DTO fails closed on Home and on a direct admin route',async()=>{
  const malformed=await session('malformed');
  const response=malformed.page.waitForResponse(url=>new URL(url.url()).pathname==='/api/v2/account/control/capabilities');
  await enter(malformed);await response;await malformed.page.waitForLoadState('networkidle');
  assert.equal(await nav(malformed).count(),0);
  await navigation(malformed,'#view=admin&tab=users','[data-administration]');
  await malformed.page.waitForFunction(()=>document.querySelector('[data-administration-status]')?.textContent==='Сервис управления аккаунтом сейчас недоступен.');
  assert.equal(await malformed.page.locator('[data-administration-body]').isHidden(),true);
  assert.equal(await nav(malformed).count(),0);assert.deepEqual(privateReads(malformed),[]);
  await malformed.context.close();
 });
 await check('Cold owner at 390px opens Administration through the actual mobile menu',async()=>{
  const mobile=await session('owner',{width:390});await enter(mobile);
  await nav(mobile).waitFor({state:'attached'});
  assert.equal(mobile.record.assets.includes('core/administration.js'),false);
  await mobile.page.locator('#menuBtn').click();await nav(mobile).waitFor();await nav(mobile).click();
  await ready(mobile.page,'[data-administration]');await mobile.page.locator('[data-admin-users] tr').waitFor();
  assert.equal(await mobile.page.locator('[data-administration-body]').isVisible(),true);
  assert.equal(await mobile.page.locator('#sidebar').evaluate(node=>node.classList.contains('open')),false);
  assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  if(process.env.NEXUS_NATIVE_EVIDENCE){await mkdir(process.env.NEXUS_NATIVE_EVIDENCE,{recursive:true});await mobile.page.screenshot({path:path.join(process.env.NEXUS_NATIVE_EVIDENCE,'mobile-administration.png'),fullPage:true,animations:'disabled'})}
  await mobile.context.close();
 });
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(missingAssets,[]);assert.deepEqual(externalRequests,[]);
 for(const s of sessions)for(const request of s.api){
  assert.equal(request.method,'GET','Menu navigation must not mutate synthetic API state');
  if(request.path.startsWith('/api/v2/account/control/'))assert.equal(request.accountExpectation,'synthetic-admin-'+s.role);
 }
}catch(error){
 process.exitCode=1;checks.push({name:error.message,status:'FAIL',stack:error.stack});console.error(error.stack);
 if(process.env.NEXUS_NATIVE_EVIDENCE&&page&&!page.isClosed()){await mkdir(process.env.NEXUS_NATIVE_EVIDENCE,{recursive:true});await page.screenshot({path:path.join(process.env.NEXUS_NATIVE_EVIDENCE,'failure.png'),fullPage:true}).catch(()=>{})}
}finally{
 await browser?.close();
 const result={status:process.exitCode?'FAIL':'PASS',checks,errors,consoleErrors,missingAssets,externalRequests,sessions,moduleSha256,assetGeneration:generation,source:official?'official-build':'source-checkout',serviceWorkers:'registration blocked; PWA lifecycle tested separately',physical:false,syntheticAccounts:true,productionWrites:0};
 if(process.env.NEXUS_NATIVE_EVIDENCE){await mkdir(process.env.NEXUS_NATIVE_EVIDENCE,{recursive:true});await writeFile(path.join(process.env.NEXUS_NATIVE_EVIDENCE,'RESULT.json'),JSON.stringify(result,null,2)+'\n')}
}
