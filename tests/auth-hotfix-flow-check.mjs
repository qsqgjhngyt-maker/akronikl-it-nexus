// Actual entry handler and client; synthetic DOM/credentials, no external network.
import assert from 'node:assert/strict';
import {bindEntry,ENTRY_ORIGIN} from '../server-access/public/entry.js';
import * as client from '../server-access/public/passkey-client.js';
const saved=new Map(['document','location','history','fetch','navigator','PublicKeyCredential','addEventListener'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
const set=(k,v)=>Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:v});
const account=()=>Response.json({account:{accountId:'synthetic',status:'active',displayName:'Synthetic'},loginMethods:[],enrollmentAvailable:false});
class Element{constructor(){this.dataset={};this.handlers={};this.hidden=true;this.disabled=false;this.textContent=''}setAttribute(k,v){this[k]=v}addEventListener(k,v){this.handlers[k]=v}click(){return this.handlers.click?.({preventDefault(){},button:0})}}
function fixture({proof=true,hint=false,login=async()=>({ok:true}),failLoad=false,failAccount=false,loadWait}={}){
 const nodes=new Map(['login','login-label','status','account','account-name','switch','motion','motion-label'].map(k=>[`[data-${k}]`,new Element()]));let loads=0,logins=0,reads=0;
 const navigations=[],historyChanges=[],diagnostics=[],events=new Map();
 set('location',{origin:ENTRY_ORIGIN,hostname:new URL(ENTRY_ORIGIN).hostname,pathname:'/',hash:hint?'#nexusLogin=oauth':'#view=projects',assign(x){navigations.push(x)},replace(x){navigations.push(x)}});
 set('history',{replaceState(a,b,x){historyChanges.push(x);location.hash=new URL(x,ENTRY_ORIGIN).hash}});
 set('document',{hidden:false,querySelector:s=>nodes.get(s)||null,querySelectorAll:()=>[],addEventListener(){}});set('addEventListener',(type,fn)=>events.set(type,fn));
 set('fetch',async()=>{reads++;if(failAccount)throw Error('synthetic-network-failure');return reads>1&&proof?account():Response.json({error:{code:'SESSION_REQUIRED'}},{status:401})});
 return{nodes,navigations,historyChanges,diagnostics,events,get reads(){return reads},get logins(){return logins},get loads(){return loads},
  bind:()=>bindEntry({onDiagnostic:x=>diagnostics.push(x),loadPasskeyClient:async()=>{loads++;if(failLoad)throw Error('load-failed');if(loadWait)await loadWait;return{message:client.message,login:async options=>{logins++;return login(options)},logout:async()=>({ok:true})}}})};
}
let pass=0,fail=0;const check=async(name,fn)=>{try{await fn();pass++;console.log('PASS '+name)}catch(e){fail++;console.log('FAIL '+name+' ['+e.name+']')}};
try{
 await check('verify 200 without session proof cannot open Nexus or retry session creation',async()=>{const f=fixture({proof:false});await f.bind();await f.nodes.get('[data-login]').click();assert.equal(f.navigations.length,0);assert.equal(f.reads,2);assert.equal(f.logins,1);assert.match(f.nodes.get('[data-status]').textContent,/сесси/i)});
 await check('successful verify requires Account proof, preserves destination and unlocks button',async()=>{const f=fixture();await f.bind();await f.nodes.get('[data-login]').click();assert.equal(f.reads,2);assert.deepEqual(f.navigations,[ENTRY_ORIGIN+'/index.html#view=projects']);assert.equal(f.nodes.get('[data-login]')['aria-busy'],'false')});
 await check('cancel/retry is explicit, no double click or automatic login',async()=>{let reject;const f=fixture({login:()=>new Promise((a,b)=>{reject=b})});await f.bind();const button=f.nodes.get('[data-login]'),attempt=button.click();await Promise.resolve();await Promise.resolve();await button.click();assert.equal(f.logins,1);reject(new DOMException('synthetic-cancel','NotAllowedError'));await attempt;assert.equal(f.navigations.length,0);assert.equal(button['aria-busy'],'false');assert.match(f.nodes.get('[data-status]').textContent,/отменено/)});
 await check('client load failure exposes correct stage and permits retry',async()=>{const f=fixture({failLoad:true});await f.bind();await f.nodes.get('[data-login]').click();assert.equal(f.logins,0);assert.equal(f.navigations.length,0);assert.match(f.nodes.get('[data-status]').textContent,/загрузить/i);await f.nodes.get('[data-login]').click();assert.equal(f.loads,2)});
 await check('OAuth hint consumed even on network failure; no redirect or credential retry',async()=>{const f=fixture({hint:true,failAccount:true});await f.bind();assert.equal(f.navigations.length,0);assert.deepEqual(f.historyChanges,['/#view=home']);assert.equal(f.logins,0)});
 await check('leaving the page during client load never starts a late session operation',async()=>{let resolve;const loadWait=new Promise(r=>{resolve=r});const f=fixture({loadWait});await f.bind();const attempt=f.nodes.get('[data-login]').click();f.events.get('pagehide')();resolve();await attempt;assert.equal(f.logins,0);assert.equal(f.navigations.length,0)});
 for(const phase of ['options','webauthn'])await check('pagehide aborts actual client at '+phase+' before session creation',async()=>{
  const f=fixture({login:client.login});await f.bind();const calls=[];let resolve,enteredResolve,heldSignal;
  const entered=new Promise(r=>{enteredResolve=r}),held=new Promise(r=>{resolve=r});
  set('PublicKeyCredential',{});set('navigator',{credentials:{async get({signal}){calls.push('webauthn');if(phase==='webauthn'){heldSignal=signal;enteredResolve();await held}return{toJSON:()=>({id:'synthetic',response:{}})}}}});
  set('fetch',async(url,init)=>{calls.push(url);if(url.endsWith('/options')){if(phase==='options'){heldSignal=init.signal;enteredResolve();await held}return Response.json({challengeId:'synthetic',options:{challenge:'AQID',rpId:new URL(ENTRY_ORIGIN).hostname,userVerification:'required'}})}return Response.json({ok:true})});
  const pending=f.nodes.get('[data-login]').click();await entered;f.events.get('pagehide')();resolve();await pending;
  assert.equal(heldSignal?.aborted,true);assert.equal(calls.some(x=>x.endsWith('/verify')),false);assert.equal(f.navigations.length,0);
  if(phase==='options')assert.equal(calls.includes('webauthn'),false);
 });
 for(const oldOutcome of ['resolve','reject'])await check('stale Passkey '+oldOutcome+' cannot unlock or change a new attempt',async()=>{
  let finishOld,failOld,finishNew;const old=new Promise((r,j)=>{finishOld=r;failOld=j}),next=new Promise(r=>{finishNew=r});let attemptCount=0;
  const f=fixture({login:()=>++attemptCount===1?old:next});await f.bind();const button=f.nodes.get('[data-login]'),first=button.click();
  while(f.logins<1)await Promise.resolve();f.events.get('pagehide')();f.events.get('pageshow')?.({persisted:true});const second=button.click();for(let i=0;i<10;i++)await Promise.resolve();
  if(f.logins!==2){finishOld({ok:true});finishNew({ok:true});await first;await second;assert.equal(f.logins,2)}const text=f.nodes.get('[data-status]').textContent;
  if(oldOutcome==='resolve')finishOld({ok:true});else failOld(Error('synthetic-old-failure'));await first;
  assert.equal(button['aria-busy'],'true');assert.equal(f.nodes.get('[data-status]').textContent,text);assert.equal(f.navigations.length,0);finishNew({ok:true});await second;assert.equal(f.navigations.length,1);
 });
 // Independent real client execution, including WebAuthn byte parsing and transport calls.
 set('document',undefined);set('location',{origin:ENTRY_ORIGIN,hostname:new URL(ENTRY_ORIGIN).hostname});set('PublicKeyCredential',{});
 const options={challengeId:'synthetic-challenge',options:{challenge:'AQID',rpId:new URL(ENTRY_ORIGIN).hostname,userVerification:'required',timeout:120000}};
 const credential={toJSON:()=>({id:'synthetic',response:{clientDataJSON:'AQID',authenticatorData:'AQID',signature:'AQID',userHandle:'AQID'}})};
 for(const scenario of ['success','options-denied','cancel','verify-denied','invalid-verify','network-verify'])await check('client stages/no retry: '+scenario,async()=>{
  const calls=[],events=[];let ceremonies=0;set('navigator',{credentials:{async get({publicKey}){ceremonies++;assert.ok(publicKey.challenge instanceof Uint8Array);assert.equal(publicKey.userVerification,'required');if(scenario==='cancel')throw new DOMException('synthetic','NotAllowedError');return credential}}});
  set('fetch',async(url,init)=>{calls.push(url);assert.equal(init.credentials,'same-origin');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.ok(init.signal instanceof AbortSignal);if(url.endsWith('/options'))return scenario==='options-denied'?Response.json({error:{code:'INGRESS_REJECTED'}},{status:401}):Response.json(options);if(scenario==='network-verify')throw Error('synthetic-network');return scenario==='verify-denied'?Response.json({error:{code:'CHALLENGE_REJECTED'}},{status:401}):Response.json(scenario==='invalid-verify'?{ok:true,sessionSecret:'SYNTHETIC_NOT_FOR_JS'}:{ok:true})});
  const p=client.login({onStage:e=>events.push(e)});if(scenario==='success')assert.deepEqual(await p,{ok:true});else await assert.rejects(p);
  assert.equal(calls.length,scenario==='options-denied'||scenario==='cancel'?1:2);assert.equal(ceremonies,scenario==='options-denied'?0:1);
  assert.ok(events.some(e=>e.stage==='options'));for(const e of events){assert.ok(['options','webauthn','verify'].includes(e.stage));assert.ok(Object.keys(e).every(k=>['stage','state','durationMs'].includes(k)));if(e.state!=='start')assert.ok(Number.isFinite(e.durationMs)&&e.durationMs>=0)}
 });
 console.log(JSON.stringify({pass,fail,externalRequests:0,realCredentials:false}));process.exitCode=fail?1:0;
}finally{for(const[k,d]of saved){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k]}}
