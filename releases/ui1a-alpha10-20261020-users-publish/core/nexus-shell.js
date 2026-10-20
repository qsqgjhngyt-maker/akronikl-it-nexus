// Presentation and keyboard behavior only. Account, routes and persistence stay with their owners.
let dispose=()=>{};
const focusable='a[href],button:not([disabled]),summary,input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]';
const visibleItems=element=>[...element.querySelectorAll(focusable)].filter(item=>!item.closest('[inert]')&&item.getClientRects().length&&getComputedStyle(item).visibility!=='hidden');

export function bindNexusShell({translate,closeMobile,collapsed}){
  dispose();
  const shell=document.querySelector('#appShell');
  if(!shell)return;
  const controller=new AbortController(),signal=controller.signal;
  const sidebar=shell.querySelector('#sidebar'),stage=shell.querySelector('.stage');
  const menuButton=shell.querySelector('#menuBtn'),collapse=shell.querySelector('#sidebarCollapse');
  const settings=shell.querySelector('#visualSettings'),settingsButton=settings?.querySelector('summary');
  const profileButton=shell.querySelector('#accountMenuButton'),profile=shell.querySelector('#accountMenu');
  const mobile=matchMedia('(max-width: 760px)');
  const initialOverflow=document.body.style.overflow;
  let drawerOpen=false,leaving=false;
  const closeProfile=(returnFocus=false)=>{
    profile?.classList.remove('open');
    profile?.setAttribute('aria-hidden','true');
    profileButton?.setAttribute('aria-expanded','false');
    if(returnFocus)profileButton?.focus();
  };
  const syncDrawer=()=>{
    const open=mobile.matches&&sidebar?.classList.contains('open');
    if(sidebar){
      sidebar.inert=mobile.matches&&!open;
      sidebar.setAttribute('aria-label',translate('visual.shell.navigation'));
      if(open){sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true')}
      else{sidebar.removeAttribute('role');sidebar.removeAttribute('aria-modal')}
    }
    if(stage)stage.inert=!!open;
    document.body.style.overflow=open?'hidden':initialOverflow;
    menuButton?.setAttribute('aria-expanded',String(mobile.matches?!!open:!collapsed()));
    if(collapse){
      const label=translate(mobile.matches?'shell.closeNavigation':collapsed()?'shell.expandNavigation':'shell.collapseNavigation');
      collapse.title=label;collapse.setAttribute('aria-label',label);
      collapse.textContent=mobile.matches?'×':collapsed()?'›':'‹';
    }
    if(open&&!drawerOpen){
      settings&&(settings.open=false);closeProfile();
      (sidebar.querySelector('[aria-current="page"]')||collapse)?.focus();
    }else if(!open&&drawerOpen&&!leaving&&mobile.matches){menuButton?.focus()}
    drawerOpen=!!open;
  };
  const observer=new MutationObserver(syncDrawer);
  sidebar&&observer.observe(sidebar,{attributes:true,attributeFilter:['class']});
  shell.addEventListener('click',event=>{
    if(event.target.closest('.side-nav a,.brand'))leaving=true;
  },{capture:true,signal});
  shell.querySelector('[data-nexus-skip]')?.addEventListener('click',event=>{
    event.preventDefault();
    const main=shell.querySelector('#nexusContent');
    main?.focus({preventScroll:true});main?.scrollIntoView({block:'start',behavior:'instant'});
  },{signal});
  const syncSettings=()=>settingsButton?.setAttribute('aria-expanded',String(!!settings?.open));
  settings?.addEventListener('toggle',()=>{syncSettings();if(settings.open)closeProfile()},{signal});
  settings?.addEventListener('keydown',event=>{
    // Glass Select consumes Escape even while closed; let the enclosing settings close next.
    const wrapper=event.target.closest('[data-nexus-select]');
    if(event.key==='Escape'&&wrapper&&!wrapper.classList.contains('open')){
      event.preventDefault();event.stopPropagation();settings.open=false;settingsButton?.focus();
    }
  },{capture:true,signal});
  shell.addEventListener('pointerdown',event=>{
    if(settings?.open&&!settings.contains(event.target))settings.open=false;
  },{signal});
  profileButton?.setAttribute('aria-label',translate('shell.profile')+': '+(profileButton.querySelector('strong')?.textContent||''));
  profileButton?.addEventListener('click',()=>{if(profile?.classList.contains('open')&&settings)settings.open=false},{signal});
  profileButton?.addEventListener('keydown',event=>{
    if(!['ArrowDown','ArrowUp'].includes(event.key))return;
    event.preventDefault();
    if(!profile?.classList.contains('open'))profileButton.click();
    const items=visibleItems(profile);
    (event.key==='ArrowUp'?items.at(-1):items[0])?.focus();
  },{signal});
  profile?.addEventListener('keydown',event=>{
    const items=visibleItems(profile),index=items.indexOf(document.activeElement);
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
      items[next]?.focus();
    }
  },{signal});
  shell.querySelectorAll('[data-nexus-select]').forEach(wrapper=>{
    const trigger=wrapper.querySelector('.nexus-select-trigger');
    const caption=wrapper.querySelector('.select-caption')?.textContent||'';
    const updateLabel=()=>trigger?.setAttribute('aria-label',caption+': '+(trigger.querySelector('.nexus-select-value')?.textContent||''));
    updateLabel();trigger?.addEventListener('change',updateLabel,{signal});
  });
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.target.closest?.('dialog[open]'))return;
    if(drawerOpen){
      if(event.key==='Escape'){event.preventDefault();closeMobile();syncDrawer();return}
      if(event.key==='Tab'){
        const items=visibleItems(sidebar),first=items[0],last=items.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
      }
      return;
    }
    if(event.key==='Escape'&&profile?.classList.contains('open')){
      event.preventDefault();closeProfile(true);return;
    }
    if(event.key==='Escape'&&settings?.open){
      event.preventDefault();settings.open=false;settingsButton?.focus();return;
    }
    if(event.key==='Tab'){
      // A popup should never linger after keyboard focus moves to another region.
      setTimeout(()=>{
        if(signal.aborted)return;
        if(settings?.open&&!settings.contains(document.activeElement))settings.open=false;
        if(profile?.classList.contains('open')&&!profile.contains(document.activeElement)&&document.activeElement!==profileButton)closeProfile();
      },0);
    }
  },{signal});
  const onResize=()=>{leaving=false;if(!mobile.matches)closeMobile();syncDrawer();if(settings?.open)settings.open=false;closeProfile()};
  window.addEventListener('resize',onResize,{signal});
  syncSettings();syncDrawer();
  dispose=()=>{controller.abort();observer.disconnect();document.body.style.overflow=initialOverflow;if(stage)stage.inert=false;if(sidebar)sidebar.inert=false;};
}
