import {mountOnecCourse} from './candidate.mjs';
import {createOnecAccountStorage} from './account-progress.mjs';

export function onecIntegrationMarkup(){return '<section data-onec-platform-mount aria-label="1С / 1C"><p role="status">Загрузка курса / Loading course…</p></section>';}

export function mountOnecIntegration(mount,{locale='ru',isCurrent=()=>true}={}){
 if(!mount)throw Error('ONEC_MOUNT_REQUIRED');
 let disposed=false;
 const active=()=>!disposed&&isCurrent();
 const storage=createOnecAccountStorage({isCurrent:active});
 const shadow=mount.attachShadow({mode:'open'}),link=document.createElement('link');
 link.rel='stylesheet';link.href=new URL('./candidate.css',import.meta.url).href;
 const cssReady=new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=()=>reject(Error('ONEC_STYLE_LOAD_FAILED'));});
 shadow.append(link);
 const frame=document.createElement('div');frame.innerHTML='<header class="top"><a href="#view=academy">NEXUS / Академия</a><label>RU / EN <select aria-label="Язык материалов / Content language"><option value="ru">Русский</option><option value="en">English</option></select></label></header>';
 const note=document.createElement('p');note.className='footer-note';
 note.textContent=locale==='en'
  ?(storage.authenticated?'Progress is stored locally for your signed-in account. Offline self-reports remain separate.':'Reading is available. Sign in to preserve progress for your account.')
  :(storage.authenticated?'Прогресс сохраняется локально в вашем аккаунте. Прежние автономные самоотчёты остаются отдельно.':'Материалы доступны для чтения. Войдите, чтобы сохранять прогресс в аккаунте.');
 frame.append(note);
 const root=document.createElement('div');frame.append(root);shadow.append(frame);
 const controller=mountOnecCourse({root,localeSelect:frame.querySelector('select'),storage,isCurrent:active,defaultLocale:locale,listenHash:false,preserveDocumentLanguage:true,normalizeLinks:true,studioBase:''});
 return {ready:Promise.all([cssReady,controller.ready]),dispose(){disposed=true;controller.dispose();}};
}
