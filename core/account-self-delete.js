import {verifiedAccount,clearVerifiedAccountData,lockAccountStorage} from './account-storage.js';
import {accountControlRequest,controlMessage} from './account-control-api.js';
const BASE='/api/v2/account/control/';
export const selfDeleteMarkup=en=>`<section class="account-panel glass-panel account-delete" data-self-delete><h2>${en?'Delete my account':'Удалить мой аккаунт'}</h2><p>${en?'Permanently delete your Nexus account and its server data, including projects, assistant history, settings and saved API keys. This cannot be undone.':'Безвозвратно удалить свой аккаунт Nexus и его серверные данные: проекты, историю ассистента, настройки и сохранённые API-ключи. Отменить удаление нельзя.'}</p><p>${en?'Downloaded files and separately encrypted offline copies remain on your devices. Deleting a key from Nexus does not revoke it at its provider.':'Скачанные файлы и отдельно зашифрованные офлайн-копии останутся на ваших устройствах. Удаление API-ключа из Nexus не отзывает его у провайдера.'}</p><p data-self-status role="status">${en?'Checking…':'Проверяем…'}</p><div data-self-reauth hidden><p>${en?'Confirm your sign-in again. After signing in with a linked provider, return to Security.':'Повторно подтвердите вход. После входа через привязанный сервис вернитесь в раздел «Безопасность».'}</p><button class="btn" type="button" data-self-passkey>${en?'Confirm with passkey':'Подтвердить ключом доступа'}</button><div data-self-providers></div></div><button class="btn danger" type="button" data-self-open disabled>${en?'Prepare account deletion':'Перейти к удалению аккаунта'}</button><dialog data-self-dialog><form data-self-form><h2>${en?'Permanently delete this account?':'Удалить этот аккаунт навсегда?'}</h2><p data-self-owner></p><p data-self-summary></p><p>${en?'Type the confirmation exactly:':'Введите фразу подтверждения полностью:'} <strong data-self-phrase></strong></p><input data-self-confirm autocomplete="off" spellcheck="false" aria-label="${en?'Confirmation phrase':'Фраза подтверждения'}"><label><input type="checkbox" data-self-consent> ${en?'I understand that server data cannot be restored.':'Я понимаю, что серверные данные восстановить нельзя.'}</label><label><input type="checkbox" data-self-local checked> ${en?'Also erase this account’s data in this browser.':'Также стереть данные этого аккаунта в этом браузере.'}</label><p data-self-dialog-status role="status"></p><div class="account-actions"><button class="btn" type="button" data-self-cancel>${en?'Cancel':'Отмена'}</button><button class="btn danger" type="submit" data-self-execute disabled>${en?'Delete my account permanently':'Удалить мой аккаунт навсегда'}</button></div></form></dialog></section>`;
export function bindSelfDelete(locale='ru'){
 const root=document.querySelector('[data-self-delete]'),account=verifiedAccount();if(!root||!account)return;
 const en=locale==='en',find=s=>root.querySelector('[data-self-'+s+']'),dialog=find('dialog');
 let caps=null,plan=null,busy=false,submitted=false;
 const current=()=>root.isConnected&&verifiedAccount()===account;
 const status=text=>{if(current())find('status').textContent=text};
 const controls=()=>{if(!current())return;find('open').disabled=busy||!caps?.canDelete||!caps.freshLogin;find('passkey').disabled=busy;find('execute').disabled=busy||submitted||!plan||Date.parse(plan.expiresAt)<=Date.now()||find('confirm').value!==plan.confirmation||!find('consent').checked;find('cancel').disabled=busy};
 const request=(path,options={})=>accountControlRequest(BASE+path,{...options,accountId:account.accountId});
 const refresh=async()=>{
  const result=await request('self-delete-capabilities');if(!current())return;
  caps=result;find('reauth').hidden=!caps.canDelete||caps.freshLogin;find('passkey').hidden=!caps.hasPasskey;
  status(caps.protected?(en?'The administrator account is protected from deletion.':'Аккаунт администратора защищён от удаления.'):!caps.canDelete?(en?'Deletion is unavailable for this account.':'Удаление недоступно для этого аккаунта.'):caps.freshLogin?(en?'You are deleting only your own account.':'Вы можете удалить только собственный аккаунт.'):(en?'Confirm your sign-in to continue.':'Для продолжения подтвердите вход.'));
  if(caps.canDelete&&!caps.freshLogin&&caps.providers.length){
   const client=await import('/account/entry/oauth-client.js');if(!current())return;
   await client.bindProviderButtons(find('providers'),{intent:'login',allowedProviders:caps.providers,acquire:()=>current()&&!busy,onStatus:status});
  }
  controls();
 };
 find('passkey').addEventListener('click',async()=>{if(busy||!current())return;busy=true;controls();try{const client=await import('/account/access/passkey-client.js');if(!current())return;await client.login();if(current())await refresh()}catch(error){status(controlMessage(error))}finally{busy=false;controls()}});
 find('open').addEventListener('click',async()=>{
  if(busy||!current())return;busy=true;plan=null;submitted=false;controls();
  try{await refresh();if(!current()||!caps?.canDelete||!caps.freshLogin)return;
   const result=await request('self-delete-preview',{method:'POST',body:{requestId:crypto.randomUUID(),version:caps.version}});if(!current())return;plan=result;
   find('owner').textContent=(en?'Account: ':'Аккаунт: ')+account.displayName+' · '+account.accountId;
   const n=plan.counts;find('summary').textContent=en?`Projects: ${n.projects}; workspaces: ${n.workspaces}; feedback: ${n.feedback}; assistant records: ${n.assistantRecords||0}; saved API keys: ${n.assistantApiKeys||0}. All sign-ins will end.`:`Проекты: ${n.projects}; пространства: ${n.workspaces}; отзывы: ${n.feedback}; записи ассистента: ${n.assistantRecords||0}; API-ключи: ${n.assistantApiKeys||0}. Все сеансы входа завершатся.`;
   find('phrase').textContent=plan.confirmation;find('confirm').value='';find('consent').checked=false;find('dialog-status').textContent='';dialog.showModal();
  }catch(error){status(controlMessage(error))}finally{busy=false;controls()}
 });
 const cancel=()=>{if(busy)return;plan=null;dialog.close();controls()};
 find('cancel').addEventListener('click',cancel);dialog.addEventListener('cancel',event=>{event.preventDefault();cancel()});
 for(const name of ['confirm','consent'])find(name).addEventListener('input',controls);
 find('form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||submitted||!current()||!plan||find('execute').disabled)return;
  busy=true;submitted=true;controls();const eraseLocal=find('local').checked;
  try{
   const result=await request('self-delete',{method:'POST',body:{requestId:crypto.randomUUID(),version:caps.version,approvalToken:plan.approvalToken,confirmation:find('confirm').value}});
   if(!current())return;if(result.ok!==true||result.deletedServerData!==true)throw Error('CONTROL_UNAVAILABLE');
   // Capture and check the owner before touching browser state. Never clear other accounts/vaults.
   if(eraseLocal){try{clearVerifiedAccountData(account.accountId)}catch{}}
   try{sessionStorage.setItem('nexus:self-deletion-success:v1','1')}catch{}
   window.dispatchEvent(new Event('nexus:session-ended'));lockAccountStorage();document.querySelector('#app')?.replaceChildren();
   // The bootstrap owns the single sign-out navigation and invalidates all consumers.
  }catch(error){
   if(current()){plan=null;find('dialog-status').textContent=controlMessage(error)+(en?' Deletion is not retried automatically. If the response was lost, check the account status before signing in again.':' Удаление не повторяется автоматически. Если ответ потерян, проверьте состояние аккаунта перед новым входом.');}
  }finally{busy=false;controls()}
 });
 void refresh().catch(error=>status(controlMessage(error)));
}
