import {verifiedAccount} from './account-storage.js';
import {accountControlRequest,controlMessage} from './account-control-api.js';
import {adminAccountMarkup,bindAccountControl} from './account-control.js';
import {contentEditorMarkup,bindContentEditor} from './content-editor.js';
import {moderationPageMarkup} from '../feedback/ui.js';
// Только подсказка навигации в памяти текущего подтверждённого Account context.
// Сам экран и каждый запрос по-прежнему требуют свежей серверной проверки.
let navigationProof=null,capabilitiesRead=null;
const PROOF_TTL=60000;
globalThis.addEventListener?.('nexus:session-ended',()=>{navigationProof=null;capabilitiesRead=null});
function navigation(nav,caps,active){
 let link=nav.querySelector('[data-team-navigation]');
 if(!caps?.canManage&&!caps?.canModerate){link?.remove();return}
 if(!link){link=document.createElement('a');link.dataset.teamNavigation='';link.innerHTML='<span aria-hidden="true">⚙</span><b>Администрирование</b>';nav.append(link)}
 link.href='#view=admin&tab='+(!caps.canManage?'feedback':'users');
 if(active){link.className='active';link.setAttribute('aria-current','page')}
}
function capabilities(account){
 if(capabilitiesRead?.account===account)return capabilitiesRead.promise;
 const read={account,promise:null};
 read.promise=(async()=>{
  try{
   const caps=await accountControlRequest('/api/v2/account/control/capabilities',{accountId:account.accountId});
   if(!caps||Object.keys(caps).sort().join(',')!=='canManage,canModerate,canPurge,freshPasskey'||Object.values(caps).some(v=>typeof v!=='boolean'))throw Error('CONTROL_UNAVAILABLE');
   if(verifiedAccount()===account)navigationProof={account,caps,readAt:Date.now()};
   return caps;
  }finally{if(capabilitiesRead===read)capabilitiesRead=null}
 })();capabilitiesRead=read;return read.promise;
}
export function administrationMarkup(tab='users'){
 return '<section data-administration><header class="account-page-head glass-panel"><span class="eyebrow">КОМАНДА NEXUS</span><h1>Администрирование</h1><p data-administration-status role="status">Проверяем права команды…</p></header><nav class="account-tabs" data-administration-tabs hidden><a href="#view=admin&tab=users" data-team-users>Пользователи</a><a href="#view=admin&tab=feedback">Обращения и отзывы</a><a href="#view=admin&tab=content" data-team-content>Контент и блог</a></nav><div data-administration-body hidden data-unified-account>'+(tab==='feedback'?moderationPageMarkup():tab==='content'?contentEditorMarkup():adminAccountMarkup())+'</div></section>';
}
export async function bindAdministration({tab='users'}={}){
 const account=verifiedAccount(),accountId=account?.accountId;if(!accountId){navigationProof=null;return}
 const panel=document.querySelector('[data-administration]'),nav=document.querySelector('.side-nav');
 if(!nav)return;
 if(navigationProof?.account!==account||Date.now()-navigationProof.readAt>=PROOF_TTL)navigationProof=null;
 navigation(nav,navigationProof?.caps,!!panel);
 try{
  const caps=await capabilities(account);
  if(verifiedAccount()!==account||!nav.isConnected)return;
  navigation(nav,caps,!!panel);
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
