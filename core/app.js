import {withProjectWriter} from '../project-studio/project-writer.js';
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
let offlineCenterModule=null;
import {loadBundle,loadLocaleRegistry,textFor,translator} from './i18n.js';
import {getCatalog,getCppCourse,getCppOutline,getProgrammingLanguages,prepareCppGoldLesson} from './course-registry.js';
import {loadPrefs,savePrefs,loadState,lessonState,patchPracticum,withCourseStateWriter,cppProgramProgress} from './storage.js';
import {inspectLegacyCppV7,importLegacyCppV7,getCppProgress} from './migrations/cpp-v7.js';
import {setAkroniklContext,createLazyAssistantBridge,assistantPageMarkup} from '../akronikl/context.js';
import {languageLabel} from '../sandbox/languages.js';
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
let onecController=null,learningController=null;
function replaceRoute(page){learningController?.dispose();learningController=null;onecController?.dispose();onecController=null;finalController?.dispose();finalController=null;disposeTerms?.();disposeTerms=null;disposeOrbit?.();disposeOrbit=null;document.onkeydown=null;root.innerHTML=page}
const academyViewFilter={category:'all',availability:'all',query:''};
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const route=()=>{const p=new URLSearchParams(location.hash.replace(/^#/,''));return{view:p.get('view')||'home',course:p.get('course'),lesson:p.get('lesson'),tab:p.get('tab')||'overview',practicum:p.get('practicum'),project:p.get('project'),template:p.get('template'),focus:p.get('focus'),section:p.get('section'),locale:p.get('locale')}};
const readLearningProgress=createLearningProgressReader({readIdentity:verifiedAccount,loadCourse:()=>cpp||cppLanding||getCppOutline(),readState:loadState,readResume:(course,state)=>learningResume.continuation(course,state.courses?.cpp?.lessons),readLocale:()=>prefs.mentorLocale||prefs.uiLocale,readLesson:()=>route().course==='cpp'?route().lesson:null});
const assistantBridge=createLazyAssistantBridge({root,readIdentity:()=>verifiedAccount(),readReady:()=>root.dataset.akroniklRoute===location.hash,readRoute:route,readLocale:()=>prefs.mentorLocale||prefs.uiLocale,readCourseLocale:()=>prefs.courseLocale,readEditor:()=>root.querySelector('#editor'),readLearningProgress});
addEventListener('nexus:context-invalidated',()=>{delete root.dataset.akroniklRoute});
const PROJECT_STUDIO_VERSION='0.1.7-alpha.2.4.6-ui1a.10.10.2-p4q.6';
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
function cppContinuation(){return learningResume.continuation(cpp||cppLanding,loadState().courses?.cpp?.lessons||{})}
function home(...args){return sharedViews().home(...args)}
function academy(){return visualShell(academyCatalogMarkup({catalog,cpp:cpp||cppLanding,prefs,t,academyViewFilter,visualIcon}),'academy')}
function bindAcademyView(){bindAcademyCatalog({prefs,t,academyViewFilter})}

function programmingHub(...args){return sharedViews().programmingHub(...args)}
function practicumData(...args){return sharedViews().practicumData(...args)}
function practicumView(...args){return sharedViews().practicumView(...args)}
function courseProjectById(...args){return sharedViews().courseProjectById(...args)}
function projectStudioDashboard(...args){return sharedViews().projectStudioDashboard(...args)}
function projectStudioProject(...args){return sharedViews().projectStudioProject(...args)}
function overview(...args){return sharedViews().overview(...args)}
function lessonData(...args){return sharedViews().lessonData(...args)}
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
 bindCodeStudioHome({mount,t,onCreate:input=>withProjectWriter(()=>{check();return projectStudioApi.createProject(input)}),onOpen:open,findProject:id=>{check();return projectStudioApi.getProject(id)},listCloud:async()=>{check();const api=await import('../sync/cloud-sync.js');check();return api.listCloudProjects()},importCloud:async id=>{check();const api=await import('../sync/cloud-sync.js');check();return api.importCloudProject(id)}});
}
function standaloneProject(projectId){
 const ps=projectStudioApi,project=ps.getProject(projectId);if(!project)return visualShell('<section class="placeholder"><h1>'+e(t('studio.missing'))+'</h1><a class="btn" href="#view=code-studio">Code Studio</a></section>','code-studio');
 if(project.languageId!=='cpp')return visualShell('<section class="placeholder"><h1>'+e(t('studio.unsupported'))+'</h1><a class="btn" href="#view=projects">'+e(t('studio.allProjects'))+'</a></section>','code-studio');
 const definition=project.origin?.courseId==='cpp'?courseProjectById(project.origin.projectId):null;
 return visualShell('<div class="nexus-project-studio" data-nexus-project-studio>'+ps.projectStudioViewMarkup({project,courseProject:definition,locale:prefs.uiLocale,backHref:'#view=code-studio',backLabel:'Code Studio'})+'</div>','code-studio');
}

function bindCppLearningPath(){return bindSharedLearningPath({onSelect:value=>{cppLearningFilter=value}})}
async function bind(){
  void offlineCenterModule?.bindOfflineCenter();
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
  [['uiLocale','uiLocale'],['courseLocale','courseLocale'],['mentorLocale','mentorLocale']].forEach(([id,k])=>{const x=document.querySelector('#'+id);if(x)x.onchange=async()=>{const value=x.value,previous=prefs[k];if(!await prepareLearningNavigation()){x.value=previous;return;}prefs=savePrefs({...prefs,[k]:value});if(k==='uiLocale')await tr();if(k==='courseLocale'){const p=new URLSearchParams(location.hash.slice(1));p.delete('locale');history.replaceState(null,'','#'+p);}await render()}});
  const fx=document.querySelector('#effectsQuality');if(fx)fx.onchange=()=>{prefs=savePrefs({...prefs,effectsQuality:fx.value});updateParticleQuality(fx.value)};
  document.querySelector('#importLegacy')?.addEventListener('click',async()=>{try{await withCourseStateWriter(()=>importLegacyCppV7());await safeRender();}catch{alert(prefs.uiLocale==='en'?'Import was not saved. Existing data was preserved.':'Импорт не сохранён. Прежние данные сохранены.');}});
  const r=route();
  if(r.course==='cpp'&&r.lesson==='cpp.programming-process'){
   const sequence=renderSequence,[ui,state]=await Promise.all([import('./cpp-clarity-r3-renderer.mjs'),import('./cpp-clarity-r3-session.mjs')]);
   if(sequence!==renderSequence)return;learningController=await ui.mountClarityLesson(root.querySelector('[data-r3-mount]'),{topicId:r.lesson,locale:r.locale||prefs.courseLocale,adapter:verifiedAccount()?state.createCppAccountAdapter('lesson',r.lesson):null,isCurrent:()=>sequence===renderSequence});
  }else if(r.course==='cpp'&&(r.lesson||r.practicum)){

   const item=r.lesson?lessonData(r.lesson):practicumData(r.practicum);if(item){const sequence=renderSequence,module=await import('./cpp-clarity-r3-session.mjs');if(sequence!==renderSequence)return;learningController=await module.bindLegacyLearning({root,prefs,r,cpp,item,goldPresentation,sandboxRuntimeModule,loadProjectStudio,rerender:safeRender,t,savePrefs,bindMemoryLab,bindOopLab,bindGlossaryDrawer});}
  }
  if((r.view==='project-studio'||r.view==='projects'||r.view==='code-studio')&&r.project&&projectStudioApi&&!document.querySelector('[data-graphics-workshop]')){projectStudioApi.bindProjectStudio({projectId:r.project,locale:prefs.uiLocale,onChanged:rerender=>{if(rerender)safeRender()},onDeleted:()=>{location.hash=r.view==='code-studio'?'#view=code-studio':'#view=project-studio'}})}
  if((r.view==='project-studio'||r.view==='projects')&&!r.project&&projectStudioApi){projectStudioApi.bindProjectStudioDashboard?.({locale:prefs.uiLocale,onChanged:rerender=>{if(rerender)safeRender()},onOpenProject:projectId=>{location.hash=`#view=project-studio&project=${encodeURIComponent(projectId)}`}})}
  document.querySelector('#psNewProject')?.addEventListener('click',async()=>{const title=prompt(prefs.uiLocale==='en'?'Project name':'Название проекта',prefs.uiLocale==='en'?'My C++ Project':'Мой C++ проект');if(!title?.trim()||!projectStudioApi)return;const template=projectStudioApi.blankCppProjectTemplate(title.trim());let project;try{project=await withProjectWriter(()=>projectStudioApi.createProject(template))}catch(error){alert(error.message);return;}location.hash=`#view=project-studio&project=${encodeURIComponent(project.id)}`});
  document.querySelectorAll('[data-practicum][data-task]').forEach(x=>x.onchange=async()=>{const id=x.dataset.practicum,idx=Number(x.dataset.task),checked=x.checked;try{await withCourseStateWriter(()=>{const set=new Set(loadState().courses?.cpp?.practicums?.[id]?.tasks||[]);checked?set.add(idx):set.delete(idx);patchPracticum(id,{tasks:[...set].sort((a,b)=>a-b)});});}catch{x.checked=!checked;alert(prefs.uiLocale==='en'?'The mark was not saved.':'Отметка не сохранена.');}})

  bindNexusLearningUi(t);
  bindLearningDiscovery(t);
  bindRecentProjects({loadProjects:async()=>(await loadProjectStudio()).listProjects(),t,locale:prefs.uiLocale});
  bindNexusStudioUi(prefs.uiLocale);
  bindNexusAccountAccess(prefs.uiLocale);
  if(administrationModule&&route().view==='admin')void administrationModule.bindAdministration({tab:route().tab});else void bindAdministrationNavigation().catch(()=>{});void bindPublicContent(route());
  bindFeedbackUi({locale:prefs.uiLocale,catalog:catalog.courses,route:route(),version:PROJECT_STUDIO_VERSION});
}
async function render(){delete root.dataset.akroniklRoute;assistantBridge.invalidate();const sequence=++renderSequence;let renderHash=location.hash;viewResume.begin(location.hash||'#view=home');const r=route();let page,onecModule;if(r.view==='course-final'){const mod=await loadFinal();if(sequence!==renderSequence||renderHash!==location.hash)return;page=visualShell(mod.courseFinalMarkup(prefs.uiLocale),'academy')}else if(r.view==='offline'){offlineCenterModule??=await import('../pwa/offline-center.js');if(sequence!==renderSequence||renderHash!==location.hash)return;page=shell(offlineCenterModule.offlineCenterMarkup(),'offline')}else if(r.course==='onec'||r.course==='1c-enterprise'){onecModule=await import('../courses/onec-education/integration.mjs');if(sequence!==renderSequence||renderHash!==location.hash)return;page=visualShell(onecModule.onecIntegrationMarkup(),'academy')}else if(r.course==='cpp'){const courseReady=cpp||getCppCourse();
const pilot=r.lesson==='cpp.programming-process';const runtimeReady=!pilot&&(r.lesson||r.practicum)?loadSandboxRuntime():null;
const [loadedCourse]=await Promise.all([courseReady,runtimeReady,r.lesson&&!pilot?prepareCppGoldLesson(courseReady,r.lesson,prefs.courseLocale,async()=>{
 goldPresentation??=await import('./academy-gold-presentation.js');await goldPresentation.ensureGoldStyles();
}):null]);cpp=loadedCourse;if(sequence!==renderSequence||renderHash!==location.hash)return;page=pilot?visualShell('<section data-r3-mount><p role="status">Загрузка урока / Loading lesson…</p></section>','academy'):r.lesson?lessonView(r.lesson):r.practicum?practicumView(r.practicum):r.tab==='practicums'?practicums():r.tab==='projects'?projectsView():overview()}else if(r.view==='code-studio'){const ps=await loadProjectStudio();if(sequence!==renderSequence||renderHash!==location.hash)return;if(r.project&&ps.getProject(r.project)?.origin?.courseId==='cpp')cpp??=await getCppCourse();page=r.project?standaloneProject(r.project):codeStudioStart()}else if(r.view==='computer-graphics'||r.course==='computer-graphics'){page=visualShell((await loadGraphicsWorkshop()).graphicsWorkshopMarkup(t),'academy')}else if(r.view==='programming'){programming??=await getProgrammingLanguages();cpp??=await getCppCourse();page=programmingHub()}else if((r.view==='project-studio'||r.view==='projects')&&r.project&&(await loadProjectStudio()).getProject(r.project)?.origin?.kind==='graphics-lab'){page=visualShell((await loadGraphicsWorkshop()).graphicsWorkshopMarkup(t),'projects')}else if(r.view==='project-studio'||r.view==='projects'){cpp??=await getCppCourse();const ps=await loadProjectStudio();if(sequence!==renderSequence||renderHash!==location.hash)return;if(r.template&&!r.project){const [kind,id]=String(r.template).split(':');if(kind==='cpp'){const def=courseProjectById(id);if(def){const project=await withProjectWriter(()=>ensurePracticeWorkingCopy(ps,def));history.replaceState(null,'',`${location.pathname}${location.search}#view=project-studio&project=${encodeURIComponent(project.id)}`);renderHash=location.hash;r.project=project.id}}}page=r.project?projectStudioProject(r.project):projectStudioDashboard()}else if(r.view==='home'||r.view==='academy'){if(!cpp)cppLanding??=await getCppOutline();page=r.view==='home'?home():academy()}else if(r.view==='labs'||r.view==='practices'){cpp??=await getCppCourse();page=visualShell(discoveryPageMarkup({kind:r.view,course:cpp,contentFor:lessonData,projects:r.view==='practices'?(await loadProjectStudio()).listProjects():[],state:loadState().courses?.cpp||{},t,locale:prefs.uiLocale,materialLocale:prefs.courseLocale}),r.view)}else if(r.view==='admin'){page=visualShell((await loadAdministration()).administrationMarkup(r.tab),'admin')}else if(r.view==='blog'){page=visualShell(blogMarkup(),'blog')}else if(r.view==='feedback'){page=visualShell(feedbackPageMarkup(prefs.uiLocale),'home')}else if(r.view==='reviews'){page=visualShell(reviewsPageMarkup(prefs.uiLocale),'home')}else if(r.view==='feedback-admin'){page=visualShell(moderationPageMarkup(prefs.uiLocale),'home')}else page=r.view==='account'?shell(accountPageMarkup(prefs.uiLocale,r.tab),'home'):placeholder(r.view);if(sequence!==renderSequence||renderHash!==location.hash)return;replaceRoute(page);if(onecModule){onecController=onecModule.mountOnecIntegration(root.querySelector('[data-onec-platform-mount]'),{locale:prefs.courseLocale,isCurrent:()=>sequence===renderSequence,openAssistant:(button,context)=>{setAkroniklContext({...context,code:null,stdin:null,stdout:null,stderr:null,attempts:[]});void assistantBridge.open(button);}});await onecController.ready;if(sequence!==renderSequence||renderHash!==location.hash)return;}globalThis.__NEXUS_BOOT_OK__?.();document.querySelector('#boot-status')?.remove();await bind();if(sequence!==renderSequence)return;assistantBridge.bindEditor();
  const header=root.querySelector('.nexus-footer-actions');if(header&&!header.querySelector('[data-akronikl-open]')){const b=document.createElement('button');b.type='button';b.className='btn';b.dataset.akroniklOpen='';b.textContent='Akronikl';header.append(b);}if(renderHash===location.hash)root.dataset.akroniklRoute=renderHash;if(r.course==='cpp'&&r.lesson)learningResume.remember(cpp,r.lesson,r.focus);const resumed=viewResume.restore();if(!resumed)focusLearningSection(r.focus);if(!resumed&&(r.view==='computer-graphics'||r.course==='computer-graphics'))scrollTo(0,0)}
function renderFailure(err){console.error(err);const detail=e(err?.stack||err?.message||err);if(t){const body=`<section class="placeholder nexus-route-message" role="alert"><span class="eyebrow">NEXUS</span><h1>${e(t('shell.error.title'))}</h1><p>${e(t('shell.error.text'))}</p><div class="hero-actions"><a class="btn primary" href="#view=home">${e(t('shell.error.home'))}</a><button class="btn" id="retryRoute">${e(t('shell.error.retry'))}</button></div><details><summary>${e(t('shell.error.details'))}</summary><pre class="route-error-detail">${detail}</pre></details></section>`;replaceRoute(shell(body,route().view==='project-studio'?'projects':'home'));document.querySelector('#boot-status')?.remove();bind();document.querySelector('#retryRoute')?.addEventListener('click',()=>safeRender())}else{const b=document.querySelector('#boot-status');if(b){b.className='boot-error';b.innerHTML=`<strong>Nexus не запустился / Nexus could not start</strong><pre>${detail}</pre>`}}}
async function prepareLearningNavigation(){return (!learningController||await learningController.prepareNavigation())&&(!onecController?.prepareNavigation||await onecController.prepareNavigation());}
async function safeRender(){let sequence;try{if(await learningController?.handleRoute?.(location.hash,prefs.courseLocale)||await onecController?.handleRoute?.(location.hash,prefs.courseLocale))return;if(!await prepareLearningNavigation())return;if(finalController?.prepareNavigation&&!finalController.prepareNavigation())return;if(projectStudioApi?.prepareProjectNavigation&&!projectStudioApi.prepareProjectNavigation())return;const pending=render();sequence=renderSequence;await pending}catch(err){if(sequence===undefined||sequence===renderSequence)renderFailure(err)}}
async function bootstrap(){mountInterfaceUpdate();viewResume.install();[registry,catalog]=await Promise.all([loadLocaleRegistry(),getCatalog()]);await tr();configureNexusAppearance({read:()=>prefs,write:(value,patch)=>{const restoreEffects=patch.motion===true&&prefs.effectsQuality==='off';prefs=savePrefs({...prefs,nexusAppearance:value,...(restoreEffects?{effectsQuality:'auto'}:{})});if(patch.motion)updateParticleQuality(prefs.effectsQuality);if(restoreEffects){const fx=document.querySelector('#effectsQuality');if(fx&&fx.value!==prefs.effectsQuality)fx.closest('[data-nexus-select]')?.querySelector('[data-value="auto"]')?.click()}}});startParticleField(prefs.effectsQuality||'auto');addEventListener('hashchange',()=>safeRender());await safeRender();}
bootstrap().catch(err=>renderFailure(err));
