import {updateParticleAppearance} from './particles.js';
let readPreferences=()=>({}),writeAppearance=()=>{},current,appearanceDialog=null,dialogBindings=null;
const bounded=(value,fallback,min,max)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
export function normalizeAppearance(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))value={};
  return {version:1,theme:value.theme==='day'?'day':'night',motion:typeof value.motion==='boolean'?value.motion:!matchMedia('(prefers-reduced-motion:reduce)').matches,particles:bounded(value.particles,1,0,2),particleSpeed:bounded(value.particleSpeed,.5,0,2),orbitalSpeed:bounded(value.orbitalSpeed,1,0,2),textSize:bounded(value.textSize,18,16,24),contrast:Boolean(value.contrast),autoFocus:Boolean(value.autoFocus)};
}
export function getNexusAppearance(){return current||normalizeAppearance(readPreferences().nexusAppearance)}
export function applyNexusAppearance(value){
  current=normalizeAppearance(value);const html=document.documentElement;
  html.dataset.nexusTheme=current.theme;html.classList.toggle('nexus-contrast',current.contrast);html.style.setProperty('--nexus-reading-size',current.textSize+'px');
  document.body.classList.toggle('nexus-motion',current.motion);document.body.classList.toggle('nexus-reading-focus',current.autoFocus&&new URLSearchParams(location.hash.slice(1)).has('lesson'));
  updateParticleAppearance({density:current.particles,speed:current.particleSpeed,motion:current.motion,theme:current.theme});
  document.dispatchEvent(new CustomEvent('nexus-appearance-change',{detail:{...current}}));return current;
}
export function configureNexusAppearance({read,write}){readPreferences=read;writeAppearance=write;applyNexusAppearance(read().nexusAppearance)}
export function changeNexusAppearance(patch){const next=normalizeAppearance({...getNexusAppearance(),...patch});writeAppearance(next,patch);return applyNexusAppearance(next)}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
export function appearanceControlsMarkup(t){
  const s=getNexusAppearance(),sliders=[['particles',0,2,.05],['particleSpeed',0,2,.05],['orbitalSpeed',0,2,.05],['textSize',16,24,1]];
  return `<div class="nexus-appearance-controls"><div class="nexus-theme-choices" role="group" aria-label="${escape(t('solar.settings.theme'))}">${['night','day'].map(theme=>`<button type="button" data-appearance-theme="${theme}" aria-pressed="${s.theme===theme}">${escape(t('solar.settings.'+theme))}</button>`).join('')}</div><label class="nexus-switch"><span>${escape(t('solar.settings.motion'))}</span><input type="checkbox" data-appearance-toggle="motion" ${s.motion?'checked':''}></label>${sliders.map(([key,min,max,step])=>`<label class="nexus-appearance-range"><span>${escape(t('solar.settings.'+key))}<output data-appearance-output="${key}">${key==='textSize'?s[key]+' px':Math.round(s[key]*100)+'%'}</output></span><input type="range" min="${min}" max="${max}" step="${step}" value="${s[key]}" data-appearance-range="${key}"></label>${key==='orbitalSpeed'?`<p class="nexus-appearance-hint">${escape(t('solar.settings.zeroNote'))}</p>`:''}`).join('')}<label class="nexus-switch"><span>${escape(t('solar.settings.contrast'))}</span><input type="checkbox" data-appearance-toggle="contrast" ${s.contrast?'checked':''}></label><label class="nexus-switch"><span>${escape(t('solar.settings.autoFocus'))}</span><input type="checkbox" data-appearance-toggle="autoFocus" ${s.autoFocus?'checked':''}></label><p class="nexus-appearance-hint">${escape(t('solar.settings.saved'))}</p></div>`;
}
export function bindAppearanceControls(container,{signal}={}){
  const update=changeNexusAppearance;
  container.querySelectorAll('[data-appearance-theme]').forEach(button=>button.addEventListener('click',()=>update({theme:button.dataset.appearanceTheme}),{signal}));
  container.querySelectorAll('[data-appearance-toggle]').forEach(input=>input.addEventListener('change',()=>update({[input.dataset.appearanceToggle]:input.checked}),{signal}));
  container.querySelectorAll('[data-appearance-range]').forEach(input=>input.addEventListener('input',()=>update({[input.dataset.appearanceRange]:Number(input.value)}),{signal}));
  const refresh=()=>{const s=getNexusAppearance();container.querySelectorAll('[data-appearance-theme]').forEach(button=>button.setAttribute('aria-pressed',String(s.theme===button.dataset.appearanceTheme)));container.querySelectorAll('[data-appearance-toggle]').forEach(input=>input.checked=s[input.dataset.appearanceToggle]);container.querySelectorAll('[data-appearance-range]').forEach(input=>input.value=String(s[input.dataset.appearanceRange]));container.querySelectorAll('[data-appearance-output]').forEach(output=>{const key=output.dataset.appearanceOutput;output.value=key==='textSize'?s[key]+' px':Math.round(s[key]*100)+'%'})};
  document.addEventListener('nexus-appearance-change',refresh,{signal});
}
export function bindNexusAppearance(t){
  appearanceDialog?.close();appearanceDialog?.remove();dialogBindings?.abort();appearanceDialog=null;
  document.body.classList.toggle('nexus-reading-focus',getNexusAppearance().autoFocus&&new URLSearchParams(location.hash.slice(1)).has('lesson'));
  document.querySelectorAll('[data-nexus-appearance]').forEach(trigger=>trigger.addEventListener('click',()=>{
    if(appearanceDialog)return;
    appearanceDialog=document.createElement('dialog');appearanceDialog.className='nexus-appearance-dialog';appearanceDialog.setAttribute('aria-labelledby','nexusAppearanceTitle');
    appearanceDialog.innerHTML=`<header><h2 id="nexusAppearanceTitle">${escape(t('solar.settings.title'))}</h2><button class="icon-btn" type="button" data-appearance-close aria-label="${escape(t('solar.close'))}">×</button></header>${appearanceControlsMarkup(t)}`;
    document.body.append(appearanceDialog);dialogBindings=new AbortController();bindAppearanceControls(appearanceDialog,{signal:dialogBindings.signal});
    const close=()=>{appearanceDialog?.close();appearanceDialog?.remove();appearanceDialog=null;dialogBindings?.abort();trigger.isConnected&&trigger.focus()};
    appearanceDialog.querySelector('[data-appearance-close]').addEventListener('click',close);appearanceDialog.addEventListener('cancel',event=>{event.preventDefault();close()});appearanceDialog.showModal();
  }));
}
