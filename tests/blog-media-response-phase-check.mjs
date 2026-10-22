import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createRequire} from 'node:module';
import {controlFixture} from './helpers/control-fixture.mjs';
import {handleAdminService} from '../server-access/worker/admin-service.mjs';
import {GATEWAY_ORIGIN} from '../server-access/bff/account-read.mjs';
const {createAccountControlHandler}=await import(process.env.NEXUS_BFF_SOURCE_URL||new URL('../server-access/bff/account-control.mjs',import.meta.url));
const f=await controlFixture(),jpeg=createRequire(new URL('../server-access/package.json',import.meta.url))('jpeg-js');
const env={...f.env,CONTENT_ENABLED:'true',CONTENT_MEDIA_ENABLED:'true',CONTENT_MEDIA_UPLOAD_ENABLED:'true',ACCOUNT_CONTROL_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',COOKIE_INGRESS_V3_ENABLED:'true'};
const image=Buffer.from(jpeg.encode({width:16,height:16,data:Buffer.alloc(16*16*4,190)},75).data).toString('base64');
const secretCanary='SYNTHETIC_SECRET_NOT_FOR_DIAGNOSTICS';let checks=0;
const headers={'content-type':'application/json','cache-control':'no-store',vary:'*'};
const response=(status=200,value={ok:true,media:{id:'a'.repeat(64),mime:'image/jpeg',width:16,height:16}})=>new Response(JSON.stringify(value),{status,headers});
async function invoke(impl,{media=true}={}){
 const requestHeaders={host:new URL(GATEWAY_ORIGIN).host,origin:GATEWAY_ORIGIN,'content-type':'application/json','x-nexus-account-control':'1','x-nexus-account-expectation':f.owner.id,'x-yc-apigateway-operation-context':Buffer.from('{"accountControlContract":"v3"}').toString('base64'),cookie:'__Host-nexus_session='+f.owner.secret};
 const body=media?JSON.stringify({requestId:crypto.randomUUID(),target:'media',id:crypto.randomUUID(),slug:'',version:0,action:'upload',content:{jpegBase64:image}}):'';
 const req=Object.assign(Readable.from(body?[Buffer.from(body)]:[]),{url:'/api/v2/account/control/'+(media?'content':'capabilities'),method:media?'POST':'GET',headers:requestHeaders,rawHeaders:Object.entries(requestHeaders).flat()});
 let status,replyHeaders,raw,calls=0;
 await createAccountControlHandler({env,fetchImpl:async(...args)=>{calls++;assert.equal(calls,1,'POST must never replay');return impl(...args)}})(req,{writeHead(s,h){status=s;replyHeaders=h},end(b){raw=b}});
 assert.equal(replyHeaders['cache-control'],'no-store');assert.equal(replyHeaders.vary,'*');assert.equal(replyHeaders['set-cookie'],undefined);assert.ok(!raw.includes(secretCanary));assert.ok(!raw.includes(f.owner.secret));assert.equal(calls,1);
 return {status,body:JSON.parse(raw)};
}
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
const errorResponse=code=>({error:{code}});
try{
 await check('response stream failure has a fixed stage code, no exception text or credentials',async()=>{
  const r=await invoke(async()=>new Response(new ReadableStream({start(c){c.error(Error(secretCanary))}}),{status:200,headers}));
  assert.equal(r.status,502);assert.equal(r.body.error.code,'BLOG_MEDIA_UPSTREAM_BODY_READ_FAILED');
 });
 await check('socket close after headers is distinguished without reflecting the private cause',async()=>{
  const r=await invoke(async()=>new Response(new ReadableStream({start(c){c.error(Object.assign(Error(secretCanary),{cause:{code:'UND_ERR_SOCKET',message:secretCanary}}))}}),{status:200,headers}));
  assert.equal(r.status,502);assert.equal(r.body.error.code,'BLOG_MEDIA_UPSTREAM_BODY_SOCKET_CLOSED');
 });
 await check('the unchanged 12-second deadline covers response body and never retries POST',async()=>{
  let usedSignal,r,guard,cancelled=false;const start=performance.now(),keepAlive=setInterval(()=>{},1000);
  try{r=await Promise.race([invoke(async(_url,options)=>{usedSignal=options.signal;return new Response(new ReadableStream({start(){},cancel(){cancelled=true;return new Promise(()=>{})}}),{status:200,headers})}),new Promise((_resolve,reject)=>{guard=setTimeout(()=>reject(Error('SYNTHETIC_BODY_DEADLINE_NOT_ENFORCED')),15000)})])}finally{clearInterval(keepAlive);clearTimeout(guard)}
  assert.ok(usedSignal.aborted);assert.equal(usedSignal.reason.name,'TimeoutError');assert.ok(cancelled);assert.ok(performance.now()-start>=11000);assert.equal(r.status,502);assert.equal(r.body.error.code,'BLOG_MEDIA_UPSTREAM_BODY_TIMEOUT');
 });
 for(const [cause,expected]of [['ENOTFOUND','DNS_FAILED'],['EAI_AGAIN','DNS_FAILED'],['UND_ERR_CONNECT_TIMEOUT','CONNECT_TIMEOUT'],['ENETUNREACH','CONNECT_FAILED'],['ECONNRESET','SOCKET_CLOSED'],['PRIVATE_UNRECOGNIZED_CAUSE','NETWORK_FAILED']]){
  await check('pre-header '+cause+' is classified only through a fixed allowlist',async()=>{const r=await invoke(async()=>{throw Object.assign(Error(secretCanary),{cause:{code:cause,message:secretCanary}})});assert.equal(r.status,502);assert.equal(r.body.error.code,'BLOG_MEDIA_UPSTREAM_'+expected)});
 }
 for(const status of [500,502,503,504,599])await check('HTTP '+status+' upstream failure is explicit and remains fail-closed',async()=>{const r=await invoke(async()=>response(status,errorResponse('CONTROL_UNAVAILABLE')));assert.equal(r.status,status===503?503:502);assert.equal(r.body.error.code,'BLOG_MEDIA_UPSTREAM_HTTP_'+([500,502,503,504].includes(status)?status:'5XX'))});
 for(const [status,code]of [[401,'SESSION_REQUIRED'],[401,'ADMIN_FRESH_PASSKEY_REQUIRED'],[409,'CONTROL_CONFLICT'],[503,'CONTENT_MEDIA_UNAVAILABLE']])await check('existing '+code+' keeps its status and guard contract',async()=>{const r=await invoke(async()=>response(status,errorResponse(code)));assert.equal(r.status,status);assert.equal(r.body.error.code,code)});
 for(const [name,body,status,code]of [['oversized','x'.repeat(262145),413,'INPUT_TOO_LARGE'],['invalid UTF-8',Buffer.from([255]),400,'INVALID_INPUT'],['noncanonical JSON',' {"ok":true}',400,'INVALID_INPUT']])await check('media response '+name+' remains strictly rejected',async()=>{const r=await invoke(async()=>new Response(body,{status:200,headers}));assert.equal(r.status,status);assert.equal(r.body.error.code,code);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_content_media').get().n,0)});
 await check('non-media control error contract and dispatcher remain unchanged',async()=>{
  const r=await invoke(async(_url,options)=>{assert.equal(options.dispatcher,undefined);return new Response(new ReadableStream({start(c){c.error(Error(secretCanary))}}),{status:200,headers})},{media:false});assert.equal(r.status,502);assert.equal(r.body.error.code,'CONTROL_UNAVAILABLE');
 });
 await check('a valid signed Worker upload commits one media record and one audit record',async()=>{
  const r=await invoke(async(url,options)=>{assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.ok(!options.body.includes(f.owner.secret));return handleAdminService(new Request(url,options),env)});
  assert.equal(r.status,200);assert.equal(r.body.ok,true);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_content_media').get().n,1);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_content_media_audit').get().n,1);
 });
 console.log(JSON.stringify({status:'PASS',checks,cloudWrites:0,realCredentials:false,postRetries:0,deadlineMs:12000,physical:false}));
}finally{f.close()}
