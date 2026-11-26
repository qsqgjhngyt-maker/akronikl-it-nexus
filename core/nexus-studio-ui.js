let dispose=()=>{};
export function bindNexusStudioUi(locale='ru'){
  dispose();
  const abort=new AbortController(),observers=[],cleanup=[];
  dispose=()=>{abort.abort();observers.forEach(observer=>observer.disconnect());cleanup.forEach(fn=>fn())};
  const en=locale==='en',options={signal:abort.signal};
  const studio=document.querySelector('[data-nexus-code-studio]');
  if(studio){
    if(studio.closest('[data-nexus-project-studio]')&&studio.dataset.language==='cpp'){
      const loadSyntax=()=>import('./studio-syntax-reference.mjs').then(({mountStudioSyntaxReference})=>{
        if(!abort.signal.aborted&&studio.isConnected)cleanup.push(mountStudioSyntaxReference(studio,locale));
      }).catch(()=>{
        if(abort.signal.aborted||!studio.isConnected)return;
        const retry=document.createElement('button');retry.className='btn';retry.textContent=en?'Retry C++ reference':'Повторить загрузку справочника C++';
        studio.before(retry);cleanup.push(()=>retry.remove());retry.addEventListener('click',()=>{retry.remove();void loadSyntax()},options);
      });
      void loadSyntax();
    }
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
}
