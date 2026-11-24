import {accountLocalStorage} from './account-storage.js';
import {activePrincipalId,isCurrentProjectOwner} from './identity.js';
import {evaluateProjectAccess} from '../collaboration/access-control.js';
import {languageLabel} from '../sandbox/languages.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=(value,locale)=>typeof value==='string'?value:value?.[locale]||value?.ru||value?.en||'';
const focusValue=value=>['task','lab'].includes(value)?value:'';
const lessonLink=(id,focus='')=>`#course=cpp&lesson=${encodeURIComponent(id)}${focusValue(focus)?'&focus='+focus:''}`;

export {escape,title,lessonLink};

// Учебный порядок задают модули; физический массив сохраняет старые migration indices.
export function orderedCppLessons(course){
 const source=course?.curriculum?.lessons||[],byId=new Map(source.map(lesson=>[lesson.id,lesson]));
 const ids=course?.curriculum?.sections?.flatMap(section=>section.lessonIds||[])||[];
 return [...new Set([...ids,...source.map(lesson=>lesson.id)])].map(id=>byId.get(id)).filter(Boolean);
}

// Индекс не зависит от того, какие тела Gold уже открыты в этой вкладке.
export function learningLaboratory(course,id,content,locale='ru'){
 return course?.goldLaboratories?.[id]?.[locale]||content?.benchmark?.lab||null;
}

// A local navigation bookmark. This never writes course progress, workspaces or session credentials.
export function createLearningResume({storage=accountLocalStorage(),principal=activePrincipalId,now=()=>new Date().toISOString()}={}){
 const key=()=> 'akronikl:it-nexus:learning-resume:v1:'+encodeURIComponent(principal());
 const read=()=>{try{const value=JSON.parse(storage?.getItem(key())||'null');return value?.schemaVersion===1&&value.courses&&typeof value.courses==='object'?value.courses:{}}catch{return{}}};
 const record=(courseId,point)=>{
  try{if(!storage)return false;const courses=read();courses[courseId]=point;storage.setItem(key(),JSON.stringify({schemaVersion:1,courses}));return true}catch{return false}
 };
 const remember=(course,lessonId,focus='')=>{
  if(course?.manifest?.id!=='cpp'||!course.curriculum?.lessons?.some(item=>item.id===lessonId))return false;
  return record('cpp',{lessonId,focus:focusValue(focus),visitedAt:now()});
 };
 const onecIds=['onec','1c-enterprise'];
 const rememberOnec=({courseId,lessonId,sectionId})=>{
  if(!onecIds.includes(courseId)||typeof lessonId!=='string'||!lessonId.startsWith(courseId+'.')||
    !['explanation','selfcheck','practice'].includes(sectionId))return false;
  return record(courseId,{lessonId,sectionId,visitedAt:now()});
 };
 const lastOnec=()=>{
  const courses=read();
  return onecIds.flatMap(courseId=>{
   const point=courses[courseId];
   return point?.lessonId?.startsWith?.(courseId+'.')&&Number.isFinite(Date.parse(point.visitedAt))?
    [{courseId,topicId:point.lessonId,sectionId:point.sectionId,updatedAt:point.visitedAt}]:[];
  }).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt))[0]??null;
 };
 const continuation=(course,state={})=>{
  const lessons=orderedCppLessons(course),saved=read().cpp;
  const last=lessons.find(item=>item.id===saved?.lessonId);
  const next=lessons.find(item=>!state[item.id]?.completed);
  const lesson=last||next||lessons[0];
  if(!lesson)return null;
  const mode=last?'resume':next?(Object.values(state).some(x=>x?.completed)?'next':'start'):'review';
  const focus=last?focusValue(saved.focus):'',storedStage=last&&state[lesson.id]?.clarityDraft?.stage;
  const stage=['explanation','selfcheck','practice'].includes(storedStage)?storedStage:'';
  return{lesson,mode,focus,stage,href:lessonLink(lesson.id,focus)+(stage&&!focus?'&stage='+stage:''),visitedAt:last?saved.visitedAt:null};
 };
 return{remember,rememberOnec,lastOnec,continuation,key};
}

export function continuationNote(resume,t,locale){
 if(!resume)return'';
 const stageName=locale==='en'?{explanation:'Explanation',selfcheck:'Self-check',practice:'Practice'}:{explanation:'Объяснение',selfcheck:'Самопроверка',practice:'Практика'};
 const detail=resume.focus?t('discovery.kind.'+resume.focus):stageName[resume.stage];
 return `<p class="learning-resume-note" data-learning-resume-note><span>${escape(t('discovery.resume.'+resume.mode))}</span><strong>${escape(title(resume.lesson.title,locale))}</strong>${detail?`<small>${escape(detail)}</small>`:''}</p>`;
}
export function continuationCard(resume,t,locale){
 if(!resume)return'';
 return `<section class="discovery-resume glass-panel" aria-label="${escape(t('codeHub.continue'))}"><div><span class="eyebrow">C++ · ${escape(t('codeHub.reference'))}</span>${continuationNote(resume,t,locale)}</div><a class="btn primary" data-learning-continue href="${escape(resume.href)}">${escape(t('discovery.action.'+resume.mode))}<span aria-hidden="true">→</span></a></section>`;
}

export function recentProjectsMarkup(t,{hideEmpty=false}={}){
 return `<section class="section discovery-recent" data-recent-projects${hideEmpty?' data-current-projects hidden':''} aria-labelledby="recentProjectsTitle"><div class="section-head"><div><span class="eyebrow">PROJECT STUDIO</span><h2 id="recentProjectsTitle">${escape(t('discovery.recent.title'))}</h2><p>${escape(t('discovery.recent.intro'))}</p></div><a class="learning-open-link" href="#view=projects">${escape(t('discovery.recent.all'))} →</a></div><div data-recent-list role="status">${escape(t('discovery.recent.loading'))}</div></section>`;
}
export function recentProjectListMarkup(visible,t,locale='ru'){return visible.length?`<div class="discovery-project-grid">${visible.map(project=>{let date='';try{date=new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric'}).format(new Date(project.updatedAt))}catch{}return `<article class="discovery-project-card glass-panel" data-recent-project="${escape(project.id)}"><div class="learning-card-kicker"><span>${escape(languageLabel(project.languageId,locale))}</span><span>${escape(t(project.origin?.kind==='graphics-lab'?'discovery.recent.graphics':project.origin?.courseId?'discovery.recent.course':'discovery.recent.own'))}</span></div><h3>${escape(project.title)}</h3><p>${escape(project.description||t('discovery.recent.noDescription'))}</p>${date?`<small>${escape(t('discovery.recent.updated',{date}))}</small>`:''}<a class="btn" href="#view=project-studio&project=${encodeURIComponent(project.id)}">${escape(t('discovery.recent.open'))}<span aria-hidden="true">↗</span></a></article>`}).join('')}</div>`:`<div class="discovery-empty glass-panel"><h3>${escape(t('discovery.recent.empty'))}</h3><p>${escape(t('discovery.recent.emptyText'))}</p><a class="btn" href="#course=cpp&tab=projects">${escape(t('codeHub.courseProjects'))} →</a><a class="btn" href="#view=projects">${escape(t('nav.myProjects'))} ↗</a></div>`}
let disposeRecent=()=>{};
export function bindRecentProjects({loadProjects,t,locale='ru'}={}){
 disposeRecent();const container=document.querySelector('[data-recent-projects]');if(!container)return;
 let cancelled=false;const principal=activePrincipalId(),current=()=>!cancelled&&container.isConnected&&activePrincipalId()===principal;
 const target=container.querySelector('[data-recent-list]');
 const load=async()=>{
  try{
   const projects=await loadProjects();if(!current())return;
   const ownersOnly=container.hasAttribute('data-current-projects');
   const visible=projects.filter(project=>evaluateProjectAccess(project.access,{subjectId:principal,action:'view'}).allowed&&(!ownersOnly&&project.origin?.kind!=='graphics-lab'||isCurrentProjectOwner(project.access))).slice(0,3);
   if(ownersOnly)container.hidden=!visible.length;
   target.removeAttribute('role');
   target.innerHTML=recentProjectListMarkup(visible,t,locale);
  }catch{if(!current())return;target.textContent=t('discovery.recent.failed');const retry=document.createElement('button');retry.className='btn';retry.type='button';retry.textContent=t('shell.error.retry');retry.onclick=()=>{target.textContent=t('discovery.recent.loading');load()};target.append(retry)}
 };
 load();disposeRecent=()=>{cancelled=true};
}

export function focusLearningSection(focus){
 const selector=focus==='task'?'#cppTask,#cppLab':focus==='lab'?'#memoryLab,#oopLab,#cppLab':null;
 const section=selector&&document.querySelector(selector);if(!section)return false;
 const hash=location.hash;
 section.tabIndex=-1;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!section.isConnected||location.hash!==hash)return;section.scrollIntoView({block:'start',behavior:'auto'});section.focus({preventScroll:true})}));return true;
}
