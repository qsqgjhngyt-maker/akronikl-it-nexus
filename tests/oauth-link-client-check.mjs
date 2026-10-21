// Реальный bindProviderButtons, синтетические DOM/fetch и недоступный JS cookie actor.
// Никакой сети, браузера, серверов или provider credentials.
import assert from 'node:assert/strict';
import {bindProviderButtons} from '../server-access/public/oauth-client.js';
const ORIGIN='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const A='synthetic-account-a',B='synthetic-account-b';
const descriptors=new Map(['document','window','location','fetch','addEventListener'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
class Button{
 constructor(){this.dataset={};this.disabled=false;this.handlers=new Map()}
 addEventListener(type,handler){this.handlers.set(type,handler)}
 async click(){await this.handlers.get('click')?.()}
}
class Container{
 constructor(){this.children=[];this.hidden=true}
 append(node){this.children.push(node)}
 querySelector(selector){const id=selector.match(/^\[data-provider="([a-z]+)"\]$/)?.[1];assert.ok(id);return this.children.find(child=>child.dataset.provider===id)||null}
}
function install({providers=[{id:'yandex'}],providerStatus=200,startStatus=200,startBody={authorizationURL:'https://oauth.yandex.ru/authorize?response_type=code&state=synthetic-state'},origin=ORIGIN,startWait,startImpl}={}){
 const calls=[],redirects=[],statuses=[],windowImpl=new EventTarget(),events=new Map();let sessionEnded=0,cookieActor=A;
 globalThis.addEventListener=(name,callback)=>events.set(name,callback);
 windowImpl.addEventListener('nexus:session-ended',()=>sessionEnded++);
 globalThis.window=windowImpl;
 globalThis.location={origin,assign(url){redirects.push(url)}};
 globalThis.document={createElement(type){assert.equal(type,'button');return new Button()}};
 globalThis.fetch=async(path,options)=>{
  calls.push({path,options,cookieActor});
  assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);
  const headers=new Headers(options.headers);assert.equal(headers.has('cookie'),false);assert.equal(headers.has('authorization'),false);
  for(const header of headers.keys())assert.equal(/secret|token|password/i.test(header),false);
  if(path==='/api/v2/account/oauth/providers'){
   assert.equal(options.body,undefined);assert.equal(headers.get('accept'),'application/json');
   return Response.json({providers},{status:providerStatus});
  }
  assert.match(path,/^\/api\/v2\/account\/oauth\/(google|yandex|vk)\/start$/);assert.equal(options.method,'POST');
  assert.equal(headers.get('content-type'),'application/json');assert.equal(headers.get('x-nexus-oauth-request'),'1');
  const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body),['intent']);assert.ok(['login','link'].includes(body.intent));
  if(body.intent==='link'&&headers.get('x-nexus-oauth-account')!==cookieActor)return Response.json({error:{code:'ACCOUNT_SESSION_CHANGED'}},{status:401});
  if(startImpl)return startImpl(path,options);
  if(startWait)await startWait;return Response.json(startBody,{status:startStatus});
 };
 return{calls,redirects,statuses,events,get sessionEnded(){return sessionEnded},setCookieActor(value){cookieActor=value},container:new Container(),onStatus:text=>statuses.push(text)};
}
let tests=0;
const check=async(name,fn)=>{await fn();tests++;console.log('PASS '+name)};
try{
 await check('captured A + сменившаяся HttpOnly cookie B: header A, session-ended, без redirect',async()=>{
  const f=install();await bindProviderButtons(f.container,{intent:'link',expectedAccountId:A,onStatus:f.onStatus});assert.equal(f.container.children.length,1);assert.equal(f.container.hidden,false);
  const button=f.container.children[0];assert.equal(button.dataset.provider,'yandex');assert.match(button.textContent,/Привязать/);
  f.setCookieActor(B);await button.click();
  const request=f.calls.find(call=>call.path.endsWith('/start'));assert.equal(request.cookieActor,B);assert.equal(request.options.headers['x-nexus-oauth-account'],A);assert.deepEqual(JSON.parse(request.options.body),{intent:'link'});
  assert.equal(f.sessionEnded,1);assert.deepEqual(f.redirects,[]);assert.equal(button.disabled,false);assert.match(f.statuses.at(-1),/Не удалось/);
 });
 await check('normal login не отправляет account expectation, cookie actor не становится полем body',async()=>{
  const f=install();f.setCookieActor(B);await bindProviderButtons(f.container,{intent:'login',expectedAccountId:A,onStatus:f.onStatus});await f.container.children[0].click();
  const request=f.calls.find(call=>call.path.endsWith('/start'));assert.equal(Object.hasOwn(request.options.headers,'x-nexus-oauth-account'),false);assert.deepEqual(JSON.parse(request.options.body),{intent:'login'});
  assert.deepEqual(f.redirects,['https://oauth.yandex.ru/authorize?response_type=code&state=synthetic-state']);assert.equal(f.sessionEnded,0);
 });
 await check('valid explicit link отправляет captured account и допускает только provider host',async()=>{
  const f=install();await bindProviderButtons(f.container,{intent:'link',expectedAccountId:A});await f.container.children[0].click();assert.equal(f.redirects.length,1);assert.equal(new URL(f.redirects[0]).hostname,'oauth.yandex.ru');assert.equal(f.sessionEnded,0);
  const before=f.calls.length;await f.container.children[0].click();assert.equal(f.calls.length,before);
 });
 await check('foreign/http/userinfo/port authorization URLs не вызывают navigation',async()=>{
  for(const authorizationURL of ['https://attacker.invalid/authorize','http://oauth.yandex.ru/authorize','https://oauth.yandex.ru.attacker.invalid/authorize','https://user:password@oauth.yandex.ru/authorize','https://oauth.yandex.ru:444/authorize','javascript:alert(1)']){
   const f=install({startBody:{authorizationURL}});await bindProviderButtons(f.container,{onStatus:f.onStatus});await f.container.children[0].click();assert.equal(f.redirects.length,0);assert.equal(f.container.children[0].disabled,false);assert.equal(f.sessionEnded,0);
  }
 });
 await check('unsupported/no configuration/error provider list не создают фиктивных кнопок',async()=>{
  for(const config of [{providers:[]},{providers:[{id:'mailru'},{id:'fake'},null]},{providers:undefined,providerStatus:503},{providers:'not-an-array'}]){
   const f=install(config);await bindProviderButtons(f.container,{onStatus:f.onStatus});assert.equal(f.container.children.length,0);assert.equal(f.container.hidden,true);assert.equal(f.calls.filter(call=>call.path.endsWith('/start')).length,0);
  }
 });
 await check('повторный bind дедуплицирует provider buttons; неверный origin не обращается к API',async()=>{
  const f=install({providers:[{id:'yandex'},{id:'yandex'}]});await bindProviderButtons(f.container);await bindProviderButtons(f.container);assert.equal(f.container.children.length,1);
  const foreign=install({origin:'https://synthetic.invalid'});await bindProviderButtons(foreign.container);assert.equal(foreign.calls.length,0);assert.equal(foreign.container.children.length,0);assert.equal(foreign.redirects.length,0);
 });
 await check('ошибка upstream не раскрывает provider tokens и не запускает navigation',async()=>{
  const secret='SYNTHETIC_NEVER_EXPOSE_PROVIDER_TOKEN';
  const f=install({startStatus:503,startBody:{error:{code:secret},access_token:secret,client_secret:secret}});await bindProviderButtons(f.container,{onStatus:f.onStatus});await f.container.children[0].click();assert.equal(f.redirects.length,0);assert.equal(f.statuses.some(text=>text.includes(secret)),false);assert.equal(f.container.children[0].textContent.includes(secret),false);
 });
 await check('configured Google/Yandex/VK use the same login path and fixed provider hosts',async()=>{
  for(const[id,host]of [['google','accounts.google.com'],['yandex','oauth.yandex.ru'],['vk','id.vk.ru']]){
   const f=install({providers:[{id}],startBody:{authorizationURL:'https://'+host+'/authorize'}});await bindProviderButtons(f.container,{onStatus:f.onStatus});await f.container.children[0].click();assert.deepEqual(f.redirects,['https://'+host+'/authorize']);assert.equal(f.calls.at(-1).path,'/api/v2/account/oauth/'+id+'/start');
  }
 });
 await check('two providers cannot start parallel transactions and shared Passkey guard denies start',async()=>{
  let resolve;const wait=new Promise(r=>{resolve=r});const f=install({providers:[{id:'yandex'},{id:'google'}],startWait:wait});await bindProviderButtons(f.container);const pending=f.container.children[0].click();await f.container.children[1].click();assert.equal(f.calls.filter(x=>x.path.endsWith('/start')).length,1);resolve();await pending;
  const denied=install();await bindProviderButtons(denied.container,{acquire:()=>false});await denied.container.children[0].click();assert.equal(denied.calls.filter(x=>x.path.endsWith('/start')).length,0);
 });
 await check('bfcache only releases its own provider lock and never unlocks an unrelated Passkey attempt',async()=>{
  const f=install();let releases=0;await bindProviderButtons(f.container,{release:()=>releases++});f.events.get('pageshow')({persisted:true});assert.equal(releases,0);await f.container.children[0].click();f.events.get('pageshow')({persisted:true});assert.equal(releases,1);assert.equal(f.container.children[0].disabled,false);
 });
 for(const staleResult of ['success','rejection'])for(const order of ['old-first','new-first'])await check('bfcache invalidates '+staleResult+' completion ('+order+') without affecting a new explicit attempt',async()=>{
  const pending=[];let releases=0;
  const f=install({startImpl:(path,options)=>new Promise((resolve,reject)=>pending.push({resolve,reject,signal:options.signal}))});
  await bindProviderButtons(f.container,{onStatus:f.onStatus,release:()=>releases++});
  const button=f.container.children[0],old=button.click();await Promise.resolve();assert.equal(pending.length,1);
  f.events.get('pagehide')?.({persisted:true});f.events.get('pageshow')({persisted:true});
  assert.equal(releases,1);assert.equal(button.disabled,false);
  const newer=button.click();await Promise.resolve();assert.equal(pending.length,2);assert.equal(button.disabled,true);
  const statusCount=f.statuses.length,releaseCount=releases;
  const finishOld=async()=>{if(staleResult==='success')pending[0].resolve(Response.json({authorizationURL:'https://oauth.yandex.ru/authorize?attempt=old'}));else pending[0].reject(Error('ACCOUNT_SESSION_CHANGED'));await old};
  const finishNew=async()=>{pending[1].resolve(Response.json({authorizationURL:'https://oauth.yandex.ru/authorize?attempt=new'}));await newer};
  if(order==='old-first'){await finishOld();assert.equal(f.redirects.length,0);assert.equal(button.disabled,true);await finishNew()}else{await finishNew();await finishOld()}
  assert.deepEqual(f.redirects,['https://oauth.yandex.ru/authorize?attempt=new']);assert.equal(f.statuses.length,statusCount);assert.equal(releases,releaseCount);assert.equal(button.disabled,true);assert.equal(f.sessionEnded,0);
  assert.equal(pending[0].signal.aborted,true);assert.equal(pending[1].signal.aborted,false);
 });
 await check('pagehide aborts OAuth transport and no retry starts before an explicit restored click',async()=>{
  let signal,resolve;let releases=0;
  const f=install({startImpl:(path,options)=>{signal=options.signal;return new Promise(r=>{resolve=r})}});
  await bindProviderButtons(f.container,{onStatus:f.onStatus,release:()=>releases++});
  const button=f.container.children[0],pending=button.click(),statusCount=f.statuses.length;
  await Promise.resolve();f.events.get('pagehide')?.({persisted:true});assert.equal(signal.aborted,true);
  resolve(Response.json({authorizationURL:'https://oauth.yandex.ru/authorize'}));await pending;
  assert.equal(f.redirects.length,0);assert.equal(f.statuses.length,statusCount);assert.equal(releases,0);assert.equal(button.disabled,true);
  f.events.get('pageshow')({persisted:true});assert.equal(releases,1);assert.equal(button.disabled,false);assert.match(f.statuses.at(-1),/повторите|снова/i);
  assert.equal(f.calls.filter(x=>x.path.endsWith('/start')).length,1);
 });
 console.log(JSON.stringify({status:'PASS',tests,actualClientFunction:true,networkRequests:0,serversStarted:0,browsersStarted:0,realCookiesRead:false,providerSecrets:false}));
}finally{
 for(const[key,descriptor]of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
}
