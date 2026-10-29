// Real existing BFF/Worker/WebAuthn code; SQLite replaces D1, local TLS replaces Gateway.
import https from 'node:https';
import {readFile,mkdir,realpath} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {fixture} from '../../tests/helpers/auth-fixture.mjs';
import {GATEWAY_ORIGIN} from '../../server-access/bff/account-read.mjs';
import {createNexusCloudHandler,createNexusCloudVault} from '../../server-access/bff/akronikl-cloud.mjs';
export async function nexusChatFixture({root,privateDir,createAdapter,onOutcome,generationEnabled=true,localSpeech=null,piperAssets=null,persistent=false,vaultMasterKey=null,fullApp=false}={}){
 root=path.resolve(root);
 await mkdir(privateDir,{recursive:true});const openssl=process.env.NEXUS_OPENSSL??'C:/Program Files/Git/usr/bin/openssl.exe',key=path.join(privateDir,'tls.key'),cert=path.join(privateDir,'tls.crt'),host=new URL(GATEWAY_ORIGIN).hostname;
 const cmd=args=>spawnSync(openssl,args,{windowsHide:true,stdio:['ignore','pipe','ignore']});
 if(cmd(['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=Isolated Nexus Chat QA','-addext','subjectAltName=DNS:'+host]).status!==0)throw Error('QA_TLS_UNAVAILABLE');
 const pub=cmd(['x509','-in',cert,'-pubkey','-noout']),der=spawnSync(openssl,['pkey','-pubin','-outform','DER'],{input:pub.stdout,windowsHide:true,stdio:['pipe','pipe','ignore']});if(der.status!==0)throw Error('QA_TLS_UNAVAILABLE');const spki=createHash('sha256').update(der.stdout).digest('base64');
 if(persistent&&!vaultMasterKey)throw Error('STAND_PERSISTENT_KEY_REQUIRED');
 const backend=await fixture(pathToFileURL(root+path.sep),{control:true,databaseFile:persistent?path.join(privateDir,'nexus-test.sqlite'):null});backend.env.COOKIE_INGRESS_V3_ENABLED='true';
 Object.assign(backend.env,{AKRONIKL_CLOUD_ENABLED:String(generationEnabled),AKRONIKL_STATE_ENABLED:'true',AKRONIKL_VAULT_MASTER_KEY:vaultMasterKey??randomBytes(32).toString('base64'),AKRONIKL_VAULT_FILE:path.join(privateDir,'accounts.enc')});
 const vault=createNexusCloudVault(backend.env),cloud=await createNexusCloudHandler({env:backend.env,fetchImpl:backend.fetchImpl,vault,createAdapter,onOutcome,localSpeech}),network=[],errors=[];
 const html='<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nexus · изолированный чат</title><style>body{font:16px system-ui;background:#edf2f6;color:#172033}button{font:inherit}</style><body><p>Изолированный стенд Nexus — production не используется</p><p id="account">Проверяем вход…</p><main id="root"><button data-akronikl-open disabled>Akronikl</button><button id="logout">Выйти из аккаунта</button></main><script type="module" src="/tools/qa-akronikl/nexus-chat-entry.mjs"></script></body></html>';
 const types={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.wasm':'application/wasm','.html':'text/html','.wav':'audio/wav','.mp4':'video/mp4','.webm':'video/webm','.woff2':'font/woff2'};
 const server=https.createServer({key:await readFile(key),cert:await readFile(cert)},async(req,res)=>{
  const u=new URL(req.url,GATEWAY_ORIGIN),row={path:u.pathname,method:req.method,status:null};network.push(row);res.setHeader('cache-control','no-store');res.setHeader('vary','*');res.once('finish',()=>row.status=res.statusCode);
  try{
   if(req.headers.host!==host){res.writeHead(421);res.end();return;}
   if(u.pathname.startsWith('/akronikl/vendor/piper/')){
    const leaf=u.pathname.slice('/akronikl/vendor/piper/'.length);
    if(!piperAssets||req.method!=='GET'||! /^(?:runtime\.js|piper_phonemize\.(?:data|wasm)|ort\/ort-wasm-[a-z0-9.-]+\.(?:mjs|wasm)|models\/ru_RU-(?:irina|uyut7-pilot5|uyut7-pilot5-pace|uyut7-pilot6-pace)-medium\.onnx(?:\.json)?|chunks\/[a-f0-9]{64}\.[0-9]{3}\.bin)$/u.test(leaf))throw Error('QA_PATH_DENIED');
    const base=await realpath(piperAssets),file=await realpath(path.join(base,leaf));if(!file.startsWith(base+path.sep))throw Error('QA_PATH_DENIED');
    const payload=await readFile(file);row.assetBytes=payload.length;row.assetSha256=createHash('sha256').update(payload).digest('hex');
    res.writeHead(200,{'content-type':leaf.endsWith('.wasm')?'application/wasm':leaf.endsWith('.js')||leaf.endsWith('.mjs')?'text/javascript':leaf.endsWith('.json')?'application/json':'application/octet-stream'});res.end(payload);return;
   }
   if(u.pathname.startsWith('/api/')){
    // Private Gateway ingress is synthesized in this loopback TLS server; not in browser code.
    const marker=u.pathname.includes('/passkey/')?'passkeyIngressContract':'accountReadContract';
    req.headers['x-yc-apigateway-operation-context']=Buffer.from(JSON.stringify({[marker]:'v3'})).toString('base64');const headers=[];for(let i=0;i<req.rawHeaders.length;i+=2)if(req.rawHeaders[i].toLowerCase()!=='x-yc-apigateway-operation-context')headers.push(req.rawHeaders[i],req.rawHeaders[i+1]);headers.push('x-yc-apigateway-operation-context',req.headers['x-yc-apigateway-operation-context']);req.rawHeaders=headers;
    if(await cloud.handle(req,res)!==false)return;
    const chunks=[];let bytes=0;for await(const c of req){bytes+=c.length;if(bytes>1048576)throw Error('QA_BODY_LIMIT');chunks.push(c);}const body=Buffer.concat(chunks),result=await backend.dispatch(u.href,{method:req.method,headers:req.headers,body:body.length?body.toString('utf8'):undefined});if(!result){res.writeHead(404);res.end();return;}res.writeHead(result.status,result.headers);res.end(result.body);return;
   }
   if(['/','/index.html','/nexus-shell.html'].includes(u.pathname)){if(fullApp){const result=await backend.dispatch(u.href,{method:'GET',headers:req.headers});const banner='<div style="position:fixed;bottom:6px;left:8px;z-index:2147483647;padding:5px 9px;background:#102b35;color:#b9f3e8;border-radius:7px;font:12px system-ui;pointer-events:none">ТЕСТОВЫЙ СТЕНД · '+(generationEnabled?'Qwen 3.8 Flash · ограниченный расход':'Облачный ИИ выключен')+'</div>';const documentBody=Buffer.from(result.body.toString('utf8').replace(/\.\/releases\/[^/]+\//gu,'./').replace('</body>',banner+'</body>'));const documentHeaders={...result.headers};delete documentHeaders['Content-Length'];documentHeaders['content-length']=documentBody.length;res.writeHead(result.status,documentHeaders);res.end(documentBody);}else{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);}return;}
   if(u.pathname.startsWith('/account/entry/')){if(fullApp){res.writeHead(302,{location:'/'});res.end();}else{res.writeHead(200,{'content-type':'text/html'});res.end('<a href="/account/access/">Войти ключом доступа Nexus</a>');}return;}
   if(u.pathname==='/favicon.ico'||!fullApp&&u.pathname==='/service-worker.js'){res.writeHead(u.pathname.endsWith('.ico')?204:404);res.end();return;}
   let file;if(u.pathname.startsWith('/account/access/')){const leaf=u.pathname.slice('/account/access/'.length)||'index.html';if(!['index.html','page.js','passkey-client.js'].includes(leaf))throw Error('QA_PATH_DENIED');file=path.join(root,'server-access/public',leaf);}
   else{const allowed=['/akronikl/','/core/','/sandbox/','/pwa/','/server-access/public/','/tools/qa-akronikl/'];if(fullApp){if(u.pathname.split('/').some(p=>p.startsWith('.'))||['/server-access/','/tests/','/tools/','/node_modules/'].some(p=>u.pathname.startsWith(p))&&!u.pathname.startsWith('/server-access/public/'))throw Error('QA_PATH_DENIED');}else if(!allowed.some(p=>u.pathname.startsWith(p)))throw Error('QA_PATH_DENIED');file=await realpath(path.resolve(root,'.'+u.pathname));if(!file.startsWith(root+path.sep))throw Error('QA_PATH_DENIED');}
   res.writeHead(200,{'content-type':types[path.extname(file)]??'application/octet-stream'});res.end(await readFile(file));
  }catch(e){errors.push({path:u.pathname,code:e.code??e.name});if(!res.headersSent)res.writeHead(500);res.end('ISOLATED_QA_FAILED');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return{enableRegistration(){backend.enableControl();backend.enablePublicRegistration();backend.db.exec("UPDATE nexus_alpha_settings SET registration_mode='open' WHERE id=1");},origin:GATEWAY_ORIGIN,port:server.address().port,spki,backend,cloud,vault,network,errors,async close(){await cloud.close();server.closeAllConnections();await new Promise(r=>server.close(r));backend.close();}};
}
