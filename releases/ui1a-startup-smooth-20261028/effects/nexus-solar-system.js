import {createSolarRenderer,rotation,orbitPosition,projectPoint} from './nexus-solar-renderer.js';
import {getNexusAppearance,changeNexusAppearance,appearanceControlsMarkup,bindAppearanceControls} from './nexus-appearance.js';
import {academyPresentationEntries,learnerAcademyEntries,practicesHubId} from '../core/academy-presentation.js';
import {createSolarFlight} from './nexus-solar-flight.js';

const tau=Math.PI*2,palette=[[.45,.88,.73],[.45,.69,.97],[.78,.61,.98],[.36,.84,.88],[.97,.62,.78],[.59,.73,.97],[.97,.75,.44],[.55,.87,.61],[.88,.68,.49],[.73,.7,.98]];
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const add=(a,b)=>a.map((value,index)=>value+b[index]);
const inclinations=[-.62,.83,-.96,.4,1.04,-.77,.65,-.38,.91,-1.08],terrain=[1,3,2,1,2,3,0,1,2,3],defaultCamera={yaw:-.35,pitch:.46,distance:12.4};
export function bindNexusOrbit({catalog,locale,translate:t,languageCatalog,languageName,openCategory,quality=()=> 'auto'}){
  const shell=document.querySelector('#appShell'),mount=document.querySelector('[data-nexus-orbit]');if(!shell)return;
  const entries=learnerAcademyEntries(catalog);
  const categoryOrder=[...new Set(academyPresentationEntries(catalog).map(entry=>entry.category))];
  const groups=[...new Map(entries.map(c=>[c.category,c.categoryTitle])).entries()].map(([id,title])=>{const index=categoryOrder.indexOf(id);return {id,index,name:id==='software-engineering'?t('visual.academy.softwareEngineering'):title[locale]||title.ru,color:palette[index],radius:1.05+index*.32,tilt:inclinations[index],node:index*.91+.23,phase:index*2.399+.4,items:entries.filter(c=>c.category===id)}});
  const groupById=new Map(groups.map(g=>[g.id,g])),courseById=new Map(entries.map(c=>[c.id,c]));
  const controller=new AbortController(),options={signal:controller.signal};
  const homePresentation=mount?.closest('.visual-home-hero')?.querySelectorAll(':scope > .visual-home-copy,:scope > .ns-graphics-invite')||[];
  // Presentation follows the existing expanded dialog, including its flight mode.
  const syncHomePresentation=()=>{for(const block of homePresentation)block.inert=Boolean(dialog?.open)};
  let dialog=null,field=null,sceneRenderer=null,sceneResize=null,heroRenderer=null,heroVisible=Boolean(mount),heroTarget=[0,0],frame=0,last=0,lastDraw=0,simTime=0,dustTime=0,disposed=false,drag=null,closing=false,entryAnimation=null,exitAnimation=null,priorOverflow='',returnFocus=null,tracks=[],selectionVersion=0,selected=null,focus={kind:'system'},positionMap=new Map(),labelElements=[],screenBodies=[],parked=new Map();
  const viewState={...defaultCamera,target:[0,0,0],zoom:1,vx:0,vy:0},flight=createSolarFlight();let flightFallback=false,pointerReleasedAt=0,flightTouchClickUntil=0;
  const touchFlight=()=>matchMedia('(pointer:coarse), (max-width:760px)').matches;
  // Touch and keyboard share the existing controller; each input owns only its held keys.
  const touchPointers=new Map(),keyboardFlightKeys=new Set();
  const syncFlightKeys=()=>{const keys=new Set(keyboardFlightKeys);for(const input of touchPointers.values())for(const key of input.keys)keys.add(key);for(const key of new Set([...flight.state.keys,...keys]))flight.key(key,keys.has(key));schedule()};
  const clearFlightInput=()=>{
    const held=[...touchPointers.entries()];touchPointers.clear();keyboardFlightKeys.clear();flight.clear();
    for(const [id,input] of held)if(input.element.hasPointerCapture(id))input.element.releasePointerCapture(id);
    dialog?.querySelectorAll('[data-flight-key]').forEach(button=>button.setAttribute('aria-pressed','false'));
    const stick=dialog?.querySelector('[data-flight-stick]');if(stick){stick.style.setProperty('--stick-x','0px');stick.style.setProperty('--stick-y','0px')}
    if(drag&&field&&drag.touch){const id=drag.id;drag=null;if(field.hasPointerCapture(id))field.releasePointerCapture(id)}
  };
  let heroDistance=9.2,heroYaw=defaultCamera.yaw,heroPitch=defaultCamera.pitch,heroDrag=null,heroSuppressClickUntil=0;
  if(mount){mount.querySelectorAll('.visual-art-node').forEach(node=>node.remove());heroRenderer=createSolarRenderer(mount.querySelector('canvas'));mount.classList.add('solar-ready');mount.dataset.solarRenderer=heroRenderer.kind;const labels=document.createElement('div');labels.className='ns-hero-labels';labels.setAttribute('aria-hidden','true');labels.innerHTML=groups.filter(g=>['core','ai-ml','security'].includes(g.id)).map(g=>`<span data-hero-planet="${g.id}">${escape(g.name)}</span>`).join('');mount.insertBefore(labels,mount.querySelector('[data-orbit-open]'))}
  const motion=()=>getNexusAppearance().motion&&getNexusAppearance().orbitalSpeed>0&&quality()!=='off';
  const dustMotion=()=>{const s=getNexusAppearance();return s.motion&&s.particleSpeed>0&&s.particles>0&&quality()!=='off';};
  const density=()=>Math.min(devicePixelRatio||1,quality()==='lite'||innerWidth<761?1.2:1.6);
  const groupPosition=group=>orbitPosition(group.phase+simTime*.15/Math.pow(group.radius,1.1),group.radius,group.tilt,group.node);
  const moonPlane=(group,index)=>({radius:.29+(index%3)*.11,tilt:-.8+(index%5)*.41,node:group.node+index*1.72});
  const satellitePosition=(group,index)=>{const plane=moonPlane(group,index);return add(groupPosition(group),orbitPosition(index*tau/group.items.length+.4+simTime*(.3+index*.035),plane.radius,plane.tilt,plane.node))};
  const hubPosition=()=>{const group=groupById.get('core');return satellitePosition(group,group.items.findIndex(c=>c.id==='programming'))};
  const trackPlane=index=>({radius:.36+(index%4)*.14,tilt:-.92+(index%7)*.3,node:index*1.63+.3});
  const trackPosition=index=>{const plane=trackPlane(index);return add(hubPosition(),orbitPosition(index*2.399+simTime*(.21+index*.005),plane.radius,plane.tilt,plane.node))};
  const model=()=>{
    const bodies=[{id:'nexus',position:[0,0,0],radius:.28,color:[.65,.93,.8],sun:true}],orbits=[];positionMap=new Map([['nexus',[0,0,0]]]);
    for(const group of groups){const position=groupPosition(group);positionMap.set('category:'+group.id,position);bodies.push({id:'category:'+group.id,position,radius:.12+(group.index%3)*.036,color:group.color,spin:.12+group.index*.011,axialTilt:.2+group.index*.19,node:group.node,terrain:terrain[group.index],ringed:['practice','software-engineering'].includes(group.id)});orbits.push({center:[0,0,0],radius:group.radius,tilt:group.tilt,node:group.node,color:group.color,opacity:.28});
      group.items.forEach((course,index)=>{const point=satellitePosition(group,index);positionMap.set('course:'+course.id,point);bodies.push({id:'course:'+course.id,position:point,radius:course.id==='programming'?.059:.025+(index%2)*.008,color:course.status==='available-alpha'?[.5,.96,.78]:group.color.map(v=>v*.85),moon:true,spin:.25,axialTilt:index*.31,node:group.node});orbits.push({center:position,...moonPlane(group,index),color:group.color,opacity:focus.category===group.id?.28:.095});});
    }
    if(focus.kind==='hub'||focus.kind==='language'){
      const center=hubPosition();tracks.forEach((track,index)=>{const point=trackPosition(index);positionMap.set('language:'+track.id,point);bodies.push({id:'language:'+track.id,position:point,radius:track.id==='cpp'?.046:.024,color:track.status==='available-alpha'?[.5,.97,.76]:[.55,.68,.92],moon:true,spin:.22,axialTilt:index*.28,node:index*.7});orbits.push({center,...trackPlane(index),color:[.59,.78,.95],opacity:.16})});
    }
    return {bodies,orbits};
  };
  const itemName=course=>course.id==='programming'?'NEXUS CODE HUB':course.title[locale]||course.title.ru;
  const selectedName=()=>!selected?t('solar.overview'):selected.kind==='category'?groupById.get(selected.id).name:selected.kind==='hub'?'NEXUS CODE HUB':selected.kind==='language'?languageName(selected.id):itemName(courseById.get(selected.id));
  const targetGoal=()=>focus.kind==='system'?[0,0,0]:focus.kind==='category'?groupPosition(groupById.get(focus.id)):focus.kind==='hub'?hubPosition():positionMap.get(focus.kind+':'+focus.id)||[0,0,0];
  const distanceGoal=()=>focus.kind==='system'?defaultCamera.distance:focus.kind==='category'?2.6:focus.kind==='hub'?3:1.7;
  const pose=(width,height,hero=false)=>!hero&&flight.state.active?flight.pose():({rotation:rotation(hero?heroYaw+heroTarget[0]:viewState.yaw,hero?heroPitch+heroTarget[1]:viewState.pitch),target:hero?[0,0,0]:viewState.target,centerY:hero?.47:width<=760&&focus.kind!=='system'?.29:.5,distance:hero?heroDistance:viewState.distance*Math.max(1,height/Math.max(1,width)*(focus.kind!=='system'?.9:1.23))*viewState.zoom});
  const fitHeroCamera=(bodies,width,height,dt)=>{
    const m=rotation(heroYaw+heroTarget[0],heroPitch+heroTarget[1]),focal=height*1.18,side=focal/Math.max(36,width/2-18),top=focal/Math.max(36,height*.47-18),bottom=focal/Math.max(36,height*.53-48);let distance=7.6;
    for(const body of bodies){const p=body.position,x=m[0]*p[0]+m[3]*p[1]+m[6]*p[2],y=m[1]*p[0]+m[4]*p[1]+m[7]*p[2],z=m[2]*p[0]+m[5]*p[1]+m[8]*p[2],radius=body.radius*(body.ringed?2.3:1.1);distance=Math.max(distance,z+side*Math.abs(x)+radius*Math.hypot(1,side),z+top*y+radius*Math.hypot(1,top),z-bottom*y+radius*Math.hypot(1,bottom))}
    heroDistance=distance>heroDistance||matchMedia('(prefers-reduced-motion:reduce)').matches?distance:heroDistance+(distance-heroDistance)*(1-Math.exp(-dt*2.5));return Math.abs(heroDistance-distance)>.005;
  };
  const schedule=()=>{if(!frame&&!disposed&&document.documentElement.dataset.nexusIntroActive!=='true')frame=requestAnimationFrame(draw)};
  const refreshLabels=()=>{
    if(!dialog)return;
    const layer=dialog.querySelector('.ns-labels');layer.innerHTML='';parked.clear();dialog.querySelectorAll('[data-leader]').forEach(line=>line.style.display='none');
    let records=[];
    if(focus.kind==='system')records=groups.map(g=>({key:'category:'+g.id,name:g.name,color:g.color,kind:'category',id:g.id}));
    else if(focus.kind==='hub'||focus.kind==='language')records=tracks.map(track=>({key:'language:'+track.id,name:languageName(track.id),color:track.status==='available-alpha'?[.5,.97,.76]:[.65,.74,.95],kind:'language',id:track.id,planned:track.status!=='available-alpha'}));
    else{const group=groupById.get(focus.category||focus.id);records=group.items.map(c=>({key:'course:'+c.id,name:itemName(c),color:group.color,kind:c.id==='programming'?'hub':'course',id:c.id,planned:c.status!=='available-alpha'}))}
    labelElements=records.map((record,index)=>{const button=document.createElement('button');button.type='button';button.className='ns-body-label'+(record.planned?' planned':'');button.dataset.solarBody=record.key;button.style.setProperty('--planet-rgb',record.color.map(v=>Math.round(v*255)).join(','));button.innerHTML=`<i aria-hidden="true"></i><span>${escape(record.name)}</span>`;button.setAttribute('aria-label',record.name+(record.planned?' · '+t('catalog.planned'):''));button.addEventListener('click',()=>choose(record.kind,record.id),options);button.addEventListener('pointerenter',()=>parked.set(record.key,{x:button.offsetLeft,y:button.offsetTop}),options);button.addEventListener('pointerleave',()=>parked.delete(record.key),options);layer.append(button);return {button,...record,index,x:null,y:null}});
  };
  const updateInspector=()=>{
    if(!dialog)return;
    dialog.querySelector('[data-solar-location]').textContent=flight.state.active?t('solar.flight.title'):selectedName();
    dialog.querySelector('[data-solar-back]').hidden=focus.kind==='system'&&!flight.state.active;
    dialog.querySelectorAll('[data-solar-planet]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.solarPlanet===focus.category)));
    const inspector=dialog.querySelector('.ns-inspector');
    if(!selected){inspector.hidden=true;dialog.querySelector('.ns-overview-note').hidden=flight.state.active;return}
    inspector.hidden=false;dialog.querySelector('.ns-overview-note').hidden=true;
    let items=[],status='',description='',action='';
    if(selected.kind==='category'){const g=groupById.get(selected.id);items=g.items.map(c=>({id:c.id,kind:c.id==='programming'?'hub':'course',name:itemName(c),available:c.status==='available-alpha'}));description=t(g.id==='practice'?'practiceHub.academy.text':'solar.disciplines',{count:items.length});action=g.id==='practice'?`<a href="#view=practices">${escape(t('practiceHub.academy.open'))} ↗</a>`:`<button type="button" data-solar-category="${escape(g.id)}">${escape(t('solar.openCategory'))} <span aria-hidden="true">↗</span></button>`}
    else if(selected.kind==='hub'){items=tracks.map(track=>({id:track.id,kind:'language',name:languageName(track.id),available:track.status==='available-alpha'}));description=t('solar.languages',{count:tracks.length});status=t('catalog.available');action=`<a href="#view=programming">${escape(t('visual.academy.openHub'))} <span aria-hidden="true">↗</span></a>`}
    else{const entry=selected.kind==='language'?tracks.find(c=>c.id===selected.id):courseById.get(selected.id),available=entry?.status==='available-alpha';status=t(available?'catalog.available':'catalog.planned');description=t(available?'solar.availableNote':'solar.plannedNote');if(entry?.id===practicesHubId)description=t('practiceHub.academy.text');if(available){const href=selected.kind==='language'&&selected.id==='cpp'?'#course=cpp':entry.route;action=href?`<a href="${escape(href)}">${escape(t(entry?.id===practicesHubId?'practiceHub.academy.open':'solar.openCourse'))} <span aria-hidden="true">↗</span></a>`:''}}
    inspector.innerHTML=`<button class="ns-inspector-close" type="button" data-inspector-close aria-label="${escape(t('solar.closeDetails'))}">×</button><span class="eyebrow">${escape(t('solar.academy'))}</span><h2>${escape(selectedName())}</h2>${status?`<span class="ns-item-status ${status===t('catalog.available')?'available':'planned'}">${escape(status)}</span>`:''}<p>${escape(description)}</p>${items.length?`<div class="ns-satellite-list">${items.map(item=>`<button type="button" data-select-kind="${item.kind}" data-select-id="${escape(item.id)}"><span>${escape(item.name)}</span><small>${escape(t(item.available?'catalog.available':'catalog.planned'))}</small><span aria-hidden="true">↗</span></button>`).join('')}</div>`:''}<div class="ns-inspector-action">${action}</div>`;
    inspector.querySelector('[data-inspector-close]').addEventListener('click',()=>{inspector.hidden=true},options);
    inspector.querySelectorAll('[data-select-id]').forEach(button=>button.addEventListener('click',()=>choose(button.dataset.selectKind,button.dataset.selectId),options));
    inspector.querySelector('[data-solar-category]')?.addEventListener('click',()=>{const id=selected.id;close(true);openCategory(id)},options);
    inspector.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>close(true),options));
  };
  const choose=async(kind,id)=>{
    stopFlight();
    const version=++selectionVersion;
    if(kind==='hub'){dialog.querySelector('[data-solar-location]').textContent=t('solar.loading');try{tracks=(await languageCatalog()).tracks}catch{if(version===selectionVersion&&dialog?.open)dialog.querySelector('[data-solar-location]').textContent=t('solar.loadingFailed');return}if(disposed||!dialog?.open||version!==selectionVersion)return;focus={kind:'hub',id:'programming',category:'core'}}
    else if(kind==='category')focus={kind,id,category:id};
    else if(kind==='language')focus={kind,id,category:'core'};
    else focus={kind:'course',id,category:courseById.get(id).category};
    selected={kind,id};viewState.zoom=1;viewState.vx=0;viewState.vy=0;dialog.querySelector('[data-solar-zoom]').value='100';refreshLabels();updateInspector();schedule();
  };
  const overview=()=>{stopFlight();selectionVersion++;focus={kind:'system'};selected=null;viewState.zoom=1;viewState.vx=0;viewState.vy=0;dialog.querySelector('[data-solar-zoom]').value='100';refreshLabels();updateInspector();schedule()};
  const updateFlightUI=()=>{if(!dialog)return;const active=flight.state.active,locked=document.pointerLockElement===field,touch=touchFlight();dialog.classList.toggle('ns-flight',active);dialog.classList.toggle('ns-flight-locked',locked);dialog.classList.toggle('ns-touch-flight',active&&touch);const button=dialog.querySelector('[data-solar-flight]');button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',t(active?'solar.flight.exit':'solar.flight.title'));button.querySelector('span').textContent=t(active?'solar.flight.exit':touch?'solar.flight.touch.enter':'solar.flight.title');dialog.querySelector('.ns-flight-hud').hidden=!active;dialog.querySelector('.ns-touch-controls').hidden=!active||!touch;dialog.querySelector('.ns-touch-controls').inert=!dialog.querySelector('.ns-settings').hidden;field.setAttribute('aria-label',t(active&&touch?'solar.flight.touch.hint':'solar.instructions'));dialog.querySelector('[data-flight-capture]').hidden=touch||locked||!active;dialog.querySelector('[data-flight-status]').textContent=t(touch?'solar.flight.touch.hint':locked?'solar.flight.controls':'solar.flight.unlocked');dialog.querySelector('[data-solar-zoom]').disabled=active};
  const requestFlightPointer=()=>{clearFlightInput();flightFallback=false;try{const request=field.requestPointerLock?.();if(!field.requestPointerLock)flightFallback=true;request?.catch(()=>{flightFallback=true;updateFlightUI();schedule()})}catch{flightFallback=true}schedule()};
  const stopFlight=()=>{clearFlightInput();if(!flight.state.active)return;const view=flight.pose();Object.assign(viewState,{yaw:flight.state.yaw,pitch:flight.state.pitch,target:view.target,distance:1,zoom:1,vx:0,vy:0});flight.stop();flightFallback=false;if(document.pointerLockElement===field)document.exitPointerLock();updateFlightUI()};
  const startFlight=()=>{if(!flight.state.active){const view=pose(field.clientWidth,field.clientHeight);flight.start(view,viewState.yaw,viewState.pitch);selectionVersion++;focus={kind:'system'};selected=null;refreshLabels();updateInspector()}updateFlightUI();field.focus();if(matchMedia('(pointer:fine)').matches)requestFlightPointer();schedule()};
  const layOutLabels=view=>{
    const width=field.clientWidth,height=field.clientHeight,sun=projectPoint([0,0,0],view,width,height),badgeWidth=Math.max(36,Math.min(110,sun.scale*.4)),minY=dialog.querySelector('.ns-header').getBoundingClientRect().bottom+28,maxY=dialog.querySelector(flight.state.active&&touchFlight()?'.ns-touch-controls':'.ns-dock').getBoundingClientRect().top-28,rectangles=sun.visible?[{x:sun.x,y:sun.y,w:badgeWidth+24,h:badgeWidth+24}]:[];
    for(const label of labelElements){const point=positionMap.get(label.key);if(!point)continue;const p=projectPoint(point,view,width,height),w=label.button.offsetWidth,h=label.button.offsetHeight;
      label.button.hidden=!p.visible||p.x< -80||p.x>width+80||p.y<65||p.y>height-100;
      if(label.button.hidden){const line=dialog.querySelector(`[data-leader="${label.index}"]`);if(line)line.style.display='none';continue}
      const depthRatio=Math.max(.5,Math.min(1.5,view.distance/Math.max(.2,p.depth))),depthScale=.9+depthRatio*.08;
      // Desktop safe zones reserve 32px from the rendered label edge, including depth scale.
      const inset=width>760?4+Math.max(44,h)*depthScale/2:0,labelMinY=minY+inset,labelMaxY=Math.max(labelMinY,maxY-inset);
      const park=parked.get(label.key);let x=Math.max(w/2+16,Math.min(width-w/2-16,p.x+w/2+16)),y=Math.max(labelMinY,Math.min(labelMaxY,p.y));
      if(park){x=park.x;y=width>760?Math.max(labelMinY,Math.min(labelMaxY,park.y)):park.y}else{for(let tries=0;tries<14;tries++){const collision=rectangles.some(r=>Math.abs(x-r.x)<(w+r.w)/2+7&&Math.abs(y-r.y)<(h+r.h)/2+7);if(!collision)break;y=Math.max(labelMinY,Math.min(labelMaxY,y+(tries%2?1:-1)*(h+7)*(1+Math.floor(tries/2))))}}
      label.x=x;label.y=y;label.button.style.left=x+'px';label.button.style.top=y+'px';label.button.style.setProperty('--ns-depth-opacity',String(.5+depthRatio*.33));label.button.style.setProperty('--ns-depth-scale',String(depthScale));rectangles.push({x,y,w,h});
      const line=dialog.querySelector(`[data-leader="${label.index}"]`);if(line){line.style.display='';line.setAttribute('x1',String(p.x));line.setAttribute('y1',String(p.y));line.setAttribute('x2',String(x-w/2));line.setAttribute('y2',String(y))}
    }
    const badge=dialog.querySelector('.ns-sun-badge');badge.hidden=!sun.visible||sun.x<0||sun.x>width||sun.y<0||sun.y>height;badge.style.left=sun.x+'px';badge.style.top=sun.y+'px';badge.style.width=badgeWidth+'px';
    dialog.querySelectorAll('[data-halo]').forEach(halo=>{const p=projectPoint(positionMap.get(halo.dataset.halo)||[0,0,0],view,width,height);halo.hidden=!p.visible;halo.style.left=p.x+'px';halo.style.top=p.y+'px';halo.style.width=Math.max(20,p.scale*(halo.dataset.halo==='nexus'?.95:.28))+'px'});
  };
  const draw=time=>{
    frame=0;if(disposed)return;if(!lifetime.isConnected){dispose();return}if(document.hidden||document.documentElement.dataset.nexusIntroActive==='true'||(!heroVisible&&!dialog?.open)){last=0;return}
    const dt=Math.min(.05,last?(time-last)/1000:.016);last=time;if(motion())simTime+=dt*getNexusAppearance().orbitalSpeed;if(dustMotion())dustTime+=dt*getNexusAppearance().particleSpeed;
    const {bodies,orbits}=model();let settling=false;
    if(dialog?.open&&flight.state.active){settling=flight.step(dt,bodies)}
    else if(dialog?.open){const target=targetGoal(),blend=1-Math.exp(-dt*4.2);viewState.target=viewState.target.map((value,index)=>value+(target[index]-value)*blend);viewState.distance+=(distanceGoal()-viewState.distance)*blend;
      if(!drag){viewState.yaw+=viewState.vx*dt;viewState.pitch=Math.max(-1.3,Math.min(1.3,viewState.pitch+viewState.vy*dt));viewState.vx*=Math.pow(.92,dt*60);viewState.vy*=Math.pow(.92,dt*60)}
      settling=viewState.target.some((value,index)=>Math.abs(value-target[index])>.001)||Math.abs(viewState.distance-distanceGoal())>.001||Math.abs(viewState.vx)+Math.abs(viewState.vy)>.001;
    }
    if(time-lastDraw>28||!lastDraw||!(motion()||dustMotion())){
      lastDraw=time;
      if(dialog?.open){const view=pose(field.clientWidth,field.clientHeight);sceneRenderer.draw(bodies,orbits,view,density(),simTime,quality()==='off'?0:getNexusAppearance().particles,dustTime);screenBodies=bodies.map(body=>({...body,screen:projectPoint(body.position,view,field.clientWidth,field.clientHeight)}));layOutLabels(view);dialog.dataset.solarTime=simTime.toFixed(3);dialog.dataset.solarFocus=focus.kind+':'+(focus.id||'academy');dialog.dataset.solarNavigation=flight.state.active?'flight':'orbit';dialog.dataset.solarCamera=JSON.stringify(flight.state.active?{eye:flight.state.eye,yaw:flight.state.yaw,pitch:flight.state.pitch}:{target:viewState.target,yaw:viewState.yaw,pitch:viewState.pitch,distance:viewState.distance})}
      else if(mount&&heroVisible&&mount.clientWidth>0&&mount.clientHeight>0){settling=fitHeroCamera(bodies,mount.clientWidth,mount.clientHeight,dt);const view=pose(mount.clientWidth,mount.clientHeight,true);heroRenderer.draw(bodies,orbits,view,density(),simTime,quality()==='off'?0:getNexusAppearance().particles,dustTime);mount.querySelectorAll('[data-hero-planet]').forEach(label=>{const p=projectPoint(positionMap.get('category:'+label.dataset.heroPlanet),view,mount.clientWidth,mount.clientHeight);label.style.left=Math.max(45,Math.min(mount.clientWidth-45,p.x))+'px';label.style.top=Math.max(24,Math.min(mount.clientHeight-48,p.y))+'px'});mount.dataset.solarTime=simTime.toFixed(3)}
    }
    if(motion()||dustMotion()||drag||settling)frame=requestAnimationFrame(draw);
  };
  const close=(immediate=false)=>{
    if(!dialog?.open||(closing&&!immediate))return;stopFlight();closing=true;selectionVersion++;entryAnimation?.cancel();
    const finish=()=>{if(!dialog?.open)return;dialog.close();syncHomePresentation();document.body.style.overflow=priorOverflow;mount?.classList.remove('ns-expanded-source');drag=null;closing=false;if(!disposed&&returnFocus?.isConnected)returnFocus.focus();schedule()};
    if(immediate||matchMedia('(prefers-reduced-motion:reduce)').matches){finish();return}
    const source=mount?.getBoundingClientRect(),tx=source?source.left+source.width/2-innerWidth/2:0,ty=source?source.top+source.height/2-innerHeight/2:0,scale=source?source.height/innerHeight:.93;
    const animation=exitAnimation=field.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${tx}px,${ty}px) scale(${scale})`,opacity:.1}],{duration:420,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});animation.finished.then(()=>{animation.cancel();exitAnimation=null;finish()},finish);
  };
  const createDialog=()=>{
    dialog=document.createElement('dialog');dialog.className='nexus-system';dialog.setAttribute('aria-labelledby','nexusSystemTitle');
    dialog.innerHTML=`<div class="ns-field" role="group" tabindex="0" aria-label="${escape(t('solar.instructions'))}"><canvas aria-hidden="true"></canvas><div class="ns-halos" aria-hidden="true"><i data-halo="nexus" class="ns-halo sun"></i>${groups.map(g=>`<i data-halo="category:${g.id}" class="ns-halo" style="--planet-rgb:${g.color.map(v=>Math.round(v*255)).join(',')}"></i>`).join('')}</div><div class="ns-sun-badge" aria-hidden="true"><strong>ANX</strong><small>NEXUS</small></div><svg class="ns-leaders" aria-hidden="true">${Array.from({length:24},(_,i)=>`<line data-leader="${i}"/>`).join('')}</svg><div class="ns-labels"></div></div><header class="ns-header"><div><span>NEXUS / LIVING ACADEMY</span><h1 id="nexusSystemTitle">${escape(t('solar.title'))}</h1></div><div class="ns-header-actions"><button type="button" data-solar-flight aria-pressed="false"><i aria-hidden="true">⌁</i><span>${escape(t('solar.flight.title'))}</span></button><button type="button" data-solar-settings aria-expanded="false">${escape(t('solar.settings.short'))}</button><button class="icon-btn" type="button" data-solar-close aria-label="${escape(t('solar.close'))}">×</button></div></header><section class="ns-overview-note"><span class="eyebrow">${escape(t('solar.eyebrow'))}</span><h2>${escape(t('solar.welcome'))}</h2><p>${escape(t('practiceHub.solar.summary',{planets:groups.length,sections:entries.length}))}</p><a class="ns-graphics-link" href="#view=computer-graphics" data-solar-graphics>${escape(t('graphics.invite.title'))}<span>${escape(t('graphics.invite.link'))} ↗</span></a></section><section class="ns-flight-hud" hidden><i class="ns-flight-reticle" aria-hidden="true"></i><div><span class="eyebrow">${escape(t('solar.flight.title'))}</span><p data-flight-status>${escape(t('solar.flight.controls'))}</p><button type="button" data-flight-capture>${escape(t('solar.flight.capture'))}</button></div></section><section class="ns-touch-controls" hidden aria-label="${escape(t('solar.flight.touch.controls'))}"><div class="ns-touch-move"><div data-flight-stick tabindex="0" role="group" aria-label="${escape(t('solar.flight.touch.move'))}" aria-describedby="nsTouchHint"><span aria-hidden="true">↑<br>← · →<br>↓</span><i aria-hidden="true"></i></div><small>${escape(t('solar.flight.touch.move'))}</small></div><div class="ns-touch-actions"><button type="button" data-flight-key="KeyE" aria-pressed="false" aria-label="${escape(t('solar.flight.touch.up'))}">↑<span>${escape(t('solar.flight.touch.up'))}</span></button><button type="button" data-flight-key="KeyQ" aria-pressed="false" aria-label="${escape(t('solar.flight.touch.down'))}">↓<span>${escape(t('solar.flight.touch.down'))}</span></button><button type="button" data-flight-key="ShiftLeft" aria-pressed="false">${escape(t('solar.flight.touch.boost'))}</button></div><p id="nsTouchHint">${escape(t('solar.flight.touch.hint'))}</p></section><section class="ns-inspector" hidden></section><section class="ns-settings" hidden><header><h2>${escape(t('solar.settings.title'))}</h2><button type="button" class="icon-btn" data-solar-settings-close aria-label="${escape(t('solar.close'))}">×</button></header>${appearanceControlsMarkup(t)}</section><nav class="ns-dock" aria-label="${escape(t('solar.navigation'))}"><div class="ns-location"><button type="button" data-solar-back hidden>← ${escape(t('solar.back'))}</button><strong data-solar-location>${escape(t('solar.overview'))}</strong><small>${escape(t('solar.instructions'))}</small></div><div class="ns-camera-controls"><button type="button" data-solar-turn="left" aria-label="${escape(t('visual.orbit.left'))}">←</button><button type="button" data-solar-turn="right" aria-label="${escape(t('visual.orbit.right'))}">→</button><label><span>${escape(t('visual.orbit.zoom'))}</span><input type="range" min="65" max="160" value="100" data-solar-zoom></label><button type="button" data-solar-pause aria-pressed="false"></button></div><div class="ns-planets-nav">${groups.map(g=>`<button type="button" data-solar-planet="${g.id}" style="--planet-rgb:${g.color.map(v=>Math.round(v*255)).join(',')}"><i aria-hidden="true"></i>${escape(g.name)}</button>`).join('')}</div></nav>`;
    document.body.append(dialog);field=dialog.querySelector('.ns-field');sceneRenderer=createSolarRenderer(field.querySelector('canvas'));dialog.dataset.solarRenderer=sceneRenderer.kind;
    bindAppearanceControls(dialog.querySelector('.ns-settings'),options);
    const setSettings=open=>{clearFlightInput();dialog.querySelector('.ns-touch-controls').inert=open;if(open&&document.pointerLockElement===field)document.exitPointerLock();dialog.querySelector('.ns-settings').hidden=!open;dialog.querySelector('[data-solar-settings]').setAttribute('aria-expanded',String(open));if(open)dialog.querySelector('[data-solar-settings-close]').focus();else dialog.querySelector('[data-solar-settings]').focus()};
    dialog.querySelector('[data-solar-close]').addEventListener('click',()=>close(),options);
    dialog.querySelector('[data-solar-graphics]').addEventListener('click',()=>close(true),options);
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(!dialog.querySelector('.ns-settings').hidden)setSettings(false);else if(flight.state.active){if(document.pointerLockElement===field){clearFlightInput();document.exitPointerLock()}else if(performance.now()-pointerReleasedAt>300)overview()}else close()},options);
    dialog.addEventListener('close',()=>{stopFlight();syncHomePresentation();entryAnimation?.cancel();document.body.style.overflow=priorOverflow;mount?.classList.remove('ns-expanded-source');drag=null;closing=false;schedule()},options);
    dialog.querySelector('[data-solar-flight]').addEventListener('click',()=>flight.state.active?overview():startFlight(),options);
    dialog.querySelector('[data-flight-capture]').addEventListener('click',()=>{field.focus();requestFlightPointer()},options);
    dialog.querySelector('[data-solar-settings]').addEventListener('click',()=>setSettings(dialog.querySelector('.ns-settings').hidden),options);dialog.querySelector('[data-solar-settings-close]').addEventListener('click',()=>setSettings(false),options);
    dialog.querySelector('[data-solar-back]').addEventListener('click',overview,options);dialog.querySelectorAll('[data-solar-planet]').forEach(button=>button.addEventListener('click',()=>choose('category',button.dataset.solarPlanet),options));
    const turn=(yaw,pitch=0)=>{if(flight.state.active){flight.state.yaw+=yaw;flight.state.pitch=Math.max(-1.48,Math.min(1.48,flight.state.pitch+pitch))}else{viewState.yaw+=yaw;viewState.pitch=Math.max(-1.3,Math.min(1.3,viewState.pitch+pitch))}schedule()};
    dialog.querySelectorAll('[data-solar-turn]').forEach(button=>button.addEventListener('click',()=>turn(button.dataset.solarTurn==='left'?-.2:.2),options));
    const zoom=dialog.querySelector('[data-solar-zoom]');zoom.addEventListener('input',()=>{viewState.zoom=100/Number(zoom.value);schedule()},options);
    dialog.querySelector('[data-solar-pause]').addEventListener('click',()=>{const s=getNexusAppearance();changeNexusAppearance(motion()?{motion:false}:{motion:true,orbitalSpeed:s.orbitalSpeed||1})},options);
    field.addEventListener('pointerdown',event=>{if(event.button!==0||(event.target.closest('button')&&!(flight.state.active&&event.pointerType==='touch'))||drag||!dialog.querySelector('.ns-settings').hidden)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false,touch:event.pointerType==='touch',label:event.target.closest('[data-solar-body]')};viewState.vx=0;viewState.vy=0;if(document.pointerLockElement!==field)field.setPointerCapture(event.pointerId);if(!flight.state.active)field.classList.add('dragging');field.focus();schedule()},options);
    field.addEventListener('pointermove',event=>{
      if(flight.state.active){if(drag?.id===event.pointerId&&event.pointerType==='touch'){flight.steer(event.clientX-drag.x,event.clientY-drag.y);drag.x=event.clientX;drag.y=event.clientY;schedule()}if(flightFallback&&event.pointerType==='mouse'){const r=field.getBoundingClientRect();flight.point((event.clientX-r.left)/r.width*2-1,(event.clientY-r.top)/r.height*2-1);schedule()}if(drag)drag.moved ||= Math.hypot(event.movementX,event.movementY)>6||Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>6;return}
      if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.moved ||= Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>6;viewState.yaw+=dx*.004;viewState.pitch=Math.max(-1.3,Math.min(1.3,viewState.pitch+dy*.004));viewState.vx=dx*.12;viewState.vy=dy*.12;drag.x=event.clientX;drag.y=event.clientY;schedule()
    },options);
    field.addEventListener('pointerleave',()=>{flight.point(0,0);schedule()},options);
    const pick=event=>{
      const rect=field.getBoundingClientRect(),locked=document.pointerLockElement===field,x=locked?field.clientWidth/2:(event.clientX-rect.left)*field.clientWidth/rect.width,y=locked?field.clientHeight/2:(event.clientY-rect.top)*field.clientHeight/rect.height;
      const candidates=screenBodies.filter(body=>body.screen.visible&&(body.id==='nexus'||body.id.startsWith('category:')||labelElements.some(label=>label.key===body.id))).map(body=>({...body,hit:Math.hypot(x-body.screen.x,y-body.screen.y)/Math.max(18,body.screen.scale*body.radius+6)})).filter(body=>body.hit<=1).sort((a,b)=>a.screen.depth-b.screen.depth);
      const body=candidates[0];if(!body){if(!dialog.querySelector('.ns-settings').hidden)setSettings(false);else if(selected||flight.state.active)overview();else close();return}if(body.id==='nexus'){overview();return}const [kind,id]=body.id.split(':');choose(id==='programming'?'hub':kind,id)
    };
    const release=event=>{if(drag?.id!==event.pointerId)return;const labelTap=flight.state.active&&drag.touch&&!drag.moved&&event.type==='pointerup'?drag.label:null;if(flight.state.active&&drag.touch)flightTouchClickUntil=performance.now()+400;const clicked=!drag.moved&&event.type==='pointerup'&&!(flight.state.active&&event.pointerType==='touch');drag=null;field.classList.remove('dragging');if(field.hasPointerCapture(event.pointerId))field.releasePointerCapture(event.pointerId);if(labelTap){const [kind,id]=labelTap.dataset.solarBody.split(':');choose(id==='programming'?'hub':kind,id)}else if(clicked)pick(event);schedule()};field.addEventListener('pointerup',release,options);field.addEventListener('pointercancel',release,options);field.addEventListener('lostpointercapture',release,options);field.addEventListener('click',event=>{if(performance.now()<flightTouchClickUntil){event.preventDefault();event.stopPropagation()}},{...options,capture:true});
    field.addEventListener('wheel',event=>{event.preventDefault();if(flight.state.active)flight.moveForward(-event.deltaY*.002);else{const value=Math.max(65,Math.min(160,Number(zoom.value)-event.deltaY*.08));zoom.value=String(value);viewState.zoom=100/value}schedule()},{...options,passive:false});
    document.addEventListener('mousemove',event=>{if(flight.state.active&&document.pointerLockElement===field){flight.steer(event.movementX,event.movementY);schedule()}},options);
    document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==field){pointerReleasedAt=performance.now();clearFlightInput();flightFallback=false;drag=null;field.classList.remove('dragging')}updateFlightUI();schedule()},options);
    document.addEventListener('pointerlockerror',()=>{if(flight.state.active){flightFallback=true;updateFlightUI();schedule()}},options);
    const flightKeys=new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight']);
    document.addEventListener('keydown',event=>{
      if(!dialog.open||closing)return;
      if(event.key==='Escape'){event.preventDefault();if(event.repeat)return;if(!dialog.querySelector('.ns-settings').hidden)setSettings(false);else if(document.pointerLockElement===field){clearFlightInput();document.exitPointerLock()}else if(flight.state.active)overview();else close();return}
      if(event.ctrlKey||event.altKey||event.metaKey||event.target.closest('input,textarea,select,[contenteditable="true"]')||!dialog.querySelector('.ns-settings').hidden)return;
      if(flightKeys.has(event.code)&&(flight.state.active||['KeyW','KeyA','KeyS','KeyD'].includes(event.code))){event.preventDefault();if(!flight.state.active)startFlight();keyboardFlightKeys.add(event.code);syncFlightKeys();return}
      if(event.target!==field)return;const directions={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,-.12],ArrowDown:[0,.12]};if(directions[event.key]){event.preventDefault();turn(...directions[event.key])}if(event.key==='Home'){event.preventDefault();overview()}
    },options);
    document.addEventListener('keyup',event=>{if(flightKeys.has(event.code)){keyboardFlightKeys.delete(event.code);syncFlightKeys()}},options);
    window.addEventListener('blur',()=>{clearFlightInput();schedule()},options);
    dialog.addEventListener('focusin',event=>{if(event.target!==field){clearFlightInput();schedule()}},options);
    // Pointer capture keeps a held command local, even when a finger leaves its control.
    const stick=dialog.querySelector('[data-flight-stick]');
    const moveStick=event=>{
      const input=touchPointers.get(event.pointerId);if(input?.element!==stick)return;
      const r=stick.getBoundingClientRect(),radius=r.width*.32,dx=event.clientX-r.left-r.width/2,dy=event.clientY-r.top-r.height/2,scale=Math.min(1,radius/(Math.hypot(dx,dy)||1));
      stick.style.setProperty('--stick-x',dx*scale+'px');stick.style.setProperty('--stick-y',dy*scale+'px');
      input.keys=[];if(dx>radius*.28)input.keys.push('KeyD');if(dx<-radius*.28)input.keys.push('KeyA');if(dy>radius*.28)input.keys.push('KeyS');if(dy<-radius*.28)input.keys.push('KeyW');syncFlightKeys();
    };
    for(const element of dialog.querySelectorAll('[data-flight-stick],[data-flight-key]')){
      element.addEventListener('pointerdown',event=>{
        if(!flight.state.active||!dialog.querySelector('.ns-settings').hidden||event.button!==0||[...touchPointers.values()].some(input=>input.element===element))return;
        event.preventDefault();field.focus();touchPointers.set(event.pointerId,{element,keys:element===stick?[]:[element.dataset.flightKey]});element.setPointerCapture(event.pointerId);
        if(element===stick)moveStick(event);else{element.setAttribute('aria-pressed','true');syncFlightKeys()}
      },options);
      element.addEventListener('pointermove',event=>{if(element===stick)moveStick(event)},options);
      const releaseTouch=event=>{
        if(touchPointers.get(event.pointerId)?.element!==element)return;touchPointers.delete(event.pointerId);
        if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);
        if(element===stick){stick.style.setProperty('--stick-x','0px');stick.style.setProperty('--stick-y','0px')}else element.setAttribute('aria-pressed','false');syncFlightKeys();
      };
      for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,releaseTouch,options);
      element.addEventListener('contextmenu',event=>event.preventDefault(),options);
      // Keyboard activation of hold buttons uses the same command and releases on keyup.
      if(element!==stick){element.addEventListener('keydown',event=>{if(!['Space','Enter'].includes(event.code)||event.repeat)return;event.preventDefault();if(!flight.state.active)return;keyboardFlightKeys.add(element.dataset.flightKey);element.setAttribute('aria-pressed','true');syncFlightKeys()},options);element.addEventListener('keyup',event=>{if(!['Space','Enter'].includes(event.code))return;event.preventDefault();keyboardFlightKeys.delete(element.dataset.flightKey);element.setAttribute('aria-pressed','false');syncFlightKeys()},options)}
    }
    window.addEventListener('resize',()=>{clearFlightInput();updateFlightUI();schedule()},options);
    sceneResize=new ResizeObserver(schedule);sceneResize.observe(field);refreshLabels();updateInspector();updateFlightUI();
  };
  const appearanceChanged=()=>{if(dialog){const button=dialog.querySelector('[data-solar-pause]');button.textContent=t(motion()?'solar.pause':'solar.resume');button.setAttribute('aria-pressed',String(!motion()));dialog.classList.toggle('ns-still',!motion())}schedule()};
  const open=trigger=>{
    if(disposed)return;
    if(!dialog)createDialog();if(dialog.open||closing)return;selectionVersion++;focus={kind:'system'};selected=null;Object.assign(viewState,{...defaultCamera,yaw:heroYaw+heroTarget[0],pitch:heroPitch+heroTarget[1],target:[0,0,0],zoom:1,vx:0,vy:0});dialog.querySelector('[data-solar-zoom]').value='100';dialog.querySelector('.ns-settings').hidden=true;dialog.querySelector('[data-solar-settings]').setAttribute('aria-expanded','false');refreshLabels();updateInspector();returnFocus=trigger;priorOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();syncHomePresentation();mount?.classList.add('ns-expanded-source');appearanceChanged();dialog.querySelector('[data-solar-close]').focus();
    if(!matchMedia('(prefers-reduced-motion:reduce)').matches){const source=mount?.getBoundingClientRect(),tx=source?source.left+source.width/2-innerWidth/2:0,ty=source?source.top+source.height/2-innerHeight/2:0,scale=source?source.height/innerHeight:.88;entryAnimation=field.animate([{transform:`translate(${tx}px,${ty}px) scale(${scale})`,opacity:.35},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:760,easing:'cubic-bezier(.16,.84,.22,1)',fill:'both'});entryAnimation.finished.then(()=>{entryAnimation?.cancel();entryAnimation=null},()=>{})}schedule();
  };
  const heroControl=mount?.querySelector('[data-orbit-open]');
  if(heroControl){
    heroControl.setAttribute('aria-description',t('solar.preview.instructions'));heroControl.querySelector('.visual-art-caption').textContent=t('solar.preview.instructions');
    heroControl.addEventListener('click',event=>{if(event.detail>0&&performance.now()<heroSuppressClickUntil){event.preventDefault();return;}open(event.currentTarget)},options);
    heroControl.addEventListener('pointerdown',event=>{if(event.button!==0||heroDrag||!event.isPrimary)return;heroSuppressClickUntil=0;heroYaw+=heroTarget[0];heroPitch+=heroTarget[1];heroTarget=[0,0];heroDrag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};heroControl.setPointerCapture(event.pointerId)},options);
    heroControl.addEventListener('pointermove',event=>{if(heroDrag&&event.pointerId===heroDrag.id){const dx=event.clientX-heroDrag.x,dy=event.clientY-heroDrag.y;heroDrag.moved ||= Math.hypot(event.clientX-heroDrag.startX,event.clientY-heroDrag.startY)>6;if(heroDrag.moved){heroYaw+=dx*.006;heroPitch=Math.max(-1.25,Math.min(1.25,heroPitch+dy*.006));mount.classList.add('ns-hero-dragging')}heroDrag.x=event.clientX;heroDrag.y=event.clientY;}else if(!heroDrag&&event.pointerType==='mouse'&&(event.movementX||event.movementY)){const r=mount.getBoundingClientRect();heroTarget=[(event.clientX-r.left)/r.width*.12-.06,(event.clientY-r.top)/r.height*.1-.05];}schedule()},options);
    const finishHeroDrag=event=>{if(!heroDrag||event.pointerId!==heroDrag.id)return;const moved=heroDrag.moved;heroDrag=null;mount.classList.remove('ns-hero-dragging');if(moved)heroSuppressClickUntil=performance.now()+400;else if(event.type==='pointerup'&&event.pointerType==='touch'){const r=heroControl.getBoundingClientRect();if(event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom){heroSuppressClickUntil=performance.now()+400;open(heroControl)}}schedule()};
    heroControl.addEventListener('pointerup',finishHeroDrag,options);heroControl.addEventListener('pointercancel',finishHeroDrag,options);heroControl.addEventListener('lostpointercapture',finishHeroDrag,options);
    heroControl.addEventListener('pointerleave',()=>{if(heroDrag)return;heroTarget=[0,0];schedule()},options);
    heroControl.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.code))return;event.preventDefault();heroTarget=[0,0];if(event.code==='Home'){heroYaw=defaultCamera.yaw;heroPitch=defaultCamera.pitch;}else{heroYaw+=(event.code==='ArrowRight'?.12:event.code==='ArrowLeft'?-.12:0);heroPitch=Math.max(-1.25,Math.min(1.25,heroPitch+(event.code==='ArrowDown'?.1:event.code==='ArrowUp'?-.1:0)));}schedule()},options);
  }
  document.querySelectorAll('[data-nexus-solar]').forEach(trigger=>trigger.addEventListener('click',()=>open(trigger),options));
  const visibility=new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;schedule()});if(mount)visibility.observe(mount);
  const resize=new ResizeObserver(schedule);if(mount)resize.observe(mount);document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden)clearFlightInput();schedule()},options);addEventListener('nexus:intro-statechange',()=>{last=0;cancelAnimationFrame(frame);frame=0;schedule()},options);document.addEventListener('nexus-appearance-change',appearanceChanged,options);document.querySelector('#effectsQuality')?.addEventListener('change',()=>queueMicrotask(appearanceChanged),options);
  const lifetime=mount?.closest('.visual-home')||shell;
  const dispose=()=>{
    if(disposed)return;disposed=true;selectionVersion++;controller.abort();
    close(true);clearFlightInput();flight.stop();
    if(document.pointerLockElement===field&&field)document.exitPointerLock();
    if(heroDrag&&heroControl?.hasPointerCapture(heroDrag.id))heroControl.releasePointerCapture(heroDrag.id);
    heroDrag=null;drag=null;cancelAnimationFrame(frame);frame=0;entryAnimation?.cancel();exitAnimation?.cancel();
    visibility.disconnect();resize.disconnect();sceneResize?.disconnect();mutation.disconnect();
    heroRenderer?.destroy();sceneRenderer?.destroy();dialog?.remove();
  };
  const mutation=new MutationObserver(()=>{if(!lifetime.isConnected)dispose()});
  // Наблюдаем цепочку владельцев до host: удаление всего shell тоже должно
  // освобождать сцену. subtree не нужен для изменений текста редактора.
  for(let owner=lifetime.parentNode;owner;owner=owner.parentNode){mutation.observe(owner,{childList:true});if(owner===shell.parentNode)break}
  schedule();return dispose;
}
