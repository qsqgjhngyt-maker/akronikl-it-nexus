const ORIGIN='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const loginForm=document.getElementById('login-form');
const enrollForm=document.getElementById('enroll-form');
const status=document.getElementById('status');
const section=document.getElementById('enroll-section');
let running=false;
const show=(message,error=false)=>{status.textContent=message;status.dataset.error=String(error)};
function busy(value){
 running=value;
 for(const button of document.querySelectorAll('button[type=submit]'))button.disabled=value;
}
const messages={
 INVALID_INPUT:'Проверьте заполненные поля.',
 USERNAME_UNAVAILABLE:'Такой логин Nexus уже занят.',
 ENROLLMENT_REQUIRED:'Приглашение недействительно, истекло или привязано к другой почте.',
 RATE_LIMITED:'Слишком много попыток. Повторите позднее.',
 PASSWORD_UNAVAILABLE:'Вход по почте сейчас недоступен. Обратитесь к администратору.',
 AUTH_FAILED:'Неверная почта или пароль либо доступ закрыт.',
 AUTH_UNCONFIRMED:'Вход не подтверждён. Попробуйте ещё раз.',
 ENROLLMENT_UNCONFIRMED:'Регистрация не подтверждена. Проверьте свой доступ с администратором.'
};
async function post(action,body){
 if(location.origin!==ORIGIN)throw Error('PASSWORD_UNAVAILABLE');
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch('/api/v2/account/password/'+action,{
   method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',
   headers:{'content-type':'application/json','x-nexus-password-write':'1','accept':'application/json'},
   body:JSON.stringify(body),signal:controller.signal
  });
  if(!response.headers.get('content-type')?.startsWith('application/json'))throw Error('PASSWORD_UNAVAILABLE');
  const text=await response.text();if(text.length>4096)throw Error('PASSWORD_UNAVAILABLE');
  const data=JSON.parse(text);
  if(!response.ok||data.ok!==true)throw Error(data?.error?.code||'PASSWORD_UNAVAILABLE');
  return data;
 }finally{clearTimeout(timer)}
}
async function perform(task){
 if(running)return;
 busy(true);
 try{await task()}catch(error){
  show(messages[error?.message]||'Операция не выполнена. Проверьте подключение или обратитесь к администратору.',true);
 }finally{busy(false)}
}
const invite=new URLSearchParams(location.hash.slice(1)).get('invite');
if(invite){
 // Invitation tokens live only in a URL fragment and are removed immediately from history.
 history.replaceState(null,'',location.pathname);
 section.open=true;
 document.getElementById('invitation').value=invite.slice(0,64);
 show('Приглашение обнаружено. Заполните форму создания пароля.');
}
loginForm.addEventListener('submit',event=>{
 event.preventDefault();
 void perform(async()=>{
  show('Проверяем вход…');
  await post('login',{
   email:document.getElementById('login-email').value,
   password:document.getElementById('login-password').value
  });
  document.getElementById('login-password').value='';
  show('Вход выполнен. Открываем Nexus…');
  location.assign(location.origin+'/index.html#view=home');
 });
});
enrollForm.addEventListener('submit',event=>{
 event.preventDefault();
 void perform(async()=>{
  const password=document.getElementById('new-password').value;
  if(password!==document.getElementById('confirm-password').value){
   show('Пароли не совпадают.',true);return;
  }
  show('Проверяем приглашение и создаём пароль…');
  await post('enroll',{
   invitationToken:document.getElementById('invitation').value,
   email:document.getElementById('enroll-email').value,
   username:document.getElementById('username').value,
   displayName:document.getElementById('display-name').value.trim(),
   password
  });
  document.getElementById('invitation').value='';
  document.getElementById('new-password').value='';
  document.getElementById('confirm-password').value='';
  loginForm.querySelector('#login-email').value=document.getElementById('enroll-email').value;
  section.open=false;
  show('Приглашение принято! Пароль создан. Теперь войдите через форму выше.');
 });
});
addEventListener('pagehide',()=>{
 for(const id of ['invitation','login-password','new-password','confirm-password']){
  document.getElementById(id).value='';
 }
});
