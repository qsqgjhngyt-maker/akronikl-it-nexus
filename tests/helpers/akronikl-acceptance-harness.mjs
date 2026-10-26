// Изолированный HTTPS-стенд на основе существующего offline-cloud-browser-check.
// Настоящие BFF/Worker/WebAuthn/SQLite; Gateway/IAM/D1 runtime — не воспроизводятся.
// Все DNS браузера направлены на loopback. Никаких реальных credentials в evidence.
import assert from 'node:assert/strict';
import https from 'node:https';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,randomBytes} from 'node:crypto';
import {fixture} from './auth-fixture.mjs';
import {GATEWAY_ORIGIN} from '../../server-access/bff/account-read.mjs';
export const origin=GATEWAY_ORIGIN;
const host=new URL(origin).host;
const mime=f=>({'.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.md':'text/markdown'}[path.extname(f)]||'text/html');
export async function acceptanceHarness(buildPaths){
 const temporary=await mkdtemp(path.join(tmpdir(),'ak02-acceptance-')),tls=path.join(temporary,'tls');
 const cert=spawnSync(process.env.NEXUS_PYTHON_PATH||'python3',[fileURLToPath(new URL('./make-local-cert.py',import.meta.url)),tls],{encoding:'utf8'});
 assert.equal(cert.status,0,'SYNTHETIC_TLS_SETUP_FAILED');
 const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
 const variants={};
 for(const [name,folder] of Object.entries(buildPaths)){
  const frontend=path.resolve(folder),manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json')));
  const f=await fixture(pathToFileURL(frontend+path.sep),{control:true});
  variants[name]={frontend,manifest,f,allowed:new Set(manifest.files.map(r=>'/'+r.file))};
 }
 let variant=Object.keys(variants)[0],offline=false,hold=false,delay=0;
 const pending=[],requests=[],unexpected=[],serverErrors=[],contexts=new Set();
 const server=https.createServer({key:await readFile(path.join(tls,'key.pem')),cert:await readFile(path.join(tls,'cert.pem'))},async(req,res)=>{
  const url=new URL(req.url,'https://'+req.headers.host);
  if(url.host!==host){res.writeHead(421,{'cache-control':'no-store'});res.end();return;}
  const entry={variant,path:url.pathname,method:req.method,offline,status:null,bytes:0};requests.push(entry);
  if(offline){req.socket.destroy();return;}
  try{
   const v=variants[variant];let size=0;const chunks=[];
   for await(const chunk of req){size+=chunk.length;if(size>1048576)throw Error('TEST_BODY_LIMIT');chunks.push(chunk);}
   const body=Buffer.concat(chunks);
   if(delay)await new Promise(r=>setTimeout(r,delay));
   const send=(status,headers,bytes)=>{entry.status=status;entry.bytes=bytes.length;res.writeHead(status,headers);res.end(bytes);};
   if(url.pathname==='/favicon.ico'){send(204,{},Buffer.alloc(0));return;}
   // Единственная фиксированная provider-фикстура: внешние OAuth отключены.
   if(url.pathname==='/api/v2/account/oauth/providers'){send(200,{'content-type':'application/json','cache-control':'no-store',vary:'*'},Buffer.from('{"providers":[]}'));return;}
   const result=await v.f.dispatch(url.href,{method:req.method,headers:req.headers,body:body.length?body.toString():undefined});
   if(result){
    if(hold&&url.pathname==='/api/v2/account')await new Promise(resolve=>pending.push(resolve));
    if(!res.destroyed)send(result.status,result.headers,result.body);return;
   }
   let file;
   if(url.pathname==='/account/entry/'||url.pathname==='/account/access/')file=url.pathname.includes('/access/')?null:'index.html';
   else if(url.pathname.startsWith('/account/entry/'))file='entry-assets/'+v.manifest.assetGeneration+'/'+url.pathname.split('/').at(-1);
   else file=url.pathname.slice(1);
   if(url.pathname==='/account/access/passkey-client.js'){
    send(200,{'content-type':'text/javascript','cache-control':'no-store'},await readFile(new URL('../../server-access/image/public/passkey-client.js',import.meta.url)));return;
   }
   if(file&&v.allowed.has('/'+file)){
    const bytes=await readFile(path.join(v.frontend,file));
    send(200,{'content-type':mime(file),'cache-control':file==='service-worker.js'?'no-store':'public,max-age=3600',...(file==='service-worker.js'?{'service-worker-allowed':'/'}:{})},bytes);return;
   }
   unexpected.push({path:url.pathname,method:req.method});send(404,{'cache-control':'no-store'},Buffer.alloc(0));
  }catch(error){serverErrors.push({name:error.name,code:error.code||'TEST_SERVER_ERROR'});if(!res.headersSent)res.writeHead(500,{'cache-control':'no-store'});res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 async function launch({profile,serviceWorkers='allow'}={}){
  const directory=profile||await mkdtemp(path.join(temporary,'profile-'));
  const context=await chromium.launchPersistentContext(directory,{headless:true,executablePath:process.env.NEXUS_CHROME_PATH,ignoreHTTPSErrors:true,serviceWorkers,viewport:{width:1366,height:900},args:['--ignore-certificate-errors','--no-proxy-server','--disable-background-networking','--disable-component-update','--disable-sync','--disable-features=AutofillServerCommunication,DnsOverHttpsUpgrade','--no-first-run','--host-resolver-rules=MAP * 127.0.0.1:'+port]});
  contexts.add(context);context.on('close',()=>contexts.delete(context));
  return {context,profile:directory};
 }
 function seedSecondAccount(id='synthetic-ak02-b'){
  const f=variants[variant].f,now=new Date().toISOString(),invitation='npi_'+randomBytes(32).toString('base64url');
  f.db.prepare('INSERT INTO account_subjects(id,display_name,status,created_at,updated_at) VALUES(?,?,\'active\',?,?)').run(id,'Synthetic B',now,now);
  f.db.prepare("INSERT INTO nexus_passkey_invites(token_hash,account_id,purpose,expires_at) VALUES(?,?,'bootstrap',?)").run(createHash('sha256').update(invitation).digest('hex'),id,new Date(Date.now()+600000).toISOString());
  const expires=new Date(Date.now()+600000).toISOString();
  f.db.prepare("INSERT INTO nexus_alpha_members(account_id,state,reserved_until,created_at,updated_at) VALUES(?,'invited',?,?,?)").run(id,expires,now,now);
  f.db.prepare("INSERT INTO nexus_admin_invites(token_hash,account_id,kind,created_by,state,created_at) VALUES(?,?,'admin','synthetic-owner','ready',?)").run(createHash('sha256').update(invitation).digest('hex'),id,now);
  return {token:invitation,profile:{username:'synthetic.ak02.b',displayName:'Synthetic B'}};
 }
 return {variants,requests,unexpected,serverErrors,launch,seedSecondAccount,
  choose(name){assert.ok(variants[name]);variant=name;},get current(){return variants[variant]},
  setOffline(value){offline=value;},setLatency(value){assert.ok(value>=0&&value<=1000);delay=value;},
  holdAccount(){hold=true;},get pendingAccount(){return pending.length},releaseAccount(){hold=false;while(pending.length)pending.shift()();},
  async close(){hold=false;while(pending.length)pending.shift()();for(const context of contexts)await context.close();server.closeAllConnections();await new Promise(r=>server.close(r));for(const v of Object.values(variants))v.f.close();}
 };
}
export async function virtualKey(page){
 const cdp=await page.context().newCDPSession(page);await cdp.send('WebAuthn.enable');
 const {authenticatorId}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
 return{cdp,authenticatorId};
}
export async function enroll(page,invitation){
 await page.goto(origin+'/');
 await virtualKey(page);
 const enrollment=typeof invitation==='string'?{token:invitation,profile:{}}:invitation;
 await page.evaluate(async({token,profile})=>{await(await import('/account/access/passkey-client.js')).register(token,profile)},enrollment);
}
export async function signOut(page){await page.evaluate(async()=>{await(await import('/account/access/passkey-client.js')).logout()});}
export async function appReady(page){await page.waitForFunction(()=>!!document.querySelector('#appShell')&&!document.querySelector('#boot-status'));}
