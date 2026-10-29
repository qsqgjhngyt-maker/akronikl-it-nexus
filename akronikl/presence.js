export function createPresenceLauncher({documentRef=document,windowRef=window,onOpen,readIdentity,locale=()=> 'ru'}={}){
 if(!documentRef.body?.append||!documentRef.head?.append||!readIdentity?.()?.accountId)return Object.freeze({refresh(){},configure(){},dispose(){}});
 const doc=documentRef,win=window,listeners=new AbortController(),button=doc.createElement('button');let dead=false;
 if(!doc.querySelector('link[data-ak-presence-style]')){const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('./presence.css',import.meta.url).href;link.dataset.akPresenceStyle='';doc.head.append(link);}
 button.type='button';button.className='ak-presence';button.dataset.akroniklPresence='';button.dataset.motion='false';button.dataset.state='idle';button.setAttribute('aria-haspopup','dialog');
 const image=doc.createElement('img');image.src=new URL('../assets/brand-mark.svg',import.meta.url).href;image.alt='';image.draggable=false;image.setAttribute('aria-hidden','true');button.append(image);
 const label=doc.createElement('span');label.className='ak-presence-label';button.append(label);
 function refresh(){const en=locale()==='en',ready=!!readIdentity()?.accountId;button.hidden=!ready;button.setAttribute('aria-label',en?'Open Akronikl chat':'Открыть чат Akronikl');button.title=en?'Akronikl — ready to help':'Akronikl — готов помочь';label.textContent='Akronikl';}
 button.addEventListener('click',()=>{if(!dead&&readIdentity()?.accountId)onOpen(button);},{signal:listeners.signal});
 win.addEventListener('nexus:assistant-state',event=>{if(!dead)button.dataset.state=['loading','speaking'].includes(event.detail?.state)?event.detail.state:'idle';},{signal:listeners.signal});
 win.addEventListener('nexus:assistant-preferences-changed',event=>{if(event.detail?.identity===readIdentity())button.dataset.motion=String(event.detail.motion===true);},{signal:listeners.signal});
 win.addEventListener('nexus:session-ending',()=>{button.hidden=true;},{signal:listeners.signal});
 doc.body.append(button);refresh();
 return Object.freeze({refresh,configure(prefs){if(!dead)button.dataset.motion=String(prefs.assistantPresenceMotion===true);},dispose(){dead=true;listeners.abort();button.remove();}});
}
