const ESCAPE='Escape';

function closeSelect(wrapper,returnFocus=false){
  if(!wrapper)return;
  const trigger=wrapper.querySelector('.nexus-select-trigger');
  const menu=wrapper.querySelector('.nexus-select-menu');
  wrapper.classList.remove('open','select-align-end');
  trigger?.setAttribute('aria-expanded','false');
  menu?.setAttribute('aria-hidden','true');
  if(returnFocus)trigger?.focus();
}

function closeAll(except=null){
  document.querySelectorAll('[data-nexus-select].open').forEach(wrapper=>{
    if(wrapper!==except)closeSelect(wrapper,false);
  });
}

function focusOption(menu,index){
  const options=[...menu.querySelectorAll('.nexus-select-option:not([disabled])')];
  if(!options.length)return;
  const safe=(index+options.length)%options.length;
  options[safe].focus();
}

function alignMenu(wrapper){
  wrapper.classList.remove('select-align-end');
  const menu=wrapper.querySelector('.nexus-select-menu');
  if(!menu)return;
  const r=wrapper.getBoundingClientRect();
  const desired=Math.max(r.width,180);
  if(r.left+desired>window.innerWidth-12)wrapper.classList.add('select-align-end');
}

function openSelect(wrapper,focusSelected=false){
  if(!wrapper)return;
  closeAll(wrapper);
  const trigger=wrapper.querySelector('.nexus-select-trigger');
  const menu=wrapper.querySelector('.nexus-select-menu');
  wrapper.classList.add('open');
  alignMenu(wrapper);
  trigger?.setAttribute('aria-expanded','true');
  menu?.setAttribute('aria-hidden','false');
  if(focusSelected){
    const selected=menu?.querySelector('[aria-selected="true"]')||menu?.querySelector('.nexus-select-option');
    selected?.focus();
  }
}

function commitOption(wrapper,option){
  const trigger=wrapper.querySelector('.nexus-select-trigger');
  if(!trigger||!option)return;
  const value=option.dataset.value||'';
  trigger.value=value;
  trigger.dataset.value=value;
  trigger.querySelector('.nexus-select-value').textContent=option.textContent.trim();
  wrapper.querySelectorAll('.nexus-select-option').forEach(item=>{
    const active=item===option;
    item.setAttribute('aria-selected',String(active));
    item.classList.toggle('selected',active);
    const mark=item.querySelector('.nexus-select-check');
    if(mark)mark.textContent=active?'✓':'';
  });
  closeSelect(wrapper,true);
  trigger.dispatchEvent(new Event('change',{bubbles:true}));
}

export function bindGlassSelects(){
  const wrappers=[...document.querySelectorAll('[data-nexus-select]')];
  wrappers.forEach(wrapper=>{
    const trigger=wrapper.querySelector('.nexus-select-trigger');
    const menu=wrapper.querySelector('.nexus-select-menu');
    const options=[...wrapper.querySelectorAll('.nexus-select-option')];
    if(!trigger||!menu||trigger.dataset.bound==='1')return;
    trigger.dataset.bound='1';
    trigger.addEventListener('click',()=>wrapper.classList.contains('open')?closeSelect(wrapper,false):openSelect(wrapper,false));
    trigger.addEventListener('keydown',ev=>{
      if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){
        ev.preventDefault();
        openSelect(wrapper,true);
        const selectedIndex=Math.max(0,options.findIndex(x=>x.getAttribute('aria-selected')==='true'));
        focusOption(menu,selectedIndex+(ev.key==='ArrowDown'?0:0));
      }else if(ev.key===ESCAPE){
        ev.preventDefault();
        closeSelect(wrapper,false);
      }
    });
    options.forEach((option,index)=>{
      option.addEventListener('click',()=>commitOption(wrapper,option));
      option.addEventListener('keydown',ev=>{
        if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){
          ev.preventDefault();
          focusOption(menu,index+(ev.key==='ArrowDown'?1:-1));
        }else if(ev.key==='Home'){
          ev.preventDefault();focusOption(menu,0);
        }else if(ev.key==='End'){
          ev.preventDefault();focusOption(menu,options.length-1);
        }else if(ev.key===ESCAPE){
          ev.preventDefault();closeSelect(wrapper,true);
        }
      });
    });
  });
  if(document.documentElement.dataset.nexusSelectGlobalBound!=='1'){
    document.documentElement.dataset.nexusSelectGlobalBound='1';
    document.addEventListener('pointerdown',ev=>{
      const inside=ev.target.closest?.('[data-nexus-select]');
      if(!inside)closeAll();
    });
    window.addEventListener('resize',()=>closeAll());
    window.addEventListener('scroll',()=>closeAll(),true);
  }
}
