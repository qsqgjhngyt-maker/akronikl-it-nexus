// Exact compiled BFF, loopback only. All credentials are fixed synthetic values.
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
const mode=process.argv[2]||'both';
assert.ok(['both','off','no-private','no-enable'].includes(mode));
const origin='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
Object.assign(process.env,{PORT:'0',OAUTH_PROXY_ENABLED:'true',PASSKEY_PROXY_ENABLED:'true',PASSKEY_ORIGIN:origin,
 OAUTH_SERVICE_KEY:'SYNTHETIC_ONLY_CONNECTION_TEST_KEY_000000',YANDEX_CLIENT_ID:'SYNTHETIC_ONLY_ID',YANDEX_CLIENT_SECRET:'SYNTHETIC_ONLY_SECRET',
 PRIVATE_GATEWAY_CONFIRMED:['both','no-enable'].includes(mode)?'true':'false',
 COOKIE_INGRESS_V3_ENABLED:['both','no-private'].includes(mode)?'true':'false'});
const S='__Host-nexus_session=nxs_'+'A'.repeat(43),F='__Host-nexus_oauth_flow=nof_'+'B'.repeat(43),P='__Host-nexus_passkey_flow=npf_'+'C'.repeat(43);
const original=http.createServer;let server,upstream=0;
http.createServer=(...args)=>{server=original(...args);return server};
globalThis.fetch=async()=>{upstream++;throw Error('EXTERNAL_FETCH_FORBIDDEN')};
const agent=new http.Agent({keepAlive:true,maxSockets:1,maxFreeSockets:1}),rows=[];
const encoded=data=>Buffer.from(JSON.stringify(data)).toString('base64');
const context=encoded({oauthIngressContract:'v3'});
const deadline=setTimeout(()=>{console.error('LOCAL_DEADLINE');process.exit(2)},15000);
async function request(cookie,metadata=context,duplicates=[]){
 const headers=['host',new URL(origin).host,'accept','application/json','x-yc-apigateway-operation-context',metadata,...(cookie===null?[]:['cookie',cookie]),...duplicates];
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port:server.address().port,path:'/api/v2/account/oauth/yandex/callback?__nexus_transport_probe=synthetic-fixed',method:'GET',agent,headers},res=>{
   const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>{
    try{
     assert.equal(res.headers['cache-control'],'no-store');assert.equal(res.headers.vary,'*');
     assert.ok((res.headers['set-cookie']||[]).every(c=>c==='__Host-nexus_oauth_flow=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'));
     const body=JSON.parse(Buffer.concat(chunks));
     resolve({status:res.statusCode,code:body.error.code,reused:req.reusedSocket});
    }catch(error){reject(error)}
   });
  });req.once('error',reject);req.end();
 });
}
try{
 await import(new URL('./image/bff/server.mjs',import.meta.url));if(!server.listening)await once(server,'listening');
 assert.equal(server.maxRequestsPerSocket,0);
 for(let round=0;round<3;round++)for(const [shape,cookie,status,code] of [['SPF',[S,P,F].join('; '),400,'INVALID_INPUT'],['P',P,401,'FLOW_REQUIRED'],['F',F,400,'INVALID_INPUT'],['none',null,401,'FLOW_REQUIRED']]){
  const result=await request(cookie);
  if(mode==='both'){assert.equal(result.status,status);assert.equal(result.code,code)}
  else{assert.ok(result.status>=400);assert.notEqual(result.code,'INVALID_INPUT')}
  rows.push({round,shape,...result,pass:true});
 }
 let negative=0;
 if(mode==='both'){
  for(const [cookie,metadata,duplicates] of [
   [F,encoded({oauthIngressContract:'v3',cookieHeader:F}),[]],
   [F,encoded({accountReadContract:'v3'}),[]],
   [F,'not-base64',[]],
   [F,context,['x-yc-apigateway-operation-context',context]],
   [F,context,['cookie',F]],
   [F+'; '+F,context,[]],
   [F,encoded({oauthIngressContract:'v2',cookieHeader:P}),[]],
  ]){
   const result=await request(cookie,metadata,duplicates);assert.equal(result.status,401);assert.equal(result.code,'INGRESS_REJECTED');negative++;
  }
  const v2=await request(F,encoded({oauthIngressContract:'v2',cookieHeader:F}));assert.equal(v2.status,400);assert.equal(v2.code,'INVALID_INPUT');
 }
 assert.equal(upstream,0);
 console.log(JSON.stringify({status:'PASS',mode,positive:rows.length,negative,rows,upstreamCalls:upstream,realCredentials:false,cloudRequests:0,proxyTrust:'LIVE_NOT_VERIFIED'}));
}finally{
 clearTimeout(deadline);agent.destroy();http.createServer=original;
 if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
}

