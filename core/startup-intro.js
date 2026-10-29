import {INTRO_KEY,readIntroPreference,saveIntroPreference,introVariant,staticIntro,readIntroHandoff,saveIntroHandoff,consumeIntroHandoff} from './startup-intro-policy.js';
import {prepareIntroCover,releaseIntroCover,introCoverDismissed} from './startup-intro-cover.js';
import {INTRO_ASSETS as INTRO_MEDIA,INTRO_VIDEO_BASE,introVideoURL} from './startup-intro-assets.js';
import {waitForIntroBuffer} from './startup-intro-buffer.js';
import {installIntroEntryReturn,consumeIntroEntryReturn} from './startup-intro-entry-return.js';

let installed=false,active=null,stylesReady,mediaBase=INTRO_VIDEO_BASE;
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
  const label=document.createElement('div');label.className='nexus-intro-wordmark';label.setAttribute('aria-hidden','true');label.innerHTML='<svg viewBox="0 0 240 210" focusable="false"><defs><linearGradient id="nx-logo-white" x2=".9" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#c4e0ee"/></linearGradient><linearGradient id="nx-logo-cyan" x2=".1" y2="1"><stop stop-color="#d4effb"/><stop offset=".55" stop-color="#66c9ed"/><stop offset="1" stop-color="#0096d5"/></linearGradient></defs><path fill="url(#nx-logo-white)" d="M22 163 84 40Q95 18 112 18q18 0 30 23l29 57-32 18-29-57q-4-7-8 1l-37 74Z"/><path fill="url(#nx-logo-white)" d="m142 140 29-17 42 83h-32q-13 0-19-12Z"/><path fill="url(#nx-logo-cyan)" d="M9 206q-1-25 28-42c60-32 159-55 190-112-2 43-37 67-79 90L50 206Z"/></svg><strong>AKRONIKL</strong><span>IT NEXUS</span>';root.append(label);
 };wordmark();
 const makePlayer=()=>{
  // Один непрерывный поток и один decoder для каждого варианта ролика.
  const v=document.createElement('video');v.dataset.current='';v.crossOrigin='anonymous';v.muted=true;v.defaultMuted=true;v.playsInline=true;v.preload='auto';v.disablePictureInPicture=true;v.tabIndex=-1;v.setAttribute('aria-hidden','true');visual.append(v);return v;
 };
 let video=makePlayer(),playerEvents=new AbortController(),frameCallback,preparingSource='';
 const syncLogo=()=>{const visible=String(variant==='mobile'&&Number.isFinite(video.duration)&&video.currentTime>=Math.max(0,video.duration-2));if(root.dataset.logoVisible!==visible)root.dataset.logoVisible=visible};
 const trackFrame=()=>{syncLogo();if(!closing&&video.requestVideoFrameCallback)frameCallback=video.requestVideoFrameCallback(trackFrame)};
 const stopVideo=()=>{if(frameCallback!==undefined)video.cancelVideoFrameCallback?.(frameCallback);frameCallback=undefined;video.pause();video.removeAttribute('src');video.load()};
 const cleanup=()=>{
  if(removed)return;removed=true;bindings.abort();controls.abort();playerEvents.abort();for(const id of timers)clearTimeout(id);timers.clear();
  if(frameCallback!==undefined)video.cancelVideoFrameCallback?.(frameCallback);stopVideo();active=null;root.close();root.remove();delete document.documentElement.dataset.nexusIntroActive;dispatchEvent(new Event('nexus:intro-statechange'));dispatchEvent(new CustomEvent('nexus:intro-finished',{detail:completion}));
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
  cancel(startupDeadline);cancel(stallDeadline);cancel(limit);stopVideo();root.dataset.playback='poster';status.textContent='Nexus готов к работе';later(()=>finish('fallback'),variant==='mobile'&&!preview?120:1400);
 };
 let poster;
 const setPoster=()=>{
  poster.style.visibility='hidden';poster.src=media(variant+'.jpg');
  const source=poster.src;Promise.resolve(poster.decode?.()).then(()=>{if(!removed&&poster.src===source)poster.style.visibility=''}).catch(()=>{if(poster.src===source)poster.remove()});
 };
 if(navigator.onLine!==false){poster=document.createElement('img');poster.alt='';poster.decoding='async';poster.fetchPriority=variant==='mobile'?'auto':'low';poster.addEventListener('error',()=>poster.remove(),{once:true,signal});visual.prepend(poster);setPoster()}
 document.body.append(root);root.showModal();document.documentElement.dataset.nexusIntroActive='true';dispatchEvent(new Event('nexus:intro-statechange'));releaseIntroCover();root.addEventListener('cancel',e=>{e.preventDefault();finish('escape')},{signal:controls.signal});
 // Фоновые render, focus и изменение # при bootstrap не закрывают сцену.
 if(staticIntro({...setting,reducedMotion:reduced(),online:navigator.onLine,connection:navigator.connection})){fallback();return}
 const choose=variant=>[['mp4','video/mp4; codecs="'+INTRO_MEDIA[variant].mp4Codec+'"'],['webm','video/webm; codecs="vp9"']].find(([,type])=>video.canPlayType(type));
 let selected=choose(variant);if(!selected){fallback();return}
 const play=()=>{
  if(closing||document.hidden||root.dataset.playback==='poster')return;
  if(played){video.play()?.catch(e=>{if(e.name!=='AbortError')fallback()});return}
  const target=video,source=target.src;if(preparingSource===source)return;preparingSource=source;
  void waitForIntroBuffer(target,playerEvents.signal).then(ready=>{if(preparingSource===source)preparingSource='';if(target!==video||closing||document.hidden||video.src!==source||root.dataset.playback==='poster')return;if(!ready){fallback();return}video.play()?.catch(e=>{if(e.name!=='AbortError')fallback()})});
 };
 const armLimit=()=>{if(visibleAt)return;visibleAt=performance.now();limit=later(()=>finish('deadline'),Math.max(0,budget))};
 const bindPlayer=()=>{
  const signal=playerEvents.signal;
  for(const type of ['timeupdate','seeked','loadedmetadata'])video.addEventListener(type,syncLogo,{signal});
  if(variant==='mobile'&&video.requestVideoFrameCallback)frameCallback=video.requestVideoFrameCallback(trackFrame);
  video.addEventListener('error',fallback,{signal});video.addEventListener('ended',()=>finish('ended'),{signal});
  video.addEventListener('playing',()=>{played=true;cancel(startupDeadline);cancel(stallDeadline);root.dataset.playback='video';status.textContent='';armLimit()},{signal});
  video.addEventListener('waiting',()=>{
   cancel(stallDeadline);stallDeadline=later(()=>{if(!closing&&!document.hidden&&video.readyState<3)fallback()},2000);
  },{signal});
 };bindPlayer();
 const sourceURL=()=>introVideoURL(variant,selected[0],mediaBase);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){video.pause();if(visibleAt)budget-=performance.now()-visibleAt;visibleAt=0;cancel(limit);cancel(stallDeadline);cancel(startupDeadline)}
  else{if(!played)startupDeadline=later(fallback,8000);armLimit();play()}
 },{signal});
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',fallback,{signal});
 addEventListener('offline',fallback,{signal});
 addEventListener('resize',()=>{
  const next=introVariant(innerWidth,innerHeight);if(next===variant||closing||root.dataset.playback==='poster')return;
  const fraction=Number.isFinite(video.duration)&&video.duration>0?Math.min(.94,video.currentTime/video.duration):0;
  stopVideo();playerEvents.abort();for(const element of visual.querySelectorAll('video'))element.remove();
  variant=next;root.dataset.variant=next;video=makePlayer();playerEvents=new AbortController();played=false;preparingSource='';delete root.dataset.playback;bindPlayer();cancel(startupDeadline);cancel(stallDeadline);startupDeadline=later(fallback,8000);wordmark();syncLogo();if(poster)setPoster();selected=choose(next);if(!selected){fallback();return}
  video.addEventListener('loadedmetadata',()=>{if(fraction)video.currentTime=fraction*video.duration;play()},{once:true,signal});
  video.src=sourceURL();play();
 },{signal});
 startupDeadline=later(fallback,8000);armLimit();video.src=sourceURL();requestAnimationFrame(()=>requestAnimationFrame(play));
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
export async function installStartupIntro({surface=document.querySelector('#app')?'shell':'entry',videoBase=INTRO_VIDEO_BASE}={}){
 if(installed)return;installed=true;
 mediaBase=videoBase;
 installIntroEntryReturn({surface});
 prepareIntroCover();
 let authIntent=0;
 if(surface==='entry'){
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-login],[data-provider-buttons] button,[data-key-access]'))authIntent=Date.now()},{capture:true});
  addEventListener('pagehide',()=>{if(authIntent&&Date.now()-authIntent<900000)try{saveIntroHandoff(sessionStorage)}catch{}},{once:true});
 }
 let handoff=false;try{handoff=surface==='shell'?consumeIntroHandoff(sessionStorage):(consumeIntroEntryReturn(sessionStorage)||readIntroHandoff(sessionStorage))}catch{}
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
