import {getCppCourse,getCatalog} from '../core/course-registry.js';
import {codeStudioMarkup,bindCodeStudio} from '../sandbox/code-studio.js';
import {wasmRuntimeProvider} from '../sandbox/providers/wasm-runtime.js';
import {createVaultStore} from './local-vault.js';
import {runtimeReadiness} from './runtime-prepare.js';
import {ensureVerifiedRuntime} from './client.js';
import {memoryLabMarkup,bindMemoryLab} from '../core/memory-lab.js';
import {oopLabMarkup,bindOopLab} from '../core/oop-lab.js';
import {exerciseCopy,learningState,rememberLearningWorkspace,markTask} from './offline-learning.js';
import {graphicsLabMarkup,bindGraphicsLab} from '../effects/nexus-graphics-lab.js';
const root=document.querySelector('#offlineApp'),saved=document.querySelector('#saveStatus'),store=createVaultStore();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=v=>structuredClone(v),label=v=>typeof v==='string'?v:v?.ru||v?.en||'';
let session=null,data=null,course=null,catalog=null,studio=null,queue=Promise.resolve(),pending=0,saveFailed=false,renderSequence=0,locale='ru';
const keys={theory:'Теория',deep:'Подробнее',analogy:'Аналогия',commonMistake:'Частая ошибка',code:'Пример кода',task:'Упражнение',hint:'Подсказка',solution:'Решение',lab:'Лабораторная работа',tasks:'Задания',goal:'Цель',challenge:'Практическая задача',starter:'Начальный код',stdin:'Входные данные',expectedOutput:'Ожидаемый результат',benchmark:'Учебный материал'};
function content(value,key='',depth=0){
 if(depth>15||value==null)return '';
 if(typeof value==='string')return /code|solution|starter|source/i.test(key)?'<pre><code>'+esc(value)+'</code></pre>':'<p>'+esc(value)+'</p>';
 if(typeof value==='number'||typeof value==='boolean')return '<p>'+esc(value)+'</p>';
 if(Array.isArray(value))return '<ol>'+value.map(v=>'<li>'+content(v,key,depth+1)+'</li>').join('')+'</ol>';
 return '<dl>'+Object.entries(value).filter(([k])=>!['id','legacyIndex','order','sectionId','source'].includes(k)).map(([k,v])=>'<dt>'+esc(keys[k]||k)+'</dt><dd>'+content(v,k,depth+1)+'</dd>').join('')+'</dl>';
}
function save(){
 if(!session)return Promise.reject(Error('Откройте локальную копию.'));
 pending++;saveFailed=false;saved.textContent='Сохраняем изменения на устройстве…';
 const snapshot=clone(data),operation=session.save(snapshot);
 queue=operation.then(result=>{
  pending--;if(result.branched)saved.textContent='Другая вкладка изменила копию. Ваши изменения сохранены в отдельной локальной копии '+result.id.slice(0,8)+'.';
  else if(!pending)saved.textContent='Сохранено на устройстве · версия '+result.revision;
  return result;
 }).catch(error=>{pending--;saveFailed=true;saved.textContent='Не удалось сохранить изменения. Не закрывайте редактор; освободите место и нажмите «Сохранить». Проекты не удалены.';throw error});
 queue.catch(()=>{});return queue;
}
async function settled(){await queue;if(saveFailed)throw Error('Сначала сохраните изменения.')}
function needLocal(){if(data)return true;root.innerHTML='<h1>Локальная копия закрыта</h1><p>Для проектов и сохранения прогресса откройте свою копию локальной фразой.</p><a href="#view=unlock">Открыть копию</a>';return false}
async function unlockView(){
 const rows=await store.list(),requested=new URLSearchParams(location.hash.slice(1)).get('copy');
 root.innerHTML='<h1>Открыть локальную копию</h1><p>Это доступ к сохранённым данным на устройстве, не вход в серверный аккаунт. Для подготовки копии откройте «Работа без интернета» в обычном Nexus при наличии сети.</p><form id="unlockLocal"><label>Локальная копия<select id="localCopy">'+rows.map((r,i)=>'<option value="'+esc(r.id)+'" '+(requested===r.id?'selected':'')+'>Копия '+(i+1)+' · '+esc(r.id.slice(0,8))+'</option>').join('')+'</select></label><label>Локальная фраза<input id="localPhrase" type="password" autocomplete="off" minlength="12" maxlength="1024" required></label><button '+(!rows.length?'disabled':'')+'>Открыть</button></form><p id="unlockStatus" role="status"></p>';
 root.querySelector('form').onsubmit=async event=>{
  event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
  try{session=await store.unlock(root.querySelector('#localCopy').value,root.querySelector('#localPhrase').value);data=session.read();saved.textContent='Открыта локальная копия · '+data.owner.displayName+'. Облачный вход не подтверждён.';document.querySelector('#lockLocal').hidden=false;location.hash='#view=projects'}
  catch{root.querySelector('#unlockStatus').textContent='Копия не открыта. Проверьте фразу; данные не изменены.'}
  finally{const input=root.querySelector('#localPhrase');if(input)input.value='';button.disabled=false}
 };
}
function lessons(){
 const state=data?.state.courses?.cpp?.lessons||{};
 return '<h1>Академия · офлайн</h1><p>Все подготовленные учебные страницы загружаются из проверенного публичного поколения.</p><p><a href="#view=computer-graphics">Компьютерная графика · интерактивная лаборатория</a></p><h2>C++ · '+course.curriculum.lessons.length+' тем</h2><ol>'+course.curriculum.lessons.map(l=>'<li><a href="#lesson='+encodeURIComponent(l.id)+'">'+esc(label(l.title))+'</a> '+(state[l.id]?.completed?'✓':'')+'</li>').join('')+'</ol><h2>Практикумы</h2><ul>'+course.practicumsRu.practicums.map(p=>'<li><a href="#practicum='+encodeURIComponent(p.id)+'">'+esc(p.title)+'</a></li>').join('')+'</ul><h2>Учебные проекты</h2><ul>'+course.projectsRu.projects.map(p=>'<li><a href="#exercise='+encodeURIComponent(p.id)+'">'+esc(p.title)+'</a></li>').join('')+'</ul><details><summary>Каталог Академии</summary>'+catalog.courses.map(c=>'<p>'+esc(label(c.title))+' · '+(c.id==='cpp'||c.id==='programming'?'Материалы C++ доступны выше':esc(c.status||'В подготовке'))+'</p>').join('')+'</details>';
}
function projectTemplate(title,source,id=crypto.randomUUID()){
 return {id,title,description:'',languageId:'cpp',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:0,files:[{path:'main.cpp',content:source||'#include <iostream>\nint main(){std::cout << "Nexus\\n";}\n',languageId:'cpp'}]},progress:{},checkpoints:[]};
}
function projectList(){
 if(!needLocal())return;
 root.innerHTML='<h1>Локальные проекты</h1><p>Только открытая копия: '+esc(data.owner.displayName)+'. Cloud не вызывается автоматически.</p><button id="newProject">Новый локальный проект</button><div class="offline-grid">'+Object.values(data.projects).map(p=>'<article><h2>'+esc(p.title)+'</h2><a href="#project='+encodeURIComponent(p.id)+'">Открыть редактор</a><p>Файлов: '+p.workspace.files.length+' · контрольных точек: '+p.checkpoints.length+'</p></article>').join('')+'</div>';
 root.querySelector('#newProject').onclick=async()=>{const title=prompt('Название проекта','Мой C++ проект');if(!title?.trim())return;const p=projectTemplate(title.trim());data.projects[p.id]=p;await save();location.hash='#project='+encodeURIComponent(p.id)};
}
async function editor(p){
 if(!needLocal())return;if(!p){root.innerHTML='<h1>Проект не найден в этой копии</h1>';return}
 root.innerHTML='<section class="offline-editor"><h1>'+esc(p.title)+'</h1>'+codeStudioMarkup({files:p.workspace.files,entryFile:p.workspace.entryFile,activeFile:p.workspace.activeFile,languageId:p.languageId||'cpp'})+'<label>Входные данные<textarea id="stdin"></textarea></label><button id="saveProject">Сохранить</button><button id="checkpoint">Контрольная точка</button><button id="runCpp">Скомпилировать и запустить C++</button><pre id="runOutput" role="status">Результат выполнения</pre><label>Контрольные точки<select id="checkpoints">'+p.checkpoints.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.label)+'</option>').join('')+'</select></label><button id="restorePoint" '+(!p.checkpoints.length?'disabled':'')+'>Восстановить контрольную точку</button></section>';
 let initializing=true;
 studio=bindCodeStudio({editor:root.querySelector('#editor'),files:p.workspace.files,fileName:p.workspace.entryFile,activeFile:p.workspace.activeFile,languageId:p.languageId||'cpp',onWorkspaceChange:change=>{
  if(initializing)return;p.workspace=change.workspace||change.snapshot||change;
  // Code Studio использует snapshot с вложенным workspace в разных UI событиях.
  if(!Array.isArray(p.workspace.files))p.workspace=studio.workspace.snapshot();
  rememberLearningWorkspace(data,p);void save().catch(()=>{});
 }});
 initializing=false;
 root.querySelector('#stdin').value=p.stdin||'';
 root.querySelector('#stdin').oninput=event=>{p.stdin=event.target.value;rememberLearningWorkspace(data,p);void save().catch(()=>{})};
 if(p.languageId&&p.languageId!=='cpp'){root.querySelector('#runCpp').hidden=true;root.querySelector('#runOutput').textContent='Файлы этого проекта доступны для редактирования и сохранения. Здесь выполняются C++ проекты.'}
 const definition=course.projectsRu.projects.find(x=>x.id===p.origin?.projectId);
 if(definition){const section=document.createElement('section');section.innerHTML='<h2>Этапы учебного проекта</h2>'+definition.milestones.map((m,i)=>'<label><input type="checkbox" data-milestone="'+i+'" '+(p.progress?.milestones?.includes(i)?'checked':'')+'>'+esc(m.t)+' — '+esc(m.d)+'</label>').join('');root.append(section);section.onchange=event=>{const i=Number(event.target.dataset.milestone);if(!Number.isInteger(i)||i<0||i>=definition.milestones.length)return;const done=new Set(p.progress.milestones||[]);event.target.checked?done.add(i):done.delete(i);p.progress.milestones=[...done].sort((a,b)=>a-b);void save().catch(()=>{})}}
 root.querySelector('#saveProject').onclick=()=>save().catch(()=>{});
 root.querySelector('#checkpoint').onclick=async()=>{await settled();p.checkpoints.unshift({id:crypto.randomUUID(),label:'Точка '+new Date().toLocaleString('ru'),createdAt:new Date().toISOString(),workspace:clone(p.workspace),progress:clone(p.progress)});await save();await editor(p)};
 root.querySelector('#restorePoint').onclick=async()=>{const point=p.checkpoints.find(c=>c.id===root.querySelector('#checkpoints').value);if(!point)return;p.workspace=clone(point.workspace);p.progress=clone(point.progress);rememberLearningWorkspace(data,p);await save();await editor(p)};
 const run=root.querySelector('#runCpp');
 run.onclick=async()=>{if(run.disabled)return;run.disabled=true;const out=root.querySelector('#runOutput');try{
  await settled();out.textContent='Проверяем сохранённый компилятор…';const ready=await runtimeReadiness();
  if(!ready.ready)throw Error('Компилятор ещё не подготовлен или браузер удалил его кеш. Подключитесь к сети и откройте «Компилятор C++». Проект сохранён.');
  out.textContent='Компиляция и выполнение…';
  const files=Object.fromEntries(p.workspace.files.map(f=>[f.path,f.content])),result=await wasmRuntimeProvider.run({languageId:'cpp',entryFile:p.workspace.entryFile,source:files[p.workspace.entryFile],files,stdin:root.querySelector('#stdin').value});
  out.textContent=(result.stdout||'')+(result.stderr||'')+'\nКод завершения: '+result.exitCode;
 }catch(error){out.textContent=error.message}finally{wasmRuntimeProvider.shutdown();run.disabled=false}};
}
async function compiler(){
 root.innerHTML='<h1>Компилятор C++ для офлайна</h1><p>Подготовка загружает около 106 МБ, проверяет SHA256 всех 7 файлов и сохраняет их в IndexedDB. Готовность проверяется заново после запуска. Браузер может освободить хранилище; проекты при этом не удаляются.</p><button id="prepareCompiler">Подготовить компилятор при наличии сети</button><p id="runtimeStatus" role="status">Проверяем сохранённые файлы…</p>';
 const status=root.querySelector('#runtimeStatus'),button=root.querySelector('button');button.disabled=true;
 const show=value=>{status.textContent=value.ready?'Компилятор полностью проверен и готов к офлайн-работе.':'Компилятор не подготовлен полностью. Нужна подготовка при наличии сети.'};
 try{show(await runtimeReadiness())}catch{status.textContent='Проверка хранилища недоступна. Готовность компилятора не подтверждена.'}
 button.onclick=async()=>{if(button.disabled)return;button.disabled=true;try{show(await runtimeReadiness({prepare:true,onProgress:p=>{status.textContent='Проверено и сохранено '+p.completed+' из '+p.total+' файлов.'}}))}catch(error){status.textContent=error.message}finally{button.disabled=false}};
 button.disabled=false;
}
async function render(){
 const seq=++renderSequence;await settled();studio=null;const route=new URLSearchParams(location.hash.slice(1));
 if(route.has('copy')||route.get('view')==='unlock')return unlockView();
 if(route.get('view')==='compiler')return compiler();
 if(route.get('view')==='computer-graphics'){
  const response=await fetch(new URL('../locales/ru/ui.json',import.meta.url));if(!response.ok)throw Error('Учебные ресурсы не подготовлены.');const messages=await response.json(),t=key=>messages[key]||key;
  root.innerHTML=graphicsLabMarkup(t);bindGraphicsLab(t,()=> 'auto',root);return;
 }
 if(route.has('project'))return editor(data?.projects[route.get('project')]);
 if(route.get('view')==='projects')return projectList();
 const kind=route.has('lesson')?'lesson':route.has('practicum')?'practicum':'exercise';
 const lessonId=route.get('lesson'),ru=course.lessonsRu.lessons.find(l=>l.id===lessonId);
 const item=route.has('lesson')?(locale==='en'?course.lessonsEn.lessons.find(l=>l.id===lessonId)||ru:ru):route.has('practicum')?course.practicumsRu.practicums.find(p=>p.id===route.get('practicum')):route.has('exercise')?course.projectsRu.projects.find(p=>p.id===route.get('exercise')):null;
 if(seq!==renderSequence)return;
 if(!item){root.innerHTML=lessons();return}
 const taskState=data&&kind==='practicum'?learningState(data,kind,item.id):null;
 const tasks=kind==='practicum'?'<fieldset><legend>Выполненные задания</legend>'+item.tasks.map((task,i)=>'<label><input type="checkbox" data-task="'+i+'" '+(!data?'disabled':'')+' '+(taskState?.tasks?.includes(i)?'checked':'')+'>'+esc(task.t||label(task))+'</label>').join('')+'</fieldset>':'';
 root.innerHTML='<article><a href="#view=academy">← Академия</a><h1>'+esc(item.title)+'</h1><label>Язык подготовленных материалов<select id="materialLocale"><option value="ru">Русский</option><option value="en">English · при отсутствии перевода русский</option></select></label>'+content(item)+memoryLabMarkup(item.benchmark?.interactiveMemory,locale)+oopLabMarkup(item.benchmark?.interactiveOop,locale)+tasks+(kind==='lesson'?'<button id="markLesson" '+(!data?'disabled':'')+'>Отметить тему пройденной</button>':'')+'<button id="practiceCopy" '+(!data?'disabled':'')+'>Открыть упражнение в локальном редакторе</button></article>';
 root.querySelector('#materialLocale').value=locale;root.querySelector('#materialLocale').onchange=event=>{locale=event.target.value;void render()};
 bindMemoryLab(item.benchmark?.interactiveMemory,locale);bindOopLab(item.benchmark?.interactiveOop,locale);
 const mark=root.querySelector('#markLesson');if(mark)mark.onclick=async()=>{learningState(data,'lesson',item.id).completed=true;await save();saved.textContent='Прогресс сохранён на устройстве.'};
 root.querySelectorAll('[data-task]').forEach(input=>input.onchange=()=>{markTask(data,kind,item,Number(input.dataset.task),input.checked);void save().catch(()=>{})});
 root.querySelector('#practiceCopy').onclick=async()=>{const p=exerciseCopy(data,kind,item);await save();location.hash='#project='+encodeURIComponent(p.id)};
}
document.querySelector('#lockLocal').onclick=async()=>{await settled();await session?.lock();session=null;data=null;saved.textContent='Локальная копия закрыта.';document.querySelector('#lockLocal').hidden=true;location.hash='#view=unlock'};
function connection(){document.querySelector('#connection').textContent=navigator.onLine?'Сеть доступна. Перенос в аккаунт и Cloud выполняются только явно.':'Нет подключения. Академия и открытая локальная копия работают на устройстве.'}
addEventListener('online',connection);addEventListener('offline',connection);connection();
addEventListener('hashchange',()=>{void render().catch(error=>{saved.textContent=error.message})});
addEventListener('beforeunload',event=>{if(pending||saveFailed){event.preventDefault();event.returnValue=''}});
addEventListener('pagehide',()=>{root.replaceChildren();data=null;void session?.lock();session=null});
addEventListener('pageshow',event=>{if(event.persisted)location.reload()});
try{await ensureVerifiedRuntime();[course,catalog]=await Promise.all([getCppCourse(),getCatalog()]);await render()}
catch{root.textContent='Подготовленные публичные ресурсы недоступны. Подключитесь к сети для подготовки офлайна. Локальные проекты не удалены.'}
