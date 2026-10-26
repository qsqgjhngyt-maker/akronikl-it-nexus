// Изолированный настоящий BFF/Worker + SQLite. Это НЕ подключение к production.
import assert from 'node:assert/strict';
import https from 'node:https';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {fixture} from './auth-fixture.mjs';
import {GATEWAY_ORIGIN} from '../../server-access/bff/account-read.mjs';
export async function authenticatedFixture(frontend){
 const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
 const build=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),prefix='/releases/'+build.assetGeneration+'/';
 const temp=await mkdtemp(path.join(tmpdir(),'ak02-auth-')),key=path.join(temp,'key.pem'),cert=path.join(temp,'cert.pem');
 const hostname=new URL(GATEWAY_ORIGIN).hostname;
 const generated=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=Disposable Akronikl QA','-addext','subjectAltName=DNS:'+hostname],{stdio:'ignore'});
 assert.equal(generated.status,0,'Не создан одноразовый TLS');
 const pub=spawnSync('openssl',['x509','-in',cert,'-pubkey','-noout']);
 const der=spawnSync('openssl',['pkey','-pubin','-outform','DER'],{input:pub.stdout});
 assert.equal(der.status,0);const spki=createHash('sha256').update(der.stdout).digest('base64');
 const backend=await fixture(pathToFileURL(frontend+path.sep),{control:true});
 for(const name of ['0015_blog_media','0016_blog_media_parts'])backend.db.exec(await readFile(new URL('../../server-access/migrations/'+name+'.sql',import.meta.url),'utf8'));
 const network=[],errors=[];let offline=false,held=null,armHold=false,context=null;
 const mime=f=>({'.js':'text/javascript','.json':'application/json','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.md':'text/markdown'}[path.extname(f)]||'text/html');
 const server=https.createServer({key:await readFile(key),cert:await readFile(cert)},async(req,res)=>{
  const u=new URL(req.url,GATEWAY_ORIGIN),row={path:u.pathname,method:req.method,status:null,offline};network.push(row);
  if(offline){req.socket.destroy();return;}
  if(req.headers.host!==hostname){row.status=421;res.writeHead(421);res.end();return;}
  try{
   if(u.pathname==='/favicon.ico'){row.status=204;res.writeHead(204);res.end();return;}
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1048576)throw Error('BODY_LIMIT');chunks.push(chunk)}
   const bytes=Buffer.concat(chunks);
   // Только каталог отключённых внешних провайдеров заменён фикстурой.
   if(u.pathname==='/api/v2/account/oauth/providers'){row.status=200;res.writeHead(200,{'content-type':'application/json','cache-control':'no-store',vary:'*'});res.end('{"providers":[]}');return;}
   const result=await backend.dispatch(u.href,{method:req.method,headers:req.headers,body:bytes.length?bytes.toString():undefined});
   if(result){
    if(armHold&&u.pathname==='/api/v2/account'){armHold=false;await new Promise(release=>held={release,status:result.status});held=null;}
    row.status=result.status;res.writeHead(result.status,result.headers);res.end(result.body);return;
   }
   if(req.method!=='GET'||u.pathname.startsWith('/api/')){row.status=404;res.writeHead(404);res.end();return;}
   let name=decodeURIComponent(u.pathname.slice(1)),file;
   if(name.startsWith('account/access/')){
    const leaf=name.slice('account/access/'.length)||'index.html';
    if(!['index.html','page.js','passkey-client.js'].includes(leaf))throw Error('ACCESS_ASSET_DENIED');
    file=new URL('../../server-access/image/public/'+leaf,import.meta.url);
   }else{
    if(name.startsWith('account/entry/'))name='entry-assets/'+build.assetGeneration+'/'+name.split('/').at(-1);
    file=path.resolve(frontend,name);if(!file.startsWith(frontend+path.sep))throw Error('PATH_DENIED');
   }
   const body=await readFile(file);row.status=200;
   res.writeHead(200,{'content-type':mime(name),'cache-control':name==='service-worker.js'?'no-store':'public,max-age=3600',...(name==='service-worker.js'?{'service-worker-allowed':'/'}:{})});res.end(body);
  }catch(error){row.status=500;errors.push({kind:'server',code:error.code||error.name,path:u.pathname});if(!res.headersSent)res.writeHead(500,{'cache-control':'no-store'});res.end('QA_REQUEST_FAILED');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 async function launch(){
  context=await chromium.launchPersistentContext(path.join(temp,'profile'),{headless:true,serviceWorkers:'allow',offline,viewport:{width:1366,height:900},executablePath:process.env.NEXUS_CHROME_PATH,
   args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-proxy-server','--ignore-certificate-errors-spki-list='+spki,'--host-resolver-rules=MAP * 127.0.0.1:'+port]});
  // Все имена в отдельном процессе направлены в loopback; сторонний Host получает 421.
  context.on('page',p=>p.on('pageerror',e=>errors.push({kind:'page',message:e.message})));
  const page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(20000);return page;
 }
 async function virtualKey(page){const cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');const key=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});return{cdp,...key};}
 async function enrollOwner(page){
  await virtualKey(page);await page.goto(GATEWAY_ORIGIN+'/account/access/');
  await page.locator('details').evaluate(n=>n.open=true);await page.locator('#invitation').fill(backend.invitation);await page.locator('#register').click();
  await page.locator('.visual-home').waitFor();backend.enableControl();
  // Для обычного участника включается лишь публичная регистрация в тестовой БД.
  backend.enablePublicRegistration();backend.db.exec("UPDATE nexus_alpha_settings SET registration_mode='open' WHERE id=1");
 }
 return{backend,build,prefix,origin:GATEWAY_ORIGIN,network,errors,launch,virtualKey,enrollOwner,
  get context(){return context},holdNextAccount(){armHold=true},get held(){return held},release(){held?.release()},
  async disconnect(){offline=true;await context.setOffline(true)},async reconnect(){offline=false;await context.setOffline(false)},
  async stopBrowser(){held?.release();await context?.close();context=null},
  async close(){held?.release();await context?.close();server.closeAllConnections();await new Promise(r=>server.close(r));backend.close()}
 };
}
