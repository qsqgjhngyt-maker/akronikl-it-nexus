// Private QA command override only; never part of the published application image.
// Preserves the production origin/RP/callbacks while routing to the exact candidate.
const http=require('node:http');
const HOST='d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const POST=new Set(['/api/v2/account/passkey/authenticate/options','/api/v2/account/passkey/authenticate/verify','/api/v2/account/passkey/logout','/api/v2/account/oauth/google/start','/api/v2/account/oauth/yandex/start']);
const GET=new Set(['/api/v2/account','/api/v2/account/passkey/registration','/api/v2/account/oauth/providers','/api/v2/account/oauth/google/callback','/api/v2/account/oauth/yandex/callback','/api/v2/content/feed']);
function allowed(method,target){
 if(typeof target!=='string'||target.length>8192||!target.startsWith('/')||target.startsWith('//')||/[\r\n\\]/.test(target))return false;
 const p=target.split('?')[0];if(/%2f|%5c|(?:^|\/)\.\.?\//i.test(p))return false;
 if(method==='POST')return !target.includes('?')&&POST.has(p);
 return ['GET','HEAD'].includes(method)&&(!p.startsWith('/api/')||GET.has(p));
}
function createProxy({backendPort=18081,marker}={}){
 if(!/^sha256:[a-f0-9]{64}$/.test(marker))throw Error('CANDIDATE_MARKER_REQUIRED');
 return http.createServer((req,res)=>{
  if(!allowed(req.method,req.url)){res.writeHead(403,{'cache-control':'no-store','x-nexus-auth-candidate':marker});res.end();return;}
  const p=req.url.split('?')[0],headers={...req.headers};
  for(const name of ['authorization','x-yc-apigateway-operation-context','forwarded','x-forwarded-host','x-forwarded-proto','connection','transfer-encoding','content-length'])delete headers[name];
  const contract=p.startsWith('/api/v2/account/passkey/')?'passkeyIngressContract':p.startsWith('/api/v2/account/oauth/')?'oauthIngressContract':'accountReadContract';
  headers.host=HOST;headers['x-yc-apigateway-operation-context']=Buffer.from(JSON.stringify({[contract]:'v3'})).toString('base64');if(!headers.cookie)delete headers.cookie;
  let bytes=0,parts=[];
  req.on('data',chunk=>{bytes+=chunk.length;if(bytes>65536){parts=[];res.writeHead(413,{'x-nexus-auth-candidate':marker});res.end();req.destroy();}else parts.push(chunk);});
  req.on('end',()=>{
   if(res.writableEnded)return;const body=Buffer.concat(parts);
   if(req.method==='POST'&&p.startsWith('/api/v2/account/oauth/')){
    let input;try{input=JSON.parse(body.toString('utf8'));}catch{}
    if(req.headers['x-nexus-oauth-account']!==undefined||!input||Array.isArray(input)||Object.keys(input).join(',')!=='intent'||input.intent!=='login'){
     res.writeHead(403,{'cache-control':'no-store','x-nexus-auth-candidate':marker});res.end();return;
    }
   }
   if(body.length)headers['content-length']=body.length;
   const upstream=http.request({host:'127.0.0.1',port:backendPort,path:req.url,method:req.method,headers},response=>{
    const h={...response.headers,'x-nexus-auth-candidate':marker};delete h['transfer-encoding'];delete h.connection;
    res.writeHead(response.statusCode,h);response.pipe(res);response.on('error',()=>res.destroy());
   });
   upstream.setTimeout(25000,()=>upstream.destroy(Error('UPSTREAM_TIMEOUT')));
   upstream.on('error',()=>{if(!res.headersSent){res.writeHead(502,{'cache-control':'no-store'});res.end();}else res.destroy();});
   res.on('close',()=>{if(!res.writableEnded)upstream.destroy();});upstream.end(body);
  });
 });
}
function start(){
 const child=require('node:child_process').spawn(process.execPath,['bff/network-bootstrap.mjs'],{env:{...process.env,PORT:'18081'},stdio:'ignore'});
 const proxy=createProxy({marker:process.env.NEXUS_AUTH_IMAGE_DIGEST});proxy.listen(Number(process.env.PORT||8080),'0.0.0.0');
 child.on('exit',()=>proxy.close(()=>process.exit(1)));process.on('SIGTERM',()=>{child.kill('SIGTERM');proxy.close(()=>process.exit(0));});
}
module.exports={createProxy,allowed,start};
