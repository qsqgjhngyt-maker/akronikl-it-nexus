import {codeStudioHomeMarkup,bindCodeStudioHome} from '../project-studio/code-studio-home.js';
import {accountSessionStorage,verifiedAccount} from './account-storage.js';
import {createLearningProgressReader} from '../akronikl/learning/progress.js';
import {bindAdministrationNavigation} from './administration-navigation.js';
import {bindCppLearningPath as bindSharedLearningPath} from './learning-path-controls.js';
import {glassSelect,visualIcon} from './controls-presentation.js';
import {mountInterfaceUpdate} from '../pwa/interface-update.js';
import {createLearningViews} from './learning-views.js';
import {programmingHubMarkup} from './code-hub-presentation.js';
import {academyCatalogMarkup,bindAcademyCatalog} from './academy-catalog.js';
import {nexusShellMarkup} from './shell-presentation.js';
import {glossaryItems,richText,benchmarkMarkup} from './lesson-presentation.js';
import {offlineCenterMarkup,bindOfflineCenter} from '../pwa/offline-center.js';
import {loadBundle,loadLocaleRegistry,textFor,translator} from './i18n.js';
import {getCatalog,getCppCourse,getCppOutline,getProgrammingLanguages,prepareCppGoldLesson} from './course-registry.js';
import {loadPrefs,savePrefs,loadState,lessonState,patchLesson,toggleLesson,patchPracticum,cppProgramProgress} from './storage.js';
import {inspectLegacyCppV7,importLegacyCppV7,getCppProgress} from './migrations/cpp-v7.js';
import {setAkroniklContext,createLazyAssistantBridge,assistantPageMarkup} from '../akronikl/context.js';
import {languageLabel} from '../sandbox/languages.js';
import {codeStudioMarkup,bindCodeStudio} from '../sandbox/code-studio.js';
import {startParticleField,updateParticleQuality} from '../effects/particles.js';
import {bindNexusOrbit} from '../effects/nexus-solar-system.js';
import {graphicsPromoMarkup} from '../effects/nexus-graphics-lab.js';
import {configureNexusAppearance,bindNexusAppearance} from '../effects/nexus-appearance.js';
import {bindGlassSelects} from './glass-select.js';
import {bindNexusShell} from './nexus-shell.js';
import {bindNexusLearningUi,bindGlossaryDrawer} from './nexus-learning-ui.js';
import {createLearningResume,continuationNote,continuationCard,recentProjectsMarkup,bindRecentProjects,discoveryPageMarkup,bindLearningDiscovery,focusLearningSection} from './nexus-learning-discovery.js';
import {languageJourney,languageJourneyDialogMarkup,bindLanguageJourneys} from './nexus-language-journey.js';
import {ensurePracticeWorkingCopy} from './nexus-practices.js';
import {learnerAcademyEntries} from './academy-presentation.js';
import {bindNexusStudioUi} from './nexus-studio-ui.js';
import {bindNexusAccountAccess} from './nexus-account-access.js';
import {RELEASE_CONTRACTS} from './ui1a-release-contracts.js';
import {feedbackPageMarkup,reviewsPageMarkup,moderationPageMarkup,reviewSlotMarkup,bindFeedbackUi} from '../feedback/ui.js';
import {blogMarkup,bindPublicContent} from './content-public.js';
import {memoryLabMarkup,bindMemoryLab} from './memory-lab.js';
import {createViewResume} from './view-resume.js';
import {accountChipMarkup,accountHomeCardMarkup,accountPageMarkup,bindAccountShell} from './account-shell.js';
import {oopLabMarkup,bindOopLab} from './oop-lab.js';
const root=document.querySelector('#app');let prefs=loadPrefs(),registry,catalog,t,cpp=null,cppLanding=null,programming=null,projectStudioApi=null;
// Большие рабочие инструменты не входят в критический ESM-граф Главной.
// Импорт сохраняет исходные модули и выполняется только при открытии раздела.
let sandboxRuntimeModule=null,graphicsWorkshopModule=null,administrationModule=null,finalModule=null,finalController=null;
const loadSandboxRuntime=async()=>sandboxRuntimeModule??=await import('../sandbox/sandbox.js');
const loadGraphicsWorkshop=async()=>graphicsWorkshopModule??=await import('../effects/nexus-graphics-workshop.js');
const loadAdministration=async()=>administrationModule??=await import('./administration.js');
const loadFinal=async()=>{finalModule??=await import('../course-final/view.js');await finalModule.ensureFinalStyles();return finalModule};
const viewResume=createViewResume(),learningResume=createLearningResume();
let cppLearningFilter='topics',renderSequence=0,goldPresentation=null,disposeOrbit=null,disposeTerms=null;
function replaceRoute(page){finalController?.dispose();finalController=null;disposeTerms?.();disposeTerms=null;disposeOrbit?.();disposeOrbit=null;document.onkeydown=null;root.innerHTML=page}
const academyViewFilter={category:'all',availability:'all',query:''};
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const route=()=>{const p=new URLSearchParams(location.hash.replace(/^#/,''));return{view:p.get('view')||'home',course:p.get('course'),lesson:p.get('lesson'),tab:p.get('tab')||'overview',practicum:p.get('practicum'),project:p.get('project'),template:p.get('template'),focus:p.get('focus')}};
const readLearningProgress=createLearningProgressReader({readIdentity:verifiedAccount,loadCourse:()=>cpp||cppLanding||getCppOutline(),readState:loadState,readResume:(course,state)=>learningResume.continuation(course,state.courses?.cpp?.lessons),readLocale:()=>prefs.mentorLocale||prefs.uiLocale,readLesson:()=>route().course==='cpp'?route().lesson:null});
const assistantBridge=createLazyAssistantBridge({root,readIdentity:()=>verifiedAccount(),readReady:()=>root.dataset.akroniklRoute===location.hash,readRoute:route,readLocale:()=>prefs.mentorLocale||prefs.uiLocale,readCourseLocale:()=>prefs.courseLocale,readEditor:()=>root.querySelector('#editor'),readLearningProgress});
addEventListener('nexus:context-invalidated',()=>{delete root.dataset.akroniklRoute});
const PROJECT_STUDIO_VERSION='0.1.7-alpha.2.4.6-ui1a.10.10.2-p4q.5';
async function loadProjectStudio(){
  if(projectStudioApi)return projectStudioApi;
  const suffix=`?v=${PROJECT_STUDIO_VERSION}`;
  try{
    const [store,templates,studio]=await Promise.all([
      import(`../project-studio/project-store.js${suffix}`),
      import(`../project-studio/project-templates.js${suffix}`),
      import(`../project-studio/project-studio.js${suffix}`)
    ]);
    projectStudioApi={...store,...templates,...studio};
    return projectStudioApi;
  }catch(err){
    const wrapped=new Error(`Project Studio module load failed: ${err?.message||err}`);
    wrapped.cause=err;
    throw wrapped;
  }
}
async function tr(){t=translator(await loadBundle(prefs.uiLocale));document.documentElement.lang=prefs.uiLocale;document.documentElement.dir=registry.supported.find(x=>x.code===prefs.uiLocale)?.direction||'ltr';document.title='AKRONIKL IT NEXUS · '+t('brand.subtitle')}

function langSelect(id,label,val){const values=registry.supported.filter(x=>x.enabled).map(x=>[x.code,x.nativeName]);return glassSelect(id,label,val,values)}
function fxSelect(){const values=[['auto','Auto'],['ultra','Ultra'],['high','High'],['balanced','Balanced'],['lite','Lite'],['off','Off']];return glassSelect('effectsQuality','FX',prefs.effectsQuality,values,'fx-field')}
function shell(body,active='home'){const r=route();return visualShell(r.course==='cpp'||r.view==='programming'?`<div class="nexus-learning" data-nexus-learning>${body}</div>`:body,active)}
function progress(){return cppProgramProgress(loadState(),cpp?.curriculum)}
function migration(){const m=inspectLegacyCppV7();if(!m.found)return'';if(m.alreadyImported)return`<div class="migration done"><div><strong>✓ Прогресс C++ v7 импортирован</strong><span>Исходный localStorage старого курса сохранён.</span></div></div>`;return`<div class="migration"><div><strong>Найден прогресс старого C++ v7: ${m.done}/40</strong><span>Импорт безопасно перенесёт его на стабильные ID Nexus.</span></div><button class="btn" id="importLegacy">Импортировать</button></div>`}

function visualShell(body,active){return nexusShellMarkup(body,active,{prefs,t,route,langSelect,fxSelect,accountChipMarkup,visualIcon})}
function sharedViews(){return createLearningViews({academyGoldMarkup:goldPresentation?.academyGoldMarkup,prefs,t,cpp:cpp||cppLanding,catalog,programming,projectStudioApi,loadState,lessonState,visualIcon,progress,cppContinuation,shell,visualShell,migration,setAkroniklContext,accountHomeCardMarkup,cppLearningFilter})}
function nexusSculpture(...args){return sharedViews().nexusSculpture(...args)}
function cppContinuation(){return learningResume.continuation(cpp||cppLanding,loadState().courses?.cpp?.lessons||{})}
function home(...args){return sharedViews().home(...args)}
function academy(){return visualShell(academyCatalogMarkup({catalog,cpp:cpp||cppLanding,prefs,t,academyViewFilter,visualIcon}),'academy')}
function bindAcademyView(){bindAcademyCatalog({prefs,t,academyViewFilter})}

function learningSearch(...args){return sharedViews().learningSearch(...args)}
function learningEmpty(...args){return sharedViews().learningEmpty(...args)}
function practicumProgress(...args){return sharedViews().practicumProgress(...args)}
function learningContentNote(...args){return sharedViews().learningContentNote(...args)}
function programmingHub(...args){return sharedViews().programmingHub(...args)}
function practicumData(...args){return sharedViews().practicumData(...args)}
function practicumView(...args){return sharedViews().practicumView(...args)}
function courseProjectById(...args){return sharedViews().courseProjectById(...args)}
function projectStudioDashboard(...args){return sharedViews().projectStudioDashboard(...args)}
function projectStudioProject(...args){return sharedViews().projectStudioProject(...args)}
function courseTabs(...args){return sharedViews().courseTabs(...args)}
function courseHead(...args){return sharedViews().courseHead(...args)}
function overview(...args){return sharedViews().overview(...args)}
function lessonData(...args){return sharedViews().lessonData(...args)}
function glossaryDrawer(...args){return sharedViews().glossaryDrawer(...args)}
function benchmarkView(...args){return sharedViews().benchmarkView(...args)}
function lessonView(...args){return sharedViews().lessonView(...args)}
function practicums(...args){return sharedViews().practicums(...args)}
function projectsView(...args){return sharedViews().projectsView(...args)}
function placeholder(v){if(v==='akronikl')return shell(assistantPageMarkup(prefs.mentorLocale||prefs.uiLocale),'akronikl');return shell(`<section class="placeholder"><div class="hero-orbit small"><i></i><i></i><i></i><b>N</b></div><span class="eyebrow">SPRINT 1</span><h1>${e(t('nav.'+v)||v)}</h1><p>Контейнер готов. Наполнение идёт после стабилизации C++ reference-course.</p></section>`,v)}

function codeStudioStart(){
 const storage=accountSessionStorage();let recent=[];try{recent=JSON.parse(storage.getItem('akronikl:code-studio:view:v1:recent')||'[]')}catch{}
 return visualShell(codeStudioHomeMarkup({projects:projectStudioApi.listProjects(),recentIds:Array.isArray(recent)?recent:[],t}),'code-studio');
}
function bindStandaloneStudio(){
 const mount=document.querySelector('[data-code-studio-home]');if(!mount||!projectStudioApi)return;
 const account=verifiedAccount()?.accountId,storage=accountSessionStorage(),key='akronikl:code-studio:view:v1:recent';
 const check=()=>{if(!account||verifiedAccount()?.accountId!==account)throw Error('ACCOUNT_STORAGE_CONTEXT_CHANGED')};
 const open=async id=>{check();if(!projectStudioApi.getProject(id))throw Error('PROJECT_NOT_FOUND');let recent=[];try{recent=JSON.parse(storage.getItem(key)||'[]')}catch{}storage.setItem(key,JSON.stringify([id,...(Array.isArray(recent)?recent:[]).filter(v=>typeof v==='string'&&v!==id)].slice(0,10)));location.hash='#view=code-studio&project='+encodeURIComponent(id)};
 bindCodeStudioHome({mount,t,onCreate:input=>{check();return projectStudioApi.createProject(input)},onOpen:open,findProject:id=>{check();return projectStudioApi.getProject(id)},listCloud:async()=>{check();const api=await import('../sync/cloud-sync.js');check();return api.listCloudProjects()},importCloud:async id=>{check();const api=await import('../sync/cloud-sync.js');check();return api.importCloudProject(id)}});
}
function standaloneProject(projectId){
 const ps=projectStudioApi,project=ps.getProject(projectId);if(!project)return visualShell('<section class="placeholder"><h1>'+e(t('studio.missing'))+'</h1><a class="btn" href="#view=code-studio">Code Studio</a></section>','code-studio');
 if(project.languageId!=='cpp')return visualShell('<section class="placeholder"><h1>'+e(t('studio.unsupported'))+'</h1><a class="btn" href="#view=projects">'+e(t('studio.allProjects'))+'</a></section>','code-studio');
 const definition=project.origin?.courseId==='cpp'?courseProjectById(project.origin.projectId):null;
 return visualShell('<div class="nexus-project-studio" data-nexus-project-studio>'+ps.projectStudioViewMarkup({project,courseProject:definition,locale:prefs.uiLocale,backHref:'#view=code-studio',backLabel:'Code Studio'})+'</div>','code-studio');
}

function bindCppLearningPath(){return bindSharedLearningPath({onSelect:value=>{cppLearningFilter=value}})}
function bind(){
  void bindOfflineCenter();
  bindNexusAppearance(t);
  if(graphicsWorkshopModule&&document.querySelector('[data-graphics-workshop]'))graphicsWorkshopModule.bindGraphicsWorkshop(t,()=>prefs.effectsQuality);
  disposeOrbit=bindNexusOrbit({catalog,locale:prefs.uiLocale,translate:t,languageCatalog:getProgrammingLanguages,languageName:id=>languageLabel(id,prefs.uiLocale),quality:()=>prefs.effectsQuality,openCategory:id=>{academyViewFilter.category=id;academyViewFilter.availability='all';academyViewFilter.query='';location.hash='#view=academy'}});
  bindAcademyView();
  bindCppLearningPath();
  bindStandaloneStudio();
  if(finalModule&&document.querySelector('[data-final-page]'))finalController=finalModule.bindCourseFinal({locale:prefs.uiLocale});
  bindLanguageJourneys({tracks:programming?.tracks||[],course:cpp,t,locale:prefs.uiLocale});
  const shellEl=document.querySelector('#appShell'),sidebar=document.querySelector('#sidebar'),backdrop=document.querySelector('#sidebarBackdrop'),menuBtn=document.querySelector('#menuBtn');
  const isMobile=()=>matchMedia('(max-width: 760px)').matches;
  if(isMobile())menuBtn?.setAttribute('aria-expanded','false');
  const closeMobile=()=>{sidebar?.classList.remove('open');backdrop?.classList.remove('show');if(isMobile())menuBtn?.setAttribute('aria-expanded','false')};
  const setSidebarCollapsed=value=>{prefs=savePrefs({...prefs,sidebarCollapsed:!!value});shellEl?.classList.toggle('sidebar-collapsed',prefs.sidebarCollapsed);menuBtn?.setAttribute('aria-expanded',String(!prefs.sidebarCollapsed));const inner=document.querySelector('#sidebarCollapse');if(inner){inner.title=prefs.uiLocale==='en'?(prefs.sidebarCollapsed?'Expand navigation':'Collapse navigation'):(prefs.sidebarCollapsed?'Развернуть панель':'Свернуть панель');inner.setAttribute('aria-label',inner.title)}};
  menuBtn?.addEventListener('click',()=>{if(isMobile()){const open=!sidebar?.classList.contains('open');sidebar?.classList.toggle('open',open);backdrop?.classList.toggle('show',open);menuBtn.setAttribute('aria-expanded',String(open));return}if(prefs.focusReading){toggleFocus();setSidebarCollapsed(false);return}setSidebarCollapsed(!prefs.sidebarCollapsed)});backdrop?.addEventListener('click',closeMobile);
  document.querySelector('#sidebarCollapse')?.addEventListener('click',()=>{if(isMobile())closeMobile();else setSidebarCollapsed(!prefs.sidebarCollapsed)});
  const toggleFocus=()=>{prefs=savePrefs({...prefs,focusReading:!prefs.focusReading});shellEl?.classList.toggle('focus-reading',prefs.focusReading);document.querySelectorAll('#focusMode,#lessonFocus').forEach(btn=>{btn.setAttribute('aria-pressed',String(prefs.focusReading));btn.title=t(prefs.focusReading?'shell.exitReading':'visual.shell.focus')})};
  document.querySelector('#focusMode')?.addEventListener('click',toggleFocus);document.querySelector('#lessonFocus')?.addEventListener('click',toggleFocus);
  document.querySelectorAll('.side-nav a').forEach(a=>a.addEventListener('click',closeMobile));
  bindGlassSelects();
  bindAccountShell({locale:prefs.uiLocale,onChanged:()=>safeRender()});
  bindNexusShell({translate:t,closeMobile,collapsed:()=>prefs.sidebarCollapsed});
  [['uiLocale','uiLocale'],['courseLocale','courseLocale'],['mentorLocale','mentorLocale']].forEach(([id,k])=>{const x=document.querySelector('#'+id);if(x)x.onchange=async()=>{prefs=savePrefs({...prefs,[k]:x.value});if(k==='uiLocale')await tr();render()}});
  const fx=document.querySelector('#effectsQuality');if(fx)fx.onchange=()=>{prefs=savePrefs({...prefs,effectsQuality:fx.value});updateParticleQuality(fx.value)};
  document.querySelector('#importLegacy')?.addEventListener('click',()=>{importLegacyCppV7();render()});
  const r=route();
  if(r.lesson&&cpp&&lessonData(r.lesson)){const l=lessonData(r.lesson);if(l.gold)goldPresentation.bindAcademyGold(root,l.gold);bindMemoryLab(l?.benchmark?.interactiveMemory,prefs.courseLocale);bindOopLab(l?.benchmark?.interactiveOop,prefs.courseLocale);disposeTerms=bindGlossaryDrawer(root);
    const lessonGrid=document.querySelector('#lessonGrid');const setRightRailCollapsed=value=>{prefs=savePrefs({...prefs,rightRailCollapsed:!!value});lessonGrid?.classList.toggle('rail-collapsed',prefs.rightRailCollapsed);const quick=document.querySelector('#rightRailQuick');if(quick){quick.classList.toggle('active',prefs.rightRailCollapsed);quick.setAttribute('aria-pressed',String(prefs.rightRailCollapsed))}};document.querySelector('#rightRailToggle')?.addEventListener('click',()=>setRightRailCollapsed(true));document.querySelector('#rightRailQuick')?.addEventListener('click',()=>setRightRailCollapsed(!prefs.rightRailCollapsed));
    document.querySelector('#completeLesson')?.addEventListener('click',()=>{toggleLesson(r.lesson,!lessonState(r.lesson).completed);render()});const ed=document.querySelector('#editor'),stdin=document.querySelector('#stdin'),out=document.querySelector('#output'),eng=document.querySelector('#engine'),status=document.querySelector('#sandboxStatus');const routeInfo=document.querySelector('#runtimeRoute');const persisted=lessonState(r.lesson).workspace;if(l.gold?.runtimeTarget!=='qt-wasm'){const studio=bindCodeStudio({editor:ed,locale:prefs.uiLocale,languageId:cpp?.manifest?.language||'cpp',fileName:'main.cpp',files:persisted?.files||[{path:'main.cpp',content:lessonState(r.lesson).code??l.code,languageId:cpp?.manifest?.language||'cpp'}],activeFile:persisted?.activeFile||'main.cpp',sessionKey:`course:cpp:lesson:${r.lesson}`,onWorkspaceChange:snapshot=>{const entry=snapshot.files?.find(file=>file.path===snapshot.entryFile);patchLesson(r.lesson,{workspace:snapshot,code:entry?.content??lessonState(r.lesson).code??l.code})}});const controller=sandboxRuntimeModule.createSandboxController({editor:ed,stdin,output:out,engine:eng,status,routeInfo,requirements:l.requirements||[],locale:prefs.uiLocale,languageId:cpp?.manifest?.language||'cpp',codeStudio:studio,onCodeChange:code=>patchLesson(r.lesson,{code})});stdin?.addEventListener('input',()=>patchLesson(r.lesson,{stdin:stdin.value}));document.querySelector('#resetCode')?.addEventListener('click',()=>{const resetFiles=[{path:'main.cpp',content:l.code,languageId:cpp?.manifest?.language||'cpp'}];patchLesson(r.lesson,{code:l.code,workspace:{languageId:cpp?.manifest?.language||'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:0,files:resetFiles}});studio?.setWorkspace?.(resetFiles,'main.cpp',{emit:false});if(!studio)ed.value=l.code;controller.renderAnalysis();out.className='output';out.textContent=prefs.uiLocale==='en'?'Example restored.':'Пример восстановлен.'});document.querySelector('#runCode')?.addEventListener('click',()=>controller.run().catch(()=>{}));document.querySelector('#testRuntime')?.addEventListener('click',()=>controller.selfTest().catch(()=>{}));document.querySelector('#clearOutput')?.addEventListener('click',()=>{studio?.clearRuntimeDiagnostics?.();out.className='output';out.textContent=prefs.uiLocale==='en'?'Program output will appear here.':'Вывод программы появится здесь.'});}document.querySelector('#checkQuiz')?.addEventListener('click',()=>{const ch=document.querySelector('input[name="quiz"]:checked'),fb=document.querySelector('#quizFeedback');if(!ch){fb.textContent=prefs.uiLocale==='en'?'Choose an answer.':'Выберите вариант.';return}const i=Number(ch.value);patchLesson(r.lesson,{quiz:i});fb.className='quiz-feedback '+(i===l.quiz.correctIndex?'ok':'bad');fb.textContent=i===l.quiz.correctIndex?(prefs.uiLocale==='en'?'Correct. The core idea is understood.':'Верно. Основная идея понята.'):(prefs.uiLocale==='en'?'Not yet. Review the explanation and try again.':'Пока нет. Вернитесь к объяснению и попробуйте ещё раз.')});document.querySelectorAll('.benchmark-check').forEach(btn=>btn.addEventListener('click',()=>{const card=btn.closest('.knowledge-card'),picked=card?.querySelector('input[type="radio"]:checked'),fb=card?.querySelector('.knowledge-feedback');if(!picked){if(fb){fb.className='knowledge-feedback bad';fb.textContent=prefs.uiLocale==='en'?'Choose an answer.':'Выберите вариант.'}return}const ok=Number(picked.value)===Number(btn.dataset.answer);if(fb){fb.className='knowledge-feedback '+(ok?'ok':'bad');fb.textContent=(ok?(prefs.uiLocale==='en'?'Correct. ':'Верно. '):(prefs.uiLocale==='en'?'Not yet. ':'Пока нет. '))+(btn.dataset.explain||'')}}));document.querySelector('#askAkronikl')?.addEventListener('click',()=>alert(t('journey.mentor.planned',{topic:l.title})))}
  if(r.practicum&&cpp&&practicumData(r.practicum)){
    const p=practicumData(r.practicum),st=loadState().courses?.cpp?.practicums?.[r.practicum]||{};const ed=document.querySelector('#editor'),stdin=document.querySelector('#stdin'),out=document.querySelector('#output'),eng=document.querySelector('#engine'),status=document.querySelector('#sandboxStatus'),routeInfo=document.querySelector('#runtimeRoute');const persisted=st.workspace&&Array.isArray(st.workspace.files)&&st.workspace.files.length?st.workspace:null;const studio=bindCodeStudio({editor:ed,locale:prefs.uiLocale,languageId:'cpp',fileName:'main.cpp',files:persisted?.files||[{path:'main.cpp',content:st.code??p?.starter??'',languageId:'cpp'}],activeFile:persisted?.activeFile||'main.cpp',sessionKey:`course:cpp:practicum:${r.practicum}`,onWorkspaceChange:snapshot=>{const entry=snapshot.files?.find(file=>file.path===snapshot.entryFile);patchPracticum(r.practicum,{workspace:snapshot,code:entry?.content??''})}});const controller=sandboxRuntimeModule.createSandboxController({editor:ed,stdin,output:out,engine:eng,status,routeInfo,requirements:[],locale:prefs.uiLocale,languageId:'cpp',codeStudio:studio,onCodeChange:code=>patchPracticum(r.practicum,{code})});stdin?.addEventListener('input',()=>patchPracticum(r.practicum,{stdin:stdin.value}));document.querySelector('#runCode')?.addEventListener('click',()=>controller.run().catch(()=>{}));document.querySelector('#testRuntime')?.addEventListener('click',()=>controller.selfTest().catch(()=>{}));document.querySelector('#clearOutput')?.addEventListener('click',()=>{studio?.clearRuntimeDiagnostics?.();out.className='output';out.textContent=t('learningUi.output')});document.querySelector('#resetPracticum')?.addEventListener('click',()=>{if(!p)return;const files=[{path:'main.cpp',content:p.starter,languageId:'cpp'}];patchPracticum(r.practicum,{code:p.starter,stdin:p.stdin||'',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:0,files}});studio?.setWorkspace?.(files,'main.cpp',{emit:false});if(stdin)stdin.value=p.stdin||'';controller.renderAnalysis();out.className='output';out.textContent=t('journey.practicum.restored')})
  }
  if((r.view==='project-studio'||r.view==='projects'||r.view==='code-studio')&&r.project&&projectStudioApi&&!document.querySelector('[data-graphics-workshop]')){projectStudioApi.bindProjectStudio({projectId:r.project,locale:prefs.uiLocale,onChanged:rerender=>{if(rerender)safeRender()},onDeleted:()=>{location.hash=r.view==='code-studio'?'#view=code-studio':'#view=project-studio'}})}
  if((r.view==='project-studio'||r.view==='projects')&&!r.project&&projectStudioApi){projectStudioApi.bindProjectStudioDashboard?.({locale:prefs.uiLocale,onChanged:rerender=>{if(rerender)safeRender()},onOpenProject:projectId=>{location.hash=`#view=project-studio&project=${encodeURIComponent(projectId)}`}})}
  document.querySelector('#psNewProject')?.addEventListener('click',()=>{const title=prompt(prefs.uiLocale==='en'?'Project name':'Название проекта',prefs.uiLocale==='en'?'My C++ Project':'Мой C++ проект');if(!title?.trim()||!projectStudioApi)return;const template=projectStudioApi.blankCppProjectTemplate(title.trim());const project=projectStudioApi.createProject(template);location.hash=`#view=project-studio&project=${encodeURIComponent(project.id)}`});
  document.querySelectorAll('[data-practicum][data-task]').forEach(x=>x.onchange=()=>{const id=x.dataset.practicum,idx=Number(x.dataset.task),cur=loadState().courses?.cpp?.practicums?.[id]?.tasks||[];const set=new Set(cur);x.checked?set.add(idx):set.delete(idx);patchPracticum(id,{tasks:[...set].sort((a,b)=>a-b)})})
  bindNexusLearningUi(t);
  bindLearningDiscovery(t);
  bindRecentProjects({loadProjects:async()=>(await loadProjectStudio()).listProjects(),t,locale:prefs.uiLocale});
  bindNexusStudioUi(prefs.uiLocale);
  bindNexusAccountAccess(prefs.uiLocale);
  if(administrationModule&&route().view==='admin')void administrationModule.bindAdministration({tab:route().tab});else void bindAdministrationNavigation().catch(()=>{});void bindPublicContent(route());
  bindFeedbackUi({locale:prefs.uiLocale,catalog:catalog.courses,route:route(),version:PROJECT_STUDIO_VERSION});
}
async function render(){delete root.dataset.akroniklRoute;assistantBridge.invalidate();const sequence=++renderSequence;let renderHash=location.hash;viewResume.begin(location.hash||'#view=home');const r=route();let page;if(r.view==='course-final'){const mod=await loadFinal();if(sequence!==renderSequence||renderHash!==location.hash)return;page=visualShell(mod.courseFinalMarkup(prefs.uiLocale),'academy')}else if(r.view==='offline'){page=shell(offlineCenterMarkup(),'offline')}else if(r.course==='cpp'){const courseReady=cpp||getCppCourse();
const runtimeReady=r.lesson||r.practicum?loadSandboxRuntime():null;
const [loadedCourse]=await Promise.all([courseReady,runtimeReady,r.lesson?prepareCppGoldLesson(courseReady,r.lesson,prefs.courseLocale,async()=>{
 goldPresentation??=await import('./academy-gold-presentation.js');await goldPresentation.ensureGoldStyles();
}):null]);cpp=loadedCourse;if(sequence!==renderSequence||renderHash!==location.hash)return;page=r.lesson?lessonView(r.lesson):r.practicum?practicumView(r.practicum):r.tab==='practicums'?practicums():r.tab==='projects'?projectsView():overview()}else if(r.view==='code-studio'){const ps=await loadProjectStudio();if(sequence!==renderSequence||renderHash!==location.hash)return;if(r.project&&ps.getProject(r.project)?.origin?.courseId==='cpp')cpp??=await getCppCourse();page=r.project?standaloneProject(r.project):codeStudioStart()}else if(r.view==='computer-graphics'||r.course==='computer-graphics'){page=visualShell((await loadGraphicsWorkshop()).graphicsWorkshopMarkup(t),'academy')}else if(r.view==='programming'){programming??=await getProgrammingLanguages();cpp??=await getCppCourse();page=programmingHub()}else if((r.view==='project-studio'||r.view==='projects')&&r.project&&(await loadProjectStudio()).getProject(r.project)?.origin?.kind==='graphics-lab'){page=visualShell((await loadGraphicsWorkshop()).graphicsWorkshopMarkup(t),'projects')}else if(r.view==='project-studio'||r.view==='projects'){cpp??=await getCppCourse();const ps=await loadProjectStudio();if(sequence!==renderSequence||renderHash!==location.hash)return;if(r.template&&!r.project){const [kind,id]=String(r.template).split(':');if(kind==='cpp'){const def=courseProjectById(id);if(def){const project=ensurePracticeWorkingCopy(ps,def);history.replaceState(null,'',`${location.pathname}${location.search}#view=project-studio&project=${encodeURIComponent(project.id)}`);renderHash=location.hash;r.project=project.id}}}page=r.project?projectStudioProject(r.project):projectStudioDashboard()}else if(r.view==='home'||r.view==='academy'){if(!cpp)cppLanding??=await getCppOutline();page=r.view==='home'?home():academy()}else if(r.view==='labs'||r.view==='practices'){cpp??=await getCppCourse();page=visualShell(discoveryPageMarkup({kind:r.view,course:cpp,contentFor:lessonData,projects:r.view==='practices'?(await loadProjectStudio()).listProjects():[],state:loadState().courses?.cpp||{},t,locale:prefs.uiLocale,materialLocale:prefs.courseLocale}),r.view)}else if(r.view==='admin'){page=visualShell((await loadAdministration()).administrationMarkup(r.tab),'admin')}else if(r.view==='blog'){page=visualShell(blogMarkup(),'blog')}else if(r.view==='feedback'){page=visualShell(feedbackPageMarkup(prefs.uiLocale),'home')}else if(r.view==='reviews'){page=visualShell(reviewsPageMarkup(prefs.uiLocale),'home')}else if(r.view==='feedback-admin'){page=visualShell(moderationPageMarkup(prefs.uiLocale),'home')}else page=r.view==='account'?shell(accountPageMarkup(prefs.uiLocale,r.tab),'home'):placeholder(r.view);if(sequence!==renderSequence||renderHash!==location.hash)return;replaceRoute(page);globalThis.__NEXUS_BOOT_OK__?.();document.querySelector('#boot-status')?.remove();bind();assistantBridge.bindEditor();
  const header=root.querySelector('.nexus-footer-actions');if(header&&!header.querySelector('[data-akronikl-open]')){const b=document.createElement('button');b.type='button';b.className='btn';b.dataset.akroniklOpen='';b.textContent='Akronikl';header.append(b);}if(renderHash===location.hash)root.dataset.akroniklRoute=renderHash;if(r.course==='cpp'&&r.lesson)learningResume.remember(cpp,r.lesson,r.focus);const resumed=viewResume.restore();if(!resumed)focusLearningSection(r.focus);if(!resumed&&(r.view==='computer-graphics'||r.course==='computer-graphics'))scrollTo(0,0)}
function renderFailure(err){console.error(err);const detail=e(err?.stack||err?.message||err);if(t){const body=`<section class="placeholder nexus-route-message" role="alert"><span class="eyebrow">NEXUS</span><h1>${e(t('shell.error.title'))}</h1><p>${e(t('shell.error.text'))}</p><div class="hero-actions"><a class="btn primary" href="#view=home">${e(t('shell.error.home'))}</a><button class="btn" id="retryRoute">${e(t('shell.error.retry'))}</button></div><details><summary>${e(t('shell.error.details'))}</summary><pre class="route-error-detail">${detail}</pre></details></section>`;replaceRoute(shell(body,route().view==='project-studio'?'projects':'home'));document.querySelector('#boot-status')?.remove();bind();document.querySelector('#retryRoute')?.addEventListener('click',()=>safeRender())}else{const b=document.querySelector('#boot-status');if(b){b.className='boot-error';b.innerHTML=`<strong>Nexus не запустился / Nexus could not start</strong><pre>${detail}</pre>`}}}
async function safeRender(){let sequence;try{if(finalController?.prepareNavigation&&!finalController.prepareNavigation())return;if(projectStudioApi?.prepareProjectNavigation&&!projectStudioApi.prepareProjectNavigation())return;const pending=render();sequence=renderSequence;await pending}catch(err){if(sequence===undefined||sequence===renderSequence)renderFailure(err)}}
async function bootstrap(){mountInterfaceUpdate();viewResume.install();[registry,catalog]=await Promise.all([loadLocaleRegistry(),getCatalog()]);await tr();configureNexusAppearance({read:()=>prefs,write:(value,patch)=>{const restoreEffects=patch.motion===true&&prefs.effectsQuality==='off';prefs=savePrefs({...prefs,nexusAppearance:value,...(restoreEffects?{effectsQuality:'auto'}:{})});if(patch.motion)updateParticleQuality(prefs.effectsQuality);if(restoreEffects){const fx=document.querySelector('#effectsQuality');if(fx&&fx.value!==prefs.effectsQuality)fx.closest('[data-nexus-select]')?.querySelector('[data-value="auto"]')?.click()}}});startParticleField(prefs.effectsQuality||'auto');addEventListener('hashchange',()=>safeRender());await safeRender();}
bootstrap().catch(err=>renderFailure(err));
