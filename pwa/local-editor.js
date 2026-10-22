import {bindCodeStudio} from '../sandbox/code-studio.js';
import {wasmRuntimeProvider} from '../sandbox/providers/wasm-runtime.js';
import {runtimeReadiness} from './runtime-prepare.js';
import {rememberLearningWorkspace} from './offline-learning.js';
// Только открытая зашифрованная копия. Ни сетевых Account adapters, ни Cloud fallback.
export function bindLocalEditor({root,project,data,save,settled,render,onDelete,starter,locale='ru'}){
 let initializing=true;const p=project,entry=p.workspace.entryFile||p.manifest?.entryFile||p.workspace.files[0]?.path;
 const report=message=>{const out=root.querySelector('#output');if(out)out.textContent=message};
 const persist=()=>{p.updatedAt=new Date().toISOString();rememberLearningWorkspace(data,p);return save()};
 const guarded=fn=>async()=>{try{await fn()}catch(error){report(error.message)}};
 const studio=bindCodeStudio({editor:root.querySelector('#editor'),locale,files:p.workspace.files,fileName:entry,activeFile:p.workspace.activeFile||entry,languageId:p.languageId||'cpp',onWorkspaceChange:change=>{
  if(initializing)return;p.workspace=change.workspace||change.snapshot||change;if(!Array.isArray(p.workspace.files))p.workspace=studio.workspace.snapshot();p.workspace.entryFile??=entry;void persist().catch(error=>report(error.message));
 }});initializing=false;
 const stdin=root.querySelector('#stdin');if(stdin){stdin.value=p.stdin||'';stdin.oninput=()=>{p.stdin=stdin.value;void persist().catch(error=>report(error.message))}}
 root.querySelector('#psCheckpoint')?.addEventListener('click',guarded(async()=>{const label=prompt('Название контрольной точки','Рабочее состояние');if(!label?.trim())return;await settled();p.checkpoints??=[];p.checkpoints.unshift({id:crypto.randomUUID(),label:label.trim(),createdAt:new Date().toISOString(),workspace:structuredClone(p.workspace),progress:structuredClone(p.progress||{})});await persist();await render()}));
 for(const button of root.querySelectorAll('[data-ps-restore]'))button.onclick=guarded(async()=>{const cp=p.checkpoints.find(x=>x.id===button.dataset.psRestore);if(!cp||!confirm('Восстановить выбранную контрольную точку?'))return;await settled();p.workspace=structuredClone(cp.workspace);p.progress=structuredClone(cp.progress);await persist();await render()});
 root.querySelector('#psRenameProject')?.addEventListener('click',guarded(async()=>{const title=prompt('Название проекта',p.title);if(!title?.trim())return;p.title=title.trim();await persist();await render()}));
 root.querySelector('#psDeleteProject')?.addEventListener('click',guarded(async()=>{if(!confirm('Удалить этот проект из открытой локальной копии?'))return;await settled();delete data.projects[p.id];await save();onDelete()}));
 for(const box of root.querySelectorAll('[data-ps-milestone]'))box.onchange=()=>{const i=Number(box.dataset.psMilestone);if(!Number.isSafeInteger(i)||i<0)return;const values=new Set(p.progress?.milestones||[]);box.checked?values.add(i):values.delete(i);p.progress??={};p.progress.milestones=[...values].sort((a,b)=>a-b);void persist().catch(error=>report(error.message))};
 const run=root.querySelector('#runCode');if(run){run.onclick=guarded(async()=>{
  if(run.disabled)return;run.disabled=true;try{await settled();if(!(await runtimeReadiness()).ready)throw Error('Компилятор не подготовлен или его файлы удалены браузером. Подготовьте C++ при подключении. Проект сохранён.');
   report('Компиляция и выполнение…');const files=Object.fromEntries(p.workspace.files.map(f=>[f.path,f.content])),result=await wasmRuntimeProvider.run({languageId:'cpp',entryFile:entry,source:files[entry],files,stdin:stdin?.value||''});report((result.stdout||'')+(result.stderr||'')+'\nКод завершения: '+result.exitCode);
  }finally{wasmRuntimeProvider.shutdown();run.disabled=false}
 });if(p.languageId&&p.languageId!=='cpp'){run.disabled=true;run.title='Для этого языка доступно редактирование файлов.'}}
 root.querySelector('#testRuntime')?.addEventListener('click',guarded(async()=>report((await runtimeReadiness()).ready?'Проверенные файлы компилятора готовы.':'Подготовьте компилятор при подключении.')));
 root.querySelector('#clearOutput')?.addEventListener('click',()=>report('Вывод программы появится здесь.'));
 root.querySelector('#resetCode,#resetPracticum')?.addEventListener('click',guarded(async()=>{if(!confirm('Вернуть исходный пример?'))return;const original=starter;if(!original)return;p.workspace.files=[{path:entry,content:original}];p.workspace.activeFile=entry;await persist();await render()}));
 return studio;
}
