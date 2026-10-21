import {verifiedAccount} from './account-storage.js';
import {accountControlRequest,controlMessage} from './account-control-api.js';
import {adminAccountMarkup,bindAccountControl} from './account-control.js';
import {contentEditorMarkup,bindContentEditor} from './content-editor.js';
import {moderationPageMarkup} from '../feedback/ui.js';
export function administrationMarkup(tab='users'){
 return '<section data-administration><header class="account-page-head glass-panel"><span class="eyebrow">КОМАНДА NEXUS</span><h1>Администрирование</h1><p data-administration-status role="status">Проверяем права команды…</p></header><nav class="account-tabs" data-administration-tabs hidden><a href="#view=admin&tab=users" data-team-users>Пользователи</a><a href="#view=admin&tab=feedback">Обращения и отзывы</a><a href="#view=admin&tab=content" data-team-content>Контент и блог</a></nav><div data-administration-body hidden data-unified-account>'+(tab==='feedback'?moderationPageMarkup():tab==='content'?contentEditorMarkup():adminAccountMarkup())+'</div></section>';
}
export async function bindAdministration({tab='users'}={}){
 const accountId=verifiedAccount()?.accountId;if(!accountId)return;
 const panel=document.querySelector('[data-administration]'),nav=document.querySelector('.side-nav');
 try{
  const caps=await accountControlRequest('/api/v2/account/control/capabilities',{accountId});
  if(verifiedAccount()?.accountId!==accountId||!nav?.isConnected)return;
  if(caps.canManage||caps.canModerate){
   if(!nav.querySelector('[data-team-navigation]')){
    const link=document.createElement('a');link.href='#view=admin&tab='+(!caps.canManage?'feedback':'users');link.dataset.teamNavigation='';link.innerHTML='<span aria-hidden="true">⚙</span><b>Администрирование</b>';
    if(panel){link.className='active';link.setAttribute('aria-current','page')}
    nav.append(link);
   }
  }
  if(!panel)return;
  if(!caps.canManage&&!caps.canModerate){panel.querySelector('[data-administration-status]').textContent='Этот раздел доступен только команде Nexus.';panel.querySelector('[data-administration-body]').replaceChildren();return}
  panel.querySelector('[data-administration-tabs]').hidden=false;
  for(const node of panel.querySelectorAll('[data-team-users],[data-team-content]'))node.hidden=!caps.canManage;
  if(tab!=='feedback'&&!caps.canManage){panel.querySelector('[data-administration-status]').textContent='Вам доступна модерация обращений. Управление пользователями и контентом доступно администратору.';panel.querySelector('[data-administration-body]').replaceChildren();return}
  panel.querySelector('[data-administration-status]').textContent='Права подтверждены сервером.';
  panel.querySelector('[data-administration-body]').hidden=false;
  if(tab==='content')await bindContentEditor(panel.querySelector('[data-content-admin]'));
  else if(tab!=='feedback')await bindAccountControl();
 }catch(error){if(panel?.isConnected)panel.querySelector('[data-administration-status]').textContent=controlMessage(error)}
}
