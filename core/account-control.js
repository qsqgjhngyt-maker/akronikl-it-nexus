import {verifiedAccount} from './account-storage.js';
import {accountControlRequest,controlMessage} from './account-control-api.js';
function verifiedCapabilities(value){
 if(!value||Object.keys(value).sort().join(',')!=='canManage,canModerate,canPurge,freshPasskey'||Object.values(value).some(item=>typeof item!=='boolean'))throw Error('CONTROL_UNAVAILABLE');
 return value;
}
export function adminAccountMarkup(){
 return '<section class="account-panel glass-panel" data-account-control><span class="eyebrow">ДОСТУП К NEXUS</span><h2>Управление пользователями</h2><p data-admin-status role="status">Проверяем доступ…</p><div data-admin-content hidden><div class="account-actions"><button class="btn" type="button" data-admin-confirm>Подтвердить ключом</button><button class="btn" type="button" data-admin-refresh>Обновить список</button></div><p data-admin-freshness role="status"></p><p data-admin-counts></p><p>После закрытия доступа появится действие «Удалить полностью». До полного удаления данные пользователя сохраняются.</p><form data-admin-settings class="admin-form"><label>Режим доступа<select name="mode"><option value="invite_only">Тестирование — по приглашениям</option><option value="open">Открытый доступ</option></select></label><p>В тестировании новые аккаунты создаются по приглашению. При открытом доступе — ключом Nexus или через настроенные провайдеры. Это настройка доступа, а не переключение облачного окружения.</p><label>Количество пользователей<select name="capacity"><option value="limited">С ограничением</option><option value="unlimited">Без ограничения</option></select></label><label>Лимит допущенных пользователей<input name="limit" type="number" min="1" max="10000" required></label><p>Считаются допущенные пользователи и действующие приглашения, а не одновременные сессии. Администраторы не занимают места. Без ограничения блокировки сохраняются.</p><label>Срок приглашения по умолчанию<select name="defaultInvitation"><option value="60">1 час</option><option value="1440" selected>24 часа</option><option value="10080">7 дней</option><option value="custom">Другой срок</option></select></label><label data-default-invitation-custom hidden>Часы действия ссылки<input name="defaultInvitationHours" type="number" min="1" max="168" step="1" value="24" disabled></label><label>Тестовый доступ по умолчанию<select name="defaultTrial"><option value="1440">24 часа</option><option value="10080" selected>7 дней</option><option value="custom">Другой срок</option><option value="unlimited">Без ограничения</option></select></label><label data-default-trial-custom hidden>Часы доступа<input name="defaultTrialHours" type="number" min="1" max="8760" step="1" value="24" disabled></label><p>Эти сроки применяются к новым приглашениям. Уже выданные приглашения и доступ сохраняют свои сроки.</p><button class="btn" type="submit">Сохранить настройки</button></form><form data-admin-invite class="admin-form"><label>Срок приглашения<select name="ttl"><option value="default" selected>Из основных настроек</option><option value="60">1 час</option><option value="1440">24 часа</option><option value="10080">7 дней</option><option value="custom">Другой срок</option></select></label><label data-invite-ttl-custom hidden>Часы действия ссылки<input name="ttlHours" type="number" min="1" max="168" step="1" value="24" disabled></label><label>Тестовый доступ после первого входа<select name="trial"><option value="default" selected>Из основных настроек</option><option value="1440">24 часа</option><option value="10080">7 дней</option><option value="custom">Другой срок</option><option value="unlimited">Без ограничения</option></select></label><label data-invite-trial-custom hidden>Количество часов<input name="trialHours" type="number" min="1" max="8760" step="1" value="24" disabled></label><p>Срок приглашения ограничивает принятие ссылки. Тестовый доступ начнётся при первом успешном входе.</p><button class="btn primary" type="submit">Создать приглашение</button></form><div data-invite-result hidden><p>Ссылка показана один раз. Скопируйте её и передайте нужному пользователю.</p><textarea data-invite-link readonly aria-label="Одноразовая ссылка приглашения"></textarea><button type="button" class="btn" data-invite-copy>Скопировать ссылку</button></div><div class="admin-toolbar"><label>Показать<select data-admin-filter><option value="all">Всех</option><option value="active">Активных</option><option value="invited">Приглашённых</option><option value="blocked">Заблокированных</option><option value="removed">С закрытым доступом</option><option value="unadmitted">Ожидающих допуска</option></select></label></div><div class="admin-table-scroll"><table class="admin-users"><thead><tr><th>Пользователь</th><th>Статус</th><th>Приглашение</th><th>Тестовый доступ</th><th>Последний вход</th><th>Действия</th></tr></thead><tbody data-admin-users></tbody></table></div><div class="account-actions"><button class="btn" type="button" data-admin-previous>Назад</button><span data-admin-page></span><button class="btn" type="button" data-admin-next>Далее</button></div><h3>Способы входа</h3><div data-admin-providers></div><details><summary>Журнал действий</summary><ol data-admin-audit></ol></details></div><dialog class="admin-action-dialog" data-admin-action-dialog><h2 data-admin-action-title>Изменение доступа</h2><p data-admin-action-summary></p><p data-admin-action-freshness role="status"></p><div class="account-actions"><button class="btn" type="button" data-admin-action-reauth>Подтвердить ключом доступа</button><button class="btn" type="button" data-admin-action-cancel>Отмена</button><button class="btn danger" type="button" data-admin-action-execute>Подтвердить</button></div><p data-admin-action-status role="status"></p></dialog><dialog data-purge-dialog><form method="dialog"><h2>Безвозвратное удаление</h2><p data-purge-summary></p><p>Удалятся аккаунт и его данные в рабочей серверной базе. Локальные копии, скачанные файлы и резервные копии не стираются удалённо. Совместные проекты требуют предварительной передачи владения.</p><p>Это действие нельзя отменить. Будет сохранена техническая запись об удалении без содержимого профиля и проектов.</p><label>Введите указанную фразу: <strong data-purge-phrase></strong><input data-purge-confirm autocomplete="off" required></label><label><input data-purge-agree type="checkbox" required> Я понимаю, что восстановление этих серверных данных невозможно</label><div class="account-actions"><button type="button" class="btn" data-purge-cancel>Отмена</button><button type="button" class="btn danger" data-purge-execute>Удалить безвозвратно</button></div><p data-purge-status role="status"></p></form></dialog></section>';
}
const stateNames={active:'Активен',invited:'Ожидает приглашение',blocked:'Заблокирован',removed:'Доступ закрыт',administrator:'Администратор',unadmitted:'Ожидает допуска'};
const actionNames={block:'Заблокировать',remove:'Закрыть доступ',restore:'Восстановить доступ','revoke-invite':'Отозвать приглашение',admit:'Допустить'};
const dates=value=>value?new Date(value).toLocaleString('ru-RU'):'Ещё не входил';
const clearPrivateControl=()=>{
 for(const field of document.querySelectorAll('[data-invite-link]'))field.value='';
 for(const dialog of document.querySelectorAll('[data-purge-dialog],[data-admin-action-dialog]'))dialog.close();
};
export async function bindAccountControl(){
 const accountId=verifiedAccount()?.accountId;if(!accountId)return;
 const accountRoot=document.querySelector('[data-unified-account]');if(!accountRoot)return;
 globalThis.addEventListener?.('pagehide',clearPrivateControl);
 const panel=accountRoot.querySelector('[data-account-control]');
 let capabilities;
 try{capabilities=verifiedCapabilities(await accountControlRequest('/api/v2/account/control/capabilities',{accountId}))}
 catch(error){if(panel)panel.querySelector('[data-admin-status]').textContent=controlMessage(error);return}
 if(!accountRoot.isConnected||verifiedAccount()?.accountId!==accountId)return;
 if(capabilities.canManage&&!accountRoot.querySelector('[data-admin-nav]')){
  const link=document.createElement('a');link.href='#view=admin&tab=users';link.textContent='Администрирование';link.dataset.adminNav='';
  if(panel){link.className='active';link.setAttribute('aria-current','page')}
  accountRoot.querySelector('.account-tabs')?.append(link);
 }
 if(!panel)return;
 if(!capabilities.canManage){panel.querySelector('[data-admin-status]').textContent='Этот раздел доступен только администратору.';return}
 if(panel.dataset.bound)return;panel.dataset.bound='true';
 panel.querySelector('[data-admin-content]').hidden=false;
 const status=panel.querySelector('[data-admin-status]'),table=panel.querySelector('[data-admin-users]'),filter=panel.querySelector('[data-admin-filter]'),settings=panel.querySelector('[data-admin-settings]'),dialog=panel.querySelector('[data-purge-dialog]');
 let busy=false,offset=0,latest=null,purge=null,accessPending=null;
 const accessDialog=panel.querySelector('[data-admin-action-dialog]');
 const current=()=>panel.isConnected&&verifiedAccount()?.accountId===accountId;
 const request=(path,options={})=>accountControlRequest('/api/v2/account/control'+path,{accountId,...options});
 const message=text=>{if(current())status.textContent=text};
 const lock=value=>{for(const button of panel.querySelectorAll('button'))button.disabled=value};
 async function execute(fn){
  if(busy||!current())return;busy=true;lock(true);
  try{await fn()}catch(error){if(error.code==='ADMIN_FRESH_PASSKEY_REQUIRED'||error.message==='ADMIN_FRESH_PASSKEY_REQUIRED')capabilities={...capabilities,freshPasskey:false};message(controlMessage(error));if(accessDialog.open)panel.querySelector('[data-admin-action-status]').textContent=controlMessage(error);if(dialog.open)panel.querySelector('[data-purge-status]').textContent=controlMessage(error)}
  finally{busy=false;if(current()){lock(false);pagination();freshness()}}
 }
 function pagination(){if(!latest)return;panel.querySelector('[data-admin-previous]').disabled=offset===0;panel.querySelector('[data-admin-next]').disabled=offset+50>=latest.total}
 function actionButton(cell,label,callback,danger=false){const button=document.createElement('button');button.type='button';button.className='btn'+(danger?' danger':'');button.textContent=label;button.addEventListener('click',()=>execute(callback));cell.append(button)}
 async function change(user,action){
  if(['block','remove','revoke-invite'].includes(action)){capabilities=verifiedCapabilities(await request('/capabilities'));if(!current())return;if(!capabilities.canManage)throw Error('ADMIN_REQUIRED');accessPending={user,action};panel.querySelector('[data-admin-action-title]').textContent=actionNames[action];panel.querySelector('[data-admin-action-summary]').textContent=actionNames[action]+' для '+(user.username||user.displayName)+'? Данные пользователя сохранятся; серверные сеансы будут закрыты.';panel.querySelector('[data-admin-action-execute]').textContent=actionNames[action];panel.querySelector('[data-admin-action-status]').textContent='';accessDialog.showModal();freshness();return;}
  await applyChange(user,action);
 }
 async function applyChange(user,action){
  message('Сохраняем изменение доступа…');
  await request('/users/'+encodeURIComponent(user.accountId)+'/action',{method:'POST',body:{requestId:crypto.randomUUID(),version:user.version,action}});
  message('Доступ обновлён.');await load();
 }
 async function previewPurge(user){
  capabilities=verifiedCapabilities(await request('/capabilities'));freshness();if(!capabilities.freshPasskey)throw Error('ADMIN_FRESH_PASSKEY_REQUIRED');
  const plan=await request('/users/'+encodeURIComponent(user.accountId)+'/purge-preview',{method:'POST',body:{requestId:crypto.randomUUID(),version:user.version}});
  if(!current())return;purge={user,plan};
  panel.querySelector('[data-purge-summary]').textContent='К удалению: проектов — '+plan.counts.projects+', пространств — '+plan.counts.workspaces+', отзывов и обращений — '+plan.counts.feedback+', ключей входа — '+plan.counts.keys+', привязок входа — '+plan.counts.providers+'.'+(Number.isSafeInteger(plan.counts.courseFinalAttempts)?' Итоговых работ курса — '+plan.counts.courseFinalAttempts+', сохранённых исходников и результатов — '+Math.ceil(plan.counts.courseFinalBytes/1024)+' КБ.':'')+(Number.isSafeInteger(plan.counts.assistantRecords)?' История и настройки помощника, сохранённые API-ключи'+(Number.isSafeInteger(plan.counts.assistantApiKeys)?' ('+plan.counts.assistantApiKeys+')':'')+' и его подключения также удалятся.':'');
  panel.querySelector('[data-purge-phrase]').textContent=plan.confirmation;panel.querySelector('[data-purge-confirm]').value='';panel.querySelector('[data-purge-agree]').checked=false;panel.querySelector('[data-purge-status]').textContent='';
  dialog.showModal();
 }
 function freshness(){const text=capabilities.freshPasskey?'Вход подтверждён. Сервер может запросить повторное подтверждение через пять минут.':'Для изменения доступа подтвердите вход ключом доступа.';panel.querySelector('[data-admin-freshness]').textContent=text;panel.querySelector('[data-admin-action-freshness]').textContent=capabilities.freshPasskey?'':text;panel.querySelector('[data-admin-action-reauth]').hidden=capabilities.freshPasskey;panel.querySelector('[data-admin-action-execute]').disabled=busy||!capabilities.freshPasskey;}
 function bindCustom(form,name,hours,selector){const update=()=>{const custom=form.elements[name].value==='custom';panel.querySelector(selector).hidden=!custom;form.elements[hours].disabled=!custom;};form.elements[name].addEventListener('change',update);update();}
 function durationValue(form,name,hours,selector,value){const select=form.elements[name],key=value===null?'unlimited':String(value);select.value=[...select.options].some(o=>o.value===key)?key:'custom';if(select.value==='custom')form.elements[hours].value=String(value/60);const custom=select.value==='custom';panel.querySelector(selector).hidden=!custom;form.elements[hours].disabled=!custom;}
 function invitationEditor(cell,user){
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Срок приглашения';details.append(summary);
  const label=document.createElement('label');label.textContent='Действие ссылки ';const select=document.createElement('select');select.innerHTML="<option value=\"60\">1 час</option><option value=\"1440\" selected>24 часа</option><option value=\"10080\">7 дней</option><option value=\"custom\">Другой срок</option>";label.append(select);details.append(label);
  const custom=document.createElement('label');custom.textContent='Количество часов ';custom.hidden=true;const hours=document.createElement('input');hours.type='number';hours.min='1';hours.max='168';hours.step='1';hours.value='24';custom.append(hours);details.append(custom);select.addEventListener('change',()=>{custom.hidden=select.value!=='custom'});
  const note=document.createElement('p');note.textContent='Меняет только срок принятия ссылки. Продление истёкшего приглашения начинается сейчас. Срок доступа после входа задаётся отдельно.';details.append(note);
  async function save(mode){const minutes=trialMinutes(select,hours);if(minutes>10080)throw Error('INVALID_INPUT');await request('/users/'+encodeURIComponent(user.accountId)+'/invitation',{method:'POST',body:{requestId:crypto.randomUUID(),version:user.version,mode,minutes}});message(mode==='extend'?'Приглашение продлено.':'Срок приглашения сохранён.');await load();}
  actionButton(details,'Установить срок ссылки',()=>save('set'));actionButton(details,'Продлить приглашение',()=>save('extend'));cell.append(details);
 }
 function trialMinutes(select,hours){
  if(select.value==='default')return 'default';
  if(select.value==='unlimited')return null;
  const value=select.value==='custom'?Number(hours.value)*60:Number(select.value);
  if(!Number.isInteger(value)||value<60||value>525600)throw Error('INVALID_INPUT');return value;
 }
 function trialEditor(cell,user){
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Срок доступа';details.append(summary);
  const label=document.createElement('label');label.textContent='Срок доступа ';const select=document.createElement('select');select.innerHTML="<option value=\"1440\">24 часа</option><option value=\"10080\" selected>7 дней</option><option value=\"custom\">Другой срок</option><option value=\"unlimited\">Без ограничения</option>";label.append(select);details.append(label);
  const custom=document.createElement('label');custom.textContent='Количество часов ';custom.hidden=true;const hours=document.createElement('input');hours.type='number';hours.min='1';hours.max='8760';hours.step='1';hours.value='24';custom.append(hours);details.append(custom);select.addEventListener('change',()=>{custom.hidden=select.value!=='custom'});
  const note=document.createElement('p');note.textContent=user.firstLoginAt||user.lastLoginAt?'Новый срок — от текущего момента. Продление — от окончания; для истёкшего доступа — от текущего момента.':'Отсчёт начнётся с первого успешного входа.';details.append(note);
  async function save(mode){const minutes=trialMinutes(select,hours);if(mode==='extend'&&minutes===null){message('Для продления выберите количество часов или дней.');return;}await request('/users/'+encodeURIComponent(user.accountId)+'/trial',{method:'POST',body:{requestId:crypto.randomUUID(),version:user.version,mode,minutes}});message(mode==='extend'?'Срок доступа продлён.':'Срок доступа сохранён.');await load();}
  actionButton(details,'Установить срок',()=>save('set'));
  if(user.trialMinutes!==null)actionButton(details,'Продлить',()=>save('extend'));
  cell.append(details);
 }
 async function load(){
  const data=await request('/users?state='+encodeURIComponent(filter.value)+'&offset='+offset);
  if(!current())return;latest=data;table.replaceChildren();
  panel.querySelector('[data-admin-counts]').textContent=(data.settings.limitEnabled?'Занято '+data.counts.occupied+' из '+data.settings.maxTesters+' мест.':'Без ограничения числа пользователей.')+' Допущено пользователей: '+data.counts.active+', зарезервировано: '+data.counts.reserved+'.';
  settings.elements.limit.value=String(data.settings.maxTesters);settings.elements.mode.value=data.settings.registrationMode;settings.elements.capacity.value=data.settings.limitEnabled?'limited':'unlimited';settings.elements.limit.disabled=!data.settings.limitEnabled;
  durationValue(settings,'defaultTrial','defaultTrialHours','[data-default-trial-custom]',data.settings.defaultTrialMinutes);durationValue(settings,'defaultInvitation','defaultInvitationHours','[data-default-invitation-custom]',data.settings.defaultInvitationMinutes);
  panel.querySelector('[data-admin-page]').textContent=data.total?'Пользователи '+(offset+1)+'–'+Math.min(offset+50,data.total)+' из '+data.total:'Пользователей нет';
  for(const user of data.users){
   const tr=document.createElement('tr');tr.dataset.accountId=user.accountId;
   for(const value of [(user.username?user.username+' · ':'')+user.displayName,stateNames[user.state],user.invitationCreatedAt?'Создано: '+dates(user.invitationCreatedAt)+'\nСсылка до: '+dates(user.invitationExpiresAt):'—',user.trialMinutes===null?'Без ограничения':(user.firstLoginAt?'Первый вход: '+dates(user.firstLoginAt):'От первого входа: '+user.trialMinutes/60+' ч')+(user.accessExpiresAt?'\nДо: '+dates(user.accessExpiresAt)+(Date.parse(user.accessExpiresAt)<=Date.now()?' · Срок истёк':''):''),dates(user.lastLoginAt)]){
    const td=document.createElement('td');td.textContent=value;td.style.whiteSpace='pre-line';tr.append(td);
   }
   const actions=document.createElement('td');actions.className='admin-user-actions';tr.append(actions);
   if(user.protected)actions.textContent='Защищённый аккаунт';
   else{
    if(user.state==='invited')invitationEditor(actions,user);
    if(['active','invited'].includes(user.state))trialEditor(actions,user);
    if(user.state==='active')actionButton(actions,actionNames.block,()=>change(user,'block'));
    if(user.state==='blocked'||user.state==='removed')actionButton(actions,actionNames.restore,()=>change(user,'restore'));
    if(user.state==='unadmitted')actionButton(actions,actionNames.admit,()=>change(user,'admit'));
    if(user.state==='invited')actionButton(actions,actionNames['revoke-invite'],()=>change(user,'revoke-invite'));
    else if(user.state!=='removed')actionButton(actions,actionNames.remove,()=>change(user,'remove'));
    if(user.state==='removed'&&capabilities.canPurge)actionButton(actions,'Удалить полностью',()=>previewPurge(user),true);
   }
   table.append(tr);
  }
  pagination();
  const audit=await request('/audit');if(!current())return;
  const list=panel.querySelector('[data-admin-audit]');list.replaceChildren();
  for(const event of audit.events){const item=document.createElement('li');item.textContent=dates(event.createdAt)+' · '+({settings:event.targetId?'Срок приглашения или доступа изменён':'Настройки изменены',invite:'Приглашение создано',block:'Доступ заблокирован',remove:'Доступ пользователя закрыт',restore:'Доступ восстановлен','revoke-invite':'Приглашение отозвано',purge:'Аккаунт удалён'}[event.action]||event.action);list.append(item)}
 }
 settings.elements.capacity.addEventListener('change',()=>{settings.elements.limit.disabled=settings.elements.capacity.value==='unlimited'});
 settings.addEventListener('submit',event=>{event.preventDefault();execute(async()=>{
  message('Сохраняем настройки доступа…');
  await request('/settings',{method:'POST',body:{requestId:crypto.randomUUID(),version:latest.settings.version,maxTesters:Number(settings.elements.limit.value),limitEnabled:settings.elements.capacity.value==='limited',registrationMode:settings.elements.mode.value,defaultTrialMinutes:trialMinutes(settings.elements.defaultTrial,settings.elements.defaultTrialHours),defaultInvitationMinutes:trialMinutes(settings.elements.defaultInvitation,settings.elements.defaultInvitationHours)}});
  message('Настройки сохранены.');await load();
 })});
 const inviteForm=panel.querySelector('[data-admin-invite]');
 bindCustom(inviteForm,'trial','trialHours','[data-invite-trial-custom]');
 bindCustom(inviteForm,'ttl','ttlHours','[data-invite-ttl-custom]');
 bindCustom(settings,'defaultTrial','defaultTrialHours','[data-default-trial-custom]');
 bindCustom(settings,'defaultInvitation','defaultInvitationHours','[data-default-invitation-custom]');
 inviteForm.addEventListener('submit',event=>{event.preventDefault();execute(async()=>{
  panel.querySelector('[data-invite-link]').value='';panel.querySelector('[data-invite-result]').hidden=true;
  const result=await request('/invites',{method:'POST',body:{requestId:crypto.randomUUID(),ttlMinutes:trialMinutes(inviteForm.elements.ttl,inviteForm.elements.ttlHours),trialMinutes:trialMinutes(inviteForm.elements.trial,inviteForm.elements.trialHours)}});
  if(!current())return;
  panel.querySelector('[data-invite-result]').hidden=false;panel.querySelector('[data-invite-link]').value=location.origin+'/account/access/#invite='+result.invitationToken;
  message('Приглашение создано. Действует до '+dates(result.expiresAt)+'.');await load();
 })});
 panel.querySelector('[data-invite-copy]').addEventListener('click',()=>execute(async()=>{await navigator.clipboard.writeText(panel.querySelector('[data-invite-link]').value);message('Ссылка скопирована.')}));
 async function confirmAdmin(){
  message('Подтвердите вход ключом на своём устройстве…');
  await(await import('/account/access/passkey-client.js')).login();
  capabilities=verifiedCapabilities(await request('/capabilities'));if(!capabilities.freshPasskey)throw Error('ADMIN_FRESH_PASSKEY_REQUIRED');message('Вход подтверждён. Можно управлять доступом.');freshness();await load();
 }
 panel.querySelector('[data-admin-confirm]').addEventListener('click',()=>execute(confirmAdmin));
 panel.querySelector('[data-admin-action-reauth]').addEventListener('click',()=>execute(confirmAdmin));
 panel.querySelector('[data-admin-action-cancel]').addEventListener('click',()=>{accessPending=null;accessDialog.close();});
 accessDialog.addEventListener('close',()=>{accessPending=null;});
 panel.querySelector('[data-admin-action-execute]').addEventListener('click',()=>execute(async()=>{if(!accessPending||!capabilities.freshPasskey)throw Error('ADMIN_FRESH_PASSKEY_REQUIRED');const chosen=accessPending;await applyChange(chosen.user,chosen.action);accessPending=null;accessDialog.close();}));
 panel.querySelector('[data-admin-refresh]').addEventListener('click',()=>execute(load));
 filter.addEventListener('change',()=>execute(async()=>{offset=0;await load()}));
 panel.querySelector('[data-admin-previous]').addEventListener('click',()=>execute(async()=>{offset=Math.max(0,offset-50);await load()}));
 panel.querySelector('[data-admin-next]').addEventListener('click',()=>execute(async()=>{offset+=50;await load()}));
 panel.querySelector('[data-purge-cancel]').addEventListener('click',()=>{purge=null;dialog.close()});
 dialog.addEventListener('close',()=>{purge=null});
 panel.querySelector('[data-purge-execute]').addEventListener('click',()=>execute(async()=>{
  if(!purge)return;
  if(!panel.querySelector('[data-purge-agree]').checked||panel.querySelector('[data-purge-confirm]').value!==purge.plan.confirmation){panel.querySelector('[data-purge-status]').textContent='Введите фразу подтверждения и отметьте согласие.';return}
  await request('/users/'+encodeURIComponent(purge.user.accountId)+'/purge',{method:'POST',body:{requestId:crypto.randomUUID(),version:purge.user.version,approvalToken:purge.plan.approvalToken,confirmation:panel.querySelector('[data-purge-confirm]').value}});
  dialog.close();message('Аккаунт и его серверные данные удалены.');await load();
 }));
 try{
  const providers=await request('/providers');
  if(current())for(const p of providers.providers){
   const section=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('p');
   title.textContent=p.label+': '+(p.configured?'настроен':'ожидает настройки');
   detail.textContent=p.configured?'Доступен на странице входа.':'Не заданы: '+p.missing.join(', ')+'. Адрес возврата: '+p.callbackURL;
   section.append(title,detail);panel.querySelector('[data-admin-providers]').append(section);
  }
  message(capabilities.freshPasskey?'Вход подтверждён. Управление доступно.':'Для изменений подтвердите вход ключом доступа.');
  freshness();await load();
 }catch(error){message(controlMessage(error))}
}
