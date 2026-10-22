// Настоящий bindEntry с синтетическим DOM и Passkey-client stub; никакой церемонии/сети.
import assert from 'node:assert/strict';
import {ENTRY_ORIGIN,fullDocumentDestinationFor,navigateToNexus,bindEntry} from '../server-access/public/entry.js';
const saved=new Map(['location','document','fetch','addEventListener','history'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
class Node{
 constructor(){this.handlers=new Map();this.attributes=new Map();this.dataset={};this.hidden=true;this.disabled=false;this.textContent='';this.href=''}
 setAttribute(name,value){this.attributes.set(name,String(value))}
 addEventListener(type,callback){this.handlers.set(type,callback)}
 async click(options={}){let prevented=false;const event={button:0,preventDefault(){prevented=true},...options};await this.handlers.get('click')?.(event);return prevented}
}
function fixture({pathname='/',hash='#view=home',signedIn=true}={}){
 const nodes=new Map(['[data-login]','[data-login-label]','[data-status]','[data-account]','[data-account-name]','[data-switch]','[data-motion]','[data-motion-label]'].map(selector=>[selector,new Node()]));
 const navigations=[],windowEvents=[],documentEvents=[],requests=[],historyChanges=[];let passkeyLoads=0,logins=0;
 const locationRef={origin:ENTRY_ORIGIN,pathname,hash,search:'',href:ENTRY_ORIGIN+pathname+hash,
  assign(target){const next=new URL(target);navigations.push({target,sameDocument:next.origin===this.origin&&next.pathname===this.pathname&&next.search===this.search})},replace(){throw Error('Unexpected replace')}};
 globalThis.location=locationRef;
 globalThis.history={replaceState(_state,_title,target){const url=new URL(target,ENTRY_ORIGIN);historyChanges.push(url.href);locationRef.pathname=url.pathname;locationRef.search=url.search;locationRef.hash=url.hash}};
 globalThis.document={hidden:false,querySelector:selector=>nodes.get(selector)||null,querySelectorAll:selector=>{assert.equal(selector,'[data-key-access]');return[]},addEventListener(type,callback){documentEvents.push({type,callback})}};
 globalThis.addEventListener=(type,callback)=>windowEvents.push({type,callback});
 globalThis.fetch=async(path,options)=>{
  requests.push({path,options});assert.equal(path,'/api/v2/account');assert.equal(options.credentials,'same-origin');
  return signedIn||logins>0?Response.json({account:{accountId:'synthetic-account',displayName:'Synthetic',status:'active'},loginMethods:[],enrollmentAvailable:false}):Response.json({error:{code:'SESSION_REQUIRED'}},{status:401});
 };
 return{nodes,navigations,locationRef,requests,historyChanges,get passkeyLoads(){return passkeyLoads},get logins(){return logins},
  async bind(){await bindEntry({loadPasskeyClient:async()=>{passkeyLoads++;return{async login(){logins++;return{ok:true}}}}})}
 };
}
const safeParams=hash=>new URLSearchParams(hash.slice(1));
let tests=0;const check=async(name,fn)=>{await fn();tests++;console.log('PASS '+name)};
try{
 await check('same root path/hash всегда меняет document path и не добавляет query',async()=>{
  for(const pathname of ['/','/index.html','/account/entry/','/account/entry'])for(const hash of ['#view=home','#view=account&tab=security','#course=cpp&lesson=cpp.first-cpp-program','#view=project-studio&project='+encodeURIComponent('сцена-1')]){
   const current={origin:ENTRY_ORIGIN,pathname,hash},target=new URL(fullDocumentDestinationFor(hash,current));
   assert.equal(target.origin,ENTRY_ORIGIN);assert.notEqual(target.pathname,pathname);assert.ok(['/','/index.html'].includes(target.pathname));assert.equal(target.search,'');
   assert.equal(safeParams(target.hash).get('course'),safeParams(hash).get('course'));assert.equal(safeParams(target.hash).get('project'),safeParams(hash).get('project'));
  }
 });
 await check('Code Studio deep link keeps project after proof; unsafe destination fields are discarded',async()=>{
  const hash='#view=code-studio&project=synthetic-studio&next=https://attacker.invalid&token=synthetic';const f=fixture({hash});await f.bind();await f.nodes.get('[data-login]').click();const target=new URL(f.navigations[0].target);assert.equal(target.hash,'#view=code-studio&project=synthetic-studio');assert.equal(target.origin,ENTRY_ORIGIN);assert.equal(target.search,'');
 });
 await check('signed-in Continue с /#view=home вызывает полный GET через /index.html',async()=>{
  const f=fixture();await f.bind();const login=f.nodes.get('[data-login]');assert.equal(f.nodes.get('[data-login-label]').textContent,'Продолжить в Nexus');assert.equal(login.href,ENTRY_ORIGIN+'/index.html#view=home');
  assert.equal(await login.click(),true);assert.deepEqual(f.navigations,[{target:ENTRY_ORIGIN+'/index.html#view=home',sameDocument:false}]);assert.equal(f.passkeyLoads,0);assert.equal(f.logins,0);
 });
 await check('signed-in /index.html и /account/entry/ возвращаются полным документом к root',async()=>{
  for(const pathname of ['/index.html','/account/entry/']){
   const f=fixture({pathname,hash:'#view=account&tab=security'});await f.bind();assert.equal(await f.nodes.get('[data-login]').click(),true);assert.equal(f.navigations.length,1);assert.equal(f.navigations[0].sameDocument,false);assert.equal(f.navigations[0].target,ENTRY_ORIGIN+'/#view=account&tab=security');
  }
 });
 await check('login success на том же root/hash загружает серверный document gate',async()=>{
  const f=fixture({signedIn:false});await f.bind();assert.equal(await f.nodes.get('[data-login]').click(),true);assert.equal(f.passkeyLoads,1);assert.equal(f.logins,1);assert.deepEqual(f.navigations,[{target:ENTRY_ORIGIN+'/index.html#view=home',sameDocument:false}]);
 });
 await check('hash, изменённый после welcome, сохраняется в Continue и login success',async()=>{
  for(const signedIn of [true,false]){
   const f=fixture({signedIn});await f.bind();f.locationRef.hash='#view=project-studio&project='+encodeURIComponent('проект-галактика');await f.nodes.get('[data-login]').click();
   assert.equal(f.navigations[0].sameDocument,false);assert.equal(safeParams(new URL(f.navigations[0].target).hash).get('project'),'проект-галактика');
  }
 });
 await check('OAuth callback hint после подтверждённой сессии открывает Nexus без второго клика',async()=>{
  const f=fixture({hash:'#nexusLogin=oauth'});await f.bind();
  assert.deepEqual(f.navigations,[{target:ENTRY_ORIGIN+'/index.html#view=home',sameDocument:false}]);
  assert.deepEqual(f.historyChanges,[ENTRY_ORIGIN+'/#view=home']);
  assert.equal(f.passkeyLoads,0);assert.equal(f.logins,0);
 });
 await check('OAuth hint не обходит серверный 401 и не открывает приложение',async()=>{
  const f=fixture({hash:'#nexusLogin=oauth',signedIn:false});await f.bind();
  assert.equal(f.navigations.length,0);assert.deepEqual(f.historyChanges,[ENTRY_ORIGIN+'/#view=home']);
 });
 await check('OAuth link hint сохраняет Security после server proof и удаляет маркер до перехода',async()=>{
  const f=fixture({hash:'#nexusLogin=oauth&view=account&tab=security&next=https://attacker.invalid&token=synthetic'});await f.bind();
  assert.deepEqual(f.navigations,[{target:ENTRY_ORIGIN+'/index.html#view=account&tab=security',sameDocument:false}]);
  assert.deepEqual(f.historyChanges,[ENTRY_ORIGIN+'/#view=account&tab=security']);assert.equal(f.requests.length,1);assert.equal(f.logins,0);
 });
 await check('поддельный link hint без сессии и повторная загрузка не обходят Account gate',async()=>{
  const f=fixture({hash:'#nexusLogin=oauth&view=account&tab=security',signedIn:false});await f.bind();
  assert.equal(f.navigations.length,0);assert.equal(f.locationRef.hash,'#view=account&tab=security');
  await f.bind();assert.equal(f.navigations.length,0);assert.equal(f.logins,0);
 });
 await check('неизвестный fragment или внешний redirect не включает auto-continue',async()=>{
  const f=fixture({hash:'#nexusLogin=other&next=https://attacker.invalid'});await f.bind();
  assert.equal(f.navigations.length,0);assert.equal(f.historyChanges.length,0);
 });
 await check('modified Continue сохраняет native new-tab link с полным document path',async()=>{
  const f=fixture();await f.bind();assert.equal(await f.nodes.get('[data-login]').click({ctrlKey:true}),false);assert.equal(f.navigations.length,0);assert.equal(new URL(f.nodes.get('[data-login]').href).pathname,'/index.html');
 });
 await check('helper не принимает внешний redirect и не переходит к query target',async()=>{
  const calls=[],locationRef={origin:ENTRY_ORIGIN,pathname:'/',assign:value=>calls.push(value)};
  const result=navigateToNexus('#view=home&next=https://attacker.invalid&return=javascript:alert(1)',locationRef);assert.deepEqual(calls,[result]);const target=new URL(result);assert.equal(target.origin,ENTRY_ORIGIN);assert.equal(target.pathname,'/index.html');assert.equal(target.search,'');assert.equal(target.hash,'#view=home');
 });
 console.log(JSON.stringify({status:'PASS',tests,actualEntryHandler:true,networkRequests:0,passkeyCeremonies:0,serversStarted:0,browsersStarted:0,realAccountChanges:0}));
}finally{for(const[key,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}}
