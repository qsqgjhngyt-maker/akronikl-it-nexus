// Реальные bootstrap/account-storage/bridge/host/Core, синтетические DOM и DTO.
// Это интеграционный контрактный тест, не серверный LIVE и не browser E2E.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createNexusBootstrap} from '../core/bootstrap.js';
import {SERVER_ACCOUNT_ORIGIN} from '../core/server-account-origin.js';
import {createAccountStorageController} from '../core/account-storage.js';
import {createAssistantBridge} from '../akronikl/ui/bridge.js';
import {createUiHost} from '../akronikl/ui/nexus-host.js';
import {createAssistantCore} from '../akronikl/core/index.js';
const KEY='akronikl:it-nexus:state:v1';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
const dto=(accountId='synthetic-ak02-a')=>({account:{accountId,displayName:'Синтетический тест',status:'active'},loginMethods:[{id:'synthetic-method',kind:'passkey',status:'active',createdAt:'2026-10-26T00:00:00Z',disabledAt:null}],enrollmentAvailable:false});
const response=(value=dto(),status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store',vary:'*'}});
class MemoryStorage{
 data=new Map();get length(){return this.data.size}key(i){return [...this.data.keys()][i]??null}
 getItem(k){return this.data.get(k)??null}setItem(k,v){this.data.set(k,String(v))}removeItem(k){this.data.delete(k)}
}
function element(){const e=new EventTarget();Object.assign(e,{children:[],dataset:{},isConnected:true,textContent:''});
 e.setAttribute=()=>{};e.removeAttribute=()=>{};e.querySelectorAll=()=>[];e.querySelector=()=>null;e.contains=()=>true;
 e.append=(...x)=>e.children.push(...x);e.replaceChildren=(...x)=>{e.children=[...x]};return e;
}
function fixture({local=new MemoryStorage(),initial=()=>response()}={}){
 const win=new EventTarget(),doc=new EventTarget(),root=element(),log=[],navigation=[];
 const location={origin:SERVER_ACCOUNT_ORIGIN,hash:'#view=akronikl',pathname:'/',search:'',replace:u=>navigation.push(u),reload(){log.push('reload')}};
 win.Event=Event;win.location=location;doc.hidden=false;doc.querySelector=()=>root;doc.createElement=element;
 const storage=createAccountStorageController({localStorage:local,sessionStorage:new MemoryStorage(),legacyOwnerAccountId:'synthetic-never-adopt'});
 const timers={setTimeout(){return {unref(){}}},clearTimeout(){},setInterval(){return {unref(){}}},clearInterval(){}};
 const state={ready:false,visible:false,opens:0,imports:0,reads:0,routeReleased:0};
 let next=initial,bridge,facade,core,host;
 const options={root,windowRef:win,documentRef:doc,readIdentity:()=>storage.verifiedAccount(),readReady:()=>state.ready,
  readRoute:()=>Object.fromEntries(new URLSearchParams(location.hash.slice(1))),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',
  loadPanel:async()=>({openAssistantPanel(o){host=createUiHost(o);core=createAssistantCore({host:host.adapter});state.opens++;state.visible=true;
   return {focus(){},dispose(){state.visible=false;core.dispose();host.dispose();o.onDispose()}}}})};
 const bootstrap=createNexusBootstrap({locationImpl:location,windowImpl:win,documentImpl:doc,storage,timers,prepareTransport:async()=>{},
  fetchImpl:async(url,opts)=>{assert.equal(url,'/api/v2/account');assert.equal(opts.credentials,'same-origin');log.push('fetch');return next(opts.signal)},
  importApp:async()=>{state.imports++;facade=storage.accountLocalStorage();state.ready=true;
   win.addEventListener('nexus:context-invalidated',()=>{log.push('invalidate');state.ready=false});
   bridge=createAssistantBridge(options);
   win.addEventListener('hashchange',()=>{state.routeReleased++;state.ready=true});
  }});
 const trigger={isConnected:true,setAttribute(){},removeAttribute(){},after(){}};
 return {state,root,win,doc,log,location,storage,local,navigation,bootstrap,
  setNext(fn){next=fn},get facade(){return facade},get core(){return core},get host(){return host},
  async start(){return bootstrap.startNexus()},async open(){await bridge?.open(trigger)},
  emit(name){win.dispatchEvent(new Event(name))},dispose(){bridge?.dispose();bootstrap.dispose()}};
}

test('Account proof предшествует импорту помощника и доступу к данным',async()=>{
 const d=deferred(),f=fixture({initial:()=>d.promise});try{
  const starting=f.start();await Promise.resolve();await Promise.resolve();assert.equal(f.state.imports,0);assert.equal(f.facade,undefined);
  d.resolve(response());assert.equal(await starting,true);await f.open();assert.equal(f.state.visible,true);
  assert.equal((await f.core.invoke({capability:'context.current',input:{}})).status,'ok');
 }finally{f.dispose()}
});

test('Маршрут очищает панель до ответа recheck и не открывает старый DOM',async()=>{
 const f=fixture();try{assert.equal(await f.start(),true);await f.open();const d=deferred();f.setNext(()=>d.promise);f.log.length=0;
  f.location.hash='#view=academy';f.emit('hashchange');assert.equal(f.state.visible,false);assert.equal(f.state.ready,false);
  assert.deepEqual(f.log.slice(0,2),['invalidate','fetch']);await f.open();assert.equal(f.state.opens,1);assert.equal(f.state.routeReleased,0);
  d.resolve(response());assert.equal(await f.bootstrap.recheck(),true);assert.equal(f.state.routeReleased,1);
  await f.open();assert.equal(f.state.opens,2);assert.equal((await f.core.invoke({capability:'context.current',input:{}})).data.route.view,'academy');
 }finally{f.dispose()}
});

test('Account A → B закрывает старую панель/facade; новый документ не читает прогресс A',async()=>{
 const local=new MemoryStorage(),a=fixture({local});let b;try{
  assert.equal(await a.start(),true);a.facade.setItem(KEY,'SYNTHETIC_PROGRESS_A');await a.open();const old=a.core;
  a.setNext(()=>response(dto('synthetic-ak02-b')));assert.equal(await a.bootstrap.recheck(),false);
  assert.equal(a.state.visible,false);assert.equal(a.storage.verifiedAccount(),null);assert.equal(a.navigation.length,1);
  assert.throws(()=>a.facade.setItem(KEY,'stale'),{code:'VERIFIED_ACCOUNT_REQUIRED'});await a.open();assert.equal(a.state.opens,1);
  assert.notEqual((await old.invoke({capability:'context.current',input:{}})).status,'ok');
  b=fixture({local,initial:()=>response(dto('synthetic-ak02-b'))});assert.equal(await b.start(),true);assert.equal(b.facade.getItem(KEY),null);
  b.facade.setItem(KEY,'SYNTHETIC_PROGRESS_B');await b.open();assert.equal(b.state.visible,true);
  assert.equal([...local.data.values()].filter(v=>v==='SYNTHETIC_PROGRESS_A').length,1);
  assert.equal([...local.data.values()].filter(v=>v==='SYNTHETIC_PROGRESS_B').length,1);
 }finally{b?.dispose();a.dispose()}
});

test('Logout во время recheck не возрождает помощник после позднего ответа',async()=>{
 const f=fixture();try{assert.equal(await f.start(),true);await f.open();const d=deferred();f.setNext(()=>d.promise);const pending=f.bootstrap.recheck();
  f.emit('nexus:session-ended');assert.equal(f.state.visible,false);assert.equal(f.host.current(),false);
  d.resolve(response());assert.equal(await pending,false);await f.open();assert.equal(f.state.opens,1);assert.equal(f.navigation.length,1);
 }finally{f.dispose()}
});

test('401 и 403 очищают контекст без изменения сохранённых данных',async()=>{
 for(const code of [401,403]){const f=fixture();try{assert.equal(await f.start(),true);f.facade.setItem(KEY,'SYNTHETIC_KEEP');await f.open();
  const before=[...f.local.data];f.setNext(()=>response({},code));assert.equal(await f.bootstrap.recheck(),false);
  assert.equal(f.state.visible,false);assert.deepEqual([...f.local.data],before);assert.equal(f.navigation.length,1);
 }finally{f.dispose()}}
});

test('503 закрывает приватный контекст; успешная проверка требует новый документ',async()=>{
 const f=fixture();try{assert.equal(await f.start(),true);f.facade.setItem(KEY,'SYNTHETIC_KEEP');await f.open();const before=[...f.local.data];
  f.setNext(()=>response({},503));assert.equal(await f.bootstrap.recheck(),false);assert.equal(f.state.visible,false);assert.equal(f.navigation.length,0);
  f.setNext(()=>response());assert.equal(await f.bootstrap.recheck(),false);assert.ok(f.log.includes('reload'));
  assert.deepEqual([...f.local.data],before);assert.throws(()=>f.facade.setItem(KEY,'unsafe'),{code:'VERIFIED_ACCOUNT_REQUIRED'});
  await f.open();assert.equal(f.state.opens,1);
 }finally{f.dispose()}
});

test('Pagehide сразу закрывает панель и старый autosave; BFCache требует reload',async()=>{
 const f=fixture();try{assert.equal(await f.start(),true);await f.open();f.emit('pagehide');assert.equal(f.state.visible,false);
  assert.throws(()=>f.facade.setItem(KEY,'unsafe'),{code:'VERIFIED_ACCOUNT_REQUIRED'});
  const ev=new Event('pageshow');Object.defineProperty(ev,'persisted',{value:true});f.win.dispatchEvent(ev);assert.ok(f.log.includes('reload'));
 }finally{f.dispose()}
});

test('Отзыв initial proof до завершения запроса не импортирует приложение',async()=>{
 const d=deferred(),f=fixture({initial:()=>d.promise});try{const pending=f.start();await Promise.resolve();await Promise.resolve();
  f.emit('nexus:session-ended');d.resolve(response());assert.equal(await pending,false);assert.equal(f.state.imports,0);assert.equal(f.state.opens,0);
 }finally{f.dispose()}
});
