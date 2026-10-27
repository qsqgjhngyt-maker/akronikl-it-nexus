import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createUiHost} from '../akronikl/ui/nexus-host.js';
import {createAssistantCore,createKnowledgeIndex} from '../akronikl/core/index.js';
import {createCodeWorkspace} from '../sandbox/code-workspace.js';
import {loadUiKnowledge,readBoundedJsonBytes,KNOWLEDGE_MANIFEST_SHA256} from '../akronikl/ui/knowledge-loader.js';
import {createNexusBootstrap} from '../core/bootstrap.js';
import {SERVER_ACCOUNT_ORIGIN} from '../core/server-account-origin.js';

const manifestBytes = await readFile(new URL('../akronikl/knowledge/manifest.json',import.meta.url));
const manifest = JSON.parse(manifestBytes);
const bundles = Object.fromEntries(await Promise.all(['ru','en'].map(async lang=>[lang,await readFile(new URL(`../akronikl/knowledge/core-index.${lang}.json`,import.meta.url))])));
function fixture({publicMode=false,anonymous=false}={}) {
  let identity=anonymous?null:{accountId:'synthetic-a'}, route={course:'cpp',lesson:'cpp.pointers-references-addresses'}, language='ru',courseLanguage='ru';
  const workspace=createCodeWorkspace({files:[{path:'main.cpp',content:'before\nSELECTED\nafter',languageId:'cpp'},{path:'private.hpp',content:'UNSELECTED_PRIVATE_FILE',languageId:'cpp'}]});
  const editor={isConnected:true,value:'before\nSELECTED\nafter',selectionStart:7,selectionEnd:15,__nexusCodeStudio:{workspace}};
  const root={isConnected:true};let currentEditor=editor;
  const host=createUiHost({root,publicMode,readIdentity:()=>identity,readRoute:()=>route,readLocale:()=>language,readCourseLocale:()=>courseLanguage,readEditor:()=>currentEditor});
  const core=createAssistantCore({host:host.adapter,knowledge:[createKnowledgeIndex(JSON.parse(bundles.ru))],policy:{selection:true}});
  return {host,core,editor,root,workspace,setIdentity:v=>identity=v,setRoute:v=>route=v,setLocale:v=>language=v,setCourseLocale:v=>courseLanguage=v,setEditor:v=>currentEditor=v};
}
const context=(f,include=[])=>f.core.invoke({capability:'context.current',input:{include}});
const search=f=>f.core.invoke({capability:'knowledge.search',input:{query:'указатели',locale:'ru'}});
function assetFetch({mutate=(_path,bytes)=>bytes,headers={},status=200}={}) {
  const calls=[];
  const fetchImpl=async(url,options)=>{
    const p=new URL(url).pathname;calls.push({p,options});
    assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    assert.match(p,/\/akronikl\/knowledge\/(manifest|core-index\.(ru|en))\.json$/);
    const b=p.endsWith('/manifest.json')?manifestBytes:p.endsWith('.ru.json')?bundles.ru:bundles.en;
    return new Response(mutate(p,b),{status,headers:{'content-type':'application/json',...headers}});
  };
  return {calls,fetchImpl};
}
test('pin совпадает с полным manifest принятого ядра',()=>assert.equal(createHash('sha256').update(manifestBytes).digest('hex'),KNOWLEDGE_MANIFEST_SHA256));
test('реальный RU/EN индекс проверяется и ищет материалы; только фиксированные public GET',async()=>{
  for(const lang of ['ru','en']){const f=assetFetch(),index=await loadUiKnowledge(lang,{fetchImpl:f.fetchImpl});assert.equal(index.stats.locale,lang);assert.equal(index.stats.lessonCount,manifest.indexes.find(row=>row.locale===lang).lessons);assert.ok(index.search(lang==='ru'?'указатели':'pointers').length);assert.equal(f.calls.length,2);}
});
test('подмена manifest отклоняется до чтения index',async()=>{
  const f=assetFetch({mutate:(_p,b)=>Buffer.from(b.toString().replace('repository-curriculum','modified-curriculum'))});await assert.rejects(loadUiKnowledge('ru',{fetchImpl:f.fetchImpl}));assert.equal(f.calls.length,1);
});
test('подмена index той же длины отклоняется',async()=>{
  const f=assetFetch({mutate:(p,b)=>{if(p.endsWith('/manifest.json'))return b;const out=Buffer.from(b);out[200]^=1;return out;}});await assert.rejects(loadUiKnowledge('ru',{fetchImpl:f.fetchImpl}));assert.equal(f.calls.length,2);
});
test('HTML/ошибки HTTP не принимаются как индекс',async()=>{
  for(const params of [{headers:{'content-type':'text/html'}},{status:404},{status:503}]){const f=assetFetch(params);await assert.rejects(loadUiKnowledge('ru',{fetchImpl:f.fetchImpl}));assert.equal(f.calls.length,1);}
});
test('stream ограничен до конкатенации; reader отменяется',async()=>{
  let cancelled=false;const fetchImpl=async()=>new Response(new ReadableStream({pull(c){c.enqueue(new Uint8Array(30))},cancel(){cancelled=true;}}),{headers:{'content-type':'application/json'}});
  await assert.rejects(readBoundedJsonBytes('https://synthetic.invalid/x',{maxBytes:10,fetchImpl}));assert.equal(cancelled,true);
});
test('отмена до чтения не вызывает сеть',async()=>{
  const f=assetFetch(),c=new AbortController();c.abort();await assert.rejects(loadUiKnowledge('ru',{signal:c.signal,fetchImpl:f.fetchImpl}));assert.equal(f.calls.length,0);
});
test('неподдерживаемый язык не подменяется русским',async()=>{
  const f=assetFetch();await assert.rejects(loadUiKnowledge('xx',{fetchImpl:f.fetchImpl}));assert.equal(f.calls.length,0);
});
test('неудачное чтение не отравляет последующую попытку',async()=>{
  const f=assetFetch();let bad=true;const fetchImpl=(...args)=>{if(bad){bad=false;throw Error('synthetic');}return f.fetchImpl(...args)};
  await assert.rejects(loadUiKnowledge('en',{fetchImpl}));assert.equal((await loadUiKnowledge('en',{fetchImpl})).stats.locale,'en');
});
test('контекст по умолчанию не читает код',async()=>{
  const f=fixture();f.workspace.getFile=()=>{throw Error('must not read')};const r=await context(f);assert.equal(r.status,'ok');assert.equal('selection' in r.data,false);f.core.dispose();
});
test('выбран только диапазон одного файла, не другие файлы',async()=>{
  const f=fixture(),r=await context(f,['selection']);assert.equal(r.status,'ok');assert.equal(r.data.selection.code,'SELECTED');assert.equal(JSON.stringify(r).includes('UNSELECTED_PRIVATE_FILE'),false);f.core.dispose();
});
test('изменение identity делает прежний host недействительным',async()=>{
  const f=fixture();f.setIdentity({accountId:'synthetic-b'});assert.equal(f.host.current(),false);assert.notEqual((await context(f,['selection'])).status,'ok');f.core.dispose();
});
test('одинаковый accountId в новом объекте не оживляет прежний host',()=>{const f=fixture();f.setIdentity({accountId:'synthetic-a'});assert.equal(f.host.current(),false);f.core.dispose();});
test('смена route запрещает прежний контекст до завершения навигации',async()=>{
  const f=fixture();f.setRoute({view:'home'});assert.equal(f.host.current(),false);assert.notEqual((await context(f,['selection'])).status,'ok');f.core.dispose();
});
test('редакция workspace и смена файла инвалидируют host',()=>{
  for(const change of [f=>f.workspace.updateFile('main.cpp','new'),f=>f.workspace.setActiveFile('private.hpp')]){const f=fixture();change(f);assert.equal(f.host.current(),false);f.core.dispose();}
});
test('новый DOM редактора / удалённый root не подходят прежнему host',()=>{
  for(const change of [f=>f.root.isConnected=false,f=>f.editor.isConnected=false,f=>f.setEditor({...f.editor})]){const f=fixture();change(f);assert.equal(f.host.current(),false);f.core.dispose();}
});
test('язык наставника и материала независимо участвуют в границе',()=>{
  for(const change of [f=>f.setLocale('en'),f=>f.setCourseLocale('en')]){const f=fixture();change(f);assert.equal(f.host.current(),false);f.core.dispose();}
});
test('public offline без открытой копии даёт поиск, но не private selection',async()=>{
  const f=fixture({publicMode:true,anonymous:true});assert.equal((await search(f)).status,'ok');assert.equal((await context(f,['selection'])).status,'denied');f.core.dispose();
});
test('online без identity не авторизует даже публичную операцию через этот host',async()=>{const f=fixture({anonymous:true});assert.notEqual((await search(f)).status,'ok');f.core.dispose();});
test('diagnostics и model запрещены интеграцией; не создаётся скрытая отправка',async()=>{
  const f=fixture();assert.equal((await context(f,['selection','diagnostics'])).status,'denied');assert.equal((await f.core.invoke({capability:'model.generate',input:{providerId:'test',prompt:'hello'}})).status,'denied');f.core.dispose();
});
test('расхождение editor и workspace не выдаётся за актуальную selection',async()=>{const f=fixture();f.editor.value='other';assert.notEqual((await context(f,['selection'])).status,'ok');f.core.dispose();});
test('страница Akronikl является допустимым контекстом ядра',async()=>{
  const root={isConnected:true},identity={};const host=createUiHost({root,readIdentity:()=>identity,readRoute:()=>({view:'akronikl'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru'});const core=createAssistantCore({host:host.adapter});assert.equal((await core.invoke({capability:'context.current',input:{}})).status,'ok');core.dispose();
});
test('dispose закрывает host навсегда',()=>{const f=fixture();f.host.dispose();assert.equal(f.host.current(),false);f.core.dispose();});
test('уведомление invalidation синхронно предшествует session recheck и не выпускает маршрут',async()=>{
  const win=new EventTarget();win.Event=Event;const doc=new EventTarget();doc.hidden=false;
  const dto={account:{accountId:'synthetic-a',displayName:'Synthetic',status:'active'},loginMethods:[{id:'method',kind:'passkey',status:'active',createdAt:'2026-10-26',disabledAt:null}],enrollmentAvailable:false};
  let identity=null,release,delay=false,routes=0;const order=[];
  const bootstrap=createNexusBootstrap({windowImpl:win,documentImpl:doc,locationImpl:{origin:SERVER_ACCOUNT_ORIGIN,hash:'#view=home',replace(){}},prepareTransport:async()=>{},importApp:async()=>{},storage:{initializeAccountStorage(){identity=dto.account},lockAccountStorage(){identity=null},verifiedAccount:()=>identity},fetchImpl:async()=>{order.push('fetch');if(delay)await new Promise(r=>release=r);return Response.json(dto,{headers:{'cache-control':'no-store',vary:'*'}});}});
  assert.equal(await bootstrap.startNexus(),true);win.addEventListener('nexus:context-invalidated',()=>order.push('invalidate'));win.addEventListener('hashchange',()=>routes++);
  order.length=0;delay=true;win.dispatchEvent(new Event('hashchange'));assert.deepEqual(order,['invalidate','fetch']);assert.equal(routes,0);
  release();assert.equal(await bootstrap.recheck(),true);assert.equal(routes,1);bootstrap.dispose();
});
