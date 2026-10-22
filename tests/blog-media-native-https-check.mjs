// Native HTTPS: фиксированный адрес, framing, backpressure, стадии и отсутствие повторов.
import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {requestMediaHTTPS} from '../server-access/bff/media-https.mjs';
import {WORKER_ORIGIN} from '../server-access/bff/account-read.mjs';
const url=WORKER_ORIGIN+'/api/v2/account/internal/control',original=https.request;
const options=signal=>({method:'POST',credentials:'omit',cache:'no-store',redirect:'error',signal,headers:{accept:'application/json','content-type':'application/json','x-nexus-service-timestamp':'1700000000000','x-nexus-service-nonce':'a'.repeat(32),'x-nexus-service-signature':'b'.repeat(64)},body:JSON.stringify({synthetic:'Проверка','padding':'x'.repeat(120000)})});
const rows=[];let mode='good',calls=0,last,chunks,ended;
function install(){https.request=(opts,receive)=>{
 calls++;last=opts;chunks=[];ended=0;
 const req=new EventEmitter();req.destroyed=false;
 const aborted=()=>req.destroy(Object.assign(Error('SYNTHETIC_PRIVATE_ERROR_TEXT'),{code:'ABORT_ERR',privateValue:'SYNTHETIC_PRIVATE_ERROR_TEXT'}));
 opts.signal.addEventListener('abort',aborted,{once:true});
 req.destroy=error=>{if(req.destroyed)return;req.destroyed=true;opts.signal.removeEventListener('abort',aborted);queueMicrotask(()=>{if(error)req.emit('error',error);req.emit('close')})};
 req.write=chunk=>{chunks.push(Buffer.from(chunk));if(mode==='upload')return false;if(mode==='backpressure'){queueMicrotask(()=>req.emit('drain'));return false}return true};
 req.end=()=>{ended++;req.emit('finish');if(['dns','tcp','tls','response','upload','dns-failure','tls-failure'].includes(mode))return;
  queueMicrotask(()=>{
   const res=new PassThrough();res.statusCode=mode==='redirect'?302:200;res.rawHeaders=['content-type','application/json','cache-control','no-store','vary','*'];res.rawTrailers=mode==='trailers'?['x-unexpected','SYNTHETIC_PRIVATE_ERROR_TEXT']:[];
   if(mode==='encoding')res.rawHeaders.push('content-encoding','gzip');
   receive(res);res.end('{"ok":true}');
  })};
 queueMicrotask(()=>{
  const socket=new EventEmitter();req.emit('socket',socket);
  if(mode==='dns-failure'){req.destroy(Object.assign(Error('SYNTHETIC_PRIVATE_ERROR_TEXT'),{code:'ENOTFOUND'}));return}
  if(mode==='dns')return;socket.emit('lookup',null);
  if(mode==='tcp')return;socket.emit('connect');
  if(mode==='tls-failure'){req.destroy(Object.assign(Error('SYNTHETIC_PRIVATE_ERROR_TEXT'),{code:'ERR_TLS_CERT_ALTNAME_INVALID'}));return}
  if(mode==='tls')return;socket.emit('secureConnect');
 });
 return req;
}}
async function check(name,fn){const start=performance.now();await fn();rows.push({name,status:'PASS',durationMs:Math.round(performance.now()-start)});console.log('PASS '+name)}
try{
 install();
 await check('one fixed HTTPS POST preserves exact UTF8 body and signature headers',async()=>{
  mode='good';const o=options(new AbortController().signal),r=await requestMediaHTTPS(url,o);
  assert.equal(calls,1);assert.equal(last.hostname,new URL(WORKER_ORIGIN).hostname);assert.equal(last.path,new URL(url).pathname);assert.equal(last.port,443);assert.equal(last.method,'POST');assert.equal(last.family,4);assert.equal(last.autoSelectFamily,false);assert.equal(last.agent,false);assert.equal(last.rejectUnauthorized,true);assert.equal(last.headers['content-length'],Buffer.byteLength(o.body));assert.equal(last.headers['accept-encoding'],'identity');
  assert.equal(last.headers.cookie,undefined);assert.equal(last.headers.authorization,undefined);assert.equal(last.headers['x-nexus-service-signature'],o.headers['x-nexus-service-signature']);assert.equal(Buffer.concat(chunks).toString(),o.body);assert.ok(chunks.every(c=>c.length<=16384));assert.equal(ended,1);assert.deepEqual(await new Response(r.body).json(),{ok:true});
 });
 await check('backpressure drains every chunk before ending without repeating POST',async()=>{mode='backpressure';const before=calls,o=options(new AbortController().signal),r=await requestMediaHTTPS(url,o);assert.equal(calls-before,1);assert.equal(Buffer.concat(chunks).toString(),o.body);assert.equal(ended,1);assert.deepEqual(await new Response(r.body).json(),{ok:true})});
 for(const stage of ['dns','tcp','tls','upload','response'])await check('abort records '+stage+' stage without exposing native error',async()=>{
  mode=stage;const before=calls,c=new AbortController(),o=options(c.signal),p=requestMediaHTTPS(url,o);setTimeout(()=>c.abort(),5);
  await assert.rejects(p,error=>{assert.equal(error.nexusPhase,stage);assert.equal(error.cause.code,'ABORT_ERR');assert.ok(!JSON.stringify(error).includes('SYNTHETIC_PRIVATE_ERROR_TEXT'));assert.equal(error.message,'MEDIA_TRANSPORT_FAILED');return true});assert.equal(calls-before,1);
 });
 for(const [kind,code]of [['dns-failure','ENOTFOUND'],['tls-failure','ERR_TLS_CERT_ALTNAME_INVALID']])await check(kind+' is rejected once with a safe code',async()=>{mode=kind;const before=calls;await assert.rejects(requestMediaHTTPS(url,options(new AbortController().signal)),e=>e.cause.code===code&&!JSON.stringify(e).includes('SYNTHETIC_PRIVATE_ERROR_TEXT'));assert.equal(calls-before,1)});
 await check('redirect is returned for policy rejection and never followed',async()=>{mode='redirect';const before=calls,r=await requestMediaHTTPS(url,options(new AbortController().signal));assert.equal(r.status,302);await r.body.cancel();assert.equal(calls-before,1)});
 await check('encoded body is flagged before JSON processing',async()=>{mode='encoding';const r=await requestMediaHTTPS(url,options(new AbortController().signal));assert.equal(r.nativeEncodingRejected,true);await r.body.cancel()});
 await check('response trailers fail closed before successful EOF',async()=>{mode='trailers';const r=await requestMediaHTTPS(url,options(new AbortController().signal));await assert.rejects(new Response(r.body).text(),e=>e.code==='NEXUS_MEDIA_TRAILERS');assert.ok(!JSON.stringify(r).includes('SYNTHETIC_PRIVATE_ERROR_TEXT'))});
 await check('immediate cancellation cannot enqueue late data into a closed controller',async()=>{mode='good';const before=calls;for(let i=0;i<25;i++){const r=await requestMediaHTTPS(url,options(new AbortController().signal));await r.body.cancel()}await new Promise(resolve=>setImmediate(resolve));assert.equal(calls-before,25)});
 for(const [name,alter]of [['foreign URL',o=>[url+'?other=1',o]],['Cookie header',o=>[url,{...o,headers:{...o.headers,cookie:'SYNTHETIC_PRIVATE_ERROR_TEXT'}}]],['redirect mode',o=>[url,{...o,redirect:'follow'}]],['missing signal',o=>[url,{...o,signal:null}]],['oversize body',o=>[url,{...o,body:'x'.repeat(262145)}]]])await check(name+' rejected before network',async()=>{const before=calls;await assert.rejects(requestMediaHTTPS(...alter(options(new AbortController().signal))),e=>e.code==='NEXUS_MEDIA_INPUT');assert.equal(calls,before)});
 console.log(JSON.stringify({status:'PASS',checks:rows.length,rows,networkCalls:'mock only',realCredentials:false,cloudWrites:0}));
}finally{https.request=original}
