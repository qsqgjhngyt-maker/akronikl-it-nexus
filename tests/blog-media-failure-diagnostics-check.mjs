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
const secretCanary='SYNTHETIC_PRIVATE_VALUE_MUST_NOT_BE_EXPOSED';let checks=0;
async function invoke(impl,{media=true}={}){
 const headers={host:new URL(GATEWAY_ORIGIN).host,origin:GATEWAY_ORIGIN,'content-type':'application/json','x-nexus-account-control':'1','x-nexus-account-expectation':f.owner.id,'x-yc-apigateway-operation-context':Buffer.from('{"accountControlContract":"v3"}').toString('base64'),cookie:'__Host-nexus_session='+f.owner.secret};
 const body=media?JSON.stringify({requestId:crypto.randomUUID(),target:'media',id:crypto.randomUUID(),slug:'',version:0,action:'upload',content:{jpegBase64:image}}):'';
 const req=Object.assign(Readable.from(body?[Buffer.from(body)]:[]),{url:'/api/v2/account/control/'+(media?'content':'capabilities'),method:media?'POST':'GET',headers,rawHeaders:Object.entries(headers).flat()});
 let status,responseHeaders,raw;const res={writeHead(s,h){status=s;responseHeaders=h},end(b){raw=b}};
 await createAccountControlHandler({env,fetchImpl:impl})(req,res);
 assert.equal(responseHeaders['cache-control'],'no-store');assert.equal(responseHeaders.vary,'*');assert.equal(responseHeaders['set-cookie'],undefined);assert.ok(!raw.includes(secretCanary));assert.ok(!raw.includes(f.owner.secret));return {status,body:JSON.parse(raw)};
}
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
const response=(headers={},body={ok:true,media:{id:'a'.repeat(64),mime:'image/jpeg',width:16,height:16}},status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store',vary:'*',...headers}});
try{
 await check('network/timeout failure returns a constant media stage without exception or credentials',async()=>{let calls=0;const r=await invoke(async()=>{calls++;throw Error(secretCanary)});assert.equal(r.status,502);assert.equal(r.body.error.code,'BLOG_MEDIA_UPSTREAM_NETWORK_FAILED');assert.equal(calls,1)});
 for(const [suffix,impl]of [
  ['REDIRECT',async()=>response({},undefined,302)],
  ['MIME',async()=>response({'content-type':'text/html'})],
  ['COOKIE',async()=>response({'set-cookie':secretCanary})],
  ['CACHE',async()=>response({'cache-control':'public, max-age=600'})],
  ['VARY',async()=>response({vary:'Accept-Encoding'})],
  ['DTO',async()=>response({}, {ok:true,media:{id:'a'.repeat(64),mime:'image/jpeg',width:16,height:16,sessionSecret:secretCanary}})]
 ])await check('media '+suffix+' rejection retains fail-closed 502 and no sensitive values',async()=>{const r=await invoke(impl);assert.equal(r.status,502);assert.equal(r.body.error.code,'BLOG_MEDIA_UPSTREAM_'+suffix+'_REJECTED')});
 await check('existing non-media response policy and error contract remain unchanged',async()=>{const r=await invoke(async()=>response({'set-cookie':secretCanary}),{media:false});assert.equal(r.status,502);assert.equal(r.body.error.code,'CONTROL_UNAVAILABLE')});
 await check('actual signed Worker response still commits exactly one private media record',async()=>{let calls=0;const r=await invoke(async(url,options)=>{calls++;assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(new Headers(options.headers).has('cookie'),false);assert.equal(options.body.includes(f.owner.secret),false);return handleAdminService(new Request(url,options),env)});assert.equal(r.status,200);assert.equal(r.body.ok,true);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_content_media').get().n,1);assert.equal(calls,1)});
 console.log(JSON.stringify({status:'PASS',checks,cloudWrites:0,realCredentials:false,privateHeadersUnchanged:true}));
}finally{f.close()}
