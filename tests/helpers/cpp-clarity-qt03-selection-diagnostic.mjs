// B06-QT-03: только чтение UI и пассивные события; выбор строки не меняется.
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
export async function observeQt03Selection({page,out}){
 const events=[],snapshots=[];let lastFrame=null,droppedEvents=0,sequence=0;
 const prefix='__NEXUS_QT03_SELECTION__';
 const safe=s=>String(s).replace(/(\/artifacts\/[a-f0-9-]+\/)[a-f0-9]{64}/g,'$1[redacted]');
 page.on('console',message=>{
  if(message.type()!=='debug'||!message.text().startsWith(prefix))return;
  try{if(events.length<3000)events.push(JSON.parse(message.text().slice(prefix.length)));else droppedEvents++;}catch{}
 });
 await page.addInitScript(({prefix})=>{
  const describe=node=>node instanceof Element?{tag:node.tagName,id:node.id,role:node.getAttribute('role'),label:node.getAttribute('aria-label'),selected:node.getAttribute('aria-selected'),checked:node.getAttribute('aria-checked'),text:(node.textContent||'').slice(0,150),value:'value'in node?String(node.value).slice(0,150):null}:null;
  for(const type of ['pointerdown','pointerup','click','focusin','change'])addEventListener(type,e=>{
   if(!document.querySelector('#qt-shadow-container'))return;
   console.debug(prefix+JSON.stringify({utc:new Date().toISOString(),performanceNow:performance.now(),type,x:e.clientX??null,y:e.clientY??null,button:e.button??null,path:e.composedPath().slice(0,8).map(describe).filter(Boolean)}));
  },{capture:true,passive:true});
 },{prefix});
 async function capture(label,{frame=lastFrame,row=null,list=null,client=null}={}){
  if(!frame)return;
  lastFrame=frame;const number=++sequence,stem='qt03-'+String(number).padStart(2,'0')+'-'+label;
  const record={label,number,utc:new Date().toISOString(),row};
  try{
   const contents=frame.locator('.qt-window-contents').first();
   record.listGlobal=list||await frame.getByText('Tasks',{exact:true}).boundingBox();
   record.contentsGlobal=client||await contents.boundingBox();
   record.contentsLocal=await contents.evaluate(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scrollLeft:node.scrollLeft,scrollTop:node.scrollTop};});
   if(row!==null&&record.listGlobal&&record.contentsGlobal){
    const a=record.listGlobal,b=record.contentsGlobal,c=record.contentsLocal;
    const relative={x:a.x-b.x+12,y:a.y-b.y+12+18*row};
    record.originalClick={method:'contents.click({position})',fixedRowStep:18,relative,global:{x:b.x+relative.x,y:b.y+relative.y}};
    const scaled=Math.abs(b.width-c.width)>0.5||Math.abs(b.height-c.height)>0.5;
    record.framePoint=scaled?{availability:'UNAVAILABLE',reason:'Frame CSS scale prevents exact direct mapping'}:{x:c.x+relative.x,y:c.y+relative.y};
    record.parentHitTest=await page.evaluate(point=>document.elementsFromPoint(point.x,point.y).slice(0,8).map(n=>({tag:n.tagName,id:n.id,className:String(n.className).slice(0,200),text:(n.textContent||'').slice(0,120)})),record.originalClick.global);
   }
   record.ui=await frame.locator('body').evaluate((body,point)=>{
    const describe=n=>{const r=n.getBoundingClientRect();return {tag:n.tagName,id:n.id,role:n.getAttribute('role'),label:n.getAttribute('aria-label'),selected:n.getAttribute('aria-selected'),checked:n.getAttribute('aria-checked'),tabindex:n.getAttribute('tabindex'),value:'value'in n?String(n.value):null,text:(n.textContent||'').slice(0,180),rect:{x:r.x,y:r.y,width:r.width,height:r.height},display:getComputedStyle(n).display,visibility:getComputedStyle(n).visibility};};
    const roots=[document];for(let i=0;i<roots.length;i++)for(const n of roots[i].querySelectorAll('*'))if(n.shadowRoot)roots.push(n.shadowRoot);
    const proxies=roots.flatMap(root=>[...root.querySelectorAll('[role],[aria-label],[aria-selected],input,button')]).map(describe);
    const selected=proxies.filter(n=>n.selected==='true'||n.checked==='true');
    let active=document.activeElement;while(active?.shadowRoot?.activeElement)active=active.shadowRoot.activeElement;
    const hit=(root)=>{if(!point||point.availability)return null;const n=root.elementFromPoint?.(point.x,point.y);if(!n)return null;return {node:describe(n),shadow:n.shadowRoot?hit(n.shadowRoot):null};};
    return {viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY},proxies:proxies.slice(0,500),proxyCount:proxies.length,selectedProxyNodes:selected,selectionAvailability:selected.length?'OBSERVED_IN_ACCESSIBILITY_PROXY':'UNAVAILABLE: no selected proxy exposed; no C++ model introspection',activeElement:active instanceof Element?describe(active):null,hitTest:hit(document),modelStateAvailability:'Only ordinary accessibility UI and parent Qt log; no C++ method called'};
   },record.framePoint||null);
   record.qtLog=safe(await page.locator('[data-app="log"]').textContent()||'');
   record.ariaFile=stem+'-aria.txt';await writeFile(path.join(out,record.ariaFile),safe(await frame.locator('body').ariaSnapshot()));
   record.screenshotFile=stem+'.png';await page.screenshot({path:path.join(out,record.screenshotFile),fullPage:false});
  }catch(error){record.unavailable=safe(error.message);}
  snapshots.push(record);
 }
 return {capture,async flush(){
  await capture('final-observation');
  const result={kind:'B06-QT-03 passive selected-range observation',baseline:'7bafbe88e2eb07c972c33525afb8f0de365faa31',selection:'SELECTED-RANGE',startIndex:12,endIndex:13,originalClickUnchanged:true,rowStep:18,originalTimeout:120000,assertionsUnchanged:true,productDOMWritten:false,QtMethodsCalled:false,snapshots,events,droppedEvents,limitations:['Screenshots and accessibility reads add observer overhead; they do not guarantee identical scheduling.','Qt internal selection is UNAVAILABLE when accessibility proxies do not expose it.','DOM hit-test identifies the pointer receiver, not a C++ item or model state.','A single PASS does not close an intermittent defect.']};
  await writeFile(path.join(out,'B06_QT03_SELECTION_DIAGNOSTIC.json'),JSON.stringify(result,null,2)+'\n');return result;
 }};
}
