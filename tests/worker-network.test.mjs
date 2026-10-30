import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import https from 'node:https';import tls from 'node:tls';
import {createWorkerTLSConnector} from '../server-access/bff/worker-tls-connector.mjs';
import {createWorkerDispatcher} from '../server-access/bff/worker-network.mjs';
const {Agent}=createRequire(new URL('../server-access/package.json',import.meta.url))('undici');
const hostname='akronikl-nexus-sync.akronikl.workers.dev',origin='https://'+hostname,options={hostname,protocol:'https:',port:'443'},records=[{address:'104.21.80.135',family:4},{address:'172.67.183.126',family:4}];
class Socket extends EventEmitter{authorized=true;alpnProtocol='http/1.1';destroyed=false;setNoDelay(){}destroy(){if(!this.destroyed){this.destroyed=true;queueMicrotask(()=>this.emit('close'));}}getPeerCertificate(){return{subjectaltname:'DNS:'+hostname};}}
const tick=()=>new Promise(r=>setImmediate(r));
test('only one verified TLS socket is handed off; losing handshakes and late events are discarded',async()=>{
 const sockets=[],calls=[];const connect=createWorkerTLSConnector({lookup:async()=>records,staggerMs:2,timeoutMs:100,connect:opts=>{assert.equal(opts.servername,hostname);assert.equal(opts.rejectUnauthorized,true);assert.equal(opts.ecdhCurve,'X25519:P-256');const s=new Socket();sockets.push(s);if(sockets.length===2)queueMicrotask(()=>s.emit('secureConnect'));return s;}});
 await new Promise((resolve,reject)=>connect(options,(err,s)=>{calls.push(s);err?reject(err):resolve();}));assert.equal(calls.length,1);assert.equal(calls[0],sockets[1]);assert.equal(sockets[0].destroyed,true);assert.equal(sockets[1].destroyed,false);sockets[0].emit('secureConnect');await tick();assert.equal(calls.length,1);sockets[1].destroy();
});
test('wrong origin, private DNS, invalid certificates and deadlines fail closed before HTTP',async()=>{
 let lookups=0;const denied=createWorkerTLSConnector({lookup:async()=>{lookups++;return records;}});for(const opts of [{...options,hostname:'other.invalid'},{...options,protocol:'http:'},{...options,port:'444'},{...options,servername:'other.invalid'}])await new Promise(resolve=>denied(opts,(err,s)=>{assert.ok(err);assert.equal(s,null);resolve();}));assert.equal(lookups,0);
 const blocked=createWorkerTLSConnector({lookup:async()=>[{address:'127.0.0.1',family:4},{address:'10.0.0.1',family:4}],connect:()=>{throw Error('private transfer')}});await new Promise(resolve=>blocked(options,(err,s)=>{assert.equal(err.code,'NEXUS_WORKER_DNS_REJECTED');assert.equal(s,null);resolve();}));
 for(const variant of ['unauthorized','wrong-san','timeout']){let socket;const connector=createWorkerTLSConnector({lookup:async()=>records.slice(0,1),timeoutMs:10,connect:()=>{socket=new Socket();if(variant==='unauthorized')socket.authorized=false;if(variant==='wrong-san')socket.getPeerCertificate=()=>({subjectaltname:'DNS:other.invalid'});if(variant!=='timeout')queueMicrotask(()=>socket.emit('secureConnect'));return socket;}});await new Promise(resolve=>connector(options,(err,s)=>{assert.ok(err);assert.equal(s,null);assert.equal(socket.destroyed,true);resolve();}));}
});
test('dispatcher routes exactly the Worker origin and preserves other provider options unchanged',()=>{
 const seen=[],fallback={dispatch:(o,h)=>seen.push(['default',o,h])},worker={dispatch:(o,h)=>seen.push(['worker',o,h])},dispatcher=createWorkerDispatcher({fallback,worker}),handler={};
 for(const o of [{origin},{origin:new URL(origin)},{origin:origin+'.evil.invalid'},{origin:'https://api.openai.com'},{origin:'https://user@'+hostname},{origin:origin+'/path'}])dispatcher.dispatch(o,handler);
 assert.deepEqual(seen.map(r=>r[0]),['worker','worker','default','default','default','default']);assert.ok(seen.every(r=>r[2]===handler));
});
test('real native fetch sends a POST once after the winning TLS and never replays a lost response',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'nexus-worker-tls-')),key=path.join(dir,'test.key'),cert=path.join(dir,'test.crt');let server,agent;
 try{
  execFileSync(process.env.NEXUS_OPENSSL??(process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl'),['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-subj','/CN='+hostname,'-addext','subjectAltName=DNS:'+hostname,'-days','1'],{windowsHide:true,stdio:'ignore'});
  const ca=await readFile(cert),received=[];let loseResponse=false;server=https.createServer({key:await readFile(key),cert:ca},(req,res)=>{const parts=[];req.on('data',p=>parts.push(p));req.on('end',()=>{received.push({method:req.method,path:req.url,body:Buffer.concat(parts).toString()});if(loseResponse){req.socket.destroy();return;}res.writeHead(200,{'content-type':'application/json'});res.end('{"ok":true}');});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let attempts=0;const connector=createWorkerTLSConnector({lookup:async()=>records,staggerMs:5,connect:opts=>{attempts++;return opts.host===records[0].address?new Socket():tls.connect({...opts,host:'127.0.0.1',port:server.address().port,ca});}});agent=new Agent({connect:connector,connections:1,pipelining:1});
  const body='{"challengeId":"synthetic-only"}';const result=await fetch(origin+'/once',{method:'POST',body,dispatcher:agent,signal:AbortSignal.timeout(3000)});assert.equal((await result.json()).ok,true);assert.equal(attempts,2);assert.deepEqual(received,[{method:'POST',path:'/once',body}]);
  loseResponse=true;await assert.rejects(fetch(origin+'/lost',{method:'POST',body,dispatcher:agent,signal:AbortSignal.timeout(3000)}));await new Promise(r=>setTimeout(r,50));assert.equal(received.length,2);assert.deepEqual(received[1],{method:'POST',path:'/lost',body});
  loseResponse=false;const abort=new AbortController(),cancelled=fetch(origin+'/cancelled',{method:'POST',body,dispatcher:agent,signal:abort.signal});abort.abort();await assert.rejects(cancelled,{name:'AbortError'});await new Promise(r=>setTimeout(r,30));assert.equal(received.length,2);
 }finally{await agent?.destroy();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}assert.equal(path.dirname(dir),path.resolve(tmpdir()));assert.ok(path.basename(dir).startsWith('nexus-worker-tls-'));await rm(dir,{recursive:true,force:true});}
});
