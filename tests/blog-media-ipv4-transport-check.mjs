// Реальный BFF → loopback HTTP → Worker/SQLite. DNS подменён только для localhost.
// Исторический путь команды сохранён: здесь DI-совместимость и guards.
// Native IPv4/TLS проверяет blog-media-native-https-check и отдельный Linux TLS fixture.
import assert from 'node:assert/strict';
import http from 'node:http';
import dns from 'node:dns';
import {Readable} from 'node:stream';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
import {controlFixture} from './helpers/control-fixture.mjs';
import {handleAdminService} from '../server-access/worker/admin-service.mjs';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from '../server-access/bff/account-read.mjs';
const {createAccountControlHandler}=await import(process.env.NEXUS_BFF_SOURCE_URL||new URL('../server-access/bff/account-control.mjs',import.meta.url));
const f=await controlFixture(),jpeg=createRequire(new URL('../server-access/package.json',import.meta.url))('jpeg-js');
const env={...f.env,CONTENT_ENABLED:'true',CONTENT_MEDIA_ENABLED:'true',CONTENT_MEDIA_UPLOAD_ENABLED:'true',ACCOUNT_CONTROL_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',COOKIE_INGRESS_V3_ENABLED:'true'};
const image=value=>Buffer.from(jpeg.encode({width:16,height:16,data:Buffer.alloc(16*16*4,value)},75).data).toString('base64');
let requests=0,fetchCalls=0,mode='good',checks=0;const dnsCalls=[],dispatchers=[],originalLookup=dns.lookup;
const server=http.createServer(async(req,res)=>{requests++;try{const parts=[];for await(const p of req)parts.push(p);const r=await handleAdminService(new Request(WORKER_ORIGIN+req.url,{method:req.method,headers:req.headers,body:Buffer.concat(parts)}),env);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()))}catch{res.writeHead(500);res.end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
dns.lookup=(host,options,callback)=>{if(typeof options==='function'){callback=options;options={}}dnsCalls.push({host,family:options.family,all:options.all===true});if(host!=='localhost'||mode==='dns-failure'){queueMicrotask(()=>callback(Object.assign(Error('SYNTHETIC_DNS_FAILURE'),{code:'ENOTFOUND'})));return}queueMicrotask(()=>options.all?callback(null,[{address:'127.0.0.1',family:4}]):callback(null,'127.0.0.1',4))};
const handler=createAccountControlHandler({env,fetchImpl:async(url,options)=>{assert.equal(url,WORKER_ORIGIN+'/api/v2/account/internal/control');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(new Headers(options.headers).has('cookie'),false);assert.equal(options.body.includes(f.owner.secret),false);fetchCalls++;dispatchers.push(options.dispatcher);return fetch('http://localhost:'+port+new URL(url).pathname,options)}});
async function invoke({media=true,value=190,expected=f.owner.id,origin=GATEWAY_ORIGIN}={}){
 const headers={host:new URL(GATEWAY_ORIGIN).host,origin,'content-type':'application/json','x-nexus-account-control':'1','x-nexus-account-expectation':expected,'x-yc-apigateway-operation-context':Buffer.from('{"accountControlContract":"v3"}').toString('base64'),cookie:'__Host-nexus_session='+f.owner.secret};
 const body=media?JSON.stringify({requestId:crypto.randomUUID(),target:'media',id:crypto.randomUUID(),slug:'',version:0,action:'upload',content:{jpegBase64:image(value)}}):'';
 const req=Object.assign(Readable.from(body?[Buffer.from(body)]:[]),{url:'/api/v2/account/control/'+(media?'content':'capabilities'),method:media?'POST':'GET',headers,rawHeaders:Object.entries(headers).flat()});let status,raw,h;
 await handler(req,{writeHead(s,headers){status=s;h=headers},end(v){raw=v}});assert.equal(h['cache-control'],'no-store');assert.equal(h.vary,'*');assert.equal(h['set-cookie'],undefined);assert.ok(!raw.includes(f.owner.secret));return {status,body:JSON.parse(raw)};
}
const count=()=>f.db.prepare('SELECT COUNT(*) n FROM nexus_content_media').get().n;
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
try{
 await check('injected media transport stores one signed authorized image without a forced dispatcher',async()=>{const r=await invoke();assert.equal(r.status,200);assert.equal(r.body.ok,true);assert.equal(count(),1);assert.equal(requests,1);assert.equal(fetchCalls,1);assert.equal(dnsCalls.length,1);assert.equal(dispatchers[0],undefined)});
 await check('injected DNS failure closes once without automatic POST retry or data mutation',async()=>{server.closeIdleConnections();await delay(40);mode='dns-failure';const before=fetchCalls,r=await invoke({value:120});assert.equal(r.status,502);assert.equal(r.body.error.code,'BLOG_MEDIA_UPSTREAM_DNS_FAILED');assert.equal(fetchCalls-before,1);assert.equal(requests,1);assert.equal(count(),1)});
 await check('explicit new action recovers after DNS returns and creates only its own media',async()=>{mode='good';const before=fetchCalls,r=await invoke({value:120});assert.equal(r.status,200);assert.equal(fetchCalls-before,1);assert.equal(count(),2);assert.equal(requests,2)});
 await check('account mismatch remains denied by real Worker with media transport enabled',async()=>{const before=count(),r=await invoke({value:110,expected:'synthetic-other-account'});assert.equal(r.status,401);assert.equal(r.body.error.code,'ACCOUNT_SESSION_CHANGED');assert.equal(count(),before)});
 await check('write Origin guard rejects before any network request',async()=>{const before=fetchCalls,r=await invoke({origin:'https://synthetic-wrong-origin.invalid'});assert.equal(r.status,403);assert.equal(r.body.error.code,'ORIGIN_REJECTED');assert.equal(fetchCalls,before);assert.equal(count(),2)});
 await check('non-media capabilities keep existing transport and Account contract',async()=>{const r=await invoke({media:false});assert.equal(r.status,200);assert.equal(r.body.canManage,true);assert.equal(dispatchers.at(-1),undefined);assert.equal(count(),2)});
 console.log(JSON.stringify({status:'PASS',checks,cloudWrites:0,network:'loopback only',realCredentials:false,automaticUploadRetries:0}));
}finally{dns.lookup=originalLookup;server.closeAllConnections();server.close();await once(server,'close');f.close()}
