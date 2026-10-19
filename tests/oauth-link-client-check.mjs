// Реальный bindProviderButtons, синтетические DOM/fetch и недоступный JS cookie actor.
// Никакой сети, браузера, серверов или provider credentials.
import assert from 'node:assert/strict';
import {bindProviderButtons} from '../server-access/public/oauth-client.js';
const ORIGIN='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const A='synthetic-account-a',B='synthetic-account-b';
const descriptors=new Map(['document','window','location','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
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
function install({providers=[{id:'yandex'}],providerStatus=200,startStatus=200,startBody={authorizationURL:'https://oauth.yandex.ru/authorize?response_type=code&state=synthetic-state'},origin=ORIGIN}={}){
 const calls=[],redirects=[],statuses=[],windowImpl=new EventTarget();let sessionEnded=0,cookieActor=A;
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
  assert.equal(path,'/api/v2/account/oauth/yandex/start');assert.equal(options.method,'POST');
  assert.equal(headers.get('content-type'),'application/json');assert.equal(headers.get('x-nexus-oauth-request'),'1');
  const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body),['intent']);assert.ok(['login','link'].includes(body.intent));
  if(body.intent==='link'&&headers.get('x-nexus-oauth-account')!==cookieActor)return Response.json({error:{code:'ACCOUNT_SESSION_CHANGED'}},{status:401});
  return Response.json(startBody,{status:startStatus});
 };
 return{calls,redirects,statuses,get sessionEnded(){return sessionEnded},setCookieActor(value){cookieActor=value},container:new Container(),onStatus:text=>statuses.push(text)};
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
 console.log(JSON.stringify({status:'PASS',tests,actualClientFunction:true,networkRequests:0,serversStarted:0,browsersStarted:0,realCookiesRead:false,providerSecrets:false}));
}finally{
 for(const[key,descriptor]of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
}
