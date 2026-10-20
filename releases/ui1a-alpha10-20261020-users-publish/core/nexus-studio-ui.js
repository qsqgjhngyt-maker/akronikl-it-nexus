let dispose=()=>{};
export function bindNexusStudioUi(locale='ru'){
  dispose();
  const abort=new AbortController(),observers=[];
  dispose=()=>{abort.abort();observers.forEach(observer=>observer.disconnect())};
  const en=locale==='en',options={signal:abort.signal};
  const studio=document.querySelector('[data-nexus-code-studio]');
  if(studio){
    const graphicsWorkspace=Boolean(studio.closest('[data-nexus-project-studio][data-graphics-workshop]'));
    const button=studio.querySelector('[data-studio-files]'),tree=studio.querySelector('#codeFileTree');
    const setOpen=open=>{
      studio.classList.toggle('studio-files-collapsed',!open);
      button?.setAttribute('aria-expanded',String(open));
      if(tree)tree.hidden=!open;
      studio.querySelector('#editor')?.__nexusCodeStudio?.sync();
    };
    if(button){
      setOpen(graphicsWorkspace||!matchMedia('(max-width:760px)').matches);
      button.addEventListener('click',()=>setOpen(button.getAttribute('aria-expanded')!=='true'),options);
    }
    studio.addEventListener('click',event=>{if(!graphicsWorkspace&&event.target.closest('[data-open-file]')&&matchMedia('(max-width:760px)').matches)setOpen(false)},options);
    const refresh=()=>{
      studio.querySelectorAll('.code-file-actions button').forEach(control=>control.setAttribute('aria-label',`${control.title}: ${control.dataset.renameFile||control.dataset.removeFile||''}`));
      studio.querySelectorAll('.code-file-tab').forEach(tab=>tab.setAttribute('aria-pressed',String(tab.classList.contains('active'))));
    };
    refresh();
    const observer=new MutationObserver(refresh);
    observer.observe(studio.querySelector('#codeFileTreeList'),{childList:true,subtree:true});
    observer.observe(studio.querySelector('#codeFileTabs'),{childList:true,subtree:true});
    observers.push(observer);
  }
  const library=document.querySelector('[data-studio-library]');
  if(library){
    const input=library.querySelector('input'),clear=library.querySelector('[data-studio-search-clear]');
    const cards=[...library.querySelectorAll('[data-studio-project]')];
    input.disabled=cards.length===0;
    const normalize=value=>String(value).normalize('NFKC').toLocaleLowerCase(locale).trim();
    const texts=new Map(cards.map(card=>[card,normalize(card.querySelector('h3').textContent+' '+card.querySelector('p').textContent+' '+card.querySelector('.ps-language').textContent)]));
    const apply=()=>{
      const query=normalize(input.value);cards.forEach(card=>card.hidden=!!query&&!texts.get(card).includes(query));
      const count=cards.filter(card=>!card.hidden).length;
      library.querySelector('[data-studio-search-count]').textContent=en?`Showing ${count} of ${cards.length}`:`Показано ${count} из ${cards.length}`;
      library.querySelector('[data-studio-search-empty]').hidden=!query||count!==0;clear.hidden=!input.value;
    };
    input.addEventListener('input',apply,options);clear.addEventListener('click',()=>{input.value='';apply();input.focus()},options);apply();
  }
}
