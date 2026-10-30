import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAssistantBridge} from '../akronikl/ui/bridge.js';
import {createLazyAssistantBridge} from '../akronikl/context.js';
import {createUiHost} from '../akronikl/ui/nexus-host.js';
import {createAssistantCore} from '../akronikl/core/index.js';
import {cloudPreferences} from '../akronikl/connections/preferences.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
function fixture(){
 const root=new EventTarget(),win=new EventTarget(),doc=new EventTarget();
 root.dataset={};root.isConnected=true;root.querySelectorAll=()=>[];root.querySelector=()=>null;root.contains=()=>true;
 win.location={hash:'#view=akronikl'};doc.hidden=false;
 const state={ready:true,identity:{id:'synthetic'},loads:0,opens:0,closes:0,focuses:0,notices:[]};
 const trigger={isConnected:true,setAttribute(){},removeAttribute(){},after(node){state.notices.push(node.textContent)}};
 doc.createElement=()=>({dataset:{},setAttribute(){}});
 const module={openAssistantPanel(options){state.opens++;let closed=false;return{focus(){state.focuses++},dispose(){if(!closed){closed=true;state.closes++;options.onDispose()}}}}};
 const options={root,windowRef:win,documentRef:doc,readReady:()=>state.ready,readIdentity:()=>state.identity,readRoute:()=>({view:'akronikl'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',loadPanel:async()=>{state.loads++;return module}};
 return{root,win,doc,state,trigger,module,options};
}
test('host: незавершённый render не разрешает даже context.current',async()=>{
 const f=fixture();const host=createUiHost(f.options),core=createAssistantCore({host:host.adapter});
 f.state.ready=false;assert.equal(host.current(),false);
 assert.notEqual((await core.invoke({capability:'context.current',input:{}})).status,'ok');
 f.state.ready=true;assert.equal((await core.invoke({capability:'context.current',input:{}})).status,'ok');core.dispose();
});
test('bridge: запрет открытия до render без загрузки panel',async()=>{
 const f=fixture();f.state.ready=false;const bridge=createAssistantBridge(f.options);
 await bridge.open(f.trigger);assert.equal(f.state.loads,0);assert.equal(f.state.opens,0);bridge.dispose();
});
test('bridge: неboolean и исключение readiness дают отказ, не unhandled rejection',async()=>{
 for(const readiness of [()=>null,()=> 'pending',()=>{throw Error('synthetic')}]){
  const f=fixture(),bridge=createAssistantBridge({...f.options,readReady:readiness});
  await bridge.open(f.trigger);assert.equal(f.state.loads,0);bridge.dispose();
 }
});
test('lazy bridge: неготовая страница не импортирует UI',async()=>{
 const f=fixture();f.state.ready=false;const bridge=createLazyAssistantBridge(f.options);
 await bridge.open(f.trigger);assert.equal(f.state.opens,0);assert.deepEqual(f.state.notices,[]);bridge.dispose();
});
test('readiness повторно проверяется после отложенного импорта',async()=>{
 const f=fixture(),pending=deferred();const bridge=createAssistantBridge({...f.options,loadPanel:()=>pending.promise});
 const open=bridge.open(f.trigger);f.state.ready=false;pending.resolve(f.module);await open;
 assert.equal(f.state.opens,0);bridge.dispose();
});
test('invalidate отменяет импорт даже после повторной готовности того же hash',async()=>{
 const f=fixture(),pending=deferred(),bridge=createAssistantBridge({...f.options,loadPanel:()=>pending.promise});
 const open=bridge.open(f.trigger);f.state.ready=false;f.win.dispatchEvent(new Event('nexus:context-invalidated'));
 f.state.ready=true;pending.resolve(f.module);await open;assert.equal(f.state.opens,0);bridge.dispose();
});
test('два нажатия во время импорта не создают два окна',async()=>{
 const f=fixture(),pending=deferred(),bridge=createAssistantBridge({...f.options,loadPanel:()=>{f.state.loads++;return pending.promise}});
 const first=bridge.open(f.trigger),second=bridge.open(f.trigger);pending.resolve(f.module);await Promise.all([first,second]);
 assert.equal(f.state.loads,1);assert.equal(f.state.opens,1);await bridge.open(f.trigger);assert.equal(f.state.focuses,1);bridge.dispose();
});
test('неудачная загрузка допускает retry и не отражает exception.message',async()=>{
 const f=fixture();let fail=true;const bridge=createAssistantBridge({...f.options,loadPanel:async()=>{if(fail){fail=false;throw Error('SYNTHETIC_PRIVATE_ERROR')}return f.module}});
 await bridge.open(f.trigger);assert.equal(f.state.opens,0);assert.equal(f.state.notices.length,1);assert.ok(!f.state.notices[0].includes('SYNTHETIC_PRIVATE_ERROR'));
 await bridge.open(f.trigger);assert.equal(f.state.opens,1);bridge.dispose();
});
test('session/pagehide/route события закрывают окно синхронно',async()=>{
 for(const name of ['nexus:session-ended','nexus:context-invalidated','pagehide','hashchange']){
  const f=fixture(),bridge=createAssistantBridge(f.options);await bridge.open(f.trigger);f.win.dispatchEvent(new Event(name));assert.equal(f.state.closes,1);bridge.dispose();
 }
});
test('смена языка вне root (offline shell) очищает окно',async()=>{
 const f=fixture(),bridge=createAssistantBridge(f.options);await bridge.open(f.trigger);
 const change=new Event('change');Object.defineProperty(change,'target',{value:{id:'mentorLocale'}});f.doc.dispatchEvent(change);
 assert.equal(f.state.closes,1);bridge.dispose();
});
test('смена видимости сохраняет открытого помощника; явный dispose закрывает и снимает listeners',async()=>{
 const f=fixture(),bridge=createAssistantBridge(f.options);await bridge.open(f.trigger);f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));
 assert.equal(f.state.closes,0);f.doc.hidden=false;f.doc.dispatchEvent(new Event('visibilitychange'));await bridge.open(f.trigger);assert.equal(f.state.opens,1);bridge.dispose();assert.equal(f.state.closes,1);await bridge.open(f.trigger);assert.equal(f.state.opens,1);
});
// Исполняется точный wrapper из offline-entry, а не переписанная копия алгоритма.
const offline=await readFile(new URL('../pwa/offline-entry.js',import.meta.url),'utf8');
const renderSource=offline.slice(offline.indexOf('async function render(){'),offline.indexOf('async function renderCurrent(seq){'));
function offlineRenderer(renderCurrent){
 const env={root:{dataset:{akroniklRoute:'#view=old'},querySelector:()=>({})},location:{hash:'#view=old'},assistantBridge:{invalidate(){}},renderCurrent};
 const render=Function('env',`const {root,location,assistantBridge,renderCurrent}=env;let renderSequence=0;${renderSource};return render;`)(env);
 return{...env,render};
}
test('offline: смена hash до hashchange не объявляет старый DOM готовым',async()=>{
 const pending=deferred(),f=offlineRenderer(()=>pending.promise),run=f.render();
 assert.equal(f.root.dataset.akroniklRoute,undefined);f.location.hash='#view=new';pending.resolve();await run;
 assert.equal(f.root.dataset.akroniklRoute,undefined);
});
test('offline: только последний завершённый render выставляет готовность',async()=>{
 const jobs=[deferred(),deferred()];let next=0;const f=offlineRenderer(()=>jobs[next++].promise);
 const a=f.render();f.location.hash='#view=new';const b=f.render();jobs[0].resolve();await a;assert.equal(f.root.dataset.akroniklRoute,undefined);
 jobs[1].resolve();await b;assert.equal(f.root.dataset.akroniklRoute,'#view=new');
});
test('offline: ошибочный render не открывает доступ помощнику',async()=>{
 const f=offlineRenderer(async()=>{throw Error('synthetic')});await assert.rejects(f.render());assert.equal(f.root.dataset.akroniklRoute,undefined);
});
test('offline: блокировка копии закрывает готовность до ожидания сохранения',async()=>{
 const prefix="document.querySelector('#lockLocal').onclick=async()=>{",start=offline.indexOf(prefix)+prefix.length;
 const body=offline.slice(start,offline.indexOf('\nfunction connection()',start)).replace(/};\s*$/,'');
 const pending=deferred();let invalidated=false,locked=false;
 const env={root:{dataset:{akroniklRoute:'#view=old'}},assistantBridge:{invalidate(){invalidated=true}},graphics:null,settled:()=>pending.promise,session:{async lock(){locked=true}},data:{},saved:{},document:{querySelector:()=>({})},location:{hash:'#view=old'}};
 const run=Function('env',`let {root,assistantBridge,graphics,settled,session,data,saved,document,location}=env;return(async()=>{${body}})();`)(env);
 assert.equal(env.root.dataset.akroniklRoute,undefined);assert.equal(invalidated,true);assert.equal(locked,false);
 pending.resolve();await run;assert.equal(locked,true);assert.equal(env.location.hash,'#view=unlock');
});

test('lazy invalidation не меняет render-marker владельца: возврат во вкладку не блокируется',()=>{
 const f=fixture();f.root.dataset.akroniklRoute='#view=akronikl';const bridge=createLazyAssistantBridge(f.options);
 f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));
 assert.equal(f.root.dataset.akroniklRoute,'#view=akronikl');bridge.dispose();
});

test('initial render invalidation still allows the first greeting preference load',async()=>{
 const f=fixture();f.state.identity={accountId:'synthetic-A'};let reads=0;f.options.broker={loadState:async()=>{reads++;return{value:null};}};
 const bridge=createLazyAssistantBridge(f.options);bridge.invalidate();bridge.bindEditor();for(let i=0;i<200&&!reads;i++)await new Promise(r=>setTimeout(r,5));assert.equal(reads,1);bridge.dispose();
});
test('bridge invalidation cancels a greeting whose preferences are already pending',async()=>{
 const f=fixture();f.state.identity={accountId:'synthetic-A'};let release,capabilities=0;
 f.options.broker={loadState:()=>new Promise(r=>release=r),capabilities:async()=>{capabilities++;return{};}};
 const bridge=createLazyAssistantBridge(f.options);bridge.invalidate();bridge.bindEditor();for(let i=0;i<200&&!release;i++)await new Promise(r=>setTimeout(r,5));assert.equal(typeof release,'function');bridge.invalidate();release({value:cloudPreferences({...cloudPreferences(),speech:{auto:true,greeting:true,voiceURI:'kitsune:piper-uyut7',rate:1}})});await new Promise(r=>setImmediate(r));assert.equal(capabilities,0);bridge.dispose();
});
