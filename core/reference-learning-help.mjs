import {loadPrefs,savePrefs} from './storage.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s).normalize('NFKC').toLocaleLowerCase().replace(/ё/g,'е');
const jsonCache=new Map();
async function resource(file){if(!jsonCache.has(file))jsonCache.set(file,fetch(new URL('../courses/reference/'+file,import.meta.url),{credentials:'omit'}).then(r=>{if(!r.ok)throw Error('REFERENCE_UNAVAILABLE');return r.json()}).catch(e=>{jsonCache.delete(file);throw e}));return jsonCache.get(file)}
const safeUrl=url=>{try{const u=new URL(url);return u.protocol==='https:'?u.href:''}catch{return ''}};
export function annotateReferenceTerms(scope,entries,{limit=18}={}){
 if(scope.dataset.referenceAnnotated==='true')return scope.querySelectorAll('[data-reference-term]').length;
 scope.dataset.referenceAnnotated='true';
 const english=scope.closest('[lang]')?.lang==='en';
 const doc=scope.ownerDocument,walker=doc.createTreeWalker(scope,4),texts=[],used=new Set([...scope.querySelectorAll('[data-reference-term]')].map(b=>b.dataset.referenceTerm));
 while(walker.nextNode())if(!walker.currentNode.parentElement.closest('a,button,h1,h2,h3,h4,pre,code,textarea,input,select,label,summary,dialog,script,style,[data-nexus-code-studio],[contenteditable]'))texts.push(walker.currentNode);
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
export async function mountReferenceHelp(root,{lesson,locale='ru',isCurrent=()=>true}){
 const en=locale==='en',say=(ru,eng)=>en?eng:ru,abort=new AbortController();let disposed=false,dialog=null,loadTicket=0;
 const active=()=>!disposed&&isCurrent(),scope=root.querySelector('.r3-lesson'),course=lesson.courseId;
 const explicit=new Set((lesson.terms||[]).filter(t=>typeof t==='string'));
 const index=(await resource('index.'+locale+'.json')).filter(t=>t.context===course||course!=='cpp'&&(t.context==='onec-common'||explicit.has(t.id))).sort((a,b)=>Number(explicit.has(b.id))-Number(explicit.has(a.id)));
 if(!active())return()=>{};
 // Старые форматы различаются: объекты C++ уже несут определение, 1С — ID.
 const localObjects=(lesson.terms||[]).filter(t=>t&&typeof t==='object'&&typeof t.term==='string');
 const fallbacks=localObjects.filter(t=>!index.some(x=>norm(x.term)===norm(t.term)||x.aliases.some(a=>norm(a)===norm(t.term)))).map((t,i)=>({id:'lesson-term-'+i,term:t.term,aliases:t.aliases||[],context:course,definition:t.definition,local:true}));
 const entries=[...index,...fallbacks];
 for(const panel of scope.querySelectorAll('[data-r3-panel]'))annotateReferenceTerms(panel,entries);
 const toolbar=scope.querySelector('[data-reference-help]');
 toolbar.innerHTML=`<button type="button" class="btn" data-reference-open>${say('Термины и синтаксис','Terms and syntax')}</button><button type="button" class="btn" data-reference-editor-help>${say('Помощь по коду','Code help')}</button><button type="button" class="btn" data-learning-tour>${say('Как учиться здесь','How to learn here')}</button>`;
 function close(){dialog?.close()}
 async function open(termId='',query=''){
  if(!active())return;
  close();const opener=root.getRootNode().activeElement||document.activeElement,ed=root.querySelector('#editor'),selection=ed?{start:ed.selectionStart,end:ed.selectionEnd,direction:ed.selectionDirection,top:ed.scrollTop,left:ed.scrollLeft}:null;
  const d=document.createElement('dialog');dialog=d;d.className='r3-dialog reference-dialog';d.setAttribute('aria-label',say('Термины и синтаксис','Terms and syntax'));
  d.innerHTML='<header><h2>'+say('Термины и синтаксис','Terms and syntax')+'</h2><button type="button" class="btn" data-reference-close>'+say('Закрыть','Close')+'</button></header><div class="reference-drawer-search"><label>'+say('Найти термин или синтаксис','Find a term or syntax')+'<input type="search" data-reference-search autocomplete="off"></label><p role="status" data-reference-count></p></div><div class="reference-drawer-body"><button type="button" class="btn" data-reference-back hidden>'+say('← Все термины','← All terms')+'</button><nav aria-label="'+say('Найденные карточки','Matching cards')+'" data-reference-list></nav><article data-reference-card aria-live="polite" hidden></article></div>';
  scope.append(d);d.querySelector('[data-reference-close]').onclick=()=>d.close();
  d.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();d.close()}},{capture:true});
  d.onclose=()=>{if(dialog===d){dialog=null;loadTicket++}d.remove();if(!active()||dialog)return;opener?.focus({preventScroll:true});if(ed?.isConnected&&selection){ed.setSelectionRange(selection.start,selection.end,selection.direction);ed.scrollTop=selection.top;ed.scrollLeft=selection.left}};
  const search=d.querySelector('[data-reference-search]'),nav=d.querySelector('[data-reference-list]'),card=d.querySelector('[data-reference-card]'),back=d.querySelector('[data-reference-back]'),body=d.querySelector('.reference-drawer-body');let selected='',listScroll=0;
  search.value=query;
  function listView(focus=false){loadTicket++;nav.hidden=false;card.hidden=true;back.hidden=true;body.scrollTop=listScroll;if(focus)[...nav.querySelectorAll('button')].find(b=>b.dataset.referenceEntry===selected)?.focus({preventScroll:true})}
  back.onclick=()=>listView(true);
  function filter(){const q=norm(search.value).trim(),tokens=q.split(/\s+/).filter(Boolean);const matches=entries.filter(e=>tokens.every(t=>norm([e.term,...e.aliases].join(' ')).includes(t)));
   listScroll=0;listView();d.querySelector('[data-reference-count]').textContent=say('Найдено: ','Found: ')+matches.length;
   nav.replaceChildren();for(const entry of matches){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=entry.term;b.dataset.referenceEntry=entry.id;b.onclick=()=>void show(entry);nav.append(b)}
  }
  async function show(entry){listScroll=body.scrollTop;selected=entry.id;const ticket=++loadTicket;nav.hidden=true;back.hidden=false;card.hidden=false;card.textContent=say('Открываем карточку…','Opening card…');body.scrollTop=0;
   try{const cards=entry.local?null:await resource('cards.'+locale+'.json');if(!active()||dialog!==d||!d.open||ticket!==loadTicket)return;const c=entry.local?null:cards.find(x=>x.id===entry.id);
    if(!c){card.innerHTML='<h3 tabindex="-1">'+esc(entry.term)+'</h3><p>'+esc(entry.definition)+'</p>';card.querySelector('h3').focus({preventScroll:true});return}
    const section=(label,value,code=false)=>'<section><h4>'+label+'</h4>'+(code?'<pre><code>'+esc(value)+'</code></pre>':'<p>'+esc(value)+'</p>')+'</section>';
    card.innerHTML='<h3 tabindex="-1">'+esc(c.term)+'</h3><p>'+esc(c.simple)+'</p>'+section(say('Форма записи','Form'),c.form,true)+section(say('Пример','Example'),c.example,true)+section(say('Что наблюдать','Expected observation'),c.observation)+'<details><summary>'+say('Подробнее и источники','More detail and sources')+'</summary><p>'+esc(c.category)+' · '+(c.level==='later'?say('Позже','Later'):say('Нужно сейчас','Needed now'))+'</p>'+section(say('Точное определение','Definition'),c.definition)+section(say('Зачем нужно','Why it is useful'),c.purpose)+section(say('Разбор','Walkthrough'),c.breakdown)+section(say('Типичная ошибка','Common mistake'),c.mistake)+'<p>'+say('Связанные уроки','Related lessons')+': '+c.lessons.map(id=>'<a href="#'+new URLSearchParams({course:id.startsWith('1c-enterprise.')?'1c-enterprise':id.startsWith('cpp.')?'cpp':'onec',lesson:id,locale,stage:'explanation'})+'">'+esc(id)+'</a>').join(' · ')+'</p><p>'+say('Источник','Source')+': <a href="'+esc(safeUrl(c.source.url))+'" target="_blank" rel="noopener">'+esc(c.source.section)+'</a> · '+esc(c.checkedAt)+'</p></details>';
    card.querySelector('h3').focus({preventScroll:true});
   }catch{if(active()&&dialog===d&&d.open&&ticket===loadTicket)card.textContent=say('Справка сейчас недоступна. Вернитесь к списку и попробуйте ещё раз.','Reference unavailable. Return to the list and try again.')}
  }
  search.oninput=filter;filter();d.showModal();if(termId){const e=entries.find(e=>e.id===termId);if(e)await show(e)}else if(matchMedia('(min-width:721px)').matches)search.focus();
 }
 const onClick=e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-reference-open'))void open();if(b.dataset.referenceTerm)void open(b.dataset.referenceTerm);
  if(b.hasAttribute('data-reference-editor-help')){const ed=root.querySelector('#editor');const selection=ed?.value.slice(ed.selectionStart,ed.selectionEnd).trim(),word=ed?.value.slice(0,ed.selectionStart).match(/[\p{L}\p{N}_:#<>]+$/u)?.[0];void open('',selection?.slice(0,100)||word||'')}
  if(b.hasAttribute('data-learning-tour'))tour();
 };
 root.addEventListener('click',onClick,{signal:abort.signal});
 function tour(){if(!active())return;close();const opener=root.getRootNode().activeElement||document.activeElement,d=document.createElement('dialog');dialog=d;d.className='r3-dialog learning-tour';d.setAttribute('aria-label',say('Как учиться здесь','How to learn here'));let step=0;
  const steps=en?[['Course outline','Choose a topic. The badge identifies reference lessons under review; it does not mark completion.'],['Explanation','Read one small section. The contents list shows where you are; “Next subsection” stays within this lesson.'],['Terms and syntax','Tap an underlined word or open “Terms and syntax”. Escape closes help and returns focus.'],['Worked example','Predict the output, then compare with the shown result. This example is separate from your own work.'],['Your work','Practice keeps your code. Open a starter or reference only to look or copy; opening it never replaces your editor. 1C runs in its separate training application.'],['Result and continuation','Saved, run and checked are different. Read the result beside the action. After editing, rerun. “Next lesson” names its destination; understanding needs your explanation.']]:[['Программа курса','Выберите тему. Значок отмечает эталоны на проверке; он не означает прохождение.'],['Объяснение','Читайте небольшими шагами. Содержание показывает место; «Следующая подтема» остаётся внутри урока.'],['Термины и синтаксис','Нажмите выделенное слово или кнопку «Термины и синтаксис». Escape закроет справку и вернёт фокус.'],['Разобранный пример','Сначала предскажите вывод, затем сравните с показанным результатом. Этот пример отделён от вашей работы.'],['Своя работа','В «Практике» хранится ваш код. Заготовку и эталон можно посмотреть и скопировать: их открытие не заменяет редактор. 1С запускается в отдельном учебном приложении.'],['Результат и продолжение','Сохранение, запуск и проверка различаются. Читайте результат рядом с действием. После правки нужен новый запуск. «Следующий урок» называет цель; понимание требует вашего объяснения.']];
  const remember=()=>{try{savePrefs({...loadPrefs(),referenceLearningTour:'20261112'})}catch{/* Закрытый account сохраняет свою границу. */}};
  const render=()=>{d.innerHTML=`<p>${step+1}/${steps.length}</p><h2>${esc(steps[step][0])}</h2><p>${esc(steps[step][1])}</p><button class="btn" data-tour-skip>${say('Пропустить','Skip')}</button><button class="btn primary" data-tour-next>${step===steps.length-1?say('Готово','Done'):say('Дальше','Next')}</button>`;d.querySelector('[data-tour-skip]').onclick=()=>d.close();d.querySelector('[data-tour-next]').onclick=()=>{if(++step===steps.length)d.close();else{render();d.querySelector('[data-tour-next]').focus()}}};
  d.onclose=()=>{remember();if(dialog===d)dialog=null;d.remove();if(active())opener?.focus({preventScroll:true})};scope.append(d);render();d.showModal();
 }
 try{if(loadPrefs().referenceLearningTour!=='20261112'){const invitation=document.createElement('p');invitation.dataset.tourInvitation='';invitation.textContent=say('Впервые здесь? Короткий тур: «Как учиться здесь».','New here? Open “How to learn here” for a short tour.');toolbar.parentElement.after(invitation)}}catch{}
 return()=>{disposed=true;abort.abort();close();dialog?.remove()};
}
