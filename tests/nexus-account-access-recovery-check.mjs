// DOM contract regression in Node: no browser, server, real account or persistent storage.
import assert from 'node:assert/strict';
const gateway='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const prior=new Map(['document','window','location','fetch','localStorage','sessionStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
const checks=[];
const priorAbortStatics=new Map(['any','timeout'].map(key=>[key,Object.getOwnPropertyDescriptor(AbortSignal,key)]));
const dataKey=key=>key.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
class Element extends EventTarget{
 constructor(tag){super();this.tag=tag;this.children=[];this.parent=null;this.attributes={};this.dataset={};this.hidden=false;this.disabled=false;this.isConnected=false;this.text=''}
 connect(value){this.isConnected=value;for(const child of this.children)child.connect(value)}
 append(child){child.parent=this;this.children.push(child);child.connect(this.isConnected)}
 after(child){assert.ok(this.parent);child.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this)+1,0,child);child.connect(this.isConnected)}
 set textContent(value){this.text=String(value);this.children=[]}
 get textContent(){return this.text+this.children.map(child=>child.textContent).join('')}
 set innerHTML(html){
  this.children=[];this.text='';const stack=[this];
  for(const token of html.matchAll(/<\/?([a-z0-9]+)\b([^>]*)>|([^<]+)/gi)){
   if(token[3]){stack.at(-1).text+=token[3];continue}
   if(token[0].startsWith('</')){stack.pop();continue}
   const node=new Element(token[1]);
   for(const attribute of token[2].matchAll(/([a-zA-Z0-9_-]+)(?:="([^"]*)")?/g)){
    const key=attribute[1],value=attribute[2]??'';node.attributes[key]=value;
    if(key==='hidden'||key==='disabled')node[key]=true;
    if(key==='href')node.href=value;
    if(key==='class')node.className=value;
    if(key.startsWith('data-'))node.dataset[dataKey(key.slice(5))]=value;
   }
   stack.at(-1).append(node);stack.push(node);
  }
 }
 matches(selector){if(selector.startsWith('[')){const attr=selector.slice(1,-1);return Object.hasOwn(this.attributes,attr)||attr.startsWith('data-')&&Object.hasOwn(this.dataset,dataKey(attr.slice(5)))}if(selector.startsWith('.'))return(this.className||'').split(' ').includes(selector.slice(1));return this.tag===selector}
 querySelectorAll(selector){
  const parts=selector.split(' '),result=[];
  const visit=node=>{for(const child of node.children){if(child.matches(parts.at(-1))){let ancestor=child.parent,index=parts.length-2;while(index>=0&&ancestor){if(ancestor.matches(parts[index]))index--;ancestor=ancestor.parent}if(index<0)result.push(child)}visit(child)}};
  visit(this);return result;
 }
 querySelector(selector){return this.querySelectorAll(selector)[0]||null}
 click(){if(!this.disabled)this.dispatchEvent(new Event('click'))}
}
class Document extends EventTarget{
 constructor(){super();this.hidden=false;this.root=new Element('main');this.root.attributes['data-nexus-account']='';this.root.innerHTML='<header class="account-page-head"></header><ul class="account-security-list"><li>Passkey / WebAuthn · не подключён</li></ul>';this.root.connect(true)}
 createElement(tag){return new Element(tag)}
 querySelector(selector){return this.root.matches(selector)?this.root:this.root.querySelector(selector)}
}
const json=(body,status=200)=>Response.json(body,{status});
const validAccount={account:{accountId:'synthetic-account',displayName:'Synthetic Akronikl',status:'active'},loginMethods:[{id:'synthetic-method',kind:'passkey',status:'active'}],enrollmentAvailable:false};
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done});return{promise,resolve}};
const settle=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve))};
try{
 for(const key of priorAbortStatics.keys())Object.defineProperty(AbortSignal,key,{value:undefined,configurable:true});
 globalThis.location={origin:gateway};
 const forbiddenStorage=new Proxy({},{get(){throw Error('Account access must not read or write browser storage')}});
 globalThis.localStorage=forbiddenStorage;globalThis.sessionStorage=forbiddenStorage;
 const{bindNexusAccountAccess}=await import('../core/nexus-account-access.js');
 const mount=(fetchImpl,locale='ru')=>{
  const calls=[];globalThis.document=new Document();globalThis.window=new EventTarget();
  globalThis.fetch=(url,options)=>{calls.push({url,options});return fetchImpl(url,options)};
  bindNexusAccountAccess(locale);
  const panel=document.querySelector('[data-nexus-account-access]');
  return{panel,calls,entry:panel.querySelector('[data-access-login]'),logout:panel.querySelector('[data-access-logout]'),refresh:panel.querySelector('[data-access-refresh]'),status:panel.querySelector('[data-access-status]'),name:panel.querySelector('[data-access-name]')};
 };
 const entryVisible=fixture=>{assert.equal(fixture.entry.hidden,false);assert.equal(fixture.entry.href,gateway+'/account/access/')};
 for(const code of ['SESSION_REQUIRED','SESSION_REJECTED']){
  const fixture=mount(async()=>json({error:{code}},401));entryVisible(fixture);assert.equal(fixture.panel.dataset.state,'checking');
  await settle();entryVisible(fixture);assert.equal(fixture.panel.dataset.state,'signed-out');assert.equal(fixture.calls.length,1);assert.equal(fixture.calls[0].url,'/api/v2/account');
  assert.equal(fixture.calls[0].options.credentials,'same-origin');assert.equal(fixture.calls[0].options.cache,'no-store');checks.push('401 '+code+' keeps the fixed login entry');
 }
 const failures=[['non-JSON',()=>new Response('<html>Temporary upstream error</html>',{status:502})],['invalid DTO',()=>json({...validAccount,enrollmentAvailable:true})],['network rejection',()=>Promise.reject(new TypeError('Synthetic network failure'))],['timeout rejection',()=>Promise.reject(new DOMException('Synthetic timeout','TimeoutError'))],['403 remains denial',()=>json({error:{code:'ACCESS_DENIED'}},403)]];
 for(const[label,answer]of failures){
  const fixture=mount(async()=>answer());entryVisible(fixture);await settle();entryVisible(fixture);
  assert.equal(fixture.panel.dataset.state,'unavailable');assert.equal(fixture.name.hidden,true);assert.match(fixture.status.textContent,/Не удалось проверить вход/);assert.ok(!fixture.status.textContent.includes('не подключён'));checks.push(label+' keeps recovery entry without granting identity');
 }
 const english=mount(async()=>{throw Error('Synthetic network failure')},'en');await settle();entryVisible(english);assert.match(english.status.textContent,/Unable to check your session/);checks.push('English connection failure explains session checking');
 const pending=deferred();let attempts=0;const dedup=mount(()=>++attempts===1?pending.promise:Promise.resolve(json({error:{code:'SESSION_REQUIRED'}},401)));entryVisible(dedup);
 for(let i=0;i<5;i++){window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'))}
 assert.equal(dedup.calls.length,1,'Concurrent focus/visibility checks must share one request');pending.resolve(json({error:{code:'SESSION_REQUIRED'}},401));await settle();
 dedup.refresh.click();await settle();assert.equal(dedup.calls.length,2,'A later explicit refresh starts a fresh request');checks.push('Concurrent checks are deduplicated; later refresh still works');
 const logoutPending=deferred();
 const signedIn=mount(async url=>url.endsWith('/logout')?logoutPending.promise:json(validAccount));await settle();entryVisible(signedIn);
 assert.equal(signedIn.panel.dataset.state,'signed-in');assert.equal(signedIn.name.hidden,false);assert.equal(signedIn.name.textContent,'Synthetic Akronikl');assert.equal(signedIn.logout.hidden,false);assert.equal(signedIn.entry.textContent,'Управлять ключами');
 const logoutEvents=[];window.addEventListener('nexus:session-ending',()=>logoutEvents.push('starting'));window.addEventListener('nexus:session-ended',()=>logoutEvents.push('confirmed'));
 signedIn.logout.click();assert.deepEqual(logoutEvents,['starting']);entryVisible(signedIn);window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));assert.equal(signedIn.calls.length,2);
 logoutPending.resolve(json({ok:true}));await settle();assert.deepEqual(logoutEvents,['starting','confirmed']);entryVisible(signedIn);assert.equal(signedIn.panel.dataset.state,'signed-out');assert.equal(signedIn.entry.textContent,'Войти ключом доступа');assert.equal(signedIn.name.hidden,true);assert.equal(signedIn.logout.hidden,true);assert.equal(signedIn.calls.length,2,'Successful logout must not wait for another session probe');
 assert.equal(signedIn.calls[1].options.method,'POST');assert.equal(signedIn.calls[1].options.headers['x-nexus-passkey-write'],'1');checks.push('Validated Account DTO signs in; confirmed logout exposes login immediately with no extra probe');
 const late=deferred();let reads=0;
 const race=mount(async url=>url.endsWith('/logout')?json({ok:true}):++reads===1?json(validAccount):late.promise);await settle();
 window.dispatchEvent(new Event('focus'));assert.equal(race.panel.dataset.state,'checking');const oldSignal=race.calls[1].options.signal;
 race.logout.dispatchEvent(new Event('click'));await settle();assert.equal(oldSignal.aborted,true);assert.equal(race.panel.dataset.state,'signed-out');
 late.resolve(json(validAccount));await settle();assert.equal(race.panel.dataset.state,'signed-out');assert.equal(race.name.hidden,true);entryVisible(race);checks.push('Logout aborts old probe; a late successful response cannot restore signed-in state');
 const nativeSetTimeout=globalThis.setTimeout,nativeClearTimeout=globalThis.clearTimeout;let fireTimeout,timerCleared=false;
 try{
  globalThis.setTimeout=(callback,delay)=>{assert.equal(delay,15000);fireTimeout=callback;return 'synthetic-account-timer'};
  globalThis.clearTimeout=timer=>{assert.equal(timer,'synthetic-account-timer');timerCleared=true};
  const timed=mount((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Synthetic deadline','AbortError')),{once:true})));
  assert.equal(typeof fireTimeout,'function');fireTimeout();await settle();entryVisible(timed);assert.equal(timed.panel.dataset.state,'unavailable');assert.equal(timerCleared,true);checks.push('15-second abort deadline and timer cleanup work without AbortSignal.any/timeout');
 }finally{globalThis.setTimeout=nativeSetTimeout;globalThis.clearTimeout=nativeClearTimeout}
 console.log(JSON.stringify({status:'PASS',checks,realAccounts:0,persistentStorageAccess:0,networkCalls:0,serversStarted:0,browsersStarted:0}));
}finally{
 for(const[key,descriptor]of priorAbortStatics){if(descriptor)Object.defineProperty(AbortSignal,key,descriptor);else delete AbortSignal[key]}
 for(const[key,descriptor]of prior){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
}
