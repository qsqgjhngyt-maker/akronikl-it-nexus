export function installQtAccessibleControls(shadow){
 if(shadow.querySelector('[data-nexus-a11y-focus]'))return;
 const ring=document.createElement('div');ring.dataset.nexusA11yFocus='';ring.setAttribute('aria-hidden','true');
 ring.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;box-sizing:border-box;border:3px solid #087e8b;outline:2px solid #fff;border-radius:4px;display:none';
 shadow.append(ring);let focused=null;
 const proxy=node=>node instanceof Element&&node.closest('.qt-window-a11y-container')&&node.matches('input:not([type="hidden"]),button,textarea')?node:null;
 const draw=()=>{
  if(!document.hasFocus()||!focused?.isConnected||focused.disabled||focused.getAttribute('aria-hidden')==='true'){ring.style.display='none';return;}
  const r=focused.getBoundingClientRect(),left=Math.max(2,r.left),top=Math.max(2,r.top),right=Math.min(innerWidth-2,r.right),bottom=Math.min(innerHeight-2,r.bottom);
  Object.assign(ring.style,{display:right>left&&bottom>top?'block':'none',left:left+'px',top:top+'px',width:Math.max(0,right-left)+'px',height:Math.max(0,bottom-top)+'px'});
 };
 const observer=new MutationObserver(draw);
 shadow.addEventListener('focusin',event=>{focused=proxy(event.composedPath()[0]);observer.disconnect();if(focused)observer.observe(focused,{attributes:true,attributeFilter:['style','disabled','aria-hidden']});draw();});
 shadow.addEventListener('focusout',()=>{focused=null;observer.disconnect();ring.style.display='none';});
 const activate=event=>{
  const control=proxy(event.composedPath()[0]);
  if(!control?.matches('input[type="checkbox"]')||control.disabled||control.getAttribute('aria-hidden')==='true'||![' ','Enter'].includes(event.key))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(event.type==='keydown'&&!event.repeat&&!event.isComposing&&!event.altKey&&!event.ctrlKey&&!event.metaKey){
   control.click();
   if(control.isConnected&&!control.disabled){control.focus({preventScroll:true});focused=control;draw();}
  }
 };
 shadow.addEventListener('keydown',activate,true);shadow.addEventListener('keyup',activate,true);
 const hide=()=>{ring.style.display='none';};
 addEventListener('resize',draw);addEventListener('scroll',draw,true);addEventListener('focus',draw);addEventListener('blur',hide);
 addEventListener('pagehide',()=>{observer.disconnect();removeEventListener('resize',draw);removeEventListener('scroll',draw,true);removeEventListener('focus',draw);removeEventListener('blur',hide);},{once:true});
}
