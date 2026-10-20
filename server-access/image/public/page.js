import{register,login,listKeys,revokeKey,logout,message,inspectInvitation,registrationPolicy,createAccount}from'./passkey-client.js';
let en=false;try{en=JSON.parse(localStorage.getItem('akronikl:it-nexus:prefs:v1')||'{}').uiLocale==='en'}catch{}
document.documentElement.lang=en?'en':'ru';
if(en){
 document.title='Nexus · Passkey';
 for(const [selector,text] of [['h1','Your key to Nexus'],['main>p','Sign in with Windows Hello, your phone or a security key. Confirmation takes place on your device.'],['#login','Sign in with a passkey'],['#refresh','My passkeys'],['#logout','Sign out'],['details>summary','First key or account recovery'],['details>p','An administrator issues a one-time invitation linked to your account. A recovery invitation replaces previous keys and revokes sessions.'],['label[for=invitation]','One-time invitation'],['#register','Create a key'],['section>h2','Backup access'],['section>p','Add a second key on another device. Sign in again before managing keys.'],['#add','Add a second key'],['a[href="/#view=account"]','Return to Nexus →'],['footer','Passwords, biometrics and the private part of your key are not sent to Nexus. Contact your administrator for recovery if all keys are lost.']])document.querySelector(selector).textContent=text;
 document.querySelector('section').setAttribute('aria-label','Passkeys');
}
const status=document.querySelector('#status'),buttons=()=>document.querySelectorAll('button');
async function showKeys(){const{keys}=await listKeys();const root=document.querySelector('#keys');root.replaceChildren();for(const[keyIndex,key]of keys.entries()){const row=document.createElement('div');row.className='key';const title=document.createElement('span');title.textContent=en?`Key ${keyIndex+1} · ${key.status==='active'?'active':'disabled'}`:`Ключ ${keyIndex+1} · ${key.status==='active'?'действует':'отключён'}`;row.append(title);if(key.status==='active'){const button=document.createElement('button');button.textContent=en?'Disable':'Отключить';button.onclick=()=>run(async()=>{await revokeKey(key.id);await showKeys();return en?'Key disabled.':'Ключ отключён.'});row.append(button)}root.append(row)}if(!keys.length)root.textContent=en?'No keys yet.':'Ключей пока нет.'}
let busy=false,attempt=null;
async function run(action){if(busy)return;busy=true;buttons().forEach(b=>b.disabled=true);status.textContent=en?'Waiting for confirmation…':'Ожидаем подтверждение…';try{status.textContent=await action()}catch(e){status.textContent=message(e,en?'en':'ru')}finally{busy=false;buttons().forEach(b=>b.disabled=false)}}
async function openVerifiedAccount(){
 const proof=await fetch('/api/v2/account',{credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000),headers:{accept:'application/json'}});
 if(proof.status!==200||!proof.headers.get('content-type')?.startsWith('application/json'))throw Error('SESSION_REQUIRED');
 const text=await proof.text();if(text.length>65536)throw Error('SESSION_REQUIRED');const dto=JSON.parse(text);
 if(dto.account?.status!=='active'||typeof dto.account.accountId!=='string'||!dto.account.accountId||dto.enrollmentAvailable!==false||!Array.isArray(dto.loginMethods))throw Error('SESSION_REQUIRED');
 location.assign(location.origin+'/index.html#view=home');
}
document.querySelector('#login').onclick=()=>run(async()=>{await login();await openVerifiedAccount();return en?'Opening Nexus…':'Открываем Nexus…'});
document.querySelector('#public-register').addEventListener('submit',event=>{
 event.preventDefault();run(async()=>{
  const form=event.currentTarget,username=form.elements.username,displayName=form.elements.displayName;
  username.value=username.value.trim().toLowerCase();displayName.value=displayName.value.trim();if(!form.reportValidity())return en?'Choose a login and a display name.':'Укажите логин и отображаемое имя.';
  const controller=new AbortController();attempt=controller;let phase='options';
  const titles=en?{options:'Requesting registration',webauthn:'Confirm creating a key on your device',verify:'Verifying your key on the server'}:{options:'Получаем запрос для создания аккаунта',webauthn:'Подтвердите создание ключа на устройстве',verify:'Проверяем новый ключ на сервере'};
  try{
   await createAccount({username:username.value,displayName:displayName.value},{signal:controller.signal,onStage:value=>{phase=value;status.textContent=titles[value]+'…'}});
   form.hidden=true;document.querySelector('#login').focus();
   return en?'Account and key created. Click “Sign in with a passkey” to open Nexus.':'Аккаунт и ключ созданы. Нажмите «Войти ключом», чтобы открыть Nexus.';
  }catch(error){
   if(phase==='verify'&&!['USERNAME_UNAVAILABLE','REGISTRATION_CLOSED','ALPHA_CAPACITY_REACHED','PASSKEY_REJECTED','CHALLENGE_REJECTED'].includes(error.message))return en?'The result is unconfirmed. Try signing in with the key you created. Registration will not repeat automatically.':'Результат создания ключа не подтверждён. Попробуйте войти созданным ключом. Регистрация автоматически не повторяется.';
   throw error;
  }finally{attempt=null}
 });
});
let invitationInfo=null,invitationVersion=0;
async function inspect(){
 const token=document.querySelector('#invitation').value.trim(),generation=++invitationVersion;
 invitationInfo=null;
 if(!/^npi_[A-Za-z0-9_-]{43}$/.test(token))throw Error('ENROLLMENT_REQUIRED');
 const result=await inspectInvitation(token);
 if(generation!==invitationVersion||document.querySelector('#invitation').value.trim()!==token)return null;
 invitationInfo={...result,token};
 const fields=document.querySelector('#invitation-profile');fields.hidden=!result.profileRequired;
 for(const field of fields.querySelectorAll('input'))field.required=result.profileRequired;
 return invitationInfo;
}
document.querySelector('#check-invitation').onclick=()=>run(async()=>{const result=await inspect();return result?.profileRequired?'Приглашение действительно. Выберите логин и имя.':'Приглашение действительно. Можно создать ключ.'});
document.querySelector('#invitation').addEventListener('input',()=>{++invitationVersion;invitationInfo=null;document.querySelector('#invitation-profile').hidden=true});
document.querySelector('#register').onclick=()=>run(async()=>{
 const field=document.querySelector('#invitation'),token=field.value.trim();
 const info=invitationInfo?.token===token?invitationInfo:await inspect();if(!info)return 'Проверьте приглашение ещё раз.';
 const username=document.querySelector('#new-username'),displayName=document.querySelector('#new-display-name');
 if(info.profileRequired){
  username.value=username.value.trim().toLowerCase();displayName.value=displayName.value.trim();
  if(!username.reportValidity()||!displayName.reportValidity())return 'Выберите уникальный логин и укажите отображаемое имя.';
 }
 await register(token,info.profileRequired?{username:username.value,displayName:displayName.value}:{});
 field.value='';invitationInfo=null;
 await openVerifiedAccount();return 'Аккаунт создан. Открываем Nexus…';
});
const invitationFragment=new URLSearchParams(location.hash.slice(1)).get('invite');
if(invitationFragment!==null){
 history.replaceState(null,'',location.pathname);
 document.querySelector('details').open=true;
 if(/^npi_[A-Za-z0-9_-]{43}$/.test(invitationFragment)){
  document.querySelector('#invitation').value=invitationFragment;
  run(async()=>{await inspect();return 'Выберите уникальный логин и укажите имя для своего аккаунта.'});
 }else status.textContent='Приглашение недействительно. Запросите новую ссылку.';
}
addEventListener('pagehide',()=>{attempt?.abort();document.querySelector('#invitation').value='';invitationInfo=null;++invitationVersion});
if(invitationFragment===null){
 const policyStatus=document.querySelector('#registration-policy');
 Promise.all([registrationPolicy(),fetch('/api/v2/account',{credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000),headers:{accept:'application/json'}})]).then(([policy,account])=>{
  // A failed account read is never treated as permission to create another identity.
  if(account.status===200){policyStatus.textContent=en?'You are already signed in. Manage your keys below.':'Вы уже вошли. Управляйте своими ключами ниже.';return}
  if(account.status!==401)throw Error('SESSION_CHECK_FAILED');
  document.querySelector('#public-register').hidden=!policy.available;
  policyStatus.textContent=policy.available?(en?'Create a Nexus account without a social provider or password.':'Создайте аккаунт Nexus без соцсети и пароля.'):policy.reason==='capacity'?(en?'No registration places are available.':'Свободных мест для регистрации пока нет.'):(en?'Registration is by invitation. Request a link from the administrator.':'Регистрация доступна по приглашению. Запросите ссылку у администратора.');
 }).catch(()=>{policyStatus.textContent=en?'Registration availability could not be checked.':'Не удалось проверить доступность регистрации. Обновите страницу.'});
}
document.querySelector('#add').onclick=()=>run(async()=>{await register();await showKeys();return en?'Backup key added.':'Резервный ключ добавлен.'});
document.querySelector('#refresh').onclick=()=>run(async()=>{await showKeys();return en?'Key list refreshed.':'Список ключей обновлён.'});
document.querySelector('#logout').onclick=()=>run(async()=>{await logout();document.querySelector('#keys').replaceChildren();return en?'You are signed out of Nexus.':'Вы вышли из Nexus.'});
