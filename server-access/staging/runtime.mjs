// Loopback-only operator staging, separate from production BFF entry point.
import https from 'node:https';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {fetch} from 'undici';
import {createInvitedPasswordHandler} from '../bff/invited-password.mjs';
import {sendPasswordMail,passwordMailConfigured} from '../bff/password-mail.mjs';
import {validateStage,stagingRPC} from './contract.mjs';
const stateDir=process.env.NEXUS_STAGING_STATE_DIR||'/state';
const s=validateStage(JSON.parse(await readFile(join(stateDir,'staging.private.json'),'utf8')));
const origin='https://localhost:8443';
if(!['capture','live'].includes(s.mailMode))throw Error('STAGING_MAIL_MODE_REQUIRED');
const env={INVITED_PASSWORD_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',INVITED_PASSWORD_SERVICE_KEY:s.passwordKey,
 INVITED_PASSWORD_ORIGIN:origin,INVITED_PASSWORD_WORKER_ORIGIN:s.workerOrigin,INVITED_PASSWORD_MAIL_ENABLED:'true',
 RESEND_API_KEY:s.mailMode==='capture'?'re_STAGING_CAPTURE_NEVER_SENT':s.resendAPIKey,
 INVITED_PASSWORD_MAIL_FROM:s.mailMode==='capture'?'capture@example.invalid':s.mailFrom,
 INVITED_PASSWORD_MAIL_PROVIDER:s.mailMode==='capture'?'resend':s.mailProvider,
 MAILRU_SMTP_USER:s.smtpUser,MAILRU_SMTP_PASSWORD:s.smtpPassword};
if(s.mailMode==='live'&&!passwordMailConfigured(env))throw Error('STAGING_MAIL_SETUP_REQUIRED');
let mail=[];
const sendMail=async message=>{
 if(message.to!==s.testEmail)throw Error('STAGING_RECIPIENT_NOT_ALLOWED');
 if(s.mailMode==='live'){
  try{
   await sendPasswordMail(message);
   await writeFile(join(stateDir,'delivery-status.json'),JSON.stringify({status:'accepted',provider:s.mailProvider,at:new Date().toISOString()}));
  }catch(error){
   await writeFile(join(stateDir,'delivery-status.json'),JSON.stringify({status:'failed',provider:s.mailProvider,at:new Date().toISOString()}));throw error;
  }
  return;
 }
 mail.push({to:message.to,code:message.code,purpose:message.purpose,createdAt:new Date().toISOString()});mail=mail.slice(-10);
 // Private operator file, never served as a resource and never written to logs.
 await writeFile(join(stateDir,'mail.private.json'),JSON.stringify(mail,null,2)+'\n',{mode:0o600});
};
const password=createInvitedPasswordHandler({env,fetchImpl:fetch,sendMail});
const assets=new Map([
 ['/account/password/',{type:'text/html',body:(await readFile(new URL('./public/password.html',import.meta.url),'utf8')).replace('Вход для приглашённых','Staging · Вход для приглашённых')}],
 ['/account/password/password.js',{type:'text/javascript',body:await readFile(new URL('./public/password.js',import.meta.url),'utf8')}]
]);
const home=`<!doctype html><html lang="ru"><meta charset="utf-8"><title>Nexus · staging</title><h1>Staging: вход подтверждён</h1><p>Это отдельный стенд авторизации. Рабочие проекты здесь не подключены.</p><pre id="account"></pre><form method="get" action="/account/password/"><button>Вернуться ко входу</button></form><script src="/stage-home.js"></script></html>`;
const homeJS="fetch('/api/staging/account',{cache:'no-store'}).then(async r=>{if(!r.ok){location.replace('/account/password/');return}document.getElementById('account').textContent=JSON.stringify(await r.json(),null,2)});";
const headers={'cache-control':'no-store','vary':'*','x-content-type-options':'nosniff','referrer-policy':'no-referrer',
 'strict-transport-security':'max-age=31536000','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'permissions-policy':'publickey-credentials-create=(), publickey-credentials-get=()'};
const reply=(res,status,body,type='application/json')=>{res.writeHead(status,{...headers,'content-type':type});res.end(type==='application/json'?JSON.stringify(body):body)};
const server=https.createServer({key:await readFile(join(stateDir,'localhost.key')),cert:await readFile(join(stateDir,'localhost.crt')),maxHeaderSize:16384},async(req,res)=>{
 try{
  if(req.headers.host!=='localhost:8443'||req.headers.origin&&req.headers.origin!==origin)return reply(res,403,{error:'ORIGIN_REJECTED'});
  // This local TLS ingress is authoritative. Discard any client-supplied context;
  // retain raw Cookie fields so the shared parser still rejects duplicates.
  delete req.headers['x-yc-apigateway-operation-context'];
  const raw=[];for(let i=0;i<req.rawHeaders.length;i+=2)if(req.rawHeaders[i].toLowerCase()!=='x-yc-apigateway-operation-context')raw.push(req.rawHeaders[i],req.rawHeaders[i+1]);
  const context=Buffer.from(JSON.stringify({passwordIngressContract:'v2',cookieHeader:req.headers.cookie||'-'})).toString('base64');
  req.headers['x-yc-apigateway-operation-context']=context;req.rawHeaders=[...raw,'x-yc-apigateway-operation-context',context];
  if(await password(req,res))return;
  if(req.method!=='GET')return reply(res,405,{error:'METHOD_NOT_ALLOWED'});
  if(req.url==='/'){res.writeHead(302,{...headers,location:'/account/password/'});return res.end()}
  if(req.url==='/healthz')return reply(res,200,{status:'isolated-auth-staging',mailMode:s.mailMode,productionWrites:0});
  if(assets.has(req.url)){const a=assets.get(req.url);return reply(res,200,a.body,a.type)}
  if(req.url==='/stage-home.js')return reply(res,200,homeJS,'text/javascript');
  if(req.url==='/index.html')return reply(res,200,home,'text/html');
  if(req.url==='/api/staging/account'){
   const cookies=String(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith('__Host-nexus_session='));
   if(cookies.length!==1||!/^__Host-nexus_session=nxs_[A-Za-z0-9_-]{43}$/.test(cookies[0]))return reply(res,401,{error:'SESSION_REQUIRED'});
   const hash=createHash('sha256').update(cookies[0].split('=')[1]).digest('hex');
   const r=await stagingRPC(s,'/api/v2/account/internal/read',s.accountKey,{path:'/api/v2/account',sessionHash:hash});
   if(!r.ok)return reply(res,401,{error:'SESSION_REQUIRED'});const data=await r.json();return reply(res,200,{account:data.account,loginMethods:data.loginMethods});
  }
  return reply(res,404,{error:'NOT_FOUND'});
 }catch{return reply(res,503,{error:'STAGING_UNAVAILABLE'})}
});
server.requestTimeout=15000;server.headersTimeout=10000;
// Docker publishes only 127.0.0.1:8443; never expose this operator harness publicly.
server.listen(8443,process.env.NEXUS_STAGING_CONTAINER==='true'?'0.0.0.0':'127.0.0.1',()=>console.log('ISOLATED_AUTH_STAGING_READY mail='+s.mailMode));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.close(()=>process.exit(0)));
