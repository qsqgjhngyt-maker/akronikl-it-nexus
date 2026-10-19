// Presentation of the existing first-party Account API; no identity or sync storage writes.
import {RELEASE_CONTRACTS} from './ui1a-release-contracts.js';
import {serverAccountURL} from './server-account-origin.js';
let dispose=()=>{};
export function bindNexusAccountAccess(locale='ru'){
 dispose();const page=document.querySelector('[data-nexus-account]');if(!page)return;
 const en=locale==='en',controller=new AbortController(),signal=controller.signal;
 dispose=()=>controller.abort();
 const words=en?{title:'Sign in to Nexus',checking:'Checking your session…',unavailable:'Server sign-in is not connected yet.',signedOut:'Sign in with a passkey to send feedback and manage your keys.',signedIn:'You are signed in to Nexus.',login:'Sign in with a passkey',keys:'Manage passkeys',logout:'Sign out',retry:'Check again',failed:'Could not end the session. Try again.'}:{title:'Вход в Nexus',checking:'Проверяем сессию…',unavailable:'Серверный вход пока не подключён.',signedOut:'Войдите ключом доступа, чтобы отправлять обратную связь и управлять ключами.',signedIn:'Вы вошли в Nexus.',login:'Войти ключом доступа',keys:'Управлять ключами',logout:'Выйти',retry:'Проверить снова',failed:'Не удалось завершить сессию. Повторите попытку.'};
 const panel=document.createElement('section');panel.className='account-panel glass-panel nexus-account-access';panel.dataset.nexusAccountAccess='';
 panel.innerHTML='<h2></h2><strong data-access-name hidden></strong><p data-access-status role="status" aria-live="polite"></p><div class="account-actions"><a class="btn primary" data-access-login href="/account/access/" hidden></a><button class="btn ghost" data-access-logout type="button" hidden></button><button class="btn ghost" data-access-refresh type="button"></button></div>';
 panel.querySelector('h2').textContent=words.title;
 page.querySelector('.account-page-head').after(panel);
 const name=panel.querySelector('[data-access-name]'),status=panel.querySelector('[data-access-status]'),login=panel.querySelector('[data-access-login]'),logout=panel.querySelector('[data-access-logout]'),refresh=panel.querySelector('[data-access-refresh]');
 const methodStatus=[...page.querySelectorAll('.account-security-list li')].find(node=>node.textContent.trim().startsWith('Passkey / WebAuthn'));
 const setAvailability=available=>{if(methodStatus)methodStatus.textContent='Passkey / WebAuthn · '+(available?(en?'available':'доступен'):(en?'not connected':'не подключён'))};
 logout.textContent=words.logout;refresh.textContent=words.retry;
 const read=async path=>{const response=await fetch(path,{credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(6000)]),headers:{accept:'application/json'}});const text=await response.text();if(text.length>65536)throw Error('Response limit');return {status:response.status,body:JSON.parse(text)}};
 let version=0;
 const update=async()=>{
  if(!RELEASE_CONTRACTS.serverPasskeyAccess){name.hidden=true;logout.hidden=true;login.href=serverAccountURL('access');login.textContent=words.login;login.hidden=false;status.textContent=en?'Passkey sign-in opens on the Nexus server. Your projects on this device stay here.':'Вход ключом откроется на серверном адресе Nexus. Локальные проекты на этом устройстве останутся здесь.';panel.dataset.state='server-link';setAvailability(true);return}
  const current=++version;name.hidden=true;name.textContent='';login.hidden=true;logout.hidden=true;refresh.disabled=true;status.textContent=words.checking;panel.dataset.state='checking';
  try{
   const [account,keys]=await Promise.all([read('/api/v2/account'),read('/api/v2/account/passkey/keys')]);
   if(signal.aborted||!panel.isConnected||current!==version)return;
   if(account.status===200&&account.body.account?.status==='active'&&typeof account.body.account.accountId==='string'&&account.body.account.accountId.length>0&&typeof account.body.account.displayName==='string'&&account.body.account.displayName.length<=512&&Array.isArray(account.body.loginMethods)&&account.body.enrollmentAvailable===false&&keys.status===200&&Array.isArray(keys.body.keys)){
    name.textContent=account.body.account.displayName;name.hidden=false;status.textContent=words.signedIn;login.textContent=words.keys;login.hidden=false;logout.hidden=false;panel.dataset.state='signed-in';setAvailability(true);
   }else if(account.status===401&&keys.status===401&&['SESSION_REQUIRED','SESSION_REJECTED'].includes(account.body.error?.code)&&keys.body.error?.code==='SESSION_REQUIRED'){
    status.textContent=words.signedOut;login.textContent=words.login;login.hidden=false;panel.dataset.state='signed-out';setAvailability(true);
   }else{status.textContent=words.unavailable;panel.dataset.state='unavailable';setAvailability(false)}
  }catch{if(!signal.aborted&&panel.isConnected&&current===version){status.textContent=words.unavailable;panel.dataset.state='unavailable';setAvailability(false)}}
  finally{if(!signal.aborted&&current===version)refresh.disabled=false}
 };
 refresh.addEventListener('click',update,{signal});
 logout.addEventListener('click',async()=>{logout.disabled=true;try{const response=await fetch('/api/v2/account/passkey/logout',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(6000)]),headers:{'content-type':'application/json','x-nexus-passkey-write':'1'},body:'{}'});if(!response.ok)throw Error('Logout failed');await update()}catch{if(!signal.aborted&&panel.isConnected)status.textContent=words.failed}finally{if(!signal.aborted)logout.disabled=false}},{signal});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()},{signal});
 window.addEventListener('focus',update,{signal});
 update();
}
