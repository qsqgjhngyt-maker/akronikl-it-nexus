import {INTRO_KEY,INTRO_MEDIA,readIntroPreference,saveIntroPreference,introVariant,staticIntro,readIntroHandoff,saveIntroHandoff,consumeIntroHandoff} from './startup-intro-policy.js';
import {prepareIntroCover,releaseIntroCover,introCoverDismissed} from './startup-intro-cover.js';

let installed=false,active=null,stylesReady;
const media=name=>new URL('../intro-media/'+INTRO_MEDIA[name.split('.')[0]].version+'/'+name,import.meta.url).href;
const preference=()=>{try{return readIntroPreference(localStorage)}catch{return readIntroPreference({getItem(){throw Error()}})}};
const persist=value=>{try{return saveIntroPreference(localStorage,value)}catch{return false}};
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function ensureStyles(){
 return stylesReady??=new Promise(resolve=>{
  const link=document.createElement('link');link.rel='stylesheet';link.dataset.startupIntroStyle='';link.fetchPriority='low';link.href=new URL('../styles/startup-intro.css',import.meta.url).href;
  const timer=setTimeout(()=>resolve(false),3000);link.onload=()=>{clearTimeout(timer);resolve(true)};link.onerror=()=>{clearTimeout(timer);resolve(false)};document.head.append(link);
 });
}
function showIntro({preview=false}={}){
 if(active||document.hidden)return;
 const setting=preference().value,bindings=new AbortController(),controls=new AbortController(),signal=bindings.signal,timers=new Set();
 let closing=false,removed=false,completion,played=false,variant=introVariant(innerWidth,innerHeight),startupDeadline,stallDeadline,limit,budget=30000,visibleAt=0;
 const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id};
 const cancel=id=>{clearTimeout(id);timers.delete(id)};
 const root=document.createElement('dialog');root.className='nexus-intro';root.dataset.startupIntro='';root.dataset.variant=variant;root.setAttribute('aria-label','Стартовая заставка Nexus');
 root.innerHTML='<div class="nexus-intro-visual" aria-hidden="true"></div><div class="nexus-intro-top"><button type="button" class="btn nexus-intro-skip">Пропустить <span aria-hidden="true">↗</span></button></div><div class="nexus-intro-caption"><small role="status">Открываем Nexus</small></div>';
 const visual=root.querySelector('.nexus-intro-visual'),skip=root.querySelector('button'),status=root.querySelector('[role=status]');
 const wordmark=()=>{
  root.querySelector('.nexus-intro-wordmark')?.remove();if(variant!=='mobile')return;
  const label=document.createElement('div');label.className='nexus-intro-wordmark';label.setAttribute('aria-hidden','true');label.innerHTML='<strong>AKRONIKL</strong><span>IT NEXUS</span>';root.append(label);
 };wordmark();
 const video=document.createElement('video');video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';video.disablePictureInPicture=true;video.setAttribute('aria-hidden','true');video.tabIndex=-1;visual.append(video);
 const stopVideo=()=>{video.pause();video.removeAttribute('src');video.load()};
 const cleanup=()=>{
  if(removed)return;removed=true;bindings.abort();controls.abort();for(const id of timers)clearTimeout(id);timers.clear();
  stopVideo();active=null;root.close();root.remove();dispatchEvent(new CustomEvent('nexus:intro-finished',{detail:completion}));
 };
 const finish=(reason='skip',immediate=false)=>{
  if(removed)return;
  if(closing){if(reason!=='ended'){completion.reason=reason;cleanup()}return}
  closing=true;bindings.abort();for(const id of timers)clearTimeout(id);timers.clear();video.pause();
  completion={reason,variant,playedSeconds:video.currentTime,duration:Number.isFinite(video.duration)?video.duration:null,preview};
  if(immediate||reduced()){cleanup();return}
  if(reason==='ended'){
   // Все кадры уже проиграны. Финальный кадр и src сохраняются до конца
   // затухания: сначала видео в тёмный фон, затем фон открывает готовый Nexus.
   root.dataset.phase='hold';dispatchEvent(new CustomEvent('nexus:intro-video-ended',{detail:completion}));
   later(()=>{root.dataset.phase='fade-video';later(()=>{root.dataset.phase='reveal';later(cleanup,500)},900)},500);
  }else{root.dataset.phase='skip';root.style.pointerEvents='none';later(cleanup,180)}
 };
 active={finish};skip.addEventListener('click',()=>finish('skip'),{signal:controls.signal});
 addEventListener('keydown',e=>{
  root.dataset.keyboard='';
  if(e.key==='Escape'){e.preventDefault();finish('escape')}
  if(e.key==='Tab'){e.preventDefault();skip.focus({preventScroll:true})}
 },{signal:controls.signal});
 addEventListener('pagehide',()=>finish('pagehide',true),{signal});
 addEventListener('nexus:session-ended',()=>finish('session-ended',true),{signal});
 const fallback=()=>{
  if(closing||root.dataset.playback==='poster')return;
  cancel(startupDeadline);cancel(stallDeadline);cancel(limit);stopVideo();root.dataset.playback='poster';status.textContent='Nexus готов к работе';later(()=>finish('fallback'),1400);
 };
 let poster;
 if(navigator.onLine!==false){poster=document.createElement('img');poster.alt='';poster.fetchPriority='low';poster.src=media(variant+'.jpg');poster.addEventListener('error',()=>poster.remove(),{once:true,signal});visual.prepend(poster)}
 document.body.append(root);root.showModal();releaseIntroCover();root.addEventListener('cancel',e=>{e.preventDefault();finish('escape')},{signal:controls.signal});
 // Фоновые render, focus и изменение # при bootstrap не закрывают сцену.
 if(staticIntro({...setting,reducedMotion:reduced(),online:navigator.onLine,connection:navigator.connection})){fallback();return}
 const choose=variant=>[['mp4','video/mp4; codecs="'+INTRO_MEDIA[variant].mp4Codec+'"'],['webm','video/webm; codecs="vp9"']].find(([,type])=>video.canPlayType(type));
 let selected=choose(variant);if(!selected){fallback();return}
 const play=()=>{if(!closing&&!document.hidden)video.play()?.catch(fallback)};
 const armLimit=()=>{if(visibleAt)return;visibleAt=performance.now();limit=later(()=>finish('deadline'),Math.max(0,budget))};
 video.addEventListener('error',fallback,{signal});video.addEventListener('ended',()=>finish('ended'),{signal});
 video.addEventListener('playing',()=>{played=true;cancel(startupDeadline);cancel(stallDeadline);root.dataset.playback='video';status.textContent='';armLimit()},{signal});
 video.addEventListener('waiting',()=>{
  cancel(stallDeadline);stallDeadline=later(()=>{if(!closing&&!document.hidden&&video.readyState<3)fallback()},10000);
 },{signal});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){video.pause();if(visibleAt)budget-=performance.now()-visibleAt;visibleAt=0;cancel(limit);cancel(stallDeadline);cancel(startupDeadline)}
  else{if(!played)startupDeadline=later(fallback,8000);armLimit();play()}
 },{signal});
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',fallback,{signal});
 addEventListener('offline',fallback,{signal});
 addEventListener('resize',()=>{
  const next=introVariant(innerWidth,innerHeight);if(next===variant||closing||root.dataset.playback==='poster')return;
  const fraction=Number.isFinite(video.duration)&&video.duration>0?Math.min(.94,video.currentTime/video.duration):0;
  variant=next;root.dataset.variant=next;wordmark();if(poster)poster.src=media(next+'.jpg');selected=choose(next);if(!selected){fallback();return}
  video.addEventListener('loadedmetadata',()=>{if(fraction)video.currentTime=fraction*video.duration;play()},{once:true,signal});
  video.src=media(next+'.'+selected[0]);play();
 },{signal});
 startupDeadline=later(fallback,8000);armLimit();video.src=media(variant+'.'+selected[0]);requestAnimationFrame(()=>requestAnimationFrame(play));
}
function controlsMarkup(){
 return '<legend>Запуск приложения</legend><label class="nexus-switch"><span>Показывать заставку при открытии</span><input type="checkbox" data-intro-enabled></label><label class="nexus-switch"><span>Упрощённый запуск</span><input type="checkbox" data-intro-simplified></label><p>Заставка появляется при открытии Nexus. Выбор сохраняется на этом устройстве.</p><button type="button" class="btn" data-intro-preview>Посмотреть заставку</button><p role="status" data-intro-save-status></p>';
}
function syncSettings(){
 const {value,writable}=preference();
 for(const panel of document.querySelectorAll('[data-intro-settings]'))for(const name of ['enabled','simplified']){const input=panel.querySelector('[data-intro-'+name+']');input.checked=value[name];input.disabled=!writable}
}
function mountSettings(){
 for(const host of document.querySelectorAll('#nexusSettingsPanel,.nexus-appearance-controls,[data-entry-intro-settings]')){
  if(host.querySelector('[data-intro-settings]'))continue;
  const panel=document.createElement('fieldset');panel.className='nexus-intro-settings';panel.dataset.introSettings='';panel.innerHTML=controlsMarkup();
  for(const name of ['enabled','simplified'])panel.querySelector('[data-intro-'+name+']').addEventListener('change',e=>{
   const current=preference(),ok=current.writable&&persist({...current.value,[name]:e.target.checked});
   panel.querySelector('[data-intro-save-status]').textContent=ok?'Настройка сохранена.':'Не удалось сохранить настройку.';
   if(ok&&(name==='enabled'&&!e.target.checked||name==='simplified'&&e.target.checked))active?.finish('settings',true);
   syncSettings();
  });
  panel.querySelector('[data-intro-preview]').addEventListener('click',()=>showIntro({preview:true}));host.append(panel);
 }
 syncSettings();
}
function entrySettings(){
 const footer=document.querySelector('.entry-footer');if(!footer||footer.querySelector('[data-entry-launch-settings]'))return;
 const button=document.createElement('button');button.type='button';button.className='motion-button';button.dataset.entryLaunchSettings='';button.textContent='Настройки запуска';
 button.addEventListener('click',()=>{
  const dialog=document.createElement('dialog');dialog.className='nexus-intro-preferences';dialog.dataset.entryIntroSettings='';dialog.innerHTML='<header><h2>Запуск Nexus</h2><button type="button" class="btn" data-intro-close>Закрыть</button></header>';
  document.body.append(dialog);mountSettings();dialog.querySelector('[data-intro-close]').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
 });footer.append(button);
}
export async function installStartupIntro({surface=document.querySelector('#app')?'shell':'entry'}={}){
 if(installed)return;installed=true;
 prepareIntroCover();
 let authIntent=0;
 if(surface==='entry'){
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-login],[data-provider-buttons] button,[data-key-access]'))authIntent=Date.now()},{capture:true});
  addEventListener('pagehide',()=>{if(authIntent&&Date.now()-authIntent<900000)try{saveIntroHandoff(sessionStorage)}catch{}},{once:true});
 }
 let handoff=false;try{handoff=surface==='shell'?consumeIntroHandoff(sessionStorage):readIntroHandoff(sessionStorage)}catch{}
 if(!await ensureStyles()){releaseIntroCover(true);return}
 mountSettings();if(surface==='entry')entrySettings();
 const observer=new MutationObserver(mountSettings);
 const app=document.querySelector('#app');if(app)observer.observe(app,{childList:true});
 observer.observe(document.body,{childList:true});addEventListener('pagehide',()=>observer.disconnect(),{once:true});
 addEventListener('storage',e=>{if(e.key===INTRO_KEY){syncSettings();if(!preference().value.enabled)active?.finish('settings',true)}});
 const start=()=>{prepareIntroCover();const state=preference();if(!handoff&&state.value.enabled&&!introCoverDismissed())showIntro();else releaseIntroCover(true)};
 // Первый видимый запуск: фокус и отсутствие Web Locks не подавляют ролик ПК.
 if(document.hidden){
  const visible=()=>{if(document.hidden)return;document.removeEventListener('visibilitychange',visible);start()};
  document.addEventListener('visibilitychange',visible);
 }else start();
}
