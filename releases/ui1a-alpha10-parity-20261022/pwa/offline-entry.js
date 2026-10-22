import {accountHomePresentation} from '../core/account-home-presentation.js';
import {blankCppProjectTemplate} from '../project-studio/project-templates.js';
import {blogPreviewMarkup} from '../core/content-public.js';
import {recentProjectListMarkup} from '../core/nexus-learning-discovery.js';
import {bindCppLearningPath} from '../core/learning-path-controls.js';
import {bindGlassSelects} from '../core/glass-select.js';
import {mountInterfaceUpdate,registerUpdateParticipant} from './interface-update.js';
import {createLearningViews} from '../core/learning-views.js';
import {projectStudioDashboardMarkup,projectStudioViewMarkup} from '../project-studio/project-presentation.js';
import {bindLocalEditor} from './local-editor.js';
import {createLearningResume,continuationNote,recentProjectsMarkup} from '../core/nexus-learning-discovery.js';
import {bindNexusOrbit} from '../effects/nexus-solar-system.js';
import {languageLabel} from '../sandbox/languages.js';
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
startParticleField(prefs.effectsQuality);bindNexusAppearance(t);bindGlassSelects();
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
let session=null,data=null,course=null,catalog=null,programming=null,studio=null,graphics=null,queue=Promise.resolve(),pending=0,saveFailed=false,renderSequence=0,cppLearningFilter='topics',locale=prefs.courseLocale;
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
async function settled(){while(true){const observed=queue;await observed;if(observed===queue&&pending===0)break}if(saveFailed)throw Error('Сначала сохраните изменения.')}
function needLocal(){if(data)return true;root.innerHTML=lockedMarkup();return false}
async function unlockView(){
 const rows=await store.list(),requested=new URLSearchParams(location.hash.slice(1)).get('copy');
 root.innerHTML=unlockMarkup(rows,requested);
 root.querySelector('form').onsubmit=async event=>{
  event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
  try{session=await store.unlock(root.querySelector('#localCopy').value,root.querySelector('#localPhrase').value);data=session.read();saved.textContent='Открыта локальная копия · '+data.owner.displayName+'. Облачный вход не подтверждён.';document.querySelector('#lockLocal').hidden=false;document.querySelector('[data-local-name]').textContent=data.owner.displayName;document.querySelector('[data-local-avatar]').textContent=data.owner.displayName.slice(0,1).toLocaleUpperCase();location.hash='#view=projects'}
  catch{root.querySelector('#unlockStatus').textContent='Копия не открыта. Проверьте фразу; данные не изменены.'}
  finally{const input=root.querySelector('#localPhrase');if(input)input.value='';button.disabled=false}
 };
}
function views(){
 const state=()=>data?.state||{courses:{},skills:{}},lessons=()=>state().courses?.cpp?.lessons||{},resume=createLearningResume({storage:{getItem:()=>JSON.stringify(data?.state.localResume||null)},principal:()=>data?.owner.accountId||'public-offline'});
 return createLearningViews({prefs,t,cpp:course,catalog,programming,cppLearningFilter,loadState:state,lessonState:id=>lessons()[id]||{},visualIcon,
  progress:()=>{const done=Object.values(lessons()).filter(x=>x?.completed).length;return {done,total:40,pct:Math.round(done/40*100)}},
  cppContinuation:()=>resume.continuation(course,lessons()),accountHomeCardMarkup:()=>accountHomePresentation({displayName:data?.owner.displayName,avatar:data?.owner.displayName?.slice(0,1).toLocaleUpperCase(),status:data?'Копия открыта · облачный вход не подтверждён':'Личная копия закрыта'},prefs.uiLocale,{localCopy:true,locked:!data}),shell:body=>'<div class="nexus-learning" data-nexus-learning>'+body+'</div>'});
}
function lessons(){const tab=new URLSearchParams(location.hash.slice(1)).get('tab');return tab==='practicums'?views().practicums():tab==='projects'?views().projectsView():views().overview()}

function projectTemplate(title,source,id=crypto.randomUUID()){
 const template=blankCppProjectTemplate(title),stamp=new Date().toISOString();
 if(source!==undefined)template.files[0].content=source;
 return {id,title,description:template.description,languageId:'cpp',createdAt:stamp,updatedAt:stamp,origin:template.origin,workspace:{languageId:'cpp',entryFile:template.entryFile,activeFile:template.entryFile,revision:0,files:template.files},progress:{},checkpoints:[]};
}
function projectList(){
 if(!needLocal())return;
 root.innerHTML='<div class="nexus-project-studio" data-nexus-project-studio>'+projectStudioDashboardMarkup({projects:Object.values(data.projects),courseProjects:course.projectsRu.projects,locale:prefs.uiLocale,localMode:true})+'</div>';
 root.querySelector('#psNewProject').onclick=async()=>{const title=prompt('Название проекта','Мой C++ проект');if(!title?.trim())return;const p=projectTemplate(title.trim());data.projects[p.id]=p;await save();location.hash='#view=project-studio&project='+encodeURIComponent(p.id)};
 bindNexusStudioUi(prefs.uiLocale);
}
async function editor(p){
 if(!needLocal())return;if(!p){root.innerHTML='<h1>Проект не найден в этой копии</h1>';return}
 const project={...p,manifest:{...p.manifest,entryFile:p.workspace.entryFile||p.workspace.files[0]?.path}};
 const definition=course.projectsRu.projects.find(x=>x.id===p.origin?.projectId);
 root.innerHTML='<div class="nexus-project-studio" data-nexus-project-studio>'+projectStudioViewMarkup({project,courseProject:definition,locale:prefs.uiLocale,localMode:true,audit:p.audit||[]})+'</div>';
 bindEditor(p);
}
function bindEditor(p,starter){studio=bindLocalEditor({root,project:p,data,save,settled,render,starter,locale:prefs.uiLocale,onDelete:()=>{location.hash='#view=project-studio'}});bindNexusStudioUi(prefs.uiLocale)}
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
  root.innerHTML=views().programmingHub();
  bindLanguageJourneys({tracks:programming.tracks,course,t,locale:prefs.uiLocale});const recent=root.querySelector('[data-recent-list]');if(recent){recent.removeAttribute('role');recent.innerHTML=recentProjectListMarkup(Object.values(data?.projects||{}).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).slice(0,3),t,prefs.uiLocale)}bindLearningDiscovery(t);bindNexusLearningUi(t);return;
 }
 if(route.get('view')==='academy'&&!route.has('focus')&&!route.has('tab')){const academyViewFilter={category:'all',availability:'all',query:''};root.innerHTML=academyCatalogMarkup({catalog,cpp:course,prefs,t,academyViewFilter,visualIcon});bindAcademyCatalog({prefs,t,academyViewFilter});return}
 if(route.get('view')==='home'){root.innerHTML=views().home();const section=document.createElement('section');section.className='visual-section blog-preview';section.dataset.blogPreview='';section.innerHTML=blogPreviewMarkup(BLOG_DRAFTS);root.querySelector('.visual-account-area')?.before(section);bindNexusOrbit({catalog,locale:prefs.uiLocale,translate:t,languageCatalog:getProgrammingLanguages,languageName:id=>languageLabel(id,prefs.uiLocale),quality:()=>prefs.effectsQuality,openCategory:()=>{location.hash='#view=academy'}});return}
 if(route.get('view')==='blog'){root.innerHTML=blogPageMarkup({article:route.has('article')});const feed=root.querySelector('[data-blog-feed]'),slug=route.get('article'),post=BLOG_DRAFTS.find(p=>p.slug===slug);feed.innerHTML=slug?(post?blogArticleMarkup(post,{snapshot:true}):'<p>Статья не входит в подготовленные публичные материалы.</p>'):blogIndexMarkup(BLOG_DRAFTS,{snapshot:true});bindBlogSections(feed);return}
 if(['account','feedback','admin','akronikl'].includes(route.get('view'))){root.innerHTML=serverView(route.get('view'));return}
 if(route.get('view')==='offline'){root.innerHTML='<section class="ps-hero glass-panel"><div><span class="eyebrow">NEXUS · БЕЗ ИНТЕРНЕТА</span><h1>Всё для вашей работы</h1><p>Академия, редактор и личные проекты доступны на устройстве. Возвращение сети не меняет ваши файлы автоматически.</p><div class="hero-actions"><a class="btn primary" href="#view=unlock">Личная копия</a><a class="btn" href="#view=compiler">Компилятор C++</a><a class="btn" href="/account/entry/#view=offline">Подготовка и перенос в аккаунт</a></div></div></section>';return}
 if(route.has('copy')||route.get('view')==='unlock')return unlockView();
 if(route.get('view')==='compiler')return compiler();
 if(route.get('view')==='computer-graphics'||route.get('course')==='computer-graphics'||data?.projects[route.get('project')]?.origin?.kind==='graphics-lab'){
  if(!needLocal())return;
  root.innerHTML=graphicsWorkshopMarkup(t);graphics=bindGraphicsWorkshop(t,()=>prefs.effectsQuality||'auto',localGraphicsAdapter({read:()=>data,save,settled,root}));return;
 }
 if(route.get('template')){if(!needLocal())return;const [kind,id]=route.get('template').split(':');const item=kind==='cpp'&&course.projectsRu.projects.find(p=>p.id===id);if(item){const p=exerciseCopy(data,'exercise',item);await save();location.hash='#view=project-studio&project='+encodeURIComponent(p.id);return}}
 if(route.has('project'))return editor(data?.projects[route.get('project')]);
 if(['projects','project-studio'].includes(route.get('view')))return projectList();
 const kind=route.has('lesson')?'lesson':route.has('practicum')?'practicum':'exercise';
 const lessonId=route.get('lesson'),ru=course.lessonsRu.lessons.find(l=>l.id===lessonId);
 const item=route.has('lesson')?(locale==='en'?course.lessonsEn.lessons.find(l=>l.id===lessonId)||ru:ru):route.has('practicum')?course.practicumsRu.practicums.find(p=>p.id===route.get('practicum')):route.has('exercise')?course.projectsRu.projects.find(p=>p.id===route.get('exercise')):null;
 if(seq!==renderSequence)return;
 if(!item){root.innerHTML=lessons();bindNexusLearningUi(t);bindLearningDiscovery(t);bindReadOnlyLearning();return}
 if(kind==='exercise'){if(!needLocal())return;const p=exerciseCopy(data,kind,item);await save();return editor(p)}
 const state=data?learningState(data,kind,item.id):{},exercise=data?exerciseCopy(data,kind,item):null;
 root.innerHTML=kind==='lesson'?views().lessonView(item.id):views().practicumView(item.id);
 if(exercise)bindEditor(exercise,item.code||item.starter);else for(const node of root.querySelectorAll('#editor,#stdin,#runCode,#testRuntime,#resetCode,#completeLesson,[data-task]'))node.disabled=true;
 bindKnowledge(item,state);bindMemoryLab(item.benchmark?.interactiveMemory,locale);bindOopLab(item.benchmark?.interactiveOop,locale);
 const mark=root.querySelector('#completeLesson');if(mark&&data)mark.onclick=async()=>{state.completed=!state.completed;await save();await render()};
 for(const input of root.querySelectorAll('[data-task]'))input.onchange=()=>{if(!data)return;markTask(data,kind,item,Number(input.dataset.task),input.checked);void save().catch(()=>{})};
 bindNexusLearningUi(t);bindReadOnlyLearning();

}

function bindReadOnlyLearning(){
 bindCppLearningPath({root,onSelect:value=>{cppLearningFilter=value}});
 for(const input of root.querySelectorAll('[data-practicum][data-task]')){input.disabled=!data;if(data)input.onchange=()=>{const p=course.practicumsRu.practicums.find(x=>x.id===input.dataset.practicum);if(p){markTask(data,'practicum',p,Number(input.dataset.task),input.checked);void save().catch(()=>{})}}}
 for(const b of root.querySelectorAll('#openTerms,[data-open-terms]'))b.onclick=()=>{root.querySelector('#termDrawer')?.classList.add('open');root.querySelector('#termDrawer')?.setAttribute('aria-hidden','false');root.querySelector('#termBackdrop')?.classList.add('show');root.querySelector('#termSearch')?.focus()};
 for(const b of root.querySelectorAll('#closeTerms,#termBackdrop'))b.onclick=()=>{root.querySelector('#termDrawer')?.classList.remove('open');root.querySelector('#termDrawer')?.setAttribute('aria-hidden','true');root.querySelector('#termBackdrop')?.classList.remove('show')};
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
 const termSearch=root.querySelector('#termSearch');if(termSearch)termSearch.oninput=()=>{const q=termSearch.value.toLocaleLowerCase();for(const c of root.querySelectorAll('[data-term-card]'))c.hidden=!c.textContent.toLocaleLowerCase().includes(q)};
 const check=root.querySelector('#checkQuiz,#checkAnswer');if(check)check.onclick=()=>{const chosen=root.querySelector('input[name="quiz"]:checked'),fb=root.querySelector('#quizFeedback');if(!chosen){fb.textContent='Выберите вариант.';return}const value=Number(chosen.value),ok=value===item.quiz.correctIndex;fb.className='quiz-feedback '+(ok?'ok':'bad');fb.textContent=ok?'Верно. Основная идея понята.':'Пока нет. Вернитесь к объяснению и попробуйте ещё раз.';if(data){state.quiz=value;void save().catch(()=>{})}};
 root.querySelectorAll('.benchmark-check').forEach(button=>button.onclick=()=>{const card=button.closest('.knowledge-card'),picked=card.querySelector('input:checked'),fb=card.querySelector('.knowledge-feedback');if(!picked){fb.textContent='Выберите вариант.';return}const ok=Number(picked.value)===Number(button.dataset.answer);fb.className='knowledge-feedback '+(ok?'ok':'bad');fb.textContent=(ok?'Верно. ':'Пока нет. ')+(button.dataset.explain||'')});
 root.querySelectorAll('[data-term]').forEach(button=>button.onclick=()=>{root.querySelector('#openTerms')?.click();if(termSearch){termSearch.value=button.dataset.term;termSearch.dispatchEvent(new Event('input'))}});
}

document.querySelector('#lockLocal').onclick=async()=>{await graphics?.flush();graphics=null;await settled();await session?.lock();session=null;data=null;saved.textContent='Локальная копия закрыта.';document.querySelector('#lockLocal').hidden=true;document.querySelector('[data-local-name]').textContent='Открыть личную копию';document.querySelector('[data-local-avatar]').textContent='А';location.hash='#view=unlock'};
function connection(){document.querySelector('#connection').textContent=navigator.onLine?'Сеть доступна. Перенос в аккаунт и Cloud выполняются только явно.':'Нет подключения. Академия и открытая локальная копия работают на устройстве.'}
addEventListener('online',connection);addEventListener('offline',connection);connection();
addEventListener('hashchange',()=>{void render().catch(error=>{saved.textContent=error.message})});
addEventListener('beforeunload',event=>{if(pending||saveFailed){event.preventDefault();event.returnValue=''}});
addEventListener('pagehide',()=>{document.querySelector('[data-local-name]').textContent='Открыть личную копию';document.querySelector('[data-local-avatar]').textContent='А';root.replaceChildren();data=null;void session?.lock();session=null});
addEventListener('pageshow',event=>{if(event.persisted)location.reload()});
registerUpdateParticipant({isDirty:()=>saveFailed,isPending:()=>pending>0,flush:async()=>{await graphics?.flush();await settled()}});
mountInterfaceUpdate();
try{await ensureVerifiedRuntime();[course,catalog,programming]=await Promise.all([getCppCourse(),getCatalog(),getProgrammingLanguages()]);await render()}
catch{root.textContent='Подготовленные публичные ресурсы недоступны. Подключитесь к сети для подготовки офлайна. Локальные проекты не удалены.'}
