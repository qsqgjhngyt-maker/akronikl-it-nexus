import { loadPrefs } from '../core/storage.js';
import {createPresenceLauncher} from './presence.js';

const context = {
  schemaVersion: 1,
  courseId: null,
  lessonId: null,
  sectionId: null,
  taskId: null,
  code: null,
  stdin: null,
  stdout: null,
  stderr: null,
  attempts: []
};

export function getAkroniklContext() {
  const prefs = loadPrefs();
  return { ...context, language: prefs.mentorLocale, courseLanguage: prefs.courseLocale };
}

export function setAkroniklContext(patch) {
  Object.assign(context, patch || {});
  return getAkroniklContext();
}

export function clearAkroniklTaskContext() {
  Object.assign(context, { taskId: null, code: null, stdin: null, stdout: null, stderr: null, attempts: [] });
  return getAkroniklContext();
}

// UI загружается лениво через уже существующую точку входа; legacy API сохранён.
export function assistantPageMarkup(locale = 'ru') {
  const en = locale === 'en';
  return `<section class="ps-hero glass-panel"><div><span class="eyebrow">AKRONIKL · CORE</span><h1>Akronikl</h1><p>${en ? 'Navigate Nexus, read platform help and find Academy materials. No AI provider or API key is required.' : 'Ориентируйтесь в Nexus, читайте справку и находите материалы Академии. Нейросеть и API-ключ не требуются.'}</p><button type="button" class="btn primary" data-akronikl-open>${en ? 'Open assistant' : 'Открыть помощника'}</button><p class="small">${en ? 'Source help works without a model. Cloud AI, personal settings and speech are available in assistant settings.' : 'Справка работает без модели. Облачный ИИ, личные настройки и озвучка доступны в настройках помощника.'}</p></div></section>`;
}

export function createLazyAssistantBridge(options) {
  const {root,windowRef=globalThis.window,documentRef=globalThis.document}=options;
  let bridge=null,pending=null,generation=0,disposed=false,welcome=null,welcomePending=null,welcomeSuppressed=false;
  const control=new AbortController();
  const ready=()=>{try{return options.readReady?options.readReady()===true:true}catch{return false}};
  const presence=createPresenceLauncher({documentRef,windowRef,readIdentity:options.readIdentity,locale:options.readLocale,onOpen:trigger=>void open(trigger)});
  const invalidate=()=>{generation++;bridge?.invalidate()};
  const open=async trigger=>{
    if(disposed||!root.isConnected||!ready())return;
    welcomeSuppressed=true;welcome?.dispose();
    if(bridge)return bridge.open(trigger);
    const ticket=generation,identity=options.readIdentity(),hash=windowRef.location.hash;
    const language=options.readLocale(),courseLanguage=options.readCourseLocale();
    try{
      pending??=import('./ui/bridge.js').catch(error=>{pending=null;throw error});
      const module=await pending;
      if(disposed||ticket!==generation||!root.isConnected||!ready()||options.readIdentity()!==identity||windowRef.location.hash!==hash||options.readLocale()!==language||options.readCourseLocale()!==courseLanguage)return;
      bridge??=module.createAssistantBridge(options);control.abort();
      return bridge.open(trigger);
    }catch{
      if(ticket!==generation||disposed||!trigger?.isConnected)return;
      const note=documentRef.createElement('p');note.setAttribute('role','status');note.dataset.akroniklLoadError='';
      note.textContent=language==='en'?'Assistant resources are unavailable. Retry online.':'Ресурсы помощника недоступны. Повторите при подключении.';
      root.querySelector('[data-akronikl-load-error]')?.remove();trigger.after(note);
    }
  };
  root.addEventListener('click',event=>{
    const trigger=event.target.closest?.('[data-akronikl-open],#askAkronikl');
    if(!trigger||!root.contains(trigger)||trigger.disabled)return;
    event.preventDefault();event.stopPropagation();void open(trigger);
  },{capture:true,signal:control.signal});
  for(const type of ['hashchange','pagehide','nexus:session-ended','nexus:context-invalidated'])windowRef.addEventListener(type,invalidate,{capture:true,signal:control.signal});
  documentRef.addEventListener('visibilitychange',()=>{if(documentRef.hidden)invalidate()},{signal:control.signal});
  // Добавление кнопки не загружает UI/Core и не читает содержимое workspace.
  const bindEditor=()=>{
    presence.refresh();queueMicrotask(()=>{if(disposed||welcomeSuppressed||welcomePending||!ready()||!options.readIdentity()?.accountId||options.publicMode)return;welcomePending=import('./experience/startup-greeting.js').then(m=>m.prepareStartupGreeting({...options,onPreferences:prefs=>presence.configure(prefs)})).then(value=>{welcome=value;if(disposed||welcomeSuppressed)welcome?.dispose();}).catch(()=>{});});
    const editor=options.readEditor?.(),studio=editor?.closest?.('[data-nexus-code-studio]');
    if(disposed||!studio||!root.contains(studio)||studio.previousElementSibling?.hasAttribute('data-akronikl-editor'))return;
    const button=documentRef.createElement('button');button.type='button';button.className='btn';
    button.dataset.akroniklOpen='';button.dataset.akroniklEditor='';
    button.textContent=options.readLocale()==='en'?'Akronikl · context':'Akronikl · контекст';
    studio.before(button);
  };
  return Object.freeze({open,invalidate,bindEditor,dispose(){disposed=true;welcomeSuppressed=true;welcome?.dispose();presence.dispose();invalidate();control.abort();bridge?.dispose()}});
}
