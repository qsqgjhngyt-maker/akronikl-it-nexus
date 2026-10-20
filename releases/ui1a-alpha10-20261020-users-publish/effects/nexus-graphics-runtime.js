import {orbitPosition} from './nexus-solar-renderer.js';
import {graphicsProgram,resolveGraphicsDocument} from './nexus-graphics-projects.js';

// User source executes only in this worker, never in the Nexus document.
function graphicsWorker(){
 let scene,ranges=[];const limit=s=>String(s).slice(0,2000);let logs=0;
 const log=(...values)=>{if(logs++>=40)return;const text=values.map(v=>{try{return typeof v==='string'?v:JSON.stringify(v)}catch{return String(v)}}).join(' ');postMessage({type:'log',text:limit(text)})};
 console.log=console.info=console.warn=console.error=log;
 const error=(error,id)=>{const match=String(error.stack||'').match(/<anonymous>:(\d+):(\d+)/),line=match?Math.max(1,Number(match[1])-2):null,range=ranges.find(r=>line>=r.start&&line<=r.end);postMessage({type:'error',id,message:limit(error.message||error),file:error.file||range?.file||'scene.js',line:error.file?line||1:range?line-range.start+1:line,column:match?Number(match[2]):null})};
 onmessage=event=>{const data=event.data;try{
  if(data.type==='init'){ranges=data.ranges||[];const files=Object.freeze({...data.files}),api=Object.freeze({orbit:orbitPosition,files,readJSON:path=>JSON.parse(files[path])});for(const range of ranges){try{new Function('Nexus','settings',files[range.file])}catch(error){error.file=range.file;throw error}}scene=new Function('Nexus','settings',data.code+'\nreturn typeof scene === "function" ? scene : null;')(api,Object.freeze({...data.settings}));if(!scene)throw Error('Define function scene(time, settings).');postMessage({type:'ready'})}
  else if(data.type==='sample'){const model=scene(data.time,Object.freeze({...data.settings}));postMessage({type:'model',id:data.id,model})}
 }catch(e){error(e,data.id)}};
}

function graphicsRuntime(config){
 const stage=document.querySelector('main'),canvas=stage.querySelector('canvas'),renderer=createSolarRenderer(canvas);let worker,workerURL,timeout=0,frame=0,disposed=false,visible=true,ready=false,pending=0,requestId=0,needsSample=true,failed=false,time=0,dustTime=0,last=0,lastDraw=0,paused=false,drag=null,yaw=-.35,pitch=.46,zoom=1,settingsVersion=0,sampledVersion=0;
 let model={bodies:[],orbits:[]},settings={...config.settings},appearance={...config.appearance};
 const send=(type,data={})=>{if(config.channel)parent.postMessage({channel:config.channel,type,...data},'*')};
 const error=(message,line=null,column=null,file='scene.js')=>{if(failed||disposed)return;failed=true;worker?.terminate();clearTimeout(timeout);stage.querySelector('[data-error]').textContent=message;send('error',{message:String(message).slice(0,2000),line,column,file});schedule()};
 const vector=(value,name,min=-100,max=100)=>{if(!Array.isArray(value)||value.length!==3||value.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<min||v>max))throw Error(name+' must be a finite 3D vector.');return value.slice()};
 const number=(value,fallback,min,max)=>{if(value===undefined)return fallback;if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error('Scene number is outside its supported range.');return value};
 const validate=value=>{
  if(!value||!Array.isArray(value.bodies)||value.bodies.length>256||value.orbits!==undefined&&!Array.isArray(value.orbits)||(value.orbits||[]).length>256)throw Error('Return {bodies: [], orbits: []}; maximum 256 of each.');
  return {bodies:value.bodies.map((b,i)=>({id:String(b.id??i).slice(0,80),name:String(b.name??b.id??i).slice(0,120),position:vector(b.position,'position'),radius:number(b.radius,.15,.005,5),color:vector(b.color??[.4,.8,1],'color',0,1),sun:b.sun===true,moon:b.moon===true,ringed:b.ringed===true,spin:number(b.spin,0,-20,20),axialTilt:number(b.axialTilt,0,-20,20),node:number(b.node,0,-100,100),terrain:number(b.terrain,1,0,3)})),orbits:(value.orbits||[]).map(o=>({center:vector(o.center??[0,0,0],'center'),radius:number(o.radius,1,.001,100),tilt:number(o.tilt,0,-100,100),node:number(o.node,0,-100,100),color:vector(o.color??[.4,.8,1],'color',0,1),opacity:number(o.opacity,.25,0,1)}))};
 };
 const moving=()=>!paused&&appearance.motion&&!failed&&(settings.speed>0||settings.stars>0&&appearance.particleSpeed>0);
 const schedule=()=>{if(!frame&&!disposed&&visible&&!document.hidden)frame=requestAnimationFrame(draw)};
 const sample=()=>{if(!ready||pending||failed||disposed)return;pending=++requestId;sampledVersion=settingsVersion;needsSample=false;timeout=setTimeout(()=>error(config.timeoutText),750);worker.postMessage({type:'sample',id:pending,time,settings})};
 const camera=()=>{
  const width=stage.clientWidth,height=stage.clientHeight,m=rotation(yaw,pitch),focal=height*1.18,side=focal/Math.max(30,width/2-24),vertical=focal/Math.max(30,height/2-48);let distance=model.bodies.length<=2?4.4:7.4;
  const fit=(p,r=0)=>{const x=m[0]*p[0]+m[3]*p[1]+m[6]*p[2],y=m[1]*p[0]+m[4]*p[1]+m[7]*p[2],z=m[2]*p[0]+m[5]*p[1]+m[8]*p[2];distance=Math.max(distance,z+side*Math.abs(x)+r*Math.hypot(1,side),z+vertical*Math.abs(y)+r*Math.hypot(1,vertical))};
  for(const b of model.bodies)fit(b.position,b.radius*(b.ringed?2.3:1.1));for(const o of model.orbits)for(let i=0;i<32;i++)fit(orbitPosition(i*Math.PI/16,o.radius,o.tilt,o.node).map((v,k)=>v+o.center[k]),.02);
  return {rotation:m,target:[0,0,0],centerY:.5,distance:distance*zoom};
 };
 function draw(stamp){
  frame=0;if(disposed||document.hidden){last=0;return}const dt=Math.min(.05,last?(stamp-last)/1000:.016);last=stamp;
  if(moving()){time+=dt*settings.speed;dustTime+=dt*appearance.particleSpeed}
  if(!lastDraw||stamp-lastDraw>30||!moving()){lastDraw=stamp;renderer.draw(model.bodies,model.orbits,camera(),Math.min(devicePixelRatio||1,stage.clientWidth<600?1.2:1.6),time,settings.stars,dustTime);stage.dataset.graphicsBodies=String(model.bodies.length);stage.dataset.graphicsTime=time.toFixed(3);stage.dataset.graphicsRenderer=renderer.kind;stage.dataset.graphicsCamera=JSON.stringify({yaw,pitch,zoom});if(ready&&(moving()||needsSample))sample();send('frame',{bodies:model.bodies.length,time:Number(time.toFixed(3)),renderer:renderer.kind,camera:{yaw,pitch,zoom}})}
  if(moving())schedule();
 }
 workerURL=URL.createObjectURL(new Blob([config.workerSource],{type:'text/javascript'}));worker=new Worker(workerURL);timeout=setTimeout(()=>error(config.timeoutText),1500);
 worker.onmessage=event=>{
  if(disposed||failed)return;const d=event.data;
  if(d?.type==='log'){send('log',{text:String(d.text).slice(0,2000)});return}
  if(d?.type==='error'){error(d.message,d.line,d.column,d.file);return}
  if(d?.type==='ready'){clearTimeout(timeout);ready=true;sample();return}
  if(d?.type!=='model'||d.id!==pending)return;clearTimeout(timeout);pending=0;
  try{model=validate(d.model);if(sampledVersion!==settingsVersion)needsSample=true;send('ready',{bodies:model.bodies.length});schedule()}catch(e){error(e.message)}
 };
 worker.onerror=event=>{event.preventDefault();error(event.message)};worker.postMessage({type:'init',code:config.code,ranges:config.ranges,files:config.files,settings});
 const change=(data)=>{
  if(data.command==='appearance'){appearance={...data.appearance};last=0}
  else if(data.command==='settings'){settings={...data.settings};settingsVersion++;needsSample=true}
  else if(data.command==='pause'){paused=!paused;send('pause',{paused})}
  else if(data.command==='reset-camera'){yaw=-.35;pitch=.46;zoom=1}
  else if(data.command==='visibility'){visible=!!data.visible;last=0;if(!visible){cancelAnimationFrame(frame);frame=0;return}}
  else if(data.command==='dispose'){dispose();return}
  schedule();
 };
 window.addEventListener('message',event=>{if(event.source===parent&&event.data?.channel===config.channel)change(event.data)});
 stage.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};stage.setPointerCapture(e.pointerId);stage.classList.add('dragging');stage.focus()});
 stage.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;yaw+=(e.clientX-drag.x)*.006;pitch=Math.max(-1.25,Math.min(1.25,pitch+(e.clientY-drag.y)*.006));drag.x=e.clientX;drag.y=e.clientY;schedule()});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(type,e=>{if(drag?.id===e.pointerId){drag=null;stage.classList.remove('dragging')}});
 stage.addEventListener('wheel',e=>{if(e.ctrlKey)return;e.preventDefault();zoom=Math.max(.55,Math.min(2,zoom*Math.exp(e.deltaY*.001)));schedule()},{passive:false});
 stage.addEventListener('keydown',e=>{if(config.channel&&(e.ctrlKey||e.metaKey)&&['KeyS','Enter'].includes(e.code)){e.preventDefault();send('shortcut',{shortcut:e.code==='KeyS'?'save':'run'});return}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Equal','Minus'].includes(e.code))return;e.preventDefault();if(e.code==='Home'){yaw=-.35;pitch=.46;zoom=1}else if(e.code==='Equal'||e.code==='Minus')zoom=Math.max(.55,Math.min(2,zoom*(e.code==='Equal'?.9:1.1)));else{yaw+=(e.code==='ArrowRight'?.12:e.code==='ArrowLeft'?-.12:0);pitch=Math.max(-1.25,Math.min(1.25,pitch+(e.code==='ArrowDown'?.1:e.code==='ArrowUp'?-.1:0)))}schedule()});
 const resize=new ResizeObserver(schedule);resize.observe(stage);
 function dispose(){if(disposed)return;disposed=true;worker.terminate();clearTimeout(timeout);cancelAnimationFrame(frame);URL.revokeObjectURL(workerURL);resize.disconnect();renderer.destroy()}
 document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0}else schedule()});window.addEventListener('pagehide',dispose);schedule();
}

let rendererPromise;
export async function graphicsWorkbenchDocument(document,{motion=true,particleSpeed=.5,channel=null,locale='ru'}={}){
 document=resolveGraphicsDocument(document);const program=graphicsProgram(document);
 rendererPromise??=fetch(new URL('./nexus-solar-renderer.js',import.meta.url)).then(async r=>{if(!r.ok)throw Error('Renderer unavailable');return r.text()}).catch(e=>{rendererPromise=null;throw e});
 const renderer=await rendererPromise,en=locale==='en',config={...program,settings:document.settings,appearance:{motion,particleSpeed},channel,timeoutText:en?'Scene exceeded its execution time. Edit the code and run again.':'Сцена превысила время выполнения. Исправь код и запусти ещё раз.',workerSource:orbitPosition.toString()+'\n('+graphicsWorker.toString()+')();'};
 const script=(renderer+'\n('+graphicsRuntime.toString()+')('+JSON.stringify(config)+');').replace(/<\/script/gi,match=>'<\\/'+match.slice(2));
 return `<!doctype html><html lang="${en?'en':'ru'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; worker-src blob:; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>Nexus · 3D scene</title><style>html,body{margin:0;height:100%;background:#091727;color:#eaf6ff;font:12px system-ui}main{height:100dvh;position:relative;overflow:hidden;touch-action:none;cursor:grab;background:radial-gradient(ellipse at 65% 15%,rgba(69,55,121,.29),transparent 70%),radial-gradient(ellipse at 15% 90%,rgba(24,91,95,.23),transparent 65%)}main.dragging{cursor:grabbing}canvas{position:absolute;width:100%;height:100%;pointer-events:none}p{position:absolute;bottom:12px;left:16px;right:16px;margin:0;color:#b6cedf;text-align:center;font-size:10px;pointer-events:none;line-height:1.7}[data-error]{top:18px;bottom:auto;text-align:left;color:#ffc4cd;background:#182130cc;border-radius:10px;padding:12px}[data-error]:empty{display:none}</style></head><body><main tabindex="0" role="group" aria-label="${en?'Interactive 3D scene':'Интерактивная 3D-сцена'}"><canvas aria-hidden="true"></canvas><p>${en?'Drag / arrows — rotate · wheel / + / − — zoom · Home — reset':'Перетаскивание / стрелки — поворот · колесо / + / − — масштаб · Home — сброс'}</p><p data-error role="status"></p></main><script type="module">${script}</script></body></html>`;
}
