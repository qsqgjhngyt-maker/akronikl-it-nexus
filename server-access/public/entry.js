import {initGalaxy} from './galaxy.js';
import {bindProviderButtons} from './oauth-client.js';
import {ensureSafeController} from '../../pwa/client.js';
export const ENTRY_ORIGIN='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
export const ENTRY_URL=ENTRY_ORIGIN+'/account/entry/';
const accessURL=ENTRY_ORIGIN+'/account/access/';
const allowedViews=new Set(['home','academy','skills','akronikl','programming','labs','practices','projects','project-studio','account','feedback','reviews','feedback-admin','computer-graphics','admin','blog']);
// Маркер перехода — только UX-подсказка; решение принимает /api/v2/account.
export function isOAuthReturnHint(hash=''){return new URLSearchParams(String(hash).replace(/^#/, '')).get('nexusLogin')==='oauth'}
export function destinationFor(hash=''){
 const supplied=new URLSearchParams(String(hash).replace(/^#/,'')),view=supplied.get('view'),safe=new URLSearchParams({view:allowedViews.has(view)?view:'home'});
 for(const key of ['course','lesson','practicum','project','template','tab','focus','article']){const value=supplied.get(key);if(!value)continue;if(key==='project'){if(value.length<=256&&value!=='.'&&value!=='..'&&!/[/\\\u0000-\u001f\u007f]/.test(value))safe.set(key,value)}else if(value.length<=160&&/^[A-Za-z0-9._:-]+$/.test(value))safe.set(key,value)}
 return ENTRY_ORIGIN+'/#'+safe.toString();
}
export function fullDocumentDestinationFor(hash='',locationRef=globalThis.location){
 const destination=new URL(destinationFor(hash));
 // Landing может быть выдана самим '/'. Смена только # не вызывает HTML gate.
 // Оба фиксированных пути обслуживает gate; query и внешний return URL не нужны.
 if(locationRef?.origin===ENTRY_ORIGIN&&locationRef.pathname===destination.pathname)destination.pathname='/index.html';
 return destination.href;
}
export function navigateToNexus(hash=globalThis.location?.hash||'',locationRef=globalThis.location){
 const destination=fullDocumentDestinationFor(hash,locationRef);locationRef.assign(destination);return destination;
}
function eligible(body){return body?.account?.status==='active'&&typeof body.account.accountId==='string'&&body.account.accountId.length>0&&body.account.accountId.length<=256&&typeof body.account.displayName==='string'&&body.account.displayName.length<=512&&Array.isArray(body.loginMethods)&&body.enrollmentAvailable===false}
export async function readEntryAccount(locationRef=globalThis.location,fetchImpl=globalThis.fetch,{signal}={}){
 if(locationRef?.origin!==ENTRY_ORIGIN)return{kind:'foreign'};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const requestSignal=signal?AbortSignal.any([signal,controller.signal]):controller.signal;requestSignal.throwIfAborted();
  const response=await fetchImpl('/api/v2/account',{credentials:'same-origin',cache:'no-store',redirect:'error',signal:requestSignal,headers:{accept:'application/json'}});
  requestSignal.throwIfAborted();
  if(!response.headers.get('content-type')?.startsWith('application/json'))throw Error('SESSION_CHECK_FAILED');
  const text=await response.text();requestSignal.throwIfAborted();if(text.length>65536)throw Error('SESSION_CHECK_FAILED');const body=JSON.parse(text);
  if(response.status===200&&eligible(body))return{kind:'signed-in',account:body.account};
  if(response.status===401&&['SESSION_REQUIRED','SESSION_REJECTED'].includes(body?.error?.code))return{kind:'signed-out'};
  throw Error('SESSION_CHECK_FAILED');
 }finally{clearTimeout(timer)}
}
export function bindEntry({loadPasskeyClient=()=>import('/account/access/passkey-client.js'),onDiagnostic=()=>{}}={}){
 const login=document.querySelector('[data-login]'),label=document.querySelector('[data-login-label]'),status=document.querySelector('[data-status]'),welcome=document.querySelector('[data-account]'),name=document.querySelector('[data-account-name]'),switcher=document.querySelector('[data-switch]'),motion=document.querySelector('[data-motion]'),motionLabel=document.querySelector('[data-motion-label]');
 const scene=initGalaxy(document.querySelector('#galaxy'),{onMotionChange:moving=>{motion.setAttribute('aria-pressed',String(!moving));motionLabel.textContent=moving?'Остановить движение':'Включить движение';motion.setAttribute('aria-label',moving?'Остановить движение галактики':'Включить движение галактики')}});
 motion.addEventListener('click',()=>scene.setMotion(!scene.isMoving()));
 for(const link of document.querySelectorAll('[data-key-access]'))link.href=accessURL;
 let signedIn=false,busy=false,version=0,accessPromise=null,activeAttempt=null,pageHidden=false;
 const setStatus=(text,tone='')=>{status.textContent=text;status.dataset.tone=tone};
 const setBusy=value=>{busy=value;login.setAttribute('aria-disabled',String(value));login.setAttribute('aria-busy',String(value));switcher.disabled=value};
 const clearAccount=()=>{signedIn=false;welcome.hidden=true;name.textContent='';switcher.hidden=true;label.textContent='Войти ключом доступа';login.href=ENTRY_URL};
 const passkey=()=>{
  if(location.origin!==ENTRY_ORIGIN)return Promise.reject(Error('FIRST_PARTY_REQUIRED'));
  accessPromise??=loadPasskeyClient().catch(error=>{accessPromise=null;throw error});return accessPromise;
 };
 if(location.origin!==ENTRY_ORIGIN){clearAccount();setStatus('Вход откроется на защищённом серверном адресе Nexus.');return}
 const providerContainer=document.querySelector('[data-provider-buttons]');
 const lockProviders=locked=>{for(const button of providerContainer?.querySelectorAll?.('button')||[])button.disabled=locked};
 bindProviderButtons(providerContainer,{onStatus:setStatus,acquire:()=>{if(busy)return false;++version;setBusy(true);return true},release:()=>setBusy(false)});
 // Consume a UX hint once even if Account read fails; a hint never proves identity.
 const oauthReturn=isOAuthReturnHint(location.hash);
 const oauthDestinationHash=new URL(destinationFor(location.hash)).hash;
 if(oauthReturn){try{globalThis.history?.replaceState?.(null,'',location.pathname+oauthDestinationHash)}catch{}}
 let oauthReturnPending=oauthReturn;
 const update=async()=>{
  const current=++version;setStatus('Проверяем вашу сессию. Войти ключом можно уже сейчас.');
  try{
   const result=await readEntryAccount();if(current!==version||busy)return;
   if(result.kind==='signed-in'){
    signedIn=true;name.textContent=result.account.displayName;welcome.hidden=false;switcher.hidden=false;
    label.textContent='Продолжить в Nexus';login.href=fullDocumentDestinationFor(location.hash);
    setStatus('Вы вошли. Ваше пространство готово.','success');
    if(oauthReturnPending){
     // После внешнего OAuth strict cookie сначала подтверждается same-origin запросом.
     // Маркер удаляется из истории ДО полной навигации во избежание redirect-loop.
     const destination=fullDocumentDestinationFor(oauthDestinationHash);
     oauthReturnPending=false;
     setStatus('Вход подтверждён. Открываем Nexus…','success');
     location.assign(destination);
    }
   }else{
    clearAccount();setStatus('Вход ключом доступа: Windows Hello, телефон или аппаратный ключ.');
    if(oauthReturnPending){
     oauthReturnPending=false;
     setStatus('Сессия после внешнего входа не подтверждена. Попробуйте войти снова.','error');
    }
   }
  }catch{if(current===version&&!busy){oauthReturnPending=false;clearAccount();setStatus('Не удалось проверить серверную сессию. Повторите проверку, обновив страницу, или войдите ключом доступа.','error')}}
 };
 login.addEventListener('click',async event=>{
  if(signedIn&&!busy){
   login.href=fullDocumentDestinationFor(location.hash);
   if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button>0)return;
   event.preventDefault();navigateToNexus(location.hash);return;
  }
  event.preventDefault();if(busy||pageHidden)return;const attempt=++version,controller=new AbortController();activeAttempt={controller,ticker:null};setBusy(true);lockProviders(true);oauthReturnPending=false;
  const timings={},titles={client:'Загружаем вход',options:'Получаем запрос сервера',webauthn:'Подтвердите вход: Windows Hello, телефон или ключ',verify:'Проверяем подтверждение на сервере',session:'Проверяем серверную сессию'};
  let phase='client',phaseStart=performance.now(),client;
  const diagnostic=(stage,state,durationMs)=>{try{onDiagnostic({stage,state,...(Number.isFinite(durationMs)?{durationMs}:{})})}catch{}};
  const start=stage=>{phase=stage;phaseStart=performance.now();diagnostic(stage,'start');setStatus(titles[stage]+'…')};
  const finish=(stage,state='complete',durationMs=Math.round(performance.now()-phaseStart))=>{timings[stage]=durationMs;diagnostic(stage,state,durationMs)};
  const summary=()=>Object.entries(timings).map(([stage,ms])=>(stage==='webauthn'?'Подтверждение на устройстве':titles[stage])+': '+(ms/1000).toFixed(1)+' с').join('; ');
  start('client');const ticker=setInterval(()=>{if(attempt===version)setStatus(titles[phase]+'… '+Math.floor((performance.now()-phaseStart)/1000)+' с')},1000);activeAttempt.ticker=ticker;
  try{
   client=await passkey();if(attempt!==version)return;finish('client');
   await client.login({signal:controller.signal,onStage:event=>{if(attempt!==version||!['options','webauthn','verify'].includes(event?.stage))return;if(event.state==='start')start(event.stage);else finish(event.stage,event.state,event.durationMs)}});
   if(attempt!==version)return;
   start('session');const result=await readEntryAccount(globalThis.location,globalThis.fetch,{signal:controller.signal});if(attempt!==version)return;finish('session');
   if(result.kind!=='signed-in')throw Error('SESSION_NOT_ESTABLISHED');
   signedIn=true;name.textContent=result.account.displayName;
   clearInterval(ticker);setStatus('Вход подтверждён. Открываем Nexus… '+summary(),'success');diagnostic('navigation','start');navigateToNexus(location.hash);
  }catch(error){
   clearInterval(ticker);if(attempt!==version)return;if(timings[phase]===undefined)finish(phase,'error');
   const cancelled=error?.name==='NotAllowedError'||error?.message==='PASSKEY_CANCELLED';
   const reason=cancelled?'Подтверждение отменено или истекло время ожидания. Можно попробовать ещё раз.':error?.message==='ALPHA_ACCESS_CLOSED'?'Доступ к Nexus закрыт. Обратитесь к администратору.':phase==='client'?'Не удалось загрузить клиент входа. Попробуйте ещё раз.':phase==='session'?'Серверная сессия не подтверждена. Обновите страницу для проверки; повторный вход автоматически не запускается.':phase==='verify'?'Сервер не подтвердил результат входа. Обновите страницу для проверки сессии.':error?.message==='INGRESS_REJECTED'?'Сервер отклонил передачу Cookie. Вход не завершён.':client?.message?.(error)||'Не удалось получить запрос для входа. Попробуйте ещё раз.';
   status.dataset.authStage=phase;
   status.dataset.authCode=['ALPHA_ACCESS_CLOSED','INGRESS_REJECTED','FLOW_REQUIRED','CHALLENGE_REJECTED','PASSKEY_REJECTED','RATE_LIMITED','PASSKEY_UNAVAILABLE','PASSKEY_RESPONSE_INVALID','ISSUANCE_UNCONFIRMED','SESSION_NOT_ESTABLISHED'].includes(error?.message)?error.message:cancelled?'CANCELLED':'UNCONFIRMED';
   setStatus(reason+' '+summary(),'error');
  }finally{clearInterval(ticker);if(attempt===version){activeAttempt=null;setBusy(false);lockProviders(false)}}
 });
 switcher.addEventListener('click',async()=>{
  if(busy||pageHidden)return;const attempt=++version,controller=new AbortController();activeAttempt={controller,ticker:null};setBusy(true);lockProviders(true);setStatus('Завершаем текущую сессию…');
  try{const client=await passkey();if(attempt!==version)return;await client.logout({signal:controller.signal});if(attempt!==version)return;clearAccount();location.replace(ENTRY_URL)}
  catch{if(attempt===version)setStatus('Не удалось подтвердить выход. Повторите смену аккаунта.','error')}
  finally{if(attempt===version){activeAttempt=null;setBusy(false);lockProviders(false)}}
 });
 document.addEventListener('visibilitychange',()=>{if(!pageHidden&&!document.hidden&&!busy)update()});
 addEventListener('pagehide',()=>{pageHidden=true;++version;oauthReturnPending=false;if(activeAttempt){activeAttempt.controller.abort();clearInterval(activeAttempt.ticker);activeAttempt=null;setBusy(false);lockProviders(false)}scene.destroy()});
 // Reconcile a possibly committed session after Back; never repeat a write.
 addEventListener('pageshow',event=>{if(event.persisted){pageHidden=false;if(!busy)update()}});
 return update();
}
if(typeof document!=='undefined')ensureSafeController({onWaiting:message=>{const status=document.querySelector('[data-status]');if(status)status.textContent=message}}).then(()=>bindEntry()).catch(()=>{const status=document.querySelector('[data-status]');if(status)status.textContent='Не удалось безопасно обновить офлайн-защиту. Восстановите подключение и откройте Nexus снова.'});
