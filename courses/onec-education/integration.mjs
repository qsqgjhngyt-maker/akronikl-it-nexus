import {mountOnecCourse} from './candidate.mjs';
import {createOnecAccountStorage} from './account-progress.mjs';
import {accountLocalStorage} from '../../core/account-storage.js';

export function onecIntegrationMarkup(){return '<section data-onec-platform-mount aria-label="1С / 1C"><p role="status">Загрузка курса / Loading course…</p></section>';}

export function mountOnecIntegration(mount,{locale='ru',isCurrent=()=>true,openAssistant}={}){
 if(!mount)throw Error('ONEC_MOUNT_REQUIRED');
 let disposed=false;
 const active=()=>!disposed&&isCurrent();
 const storage=createOnecAccountStorage({isCurrent:active});
 let resumeStorage=null;try{resumeStorage=accountLocalStorage();}catch{/* Анонимное чтение курса без сохранения личного места. */}
 const shadow=mount.attachShadow({mode:'open'}),link=document.createElement('link');
 link.rel='stylesheet';link.href=new URL('./candidate.css',import.meta.url).href;
 const cssReady=new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=()=>reject(Error('ONEC_STYLE_LOAD_FAILED'));});
 shadow.append(link);
 const frame=document.createElement('div');frame.className='onec-integrated visual-shell';frame.innerHTML='<header class="top" hidden><a href="#view=academy">← Академия / Academy</a><label>RU / EN <select aria-label="Язык материалов / Content language"><option value="ru">Русский</option><option value="en">English</option></select></label></header>';
 // Preserve the standalone renderer's responsive root styles inside its own
 // ShadowRoot. This id cannot collide with the outer platform #app.
 const root=document.createElement('div');root.id='app';root.className='content';frame.append(root);shadow.append(frame);
 const controller=mountOnecCourse({root,localeSelect:frame.querySelector('select'),storage,resumeStorage,resumeScope:storage.authenticated?'account-device':'unavailable',isCurrent:active,defaultLocale:locale,listenHash:false,enableClarityPilot:true,preserveDocumentLanguage:true,normalizeLinks:true,studioBase:'',openAssistant});
 return {ready:Promise.all([cssReady,controller.ready]),prepareNavigation:()=>controller.prepareNavigation(),handleRoute:(hash,locale)=>controller.handleRoute(hash,locale),dispose(){disposed=true;controller.dispose();}};
}
