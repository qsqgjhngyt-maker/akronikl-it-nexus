import {projectStudioViewMarkup as sharedProjectView} from './project-presentation.js';
import {codeStudioMarkup,bindCodeStudio} from '../sandbox/code-studio.js';
import {createSandboxController} from '../sandbox/sandbox.js';
import {getProject,patchProject,createCheckpoint,restoreCheckpoint,toggleProjectMilestone,deleteProject,renameProject,getProjectAudit} from './project-store.js';
import {projectRuntimeRequest} from './project-build.js';
import {cloudflareSyncSummary} from '../sync/cloudflare-config.js';
import {listCloudProjects,importCloudProject,enableProjectCloud,pushProjectNow,pullProjectNow,cloudSyncReady} from '../sync/cloud-sync.js';
import {identityV2CredentialState} from '../sync/identity-v2-client.js';

const e=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const fmt=value=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch{return String(value||'')}};
const accessKind=project=>((project?.access?.members||[]).filter(x=>x?.status!=='revoked').length>1?'team':'personal');
const syncLabel=(project,en=false)=>project?.sync?.mode==='cloud'?(project.sync.status==='conflict'?(en?'CONFLICT':'КОНФЛИКТ'):(en?'CLOUD':'ОБЛАКО')):(en?'LOCAL-FIRST':'LOCAL-FIRST');

function cloudControls(project,en=false){
  const cloud=cloudflareSyncSummary();
  const credential=identityV2CredentialState();
  const authLabel=credential.mode==='nexus-session'
    ? (en?'server session':'server session')
    : credential.mode==='legacy-token'
      ? (en?'legacy fallback':'legacy fallback')
      : (en?'none':'нет');

  if(!cloud.configured){
    return`<div class="ps-cloud-actions"><button class="btn tiny" id="psCloudConfigure">⚙ ${en?'Nexus Cloud settings':'Nexus Cloud'}</button></div><div class="ps-note compact">${en?'Cloudflare transport is not connected on this device.':'Cloudflare пока не подключён на этом устройстве.'}</div>`;
  }

  const account=e(cloud.displayName||cloud.subjectId||'Nexus Account');
  const transport=`<br>${en?'auth transport':'auth transport'}: ${e(authLabel)}`;

  if(project.sync?.mode!=='cloud'){
    return`<div class="ps-note compact">${en?'Account':'Аккаунт'}: ${account}<br>${e(cloud.host)}${transport}</div><div class="ps-cloud-actions"><button class="btn tiny primary" id="psEnableCloud">☁ ${en?'Enable cloud':'Включить облако'}</button><button class="btn tiny" id="psCloudConfigure">⚙ ${en?'Cloud settings':'Настройки'}</button></div>`;
  }

  return`<div class="ps-note compact">${en?'Account':'Аккаунт'}: ${account}<br>${e(cloud.host)}${transport}</div><div class="ps-cloud-actions"><button class="btn tiny primary" id="psCloudPush">↑ PUSH</button><button class="btn tiny" id="psCloudPull">↓ PULL</button><button class="btn tiny" id="psCloudConfigure">⚙</button></div>`;
}

export {projectStudioDashboardMarkup} from './project-presentation.js';
export function projectStudioViewMarkup(options={}){if(!options.project)return '';return sharedProjectView({...options,audit:getProjectAudit(options.project?.id,{limit:5}),cloudMarkup:options.project?cloudControls(options.project,options.locale==='en'):''})}

export function bindProjectStudioDashboard({locale='ru',onChanged=()=>{},onOpenProject=()=>{}}={}){
  const en=locale==='en';
  document.querySelector('#psCloudImport')?.addEventListener('click',async()=>{try{
    if(!cloudSyncReady()){const go=confirm(en?'Nexus Cloud is not connected on this device. Open Account → Nexus Cloud settings?':'Nexus Cloud не подключён на этом устройстве. Перейти в Аккаунт → Nexus Cloud?');if(go)location.hash='#view=account&tab=cloud';return}
    const projects=await listCloudProjects();if(!projects.length){alert(en?'No cloud projects yet.':'В облаке пока нет проектов.');return}
    const list=projects.map((item,index)=>`${index+1}. ${item.title} · rev ${item.revision}`).join('\n');const choice=prompt((en?'Choose a project number':'Введите номер проекта')+'\n\n'+list,'1');const index=Number(choice)-1;if(!Number.isInteger(index)||!projects[index])return;
    const selected=projects[index];await importCloudProject(selected.id);onOpenProject(selected.id);
  }catch(error){alert(`${en?'Cloud import error':'Ошибка импорта из облака'}: ${error?.message||error}`)}});
}

export function bindProjectStudio({projectId,locale='ru',onChanged=()=>{},onDeleted=()=>{}}={}){
  const project=getProject(projectId);if(!project)return null;const en=locale==='en';const editor=document.querySelector('#editor');if(!editor)return null;
  const studio=bindCodeStudio({editor,locale,languageId:project.languageId||'cpp',fileName:project.manifest?.entryFile||'src/main.cpp',files:project.workspace?.files||[],activeFile:project.workspace?.activeFile||project.manifest?.entryFile,sessionKey:`project:${projectId}`,onWorkspaceChange:snapshot=>{patchProject(projectId,{workspace:snapshot});onChanged()}});
  const stdin=document.querySelector('#stdin'),output=document.querySelector('#output'),engine=document.querySelector('#engine'),status=document.querySelector('#sandboxStatus'),routeInfo=document.querySelector('#runtimeRoute');
  const runtimeStudio={...studio,runtimeRequest:value=>projectRuntimeRequest(studio,getProject(projectId)||project,value,'run')};
  const controller=createSandboxController({editor,stdin,output,engine,status,routeInfo,requirements:[],locale,languageId:project.languageId||'cpp',codeStudio:runtimeStudio,onCodeChange:()=>{}});
  stdin?.addEventListener('input',()=>patchProject(projectId,{stdin:stdin.value}));
  document.querySelector('#runCode')?.addEventListener('click',()=>controller.run().catch(()=>{}));
  document.querySelector('#testRuntime')?.addEventListener('click',()=>controller.selfTest().catch(()=>{}));
  document.querySelector('#clearOutput')?.addEventListener('click',()=>{studio?.clearRuntimeDiagnostics?.();output.className='output';output.textContent=en?'Project output will appear here.':'Вывод проекта появится здесь.'});
  document.querySelectorAll('[data-ps-milestone]').forEach(box=>box.addEventListener('change',()=>{toggleProjectMilestone(projectId,Number(box.dataset.psMilestone),box.checked);box.closest('.ps-milestone')?.classList.toggle('done',box.checked);onChanged()}));
  document.querySelector('#psCheckpoint')?.addEventListener('click',()=>{const label=prompt(en?'Checkpoint name':'Название checkpoint',en?'Working state':'Рабочее состояние');if(!label)return;createCheckpoint(projectId,label);onChanged(true)});
  document.querySelectorAll('[data-ps-restore]').forEach(btn=>btn.addEventListener('click',()=>{if(!confirm(en?'Restore this checkpoint? Current files will be replaced.':'Восстановить этот checkpoint? Текущие файлы будут заменены.'))return;restoreCheckpoint(projectId,btn.dataset.psRestore);onChanged(true)}));
  document.querySelector('#psRenameProject')?.addEventListener('click',()=>{const current=getProject(projectId);const title=prompt(en?'Project name':'Название проекта',current?.title||'');if(!title?.trim())return;renameProject(projectId,title.trim());onChanged(true)});
  document.querySelector('#psDeleteProject')?.addEventListener('click',()=>{if(!confirm(en?'Delete this local project?':'Удалить этот локальный проект?'))return;deleteProject(projectId);onDeleted()});
  const cloudAction=async fn=>{try{await fn();onChanged(true)}catch(error){alert(`${en?'Cloud Sync error':'Ошибка Cloud Sync'}: ${error?.message||error}`)}};
  document.querySelector('#psCloudConfigure')?.addEventListener('click',()=>{location.hash='#view=account&tab=cloud'});
  document.querySelector('#psEnableCloud')?.addEventListener('click',()=>cloudAction(()=>enableProjectCloud(projectId)));
  document.querySelector('#psCloudPush')?.addEventListener('click',()=>cloudAction(()=>pushProjectNow(projectId)));
  document.querySelector('#psCloudPull')?.addEventListener('click',()=>{if(!confirm(en?'Replace the local project with the latest cloud revision?':'Заменить локальное состояние проекта последней облачной ревизией?'))return;cloudAction(()=>pullProjectNow(projectId))});
  return{studio,controller};
}
