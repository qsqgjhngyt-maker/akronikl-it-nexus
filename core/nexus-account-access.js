// Presentation of the existing first-party Account API; no identity or sync storage writes.
import {RELEASE_CONTRACTS} from './ui1a-release-contracts.js';
import {serverAccountURL} from './server-account-origin.js';
let dispose=()=>{};
async function boundedRequest(signals,run){
 const controller=new AbortController(),abort=()=>controller.abort();
 const timer=setTimeout(abort,15000);
 for(const signal of signals){if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true})}
 try{return await run(controller.signal)}
 finally{clearTimeout(timer);for(const signal of signals)signal.removeEventListener('abort',abort)}
}
export function bindNexusAccountAccess(locale='ru'){
 dispose();const page=document.querySelector('[data-nexus-account]');if(!page)return;
 const en=locale==='en',controller=new AbortController(),signal=controller.signal;
 dispose=()=>controller.abort();
 const words=en?{title:'Sign in to Nexus',checking:'Checking your session… You can also sign in with a passkey.',unavailable:'Unable to check your session. Sign in with a passkey or try checking again.',signedOut:'Sign in with a passkey to send feedback and manage your keys.',signedIn:'You are signed in to Nexus.',login:'Sign in with a passkey',keys:'Manage passkeys',logout:'Sign out',retry:'Check again',failed:'Could not confirm sign-out. Check your session again.'}:{title:'Вход в Nexus',checking:'Проверяем сессию… Вы также можете войти ключом доступа.',unavailable:'Не удалось проверить вход. Можно войти ключом доступа или повторить проверку.',signedOut:'Войдите ключом доступа, чтобы отправлять обратную связь и управлять ключами.',signedIn:'Вы вошли в Nexus.',login:'Войти ключом доступа',keys:'Управлять ключами',logout:'Выйти',retry:'Проверить снова',failed:'Не удалось подтвердить выход. Повторите проверку сессии.'};
 const panel=document.createElement('section');panel.className='account-panel glass-panel nexus-account-access';panel.dataset.nexusAccountAccess='';
 panel.innerHTML='<h2></h2><strong data-access-name hidden></strong><p data-access-status role="status" aria-live="polite"></p><div class="account-actions"><a class="btn primary" data-access-login></a><button class="btn ghost" data-access-logout type="button" hidden></button><button class="btn ghost" data-access-refresh type="button"></button></div>';
 panel.querySelector('h2').textContent=words.title;
 page.querySelector('.account-page-head').after(panel);
 const name=panel.querySelector('[data-access-name]'),status=panel.querySelector('[data-access-status]'),login=panel.querySelector('[data-access-login]'),logout=panel.querySelector('[data-access-logout]'),refresh=panel.querySelector('[data-access-refresh]');
 const methodStatus=[...page.querySelectorAll('.account-security-list li')].find(node=>node.textContent.trim().startsWith('Passkey / WebAuthn'));
 const setAvailability=known=>{if(methodStatus)methodStatus.textContent='Passkey / WebAuthn · '+(known?(en?'available':'доступен'):(en?'session status not checked':'статус сессии не проверен'))};
 const showEntry=(label=words.login)=>{login.href=serverAccountURL('access');login.textContent=label;login.hidden=false};
 const clearIdentity=()=>{name.hidden=true;name.textContent='';logout.hidden=true};
 const signedOut=()=>{clearIdentity();showEntry();status.textContent=words.signedOut;panel.dataset.state='signed-out';setAvailability(true)};
 showEntry();logout.textContent=words.logout;refresh.textContent=words.retry;
 const read=(path,requestSignal)=>boundedRequest([signal,requestSignal],async fetchSignal=>{const response=await fetch(path,{credentials:'same-origin',cache:'no-store',redirect:'error',signal:fetchSignal,headers:{accept:'application/json'}});const text=await response.text();if(text.length>65536)throw Error('Response limit');return {status:response.status,body:JSON.parse(text)}});
 let version=0,inflight=null,loggingOut=false;
 const update=()=>{
  if(loggingOut)return Promise.resolve();
  if(inflight)return inflight.promise;
  if(!RELEASE_CONTRACTS.serverPasskeyAccess){clearIdentity();showEntry();status.textContent=en?'Passkey sign-in opens on the Nexus server. Your projects on this device stay here.':'Вход ключом откроется на серверном адресе Nexus. Локальные проекты на этом устройстве останутся здесь.';panel.dataset.state='server-link';setAvailability(true);return Promise.resolve()}
  const check={version:++version,controller:new AbortController(),promise:null};inflight=check;
  clearIdentity();showEntry();refresh.disabled=true;status.textContent=words.checking;panel.dataset.state='checking';
  check.promise=(async()=>{
   try{
    // Account Foundation alone determines the session; the key list belongs to its management page.
    const account=await read('/api/v2/account',check.controller.signal);
    if(signal.aborted||!panel.isConnected||check.version!==version)return;
    if(account.status===200&&account.body?.account?.status==='active'&&typeof account.body.account.accountId==='string'&&account.body.account.accountId.length>0&&typeof account.body.account.displayName==='string'&&account.body.account.displayName.length<=512&&Array.isArray(account.body.loginMethods)&&account.body.enrollmentAvailable===false){
     name.textContent=account.body.account.displayName;name.hidden=false;status.textContent=words.signedIn;showEntry(words.keys);logout.hidden=false;panel.dataset.state='signed-in';setAvailability(true);
    }else if(account.status===401&&['SESSION_REQUIRED','SESSION_REJECTED'].includes(account.body?.error?.code))signedOut();
    else{status.textContent=words.unavailable;panel.dataset.state='unavailable';setAvailability(false)}
   }catch{if(!signal.aborted&&panel.isConnected&&check.version===version){showEntry();status.textContent=words.unavailable;panel.dataset.state='unavailable';setAvailability(false)}}
   finally{if(inflight===check)inflight=null;if(!signal.aborted&&check.version===version)refresh.disabled=false}
  })();
  return check.promise;
 };
 refresh.addEventListener('click',update,{signal});
 logout.addEventListener('click',async()=>{
  if(loggingOut)return;loggingOut=true;++version;inflight?.controller.abort();inflight=null;
  clearIdentity();showEntry();logout.disabled=true;refresh.disabled=true;
  try{
   const response=await boundedRequest([signal],fetchSignal=>fetch('/api/v2/account/passkey/logout',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:fetchSignal,headers:{'content-type':'application/json','x-nexus-passkey-write':'1'},body:'{}'}));
   if(!response.ok)throw Error('Logout failed');
   if(!signal.aborted&&panel.isConnected)signedOut();
  }catch{if(!signal.aborted&&panel.isConnected){status.textContent=words.failed;panel.dataset.state='unavailable';setAvailability(false)}}
  finally{loggingOut=false;if(!signal.aborted){logout.disabled=false;refresh.disabled=false}}
 },{signal});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()},{signal});
 window.addEventListener('focus',update,{signal});
 update();
}
