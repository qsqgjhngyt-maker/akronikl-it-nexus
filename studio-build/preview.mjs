export function previewHeaders(type='text/html; charset=utf-8',parentOrigin='self'){return{'content-type':type,'cache-control':'no-store','vary':'*','x-content-type-options':'nosniff','referrer-policy':'no-referrer','access-control-allow-origin':'*','cross-origin-resource-policy':'cross-origin','permissions-policy':'camera=(), microphone=(), geolocation=(), publickey-credentials-get=(), publickey-credentials-create=()','content-security-policy':`sandbox allow-scripts; default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; style-src 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${parentOrigin==='self'?"'self'":new URL(parentOrigin).origin}`};}
export const previewHTML='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>C++ application — Nexus</title><style>html,body{margin:0;height:100%;background:#122035;color:#eef5ff;font:14px sans-serif}#screen{width:100%;height:100%;overflow:hidden}#status{position:absolute;top:4px;left:8px;pointer-events:none}</style></head><body><div id="screen"></div><div id="status">Nexus · loading application…</div><script src="qtloader.js"></script><script src="program.js"></script><script src="nexus-preview.js"></script></body></html>';
// Qt6.8 exposes checkable buttons as native checkbox proxies behind its canvas.
// Its global key handler consumes Space before the browser activates that proxy.
// Route only the proxy's own activation keys through the SDK's existing click action.
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
export function previewScript({parentOrigin,snapshotHash,outputDataFiles}){return`'use strict';
${installQtAccessibleControls.toString()}
const expectedParent=${JSON.stringify(parentOrigin)},snapshotHash=${JSON.stringify(snapshotHash)},allowed=${JSON.stringify(outputDataFiles)},nonce=new URLSearchParams(location.hash.slice(1)).get('run');let instance=null,started=false,outputBytes=0;const encoder=new TextEncoder();
const send=(type,value)=>parent.postMessage({type,nonce,snapshotHash,...value},expectedParent),text=value=>String(value).slice(0,32768);function output(v,error=false){const value=text(v);outputBytes+=encoder.encode(value).length;if(outputBytes<=65536)send('nexus-preview-output',{text:value,error});}

function snapshot(){if(!instance)return;try{const files={};for(const name of allowed){try{const value=instance.FS.readFile('/'+name,{encoding:'utf8'});if(encoder.encode(value).length>65536)throw Error('Application data limit');files[name]=value;}catch(e){if(e.errno!==44)throw e}}send('nexus-preview-data',{files})}catch(e){send('nexus-preview-error',{message:text(e.message)})}}
addEventListener('message',async e=>{if(e.source!==parent||e.origin!==expectedParent||!e.data||e.data.nonce!==nonce)return;const d=e.data;
if(d.type==='nexus-preview-start'&&!started){started=true;try{const data=d.files||{};for(const name of Object.keys(data))if(!allowed.includes(name)||typeof data[name]!=='string'||new TextEncoder().encode(data[name]).length>65536)throw Error('Invalid application data');instance=await qtLoad({qt:{entryFunction:window.program_entry,containerElements:[document.querySelector('#screen')],onLoaded(){document.querySelector('#status').hidden=true;let attempts=0;const activate=()=>{const shadow=document.querySelector('#qt-shadow-container')?.shadowRoot;const button=shadow?.querySelector('.hidden-visually-read-by-screen-reader');if(button){button.click();installQtAccessibleControls(shadow);for(const input of shadow.querySelectorAll('input,textarea'))if(!input.getAttribute('aria-label')&&input.textContent.trim())input.setAttribute('aria-label',input.textContent.trim())}else if(++attempts<20)setTimeout(activate,50)};setTimeout(activate,0);send('nexus-preview-running',{})},onExit(){send('nexus-preview-exited',{})}},print:v=>output(v),printErr:v=>output(v,true),preRun:[m=>{const close=m.FS.close;let scheduled=false;m.FS.close=function(stream){const name=(stream.path?.startsWith('/')?stream.path.slice(1):stream.path),writing=(stream.flags&3)!==0;const result=close.call(this,stream);if(writing&&allowed.includes(name)&&!scheduled){scheduled=true;setTimeout(()=>{scheduled=false;snapshot()},0)}return result;};for(const[name,value]of Object.entries(data)){const parts=name.split('/');if(parts.length>1)m.FS.mkdirTree('/'+parts.slice(0,-1).join('/'));m.FS.writeFile('/'+name,value)}}]});}catch(e){document.querySelector('#status').textContent='Application could not start';send('nexus-preview-error',{message:text(e.message)})}}
if(d.type==='nexus-preview-snapshot')snapshot();
});send('nexus-preview-ready',{});
`;}
