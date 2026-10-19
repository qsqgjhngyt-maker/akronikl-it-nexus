import {initGalaxy} from './galaxy.js';
import {bindProviderButtons} from './oauth-client.js';
export const ENTRY_ORIGIN='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
export const ENTRY_URL=ENTRY_ORIGIN+'/account/entry/';
const accessURL=ENTRY_ORIGIN+'/account/access/';
const allowedViews=new Set(['home','academy','skills','akronikl','programming','labs','practices','projects','project-studio','account','feedback','reviews','feedback-admin','computer-graphics']);
export function destinationFor(hash=''){
 const supplied=new URLSearchParams(String(hash).replace(/^#/,'')),view=supplied.get('view'),safe=new URLSearchParams({view:allowedViews.has(view)?view:'home'});
 for(const key of ['course','lesson','practicum','project','template','tab','focus']){const value=supplied.get(key);if(!value)continue;if(key==='project'){if(value.length<=256&&value!=='.'&&value!=='..'&&!/[/\\\u0000-\u001f\u007f]/.test(value))safe.set(key,value)}else if(value.length<=160&&/^[A-Za-z0-9._:-]+$/.test(value))safe.set(key,value)}
 return ENTRY_ORIGIN+'/#'+safe.toString();
}
function eligible(body){return body?.account?.status==='active'&&typeof body.account.accountId==='string'&&body.account.accountId.length>0&&body.account.accountId.length<=256&&typeof body.account.displayName==='string'&&body.account.displayName.length<=512&&Array.isArray(body.loginMethods)&&body.enrollmentAvailable===false}
export async function readEntryAccount(locationRef=globalThis.location,fetchImpl=globalThis.fetch){
 if(locationRef?.origin!==ENTRY_ORIGIN)return{kind:'foreign'};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetchImpl('/api/v2/account',{credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,headers:{accept:'application/json'}});
  if(!response.headers.get('content-type')?.startsWith('application/json'))throw Error('SESSION_CHECK_FAILED');
  const text=await response.text();if(text.length>65536)throw Error('SESSION_CHECK_FAILED');const body=JSON.parse(text);
  if(response.status===200&&eligible(body))return{kind:'signed-in',account:body.account};
  if(response.status===401&&['SESSION_REQUIRED','SESSION_REJECTED'].includes(body?.error?.code))return{kind:'signed-out'};
  throw Error('SESSION_CHECK_FAILED');
 }finally{clearTimeout(timer)}
}
function bindEntry(){
 const login=document.querySelector('[data-login]'),label=document.querySelector('[data-login-label]'),status=document.querySelector('[data-status]'),welcome=document.querySelector('[data-account]'),name=document.querySelector('[data-account-name]'),switcher=document.querySelector('[data-switch]'),motion=document.querySelector('[data-motion]'),motionLabel=document.querySelector('[data-motion-label]');
 const scene=initGalaxy(document.querySelector('#galaxy'),{onMotionChange:moving=>{motion.setAttribute('aria-pressed',String(!moving));motionLabel.textContent=moving?'Остановить движение':'Включить движение';motion.setAttribute('aria-label',moving?'Остановить движение галактики':'Включить движение галактики')}});
 motion.addEventListener('click',()=>scene.setMotion(!scene.isMoving()));
 for(const link of document.querySelectorAll('[data-key-access]'))link.href=accessURL;
 let signedIn=false,busy=false,version=0,accessPromise=null;
 const setStatus=(text,tone='')=>{status.textContent=text;status.dataset.tone=tone};
 const setBusy=value=>{busy=value;login.setAttribute('aria-disabled',String(value));login.setAttribute('aria-busy',String(value));switcher.disabled=value};
 const clearAccount=()=>{signedIn=false;welcome.hidden=true;name.textContent='';switcher.hidden=true;label.textContent='Войти в Nexus';login.href=ENTRY_URL};
 const passkey=()=>{
  if(location.origin!==ENTRY_ORIGIN)return Promise.reject(Error('FIRST_PARTY_REQUIRED'));
  accessPromise??=import('/account/access/passkey-client.js').catch(error=>{accessPromise=null;throw error});return accessPromise;
 };
 if(location.origin!==ENTRY_ORIGIN){clearAccount();setStatus('Вход откроется на защищённом серверном адресе Nexus.');return}
 bindProviderButtons(document.querySelector('[data-provider-buttons]'),{onStatus:setStatus});
 const update=async()=>{
  const current=++version;setStatus('Проверяем вашу сессию. Войти ключом можно уже сейчас.');
  try{
   const result=await readEntryAccount();if(current!==version||busy)return;
   if(result.kind==='signed-in'){signedIn=true;name.textContent=result.account.displayName;welcome.hidden=false;switcher.hidden=false;label.textContent='Продолжить в Nexus';login.href=destinationFor(location.hash);setStatus('Вы вошли. Ваше пространство готово.','success')}
   else{clearAccount();setStatus('Вход ключом доступа: Windows Hello, телефон или аппаратный ключ.')}
  }catch{if(current===version&&!busy){clearAccount();setStatus('Не удалось проверить сессию. Вы по-прежнему можете войти ключом доступа.')}}
 };
 login.addEventListener('click',async event=>{
  if(signedIn&&!busy)return;
  event.preventDefault();if(busy)return;++version;setBusy(true);setStatus('Подтвердите вход на вашем устройстве.');
  try{const client=await passkey();await client.login();setStatus('Вход подтверждён. Открываем Nexus…','success');location.assign(destinationFor(location.hash))}
  catch(error){setStatus(error?.name==='NotAllowedError'?'Подтверждение отменено или истекло время ожидания. Можно попробовать ещё раз.':error?.message==='SESSION_REQUIRED'?'Сессия завершена. Повторите вход ключом.':'Не удалось завершить вход. Попробуйте ещё раз; ваш ключ остаётся на устройстве.','error')}
  finally{setBusy(false)}
 });
 switcher.addEventListener('click',async()=>{
  if(busy)return;++version;setBusy(true);setStatus('Завершаем текущую сессию…');
  try{const client=await passkey();await client.logout();clearAccount();location.replace(ENTRY_URL)}
  catch{setStatus('Не удалось подтвердить выход. Повторите смену аккаунта.','error')}
  finally{setBusy(false)}
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)update()});
 addEventListener('pagehide',()=>{++version;scene.destroy()},{once:true});
 update();
}
if(typeof document!=='undefined')bindEntry();
