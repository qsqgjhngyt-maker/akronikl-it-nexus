import {languageLabel} from '../sandbox/languages.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

// Presentation adapter over canonical track records; never creates curricula or progress.
export function languageJourney(track,course=null){
 const available=track?.id==='cpp'&&track.status==='available-alpha'&&course?.manifest?.id==='cpp';
 return {id:track.id,group:track.group,status:available?'available':'planned',href:available?'#course=cpp':null,sections:available?course.curriculum.sections.map(section=>({id:section.id,lessonIds:[...section.lessonIds],title:section.title})):[],counts:available?{topics:course.curriculum.lessons.length,practicums:course.practicumsRu.practicums.length,projects:course.projectsRu.projects.length}:null};
}
export function languageJourneyDialogMarkup(t){
 return `<dialog class="glass-panel language-journey-dialog" data-language-journey-dialog aria-labelledby="languageJourneyTitle"><header><span class="eyebrow">NEXUS CODE HUB</span><button type="button" class="btn ghost" data-language-journey-close aria-label="${escape(t('journey.close'))}">×</button></header><h2 id="languageJourneyTitle"></h2><span class="visual-status planned">${escape(t('codeHub.planned'))}</span><p>${escape(t('journey.planned.intro'))}</p><div class="language-journey-sections">${['overview','modules','practice','projects','progress'].map(key=>`<div><strong>${escape(t('journey.section.'+key))}</strong><small>${escape(t('journey.pending'))}</small></div>`).join('')}</div><p class="learning-content-note">${escape(t('journey.planned.note'))}</p><div class="language-journey-actions"><a class="btn primary" href="#course=cpp">${escape(t('journey.available'))} →</a><a class="btn ghost" href="#view=projects">${escape(t('nav.myProjects'))} ↗</a></div></dialog>`;
}
let dispose=()=>{};
export function bindLanguageJourneys({tracks=[],course,t,locale='ru'}={}){
 dispose();const dialog=document.querySelector('[data-language-journey-dialog]');if(!dialog)return;
 const controller=new AbortController(),options={signal:controller.signal};let trigger=null;
 const close=()=>{if(dialog.open)dialog.close()};
 document.querySelectorAll('[data-language-journey]').forEach(button=>button.addEventListener('click',()=>{
  const track=tracks.find(item=>item.id===button.dataset.languageJourney);if(!track||languageJourney(track,course).status!=='planned')return;
  trigger=button;dialog.querySelector('h2').textContent=languageLabel(track.id,locale);dialog.dataset.track=track.id;dialog.showModal();dialog.querySelector('[data-language-journey-close]').focus();
 },options));
 dialog.querySelector('[data-language-journey-close]').addEventListener('click',close,options);
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)close()},options);
 dialog.addEventListener('close',()=>trigger?.isConnected&&trigger.focus(),options);
 dialog.querySelectorAll('a').forEach(a=>a.addEventListener('click',close,options));
 dispose=()=>{controller.abort();close()};
}
