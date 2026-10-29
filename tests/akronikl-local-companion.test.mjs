import test from 'node:test';import assert from 'node:assert/strict';
import http from 'node:http';
import {startLocalVoiceCompanion} from '../tools/qa-akronikl/local-voice-companion.mjs';import {localVoiceClient} from '../akronikl/experience/local-voice-client.js';
const origin='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net',code='12345678';
const syntheticWav=()=>{const b=Buffer.alloc(48);b.write('RIFF');b.write('WAVE',8);return b;};
test('loopback companion pairs explicitly, enforces origin/token/account, exposes no token in its portal',async()=>{
 const requests=[],s=await startLocalVoiceCompanion({port:0,initialCode:code,speech:{warmup:async()=>{},status:()=>({ready:true}),async synthesize(text){requests.push(text);return {audio:syntheticWav()};}}});
 const call=(path,{body,token,account='account-A',from=origin}={})=>fetch(s.endpoint+path,{method:body?'POST':'GET',headers:{origin:from,...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token,'x-nexus-account-expectation':account}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try{
  assert.equal((await call('/',{})).status,403);const portal=await fetch(s.endpoint+'/');assert.equal(portal.status,200);assert.match(portal.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.equal((await call('/pair',{from:'https://attacker.invalid',body:{code,accountId:'account-A'}})).status,403);
  const paired=await call('/pair',{body:{code,accountId:'account-A'}}),a=await paired.json();assert.equal(paired.status,200);assert.match(a.token,/^[A-Za-z0-9_-]{43}$/);assert.equal((await call('/speech',{body:{text:'A'},token:a.token,account:'account-B'})).status,401);assert.equal(requests.length,0);
  assert.equal((await call('/speech',{body:{text:'A'},token:a.token,from:'https://attacker.invalid'})).status,403);const audio=await call('/speech',{body:{text:'SYNTHETIC_TRANSPORT_ONLY'},token:a.token});assert.equal(audio.status,200);assert.equal(Buffer.from(await audio.arrayBuffer()).toString('utf8',0,4),'RIFF');assert.equal(requests.length,1);
  const next=await(await fetch(s.endpoint+'/')).text();assert.equal(next.includes(a.token),false);assert.equal((await call('/pair',{body:{code,accountId:'account-B'}})).status,401);
  assert.equal((await call('/unpair',{body:{},token:a.token})).status,200);assert.equal((await call('/ready',{token:a.token})).status,401);
 }finally{await s.close();}
});
test('unpair aborts only its account job and a late result cannot play as another account',async()=>{
 let entered,finish;const started=new Promise(r=>entered=r),s=await startLocalVoiceCompanion({port:0,initialCode:code,speech:{status:()=>({ready:true}),synthesize(text,{signal}){entered();return new Promise((resolve,reject)=>{finish=()=>resolve({audio:syntheticWav()});signal.addEventListener('abort',()=>reject(Error('SPEECH_CANCELLED')),{once:true});});}}});
 try{const r=await fetch(s.endpoint+'/pair',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({code,accountId:'account-A'})}),{token}=await r.json(),headers={origin,'content-type':'application/json',authorization:'Bearer '+token,'x-nexus-account-expectation':'account-A'};
  const task=fetch(s.endpoint+'/speech',{method:'POST',headers,body:JSON.stringify({text:'SYNTHETIC_PENDING'})});await started;assert.equal((await fetch(s.endpoint+'/speech',{method:'POST',headers,body:JSON.stringify({text:'SECOND'})})).status,429);assert.equal((await fetch(s.endpoint+'/unpair',{method:'POST',headers,body:'{}'})).status,200);const cancelled=await task;assert.equal(cancelled.status,502);assert.equal((await cancelled.json()).code,'SPEECH_CANCELLED');finish();assert.equal(s.status().pairedAccounts,0);
 }finally{await s.close();}
});
test('browser local client sends only its pairing code to loopback, retains it only in memory and revokes on logout',async()=>{
 let identity={accountId:'account-A'};const win=new EventTarget(),calls=[];win.localStorage={setItem(){throw Error('MUST_NOT_STORE_TOKEN')}};const fetchResource=async(url,init)=>{calls.push({url,init});return Response.json(url.endsWith('/pair')?{paired:true,token:'T'.repeat(43),voice:{voiceURI:'uyut7:narrator'}}:url.endsWith('/ready')?{paired:true,voice:{voiceURI:'uyut7:narrator'}}:{unpaired:true});};
 const c=localVoiceClient({readIdentity:()=>identity,windowRef:win,fetchResource});await c.pair(code);assert.equal(c.isPaired(),true);assert.equal(c,localVoiceClient({readIdentity:()=>identity,windowRef:win,fetchResource}));assert.ok(calls.every(x=>x.url.startsWith('http://127.0.0.1:18791/')));assert.equal(calls[0].init.credentials,'omit');assert.equal(calls[0].init.headers.authorization,undefined);identity={accountId:'account-B'};assert.equal(c.isPaired(),false);await assert.rejects(c.pair(code),/SPEECH_LOCAL_PAIR_REQUIRED/);win.dispatchEvent(new Event('nexus:session-ended'));assert.equal(calls.at(-1).url.endsWith('/unpair'),true);assert.equal(calls.at(-1).init.headers['x-nexus-account-expectation'],'account-A');
});

test('unpair during a streaming body prevents a later GPU start',async()=>{
 let readStarted,release,calls=0;const reading=new Promise(r=>readStarted=r),native=http.createServer;
 http.createServer=(options,handler)=>native(options,(req,res)=>{if(req.url==='/speech')req.once('data',readStarted);void handler(req,res);});let s;try{s=await startLocalVoiceCompanion({port:0,initialCode:code,speech:{synthesize:async()=>{calls++;return {audio:syntheticWav()}}}});}finally{http.createServer=native;}
 try{const p=await fetch(s.endpoint+'/pair',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({code,accountId:'account-A'})}),{token}=await p.json(),headers={origin,'content-type':'application/json',authorization:'Bearer '+token,'x-nexus-account-expectation':'account-A'};
 const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{"text":"'));release=()=>{controller.enqueue(new TextEncoder().encode('SYNTHETIC_LATE"}'));controller.close();};}}),task=fetch(s.endpoint+'/speech',{method:'POST',headers,body:stream,duplex:'half'});await reading;assert.equal((await fetch(s.endpoint+'/unpair',{method:'POST',headers,body:'{}'})).status,200);release();const r=await task;assert.equal(r.status,401);assert.equal(calls,0);
 }finally{await s.close();}
});

test('a late pairing response after logout is revoked; failed confirmation does not become paired',async()=>{
 const win=new EventTarget(),identity={accountId:'account-A'},calls=[];let release,entered;const reading=new Promise(r=>entered=r),token='L'.repeat(43);
 const c=localVoiceClient({readIdentity:()=>identity,windowRef:win,fetchResource:async(url,init)=>{calls.push({url,init});if(url.endsWith('/pair'))return new Response(new ReadableStream({pull(controller){entered();return new Promise(resolve=>release=()=>{controller.enqueue(new TextEncoder().encode(JSON.stringify({paired:true,token,voice:{voiceURI:'uyut7:narrator'}})));controller.close();resolve();});}}),{headers:{'content-type':'application/json'}});return Response.json({unpaired:true});}});
 const task=c.pair(code),rejected=assert.rejects(task,/SPEECH_LOCAL_PAIR_REQUIRED/);await reading;c.dispose();release();await rejected;assert.equal(c.isPaired(),false);assert.ok(calls.some(r=>r.url.endsWith('/unpair')&&r.init.headers.authorization==='Bearer '+token));
 const id={accountId:'account-C'},otherCalls=[];const d=localVoiceClient({readIdentity:()=>id,windowRef:new EventTarget(),fetchResource:async(url,init)=>{otherCalls.push({url,init});return Response.json(url.endsWith('/pair')?{paired:true,token:'F'.repeat(43),voice:{voiceURI:'uyut7:narrator'}}:{paired:false});}});await assert.rejects(d.pair(code),/SPEECH_UNAVAILABLE/);assert.equal(d.isPaired(),false);assert.ok(otherCalls.some(x=>x.url.endsWith('/unpair')));d.dispose();
});
