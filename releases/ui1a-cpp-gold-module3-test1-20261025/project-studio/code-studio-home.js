import {standaloneCppTemplate,readProjectImport} from './project-transfer.js';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
export function codeStudioHomeMarkup({projects=[],recentIds=[],t,localMode=false,locked=false}){
 const cpp=projects.filter(p=>p.languageId==='cpp'),byId=new Map(cpp.map(p=>[p.id,p]));
 const recent=[...new Set([...recentIds,...cpp.map(p=>p.id)])].map(id=>byId.get(id)).filter(Boolean).slice(0,6);
 const cards=list=>list.map(p=>`<article class="glass-panel cs-project-card"><span class="cs-project-kind">C++ · ${e(t(p.origin?.courseId?'studio.learning':'studio.free'))}</span><h3>${e(p.title)}</h3><p>${e(p.description||t('studio.localProject'))}</p><button class="btn" type="button" data-cs-open="${e(p.id)}">${e(t('studio.open'))} <span aria-hidden="true">↗</span></button></article>`).join('');
 return `<div class="code-studio-home" data-code-studio-home><section class="glass-panel cs-hero"><div><span class="eyebrow">NEXUS · CODE STUDIO</span><h1>${e(t('studio.title'))}</h1><p>${e(t('studio.intro'))}</p><span class="cs-capability">C++20 · Clang / WASI</span></div><div class="cs-symbol" aria-hidden="true">{<span>code</span>}</div></section>
 <p class="cs-status" data-cs-status role="status" aria-live="polite">${e(t(locked?'studio.locked':localMode?'studio.offlineNote':'studio.savedNote'))}</p>
 ${locked?`<a class="btn primary" href="#view=unlock&return=code-studio">${e(t('studio.unlock'))}</a>`:''}
 <section class="cs-launch-grid" aria-label="${e(t('studio.actions'))}">
 ${[['new','＋'],['projects','▤'],['import','↥'],['cloud','☁']].map(([id,icon])=>`<button type="button" class="glass-panel cs-launch-card" data-cs-action="${id}" ${locked&&id!=='cloud'?'disabled':''}><span class="cs-action-icon" aria-hidden="true">${icon}</span><strong>${e(t('studio.'+id))}</strong><small>${e(t('studio.'+id+'Note'))}</small><span class="cs-action-arrow" aria-hidden="true">↗</span></button>`).join('')}</section>
 <section class="glass-panel cs-panel" data-cs-panel="new" hidden><h2>${e(t('studio.new'))}</h2><form data-cs-new><label>${e(t('studio.name'))}<input name="title" maxlength="120" required autocomplete="off" placeholder="${e(t('studio.nameExample'))}"></label><label>${e(t('studio.language'))}<select name="language"><option value="cpp">C++20</option></select></label><fieldset><legend>${e(t('studio.startWith'))}</legend><label><input type="radio" name="kind" value="starter" checked>${e(t('studio.starter'))}</label><label><input type="radio" name="kind" value="empty">${e(t('studio.empty'))}</label></fieldset><button class="btn primary" type="submit">${e(t('studio.create'))}</button></form></section>
 <section class="glass-panel cs-panel" data-cs-panel="import" hidden><h2>${e(t('studio.import'))}</h2><p>${e(t('studio.importHelp'))}</p><label>${e(t('studio.name'))}<input data-cs-import-name maxlength="120" value="${e(t('studio.importedName'))}"></label><div class="cs-import-actions"><label class="btn">${e(t('studio.chooseFiles'))}<input type="file" data-cs-import multiple accept=".cpp,.cc,.cxx,.h,.hpp,.hh,.hxx,.txt,.md,.json"></label><label class="btn" data-cs-folder-label hidden>${e(t('studio.chooseFolder'))}<input type="file" data-cs-folder webkitdirectory multiple></label></div></section>
 <section class="glass-panel cs-panel" data-cs-panel="cloud" hidden><h2>${e(t('studio.cloud'))}</h2><p>${e(t(localMode?'studio.cloudOffline':'studio.cloudExplicit'))}</p><div data-cs-cloud-list></div></section>
 <section class="cs-library" data-cs-panel="projects"><header><h2>${e(t('studio.recent'))}</h2><a href="#view=projects">${e(t('studio.allProjects'))} ↗</a></header><div class="cs-project-grid">${recent.length?cards(recent):`<p class="cs-empty">${e(t('studio.noProjects'))}</p>`}</div><details class="cs-all-projects"><summary>${e(t('studio.projects'))} · ${cpp.length}</summary><div class="cs-project-grid">${cards(cpp)}</div></details></section></div>`;
}
export function bindCodeStudioHome({mount,t,localMode=false,locked=false,onCreate,onOpen,listCloud,importCloud,findProject=()=>null}){
 let busy=false;
 const status=mount.querySelector('[data-cs-status]'),panels=[...mount.querySelectorAll('[data-cs-panel]')];
 const message=key=>{status.textContent=t(key)};
 const show=key=>{for(const p of panels)if(p.dataset.csPanel!=='projects')p.hidden=p.dataset.csPanel!==key;const p=mount.querySelector('[data-cs-panel="'+key+'"]');p?.scrollIntoView({block:'nearest',behavior:'smooth'});p?.querySelector('input:not([type=radio]),button')?.focus()};
 const guarded=async fn=>{if(busy)return;busy=true;mount.setAttribute('aria-busy','true');try{await fn()}catch(error){const known=['TITLE','PATH','DUPLICATE','SIZE','FORMAT','ENTRY','PATH_CONFLICT'];message(known.includes(error.code)?'studio.error.'+error.code:'studio.error.generic')}finally{busy=false;mount.removeAttribute('aria-busy')}};
 mount.querySelector('[data-cs-new]')?.addEventListener('submit',event=>{event.preventDefault();if(locked)return;void guarded(async()=>{const form=new FormData(event.currentTarget);message('studio.creating');const p=await onCreate(standaloneCppTemplate(form.get('title'),form.get('kind')));await onOpen(p.id)})});
 for(const input of mount.querySelectorAll('[data-cs-import],[data-cs-folder]'))input.addEventListener('change',()=>{if(locked)return;const files=[...input.files];if(!files.length)return;void guarded(async()=>{message('studio.importing');const value=await readProjectImport(files,{name:mount.querySelector('[data-cs-import-name]').value});const p=await onCreate(value);await onOpen(p.id)}).finally(()=>{input.value=''})});
 const folder=mount.querySelector('[data-cs-folder]');if(folder&&'webkitdirectory'in folder)mount.querySelector('[data-cs-folder-label]').hidden=false;
 mount.addEventListener('click',event=>{
  const project=event.target.closest('[data-cs-open]');if(project&&!locked){void guarded(()=>onOpen(project.dataset.csOpen));return}
  const action=event.target.closest('[data-cs-action]');if(!action)return;const kind=action.dataset.csAction;show(kind);
  if(kind!=='cloud')return;
  if(localMode||locked||navigator.onLine===false){message('studio.cloudOffline');return}
  void guarded(async()=>{
   message('studio.cloudLoading');const rows=await listCloud();const list=mount.querySelector('[data-cs-cloud-list]');list.replaceChildren();
   if(!rows.length){message('studio.cloudEmpty');return}
   for(const row of rows){
    const card=document.createElement('div');card.className='cs-cloud-row';const label=document.createElement('span');label.textContent=String(row.title||row.id)+' · '+t('studio.revision')+' '+String(row.revision??0);
    const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=t('studio.download');
    button.onclick=()=>{void guarded(async()=>{if(navigator.onLine===false){message('studio.cloudOffline');return}if(findProject(row.id)&&!confirm(t('studio.replaceConfirm')))return;message('studio.cloudLoading');await importCloud(row.id);await onOpen(row.id)})};
    card.append(label,button);list.append(card);
   }
   message('studio.cloudExplicit');
  });
 });
 return {get busy(){return busy}};
}
