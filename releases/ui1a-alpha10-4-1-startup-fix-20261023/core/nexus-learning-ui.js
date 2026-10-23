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
