// Одноразовая UX-подсказка при возврате на вход. Account/cookie не затрагиваются.
// Старый ранний loader уже понимает этот auth-navigation marker и снимает cover.
import {INTRO_HANDOFF_KEY,readIntroHandoff} from './startup-intro-policy.js';
export function consumeIntroEntryReturn(storage,now=Date.now()){
 try{const raw=storage.getItem(INTRO_HANDOFF_KEY);if(!raw||raw.length>256)return false;const value=JSON.parse(raw);if(value?.entryReturn!=='logout')return false;const valid=readIntroHandoff(storage,now);storage.removeItem(INTRO_HANDOFF_KEY);return valid}catch{return false}
}
export function installIntroEntryReturn({surface,documentRef=document,windowRef=window,now=Date.now}){
 let intent;const selector=surface==='entry'?'[data-switch]':'[data-unified-logout],[data-access-logout]';
 const click=event=>{const node=event.target.closest?.(selector);if(node&&!node.disabled)intent={node,at:now()}};
 const mark=confirmed=>{
  if(!intent||now()-intent.at<0||now()-intent.at>=30000)return;
  // При подтверждённом выходе узел удалён, скрыт или ещё занят. Ошибка выхода
  // возвращает доступную кнопку; её последующая навигация marker не создаёт.
  if(!confirmed&&intent.node.isConnected&&!intent.node.hidden&&!intent.node.disabled)return;
  try{windowRef.sessionStorage.setItem(INTRO_HANDOFF_KEY,JSON.stringify({schema:1,kind:'auth-navigation',entryReturn:'logout',at:now()}))}catch{}
 };
 documentRef.addEventListener('click',click,{capture:true});
 windowRef.addEventListener('nexus:session-ended',()=>mark(true));
 windowRef.addEventListener('pagehide',()=>{mark(false);documentRef.removeEventListener('click',click,{capture:true})},{once:true,capture:true});
}
