import {accountLocalStorage} from './account-storage.js';
import {activePrincipalId,isCurrentProjectOwner} from './identity.js';
import {evaluateProjectAccess} from '../collaboration/access-control.js';
import {languageLabel} from '../sandbox/languages.js';
import {practicesPageMarkup,bindPractices} from './nexus-practices.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=(value,locale)=>typeof value==='string'?value:value?.[locale]||value?.ru||value?.en||'';
const focusValue=value=>['task','lab'].includes(value)?value:'';
const lessonLink=(id,focus='')=>`#course=cpp&lesson=${encodeURIComponent(id)}${focusValue(focus)?'&focus='+focus:''}`;

// Учебный порядок задают модули; физический массив сохраняет старые migration indices.
export function orderedCppLessons(course){
 const source=course?.curriculum?.lessons||[],byId=new Map(source.map(lesson=>[lesson.id,lesson]));
 const ids=course?.curriculum?.sections?.flatMap(section=>section.lessonIds||[])||[];
 return [...new Set([...ids,...source.map(lesson=>lesson.id)])].map(id=>byId.get(id)).filter(Boolean);
}

// A local navigation bookmark. This never writes course progress, workspaces or session credentials.
export function createLearningResume({storage=accountLocalStorage(),principal=activePrincipalId,now=()=>new Date().toISOString()}={}){
 const key=()=> 'akronikl:it-nexus:learning-resume:v1:'+encodeURIComponent(principal());
 const read=()=>{try{const value=JSON.parse(storage?.getItem(key())||'null');return value?.schemaVersion===1&&value.courses&&typeof value.courses==='object'?value.courses:{}}catch{return{}}};
 const remember=(course,lessonId,focus='')=>{
  if(course?.manifest?.id!=='cpp'||!course.curriculum?.lessons?.some(item=>item.id===lessonId))return false;
  try{const courses=read();courses.cpp={lessonId,focus:focusValue(focus),visitedAt:now()};storage?.setItem(key(),JSON.stringify({schemaVersion:1,courses}));return true}catch{return false}
 };
 const continuation=(course,state={})=>{
  const lessons=orderedCppLessons(course),saved=read().cpp;
  const last=lessons.find(item=>item.id===saved?.lessonId);
  const next=lessons.find(item=>!state[item.id]?.completed);
  const lesson=last||next||lessons[0];
  if(!lesson)return null;
  const mode=last?'resume':next?(Object.values(state).some(x=>x?.completed)?'next':'start'):'review';
  return{lesson,mode,focus:last?focusValue(saved.focus):'',href:lessonLink(lesson.id,last?saved.focus:''),visitedAt:last?saved.visitedAt:null};
 };
 return{remember,continuation,key};
}

export function continuationNote(resume,t,locale){
 if(!resume)return'';
 return `<p class="learning-resume-note" data-learning-resume-note><span>${escape(t('discovery.resume.'+resume.mode))}</span><strong>${escape(title(resume.lesson.title,locale))}</strong>${resume.focus?`<small>${escape(t('discovery.kind.'+resume.focus))}</small>`:''}</p>`;
}
export function continuationCard(resume,t,locale){
 if(!resume)return'';
 return `<section class="discovery-resume glass-panel" aria-label="${escape(t('codeHub.continue'))}"><div><span class="eyebrow">C++ · ${escape(t('codeHub.reference'))}</span>${continuationNote(resume,t,locale)}</div><a class="btn primary" data-learning-continue href="${escape(resume.href)}">${escape(t('discovery.action.'+resume.mode))}<span aria-hidden="true">→</span></a></section>`;
}

export function recentProjectsMarkup(t){
 return `<section class="section discovery-recent" data-recent-projects aria-labelledby="recentProjectsTitle"><div class="section-head"><div><span class="eyebrow">PROJECT STUDIO</span><h2 id="recentProjectsTitle">${escape(t('discovery.recent.title'))}</h2><p>${escape(t('discovery.recent.intro'))}</p></div><a class="learning-open-link" href="#view=projects">${escape(t('discovery.recent.all'))} →</a></div><div data-recent-list role="status">${escape(t('discovery.recent.loading'))}</div></section>`;
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
   const visible=projects.filter(project=>evaluateProjectAccess(project.access,{subjectId:principal,action:'view'}).allowed&&(project.origin?.kind!=='graphics-lab'||isCurrentProjectOwner(project.access))).slice(0,3);
   target.removeAttribute('role');
   target.innerHTML=recentProjectListMarkup(visible,t,locale);
  }catch{if(!current())return;target.textContent=t('discovery.recent.failed');const retry=document.createElement('button');retry.className='btn';retry.type='button';retry.textContent=t('shell.error.retry');retry.onclick=()=>{target.textContent=t('discovery.recent.loading');load()};target.append(retry)}
 };
 load();disposeRecent=()=>{cancelled=true};
}

export function discoveryPageMarkup({kind,course,contentFor,state={},projects=[],t,locale='ru',materialLocale='ru'}={}){
 if(kind==='practices')return practicesPageMarkup({course,contentFor,state,projects,t,locale,materialLocale});
 const isLabs=kind==='labs',lessons=course.curriculum.lessons,practicums=course.practicumsRu.practicums;
 const items=[];
 for(const lesson of lessons){
  const content=contentFor(lesson.id),lab=content?.benchmark?.lab;
  const section=course.curriculum.sections.find(s=>s.lessonIds.includes(lesson.id));
  if(isLabs&&lab)items.push({id:lesson.id,kind:'lab',title:lab.title,text:lab.goal,href:lessonLink(lesson.id,'lab'),section:title(section?.title,materialLocale),steps:lab.steps?.length,proof:lab.proof});
  else if(!isLabs&&content?.task)items.push({id:lesson.id,kind:'task',title:title(lesson.title,materialLocale),text:content.task,href:lessonLink(lesson.id,'task'),section:title(section?.title,materialLocale),completed:state.lessons?.[lesson.id]?.completed});
 }
 if(isLabs)items.unshift({id:'computer-graphics',kind:'graphics',title:t('discovery.graphics.title'),text:t('discovery.graphics.text'),href:'#view=computer-graphics',section:t('discovery.graphics.direction')});
 else for(const p of practicums){const done=new Set((state.practicums?.[p.id]?.tasks||[]).filter(x=>Number.isInteger(x)&&x>=0&&x<p.tasks.length)).size;items.push({id:p.id,kind:'practicum',title:p.title,text:p.goal,href:'#course=cpp&practicum='+encodeURIComponent(p.id),section:p.after,done,total:p.tasks.length})}
 const types=isLabs?['all','lab','graphics']:['all','task','practicum'];
 const counts=types.map(type=>[type,type==='all'?items.length:items.filter(x=>x.kind===type).length]);
 const card=item=>`<article class="discovery-material-card glass-panel" data-discovery-item="${escape(item.id)}" data-discovery-kind="${item.kind}" data-discovery-search="${escape(item.title+' '+item.text+' '+item.section)}"><div class="learning-card-kicker"><span>${escape(item.kind==='graphics'?'3D · JAVASCRIPT':'C++')}</span><span>${escape(t('discovery.kind.'+item.kind))}</span></div><h2>${escape(item.title)}</h2><p>${escape(item.text)}</p><small>${escape(item.section)}</small>${item.steps?`<small>${escape(t('learningPath.stepsCount',{count:item.steps}))}</small>`:''}${item.total?`<div class="discovery-card-progress"><span>${escape(t('learningUi.tasksDone',{done:item.done,total:item.total}))}</span><div class="progress" role="progressbar" aria-label="${escape(t('learningUi.checklistProgress'))}" aria-valuemin="0" aria-valuemax="${item.total}" aria-valuenow="${item.done}"><i style="width:${item.done/item.total*100}%"></i></div></div>`:item.completed?`<small class="discovery-topic-complete">${escape(t('discovery.topicComplete'))}</small>`:''}${item.proof?`<details><summary>${escape(t('learningPath.proof'))}</summary><p>${escape(item.proof)}</p></details>`:''}<a class="btn" href="${escape(item.href)}">${escape(t('discovery.open.'+item.kind))}<span aria-hidden="true">↗</span></a></article>`;
 return `<div class="nexus-learning discovery-page" data-nexus-learning data-learning-discovery="${kind}"><header class="discovery-head glass-panel"><span class="eyebrow">LIVING ACADEMY · ${isLabs?'LABS':'PRACTICE'}</span><h1>${escape(t('discovery.'+kind+'.title'))}</h1><p>${escape(t('discovery.'+kind+'.intro'))}</p><div class="discovery-facts">${counts.slice(1).map(([type,count])=>`<span><strong>${count}</strong>${escape(t('discovery.count.'+type))}</span>`).join('')}</div></header><section aria-label="${escape(t('discovery.catalog'))}"><div class="discovery-toolbar"><div class="discovery-type-filters" role="group" aria-label="${escape(t('learningPath.contentType'))}">${counts.map(([type,count])=>`<button type="button" class="btn" data-discovery-filter="${type}" aria-pressed="${type==='all'}">${escape(t('discovery.filter.'+type))}<span>${count}</span></button>`).join('')}</div><label class="learning-search"><input type="search" data-discovery-query autocomplete="off" aria-label="${escape(t('discovery.search'))}" placeholder="${escape(t('discovery.search'))}"><button type="button" data-discovery-clear hidden aria-label="${escape(t('learningUi.clear'))}">×</button></label></div><p class="discovery-results" data-discovery-results role="status" aria-live="polite"></p>${locale==='en'?`<p class="learning-content-note">${escape(t('discovery.materialNote'))}</p>`:''}<div class="discovery-material-grid">${items.map(card).join('')}</div><div class="discovery-empty glass-panel" data-discovery-empty hidden><h2>${escape(t('learningUi.empty'))}</h2><button class="btn" type="button" data-discovery-reset>${escape(t('discovery.reset'))}</button></div></section></div>`;
}

export function bindLearningDiscovery(t){
 if(document.querySelector('.practices-hub')){bindPractices(t);return}
 const root=document.querySelector('[data-learning-discovery]');if(!root)return;
 const normalize=value=>value.normalize('NFKC').toLocaleLowerCase(document.documentElement.lang).trim();
 const cards=[...root.querySelectorAll('[data-discovery-item]')],input=root.querySelector('[data-discovery-query]'),clear=root.querySelector('[data-discovery-clear]');let filter='all';
 const apply=()=>{const q=normalize(input.value);let count=0;for(const card of cards){card.hidden=!(filter==='all'||card.dataset.discoveryKind===filter)||!normalize(card.dataset.discoverySearch).includes(q);if(!card.hidden)count++}root.querySelector('[data-discovery-results]').textContent=t('learningUi.results',{count,total:cards.length});root.querySelector('[data-discovery-empty]').hidden=count!==0;clear.hidden=!input.value;root.querySelectorAll('[data-discovery-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.discoveryFilter===filter)))};
 root.querySelectorAll('[data-discovery-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.discoveryFilter;apply()}));input.addEventListener('input',apply);clear.addEventListener('click',()=>{input.value='';apply();input.focus()});root.querySelector('[data-discovery-reset]').addEventListener('click',()=>{filter='all';input.value='';apply();input.focus()});apply();
}

export function focusLearningSection(focus){
 const selector=focus==='task'?'#cppTask':focus==='lab'?'#memoryLab,#oopLab,#cppLab':null;
 const section=selector&&document.querySelector(selector);if(!section)return false;
 section.tabIndex=-1;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!section.isConnected)return;section.scrollIntoView({block:'start',behavior:'auto'});section.focus({preventScroll:true})}));return true;
}
