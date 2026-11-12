import {lessonNavigationPlan,referenceBadge,referenceOverviewMarkup,referenceHref} from './reference-course-routes.mjs';
export const referenceCourseStyles=`
 .r3-lesson[data-r3-topic]{background:#0b1929;overflow-wrap:anywhere}
 @media(max-width:720px){.r3-lesson nav.reference-help{display:grid;grid-template-columns:1fr 1fr;gap:6px}.r3-lesson nav.reference-help [data-reference-help]{display:contents}.r3-lesson nav.reference-help button{font-size:.8rem;line-height:1.4;min-height:44px;white-space:normal;padding:8px}.r3-lesson nav.reference-help .reference-badge{grid-column:1/-1;justify-self:start}.r3-lesson [data-tour-invitation]{font-size:.75rem}}
 .reference-badge{display:inline-block;padding:3px 8px;border:1px solid #9cb8d2;border-radius:6px;color:#e4eef9;background:#1b3046;font-size:.8rem;line-height:1.5}
 .r3-lesson .reference-help,.r3-lesson .reference-continuation{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;align-items:center}
 .r3-lesson .reference-continuation{padding:16px 0;border-top:1px solid #607d98;background:#0b1929}
 .r3-lesson .reference-lesson-neighbours{display:flex;gap:8px;align-items:stretch;margin:8px 0;flex-wrap:wrap;font-size:.85rem;line-height:1.5}
 .r3-lesson .reference-lesson-neighbours a,.r3-lesson .reference-lesson-neighbours button{display:flex;align-items:center;gap:6px;padding:9px 12px;min-height:44px;box-sizing:border-box;white-space:normal;overflow-wrap:anywhere;text-align:left;max-width:100%;flex:1 1 200px}
 .r3-lesson .reference-lesson-neighbours a:first-child{flex:0 1 auto}
 .r3-lesson .reference-continuation .primary{background:#a5e7de;color:#102b35;font-weight:700;min-height:44px;white-space:normal}
 .r3-lesson .reference-continuation p{font-size:.85rem;line-height:1.5;margin:0}
 .r3-lesson .reference-continuation>a{padding:10px;border:1px solid #6888a6;border-radius:8px;overflow-wrap:anywhere}
 .r3-lesson .reference-dialog{width:min(1000px,94vw);box-sizing:border-box}
 .r3-lesson .reference-dialog input,.reference-overview textarea{width:100%;box-sizing:border-box;padding:10px;background:#071522;color:#edf5ff;border:1px solid #8da7c1;border-radius:6px;font:inherit}
 .reference-dialog-grid{display:grid;grid-template-columns:minmax(160px,.65fr) minmax(0,2fr);gap:22px}
 .reference-dialog-grid nav{display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow:auto}
 .reference-dialog-grid nav button{text-align:left;white-space:normal;flex-shrink:0}
 .reference-dialog-grid article{min-width:0;overflow-wrap:anywhere}
 .r3-lesson .reference-dialog pre{white-space:pre-wrap;overflow-wrap:anywhere}
 .r3-lesson .reference-inline-term{font:inherit;color:#a8eee2;border:0;border-bottom:1px dotted #a8eee2;padding:0;background:transparent;cursor:pointer;display:inline;text-align:inherit}
 .reference-overview{padding:18px;border:1px solid #607d98;border-radius:12px;background:#0b1929;color:#e7f0fc;margin:16px 0;overflow-wrap:anywhere}
 .reference-overview li{padding:8px 0}.reference-overview a{color:#a8eee2}.reference-overview small{overflow-wrap:anywhere}
 .r3-lesson .reference-toc{display:none}
 .r3-lesson .reference-assessment{padding:16px;border:2px solid #708eaa;border-radius:10px;margin:12px 0;background:#102438}
 .r3-lesson .reference-assessment p{white-space:pre-wrap}.r3-lesson .reference-assessment dd{margin:0;overflow-wrap:anywhere;white-space:pre-wrap}
 .r3-lesson .reference-assessment dl>div{padding:10px;border-top:1px solid #4c6680}
 .r3-lesson .reference-assessment[data-state=passed]{border-color:#9be4cb}.r3-lesson .reference-assessment[data-state=failed]{border-color:#f5b4b9}
 .r3-lesson .reference-help button{min-height:40px}
 .r3-lesson .reference-help{margin:6px 0}.r3-lesson [data-reference-help]{margin:0}
 .r3-lesson [data-tour-invitation]{font-size:.8rem;margin:4px 0;line-height:1.5}
 .r3-lesson :is(.example-layout,.question) pre:not(.editor-highlight){white-space:pre-wrap;overflow-wrap:anywhere}
 .r3-lesson .reference-toc a[aria-current=location]{border-left:4px solid #a8eee2;background:#263f57;color:#fff}
 @media(min-width:1200px){
  .r3-lesson[data-r3-topic]{max-width:1600px}
  .r3-lesson .reference-learning-layout{display:grid;grid-template-columns:minmax(180px,230px) minmax(0,1fr);column-gap:24px;align-items:start}
  .r3-lesson .reference-learning-layout:has([data-r3-panel=explanation][hidden]){display:block}
  .r3-lesson .reference-toc{display:block;grid-column:1;grid-row:auto;position:sticky;top:calc(var(--r3-shell-top,0px) + var(--r3-context-height,80px) + 12px);max-height:calc(100vh - var(--r3-shell-top,0px) - var(--r3-context-height,80px) - 24px);overflow:auto;padding:12px;background:#0b1929;border:1px solid #607d98;border-radius:10px;font-size:.9rem;line-height:1.5}
  .r3-lesson .reference-toc nav{display:grid;gap:8px}.r3-lesson .reference-toc a{padding:7px;overflow-wrap:anywhere;color:#c5d9ef}
  .r3-lesson .stage-body{grid-column:2;grid-row:1;min-width:0}
  .r3-lesson .reference-toc{grid-row:1}
  .r3-lesson .lesson-map-wrap{display:none}
 }
 @media(max-width:720px){.reference-dialog-grid{grid-template-columns:minmax(0,1fr)}.reference-dialog-grid nav{max-height:24vh}.r3-lesson .reference-dialog{padding:16px}.r3-lesson .reference-continuation{display:grid}.r3-lesson .reference-assessment{padding:10px}}
`;
export function mountReferenceNavigation(root,{lesson,catalog,url,isCurrent}){
 const scope=root.querySelector('.r3-lesson'),en=lesson.locale==='en',say=(r,e)=>en?e:r,abort=new AbortController();let disposed=false,observer=null,currentSection=null;
 const active=()=>!disposed&&isCurrent(),referenceMode=new URLSearchParams(location.hash.slice(1)).get('learningRoute')==='reference-start';
 const plan=lessonNavigationPlan(lesson.id,catalog,{referenceMode,locale:lesson.locale}),{route,index:idx}=plan;
 const neighbours=document.createElement('nav');neighbours.className='reference-lesson-neighbours';neighbours.setAttribute('aria-label',say('Между уроками','Between lessons'));
 function lessonLink(target,previous=false){const a=document.createElement('a');a.className='btn';a.href=url(target.id,'explanation');a.dataset[previous?'referencePreviousLesson':'referenceNextLesson']='';a.textContent=previous?say('← Предыдущий урок: ','← Previous lesson: ')+target.title:say('Следующий урок: ','Next lesson: ')+target.title+' →';return a;}
 function overviewButton(){const b=document.createElement('button');b.type='button';b.className='btn';b.dataset.referenceOverviewOpen='';b.dataset.referenceRouteEnd='';b.textContent=say('Конец маршрута · Вернуться к обзору →','End of route · Return to overview →');return b;}
 if(plan.previous)neighbours.append(lessonLink(plan.previous,true));
 if(plan.next)neighbours.append(lessonLink(plan.next));else if(route)neighbours.append(overviewButton());else{const a=document.createElement('a');a.className='btn';a.href='#course='+lesson.courseId;a.textContent=say('Конец курса · Открыть программу →','End of course · Open outline →');neighbours.append(a);}
 scope.querySelector('.lesson-context').after(neighbours);
 // Удаляем прежние дублирующие переходы из скрытого меню, не меняя программу курса.
 scope.querySelectorAll('.course-controls a[href*="lesson="]').forEach(a=>a.remove());
 const help=document.createElement('nav');help.className='reference-help';help.setAttribute('aria-label',say('Помощь и обзор','Help and overview'));help.innerHTML=`<span data-reference-help class="reference-help"></span><button type="button" class="btn" data-reference-overview-open>${say('Эталонные уроки — проверка','Reference lessons — review')}</button>`;
 neighbours.after(help);
 help.insertAdjacentHTML('beforeend',referenceBadge(lesson.id,lesson.locale));
 if(route)help.insertAdjacentHTML('beforeend',`<span>${say('Старт с нуля','Start from zero')} · ${idx+1}/${route.topics.length}</span>`);
 const toc=document.createElement('aside');toc.className='reference-toc';toc.setAttribute('aria-label',say('Содержание урока','Lesson contents'));
 const link=(id,text)=>{const a=document.createElement('a');a.href=url(lesson.id,'explanation',lesson.locale,id);a.textContent=text;return a};
 const title=document.createElement('strong');title.textContent=say('В этом уроке','In this lesson');toc.append(title);const nav=document.createElement('nav');toc.append(nav);
 lesson.sections.forEach((s,i)=>nav.append(link(s.id,(i+1)+'. '+s.title)));
 const layout=document.createElement('div');layout.className='reference-learning-layout';scope.querySelector('[data-r3-panel]').before(layout);layout.append(toc,...scope.querySelectorAll('[data-r3-panel]'));
 const nextSubsection=(s,i)=>{const node=root.querySelector('#'+CSS.escape(s.id));if(!node||i===lesson.sections.length-1)return;const a=document.createElement('a');a.className='btn';a.dataset.referenceNextSubsection='';a.href=url(lesson.id,'explanation',lesson.locale,lesson.sections[i+1].id);a.textContent=say('Следующая подтема: ','Next subsection: ')+lesson.sections[i+1].title+' →';node.append(a)};
 lesson.sections.forEach(nextSubsection);
 for(const stage of ['explanation','selfcheck','practice']){
  const panel=root.querySelector('[data-r3-panel="'+stage+'"]');
  // Прежний вывод renderer содержал ещё одну кнопку того же продолжения.
  for(const child of [...panel.children]){if(child.matches('a[href]')&&['selfcheck','practice'].includes(new URLSearchParams(child.hash.slice(1)).get('stage'))||child.matches('.next-card'))child.remove();}
  const footer=document.createElement('nav');footer.className='reference-continuation';footer.dataset.referenceContinuation=stage;footer.setAttribute('aria-label',say('Продолжение обучения','Continue learning'));let action;
  if(stage!=='practice'){action=document.createElement('a');action.href=url(lesson.id,stage==='explanation'?'selfcheck':'practice');action.textContent=stage==='explanation'?say('Дальше: самопроверка →','Next: self-check →'):say('Перейти к практике →','Go to practice →');}
  else if(plan.next)action=lessonLink(plan.next);
  else if(route)action=overviewButton();
  else{action=document.createElement('a');action.href='#course='+lesson.courseId;action.textContent=say('Конец курса · Вернуться к программе →','End of course · Return to outline →');}
  action.className='btn primary';action.dataset.referenceContinue='';footer.append(action);
  if(stage==='practice'){const note=document.createElement('p');note.textContent=say('Переход не выставляет «Освоено». Сохраните и объясните свою работу.','Continuing does not mark mastery. Keep and explain your own work.');footer.append(note);}panel.append(footer);
 }
 function update(){if(!active())return;const stage=root.querySelector('[data-r3-panel]:not([hidden])')?.dataset.r3Panel;toc.hidden=stage!=='explanation';if(stage!=='explanation')return;
  const top=scope.querySelector('.lesson-context').getBoundingClientRect().bottom+24,sections=lesson.sections.map(s=>root.querySelector('#'+CSS.escape(s.id))).filter(Boolean);let chosen=sections[0];for(const s of sections)if(s.getBoundingClientRect().top<=top)chosen=s;if(chosen?.id!==currentSection){currentSection=chosen?.id;for(const a of nav.querySelectorAll('a')){if(new URLSearchParams(a.hash.slice(1)).get('at')===currentSection)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')}}
 }
 let frame=0;const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;update()})};addEventListener('scroll',schedule,{passive:true,signal:abort.signal});addEventListener('resize',schedule,{signal:abort.signal});observer=new MutationObserver(schedule);observer.observe(scope,{subtree:true,attributes:true,attributeFilter:['hidden']});
 root.addEventListener('click',event=>{if(!active())return;const button=event.target.closest('[data-reference-overview-open]');if(button){const d=document.createElement('dialog');d.className='r3-dialog';d.setAttribute('aria-label',say('Эталонные уроки — проверка','Reference lessons — review'));const close=document.createElement('button');close.type='button';close.className='btn';close.textContent=say('Закрыть','Close');close.onclick=()=>d.close();d.append(close);d.insertAdjacentHTML('beforeend',referenceOverviewMarkup(lesson.locale));scope.append(d);d.onclose=()=>{d.remove();if(active())button.focus({preventScroll:true})};d.querySelector('[data-reference-review-download]').onclick=()=>{const note=d.querySelector('textarea').value;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify({kind:'review-not-progress',lessonId:lesson.id,locale:lesson.locale,notes:note},null,2)],{type:'application/json'}));a.href=u;a.download='reference-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};d.showModal()}},{signal:abort.signal});schedule();
 return()=>{disposed=true;abort.abort();observer.disconnect();cancelAnimationFrame(frame);scope.querySelectorAll('dialog').forEach(d=>d.close())};
}
