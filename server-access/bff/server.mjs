import http from 'node:http';
import {createContentHandler} from './content.mjs';
import {readFileSync} from 'node:fs';
import {createPasskeyHandler} from './passkey.mjs';
import {createCombinedHandler} from './routes.mjs';
import {createEntryGateHandler} from './entry-gate.mjs';
import {createCloudSessionHandler} from './cloud-session.mjs';
import {createOAuthHandler} from './oauth.mjs';
import {createAccountControlHandler} from './account-control.mjs';
const passkey=createPasskeyHandler({env:process.env}),existing=createCombinedHandler({env:process.env});
const landingBody=readFileSync(new URL('../public/entry.html',import.meta.url));
const entryGate=createEntryGateHandler({env:process.env,landingBody});
const cloud=createCloudSessionHandler({env:process.env});
const oauth=createOAuthHandler({env:process.env});
const control=createAccountControlHandler({env:process.env});
const content=createContentHandler({env:process.env});
const assets=new Map([
 ['/account/entry/',['text/html; charset=utf-8',landingBody]],
 ['/account/entry/entry.css',['text/css; charset=utf-8',readFileSync(new URL('../public/entry.css',import.meta.url))]],
 ['/account/entry/entry.js',['text/javascript; charset=utf-8',readFileSync(new URL('../public/entry.js',import.meta.url))]],
 ['/account/entry/galaxy.js',['text/javascript; charset=utf-8',readFileSync(new URL('../public/galaxy.js',import.meta.url))]],
 ['/account/entry/oauth-client.js',['text/javascript; charset=utf-8',readFileSync(new URL('../public/oauth-client.js',import.meta.url))]],
 ['/account/access/',['text/html; charset=utf-8',readFileSync(new URL('../public/index.html',import.meta.url))]],
 ['/account/access/page.js',['text/javascript; charset=utf-8',readFileSync(new URL('../public/page.js',import.meta.url))]],
 ['/account/access/passkey-client.js',['text/javascript; charset=utf-8',readFileSync(new URL('../public/passkey-client.js',import.meta.url))]]
]);
const server=http.createServer({maxHeaderSize:16384},async(req,res)=>{
 // Cache.put ignores Cache-Control, but must reject a response with Vary: *.
 res.setHeader('vary','*');
 try{
  if(await entryGate(req,res))return;
  if(await content(req,res))return;
  if(await control(req,res))return;
  if(await cloud(req,res))return;
  if(await oauth(req,res))return;
  if(req.url?.startsWith('/api/v2/account/passkey/'))return await passkey(req,res);
  if(req.url==='/account/entry')req.url='/account/entry/';
  if(req.url==='/account/access')req.url='/account/access/';
  if(assets.has(req.url)){
   const[contentType,content]=assets.get(req.url);
   if(req.method!=='GET'||process.env.PASSKEY_PROXY_ENABLED!=='true'||req.headers.host!==new URL(process.env.PASSKEY_ORIGIN).host){res.writeHead(404,{'cache-control':'no-store','vary':'*'});res.end();return}
   res.writeHead(200,{'content-type':contentType,'cache-control':'no-store','vary':'*','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'permissions-policy':'publickey-credentials-create=(self), publickey-credentials-get=(self)'});res.end(content);return;
  }
  await existing(req,res);
 }catch{if(!res.headersSent)res.writeHead(500,{'cache-control':'no-store','vary':'*'});res.end()}
});
server.requestTimeout=15000;server.headersTimeout=10000;server.listen(Number(process.env.PORT||8080),'0.0.0.0');
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),5000).unref()});
