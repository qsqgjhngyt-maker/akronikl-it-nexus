import http from 'node:http';
import {readFileSync} from 'node:fs';
import {createPasskeyHandler} from './passkey.mjs';
import {createCombinedHandler} from './routes.mjs';
const passkey=createPasskeyHandler({env:process.env}),existing=createCombinedHandler({env:process.env});
const assets=new Map([
 ['/account/access/',['text/html; charset=utf-8',readFileSync(new URL('../public/index.html',import.meta.url))]],
 ['/account/access/page.js',['text/javascript; charset=utf-8',readFileSync(new URL('../public/page.js',import.meta.url))]],
 ['/account/access/passkey-client.js',['text/javascript; charset=utf-8',readFileSync(new URL('../public/passkey-client.js',import.meta.url))]]
]);
const server=http.createServer({maxHeaderSize:16384},async(req,res)=>{
 try{
  if(req.url?.startsWith('/api/v2/account/passkey/'))return await passkey(req,res);
  if(assets.has(req.url)){
   const[contentType,content]=assets.get(req.url);
   if(req.method!=='GET'||process.env.PASSKEY_PROXY_ENABLED!=='true'||req.headers.host!==new URL(process.env.PASSKEY_ORIGIN).host){res.writeHead(404,{'cache-control':'no-store'});res.end();return}
   res.writeHead(200,{'content-type':contentType,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'permissions-policy':'publickey-credentials-create=(self), publickey-credentials-get=(self)'});res.end(content);return;
  }
  await existing(req,res);
 }catch{if(!res.headersSent)res.writeHead(500,{'cache-control':'no-store'});res.end()}
});
server.requestTimeout=15000;server.headersTimeout=10000;server.listen(Number(process.env.PORT||8080),'0.0.0.0');
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),5000).unref()});
