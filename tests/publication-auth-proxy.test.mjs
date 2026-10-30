import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {once} from 'node:events';import {createRequire} from 'node:module';
const {createProxy,allowed}=createRequire(import.meta.url)('../tools/auth-canary-proxy.cjs');
test('QA permits login only, blocks model/admin/link/register writes and ambiguous targets',()=>{
 for(const target of ['/api/akronikl/cloud/generate','/api/v2/account/admin/users/delete','/api/v2/account/passkey/register/options','/api/v2/account/oauth/google/link'])assert.equal(allowed('POST',target),false);
 for(const target of ['//evil.test/','/api/%2fadmin','/../api/x','https://evil.test/'])assert.equal(allowed('GET',target),false);
 assert.equal(allowed('POST','/api/v2/account/passkey/authenticate/verify'),true);
 assert.equal(allowed('GET','/api/v2/account/oauth/google/callback?code=PRIVATE&state=PRIVATE'),true);
});
test('QA adapter strips IAM/context, preserves raw cookies, real status and Set-Cookie',async()=>{
 let received;const backend=http.createServer((q,s)=>{received=q;s.writeHead(303,{'set-cookie':['a=one; Secure','b=two; Secure'],location:'/#view=account'});s.end();});backend.listen(0,'127.0.0.1');await once(backend,'listening');
 const marker='sha256:'+'a'.repeat(64),proxy=createProxy({backendPort:backend.address().port,marker});proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
 try{
  const r=await fetch('http://127.0.0.1:'+proxy.address().port+'/api/v2/account/oauth/google/callback?code=test',{redirect:'manual',headers:{authorization:'Bearer TEST_IAM',cookie:'__Host-nexus_oauth_flow=test','x-yc-apigateway-operation-context':'UNTRUSTED'}});
  assert.equal(r.status,303);assert.equal(r.headers.get('x-nexus-auth-candidate'),marker);assert.equal(r.headers.getSetCookie().length,2);
  assert.equal(received.headers.authorization,undefined);assert.equal(received.headers.cookie,'__Host-nexus_oauth_flow=test');assert.deepEqual(JSON.parse(Buffer.from(received.headers['x-yc-apigateway-operation-context'],'base64')),{oauthIngressContract:'v3'});
  assert.equal(received.headers.host,'d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net');
  for(const [body,extra]of [[{intent:'link'},{}],[{intent:'login'},{'x-nexus-oauth-account':'some-account'}],[{intent:'login',extra:true},{}]]){
   const denied=await fetch('http://127.0.0.1:'+proxy.address().port+'/api/v2/account/oauth/google/start',{method:'POST',headers:{'content-type':'application/json',...extra},body:JSON.stringify(body)});assert.equal(denied.status,403);
  }
 }finally{await new Promise(r=>proxy.close(r));await new Promise(r=>backend.close(r));}
});
