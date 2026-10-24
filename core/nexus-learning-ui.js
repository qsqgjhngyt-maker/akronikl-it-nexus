// Presentation only. Course data and persistence remain in the existing application.
export function bindNexusLearningUi(translate){
  const root=document.querySelector('[data-nexus-learning]');
  if(!root)return;
  const normalize=value=>String(value).normalize('NFKC').toLocaleLowerCase(document.documentElement.lang).trim();
  root.querySelectorAll('[data-learning-search]').forEach(region=>{
    const input=region.querySelector('input[type=search]');
    const clear=region.querySelector('[data-search-clear]');
    const result=region.querySelector('[data-search-result]');
    const empty=region.querySelector('[data-search-empty]');
    const items=[...region.querySelectorAll('[data-search-item]')];
    const groups=[...region.querySelectorAll('[data-search-group]')];
    const texts=new Map(items.map(item=>[item,normalize(item.dataset.searchText||item.textContent)]));
    const apply=()=>{
      const query=normalize(input.value);
      items.forEach(item=>item.hidden=!!query&&!texts.get(item).includes(query));
      groups.forEach(group=>group.hidden=![...group.querySelectorAll('[data-search-item]')].some(item=>!item.hidden));
      const active=region.querySelector('[role=tabpanel]:not([hidden])')||region;
      const activeItems=items.filter(item=>active.contains(item));
      const count=activeItems.filter(item=>!item.hidden).length;
      result.textContent=translate('learningUi.results',{count,total:activeItems.length});
      empty.hidden=count!==0;
      clear.hidden=!input.value;
    };
    input.addEventListener('input',apply);
    clear.addEventListener('click',()=>{input.value='';apply();input.focus()});
    // Existing tab handlers run first; filtering does not change their selection.
    region.querySelector('[role=tablist]')?.addEventListener('click',apply);
    region.querySelector('[role=tablist]')?.addEventListener('keydown',apply);
    apply();
  });
  root.querySelectorAll('[data-practicum-progress]').forEach(card=>{
    const tasks=[...card.querySelectorAll('[data-practicum][data-task]')];
    const progress=card.querySelector('[role=progressbar]');
    const label=card.querySelector('[data-practicum-count]');
    const apply=()=>{
      const done=tasks.filter(task=>task.checked).length;
      label.textContent=translate('learningUi.tasksDone',{done,total:tasks.length});
      progress.setAttribute('aria-valuenow',String(done));
      progress.querySelector('i').style.width=`${tasks.length?done/tasks.length*100:0}%`;
    };
    tasks.forEach(task=>task.addEventListener('change',apply));
    apply();
  });
}

// Нативный modal владеет фокусом и блокирует фон одинаково online/offline.
// Сохранение курса и пользовательские данные здесь не затрагиваются.
export function bindGlossaryDrawer(root=document){
  const drawer=root.querySelector('#termDrawer');if(!drawer)return;
  const controller=new AbortController(),options={signal:controller.signal};
  const search=drawer.querySelector('#termSearch'),cards=[...drawer.querySelectorAll('[data-term-card]')];
  const status=drawer.querySelector('#termStatus'),english=drawer.lang==='en';
  const triggers=[...root.querySelectorAll('#openTerms,#openTermsHead,[data-open-terms],[data-term]')];
  let returnFocus=null,disposed=false,backdropDown=false;
  const filter=()=>{
    const query=search.value.trim().toLocaleLowerCase();cards.forEach(card=>{card.hidden=!!query&&!card.textContent.toLocaleLowerCase().includes(query)});
    const count=cards.filter(card=>!card.hidden).length;
    status.textContent=count?(english?`Terms: ${count} of ${cards.length}`:`Термины: ${count} из ${cards.length}`):(english?'No terms found.':'Термины не найдены.');
  };
  const syncClosed=()=>{
    if(drawer.open)return;
    drawer.hidden=true;drawer.inert=true;drawer.setAttribute('aria-hidden','true');
    triggers.forEach(button=>button.setAttribute('aria-expanded','false'));
  };
  const close=(restore=true)=>{
    if(!drawer.open)return;
    drawer.close();syncClosed();
    if(restore&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
    returnFocus=null;
  };
  for(const trigger of triggers){
    trigger.setAttribute('aria-controls',drawer.id);trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
    trigger.addEventListener('click',()=>{
      if(disposed||drawer.open)return;
      returnFocus=trigger;drawer.hidden=false;drawer.inert=false;drawer.setAttribute('aria-hidden','false');
      search.value=trigger.dataset.term||'';filter();drawer.showModal();
      triggers.forEach(button=>button.setAttribute('aria-expanded','true'));search.focus({preventScroll:true});
      if(trigger.dataset.term)cards.find(card=>card.dataset.termCard===trigger.dataset.term.toLowerCase())?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    },options);
  }
  search.addEventListener('input',filter,options);
  drawer.querySelector('#closeTerms').addEventListener('click',()=>close(),options);
  drawer.addEventListener('cancel',event=>{event.preventDefault();close()},options);
  drawer.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close()}},options);
  drawer.addEventListener('close',syncClosed,options);
  const outside=event=>{const r=drawer.getBoundingClientRect();return event.target===drawer&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)};
  drawer.addEventListener('pointerdown',event=>{backdropDown=outside(event)},options);
  drawer.addEventListener('click',event=>{if(backdropDown&&outside(event))close();backdropDown=false},options);
  return ()=>{if(disposed)return;disposed=true;controller.abort();close(false);returnFocus=null};
}
