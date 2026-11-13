// Справка меняет только представление: редактор и хранилище проекта ей не принадлежат.
const cache=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=value=>String(value).normalize('NFKC').toLocaleLowerCase().replace(/ё/g,'е').trim();
function cardsFor(locale){
  if(!cache.has(locale))cache.set(locale,fetch(new URL(`../courses/reference/cards.${locale}.json`,import.meta.url),{credentials:'omit'})
    .then(response=>{if(!response.ok)throw Error('REFERENCE_UNAVAILABLE');return response.json()})
    .then(cards=>cards.filter(card=>card.context==='cpp'))
    .catch(error=>{cache.delete(locale);throw error}));
  return cache.get(locale);
}
const css=`
.studio-syntax-tools{display:flex;gap:10px;align-items:center;margin:12px 0}
.studio-syntax-tools .btn{min-height:44px;white-space:normal}
.studio-syntax-open[data-studio-workspace]{grid-template-columns:minmax(0,1fr) minmax(280px,360px)!important;align-items:start}
.studio-syntax-open>.ps-side{grid-column:1/-1}
.studio-syntax-dock{position:sticky;top:90px;scroll-margin-top:100px;min-width:0;max-height:calc(100dvh - 110px);display:grid;grid-template-rows:auto auto minmax(0,1fr);border:1px solid var(--line);border-radius:18px;background:var(--panel);overflow:hidden;color:var(--text)}
.studio-syntax-dock[hidden]{display:none}
.studio-syntax-dock header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--line)}
.studio-syntax-dock h2{font-size:18px;margin:0}
.studio-syntax-dock button{min-height:44px}
.studio-syntax-dock .drawer-search{padding:12px 16px}
.studio-syntax-dock label{font-size:13px;display:block;margin-bottom:6px}
.studio-syntax-dock input{background:var(--bg);color:var(--text)}
.studio-syntax-dock [role=status]{font-size:12px;color:var(--muted);margin:8px 0 0}
.studio-syntax-dock .drawer-scroll{padding:0 16px 16px;min-height:0;overflow:auto}
.studio-syntax-dock .drawer-term[hidden]{display:none}
.studio-syntax-dock .drawer-term p{color:var(--text)}
.studio-syntax-dock summary{cursor:pointer;min-height:44px;display:list-item;padding:12px 0;line-height:1.5;color:var(--accent)}
.studio-syntax-dock h3{font-size:13px;margin:16px 0 6px}
.studio-syntax-dock pre{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px;white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0}
.studio-syntax-dock pre code{font:12px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--text)}
.studio-syntax-dock a{text-decoration:underline;overflow-wrap:anywhere;color:var(--accent)}
.studio-syntax-dock :focus-visible{outline:2px solid var(--accent);outline-offset:3px}
@media(max-width:1050px){.studio-syntax-open[data-studio-workspace]{grid-template-columns:minmax(0,1fr)!important}.studio-syntax-dock{position:static;grid-row:1;max-height:55dvh}.studio-syntax-tools{flex-wrap:wrap}}
`;

export function mountStudioSyntaxReference(studio,locale='ru'){
  const root=studio.closest('[data-nexus-project-studio]'),workspace=root?.querySelector('[data-studio-workspace]');
  if(!workspace||studio.dataset.language!=='cpp')return()=>{};
  const en=locale==='en',say=(ru,eng)=>en?eng:ru,abort=new AbortController(),options={signal:abort.signal};
  const editor=studio.querySelector('#editor');
  const tools=document.createElement('div');tools.className='studio-syntax-tools';
  tools.innerHTML=`<style>${css}</style><button type="button" class="btn" data-studio-syntax-toggle aria-controls="studioSyntaxReference" aria-expanded="false">{ } ${say('Справочник C++','C++ reference')}</button>`;
  workspace.before(tools);
  const dock=document.createElement('aside');dock.id='studioSyntaxReference';dock.className='studio-syntax-dock';dock.hidden=true;dock.lang=en?'en':'ru';dock.setAttribute('aria-labelledby','studioSyntaxTitle');
  dock.innerHTML=`<header><h2 id="studioSyntaxTitle">${say('Синтаксис C++','C++ syntax')}</h2><button type="button" class="icon-btn" data-syntax-close aria-label="${say('Закрыть справочник','Close reference')}">×</button></header><div class="drawer-search"><label for="studioSyntaxSearch">${say('Найти конструкцию или термин','Find syntax or a term')}</label><input id="studioSyntaxSearch" type="search" autocomplete="off" placeholder="${say('Например: for, ввод, double','For example: for, input, double')}"><p role="status" aria-live="polite" data-syntax-status></p></div><div class="drawer-scroll" data-syntax-list tabindex="0" role="region" aria-label="${say('Карточки синтаксиса C++','C++ syntax cards')}"></div>`;
  workspace.querySelector('.ps-side')?.before(dock);
  if(!dock.isConnected)workspace.append(dock);
  const toggle=tools.querySelector('button'),search=dock.querySelector('input'),list=dock.querySelector('[data-syntax-list]'),status=dock.querySelector('[data-syntax-status]');
  let disposed=false,loaded=false,task=null,selection=null,origin=null;
  const current=()=>!disposed&&studio.isConnected;
  function filter(){
    if(!loaded)return;
    const query=normalize(search.value),words=query.split(/\s+/).filter(Boolean),cards=[...list.children];
    let count=0;
    for(const card of cards){card.hidden=!words.every(word=>card.dataset.search.includes(word));if(!card.hidden)count++}
    status.textContent=count?say(`Показано ${count} из ${cards.length}`,`Showing ${count} of ${cards.length}`):say('Ничего не найдено. Попробуйте другое слово.','Nothing found. Try another word.');
    list.scrollTop=0;
  }
  function render(cards){
    const fields=[['form',say('Форма записи','Syntax')],['example',say('Пример','Example')],['breakdown',say('Разбор','Walkthrough')],['observation',say('Что наблюдать','Expected observation')],['mistake',say('Типичная ошибка','Common mistake')]];
    list.innerHTML=cards.map(card=>`<article class="drawer-term" data-search="${esc(normalize([card.term,...(card.aliases||[]),card.simple,card.form].join(' ')))}"><details><summary>${esc(card.term)}</summary><p>${esc(card.simple)}</p>${fields.map(([field,label])=>`<section><h3>${label}</h3>${field==='form'||field==='example'?`<pre><code>${esc(card[field])}</code></pre>${field==='example'?`<button type="button" class="btn" data-syntax-copy>${say('Копировать пример','Copy example')}</button>`:''}`:`<p>${esc(card[field])}</p>`}</section>`).join('')}${/^https:\/\//.test(card.source?.url||'')?`<p><a href="${esc(card.source.url)}" target="_blank" rel="noopener">${say('Источник','Source')}: ${esc(card.source.section)}</a></p>`:''}</details></article>`).join('');
    loaded=true;filter();
  }
  async function load(){
    if(loaded)return;
    status.textContent=say('Загрузка справочника…','Loading reference…');
    try{const cards=await(task??=cardsFor(en?'en':'ru'));if(current())render(cards)}
    catch{task=null;if(current()){status.textContent=say('Не удалось загрузить справочник.','Could not load reference.');list.innerHTML=`<button type="button" class="btn" data-syntax-retry>${say('Повторить','Retry')}</button>`}}
  }
  function close(restore=true){
    dock.hidden=true;workspace.classList.remove('studio-syntax-open');toggle.setAttribute('aria-expanded','false');
    if(restore){if(origin===editor&&editor.isConnected){editor.focus({preventScroll:true});if(selection){editor.setSelectionRange(selection.start,selection.end,selection.direction);editor.scrollTop=selection.top;editor.scrollLeft=selection.left}}else toggle.focus({preventScroll:true})}
    editor?.__nexusCodeStudio?.sync();
  }
  function open(){
    dock.hidden=false;workspace.classList.add('studio-syntax-open');toggle.setAttribute('aria-expanded','true');
    if(selection&&selection.end>selection.start){const term=editor.value.slice(selection.start,selection.end).trim();if(term.length<=80)search.value=term}
    search.focus({preventScroll:true});dock.scrollIntoView({block:'start',behavior:'instant'});filter();void load();editor?.__nexusCodeStudio?.sync();
  }
  // Запоминаем положение до того, как кнопка заберёт фокус у textarea.
  toggle.addEventListener('pointerdown',()=>{origin=document.activeElement},{...options});
  editor?.addEventListener('blur',()=>{selection={start:editor.selectionStart,end:editor.selectionEnd,direction:editor.selectionDirection,top:editor.scrollTop,left:editor.scrollLeft};origin=editor},options);
  toggle.addEventListener('click',()=>dock.hidden?open():close(),options);
  dock.querySelector('[data-syntax-close]').addEventListener('click',()=>close(),options);
  search.addEventListener('input',filter,options);
  dock.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close()}},options);
  dock.addEventListener('click',async event=>{
    if(event.target.closest('[data-syntax-retry]')){void load();return}
    const button=event.target.closest('[data-syntax-copy]');if(!button)return;
    try{await navigator.clipboard.writeText(button.previousElementSibling.textContent);if(current())status.textContent=say('Пример скопирован. Код проекта не изменён.','Example copied. Project code is unchanged.')}
    catch{if(current())status.textContent=say('Копирование недоступно. Выделите пример и скопируйте его.','Copy unavailable. Select and copy the example.')}
  },options);
  return()=>{disposed=true;abort.abort();dock.remove();tools.remove();workspace.classList.remove('studio-syntax-open')};
}
