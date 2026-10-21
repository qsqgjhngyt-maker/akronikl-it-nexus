// Только синтетические данные: настоящий BFF, поддельный upstream, без сети.
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createAccountControlHandler} from '../server-access/bff/account-control.mjs';
import {createContentHandler} from '../server-access/bff/content.mjs';
import {GATEWAY_ORIGIN} from '../server-access/bff/account-read.mjs';
import {hasVaryWildcard} from '../core/private-response-policy.js';
const caps={canManage:true,canModerate:true,canPurge:false,freshPasskey:true};
const env={ACCOUNT_CONTROL_PROXY_ENABLED:'true',CONTENT_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',COOKIE_INGRESS_V3_ENABLED:'true',ADMIN_SERVICE_KEY:'SYNTHETIC_TRANSPORT_SERVICE_KEY_ONLY_20261022'};
async function run(kind,vary,extra={}){
 const path=kind==='control'?'/api/v2/account/control/capabilities':'/api/v2/content/feed';let calls=0;
 const fetchImpl=async()=>{calls++;return Response.json(kind==='control'?caps:{home:{},posts:[]},{headers:{'cache-control':'no-store',...(vary===null?{}:{vary}),...extra}})};
 const marker=Buffer.from(JSON.stringify({accountControlContract:'v3'})).toString('base64');
 const headers={host:new URL(GATEWAY_ORIGIN).host,'x-nexus-account-expectation':'synthetic-transport-owner',cookie:'__Host-nexus_session=nxs_'+'a'.repeat(43),'x-yc-apigateway-operation-context':marker};
 const req=Object.assign(Readable.from([]),{url:path,method:'GET',headers,rawHeaders:Object.entries(headers).flat(),socket:{remoteAddress:'127.0.0.1'}});let result;
 const res={writeHead(status,headers){result={status,headers}},end(body){result.body=JSON.parse(body)}};
 await (kind==='control'?createAccountControlHandler:createContentHandler)({env,fetchImpl})(req,res);
 assert.equal(calls,1,'только один upstream запрос, без автоматического повтора');return result;
}
for(const kind of ['control','content']){
 for(const vary of ['*','Accept-Encoding, *','*, Accept-Encoding','Accept-Encoding, Origin, *']){
  const result=await run(kind,vary);assert.equal(result.status,200);assert.equal(result.headers.vary,'*');assert.equal(result.headers['cache-control'],'no-store');assert.equal(result.headers['set-cookie'],undefined);
 }
 for(const vary of [null,'','Accept-Encoding','*x','"*"','*,','*, invalid field'])assert.equal((await run(kind,vary)).status,502);
 for(const extra of [{'set-cookie':'synthetic_only=x'},{'cache-control':'public, max-age=60'},{'content-type':'text/html'}])assert.equal((await run(kind,'Accept-Encoding, *',extra)).status,502);
 console.log('PASS '+kind+': wildcard fields accepted; missing/malformed Vary, Set-Cookie, cache and MIME rejected');
}
assert.equal(hasVaryWildcard('*'.repeat(4097)),false);assert.equal(hasVaryWildcard(Array(65).fill('*').join(',')),false);
console.log('PASS bounded parser and canonical private response policy');
