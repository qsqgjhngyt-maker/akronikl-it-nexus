// Actual BFF over loopback; synthetic proxy models context retained per TCP connection.
// This tests mitigation semantics, not Yandex's internal implementation.
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
if(process.argv.length>3)throw Error('OPTIONAL_TARGET_ONLY');
const target=process.argv[2]?resolve(process.argv[2]):fileURLToPath(new URL('./image/bff/server.mjs',import.meta.url));
const S='__Host-nexus_session=nxs_'+'A'.repeat(43),F='__Host-nexus_oauth_flow=nof_'+'B'.repeat(43),P='__Host-nexus_passkey_flow=npf_'+'C'.repeat(43);
const origin='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
Object.assign(process.env,{PORT:'0',OAUTH_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',OAUTH_SERVICE_KEY:'SYNTHETIC_ONLY_CONNECTION_TEST_KEY_000000',YANDEX_CLIENT_ID:'SYNTHETIC_ONLY_ID',YANDEX_CLIENT_SECRET:'SYNTHETIC_ONLY_SECRET',PASSKEY_PROXY_ENABLED:'true',PASSKEY_ORIGIN:origin});
let server,upstreamCalls=0;
const originalCreateServer=http.createServer,originalFetch=globalThis.fetch;
http.createServer=(...args)=>{server=originalCreateServer(...args);return server};
globalThis.fetch=async()=>{upstreamCalls++;throw Error('EXTERNAL_FETCH_FORBIDDEN')};
const agent=new http.Agent({keepAlive:true,maxSockets:1,maxFreeSockets:1}),cache=new WeakMap(),sockets=new Set(),rows=[];
const report={syntheticOnly:true,loopbackOnly:true,simulatedProxyContextRetention:true,rows};
const timer=setTimeout(()=>{console.error('TEST_DEADLINE');process.exit(2)},15000);
async function request(cookie,{forcedContext}={}){
 return await new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port:server.address().port,path:'/api/v2/account/oauth/yandex/callback?__nexus_transport_probe=synthetic-fixed',method:'GET',agent,
   headers:{host:new URL(origin).host,accept:'application/json',...(cookie?{cookie}:{}),'x-nexus-transport-probe':'cookie-shape-v1'}},res=>{
    const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,code:JSON.parse(Buffer.concat(chunks)).error.code,connection:res.headers.connection,reused:req.reusedSocket}));
   });
  req.once('socket',socket=>{
   sockets.add(socket);
   if(!cache.has(socket))cache.set(socket,cookie||'-');
   req.setHeader('x-yc-apigateway-operation-context',Buffer.from(JSON.stringify({oauthIngressContract:'v2',cookieHeader:forcedContext??cache.get(socket)})).toString('base64'));
   req.end();
  });req.once('error',reject);
 });
}
try{
 await import(pathToFileURL(target));
 if(!server.listening)await once(server,'listening');
 for(let round=0;round<2;round++)for(const[shape,cookie,expectedStatus,expectedCode]of [['SPF',[S,P,F].join('; '),400,'INVALID_INPUT'],['P',P,401,'FLOW_REQUIRED'],['F',F,400,'INVALID_INPUT'],['none','',401,'FLOW_REQUIRED']]){
  const result=await request(cookie);
  rows.push({round,shape,...result,pass:result.status===expectedStatus&&result.code===expectedCode});
 }
 // Deliberately inconsistent metadata must still be rejected on a new connection.
 const negative=await request(F,{forcedContext:P});
 assert.equal(negative.status,401);assert.equal(negative.code,'INGRESS_REJECTED');
 assert.equal(upstreamCalls,0);
 Object.assign(report,{status:rows.every(r=>r.pass)?'PASS':'FAIL',passed:rows.filter(r=>r.pass).length,total:rows.length,connections:sockets.size,explicitMismatchRejected:true,upstreamCalls});
 if(report.status!=='PASS')process.exitCode=1;
}catch(error){Object.assign(report,{status:'FAIL',safeError:error.code||error.name,upstreamCalls});process.exitCode=1}
finally{
 agent.destroy();globalThis.fetch=originalFetch;http.createServer=originalCreateServer;clearTimeout(timer);
 if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
}

console.log(JSON.stringify(report));
