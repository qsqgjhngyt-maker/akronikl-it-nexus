import {referenceRouteFor,referenceBadge,referenceOverviewMarkup,referenceHref} from './reference-course-routes.mjs';
export const referenceCourseStyles=`
 .reference-badge{display:inline-block;padding:3px 8px;border:1px solid #9cb8d2;border-radius:6px;color:#e4eef9;background:#1b3046;font-size:.8rem;line-height:1.5}
 .r3-lesson .reference-help,.r3-lesson .reference-continuation{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;align-items:center}
 .r3-lesson .reference-continuation{padding:18px;border:1px solid #607d98;border-radius:12px;background:#122438}
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
 const active=()=>!disposed&&isCurrent(),route=referenceRouteFor(lesson.id),course=catalog.find(c=>c.id===lesson.courseId),all=course.topics;
 const idx=route?.topics.findIndex(t=>t[0]===lesson.id),ordinary=all.findIndex(t=>t.id===lesson.id);
 const nextId=route?(route.topics[idx+1]?.[0]||null):all[ordinary+1]?.id;
 const nextName=route?.topics[idx+1]?.[en?2:1]||all.find(t=>t.id===nextId)?.title[lesson.locale];
 if(route)scope.querySelector('.lesson-context').insertAdjacentHTML('afterend',referenceBadge(lesson.id,lesson.locale));
 const help=document.createElement('nav');help.className='reference-help';help.setAttribute('aria-label',say('Помощь и обзор','Help and overview'));help.innerHTML=`<span data-reference-help class="reference-help"></span><button type="button" class="btn" data-reference-overview-open>${say('Эталонные уроки — проверка','Reference lessons — review')}</button>`;
 scope.querySelector('.lesson-context').after(help);
 const toc=document.createElement('aside');toc.className='reference-toc';toc.setAttribute('aria-label',say('Содержание урока','Lesson contents'));
 const link=(id,text)=>{const a=document.createElement('a');a.href=url(lesson.id,'explanation',lesson.locale,id);a.textContent=text;return a};
 const title=document.createElement('strong');title.textContent=say('В этом уроке','In this lesson');toc.append(title);const nav=document.createElement('nav');toc.append(nav);
 lesson.sections.forEach((s,i)=>nav.append(link(s.id,(i+1)+'. '+s.title)));
 const layout=document.createElement('div');layout.className='reference-learning-layout';scope.querySelector('[data-r3-panel]').before(layout);layout.append(toc,...scope.querySelectorAll('[data-r3-panel]'));
 const nextSubsection=s=>{const node=root.querySelector('#'+CSS.escape(s.id));if(!node)return;const i=lesson.sections.indexOf(s),a=document.createElement('a');a.className='btn';a.dataset.referenceNextSubsection='';a.href=url(lesson.id,i===lesson.sections.length-1?'selfcheck':'explanation',lesson.locale,lesson.sections[i+1]?.id||'');a.textContent=i===lesson.sections.length-1?say('К самопроверке →','Go to self-check →'):say('Следующая подтема: ','Next subsection: ')+lesson.sections[i+1].title+' →';node.append(a)};
 lesson.sections.forEach(nextSubsection);
 for(const stage of ['explanation','selfcheck','practice']){const footer=document.createElement('nav');footer.className='reference-continuation';footer.setAttribute('aria-label',say('Продолжение обучения','Continue learning'));const a=document.createElement('a');
  if(stage!=='practice'){const nextStage=stage==='explanation'?'selfcheck':'practice';a.href=url(lesson.id,nextStage);a.textContent=stage==='explanation'?say('Дальше: Самопроверка →','Next: Self-check →'):say('Дальше: Практика →','Next: Practice →')}
  else if(nextId){a.href=url(nextId,'explanation');a.dataset.referenceNextLesson='';a.textContent=say('Следующий урок: ','Next lesson: ')+nextName+' →'}
  else{a.href=route?'#'+new URLSearchParams({course:lesson.courseId,lesson:lesson.id,stage:'practice',locale:lesson.locale}):'#course='+lesson.courseId;a.textContent=route?say('Начальный маршрут пройден: объясните решение и сохраните свою работу.','End of the starting route: explain your solution and keep your work.'):say('Вернуться в программу курса','Return to the course outline');if(route){a.removeAttribute('href');a.setAttribute('role','note')}}
  footer.append(a);if(route&&stage==='practice'){const note=document.createElement('p');note.textContent=say('Переход не выставляет «Освоено». Технический результат и ваше объяснение оцениваются отдельно.','Continuing does not mark mastery. Technical results and your explanation are assessed separately.');footer.append(note)}root.querySelector('[data-r3-panel="'+stage+'"]').append(footer)
 }
 function update(){if(!active())return;const stage=root.querySelector('[data-r3-panel]:not([hidden])')?.dataset.r3Panel;toc.hidden=stage!=='explanation';if(stage!=='explanation')return;
  const top=scope.querySelector('.lesson-context').getBoundingClientRect().bottom+24,sections=lesson.sections.map(s=>root.querySelector('#'+CSS.escape(s.id))).filter(Boolean);let chosen=sections[0];for(const s of sections)if(s.getBoundingClientRect().top<=top)chosen=s;if(chosen?.id!==currentSection){currentSection=chosen?.id;for(const a of nav.querySelectorAll('a')){if(new URLSearchParams(a.hash.slice(1)).get('at')===currentSection)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')}}
 }
 let frame=0;const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;update()})};addEventListener('scroll',schedule,{passive:true,signal:abort.signal});addEventListener('resize',schedule,{signal:abort.signal});observer=new MutationObserver(schedule);observer.observe(scope,{subtree:true,attributes:true,attributeFilter:['hidden']});
 root.addEventListener('click',event=>{if(!active())return;const button=event.target.closest('[data-reference-overview-open]');if(button){const d=document.createElement('dialog');d.className='r3-dialog';d.setAttribute('aria-label',say('Эталонные уроки — проверка','Reference lessons — review'));const close=document.createElement('button');close.type='button';close.className='btn';close.textContent=say('Закрыть','Close');close.onclick=()=>d.close();d.append(close);d.insertAdjacentHTML('beforeend',referenceOverviewMarkup(lesson.locale));scope.append(d);d.onclose=()=>{d.remove();if(active())button.focus({preventScroll:true})};d.querySelector('[data-reference-review-download]').onclick=()=>{const note=d.querySelector('textarea').value;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify({kind:'review-not-progress',lessonId:lesson.id,locale:lesson.locale,notes:note},null,2)],{type:'application/json'}));a.href=u;a.download='reference-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};d.showModal()}},{signal:abort.signal});schedule();
 return()=>{disposed=true;abort.abort();observer.disconnect();cancelAnimationFrame(frame);scope.querySelectorAll('dialog').forEach(d=>d.close())};
}
