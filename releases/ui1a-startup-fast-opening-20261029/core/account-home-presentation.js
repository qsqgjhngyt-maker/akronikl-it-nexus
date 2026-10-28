const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
// Только представление: connected передаёт вызывающая сторона с проверенным proof.
export function accountHomePresentation(a,locale='ru',{localCopy=false,locked=false}={}){
 const en=locale==='en',localTitle=locked?(en?'Your personal workspace':'Ваше личное пространство'):(en?'Local copy: ':'Личная копия: ')+(a.displayName||'');
 return `<section class="account-home-card glass-panel">
  <div class="account-home-icon"><span class="account-avatar large">${esc(a.avatar||'N')}</span></div>
  <div class="account-home-main"><span class="eyebrow">NEXUS ACCOUNT · ${localCopy?'LOCAL COPY':'FOUNDATION'}</span>
  <h2>${localCopy?esc(localTitle):a.connected?`${en?'Signed in as':'Вы авторизованы как'} ${esc(a.displayName)}`:(en?'Your Nexus identity starts here':'Ваш Nexus Account начинается здесь')}</h2>
  <p>${localCopy?(en?'Academy and editors work on this device. Cloud access requires a separate server sign-in; local changes are never uploaded automatically.':'Академия и редакторы работают на устройстве. Для облака нужен отдельный серверный вход; локальные изменения не отправляются автоматически.'):a.connected?(en?'This device is linked to the current Nexus Cloud account. Project Sync can use the same account identity.':'Это устройство связано с текущим Nexus Cloud аккаунтом. Project Sync использует ту же учётную запись.'):(en?'Learning and projects continue locally. Connect Nexus Cloud today; federated sign-in and passkeys are the next Identity v2 layer.':'Обучение и проекты продолжают работать локально. Сейчас можно подключить Nexus Cloud; федеративный вход и passkeys будут следующим слоем Identity v2.')}</p>
  <div class="account-home-meta"><span class="${!localCopy&&a.connected?'ok':''}">● ${esc(a.status)}</span>${!localCopy&&a.connected?`<span>${esc(a.host)}</span>`:''}</div></div>
  <div class="account-home-actions"><a class="btn primary" href="${localCopy?'#view=unlock':'#view=account'}">${localCopy?(en?'Personal copy':'Личная копия'):(en?'Open account':'Открыть аккаунт')}</a>${localCopy?`<a class="btn" href="/account/entry/">${en?'Sign in online':'Войти при подключении'}</a>`:a.connected?'':`<a class="btn" href="#view=account&tab=cloud">${en?'Connect Cloud':'Подключить Cloud'}</a>`}</div>
 </section>`;
}
