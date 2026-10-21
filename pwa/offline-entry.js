import {academyCatalogMarkup,bindAcademyCatalog} from '../core/academy-catalog.js';
import {programmingHubMarkup} from '../core/code-hub-presentation.js';
import {bindLanguageJourneys} from '../core/nexus-language-journey.js';
import {bindLearningDiscovery,discoveryPageMarkup} from '../core/nexus-learning-discovery.js';
import {bindNexusLearningUi} from '../core/nexus-learning-ui.js';
import {shellMarkup,lockedMarkup,unlockMarkup,homeMarkup,academyMarkup,projectsMarkup,lessonMarkup,editorMarkup,visualIcon} from './offline-presentation.js';
import {blogPageMarkup,blogIndexMarkup,blogArticleMarkup,bindBlogSections} from '../core/blog-presentation.js';
import {BLOG_DRAFTS} from '../core/blog-seeds.js';
import {loadBundle,translator} from '../core/i18n.js';
import {bindNexusShell} from '../core/nexus-shell.js';
import {configureNexusAppearance,bindNexusAppearance} from '../effects/nexus-appearance.js';
import {startParticleField,updateParticleQuality} from '../effects/particles.js';
import {bindNexusStudioUi} from '../core/nexus-studio-ui.js';
import {getCppCourse,getCatalog,getProgrammingLanguages} from '../core/course-registry.js';
import {codeStudioMarkup,bindCodeStudio} from '../sandbox/code-studio.js';
import {wasmRuntimeProvider} from '../sandbox/providers/wasm-runtime.js';
import {createVaultStore} from './local-vault.js';
import {runtimeReadiness} from './runtime-prepare.js';
import {ensureVerifiedRuntime} from './client.js';
import {memoryLabMarkup,bindMemoryLab} from '../core/memory-lab.js';
import {oopLabMarkup,bindOopLab} from '../core/oop-lab.js';
import {exerciseCopy,learningState,rememberLearningWorkspace,markTask} from './offline-learning.js';
import {graphicsWorkshopMarkup,bindGraphicsWorkshop} from '../effects/nexus-graphics-workshop.js';
import {localGraphicsAdapter} from './offline-graphics.js';
const host=document.querySelector('#offlineShell'),store=createVaultStore();
const preferenceKey='akronikl:it-nexus:prefs:v1',publicKeys=['uiLocale','courseLocale','mentorLocale','sidebarCollapsed','focusReading','effectsQuality','rightRailCollapsed','nexusAppearance'];
let storedPrefs={};try{storedPrefs=JSON.parse(localStorage.getItem(preferenceKey)||'{}')||{}}catch{}
const prefs={uiLocale:'ru',courseLocale:'ru',mentorLocale:'ru',sidebarCollapsed:false,focusReading:false,effectsQuality:'auto',...Object.fromEntries(publicKeys.filter(k=>Object.hasOwn(storedPrefs,k)).map(k=>[k,storedPrefs[k]]))};
if(!['ru','en'].includes(prefs.uiLocale))prefs.uiLocale='ru';
const savePresentation=()=>{try{localStorage.setItem(preferenceKey,JSON.stringify(Object.fromEntries(publicKeys.filter(k=>Object.hasOwn(prefs,k)).map(k=>[k,prefs[k]]))))}catch{}};
const messages=await loadBundle(prefs.uiLocale).catch(()=>({})),t=translator(messages);document.documentElement.lang=prefs.uiLocale;
host.innerHTML=shellMarkup(t,prefs);
const root=document.querySelector('#offlineApp'),saved=document.querySelector('#saveStatus');
// Здесь сохраняются только публичные настройки оформления, без identity/proof.
try{prefs.nexusAppearance??=JSON.parse(localStorage.getItem('nexus.offline.appearance.v1')||'null')}catch{}
configureNexusAppearance({read:()=>prefs,write:value=>{prefs.nexusAppearance=value;savePresentation()}});
startParticleField(prefs.effectsQuality);bindNexusAppearance(t);
const closeMobile=()=>document.querySelector('#sidebar')?.classList.remove('open');
document.querySelector('#menuBtn').onclick=()=>document.querySelector('#sidebar').classList.toggle('open');
document.querySelector('#sidebarBackdrop').onclick=closeMobile;
document.querySelector('#sidebarCollapse').onclick=()=>{if(matchMedia('(max-width:760px)').matches)return closeMobile();prefs.sidebarCollapsed=!prefs.sidebarCollapsed;savePresentation();document.querySelector('#appShell').classList.toggle('sidebar-collapsed',prefs.sidebarCollapsed)};
bindNexusShell({translate:t,closeMobile,collapsed:()=>prefs.sidebarCollapsed});
document.querySelector('#focusMode').onclick=()=>{prefs.focusReading=!prefs.focusReading;savePresentation();document.querySelector('#appShell').classList.toggle('focus-reading',prefs.focusReading)};
document.querySelector('#uiLocale').value=prefs.uiLocale;
document.querySelector('#uiLocale').onchange=async event=>{await settled();prefs.uiLocale=event.target.value;savePresentation();location.reload()};
document.querySelector('#mentorLocale').value=prefs.mentorLocale;
document.querySelector('#mentorLocale').onchange=event=>{prefs.mentorLocale=event.target.value;savePresentation()};
document.querySelector('#courseLocale').value=prefs.courseLocale;
document.querySelector('#courseLocale').onchange=event=>{locale=prefs.courseLocale=event.target.value;savePresentation();void render()};
document.querySelector('#effectsQuality').value=prefs.effectsQuality;
document.querySelector('#effectsQuality').onchange=event=>{prefs.effectsQuality=event.target.value;savePresentation();updateParticleQuality(prefs.effectsQuality)};
document.querySelectorAll('[data-nexus-solar]').forEach(el=>el.onclick=()=>{location.hash='#view=home'});
document.querySelector('.side-nav').addEventListener('click',closeMobile);

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=v=>structuredClone(v),label=v=>typeof v==='string'?v:v?.ru||v?.en||'';
let session=null,data=null,course=null,catalog=null,programming=null,studio=null,graphics=null,queue=Promise.resolve(),pending=0,saveFailed=false,renderSequence=0,locale=prefs.courseLocale;
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
function needLocal(){if(data)return true;root.innerHTML=lockedMarkup();return false}
async function unlockView(){
 const rows=await store.list(),requested=new URLSearchParams(location.hash.slice(1)).get('copy');
 root.innerHTML=unlockMarkup(rows,requested);
 root.querySelector('form').onsubmit=async event=>{
  event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
  try{session=await store.unlock(root.querySelector('#localCopy').value,root.querySelector('#localPhrase').value);data=session.read();saved.textContent='Открыта локальная копия · '+data.owner.displayName+'. Облачный вход не подтверждён.';document.querySelector('#lockLocal').hidden=false;document.querySelector('#localIdentity').textContent=data.owner.displayName;location.hash='#view=projects'}
  catch{root.querySelector('#unlockStatus').textContent='Копия не открыта. Проверьте фразу; данные не изменены.'}
  finally{const input=root.querySelector('#localPhrase');if(input)input.value='';button.disabled=false}
 };
}
function lessons(){return academyMarkup(course,data)}
function projectTemplate(title,source,id=crypto.randomUUID()){
 return {id,title,description:'',languageId:'cpp',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:0,files:[{path:'main.cpp',content:source||'#include <iostream>\nint main(){std::cout << "Nexus\\n";}\n',languageId:'cpp'}]},progress:{},checkpoints:[]};
}
function projectList(){
 if(!needLocal())return;
 root.innerHTML=projectsMarkup(data);bindSearch('#projectSearch','[data-local-project]','#projectSearchStatus');
 root.querySelector('#newProject').onclick=async()=>{const title=prompt('Название проекта','Мой C++ проект');if(!title?.trim())return;const p=projectTemplate(title.trim());data.projects[p.id]=p;await save();location.hash='#project='+encodeURIComponent(p.id)};
}
async function editor(p){
 if(!needLocal())return;if(!p){root.innerHTML='<h1>Проект не найден в этой копии</h1>';return}
 root.innerHTML=editorMarkup(p,codeMarkup(p));bindEditor(p);
}
function codeMarkup(p){return codeStudioMarkup({files:p.workspace.files,entryFile:p.workspace.entryFile,activeFile:p.workspace.activeFile,languageId:p.languageId||'cpp'})}
function bindEditor(p){
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
 root.querySelector('#checkpoint').onclick=async()=>{await settled();p.checkpoints.unshift({id:crypto.randomUUID(),label:'Точка '+new Date().toLocaleString('ru'),createdAt:new Date().toISOString(),workspace:clone(p.workspace),progress:clone(p.progress)});await save();await render()};
 root.querySelector('#restorePoint').onclick=async()=>{const point=p.checkpoints.find(c=>c.id===root.querySelector('#checkpoints').value);if(!point||!confirm('Восстановить контрольную точку? Текущие файлы в этой копии будут заменены.'))return;p.workspace=clone(point.workspace);p.progress=clone(point.progress);rememberLearningWorkspace(data,p);await save();await render()};
 bindNexusStudioUi('ru');
 root.querySelector('#clearOutput').onclick=()=>{root.querySelector('#runOutput').textContent='Вывод программы появится здесь.'};
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
 root.innerHTML='<section class="ps-hero glass-panel"><div><span class="eyebrow">NEXUS RUNTIME</span><h1>Компилятор C++</h1><p>Подготовка загружает около 106 МБ, проверяет SHA256 всех 7 файлов и сохраняет их в IndexedDB. Готовность проверяется заново после запуска. Браузер может освободить хранилище; проекты при этом не удаляются.</p></div><span class="visual-cpp-symbol">C++</span></section><section class="block glass-panel"><h2>Подготовка к работе без сети</h2><button class="btn primary" id="prepareCompiler">Подготовить компилятор при наличии сети</button><p id="runtimeStatus" role="status">Проверяем сохранённые файлы…</p></section>';
 const status=root.querySelector('#runtimeStatus'),button=root.querySelector('button');button.disabled=true;
 const show=value=>{status.textContent=value.ready?'Компилятор полностью проверен и готов к офлайн-работе.':'Компилятор не подготовлен полностью. Нужна подготовка при наличии сети.'};
 try{show(await runtimeReadiness())}catch{status.textContent='Проверка хранилища недоступна. Готовность компилятора не подтверждена.'}
 button.onclick=async()=>{if(button.disabled)return;button.disabled=true;try{show(await runtimeReadiness({prepare:true,onProgress:p=>{status.textContent='Проверено и сохранено '+p.completed+' из '+p.total+' файлов.'}}))}catch(error){status.textContent=error.message}finally{button.disabled=false}};
 button.disabled=false;
}
async function render(){
 const seq=++renderSequence;await graphics?.flush();graphics=null;await settled();if(seq!==renderSequence)return;studio=null;const route=new URLSearchParams(location.hash.slice(1));
 updateChrome(route);
 if(['labs','practices'].includes(route.get('view'))){root.innerHTML=discoveryPageMarkup({kind:route.get('view'),course,contentFor:id=>(locale==='en'?course.lessonsEn:course.lessonsRu).lessons.find(l=>l.id===id),projects:Object.values(data?.projects||{}),state:data?.state.courses?.cpp||{},t,locale:prefs.uiLocale,materialLocale:locale});bindLearningDiscovery(t);return}
 if(route.get('view')==='programming'){
  const done=Object.values(data?.state.courses?.cpp?.lessons||{}).filter(x=>x.completed).length,total=course.curriculum.lessons.length;
  root.innerHTML=programmingHubMarkup({programming,cpp:course,prefs,t,visualIcon,progress:()=>({done,total,pct:Math.round(done/total*100)}),cppContinuation:()=>({href:'#course=cpp',mode:done?'continue':'start'}),continuationNote:()=>'',recentProjectsMarkup:()=>''});
  bindLanguageJourneys({tracks:programming.tracks,course,t,locale:prefs.uiLocale});bindLearningDiscovery(t);bindNexusLearningUi(t);return;
 }
 if(route.get('view')==='academy'&&!route.has('focus')&&!route.has('tab')){const academyViewFilter={category:'all',availability:'all',query:''};root.innerHTML=academyCatalogMarkup({catalog,cpp:course,prefs,t,academyViewFilter,visualIcon});bindAcademyCatalog({prefs,t,academyViewFilter});return}
 if(route.get('view')==='home'){root.innerHTML=homeMarkup(course,data);return}
 if(route.get('view')==='blog'){root.innerHTML=blogPageMarkup({article:route.has('article')});const feed=root.querySelector('[data-blog-feed]'),slug=route.get('article'),post=BLOG_DRAFTS.find(p=>p.slug===slug);feed.innerHTML=slug?(post?blogArticleMarkup(post,{snapshot:true}):'<p>Статья не входит в подготовленные публичные материалы.</p>'):blogIndexMarkup(BLOG_DRAFTS,{snapshot:true});bindBlogSections(feed);return}
 if(['account','feedback','admin','akronikl'].includes(route.get('view'))){root.innerHTML=serverView(route.get('view'));return}
 if(route.get('view')==='offline'){root.innerHTML='<section class="ps-hero glass-panel"><div><span class="eyebrow">NEXUS · БЕЗ ИНТЕРНЕТА</span><h1>Всё для вашей работы</h1><p>Академия, редактор и личные проекты доступны на устройстве. Возвращение сети не меняет ваши файлы автоматически.</p><div class="hero-actions"><a class="btn primary" href="#view=unlock">Личная копия</a><a class="btn" href="#view=compiler">Компилятор C++</a><a class="btn" href="/account/entry/#view=offline">Подготовка и перенос в аккаунт</a></div></div></section>';return}
 if(route.has('copy')||route.get('view')==='unlock')return unlockView();
 if(route.get('view')==='compiler')return compiler();
 if(route.get('view')==='computer-graphics'||route.get('course')==='computer-graphics'||data?.projects[route.get('project')]?.origin?.kind==='graphics-lab'){
  if(!needLocal())return;
  root.innerHTML=graphicsWorkshopMarkup(t);graphics=bindGraphicsWorkshop(t,()=>prefs.effectsQuality||'auto',localGraphicsAdapter({read:()=>data,save,settled,root}));return;
 }
 if(route.has('project'))return editor(data?.projects[route.get('project')]);
 if(['projects','project-studio'].includes(route.get('view')))return projectList();
 const kind=route.has('lesson')?'lesson':route.has('practicum')?'practicum':'exercise';
 const lessonId=route.get('lesson'),ru=course.lessonsRu.lessons.find(l=>l.id===lessonId);
 const item=route.has('lesson')?(locale==='en'?course.lessonsEn.lessons.find(l=>l.id===lessonId)||ru:ru):route.has('practicum')?course.practicumsRu.practicums.find(p=>p.id===route.get('practicum')):route.has('exercise')?course.projectsRu.projects.find(p=>p.id===route.get('exercise')):null;
 if(seq!==renderSequence)return;
 if(!item){root.innerHTML=lessons();const tab=route.get('tab')||'topics';root.querySelectorAll('[data-learning-tab]').forEach(el=>el.hidden=el.dataset.learningTab!==tab);root.querySelectorAll('.course-tabs a').forEach(a=>a.classList.toggle('active',new URLSearchParams(a.hash.slice(1)).get('tab')===tab));bindSearch('#topicSearch','[data-offline-topic]','#topicSearchStatus');return}
 const state=data&&kind!=='exercise'?learningState(data,kind,item.id):{};
 const exercise=data?exerciseCopy(data,kind,item):null;
 root.innerHTML=lessonMarkup(item,{kind,locale,state,unlocked:!!data,editorMarkup:exercise?editorMarkup(exercise,codeMarkup(exercise),{inline:true}):''});
 if(exercise)bindEditor(exercise);
 bindKnowledge(item,state);
 root.querySelector('#materialLocale').value=locale;root.querySelector('#materialLocale').onchange=event=>{locale=event.target.value;void render()};
 bindMemoryLab(item.benchmark?.interactiveMemory,locale);bindOopLab(item.benchmark?.interactiveOop,locale);
 const mark=root.querySelector('#markLesson');if(mark)mark.onclick=async()=>{const st=learningState(data,'lesson',item.id);st.completed=!st.completed;await save();mark.textContent=st.completed?'✓ Тема пройдена':'Отметить пройденной';mark.classList.toggle('primary',st.completed);saved.textContent='Прогресс сохранён на устройстве.'};
 root.querySelectorAll('[data-task]').forEach(input=>input.onchange=()=>{markTask(data,kind,item,Number(input.dataset.task),input.checked);void save().catch(()=>{})});
 root.querySelector('#practiceCopy').onclick=async()=>{const p=exerciseCopy(data,kind,item);await save();location.hash='#project='+encodeURIComponent(p.id)};
}

function bindSearch(inputSelector,rowSelector,statusSelector){
 const input=root.querySelector(inputSelector);if(!input)return;
 input.oninput=()=>{const query=input.value.trim().toLocaleLowerCase('ru'),rows=[...root.querySelectorAll(rowSelector)];let visible=0;for(const row of rows){row.hidden=!row.textContent.toLocaleLowerCase('ru').includes(query);if(!row.hidden)visible++}root.querySelector(statusSelector).textContent=query?'Найдено: '+visible+' из '+rows.length:''};
}
function updateChrome(route){
 const view=route.get('view'),active=view==='home'?'home':view==='projects'||route.has('project')?'projects':view==='offline'||view==='compiler'||view==='unlock'||route.has('copy')?'offline':['blog','akronikl','skills'].includes(view)?view:'academy';
 document.querySelectorAll('.side-nav a').forEach(a=>{const current=new URLSearchParams(a.hash.slice(1)).get('view')===active;a.classList.toggle('active',current);current?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current')});
 document.querySelector('.top-title strong').textContent=t('nav.'+active);document.querySelector('#appShell').dataset.nexusRoute=location.hash;closeMobile();
}
function serverView(view){
 const name={account:'Аккаунт',blog:'Блог',feedback:'Обратная связь',admin:'Администрирование',akronikl:'Akronikl'}[view];
 return '<section class="ps-hero glass-panel"><div><span class="eyebrow">NEXUS</span><h1>'+name+'</h1><p>'+(view==='akronikl'?'AI-помощник пока не реализован. Локальный помощник также не подключён. Учебные подсказки доступны в уроках.':'Этот раздел требует подключения и проверки серверного доступа. Ваши локальные проекты и Академия доступны независимо от него.')+'</p><div class="hero-actions"><a class="btn primary" href="#view=academy&focus=cpp">Академия</a><a class="btn" href="/account/entry/">Открыть обычный Nexus</a></div></div></section>';
}
function bindKnowledge(item,state){
 const check=root.querySelector('#checkQuiz');if(check)check.onclick=()=>{const chosen=root.querySelector('input[name="quiz"]:checked'),fb=root.querySelector('#quizFeedback');if(!chosen){fb.textContent='Выберите вариант.';return}const value=Number(chosen.value),ok=value===item.quiz.correctIndex;fb.className='quiz-feedback '+(ok?'ok':'bad');fb.textContent=ok?'Верно. Основная идея понята.':'Пока нет. Вернитесь к объяснению и попробуйте ещё раз.';if(data){state.quiz=value;void save().catch(()=>{})}};
 root.querySelectorAll('.benchmark-check').forEach(button=>button.onclick=()=>{const card=button.closest('.knowledge-card'),picked=card.querySelector('input:checked'),fb=card.querySelector('.knowledge-feedback');if(!picked){fb.textContent='Выберите вариант.';return}const ok=Number(picked.value)===Number(button.dataset.answer);fb.className='knowledge-feedback '+(ok?'ok':'bad');fb.textContent=(ok?'Верно. ':'Пока нет. ')+(button.dataset.explain||'')});
 root.querySelectorAll('[data-term]').forEach(button=>button.onclick=()=>{const term=button.dataset.term,terms=root.querySelector('.lesson-side');terms?.scrollIntoView({block:'start'});saved.textContent='Справочник: '+term});
}

document.querySelector('#lockLocal').onclick=async()=>{await graphics?.flush();graphics=null;await settled();await session?.lock();session=null;data=null;saved.textContent='Локальная копия закрыта.';document.querySelector('#lockLocal').hidden=true;document.querySelector('#localIdentity').textContent='Открыть личную копию';location.hash='#view=unlock'};
function connection(){document.querySelector('#connection').textContent=navigator.onLine?'Сеть доступна. Перенос в аккаунт и Cloud выполняются только явно.':'Нет подключения. Академия и открытая локальная копия работают на устройстве.'}
addEventListener('online',connection);addEventListener('offline',connection);connection();
addEventListener('hashchange',()=>{void render().catch(error=>{saved.textContent=error.message})});
addEventListener('beforeunload',event=>{if(pending||saveFailed){event.preventDefault();event.returnValue=''}});
addEventListener('pagehide',()=>{root.replaceChildren();data=null;void session?.lock();session=null});
addEventListener('pageshow',event=>{if(event.persisted)location.reload()});
try{await ensureVerifiedRuntime();[course,catalog,programming]=await Promise.all([getCppCourse(),getCatalog(),getProgrammingLanguages()]);await render()}
catch{root.textContent='Подготовленные публичные ресурсы недоступны. Подключитесь к сети для подготовки офлайна. Локальные проекты не удалены.'}
