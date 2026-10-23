// Настоящий bootstrap/controller с синтетическими Storage, Events, timers/fetch/import.
// Никаких приложений, сети, listen(), браузера или пользовательских файлов.
import assert from 'node:assert/strict';
import {createNexusBootstrap,validAccount,ENTRY_URL} from '../core/bootstrap.js';
import {SERVER_ACCOUNT_ORIGIN} from '../core/server-account-origin.js';
import {createAccountStorageController} from '../core/account-storage.js';
const KEY='akronikl:it-nexus:state:v1';
const A='synthetic-account-a',B='synthetic-account-b';
const dto=(accountId=A)=>({account:{accountId,displayName:'Synthetic',status:'active'},loginMethods:[{id:'synthetic-method',kind:'passkey',status:'active',createdAt:'2026-10-19T00:00:00Z',disabledAt:null}],enrollmentAvailable:false});
const json=(body=dto(),status=200,headers={})=>Response.json(body,{status,headers:{'cache-control':'no-store',vary:'*',...headers}});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
class MemoryStorage{
 constructor(log){this.data=new Map();this.log=log}
 get length(){return this.data.size}key(index){return [...this.data.keys()][index]??null}
 getItem(key){this.log.push('storage:read');return this.data.get(key)??null}
 setItem(key,value){this.log.push('storage:write');this.data.set(key,String(value))}
 removeItem(key){this.log.push('storage:remove');this.data.delete(key)}
}
function fakeTimers(){
 const timeouts=new Set(),intervals=new Set();let unrefs=0;
 const token=(callback,ms)=>({callback,ms,unref(){unrefs++}});
 return{timeouts,intervals,get unrefs(){return unrefs},
  setTimeout(callback,ms){const value=token(callback,ms);timeouts.add(value);return value},clearTimeout(value){timeouts.delete(value)},
  setInterval(callback,ms){const value=token(callback,ms);intervals.add(value);return value},clearInterval(value){intervals.delete(value)},
  tick(){for(const value of [...intervals])value.callback()},expire(){for(const value of [...timeouts])value.callback()}
 };
}
function fixture({hash='#view=home',origin=SERVER_ACCOUNT_ORIGIN,fetcher,importer,prepareTransport,useDefaultTimers=false}={}){
 const log=[],calls=[],navigation=[],timers=fakeTimers(),windowImpl=new EventTarget(),documentImpl=new EventTarget();
 windowImpl.Event=Event;documentImpl.hidden=false;
 let clears=0,captured=null,reloads=0;
 const element=tag=>{const e=new EventTarget();e.tagName=tag.toUpperCase();e.children=[];
  e.attributes=new Map();e.setAttribute=(key,value)=>e.attributes.set(key,value);
  e.append=(...nodes)=>e.children.push(...nodes);e.replaceChildren=(...nodes)=>{e.children=[...nodes]};
  e.textContent='';return e;
 };
 const appElement=element('main');appElement.replaceChildren=(...nodes)=>{clears++;log.push('ui:clear');appElement.children=[...nodes]};
 documentImpl.createElement=element;
 documentImpl.querySelector=selector=>{assert.equal(selector,'#app');return appElement};
 const locationImpl={origin,hash,pathname:'/',search:'',replace(url){navigation.push(url);log.push('navigate')},reload(){reloads++;log.push('reload')}};
 const local=new MemoryStorage(log),session=new MemoryStorage(log),controller=createAccountStorageController({localStorage:local,sessionStorage:session,legacyOwnerAccountId:'synthetic-unused-owner'});
 const storage={initializeAccountStorage(proof){log.push('storage:initialize');controller.initializeAccountStorage(proof)},lockAccountStorage(){log.push('storage:lock');controller.lockAccountStorage()},verifiedAccount:()=>controller.verifiedAccount()};
 let next=()=>json();
 const fetchImpl=async(url,options)=>{
  log.push('fetch:request');calls.push({url,options});assert.equal(url,'/api/v2/account');
  assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.deepEqual(options.headers,{accept:'application/json'});assert.ok(options.signal instanceof AbortSignal);
  return fetcher?fetcher(url,options):next();
 };
 const bootstrap=createNexusBootstrap({fetchImpl,locationImpl,documentImpl,windowImpl,storage,...(prepareTransport?{prepareTransport}:{}),...(useDefaultTimers?{}:{timers}),importApp:async()=>{
  log.push('app:import');assert.equal(controller.verifiedAccount()?.accountId,A);captured=controller.accountLocalStorage();captured.setItem(KEY,'synthetic-preserved-progress');if(importer)await importer();
 }});
 return{bootstrap,log,calls,navigation,timers,windowImpl,documentImpl,locationImpl,controller,local,
  get captured(){return captured},get clears(){return clears},get reloads(){return reloads},get recoveryButton(){return appElement.children[0]?.children?.find(e=>e.tagName==='BUTTON')},setNext(value){next=typeof value==='function'?value:()=>value},
  dispatch(target,type,extra={}){const event=new Event(type);for(const[key,value]of Object.entries(extra))Object.defineProperty(event,key,{value});target.dispatchEvent(event);return event}
 };
}
let tests=0;
const check=async(name,fn)=>{await fn();tests++;console.log('PASS '+name)};
const assertLocked=f=>{assert.equal(f.controller.verifiedAccount(),null);if(f.captured)assert.throws(()=>f.captured.setItem(KEY,'unsafe-autosave'),{code:'VERIFIED_ACCOUNT_REQUIRED'})};

await check('строгий DTO: active account и реальный active method, без role/hint shortcut',async()=>{
 assert.equal(validAccount(dto()),true);
 for(const value of [null,{}, {...dto(),account:{...dto().account,status:'disabled'}},{...dto(),account:{...dto().account,accountId:'../bad'}},
  {...dto(),roles:['owner']},{...dto(),loginMethods:[]},{...dto(),loginMethods:[{status:'active',disabledAt:null}]},
  {...dto(),loginMethods:[{...dto().loginMethods[0],kind:'local-profile'}]},{...dto(),loginMethods:[{...dto().loginMethods[0],status:'pending'}]},
  {...dto(),loginMethods:[{...dto().loginMethods[0],disabledAt:'2026-10-19'}]},{...dto(),loginMethods:[dto().loginMethods[0],dto().loginMethods[0]]}])assert.equal(validAccount(value),false);
});
await check('чужой origin: ноль requests/private reads/app imports, полный переход в canonical entry',async()=>{
 const f=fixture({origin:'https://synthetic.invalid',hash:'#view=studio&project=private'});
 assert.equal(await f.bootstrap.startNexus(),false);assert.equal(f.calls.length,0);assert.equal(f.log.includes('storage:read'),false);assert.equal(f.log.includes('app:import'),false);assert.deepEqual(f.navigation,[ENTRY_URL+f.locationImpl.hash]);assertLocked(f);
 await assert.rejects(f.bootstrap.readVerifiedSession(),/SESSION_ORIGIN_REQUIRED/);assert.equal(f.calls.length,0);
});
await check('server proof завершается до любых private reads и app import; start однократен',async()=>{
 const pending=deferred(),f=fixture({fetcher:()=>pending.promise});const start=f.bootstrap.startNexus();
 await Promise.resolve();
 assert.deepEqual(f.log,['fetch:request']);assert.equal(f.local.data.size,0);assert.equal(f.timers.timeouts.size,1);
 pending.resolve(json());assert.equal(await start,true);
 assert.ok(f.log.indexOf('storage:initialize')>f.log.indexOf('fetch:request'));assert.ok(f.log.indexOf('app:import')>f.log.indexOf('storage:initialize'));
 assert.equal(f.captured.getItem(KEY),'synthetic-preserved-progress');assert.equal(await f.bootstrap.startNexus(),true);assert.equal(f.calls.length,1);assert.equal(f.log.filter(x=>x==='app:import').length,1);
 assert.equal(f.timers.timeouts.size,0);assert.equal([...f.timers.intervals][0].ms,60000);assert.ok(f.timers.unrefs>=2);f.bootstrap.dispose();
});
await check('production default timers сохраняют Window receiver до fetch и при очистке/polling',async()=>{
 const names=['setTimeout','clearTimeout','setInterval','clearInterval'],originals=Object.fromEntries(names.map(name=>[name,globalThis[name]]));
 const nativeLike=fakeTimers(),receivers=[];let f;
 for(const name of names)globalThis[name]=function(...args){
  receivers.push({name,globalReceiver:this===globalThis});
  assert.equal(this,globalThis,`Native Window.${name}: Illegal invocation`);
  return nativeLike[name](...args);
 };
 try{
  f=fixture({useDefaultTimers:true});const started=await f.bootstrap.startNexus();
  assert.ok(receivers.every(call=>call.globalReceiver),'Production default timer потерял Window receiver: '+JSON.stringify(receivers));
  assert.equal(started,true);assert.equal(f.calls.length,1);assert.equal(f.navigation.length,0);assert.equal(f.captured.getItem(KEY),'synthetic-preserved-progress');
  assert.deepEqual(receivers.map(call=>call.name),['setTimeout','clearTimeout','setInterval']);
  assert.equal(nativeLike.timeouts.size,0);assert.equal(nativeLike.intervals.size,1);
  f.bootstrap.dispose();assert.equal(nativeLike.intervals.size,0);assert.equal(receivers.at(-1).name,'clearInterval');assert.ok(receivers.every(call=>call.globalReceiver));
 }finally{
  f?.bootstrap.dispose();for(const name of names)globalThis[name]=originals[name];
 }
});
await check('invalid/expired/revoked initial session никогда не открывает storage/app',async()=>{
 for(const next of [()=>json({},401),()=>json({},403),()=>json({...dto(),loginMethods:[]}),()=>new Response('<html>bad</html>',{headers:{'content-type':'text/html'}}),()=>json(dto(),200,{vary:'accept-encoding'}),()=>new Response('x'.repeat(65537),{headers:{'content-type':'application/json','cache-control':'no-store',vary:'*'}})]){
  const f=fixture({fetcher:next});assert.equal(await f.bootstrap.startNexus(),false);assert.equal(f.log.includes('app:import'),false);assert.equal(f.log.includes('storage:read'),false);assert.equal(f.navigation.length,1);assertLocked(f);
 }
});
await check('все начальные hash routes требуют server proof до app',async()=>{
 for(const hash of ['#view=home','#view=academy','#view=lesson&id=cpp.first-cpp-program','#view=project-studio&project=private','#view=graphics','#view=feedback-admin','#view=unknown']){
  const f=fixture({hash,fetcher:()=>json({},401)});assert.equal(await f.bootstrap.startNexus(),false);assert.equal(f.log.includes('app:import'),false);assert.deepEqual(f.navigation,[ENTRY_URL+hash]);
 }
});
await check('focus/visibility account switch, revoke и server 401/403 lock captured facade + navigation',async()=>{
 for(const trigger of ['focus','visibility'])for(const next of [()=>json(dto(B)),()=>json({},401),()=>json({},403)]){
  const f=fixture();await f.bootstrap.startNexus();f.setNext(next);
  if(trigger==='focus')f.dispatch(f.windowImpl,'focus');else{f.documentImpl.hidden=false;f.dispatch(f.documentImpl,'visibilitychange')}
  await f.bootstrap.recheck();assertLocked(f);assert.equal(f.navigation.length,1);assert.equal(f.clears,1);assert.equal(f.timers.intervals.size,0);assert.equal(f.log.filter(x=>x==='app:import').length,1);
 }
});
await check('hash route handler не запускается до recheck; focus deduplicates тот же request',async()=>{
 const f=fixture();await f.bootstrap.startNexus();let routes=0;f.windowImpl.addEventListener('hashchange',()=>routes++);
 const pending=deferred();f.setNext(()=>pending.promise);f.locationImpl.hash='#view=project-studio&project=private';f.dispatch(f.windowImpl,'hashchange');f.dispatch(f.windowImpl,'focus');
 assert.equal(routes,0);assert.equal(f.calls.length,2);pending.resolve(json());assert.equal(await f.bootstrap.recheck(),true);assert.equal(routes,1);assert.equal(f.navigation.length,0);f.bootstrap.dispose();
});
await check('hash changed account не запускает личный route и сохраняет точный hash возврата',async()=>{
 const f=fixture();await f.bootstrap.startNexus();let routes=0;f.windowImpl.addEventListener('hashchange',()=>routes++);
 f.setNext(()=>json(dto(B)));f.locationImpl.hash='#view=code-studio&project=synthetic';f.dispatch(f.windowImpl,'hashchange');await f.bootstrap.recheck();assert.equal(routes,0);assertLocked(f);assert.deepEqual(f.navigation,[ENTRY_URL+f.locationImpl.hash]);
});
await check('hidden: нет polling/focus/hash fetch; visible проверяет до отложенного route',async()=>{
 const f=fixture();await f.bootstrap.startNexus();let routes=0;f.windowImpl.addEventListener('hashchange',()=>routes++);
 f.documentImpl.hidden=true;f.dispatch(f.documentImpl,'visibilitychange');f.dispatch(f.windowImpl,'focus');f.dispatch(f.windowImpl,'hashchange');f.timers.tick();assert.equal(f.calls.length,1);assert.equal(routes,0);
 f.documentImpl.hidden=false;f.dispatch(f.documentImpl,'visibilitychange');await f.bootstrap.recheck();assert.equal(f.calls.length,2);assert.equal(routes,1);f.bootstrap.dispose();
});
await check('visible interval expiry locks captured autosave и уводит на entry',async()=>{
 const f=fixture();await f.bootstrap.startNexus();f.setNext(()=>json({},401));f.timers.tick();await f.bootstrap.recheck();assertLocked(f);assert.equal(f.navigation.length,1);
});
await check('pagehide сразу блокирует stale facade; BFCache pageshow требует full navigation',async()=>{
 const f=fixture();await f.bootstrap.startNexus();f.dispatch(f.windowImpl,'pagehide');assertLocked(f);assert.equal(f.navigation.length,0);assert.equal(f.timers.intervals.size,0);
 f.dispatch(f.windowImpl,'pageshow',{persisted:true});assertLocked(f);assert.deepEqual(f.navigation,[]);assert.equal(f.reloads,1);assert.equal(f.calls.length,1);
});
await check('pagehide во время initial fetch aborts и запрещает поздний import',async()=>{
 const pending=deferred(),f=fixture({fetcher:()=>pending.promise});const start=f.bootstrap.startNexus();await Promise.resolve();f.dispatch(f.windowImpl,'pagehide');assert.equal(f.calls[0].options.signal.aborted,true);pending.resolve(json());assert.equal(await start,false);assert.equal(f.log.includes('storage:initialize'),false);assert.equal(f.log.includes('app:import'),false);assertLocked(f);
 f.dispatch(f.windowImpl,'pageshow',{persisted:true});assert.equal(f.reloads,1);assert.equal(f.navigation.length,0);
});
await check('migration failure and pagehide during transport preparation never start session reads',async()=>{
 for(const cancel of [false,true]){
  const pending=deferred(),f=fixture({prepareTransport:()=>pending.promise});const start=f.bootstrap.startNexus();
  assert.equal(f.calls.length,0);if(cancel){f.dispatch(f.windowImpl,'pagehide');pending.resolve()}else pending.reject(Error('SYNTHETIC_MIGRATION_FAILURE'));
  assert.equal(await start,false);assert.equal(f.calls.length,0);assert.equal(f.log.includes('app:import'),false);assertLocked(f);
 }
});
await check('pagehide при import и session-ended при recheck не возрождают storage',async()=>{
 const imported=deferred(),f=fixture({importer:()=>imported.promise});const start=f.bootstrap.startNexus();
 while(!f.captured)await new Promise(resolve=>setImmediate(resolve));
 f.dispatch(f.windowImpl,'pagehide');assertLocked(f);imported.resolve();assert.equal(await start,false);assert.equal(f.timers.intervals.size,0);f.bootstrap.dispose();
 const other=fixture();await other.bootstrap.startNexus();const pending=deferred();other.setNext(()=>pending.promise);other.dispatch(other.windowImpl,'focus');other.dispatch(other.windowImpl,'nexus:session-ended');assertLocked(other);assert.equal(other.calls[1].options.signal.aborted,true);pending.resolve(json());await other.bootstrap.recheck();assert.equal(other.navigation.length,1);assert.equal(other.log.filter(x=>x==='app:import').length,1);
});
await check('dispose очищает listeners/timers и не позволяет повторную app загрузку',async()=>{
 const f=fixture();await f.bootstrap.startNexus();f.bootstrap.dispose();f.dispatch(f.windowImpl,'focus');f.dispatch(f.windowImpl,'hashchange');f.dispatch(f.documentImpl,'visibilitychange');f.timers.tick();assert.equal(f.calls.length,1);assert.equal(f.timers.intervals.size,0);assertLocked(f);
});

await check('initial transient 503/network stays locked and offers server-verified retry without passkey navigation',async()=>{
 for(const next of [()=>json({},503),()=>{throw Error('synthetic network timeout')}]){
  const f=fixture();f.setNext(next);assert.equal(await f.bootstrap.startNexus(),false);
  assertLocked(f);assert.equal(f.calls.length,1);assert.equal(f.navigation.length,0);assert.equal(f.reloads,0);
  assert.equal(f.log.includes('app:import'),false);assert.equal(f.log.includes('storage:read'),false);
  assert.equal(f.recoveryButton?.textContent,'Повторить проверку');
  f.setNext(()=>json());f.recoveryButton.dispatchEvent(new Event('click'));await f.bootstrap.recheck();
  assert.equal(f.reloads,1);assert.equal(f.navigation.length,0);assertLocked(f);
 }
});
await check('background network failure suspends Account, successful check reloads original document',async()=>{
 const f=fixture();await f.bootstrap.startNexus();const key=[...f.local.data.keys()].find(x=>x.endsWith(KEY));
 assert.equal(f.local.data.get(key),'synthetic-preserved-progress');f.setNext(()=>json({},502));
 f.dispatch(f.windowImpl,'focus');await f.bootstrap.recheck();
 assertLocked(f);assert.equal(f.navigation.length,0);assert.equal(f.reloads,0);assert.equal(f.clears,1);
 assert.equal(f.local.data.get(key),'synthetic-preserved-progress');
 f.setNext(()=>json());f.dispatch(f.windowImpl,'online');await f.bootstrap.recheck();
 assert.equal(f.reloads,1);assert.deepEqual(f.navigation,[]);assertLocked(f);
});
await check('temporary error does not mask revoke/account-switch and does not unlock old facade',async()=>{
 for(const next of [()=>json({},401),()=>json({},403),()=>json(dto(B))]){
  const f=fixture();await f.bootstrap.startNexus();f.setNext(()=>json({},503));
  assert.equal(await f.bootstrap.recheck(),false);assertLocked(f);assert.equal(f.navigation.length,0);
  f.setNext(next);assert.equal(await f.bootstrap.recheck(),false);
  assert.deepEqual(f.navigation,[ENTRY_URL+f.locationImpl.hash]);assert.equal(f.reloads,0);assertLocked(f);
 }
});
await check('hidden suspended UI performs no background private reads until visible',async()=>{
 const f=fixture();await f.bootstrap.startNexus();f.setNext(()=>json({},503));await f.bootstrap.recheck();
 f.documentImpl.hidden=true;f.dispatch(f.windowImpl,'visibilitychange');f.dispatch(f.windowImpl,'focus');
 f.dispatch(f.windowImpl,'online');assert.equal(await f.bootstrap.recheck(),false);assert.equal(f.calls.length,2);
 f.documentImpl.hidden=false;f.setNext(()=>json());f.dispatch(f.documentImpl,'visibilitychange');await f.bootstrap.recheck();
 assert.equal(f.reloads,1);assert.equal(f.calls.length,3);
});

console.log(JSON.stringify({status:'PASS',tests,networkRequests:0,realPrivateStorageReads:0,appImports:0,serversStarted:0,browsersStarted:0,syntheticStorageController:true}));
