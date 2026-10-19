// Только in-memory Storage/fetch. Никаких реальных браузерных профилей или сети.
import assert from 'node:assert/strict';
import {initializeAccountStorage,verifiedAccount} from '../core/account-storage.js';
import {SERVER_ACCOUNT_ORIGIN} from '../core/server-account-origin.js';
class MemoryStorage{constructor(){this.data=new Map()}get length(){return this.data.size}key(n){return [...this.data.keys()][n]??null}getItem(k){return this.data.get(k)??null}setItem(k,v){this.data.set(k,String(v))}removeItem(k){this.data.delete(k)}}
globalThis.location={origin:SERVER_ACCOUNT_ORIGIN};globalThis.localStorage=new MemoryStorage();globalThis.sessionStorage=new MemoryStorage();
const events=new EventTarget();globalThis.window=events;let ended=0;events.addEventListener('nexus:session-ended',()=>ended++);
const {feedbackApi}=await import('../feedback/client.js');
const A='synthetic-feedback-account-a';let mode='normal',calls=[],checks=0,resolvePending;
const pending=new Promise(resolve=>{resolvePending=resolve});
globalThis.fetch=async(path,options)=>{
  calls.push({path,options});const h=new Headers(options.headers);
  assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.equal(h.has('authorization'),false);assert.equal(h.has('cookie'),false);
  if(path.startsWith('/api/v2/feedback/reviews')){assert.equal(h.has('x-nexus-feedback-account'),false);return Response.json({reviews:[{body:'Synthetic public review'}]})}
  assert.equal(h.get('x-nexus-feedback-account'),A);
  if(options.method!=='GET'){assert.equal(h.get('x-nexus-feedback-write'),'1');assert.equal(h.get('content-type'),'application/json')}
  if(mode==='forbidden')return Response.json({error:{code:'MODERATOR_REQUIRED'}},{status:403});
  if(mode==='pending')return pending;
  if(mode==='changed-cookie')return Response.json({error:{code:'SESSION_REQUIRED'}},{status:401});
  return Response.json({account:{id:A},items:[],ok:true});
};
async function check(name,fn){await fn();checks++;console.log('PASS '+name)}
await check('Без verified context private запрос не начинается',async()=>{assert.equal(verifiedAccount(),null);await assert.rejects(feedbackApi('/api/v2/feedback/me'),e=>e.code==='SESSION_REQUIRED'&&e.status===401);assert.equal(calls.length,0)});
await check('Public reviews не требуют аккаунт и не раскрывают expectation',async()=>{const result=await feedbackApi('/api/v2/feedback/reviews?limit=3');assert.equal(result.reviews.length,1);assert.equal(calls.length,1)});
initializeAccountStorage({account:{accountId:A,displayName:'Synthetic',status:'active'}});
await check('Private чтение отправляет account ID только из verified context',async()=>{const result=await feedbackApi('/api/v2/feedback/me');assert.equal(result.account.id,A);assert.equal(ended,0)});
await check('Private POST/PATCH подписывают тот же account expectation заголовком',async()=>{for(const [path,method] of [['/api/v2/feedback/items','POST'],['/api/v2/feedback/items/synthetic-item','PATCH']])await feedbackApi(path,{method,body:{kind:'message',body:'Synthetic payload'}});assert.equal(ended,0)});
await check('Отсутствие прав модерации не завершает действительную сессию',async()=>{mode='forbidden';await assert.rejects(feedbackApi('/api/v2/feedback/moderation'),e=>e.code==='MODERATOR_REQUIRED'&&e.status===403);assert.equal(verifiedAccount().accountId,A);assert.equal(ended,0)});
await check('Произвольные API не проходят Feedback adapter',async()=>{const before=calls.length;await assert.rejects(feedbackApi('/api/v2/account'),e=>e.code==='INVALID_PATH');assert.equal(calls.length,before)});
await check('Смена общей cookie блокирует facade и вызывает немедленный выход',async()=>{
  mode='pending';const oldRequest=feedbackApi('/api/v2/feedback/me');
  mode='changed-cookie';await assert.rejects(feedbackApi('/api/v2/feedback/me'),e=>e.code==='SESSION_REQUIRED'&&e.status===401);
  assert.equal(verifiedAccount(),null);assert.equal(ended,1);
  resolvePending(Response.json({account:{id:'must-not-reach-ui'},items:[{body:'must-not-reach-ui'}]}));
  await assert.rejects(oldRequest,e=>e.code==='SESSION_REQUIRED'&&e.status===401);assert.equal(ended,2);
});
await check('После lock новый private запрос не доходит до транспорта',async()=>{const before=calls.length;await assert.rejects(feedbackApi('/api/v2/feedback/me'),e=>e.code==='SESSION_REQUIRED');assert.equal(calls.length,before)});
console.log(JSON.stringify({status:'PASS',checks,syntheticOnly:true,network:false,servers:false,browser:false}));
