import {getProject,createCheckpoint,restoreCheckpoint,renameProject,deleteProject,getProjectAudit} from './project-store.js';
import {activePrincipalId,isCurrentProjectOwner} from '../core/identity.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

// Common Project Studio storage actions, independent of the execution adapter.
export function projectControlsMarkup(t){
 return `<section class="ps-panel glass-panel graphics-project-history"><header><div><span class="eyebrow">PROJECT STUDIO</span><h2>${escape(t('graphics.studio.history'))}</h2></div><span data-studio-project-state class="visual-status"></span></header><div class="graphics-project-actions"><button type="button" class="btn ghost" data-studio-checkpoint>${escape(t('graphics.studio.checkpoint'))}</button><button type="button" class="btn ghost" data-studio-rename>${escape(t('graphics.studio.rename'))}</button><button type="button" class="btn ghost" data-studio-delete>${escape(t('graphics.studio.delete'))}</button></div><div data-studio-checkpoints class="graphics-checkpoints"></div><details><summary>${escape(t('graphics.studio.audit'))}</summary><div data-studio-audit></div></details></section>`;
}
export function bindProjectControls({mount,t,projectId,save,onRestore,onRename,onDelete,onError}){
 const controller=new AbortController(),options={signal:controller.signal};
 const owned=()=>{const project=getProject(projectId());if(!project||!isCurrentProjectOwner(project.access))throw Error(t('graphics.workshop.unavailable'));return project};
 const guarded=fn=>{try{fn()}catch(error){onError(error)}};
 const refresh=()=>{
  const project=projectId()?owned():null;
  mount.querySelector('[data-studio-project-state]').textContent=t(project?'graphics.studio.local':'graphics.workshop.draft');
  mount.querySelectorAll('[data-studio-rename],[data-studio-delete]').forEach(b=>b.disabled=!project);
  mount.querySelector('[data-studio-checkpoints]').innerHTML=project?.checkpoints?.length?project.checkpoints.map(cp=>`<div><span><strong>${escape(cp.label)}</strong><small>${escape(new Date(cp.createdAt).toLocaleString(document.documentElement.lang))}</small></span><button type="button" class="btn ghost" data-studio-restore="${escape(cp.id)}">${escape(t('graphics.studio.restore'))}</button></div>`).join(''):`<p class="ps-note compact">${escape(t('graphics.studio.checkpoint.empty'))}</p>`;
  mount.querySelector('[data-studio-audit]').innerHTML=project?getProjectAudit(project.id).slice(0,12).map(event=>`<p><strong>${escape(event.summary||event.action)}</strong><small>${escape(new Date(event.createdAt).toLocaleString(document.documentElement.lang))}</small></p>`).join(''):'';
 };
 mount.querySelector('[data-studio-checkpoint]').addEventListener('click',()=>guarded(()=>{const label=prompt(t('graphics.studio.checkpoint.name'),t('graphics.studio.checkpoint.default'));if(!label?.trim())return;if(!save())return;const p=owned();createCheckpoint(p.id,label.trim());refresh()}),options);
 mount.querySelector('[data-studio-rename]').addEventListener('click',()=>guarded(()=>{const p=owned(),title=prompt(t('graphics.workshop.name'),p.title);if(!title?.trim())return;renameProject(p.id,title.trim());onRename(title.trim());refresh()}),options);
 mount.querySelector('[data-studio-delete]').addEventListener('click',()=>guarded(()=>{const p=owned();if(!confirm(t('graphics.studio.delete.confirm')))return;deleteProject(p.id);onDelete(p.id)}),options);
 mount.addEventListener('click',event=>{const button=event.target.closest('[data-studio-restore]');if(!button)return;guarded(()=>{const p=owned();if(!confirm(t('graphics.studio.restore.confirm')))return;restoreCheckpoint(p.id,button.dataset.studioRestore);onRestore(p.id);refresh()})},options);
 return {refresh,dispose:()=>controller.abort()};
}
