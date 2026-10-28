import {bindCodeStudio} from '../sandbox/code-studio.js';
import {wasmRuntimeProvider} from '../sandbox/providers/wasm-runtime.js';
import {runtimeReadiness} from './runtime-prepare.js';
import {rememberLearningWorkspace} from './offline-learning.js';
import {downloadProjectSources} from '../project-studio/project-transfer.js';
import {projectRuntimeRequest} from '../project-studio/project-build.js';
import {showRuntimeFileResults} from '../sandbox/runtime-files.js';
// Только открытая зашифрованная копия. Ни сетевых Account adapters, ни Cloud fallback.
export function bindLocalEditor({root,project,data,save,settled,render,onDelete,starter,locale='ru'}){
 let initializing=true;const boundEditor=root.querySelector('#editor'),p=project,entry=p.workspace.entryFile||p.manifest?.entryFile||p.workspace.files[0]?.path;
 const report=message=>{if(!boundEditor.isConnected||root.querySelector('#editor')!==boundEditor)return;const out=root.querySelector('#output');if(out)out.textContent=message};
 const persist=()=>{p.updatedAt=new Date().toISOString();rememberLearningWorkspace(data,p);return save()};
 const guarded=fn=>async()=>{if(!current())return;try{await fn()}catch(error){report(error.message)}};
 const studio=bindCodeStudio({editor:root.querySelector('#editor'),locale,files:p.workspace.files,fileName:entry,activeFile:p.workspace.activeFile||entry,languageId:p.languageId||'cpp',onWorkspaceChange:change=>{
  if(initializing||!current())return;p.workspace=change.workspace||change.snapshot||change;if(!Array.isArray(p.workspace.files))p.workspace=studio.workspace.snapshot();p.workspace.entryFile??=entry;void persist().catch(error=>report(error.message));
 }});initializing=false;
 const en=locale==='en';
 const current=()=>boundEditor.isConnected&&root.querySelector('#editor')?.__nexusCodeStudio===studio&&data.projects[p.id]===p;
 root.querySelector('#psSaveProject')?.addEventListener('click',guarded(async()=>{if(!current())return;p.workspace=studio.getSnapshot();await persist();await settled();const status=root.querySelector('#psSaveStatus');if(status)status.textContent=en?'Saved on this device.':'Сохранено на устройстве.'}));
 root.querySelector('#psExportProject')?.addEventListener('click',guarded(async()=>{if(current())downloadProjectSources({...p,workspace:studio.getSnapshot()})}));
 const stdin=root.querySelector('#stdin');if(stdin){stdin.value=p.stdin||'';stdin.oninput=()=>{if(!current())return;p.stdin=stdin.value;void persist().catch(error=>report(error.message))}}
 root.querySelector('#psCheckpoint')?.addEventListener('click',guarded(async()=>{const label=prompt(en?'Checkpoint name':'Название контрольной точки',en?'Working state':'Рабочее состояние');if(!label?.trim())return;await settled();p.checkpoints??=[];p.checkpoints.unshift({id:crypto.randomUUID(),label:label.trim(),createdAt:new Date().toISOString(),workspace:structuredClone(p.workspace),progress:structuredClone(p.progress||{})});await persist();await render()}));
 for(const button of root.querySelectorAll('[data-ps-restore]'))button.onclick=guarded(async()=>{const cp=p.checkpoints.find(x=>x.id===button.dataset.psRestore);if(!cp||!confirm(en?'Restore this checkpoint?':'Восстановить выбранную контрольную точку?'))return;await settled();p.workspace=structuredClone(cp.workspace);p.progress=structuredClone(cp.progress);await persist();await render()});
 root.querySelector('#psRenameProject')?.addEventListener('click',guarded(async()=>{const title=prompt(en?'Project name':'Название проекта',p.title);if(!title?.trim())return;p.title=title.trim();await persist();await render()}));
 root.querySelector('#psDeleteProject')?.addEventListener('click',guarded(async()=>{if(!confirm(en?'Delete this project from the open local copy?':'Удалить этот проект из открытой локальной копии?'))return;await settled();delete data.projects[p.id];await save();onDelete()}));
 for(const box of root.querySelectorAll('[data-ps-milestone]'))box.onchange=()=>{if(!current())return;const i=Number(box.dataset.psMilestone);if(!Number.isSafeInteger(i)||i<0)return;const values=new Set(p.progress?.milestones||[]);box.checked?values.add(i):values.delete(i);p.progress??={};p.progress.milestones=[...values].sort((a,b)=>a-b);void persist().catch(error=>report(error.message))};
 const run=root.querySelector('#runCode');if(run){run.onclick=guarded(async()=>{
  if(run.disabled)return;run.disabled=true;try{await settled();if(!(await runtimeReadiness()).ready)throw Error('Компилятор не подготовлен или его файлы удалены браузером. Подготовьте C++ при подключении. Проект сохранён.');
    const manifest={sourceRoots:['.'],includeRoots:['include'],testRoots:['tests'],...p.manifest,entryFile:entry},request=projectRuntimeRequest(studio,{...p,manifest},stdin?.value||'');if(request.metadata.translationUnits.every(path=>!request.files[path]?.trim()))throw Error(en?'The C++ project is empty. Add a program before running it.':'C++ проект пуст. Добавьте программу перед запуском.');report(en?'Compiling and running…':'Компиляция и выполнение…');const result=await wasmRuntimeProvider.run(request);report((result.stdout||'')+(result.stderr||'')+(result.compilerStderr?'\n'+result.compilerStderr:'')+(result.exitCode!==0?(en?'\nProgram execution failed.':'\nОшибка выполнения программы.'):'')+(en?'\nExit code: ':'\nКод завершения: ')+result.exitCode);showRuntimeFileResults({output:root.querySelector('#output'),result,request,studio,locale,current});
  }finally{wasmRuntimeProvider.shutdown();run.disabled=false}
 });if(p.languageId&&p.languageId!=='cpp'){run.disabled=true;run.title='Для этого языка доступно редактирование файлов.'}}
 root.querySelector('#testRuntime')?.addEventListener('click',guarded(async()=>report((await runtimeReadiness()).ready?'Проверенные файлы компилятора готовы.':'Подготовьте компилятор при подключении.')));
 root.querySelector('#clearOutput')?.addEventListener('click',()=>report('Вывод программы появится здесь.'));
 root.querySelector('#resetCode,#resetPracticum')?.addEventListener('click',guarded(async()=>{if(!confirm('Вернуть исходный пример?'))return;const original=starter;if(!original)return;p.workspace.files=[{path:entry,content:original}];p.workspace.activeFile=entry;await persist();await render()}));
 return studio;
}
