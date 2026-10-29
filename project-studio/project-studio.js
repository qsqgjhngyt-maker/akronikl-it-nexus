import {projectStudioViewMarkup as sharedProjectView} from './project-presentation.js';
import {downloadProjectSources} from './project-transfer.js';
import {verifiedAccount} from '../core/account-storage.js';
import {registerUpdateParticipant} from '../pwa/interface-update.js';
import {codeStudioMarkup,bindCodeStudio} from '../sandbox/code-studio.js';
import {createSandboxController} from '../sandbox/sandbox.js';
import {createProject,getProject,patchProject,createCheckpoint,restoreCheckpoint,toggleProjectMilestone,deleteProject,renameProject,getProjectAudit} from './project-store.js';
import {projectRuntimeRequest} from './project-build.js';
import {cloudflareSyncSummary} from '../sync/cloudflare-config.js';
import {listCloudProjects,importCloudProject,enableProjectCloud,pushProjectNow,pullProjectNow,cloudSyncReady} from '../sync/cloud-sync.js';
import {identityV2CredentialState} from '../sync/identity-v2-client.js';

const e=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const fmt=value=>{try{return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch{return String(value||'')}};
const accessKind=project=>((project?.access?.members||[]).filter(x=>x?.status!=='revoked').length>1?'team':'personal');
const syncLabel=(project,en=false)=>project?.sync?.mode==='cloud'?(project.sync.status==='conflict'?(en?'CONFLICT':'КОНФЛИКТ'):(en?'CLOUD':'ОБЛАКО')):(en?'LOCAL-FIRST':'LOCAL-FIRST');
let activeEditor=null;
globalThis.addEventListener?.('beforeunload',event=>{if(activeEditor?.dirty()&&activeEditor.current()){event.preventDefault();event.returnValue=''}});
registerUpdateParticipant({isDirty:()=>!!(activeEditor?.current()&&activeEditor.dirty())});
export function prepareProjectNavigation(){
 if(!activeEditor?.current())return true;
 if(activeEditor.dirty()&&!activeEditor.save()){
  if(!confirm(activeEditor.en?'Changes could not be saved. Leave this editor and discard the unsaved changes? Export the sources to keep them.':'Изменения не удалось сохранить. Покинуть редактор и потерять несохранённые изменения? Чтобы сохранить код, останьтесь и экспортируйте исходники.')){
   history.replaceState(null,'',location.pathname+location.search+activeEditor.hash);return false;
  }
 }
 activeEditor?.dispose?.();activeEditor=null;return true;
}

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
  const application=document.createElement('button');application.type='button';application.className='btn';application.id='psNewApplication';application.textContent=en?'＋ C++ application':'＋ Приложение C++';document.querySelector('#psNewProject')?.after(application);application.addEventListener('click',async()=>{if(!confirm(en?'This new GUI project uses Qt under GPLv3. If you distribute the application, provide corresponding source and GPLv3 rights. Private work is not automatically published to GitHub. Create the project?':'Новый GUI-проект использует Qt под GPLv3. При передаче приложения другим нужно предоставить соответствующие исходники и права GPLv3. Личная работа автоматически в GitHub не публикуется. Создать проект?'))return;application.disabled=true;try{const{taskFlowApplicationTemplate}=await import('./application-template.js');const project=createProject(taskFlowApplicationTemplate());onOpenProject(project.id);}catch(e){alert(e.message)}finally{application.disabled=false}});
  document.querySelector('#psCloudImport')?.addEventListener('click',async()=>{try{
    if(!cloudSyncReady()){const go=confirm(en?'Nexus Cloud is not connected on this device. Open Account → Nexus Cloud settings?':'Nexus Cloud не подключён на этом устройстве. Перейти в Аккаунт → Nexus Cloud?');if(go)location.hash='#view=account&tab=cloud';return}
    const projects=await listCloudProjects();if(!projects.length){alert(en?'No cloud projects yet.':'В облаке пока нет проектов.');return}
    const list=projects.map((item,index)=>`${index+1}. ${item.title} · rev ${item.revision}`).join('\n');const choice=prompt((en?'Choose a project number':'Введите номер проекта')+'\n\n'+list,'1');const index=Number(choice)-1;if(!Number.isInteger(index)||!projects[index])return;
    const selected=projects[index];await importCloudProject(selected.id);onOpenProject(selected.id);
  }catch(error){alert(`${en?'Cloud import error':'Ошибка импорта из облака'}: ${error?.message||error}`)}});
}

export function bindProjectStudio({projectId,locale='ru',onChanged=()=>{},onDeleted=()=>{}}={}){
  const project=getProject(projectId);if(!project)return null;const en=locale==='en';const editor=document.querySelector('#editor');if(!editor)return null;
  if(project.origin?.kind==='course-final'&&/^[a-f0-9-]{36}$/.test(project.origin.attemptId||'')){const back=document.createElement('a');back.className='btn tiny';back.dataset.finalReturn='';back.href='#view=course-final&attempt='+encodeURIComponent(project.origin.attemptId)+'&tab='+(String(project.origin.part).startsWith('P')?'practical':project.origin.part==='defense'?'defense':'project');back.textContent=en?'Back to final assessment':'К итоговой работе';document.querySelector('#psSaveProject')?.before(back);}
  const boundAccount=verifiedAccount()?.accountId;
  let unsaved=false;
  const contextValid=()=>editor.isConnected&&boundAccount&&verifiedAccount()?.accountId===boundAccount;
  const saveStatus=message=>{const status=document.querySelector('#psSaveStatus');if(contextValid()&&status)status.textContent=message};
  const studio=bindCodeStudio({editor,locale,languageId:project.languageId||'cpp',fileName:project.manifest?.entryFile||'src/main.cpp',files:project.workspace?.files||[],activeFile:project.workspace?.activeFile||project.manifest?.entryFile,sessionKey:`project:${projectId}`,onWorkspaceChange:(snapshot,type)=>{
   if(!contextValid())return;
   if(type==='init'||type==='view-state')return;
   unsaved=true;
   try{patchProject(projectId,{workspace:snapshot});unsaved=false;saveStatus(en?'Saved on this device.':'Сохранено на устройстве.');onChanged()}
   catch{saveStatus(en?'Could not save. Keep this editor open and export your sources.':'Не удалось сохранить. Не закрывайте редактор; экспортируйте исходники.')}
  }});
  const saveNow=()=>{if(!contextValid())return false;try{patchProject(projectId,{workspace:studio.getSnapshot(),stdin:document.querySelector('#stdin')?.value||''});unsaved=false;saveStatus(en?'Saved on this device.':'Сохранено на устройстве.');return true}catch{unsaved=true;saveStatus(en?'Could not save. Keep this editor open and export your sources.':'Не удалось сохранить. Не закрывайте редактор; экспортируйте исходники.');return false}};
  let applicationPanel=null;activeEditor={current:contextValid,dirty:()=>unsaved,save:saveNow,hash:location.hash,en,dispose:()=>applicationPanel?.dispose()};
  document.querySelector('#psSaveProject')?.addEventListener('click',saveNow);
  document.querySelector('#psExportProject')?.addEventListener('click',()=>{if(!contextValid())return;try{downloadProjectSources({...getProject(projectId),workspace:studio.getSnapshot()})}catch{saveStatus(en?'Could not export this workspace.':'Не удалось экспортировать эту структуру файлов.')}});
  const stdin=document.querySelector('#stdin'),output=document.querySelector('#output'),engine=document.querySelector('#engine'),status=document.querySelector('#sandboxStatus'),routeInfo=document.querySelector('#runtimeRoute');
  const runtimeStudio={...studio,runtimeRequest:value=>projectRuntimeRequest(studio,getProject(projectId)||project,value,'run')};
  const isApplication=project.workspace?.files?.some(f=>f.path==='nexus-application.json');
  const controller=isApplication?null:createSandboxController({editor,stdin,output,engine,status,routeInfo,requirements:[],locale,languageId:project.languageId||'cpp',codeStudio:runtimeStudio,onCodeChange:()=>{}});
  if(isApplication){stdin?.closest('label')?.style.setProperty('display','none');output.style.display='none';status.textContent=en?'C++ diagnostics will come from the application build.':'Ошибки C++ проверит сборка приложения.';routeInfo.textContent='Qt · C++';engine.textContent=en?'Preparing the browser runtime…':'Готовим среду браузера…';}
  stdin?.addEventListener('input',()=>{if(!contextValid())return;unsaved=true;saveNow()});
  const runButton=document.querySelector('#runCode');if(isApplication)runButton.disabled=true;else runButton?.addEventListener('click',()=>{if(!contextValid())return;const request=runtimeStudio.runtimeRequest(stdin?.value||'');if(request.metadata.translationUnits.every(path=>!request.files[path]?.trim())){output.textContent=en?'The C++ project is empty. Add a program before running it.':'C++ проект пуст. Добавьте программу перед запуском.';return}void controller.run().catch(()=>{})});
  import('./application-panel.js').then(async({bindApplicationPanel})=>{if(!contextValid())return;const bound=await bindApplicationPanel({project,studio,current:contextValid,save:saveNow,runButton,locale});if(contextValid())applicationPanel=bound;else bound?.dispose();}).catch(()=>{if(contextValid()&&isApplication){output.style.display='';output.textContent=en?'Application controls could not load. Sources are preserved.':'Не удалось загрузить управление приложением. Исходники сохранены.';}});
  if(!isApplication)document.querySelector('#testRuntime')?.addEventListener('click',()=>controller.selfTest().catch(()=>{}));
  document.querySelector('#clearOutput')?.addEventListener('click',()=>{studio?.clearRuntimeDiagnostics?.();output.className='output';output.textContent=en?'Project output will appear here.':'Вывод проекта появится здесь.'});
  document.querySelectorAll('[data-ps-milestone]').forEach(box=>box.addEventListener('change',()=>{toggleProjectMilestone(projectId,Number(box.dataset.psMilestone),box.checked);box.closest('.ps-milestone')?.classList.toggle('done',box.checked);onChanged()}));
  document.querySelector('#psCheckpoint')?.addEventListener('click',()=>{const label=prompt(en?'Checkpoint name':'Название checkpoint',en?'Working state':'Рабочее состояние');if(!label||!contextValid()||!saveNow())return;try{createCheckpoint(projectId,label);onChanged(true)}catch{saveStatus(en?'Could not save the checkpoint. Your sources are still open.':'Не удалось сохранить контрольную точку. Исходники остаются открытыми.')}});
  document.querySelectorAll('[data-ps-restore]').forEach(btn=>btn.addEventListener('click',()=>{if(!contextValid()||!confirm(en?'Restore this checkpoint? Current files will be replaced.':'Восстановить этот checkpoint? Текущие файлы будут заменены.'))return;restoreCheckpoint(projectId,btn.dataset.psRestore);onChanged(true)}));
  document.querySelector('#psRenameProject')?.addEventListener('click',()=>{if(!contextValid())return;const current=getProject(projectId);const title=prompt(en?'Project name':'Название проекта',current?.title||'');if(!title?.trim())return;try{renameProject(projectId,title.trim());onChanged(true)}catch{saveStatus(en?'Could not rename the project.':'Не удалось переименовать проект.')}});
  document.querySelector('#psDeleteProject')?.addEventListener('click',()=>{if(!confirm(en?'Delete this local project?':'Удалить этот локальный проект?'))return;deleteProject(projectId);onDeleted()});
  const cloudAction=async fn=>{try{await fn();onChanged(true)}catch(error){alert(`${en?'Cloud Sync error':'Ошибка Cloud Sync'}: ${error?.message||error}`)}};
  document.querySelector('#psCloudConfigure')?.addEventListener('click',()=>{location.hash='#view=account&tab=cloud'});
  document.querySelector('#psEnableCloud')?.addEventListener('click',()=>cloudAction(()=>enableProjectCloud(projectId)));
  document.querySelector('#psCloudPush')?.addEventListener('click',()=>cloudAction(()=>pushProjectNow(projectId)));
  document.querySelector('#psCloudPull')?.addEventListener('click',()=>{if(!confirm(en?'Replace the local project with the latest cloud revision?':'Заменить локальное состояние проекта последней облачной ревизией?'))return;cloudAction(()=>pullProjectNow(projectId))});
  return{studio,controller};
}
