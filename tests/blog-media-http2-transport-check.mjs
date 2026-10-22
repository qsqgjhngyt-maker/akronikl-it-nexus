// Настоящие TLS/HTTP2 sockets, только loopback и синтетические ключи/сессии.
import assert from 'node:assert/strict';
import http2 from 'node:http2';
import https from 'node:https';
import tls from 'node:tls';
import net from 'node:net';
import {readFile,open} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {createHash,randomUUID} from 'node:crypto';
import {controlFixture} from './helpers/control-fixture.mjs';
import {handleAdminService} from '../server-access/worker/admin-service.mjs';
import {createAccountControlHandler} from '../server-access/bff/account-control.mjs';
import {requestMediaHTTP2} from '../server-access/bff/media-http2.mjs';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from '../server-access/bff/account-read.mjs';
const cert=await readFile(process.env.NEXUS_H2_TLS_CERT),key=await readFile(process.env.NEXUS_H2_TLS_KEY);
const fixtureDir=process.env.NEXUS_H2_PHOTO_DIR;
assert.ok(fixtureDir&&process.env.NEXUS_H2_RESULT,'EXPLICIT_LOCAL_FIXTURES_REQUIRED');
const f=await controlFixture(),records=[],sessions=new Set(),sockets=new Set();
const env={...f.env,CONTENT_ENABLED:'true',CONTENT_MEDIA_ENABLED:'true',CONTENT_MEDIA_UPLOAD_ENABLED:'true',ACCOUNT_CONTROL_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',COOKIE_INGRESS_V3_ENABLED:'true'};
const hash=b=>createHash('sha256').update(b).digest('hex');
const originalConnect=tls.connect;let mode='good',connections=0,requests=0,fragmentCalls=0,lastBody,lastProtocol,lastContentLength,phase='startup',failure;
const policy={'content-type':'application/json','cache-control':'no-store',vary:'*'};
const localKey='SYNTHETIC_ERROR_TEXT_MUST_NOT_ESCAPE';
const server=http2.createSecureServer({key,cert,allowHTTP1:false});
server.on('session',s=>{sessions.add(s);s.on('error',()=>{});s.on('close',()=>sessions.delete(s))});
server.on('tlsClientError',()=>{});
server.on('stream',(s,h)=>{
 const scenario=mode;requests++;s.on('error',()=>{});lastProtocol=s.session.alpnProtocol;lastContentLength=Number(h['content-length']);
 const chunks=[];s.on('data',b=>chunks.push(b));s.on('end',async()=>{
  lastBody=Buffer.concat(chunks);if(s.destroyed)return;
  try{
   if(scenario==='no-headers')return;
   if(scenario==='goaway'){s.session.goaway(http2.constants.NGHTTP2_ENHANCE_YOUR_CALM,0);return}
   if(scenario==='rst'){s.close(http2.constants.NGHTTP2_INTERNAL_ERROR);return}
   if(scenario==='echo'){s.respond({':status':200,...policy});s.end('{"ok":true}');return}
   if(scenario==='redirect'){s.respond({':status':307,...policy,location:'https://synthetic-not-allowed.invalid/'});s.end('{"error":{"code":"CONTROL_UNAVAILABLE"}}');return}
   if(scenario==='info-cookie'){s.additionalHeaders({':status':103,'set-cookie':'SYNTHETIC_MUST_REJECT=1'});s.respond({':status':200,...policy});s.end('{"ok":true}');return}
   if(scenario==='body-timeout'){s.respond({':status':200,...policy});s.write('{"ok":');return}
   if(scenario==='late-cancel'){s.respond({':status':200,...policy});s.write('{');setTimeout(()=>{if(!s.destroyed)s.end('"ok":true}')},5);return}
   if(scenario==='trailers'){s.respond({':status':200,...policy},{waitForTrailers:true});s.on('wantTrailers',()=>{if(!s.destroyed)s.sendTrailers({'set-cookie':'SYNTHETIC_MUST_REJECT=1'})});s.end('{"ok":true}');return}
   let responseHeaders={...policy},status=200,body;
   if(scenario==='cookie')responseHeaders['set-cookie']='SYNTHETIC_MUST_REJECT=1';
   if(scenario==='cache')responseHeaders['cache-control']='public, max-age=60';
   if(scenario==='vary')delete responseHeaders.vary;
   if(scenario==='encoding')responseHeaders['content-encoding']='gzip';
   if(scenario==='mime')responseHeaders['content-type']='text/html';
   if(scenario==='duplicate-cache')responseHeaders['cache-control']=['no-store','public'];
   if(scenario==='oversized')body='x'.repeat(262145);
   else if(scenario==='invalid-utf8')body=Buffer.from([255]);
   else if(scenario==='invalid-dto')body='{"ok":true,"media":{"id":"'+('a'.repeat(64))+'","mime":"image/jpeg","width":2000,"height":16}}';
   else if(scenario==='http-503'){status=503;body='{"error":{"code":"CONTROL_UNAVAILABLE"}}'}
   else if(scenario==='good'){
    const headers=Object.fromEntries(Object.entries(h).filter(([name])=>!name.startsWith(':')));
    const response=await handleAdminService(new Request(WORKER_ORIGIN+'/api/v2/account/internal/control',{method:'POST',headers,body:lastBody}),env);
    status=response.status;responseHeaders=Object.fromEntries(response.headers);body=await response.text();
   }else body='{"ok":true}';
   if(!s.destroyed){s.respond({':status':status,...responseHeaders});s.end(body)}
  }catch{s.destroy()}
 });
});
const h1=https.createServer({key,cert,ALPNProtocols:['http/1.1']},()=>{});h1.on('tlsClientError',()=>{});
const stalled=net.createServer(s=>{sockets.add(s);s.on('error',()=>{});s.on('close',()=>sockets.delete(s))});
async function listen(s){await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve)});return s.address().port}
const ports={h2:await listen(server),h1:await listen(h1),stall:await listen(stalled)};
tls.connect=function(options){
 assert.equal(options.host,new URL(WORKER_ORIGIN).hostname);assert.equal(options.servername,options.host);assert.equal(options.port,443);assert.equal(options.rejectUnauthorized,true);assert.equal(options.family,4);assert.equal(options.autoSelectFamily,false);assert.deepEqual(options.ALPNProtocols,['h2']);connections++;
 if(mode==='dns')return originalConnect({...options,lookup:(_name,_opts,cb)=>cb(Object.assign(Error(localKey),{code:'ENOTFOUND'}))});
 const socket=originalConnect({...options,host:'127.0.0.1',port:mode==='h1'?ports.h1:mode==='tls-timeout'?ports.stall:ports.h2,servername:'localhost',...(mode==='untrusted'?{}:{ca:cert})});
 const setter=socket.setMaxSendFragment;
 socket.setMaxSendFragment=size=>{assert.equal(size,1024);fragmentCalls++;return mode==='fragment-setting-fails'?false:setter.call(socket,size)};
 return socket;
};
async function check(name,fn){phase=name;const start=performance.now();await fn();records.push({name,status:'PASS',durationMs:Math.round(performance.now()-start)});console.log('PASS '+name)}
const images=new Map();for(const size of [16,256,1280])images.set(size,(await readFile(fixtureDir+'/synthetic-'+size+'.jpg')).toString('base64'));
async function invoke({image=images.get(16),cookie=f.owner.secret,account=f.owner.id}={}){
 const headers={host:new URL(GATEWAY_ORIGIN).host,origin:GATEWAY_ORIGIN,'content-type':'application/json','x-nexus-account-control':'1','x-nexus-account-expectation':account,'x-yc-apigateway-operation-context':Buffer.from('{"accountControlContract":"v3"}').toString('base64'),cookie:'__Host-nexus_session='+cookie};
 const b=JSON.stringify({requestId:randomUUID(),target:'media',id:randomUUID(),slug:'',version:0,action:'upload',content:{jpegBase64:image}});
 const req=Object.assign(Readable.from([Buffer.from(b)]),{url:'/api/v2/account/control/content',method:'POST',headers,rawHeaders:Object.entries(headers).flat()});let status,raw,replyHeaders;
 const count=connections;
 // Не подменяем fetch/transport: проверяется настоящий default production handler.
 await createAccountControlHandler({env})(req,{writeHead(s,h){status=s;replyHeaders=h},end(b){raw=b}});
 assert.ok(connections-count<=1,'NO_TRANSPORT_RETRY');assert.equal(replyHeaders['cache-control'],'no-store');assert.equal(replyHeaders.vary,'*');assert.equal(replyHeaders['set-cookie'],undefined);assert.ok(!raw.includes(localKey));assert.ok(!raw.includes(f.owner.secret));
 if(account!=='synthetic-photo-transport-no-account')assert.equal(Object.keys(replyHeaders).some(k=>k.startsWith('x-nexus-wire-')),false);
 return {status,body:JSON.parse(raw),headers:replyHeaders};
}
const goodOptions=body=>({method:'POST',credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(2000),headers:{accept:'application/json','content-type':'application/json','x-nexus-service-timestamp':String(Date.now()),'x-nexus-service-nonce':'0'.repeat(32),'x-nexus-service-signature':'0'.repeat(64)},body});
const outcome=(r,status,code)=>{assert.equal(r.status,status);assert.equal(r.body.error?.code,code)};
try{
 await check('actual TLS socket enforces 1024-byte send fragment without changing payload',async()=>{mode='echo';const n=fragmentCalls,r=await requestMediaHTTP2(WORKER_ORIGIN+'/api/v2/account/internal/control',goodOptions('x'.repeat(65536)));await new Response(r.body).text();assert.equal(fragmentCalls,n+1);assert.equal(lastBody.length,65536)});
 await check('TLS fragment setting failure is fail closed before HTTP request without fallback',async()=>{mode='fragment-setting-fails';const n=requests,c=connections;await assert.rejects(requestMediaHTTP2(WORKER_ORIGIN+'/api/v2/account/internal/control',goodOptions('{}')));assert.equal(requests,n);assert.equal(connections,c+1)});
 await check('abort during paced upload closes sessions and pending timers',async()=>{mode='echo';const controller=new AbortController(),p=requestMediaHTTP2(WORKER_ORIGIN+'/api/v2/account/internal/control',{...goodOptions('x'.repeat(127597)),signal:controller.signal});setTimeout(()=>controller.abort(),30);await assert.rejects(p);await new Promise(r=>setTimeout(r,50));assert.equal(sessions.size,0)});
 await check('synthetic invalid session receives numeric wire counters over real TLS/HTTP2 without auth bypass',async()=>{mode='good';const r=await invoke({image:images.get(1280),cookie:'nxs_SYNTHETIC_NOT_A_SESSION_'+'X'.repeat(32),account:'synthetic-photo-transport-no-account'});outcome(r,401,'SESSION_REQUIRED');assert.equal(r.headers['x-nexus-wire-v'],'1');assert.equal(r.headers['x-nexus-wire-tcp'],'1');assert.equal(r.headers['x-nexus-wire-tls'],'1');assert.ok(Number(r.headers['x-nexus-wire-written'])>90000);assert.ok(Object.entries(r.headers).filter(([k])=>k.startsWith('x-nexus-wire-')).every(([,v])=>/^\d+$/.test(v)))});
 await check('real HTTP2 response timeout captures counters before socket destruction without retry',async()=>{mode='no-headers';const n=connections;await assert.rejects(requestMediaHTTP2(WORKER_ORIGIN+'/api/v2/account/internal/control',{...goodOptions('x'.repeat(127597)),captureWire:true,signal:AbortSignal.timeout(600)}),e=>{assert.equal(e.nexusPhase,'response');assert.equal(e.nexusWire.tcp,1);assert.equal(e.nexusWire.tls,1);assert.equal(e.nexusWire.finished,1);assert.ok(e.nexusWire.written>=127597);assert.ok(Object.values(e.nexusWire).every(Number.isSafeInteger));return true});assert.equal(connections,n+1)});
 for(const size of [16,256,1280])await check('default BFF sends '+size+'px once over verified TLS/HTTP2 and commits D1',async()=>{mode='good';const r=await invoke({image:images.get(size)});outcome(r,200);assert.equal(r.body.media.width,size);assert.equal(lastProtocol,'h2');assert.equal(lastBody.length,lastContentLength);assert.ok(!lastBody.includes(Buffer.from(f.owner.secret)))});
 await check('large HTTP2 photo bytes are persisted and hash-bound',async()=>{const row=f.db.prepare('SELECT id,jpeg_base64,width,height FROM nexus_content_media WHERE width=1280').get();assert.equal(hash(Buffer.from(row.jpeg_base64,'base64')),row.id);assert.equal(row.height,1280)});
 await check('large HTTP2 missing session cannot upload',async()=>{mode='good';outcome(await invoke({image:images.get(1280),cookie:'nxs_'+'X'.repeat(43)}),401,'SESSION_REQUIRED')});
 await check('large HTTP2 account switch cannot upload',async()=>outcome(await invoke({image:images.get(1280),account:'synthetic-other-account'}),401,'ACCOUNT_SESSION_CHANGED'));
 await check('large HTTP2 stale key remains rejected',async()=>{f.db.prepare('UPDATE account_sessions SET created_at=? WHERE id=?').run(new Date(Date.now()-600000).toISOString(),f.owner.session);outcome(await invoke({image:images.get(1280)}),401,'ADMIN_FRESH_PASSKEY_REQUIRED');f.db.prepare('UPDATE account_sessions SET created_at=? WHERE id=?').run(new Date().toISOString(),f.owner.session)});
 for(const [scenario,status,code] of [['redirect',502,'REDIRECT_REJECTED'],['cookie',502,'COOKIE_REJECTED'],['cache',502,'CACHE_REJECTED'],['vary',502,'VARY_REJECTED'],['encoding',502,'ENCODING_REJECTED'],['mime',502,'MIME_REJECTED'],['trailers',502,'BODY_READ_FAILED'],['oversized',413,'INPUT_TOO_LARGE'],['invalid-utf8',400,'INVALID_INPUT'],['invalid-dto',502,'DTO_REJECTED'],['http-503',503,'HTTP_503'],['duplicate-cache',502,'NETWORK_FAILED'],['info-cookie',502,'NETWORK_FAILED'],['rst',502,'NETWORK_FAILED'],['goaway',502,'NETWORK_FAILED'],['dns',502,'DNS_FAILED'],['untrusted',502,'TLS_REJECTED']])await check('HTTP2 '+scenario+' is rejected once without disclosure',async()=>{mode=scenario;const expected=['INPUT_TOO_LARGE','INVALID_INPUT'].includes(code)?code:'BLOG_MEDIA_UPSTREAM_'+code;outcome(await invoke(),status,expected)});
 for(const [scenario,code]of [['tls-timeout','TLS_TIMEOUT'],['no-headers','RESPONSE_TIMEOUT'],['body-timeout','BODY_TIMEOUT']])await check('HTTP2 '+scenario+' respects unchanged 12-second whole deadline',async()=>{mode=scenario;const start=performance.now();outcome(await invoke(),502,'BLOG_MEDIA_UPSTREAM_'+code);assert.ok(performance.now()-start>=11000&&performance.now()-start<14500)});
 await check('TLS peer without HTTP2 is rejected without fallback',async()=>{mode='h1';const count=connections;const r=await invoke();assert.equal(r.status,502);assert.equal(connections,count+1)});
 for(const size of [1,65535,65536,262144])await check('actual HTTP2 flow control preserves '+size+' exact UTF8 bytes',async()=>{mode='echo';const b='x'.repeat(size),r=await requestMediaHTTP2(WORKER_ORIGIN+'/api/v2/account/internal/control',goodOptions(b));await new Response(r.body).text();assert.equal(lastBody.length,size);assert.equal(hash(lastBody),hash(b));assert.equal(lastProtocol,'h2')});
 await check('25 immediate cancellations with late data leave no open sessions or crash',async()=>{mode='late-cancel';for(let i=0;i<25;i++){const r=await requestMediaHTTP2(WORKER_ORIGIN+'/api/v2/account/internal/control',goodOptions('{}'));await r.body.cancel()}await new Promise(r=>setTimeout(r,30));assert.equal(sessions.size,0)});
 for(const change of [o=>o.method='GET',o=>o.redirect='follow',o=>o.credentials='include',o=>o.body='x'.repeat(262145),o=>o.headers.cookie='SYNTHETIC_FORBIDDEN',o=>o.headers['x-nexus-service-signature']='invalid'])await check('invalid HTTP2 input cannot create connection',async()=>{mode='echo';const o=goodOptions('{}');change(o);const count=connections;await assert.rejects(requestMediaHTTP2(WORKER_ORIGIN+'/api/v2/account/internal/control',o));assert.equal(connections,count)});
 await check('HTTP2 URL cannot redirect or address another service',async()=>{const count=connections;await assert.rejects(requestMediaHTTP2('https://synthetic.invalid/',goodOptions('{}')));assert.equal(connections,count)});
 await check('large HTTP2 upload recovers after negative cases without losing saved photos',async()=>{mode='good';outcome(await invoke({image:images.get(1280)}),200);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM nexus_content_media').get().n,3)});
 await check('large HTTP2 upload rejects logout/revocation terminally',async()=>{f.db.prepare("UPDATE account_sessions SET status='revoked',revoked_at=? WHERE id=?").run(new Date().toISOString(),f.owner.session);outcome(await invoke({image:images.get(1280)}),401,'SESSION_REQUIRED');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM nexus_content_media').get().n,3)});
}catch(e){failure={phase,name:e.name,code:/^[A-Z0-9_]+$/.test(e.message)?e.message:'LOCAL_ASSERTION_OR_RUNTIME_FAILURE',...(e.code==='ERR_ASSERTION'?{actual:e.actual,expected:e.expected}:{})};console.log(JSON.stringify({status:'FAIL',...failure}));process.exitCode=1}
finally{
 tls.connect=originalConnect;for(const s of sessions)s.destroy();for(const s of sockets)s.destroy();await Promise.all([server,h1,stalled].map(s=>new Promise(resolve=>s.close(resolve))));f.close();
 const out={status:failure?'FAIL':'PASS',records,failure,connections,requests,realCredentials:false,cloudWrites:0,externalNetwork:false,deadlineMs:12000,runtime:process.version};const file=await open(process.env.NEXUS_H2_RESULT,'wx');try{await file.writeFile(JSON.stringify(out,null,2)+'\n');await file.sync()}finally{await file.close()};console.log(JSON.stringify({status:out.status,checks:records.length,failure,connections,requests}));
}
