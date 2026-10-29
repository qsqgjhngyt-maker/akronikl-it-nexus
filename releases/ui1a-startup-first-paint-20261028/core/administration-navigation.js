import {verifiedAccount} from './account-storage.js';
import {accountControlRequest} from './account-control-api.js';

// Только подсказка навигации текущего подтверждённого Account context.
// Сам экран Администрирования ждёт свежий ответ сервера перед открытием.
let navigationProof=null,capabilitiesRead=null;
const PROOF_TTL=60000;
globalThis.addEventListener?.('nexus:session-ended',()=>{navigationProof=null;capabilitiesRead=null});
function navigation(nav,caps,active){
 let link=nav.querySelector('[data-team-navigation]');
 if(!caps?.canManage&&!caps?.canModerate){link?.remove();return}
 if(!link){link=document.createElement('a');link.dataset.teamNavigation='';link.innerHTML='<span aria-hidden="true">⚙</span><b>Администрирование</b>';nav.append(link)}
 link.href='#view=admin&tab='+(!caps.canManage?'feedback':'users');
 link.classList.toggle('active',active);
 if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
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
export async function bindAdministrationNavigation(){
 const account=verifiedAccount(),nav=document.querySelector('.side-nav');
 if(!nav)return null;
 if(!account?.accountId){navigationProof=null;navigation(nav,null,false);return null}
 if(navigationProof?.account!==account||Date.now()-navigationProof.readAt>=PROOF_TTL)navigationProof=null;
 const active=Boolean(document.querySelector('[data-administration]'));
 navigation(nav,navigationProof?.caps,active);
 const caps=await capabilities(account);
 if(verifiedAccount()!==account||!nav.isConnected)return null;
 navigation(nav,caps,active);
 return {account,caps};
}
