import {verifiedAccount} from '../core/account-storage.js';
import {isCurrentProjectOwner} from '../core/identity.js';
import {loadState,saveState} from '../core/storage.js';
import {listProjects,patchProject,createProject} from '../project-studio/project-store.js';
import {createVaultStore} from './local-vault.js';
import {makeLocalPayload,transferPlan} from './offline-transfer.js';
import {ensureVerifiedRuntime} from './client.js';
import {runtimeReadiness} from './runtime-prepare.js';
export function offlineCenterMarkup(){
 return '<section class="account-panel glass-panel" data-offline-center><h1>Работа без интернета</h1><p>Академия, личные проекты и прогресс доступны в отдельной локальной копии. Для открытия после закрытия PWA задайте локальную фразу. Она не отправляется на сервер и не заменяет вход в Nexus. Если фраза потеряна, исходные данные аккаунта остаются на месте.</p><form data-local-create><label>Локальная фраза (от 12 символов)<input type="password" name="localPhrase" autocomplete="off" minlength="12" maxlength="1024" required></label><label>Повторите фразу<input type="password" name="localRepeat" autocomplete="off" required></label><button class="btn primary">Подготовить личную офлайн-копию</button></form><p>Копируются только ваши личные проекты и обучение. Командные проекты, credentials и серверные ответы не копируются.</p><button class="btn" data-prepare-runtime>Подготовить C++ компилятор · около 106 МБ</button><p data-local-status role="status" aria-live="polite"></p><a class="btn" data-open-local href="./offline.html">Открыть офлайн-среду</a><hr><h2>Перенос изменений в аккаунт</h2><p>Войдите в тот же аккаунт. Перенос выполняется явно; спорные проекты сохраняются отдельными копиями, спорный прогресс остаётся в локальной копии и в записи конфликта. PUSH/PULL выполняются после переноса обычными кнопками Nexus Cloud.</p><form data-local-import><label>Локальная копия<select name="vaultId" required></select></label><label>Локальная фраза<input type="password" name="localPhrase" autocomplete="off" required></label><button class="btn">Перенести изменения в этот аккаунт</button></form></section>';
}
export async function bindOfflineCenter(){
 const root=document.querySelector('[data-offline-center]');if(!root)return;
 const store=createVaultStore(),status=root.querySelector('[data-local-status]'),select=root.querySelector('select');
 const refresh=async()=>{const rows=await store.list();select.replaceChildren(...rows.map((row,i)=>{const option=document.createElement('option');option.value=row.id;option.textContent='Локальная копия '+(i+1)+' · '+row.id.slice(0,8);return option}))};
 async function prove(){
  const expected=verifiedAccount(),{readVerifiedSession}=await import('../core/bootstrap.js'),dto=await readVerifiedSession();
  if(!expected||!dto||dto.account.accountId!==expected.accountId)throw Error('Серверная проверка этого аккаунта не пройдена. Перенос не выполнялся.');
  return expected;
 }
 function formAction(form,action){
  form.addEventListener('submit',async event=>{
   event.preventDefault();const button=form.querySelector('button');if(button.disabled)return;button.disabled=true;
   try{await action(new FormData(form));await refresh()}catch(error){
    const messages={LOCAL_UNLOCK_FAILED:'Не удалось открыть копию. Проверьте фразу.',LOCAL_PHRASE_REQUIRED:'Введите локальную фразу не короче 12 символов, кроме пробелов.',OFFLINE_ACCOUNT_MISMATCH:'Эта локальная копия принадлежит другому аккаунту. Перенос запрещён.',STRICT_DURABILITY_REQUIRED:'Браузер не подтвердил надёжную запись. Офлайн-копия не объявляется готовой.'};
    status.textContent=messages[error.code]||(error.name==='QuotaExceededError'?'Недостаточно места. Исходные проекты сохранены; копия не объявляется готовой.':error.message);
   }
   finally{form.querySelectorAll('input[type=password]').forEach(i=>i.value='');button.disabled=false}
  });
 }
 formAction(root.querySelector('[data-local-create]'),async fields=>{
  if(fields.get('localPhrase')!==fields.get('localRepeat'))throw Error('Фразы не совпадают.');
  const account=await prove();await ensureVerifiedRuntime();
  const payload=makeLocalPayload({account,state:loadState(),projects:listProjects(),isOwner:isCurrentProjectOwner});
  const session=await store.create(payload,fields.get('localPhrase')),id=session.id;await session.lock();
  status.textContent='Учебные ресурсы и личная копия сохранены. Компилятор готовится отдельно. Фразу храните у себя.';
  root.querySelector('[data-open-local]').href='./offline.html#copy='+encodeURIComponent(id);
 });
 const prep=root.querySelector('[data-prepare-runtime]');
 prep.onclick=async()=>{if(prep.disabled)return;prep.disabled=true;try{await runtimeReadiness({prepare:true,onProgress:p=>{status.textContent='Компилятор: '+p.completed+' из '+p.total+' файлов проверено и сохранено.'}});status.textContent='C++ компилятор полностью проверен и сохранён для офлайна.'}catch(error){status.textContent=error.message}finally{prep.disabled=false}};
 formAction(root.querySelector('[data-local-import]'),async fields=>{
  const session=await store.unlock(fields.get('vaultId'),fields.get('localPhrase'));
  try{
   const account=await prove(),payload=session.read();
   const plan=transferPlan(payload,account,loadState(),listProjects(),{vaultId:session.id,revision:session.revision});
   for(const item of plan.projects){
    const p=item.data;
    if(item.action==='patch')patchProject(item.id,{title:p.title,description:p.description,workspace:p.workspace,progress:p.progress,checkpoints:p.checkpoints,stdin:p.stdin||'',...(p.manifest?{manifest:p.manifest}:{}),origin:{...listProjects().find(x=>x.id===item.id)?.origin,offlineImport:item.marker}});
    else {
     const origin=p.origin?.kind==='graphics-lab'?{kind:'graphics-lab',template:['nexus','sphere','orbit','system','blank'].includes(p.origin.template)?p.origin.template:'blank',offlineImport:item.marker}:{kind:'offline-copy',offlineImport:item.marker};
     const created=createProject({title:p.title+' · офлайн-копия',languageId:p.languageId,files:p.workspace.files,entryFile:p.workspace.entryFile,activeFile:p.workspace.activeFile,sourceRoots:p.manifest?.sourceRoots,includeRoots:p.manifest?.includeRoots,testRoots:p.manifest?.testRoots,origin});
     patchProject(created.id,{workspace:p.workspace,progress:p.progress,checkpoints:p.checkpoints,stdin:p.stdin||'',...(p.manifest?{manifest:p.manifest}:{})});
    }
   }
   if(!plan.alreadyApplied)saveState(plan.state);
   status.textContent=plan.alreadyApplied?'Эта версия уже перенесена.':('Изменения перенесены. Отдельных конфликтов: '+plan.conflicts.length+'. Исходная офлайн-копия сохранена. Cloud PUSH/PULL запускаются только вами.');
  }finally{await session.lock()}
 });
 try{await refresh()}catch{status.textContent='Локальное хранилище недоступно. Данные аккаунта не изменены.'}
}
