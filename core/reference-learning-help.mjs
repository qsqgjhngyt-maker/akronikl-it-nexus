import {termReferenceMarkup,bindGlossaryDrawer} from './nexus-learning-ui.js';
import {loadPrefs,savePrefs} from './storage.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s).normalize('NFKC').toLocaleLowerCase().replace(/ё/g,'е');
const jsonCache=new Map();
async function resource(file,folder='reference'){
 const key=folder+'/'+file;
 if(!jsonCache.has(key))jsonCache.set(key,fetch(new URL('../courses/'+key,import.meta.url),{credentials:'omit'}).then(r=>{
  if(!r.ok)throw Error('REFERENCE_UNAVAILABLE');return r.json();
 }).catch(error=>{jsonCache.delete(key);throw error}));
 return jsonCache.get(key);
}
const safeUrl=url=>{try{const u=new URL(url);return u.protocol==='https:'?u.href:''}catch{return ''}};
export function annotateReferenceTerms(scope,entries,{limit=18}={}){
 if(scope.dataset.referenceAnnotated==='true')return scope.querySelectorAll('[data-reference-term]').length;
 scope.dataset.referenceAnnotated='true';
 const english=scope.closest('[lang]')?.lang==='en';
 const doc=scope.ownerDocument,walker=doc.createTreeWalker(scope,4),texts=[],used=new Set([...scope.querySelectorAll('[data-reference-term]')].map(b=>b.dataset.referenceTerm));
 while(walker.nextNode())if(!walker.currentNode.parentElement.closest('a,button,h1,h2,h3,h4,pre,code,textarea,input,select,label,summary,dialog,script,style,[data-reference-static],[data-nexus-code-studio],[contenteditable]'))texts.push(walker.currentNode);
 for(const text of texts){if(used.size>=limit)break;let best;
  for(const entry of entries){if(used.has(entry.id))continue;for(const alias of [entry.term,...entry.aliases].flatMap(a=>english&&/^(for|while)$/i.test(a)?[a+' loop',a+' loops']:[a]).filter(s=>s.length>2)){
   const re=new RegExp('(^|[^\\p{L}\\p{N}_])('+alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')(?=$|[^\\p{L}\\p{N}_])','iu'),m=re.exec(text.data);
   if(m){const start=m.index+m[1].length;if(!best||start<best.start||start===best.start&&m[2].length>best.length)best={entry,start,length:m[2].length}}
  }}
  if(!best)continue;const b=doc.createElement('button');b.type='button';b.className='term-link reference-inline-term';b.dataset.referenceTerm=best.entry.id;
  const middle=text.splitText(best.start),tail=middle.splitText(best.length);b.textContent=middle.data;b.setAttribute('aria-label',(scope.closest('[lang]')?.lang==='en'?'Explain: ':'Объяснить: ')+b.textContent);middle.replaceWith(b);used.add(best.entry.id);
 }
 return used.size;
}
export async function mountReferenceHelp(root,{lesson,locale='ru',isCurrent=()=>true,c17=false,relatedTitles={}}){
 const en=locale==='en',say=(ru,eng)=>en?eng:ru,abort=new AbortController();let disposed=false,dialog=null,drawer=null,disposeDrawer=null,drawerTask=null,editorSelection=null;
 const active=()=>!disposed&&isCurrent(),scope=c17?root:root.querySelector('.r3-lesson'),course=c17?'c':lesson.courseId;
 const explicit=new Set((lesson.terms||[]).filter(t=>typeof t==='string'));
 const syntax=c17?lesson.teaching?.syntax:null;
 const index=c17?[...lesson.terms].map(t=>({...t,term:t.term??t.title,aliases:t.aliases??[]})):
  (await resource('index.'+locale+'.json')).filter(t=>t.context===course||course!=='cpp'&&(t.context==='onec-common'||explicit.has(t.id))).sort((a,b)=>Number(explicit.has(b.id))-Number(explicit.has(a.id)));
 if(syntax)index.sort((a,b)=>Number(b.id===syntax.termId)-Number(a.id===syntax.termId));
 if(!active())return()=>{};
 // Старые форматы различаются: объекты C++ уже несут определение, 1С — ID.
 const localObjects=(lesson.terms||[]).filter(t=>t&&typeof t==='object'&&typeof t.term==='string');
 const fallbacks=localObjects.filter(t=>!index.some(x=>norm(x.term)===norm(t.term)||x.aliases.some(a=>norm(a)===norm(t.term)))).map((t,i)=>({id:'lesson-term-'+i,term:t.term,aliases:t.aliases||[],context:course,definition:t.definition,local:true}));
 const entries=[...index,...fallbacks];
 for(const panel of scope.querySelectorAll(c17?'.c-main':'[data-r3-panel]'))annotateReferenceTerms(panel,entries);
 const toolbar=scope.querySelector('[data-reference-help]');
 const floating=document.createElement('div');floating.className='lesson-floating academy-reference-actions';
 floating.innerHTML='<button type="button" class="quick-action" data-reference-open data-open-terms aria-label="'+say('Справочник терминов','Terminology reference')+'">⌕ <span>'+say('Справочник терминов','Terminology reference')+'</span></button><button type="button" class="quick-action" data-reference-editor-help data-open-terms aria-label="'+say('Синтаксис','Syntax')+'">{ } <span>'+say('Синтаксис','Syntax')+'</span></button>';
 scope.append(floating);
 toolbar.innerHTML='<button type="button" class="btn" data-learning-tour>'+say('Как учиться здесь','How to learn here')+'</button>';
 for(const button of scope.querySelectorAll('[data-reference-term]')){const entry=entries.find(e=>e.id===button.dataset.referenceTerm);if(entry)button.dataset.term=entry.term;}
 function close(){dialog?.close()}
 async function ensureDrawer(){
  if(drawer)return drawer;
  drawerTask??=(c17?resource('reference.'+locale+'.json','c'):resource('cards.'+locale+'.json')).then(cards=>{
   if(!active())return null;
   const localSyntax=syntax?{id:syntax.termId,form:syntax.form,example:syntax.example,
    purpose:lesson.goal,breakdown:syntax.explanation,mistake:syntax.mistake}:null;
   const byId=new Map(cards.map(card=>[card.id,card]));
   const curatedByTerm=c17?new Map(cards.map(card=>[norm(card.term),card])):null;
   if(curatedByTerm)for(const entry of entries){
    const curated=curatedByTerm.get(norm(entry.term));
    if(curated)byId.set(entry.id,curated);
   }
   if(localSyntax)byId.set(localSyntax.id,{...byId.get(localSyntax.id),...localSyntax});
   const seen=new Set(entries.map(entry=>norm(entry.term)));
   const courseEntries=c17?cards.filter(card=>{
    const term=norm(card.term);
    if(seen.has(term))return false;
    seen.add(term);return true;
   }):[];
   const items=[...entries,...courseEntries].map(entry=>{
    const card=byId.get(entry.id);
    return {id:entry.id,term:entry.term,aliases:entry.aliases,definition:card?.simple||entry.definition||'',example:card?.form||''};
   });
   const holder=document.createElement('div');holder.innerHTML=termReferenceMarkup(items,{uiLocale:locale,contentLocale:locale});
   const d=holder.firstElementChild;d.classList.add('reference-dialog');d.querySelector('#termSearch').dataset.referenceSearch='';d.querySelector('#termList').dataset.referenceList='';
   for(const article of d.querySelectorAll('[data-term-card]')){
    article.dataset.referenceCard='';article.querySelector('code').dataset.referenceHeading='';const c=byId.get(article.dataset.termCardId);if(!c)continue;
    const detail=document.createElement('details');detail.className='reference-syntax';detail.dataset.referenceDetails='';detail.innerHTML='<summary>'+say('Синтаксис и примеры','Syntax and examples')+'</summary>';
    detail.addEventListener('toggle',()=>{if(!detail.open||detail.dataset.loaded)return;detail.dataset.loaded='true';
     const labels=en?['Definition','Why it is useful','Form','Example','Walkthrough','Expected observation','Common mistake']:['Точное определение','Зачем нужно','Форма записи','Пример','Разбор','Что наблюдать','Типичная ошибка'];
     const fields=['definition','purpose','form','example','breakdown','observation','mistake'];
     const body=fields.map((k,i)=>{
      const value=c[k];
      if(!value)return '';
      const content=k==='form'||k==='example'?'<pre><code>'+esc(value)+'</code></pre>':
        Array.isArray(value)?'<ul>'+value.map(line=>'<li>'+esc(line)+'</li>').join('')+'</ul>':'<p>'+esc(value)+'</p>';
      return '<section><h4>'+labels[i]+'</h4>'+content+'</section>';
     }).join('');
     const related=c.lessons?.length?'<p>'+say('Связанные уроки','Related lessons')+' '+c.lessons.map(id=>'<a href="#'+new URLSearchParams({course:id.startsWith('1c-enterprise.')?'1c-enterprise':id.startsWith('cpp.')?'cpp':id.startsWith('c.')?'c':'onec',lesson:id,locale,stage:'explanation'})+'">'+esc(relatedTitles[id]??id)+'</a>').join(' · ')+'</p>':'';
     const source=safeUrl(c.source?.url);
     detail.insertAdjacentHTML('beforeend',body+(c.category?'<p>'+esc(c.category)+' · '+(c.level==='later'?say('Позже','Later'):say('Нужно сейчас','Needed now'))+'</p>':'')+related+
      (source?'<p>'+say('Источник','Source')+': <a href="'+esc(source)+'" target="_blank" rel="noopener">'+esc(c.source.section)+'</a> · '+esc(c.checkedAt)+'</p>':''));
    },{signal:abort.signal});article.append(detail);
   }
   scope.append(d);drawer=d;disposeDrawer=bindGlossaryDrawer(scope,{onClose(){
    const ed=root.querySelector('#editor');
    if(ed&&editorSelection){
     ed.setSelectionRange(editorSelection.start,editorSelection.end,editorSelection.direction);
     ed.scrollTop=editorSelection.top;ed.scrollLeft=editorSelection.left;
    }
    editorSelection=null;
   }});
   return d;
  }).catch(error=>{drawerTask=null;throw error});
  return drawerTask;
 }
 root.addEventListener('click',async event=>{
  const b=event.target.closest('button[data-open-terms],button[data-term]');
  if(!b||!active())return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try{
   const d=await ensureDrawer();
   if(!d||!active()||!b.isConnected||d.open)return;
   if(dialog&&dialog!==d)close();dialog=d;
   const useSyntax=b.hasAttribute('data-reference-editor-help');
   if(c17)d.querySelector('#termDrawerTitle').textContent=useSyntax?
    say('Синтаксис C17','C17 syntax'):say('Справочник терминов','Terminology reference');
   const ed=root.querySelector('#editor');
   editorSelection=ed?{start:ed.selectionStart,end:ed.selectionEnd,direction:ed.selectionDirection,
    top:ed.scrollTop,left:ed.scrollLeft}:null;
   if(useSyntax){
    const selected=ed?.value.slice(ed.selectionStart,ed.selectionEnd).trim();
    const word=ed?.value.slice(0,ed.selectionStart).match(/[\p{L}\p{N}_:#<>]+$/u)?.[0];
    const query=norm(selected?.slice(0,100)||word||'');
    b.dataset.term=c17?'':entries.find(entry=>[entry.term,...entry.aliases].some(name=>norm(name)===query))?.term||'';
   }
   disposeDrawer.open(b);
   if(useSyntax){
    const detail=d.querySelector('[data-term-card]:not([hidden]) [data-reference-details]');
    if(detail)detail.open=true;
   }
  }catch{
   if(active())toolbar.insertAdjacentHTML('beforeend','<span role="status">'+say('Справочник недоступен. Повторите открытие.','Reference unavailable. Try opening it again.')+'</span>');
  }
 },{capture:true,signal:abort.signal});
 const onClick=event=>{const b=event.target.closest('button');if(b&&active()&&b.hasAttribute('data-learning-tour'))tour();};
 root.addEventListener('click',onClick,{signal:abort.signal});
 function tour(){if(!active())return;close();const opener=root.getRootNode().activeElement||document.activeElement,d=document.createElement('dialog');dialog=d;d.className='r3-dialog learning-tour';d.setAttribute('aria-label',say('Как учиться здесь','How to learn here'));let step=0;
  const onec=course==='onec'||course==='1c-enterprise';
  const practiceTip=onec?say('В «Практике» можно сохранить учебную заметку. Выполняйте задание в отдельной учебной базе 1С.',
   'Keep a training note in Practice. Perform the task in your separate 1C training infobase.'):
   say('Ваш код хранится в «Практике». Заготовку и эталон можно открыть и скопировать отдельно.',
    'Practice keeps your code. View and copy the starter and reference separately.');
  const steps=en?[['Course outline','Open a module or choose a lesson directly from its card.'],['Explanation','Read one small section. The contents list shows where you are; Its links stay within this lesson.'],['Terms and syntax','Tap an underlined word or open the terminology reference on the right. Escape closes help and returns focus.'],['Worked example','Predict the output, then compare with the shown result. This example is separate from your own work.'],['Your work',practiceTip],['Result and continuation','Saved, run and checked are different. Read the result beside the action. After editing, rerun. “Next lesson” names its destination; understanding needs your explanation.']]:[['Программа курса','Откройте модуль или выберите урок прямо из его плитки.'],['Объяснение','Читайте небольшими шагами. Содержание показывает место; Его ссылки ведут в пределах темы.'],['Термины и синтаксис','Нажмите выделенное слово или откройте справочник справа. Escape закроет справку и вернёт фокус.'],['Разобранный пример','Сначала предскажите вывод, затем сравните с показанным результатом. Этот пример отделён от вашей работы.'],['Своя работа',practiceTip],['Результат и продолжение','Сохранение, запуск и проверка различаются. Читайте результат рядом с действием. После правки нужен новый запуск. «Следующий урок» называет цель; понимание требует вашего объяснения.']];
  const remember=()=>{try{savePrefs({...loadPrefs(),referenceLearningTour:'20261112'})}catch{/* Закрытый account сохраняет свою границу. */}};
  const render=()=>{d.innerHTML=`<p>${step+1}/${steps.length}</p><h2>${esc(steps[step][0])}</h2><p>${esc(steps[step][1])}</p><button class="btn" data-tour-skip>${say('Пропустить','Skip')}</button><button class="btn primary" data-tour-next>${step===steps.length-1?say('Готово','Done'):say('Дальше','Next')}</button>`;d.querySelector('[data-tour-skip]').onclick=()=>d.close();d.querySelector('[data-tour-next]').onclick=()=>{if(++step===steps.length)d.close();else{render();d.querySelector('[data-tour-next]').focus()}}};
  d.onclose=()=>{remember();if(dialog===d)dialog=null;d.remove();if(active())opener?.focus({preventScroll:true})};scope.append(d);render();d.showModal();
 }
 try{if(loadPrefs().referenceLearningTour!=='20261112'){const invitation=document.createElement('p');invitation.dataset.tourInvitation='';invitation.textContent=say('Впервые здесь? Короткий тур: «Как учиться здесь».','New here? Open “How to learn here” for a short tour.');toolbar.parentElement.after(invitation)}}catch{}
 return()=>{disposed=true;abort.abort();disposeDrawer?.();close();dialog?.remove();drawer?.remove();floating.remove()};
}
