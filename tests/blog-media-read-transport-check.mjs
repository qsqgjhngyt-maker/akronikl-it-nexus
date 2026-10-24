// Native TLS/HTTP2, real signed BFF -> Worker handlers, synthetic SQLite/accounts.
// Delays model RTT; reported latency is a local fixture measurement, never live.
import assert from 'node:assert/strict';
import http2 from 'node:http2';
import tls from 'node:tls';
import net from 'node:net';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {mediaPartsFixture,sha} from './helpers/media-parts-fixture.mjs';
import {handleAdminService} from '../server-access/worker/admin-service.mjs';
import {createContentHandler} from '../server-access/bff/content.mjs';
import {createAccountControlHandler} from '../server-access/bff/account-control.mjs';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from '../server-access/bff/account-read.mjs';
import {encodeBlogLayout} from '../core/blog-layout.js';
import {metaOf} from '../server-access/media-parts-contract.mjs';

const cert=await readFile(process.env.NEXUS_H2_TLS_CERT),key=await readFile(process.env.NEXUS_H2_TLS_KEY);
assert.ok(process.env.NEXUS_MEDIA_READ_RESULT,'EXPLICIT_LOCAL_RESULT_REQUIRED');
const phase=process.env.NEXUS_MEDIA_READ_CHECK_MODE||'candidate';
assert.ok(['baseline','reuse','candidate'].includes(phase));
const stressIterations=Number(process.env.NEXUS_MEDIA_READ_STRESS||0);
assert.ok(Number.isSafeInteger(stressIterations)&&stressIterations>=0&&stressIterations<=100);
const expectedConcurrency=phase==='candidate'?4:2,connectionDelayMs=100,rpcDelayMs=80;
const f=await mediaPartsFixture(),partCount=metaOf(f.media).totalParts;
const env={...f.env,CONTENT_PROXY_ENABLED:'true',ACCOUNT_CONTROL_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',COOKIE_INGRESS_V3_ENABLED:'true',BFF_CONTENT_MEDIA_PARTS_ENABLED:'true'};
const policy={'content-type':'application/json','cache-control':'no-store',vary:'*'};
const records=[],rpcRecords=[],sessions=new Set(),sockets=new Set(),nonces=new Set();
const originalConnect=tls.connect;let connections=0,sessionCounter=0,active=0,peak=0,mode='good',abortRequest,fail;
const server=http2.createSecureServer({key,cert,allowHTTP1:false});
server.on('session',session=>{session.fixtureId=++sessionCounter;sessions.add(session);session.on('error',()=>{});session.on('close',()=>sessions.delete(session))});
server.on('tlsClientError',()=>{});
server.on('stream',(stream,headers)=>{
 const sessionId=stream.session.fixtureId,scenario=mode;active++;peak=Math.max(peak,active);
 stream.on('error',()=>{});stream.once('close',()=>active--);
 const chunks=[];stream.on('data',chunk=>chunks.push(chunk));
 stream.on('end',async()=>{
  try{
   const body=Buffer.concat(chunks),value=JSON.parse(body),payload=value.payload;
   assert.ok(body.length<=12000);assert.equal(payload.phase,'read');
   assert.equal(headers.cookie,undefined);assert.equal(headers.authorization,undefined);
   const nonce=headers['x-nexus-service-nonce'];assert.ok(!nonces.has(nonce));nonces.add(nonce);
   rpcRecords.push({sessionId,index:payload.index,public:value.sessionHash===null,requestId:payload.requestId});
   if((scenario==='abort'||scenario==='abort-public-only'&&value.sessionHash===null)&&payload.index===1)setTimeout(()=>abortRequest?.(),10);
   if(scenario==='revoke-public'&&payload.index===1)f.db.exec("UPDATE nexus_content_posts SET state='archived'");
   if(scenario==='revoke-private'&&payload.index===1)f.db.prepare('DELETE FROM nexus_admin_grants WHERE account_id=?').run(f.owner.id);
   await delay(rpcDelayMs);
   if(stream.destroyed)return;
   if(scenario==='reset'&&payload.index===1){stream.close(http2.constants.NGHTTP2_INTERNAL_ERROR);return}
   if(scenario==='body-timeout'){stream.respond({':status':200,...policy});stream.write('{');return}
   const requestHeaders=Object.fromEntries(Object.entries(headers).filter(([name])=>!name.startsWith(':')));
   const response=await handleAdminService(new Request(WORKER_ORIGIN+'/api/v2/account/internal/control',{method:'POST',headers:requestHeaders,body}),env);
   let data=await response.json();
   if(scenario==='whole-sha'&&response.status===200&&payload.index===1){
    const text=data.part.data;data.part.data=(text[0]==='A'?'B':'A')+text.slice(1);data.part.sha256=sha(data.part.data);
   }
   if(stream.destroyed)return;
   stream.respond({':status':response.status,...Object.fromEntries(response.headers)});stream.end(JSON.stringify(data));
  }catch(error){fail??=error;stream.destroy()}
 });
});
async function listen(target){await new Promise((resolve,reject)=>{target.once('error',reject);target.listen(0,'127.0.0.1',resolve)});return target.address().port}
const serverPort=await listen(server);
// Encrypted bytes cross a loopback proxy with one explicit delay per connection.
const proxy=net.createServer(downstream=>{
 sockets.add(downstream);downstream.on('error',()=>{});downstream.once('close',()=>sockets.delete(downstream));
 downstream.pause();let upstream;
 const timer=setTimeout(()=>{
  if(downstream.destroyed)return;
  upstream=net.connect(serverPort,'127.0.0.1');sockets.add(upstream);upstream.on('error',()=>downstream.destroy());upstream.once('close',()=>{sockets.delete(upstream);downstream.destroy()});
  downstream.pipe(upstream);upstream.pipe(downstream);downstream.resume();
 },connectionDelayMs);
 downstream.once('close',()=>{clearTimeout(timer);upstream?.destroy()});
});
const proxyPort=await listen(proxy);
tls.connect=options=>{
 assert.equal(options.host,new URL(WORKER_ORIGIN).hostname);assert.equal(options.port,443);assert.equal(options.servername,options.host);
 assert.equal(options.rejectUnauthorized,true);assert.deepEqual(options.ALPNProtocols,['h2']);assert.equal(options.family,4);connections++;
 return originalConnect({...options,host:'127.0.0.1',port:proxyPort,servername:'localhost',ca:cert});
};
async function closed(){for(let i=0;i<200&&(sessions.size||sockets.size);i++)await delay(5);assert.equal(sessions.size,0,'Every photo scope must close its native HTTP2 session');assert.equal(sockets.size,0,'Every photo scope must close its native sockets')}
async function check(name,fn){mode='good';peak=0;f.resetRate();const start=performance.now(),metrics=await fn();await closed();if(fail)throw fail;records.push({name,status:'PASS',elapsedMs:Math.round(performance.now()-start),...metrics});console.log('PASS '+name)}
async function invoke({publicRead=true,abort=false}={}){
 const headers={host:new URL(GATEWAY_ORIGIN).host,...(!publicRead?{origin:GATEWAY_ORIGIN,'x-nexus-account-expectation':f.owner.id,'x-yc-apigateway-operation-context':Buffer.from('{"accountControlContract":"v3"}').toString('base64'),cookie:'__Host-nexus_session='+f.owner.secret}:{})};
 const request=Object.assign(Readable.from([]),{url:(publicRead?'/api/v2/content/feed':'/api/v2/account/control/content')+'?media='+f.media.id,method:'GET',headers,rawHeaders:Object.entries(headers).flat()});
 let status,data,replyHeaders;const response=Object.assign(new EventEmitter(),{writeHead(s,h){status=s;replyHeaders=h},end(raw){data=JSON.parse(raw)}});
 if(abort)abortRequest=()=>abort==='response'?response.emit('close'):request.emit('aborted');
 const start=performance.now();await (publicRead?createContentHandler({env}):createAccountControlHandler({env}))(request,response);
 if(abort)abortRequest=null;
 assert.equal(replyHeaders['cache-control'],'no-store');assert.equal(replyHeaders.vary,'*');assert.equal(replyHeaders['set-cookie'],undefined);
 assert.ok(!JSON.stringify(data).includes(f.owner.secret));
 return{status,data,elapsedMs:Math.round(performance.now()-start)};
}
try{
 const stored=await f.filled();assert.equal((await f.callParts(f.commit(stored))).status,200);
 const postId=randomUUID(),body=encodeBlogLayout({schemaVersion:1,cover:{mediaId:f.media.id,alt:'Synthetic fixture',caption:'',focusX:50,focusY:50},blocks:[]});
 for(const [action,version,content] of [['save',0,{title:'Synthetic fixture',summary:'',body}],['publish',1,{layoutVersion:1}]])assert.equal((await f.call('/api/v2/account/control/content',{method:'POST',payload:{requestId:randomUUID(),target:'post',id:postId,slug:'synthetic-read-test',action,version,content}},f.env)).status,200);
 await check('Native full public photo read: signed RPC count, bounded parallelism, TLS connection count',async()=>{
  const startConnections=connections,startRPC=rpcRecords.length,result=await invoke();
  assert.equal(result.status,200);assert.equal(result.data.media.data,f.media.data);assert.equal(sha(Buffer.from(result.data.media.data,'base64')),f.media.id);
  const tlsConnections=connections-startConnections,rpcCount=rpcRecords.length-startRPC;
  assert.equal(rpcCount,partCount);assert.equal(tlsConnections,phase==='baseline'?partCount:1);assert.equal(peak,expectedConcurrency);
  return{mediaReadMs:result.elapsedMs,tlsConnections,rpcCount,peakRPC:peak,jpegBytes:Buffer.from(f.media.data,'base64').length};
 });
 await check('Concurrent public/private photo reads have separate sessions and freshly signed parts',async()=>{
  const startConnections=connections,startRPC=rpcRecords.length;
  const results=await Promise.all([invoke(),invoke({publicRead:false})]);for(const result of results)assert.equal(result.status,200);
  const calls=rpcRecords.slice(startRPC),sessionKinds=new Map();for(const call of calls){if(!sessionKinds.has(call.sessionId))sessionKinds.set(call.sessionId,new Set());sessionKinds.get(call.sessionId).add(call.public)}
  for(const kinds of sessionKinds.values())assert.equal(kinds.size,1,'Public and private reads must never share a session');
  assert.equal(calls.length,2*partCount);assert.equal(connections-startConnections,phase==='baseline'?2*partCount:2);assert.equal(new Set(calls.map(call=>call.requestId)).size,calls.length);
  return{tlsConnections:connections-startConnections,rpcCount:calls.length,sessionCount:sessionKinds.size};
 });
 if(phase==='candidate'){
  await check('Publication revoked between parts yields 404 and no partial photo',async()=>{
   mode='revoke-public';const n=connections,result=await invoke();assert.equal(result.status,404);assert.equal(result.data.media,undefined);assert.equal(connections-n,1);
   f.db.exec("UPDATE nexus_content_posts SET state='published'");
  });
  await check('Admin grant revoked between parts yields 403 and no partial private photo',async()=>{
   mode='revoke-private';const n=connections,result=await invoke({publicRead:false});assert.equal(result.status,403);assert.equal(result.data.media,undefined);assert.equal(connections-n,1);
   f.db.prepare("INSERT INTO nexus_admin_grants(account_id,status,created_at) VALUES(?,'active',?)").run(f.owner.id,new Date().toISOString());
  });
  for(const publicRead of [true,false])await check((publicRead?'Public response close':'Private request abort')+' cancels peer streams and closes the scope without retry',async()=>{
   mode='abort';const n=connections,startRPC=rpcRecords.length,result=await invoke({publicRead,abort:publicRead?'response':true});
   assert.equal(result.status,502);assert.equal(result.data.media,undefined);assert.equal(connections-n,1);assert.ok(rpcRecords.length-startRPC<=1+expectedConcurrency);assert.ok(result.elapsedMs<2000);
  });
  await check('Aborting one public photo does not cancel a concurrent private photo scope',async()=>{
   mode='abort-public-only';const n=connections,results=await Promise.all([invoke({abort:true}),invoke({publicRead:false})]);
   assert.equal(results[0].status,502);assert.equal(results[0].data.media,undefined);assert.equal(results[1].status,200);assert.equal(results[1].data.media.data,f.media.data);assert.equal(connections-n,2);
  });
  await check('HTTP2 stream reset cancels remaining parts without retry or partial result',async()=>{
   mode='reset';const n=connections,startRPC=rpcRecords.length,result=await invoke();assert.equal(result.status,502);assert.equal(result.data.media,undefined);assert.equal(connections-n,1);assert.ok(rpcRecords.length-startRPC<partCount);
  });
  await check('Valid individual part digests cannot bypass the final whole-photo SHA256',async()=>{
   mode='whole-sha';const n=connections,result=await invoke();assert.equal(result.status,502);assert.equal(result.data.media,undefined);assert.equal(connections-n,1);
  });
  if(stressIterations)await check('Repeated multiplexed revoke/abort/reset scopes close without native failure',async()=>{
   for(let i=0;i<stressIterations;i++){
    f.resetRate();mode=['revoke-public','abort','reset'][i%3];const n=connections,result=await invoke({abort:mode==='abort'?'response':false});
    assert.equal(result.status,mode==='revoke-public'?404:502);assert.equal(result.data.media,undefined);assert.equal(connections-n,1);await closed();
    f.db.exec("UPDATE nexus_content_posts SET state='published'");
    await writeFile(process.env.NEXUS_MEDIA_READ_RESULT+'.stress-progress.json',JSON.stringify({completed:i+1,total:stressIterations,nativeTLSHTTP2:true,runtime:process.version})+'\n');
   }
   return{iterations:stressIterations};
  });
  await check('A stalled native response body is cancelled by the unchanged 12-second deadline',async()=>{
   mode='body-timeout';const n=connections,startRPC=rpcRecords.length,result=await invoke();assert.equal(result.status,502);assert.equal(result.data.media,undefined);assert.equal(connections-n,1);assert.equal(rpcRecords.length-startRPC,1);assert.ok(result.elapsedMs>=11500&&result.elapsedMs<14000);return{mediaReadMs:result.elapsedMs};
  });
 }
}catch(error){fail=error;process.exitCode=1;console.error(error.stack)}
finally{
 tls.connect=originalConnect;for(const session of sessions)session.destroy();for(const socket of sockets)socket.destroy();
 await Promise.all([server,proxy].map(target=>new Promise(resolve=>target.close(resolve))));f.close();
 const sourceSha256={};for(const name of ['media-http2.mjs','media-parts.mjs','content.mjs','account-control.mjs'])sourceSha256[name]=sha(await readFile(new URL('../server-access/bff/'+name,import.meta.url)));
 const result={status:fail?'FAIL':'PASS',phase,records,failure:fail?.stack,sourceSha256,syntheticOnly:true,realCredentials:false,cloudWrites:0,externalNetwork:false,nativeTLSHTTP2:true,model:{connectionDelayMs,rpcDelayMs,partCount},runtime:process.version,stressIterations};
 await writeFile(process.env.NEXUS_MEDIA_READ_RESULT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,phase,checks:records.length,model:result.model}));
}
