import {createSolarRenderer,rotation,orbitPosition} from './nexus-solar-renderer.js';
import {getNexusAppearance} from './nexus-appearance.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const defaults={planets:8,inclination:48,speed:1,stars:1,moons:true,rings:true};

export function graphicsPromoMarkup(t){
  return `<aside class="ns-graphics-invite" aria-labelledby="graphicsInviteTitle"><div><span class="ns-graphics-spark" aria-hidden="true">✧</span><div><strong id="graphicsInviteTitle">${escape(t('graphics.invite.title'))}</strong><p>${escape(t('graphics.invite.text'))}</p></div></div><a href="#view=computer-graphics" data-graphics-invite>${escape(t('graphics.invite.link'))}<span aria-hidden="true">↗</span></a></aside>`;
}

export function graphicsLabMarkup(t){
  const sliders=[['planets',3,12,1,8],['inclination',0,80,1,48],['speed',0,2,.05,1],['stars',0,2,.05,1]];
  return `<div class="nexus-visual graphics-lab" data-graphics-lab><a class="back-link" href="#view=academy">← ${escape(t('graphics.back'))}</a><header class="visual-academy-heading graphics-heading"><div><span class="eyebrow">NEXUS / CREATIVE LAB</span><h1>${escape(t('graphics.title'))}</h1><p>${escape(t('graphics.intro'))}</p></div><div class="graphics-course-status"><span class="visual-status planned"><i aria-hidden="true"></i>${escape(t('graphics.course.planned'))}</span><span class="visual-status available"><i aria-hidden="true"></i>${escape(t('graphics.lab.available'))}</span></div></header><section class="graphics-workspace" aria-labelledby="graphicsSceneTitle"><div class="graphics-preview"><div class="graphics-stage" data-graphics-stage tabindex="0" role="group" aria-label="${escape(t('graphics.controls'))}"><canvas aria-hidden="true"></canvas><span class="graphics-stage-tag">${escape(t('graphics.scene.live'))}</span><span class="graphics-stage-hint">${escape(t('graphics.controls'))}</span></div><div class="graphics-preview-footer"><div><span class="eyebrow">${escape(t('graphics.scene.eyebrow'))}</span><h2 id="graphicsSceneTitle">${escape(t('graphics.scene.title'))}</h2></div><button type="button" class="btn ghost" data-graphics-pause aria-pressed="false">${escape(t('graphics.pause'))}</button></div></div><aside class="graphics-settings glass-panel" aria-labelledby="graphicsSettingsTitle"><h2 id="graphicsSettingsTitle">${escape(t('graphics.settings.title'))}</h2><div class="graphics-presets" role="group" aria-label="${escape(t('graphics.presets'))}">${['system','flower','minimal'].map(id=>`<button type="button" data-graphics-preset="${id}" aria-pressed="${id==='system'}">${escape(t('graphics.preset.'+id))}</button>`).join('')}</div>${sliders.map(([key,min,max,step,value])=>`<label class="graphics-range"><span>${escape(t('graphics.setting.'+key))}<output data-graphics-output="${key}">${key==='inclination'?value+'°':key==='planets'?value:Math.round(value*100)+'%'}</output></span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-graphics-setting="${key}"></label>`).join('')}${['moons','rings'].map(key=>`<label class="graphics-toggle"><span>${escape(t('graphics.setting.'+key))}</span><input type="checkbox" data-graphics-setting="${key}" checked></label>`).join('')}<p class="graphics-settings-note">${escape(t('graphics.settings.note'))}</p><button type="button" class="btn ghost" data-graphics-reset>${escape(t('graphics.reset'))}</button></aside></section><section class="graphics-code glass-panel" aria-labelledby="graphicsCodeTitle"><div class="graphics-code-heading"><div><span class="eyebrow">${escape(t('graphics.code.eyebrow'))}</span><h2 id="graphicsCodeTitle">${escape(t('graphics.code.title'))}</h2><p>${escape(t('graphics.code.text'))}</p></div><button type="button" class="btn primary" data-graphics-download>${escape(t('graphics.download'))}<span aria-hidden="true">↧</span></button></div><details data-graphics-code-details><summary>${escape(t('graphics.code.show'))}</summary><pre tabindex="0"><code data-graphics-code></code></pre></details><p class="graphics-download-status" data-graphics-download-status role="status" aria-live="polite"></p></section><section class="graphics-concepts" aria-label="${escape(t('graphics.concepts'))}">${['space','light','motion'].map((key,i)=>`<article class="glass-panel"><span class="eyebrow">0${i+1}</span><h3>${escape(t('graphics.concept.'+key))}</h3><p>${escape(t('graphics.concept.'+key+'.text'))}</p></article>`).join('')}</section></div>`;
}

// The same model and camera functions run in the lab and in its exported scene.
export function graphicsSceneModel(settings,time){
  const palette=[[.42,.86,.73],[.47,.7,.98],[.77,.61,.98],[.36,.83,.88],[.97,.62,.79],[.92,.74,.46],[.55,.86,.62],[.73,.73,.98]];
  const bodies=[{id:'sun',position:[0,0,0],radius:.26,color:[.67,.94,.82],sun:true}],orbits=[];
  for(let i=0;i<settings.planets;i++){
    const radius=1.05+i*.34,tilt=settings.inclination*Math.PI/180*(i%2?-1:1)*(.55+(i%3)*.18),node=i*.73,color=palette[i%palette.length];
    const position=orbitPosition(i*2.399+time*.24/Math.pow(radius,1.15),radius,tilt,node);
    bodies.push({id:'planet-'+i,position,radius:.105+(i%3)*.029,color,spin:.12+i*.017,axialTilt:.2+i*.19,node,terrain:1+i%3,ringed:settings.rings&&i%4===1});
    orbits.push({center:[0,0,0],radius,tilt,node,color,opacity:.25});
    if(settings.moons)for(let j=0;j<2;j++){
      const moonRadius=.26+j*.13,moonTilt=-.65+i*.13+j*.46,moonNode=node+j*1.71,local=orbitPosition(i+j*3.14+time*(.38+j*.11),moonRadius,moonTilt,moonNode);
      bodies.push({id:'moon-'+i+'-'+j,position:local.map((v,k)=>v+position[k]),radius:.028+j*.008,color:color.map(v=>v*.85),moon:true,spin:.23});
      orbits.push({center:position,radius:moonRadius,tilt:moonTilt,node:moonNode,color,opacity:.13});
    }
  }
  return {bodies,orbits};
}

export function graphicsSceneCamera(bodies,width,height,yaw,pitch,zoom,orbits=[]){
  const m=rotation(yaw,pitch),focal=height*1.18,side=focal/Math.max(30,width/2-24),vertical=focal/Math.max(30,height/2-48);let distance=7.4;
  const fit=(p,r=0)=>{const x=m[0]*p[0]+m[3]*p[1]+m[6]*p[2],y=m[1]*p[0]+m[4]*p[1]+m[7]*p[2],z=m[2]*p[0]+m[5]*p[1]+m[8]*p[2];distance=Math.max(distance,z+side*Math.abs(x)+r*Math.hypot(1,side),z+vertical*Math.abs(y)+r*Math.hypot(1,vertical));};
  for(const body of bodies)fit(body.position,body.radius*(body.ringed?2.3:1.1));
  for(const orbit of orbits)for(let i=0;i<48;i++){const p=orbitPosition(i*Math.PI/24,orbit.radius,orbit.tilt,orbit.node);fit(p.map((v,k)=>v+orbit.center[k]),.02)}
  return {rotation:m,target:[0,0,0],centerY:.5,distance:distance*zoom};
}

export function startGraphicsScene(canvas,settings,appearance,changed=()=>{}){
  const renderer=createSolarRenderer(canvas),stage=canvas.parentElement,bindings=new AbortController(),options={signal:bindings.signal};
  let frame=0,last=0,lastDraw=0,time=0,dustTime=0,yaw=-.35,pitch=.46,zoom=1,paused=false,drag=null,disposed=false;
  stage.dataset.graphicsRenderer=renderer.kind;
  const moving=()=>{const a=appearance();return !paused&&a.motion&&(settings.speed>0||settings.stars>0&&a.particleSpeed>0)};
  const schedule=()=>{if(!frame&&!disposed&&!document.hidden)frame=requestAnimationFrame(draw)};
  const draw=stamp=>{
    frame=0;if(disposed||document.hidden){last=0;return;}
    const dt=Math.min(.05,last?(stamp-last)/1000:.016);last=stamp;const a=appearance();
    if(!paused&&a.motion){time+=dt*settings.speed;dustTime+=dt*a.particleSpeed;}
    if(!lastDraw||stamp-lastDraw>28||!moving()){
      lastDraw=stamp;const width=stage.clientWidth,height=stage.clientHeight,{bodies,orbits}=graphicsSceneModel(settings,time),view=graphicsSceneCamera(bodies,width,height,yaw,pitch,zoom,orbits);
      renderer.draw(bodies,orbits,view,Math.min(devicePixelRatio||1,width<600?1.2:1.6),time,settings.stars,dustTime);
      stage.dataset.graphicsRenderer=renderer.kind;
      stage.dataset.graphicsTime=time.toFixed(3);stage.dataset.graphicsBodies=String(bodies.length);stage.dataset.graphicsCamera=JSON.stringify({yaw,pitch,zoom});
    }
    if(moving())schedule();
  };
  stage.addEventListener('pointerdown',event=>{if(event.button!==0||!event.isPrimary||drag)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY};stage.setPointerCapture(event.pointerId);stage.classList.add('dragging');stage.focus()},options);
  stage.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;yaw+=(event.clientX-drag.x)*.006;pitch=Math.max(-1.25,Math.min(1.25,pitch+(event.clientY-drag.y)*.006));drag.x=event.clientX;drag.y=event.clientY;schedule()},options);
  const release=event=>{if(drag?.id===event.pointerId){drag=null;stage.classList.remove('dragging')}};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(type,release,options);
  stage.addEventListener('wheel',event=>{if(event.ctrlKey)return;event.preventDefault();zoom=Math.max(.7,Math.min(1.6,zoom*Math.exp(event.deltaY*.001)));schedule()},{...options,passive:false});
  stage.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Equal','Minus'].includes(event.code))return;event.preventDefault();if(event.code==='Home'){yaw=-.35;pitch=.46;zoom=1;}else if(event.code==='Equal'||event.code==='Minus')zoom=Math.max(.7,Math.min(1.6,zoom*(event.code==='Equal'?.9:1.1)));else{yaw+=(event.code==='ArrowRight'?.12:event.code==='ArrowLeft'?-.12:0);pitch=Math.max(-1.25,Math.min(1.25,pitch+(event.code==='ArrowDown'?.1:event.code==='ArrowUp'?-.1:0)));}schedule()},options);
  const resize=new ResizeObserver(schedule);resize.observe(stage);
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;drag=null;stage.classList.remove('dragging')}else schedule()},options);
  document.addEventListener('nexus-appearance-change',schedule,options);
  schedule();
  return {refresh:schedule,pause(){paused=!paused;changed(paused);schedule();return paused},reset(){yaw=-.35;pitch=.46;zoom=1;paused=false;changed(paused);schedule()},destroy(){disposed=true;cancelAnimationFrame(frame);bindings.abort();resize.disconnect();renderer.destroy()}};
}

export function graphicsSceneCode(settings,motion){
  return `// The full renderer and scene runtime are included in the HTML download.\nconst settings = ${JSON.stringify(settings,null,2)};\n\n${orbitPosition.toString()}\n\n${rotation.toString()}\n\n${graphicsSceneModel.toString()}\n\n${graphicsSceneCamera.toString()}\n\n// ${motion?'Orbit time advances each frame.':'Motion is paused; drag to rotate the scene.'}\n// WebGL draws the model. Canvas is used when WebGL is unavailable.\nstartGraphicsScene(canvas, settings, () => ({ motion: ${motion}, particleSpeed: 0.5 }));`;
}

export async function graphicsSceneDocument(settings,motion){
  const response=await fetch(new URL('./nexus-solar-renderer.js',import.meta.url));if(!response.ok)throw Error('Renderer source unavailable');
  const renderer=await response.text(),runtime=[graphicsSceneModel,graphicsSceneCamera,startGraphicsScene].map(fn=>fn.toString().replace('export ','')).join('\n\n');
  const script=(renderer+'\n'+runtime+`\nconst settings = ${JSON.stringify(settings)};\nconst canvas = document.querySelector('canvas');\nstartGraphicsScene(canvas, settings, () => ({motion:${motion},particleSpeed:0.5}));`).replace(/<\/script/gi,'<\\/script');
  return `<!doctype html>\n<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>My Nexus Universe</title><style>html,body{margin:0;min-height:100%;background:#091727;color:#eaf6ff;font-family:system-ui}main{height:100dvh;position:relative;overflow:hidden;touch-action:none;outline-offset:-6px;cursor:grab}main.dragging{cursor:grabbing}canvas{width:100%;height:100%;position:absolute;pointer-events:none}p{position:absolute;bottom:18px;left:20px;right:20px;text-align:center;font-size:12px;color:#b6cedf;pointer-events:none}</style><main tabindex="0" role="group" aria-label="Drag or use arrow keys to rotate; scroll to zoom; Home resets the camera"><canvas aria-hidden="true"></canvas><p>Drag / arrows — rotate · wheel / + / − — zoom · Home — reset</p></main><script type="module">\n${script}\n</script></html>`;
}

export function bindGraphicsLab(t,quality=()=> 'auto',observerRoot=document.querySelector('#app')){
  const mount=document.querySelector('[data-graphics-lab]');if(!mount)return;
  const settings={...defaults},bindings=new AbortController(),options={signal:bindings.signal};let preset='system',downloading=false;
  const pause=mount.querySelector('[data-graphics-pause]'),status=mount.querySelector('[data-graphics-download-status]');
  const appearance=()=>({...getNexusAppearance(),motion:getNexusAppearance().motion&&quality()!=='off'});
  const scene=startGraphicsScene(mount.querySelector('canvas'),settings,appearance,paused=>{pause.setAttribute('aria-pressed',String(paused));pause.textContent=t(paused?'graphics.resume':'graphics.pause')});
  const sync=()=>{
    mount.querySelectorAll('[data-graphics-setting]').forEach(input=>{const key=input.dataset.graphicsSetting;if(input.type==='checkbox')input.checked=settings[key];else input.value=String(settings[key])});
    mount.querySelectorAll('[data-graphics-output]').forEach(output=>{const key=output.dataset.graphicsOutput;output.value=key==='inclination'?settings[key]+'°':key==='planets'?settings[key]:Math.round(settings[key]*100)+'%'});
    mount.querySelectorAll('[data-graphics-preset]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.graphicsPreset===preset)));
    mount.querySelector('[data-graphics-code]').textContent=graphicsSceneCode(settings,appearance().motion);status.textContent='';scene.refresh();
  };
  mount.querySelectorAll('[data-graphics-setting]').forEach(input=>input.addEventListener(input.type==='checkbox'?'change':'input',()=>{settings[input.dataset.graphicsSetting]=input.type==='checkbox'?input.checked:Number(input.value);preset=null;sync()},options));
  const presets={system:defaults,flower:{...defaults,planets:10,inclination:80,speed:.65,moons:false},minimal:{...defaults,planets:3,inclination:22,speed:.45,stars:.6,rings:false}};
  mount.querySelectorAll('[data-graphics-preset]').forEach(button=>button.addEventListener('click',()=>{preset=button.dataset.graphicsPreset;Object.assign(settings,presets[preset]);scene.reset();sync()},options));
  mount.querySelector('[data-graphics-reset]').addEventListener('click',()=>{preset='system';Object.assign(settings,defaults);scene.reset();sync()},options);
  pause.addEventListener('click',()=>scene.pause(),options);
  mount.querySelector('[data-graphics-download]').addEventListener('click',async event=>{
    if(downloading)return;downloading=true;const button=event.currentTarget;button.disabled=true;button.setAttribute('aria-busy','true');
    try{const html=await graphicsSceneDocument({...settings},appearance().motion);if(!mount.isConnected)return;const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='nexus-my-universe.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=t('graphics.download.ready')}
    catch{if(mount.isConnected)status.textContent=t('graphics.download.failed')}
    finally{downloading=false;button.disabled=false;button.removeAttribute('aria-busy')}
  },options);
  document.addEventListener('nexus-appearance-change',sync,options);document.querySelector('#effectsQuality')?.addEventListener('change',()=>queueMicrotask(sync),options);
  const mutation=new MutationObserver(()=>{if(mount.isConnected)return;scene.destroy();bindings.abort();mutation.disconnect()});mutation.observe(observerRoot||mount.parentElement,{childList:true});sync();
}
