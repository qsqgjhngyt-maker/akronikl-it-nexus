import {INTRO_KEY,INTRO_VERSION,readIntroPreference,saveIntroPreference,introVariant,staticIntro} from './startup-intro-policy.js';

let installed=false,active=null,stylesReady;
const media=name=>new URL('../intro-media/'+INTRO_VERSION+'/'+name,import.meta.url).href;
const preference=()=>{try{return readIntroPreference(localStorage)}catch{return readIntroPreference({getItem(){throw Error()}})}};
const persist=value=>{try{return saveIntroPreference(localStorage,value)}catch{return false}};
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function ensureStyles(){
 return stylesReady??=new Promise(resolve=>{
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('../styles/startup-intro.css',import.meta.url).href;
  const timer=setTimeout(()=>resolve(false),1500);
  link.onload=()=>{clearTimeout(timer);resolve(true)};link.onerror=()=>{clearTimeout(timer);resolve(false)};document.head.append(link);
 });
}
function showIntro(){
 if(active||document.hidden||document.querySelector('.nexus-route-message,.boot-error,#boot-status')||!document.querySelector('#app')?.children.length)return;
 const setting=preference().value,bindings=new AbortController(),signal=bindings.signal;
 const originFocus=document.activeElement,timers=new Set();let closing=false,played=false;
 const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id};
 const root=document.createElement('section');root.className='nexus-intro';root.dataset.startupIntro='';root.setAttribute('aria-label','Стартовая заставка Nexus');
 root.innerHTML='<div class="nexus-intro-visual" aria-hidden="true"></div><div class="nexus-intro-top"><span class="nexus-intro-wordmark">AKRONIKL <b>IT NEXUS</b></span><button type="button" class="btn nexus-intro-skip">Пропустить <span aria-hidden="true">↗</span></button></div><div class="nexus-intro-caption"><span class="eyebrow">ВАШЕ ПРОСТРАНСТВО ЗНАНИЙ</span><p>Каждая идея — начало новой вселенной.</p><small role="status">Nexus готов к работе</small></div>';
 const visual=root.querySelector('.nexus-intro-visual'),skip=root.querySelector('button'),status=root.querySelector('[role=status]');
 const video=document.createElement('video');video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='none';video.disablePictureInPicture=true;video.setAttribute('aria-hidden','true');video.tabIndex=-1;visual.append(video);
 const stopVideo=()=>{video.pause();video.removeAttribute('src');video.load()};
 const remove=()=>{root.remove();if(document.activeElement===document.body&&originFocus?.isConnected&&originFocus!==document.body)originFocus.focus({preventScroll:true})};
 const finish=(immediate=false)=>{
  if(closing)return;closing=true;bindings.abort();for(const id of timers)clearTimeout(id);timers.clear();stopVideo();active=null;
  root.style.pointerEvents='none';root.setAttribute('aria-hidden','true');skip.disabled=true;
  if(immediate||reduced())remove();else{root.classList.add('nexus-intro-leaving');setTimeout(remove,240)}
 };
 active={finish};
 skip.addEventListener('click',()=>finish(),{signal});
 addEventListener('keydown',e=>{root.dataset.keyboard='';if(e.key==='Escape'){e.preventDefault();finish()}},{signal});
 addEventListener('hashchange',()=>finish(true),{signal});addEventListener('pagehide',()=>finish(true),{signal});
 addEventListener('nexus:session-ended',()=>finish(true),{signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finish(true)},{signal});
 // Tab выводит пользователя прямо в работающий Nexus, без скрытых focus targets.
 document.addEventListener('focusin',e=>{if(!root.contains(e.target))finish(true)},{signal});
 const mq=matchMedia('(prefers-reduced-motion: reduce)');mq.addEventListener('change',()=>finish(true),{signal});
 const fallback=()=>{if(closing)return;stopVideo();root.dataset.playback='poster';status.textContent='Nexus готов к работе';later(()=>finish(),700)};
 const variant=introVariant(innerWidth,innerHeight);root.dataset.variant=variant;
 // Постер необязателен: без сети остаётся встроенный фон дизайн-системы.
 if(navigator.onLine!==false){const poster=document.createElement('img');poster.alt='';poster.src=media(variant+'.jpg');poster.addEventListener('error',()=>poster.remove(),{once:true,signal});visual.prepend(poster)}
 document.body.append(root);skip.focus({preventScroll:true});
 if(staticIntro({...setting,reducedMotion:reduced(),online:navigator.onLine,connection:navigator.connection,deviceMemory:navigator.deviceMemory,hardwareConcurrency:navigator.hardwareConcurrency})){fallback();return}
 // Поворот завершает сцену; явный повтор выберет подходящий новый формат.
 addEventListener('resize',()=>{if(introVariant(innerWidth,innerHeight)!==variant)finish(true)},{signal});addEventListener('offline',fallback,{signal});
 navigator.connection?.addEventListener('change',()=>{if(staticIntro({...setting,connection:navigator.connection}))fallback()},{signal});
 const formats=[['mp4','video/mp4; codecs="avc1.4D401F"'],['webm','video/webm; codecs="vp9"']];
 const selected=formats.find(([,type])=>video.canPlayType(type));if(!selected){fallback();return}
 video.addEventListener('error',fallback,{signal});video.addEventListener('ended',()=>finish(),{signal});
 const startupDeadline=later(()=>{if(!played)fallback()},1800);
 video.addEventListener('playing',()=>{played=true;clearTimeout(startupDeadline);timers.delete(startupDeadline);root.dataset.playback='video'},{signal});
 video.addEventListener('waiting',()=>later(()=>{if(!closing&&video.readyState<3)fallback()},1200),{signal});
 video.src=media(variant+'.'+selected[0]);video.play()?.catch(fallback);later(()=>finish(),9500);
}
function mountSettings(){
 const host=document.querySelector('[data-unified-account]');if(!host||host.querySelector('[data-intro-settings]'))return;
 const {value,writable}=preference(),panel=document.createElement('section');panel.className='account-panel glass-panel nexus-intro-settings';panel.dataset.introSettings='';
 panel.innerHTML='<span class="eyebrow">НА ЭТОМ УСТРОЙСТВЕ</span><h2>Запуск Nexus</h2><label class="nexus-switch"><span>Показывать заставку</span><input type="checkbox" data-intro-enabled></label><label class="nexus-switch"><span>Упрощённый запуск</span><input type="checkbox" data-intro-simplified></label><p>Короткая заставка появляется один раз для этой версии ролика. Упрощённый запуск использует статичный фон. Настройки действуют на этом устройстве.</p><button type="button" class="btn" data-intro-preview>Посмотреть заставку</button><p role="status" data-intro-save-status></p>';
 for(const name of ['enabled','simplified']){
  const input=panel.querySelector('[data-intro-'+name+']');input.checked=value[name];input.disabled=!writable;
  input.addEventListener('change',()=>{
   const current=preference();const ok=current.writable&&persist({...current.value,[name]:input.checked});
   panel.querySelector('[data-intro-save-status]').textContent=ok?'Настройка сохранена.':'Не удалось сохранить настройку. Заставка при запуске отключена.';
   if(!ok)input.checked=!input.checked;
   if(name==='enabled'&&!input.checked||name==='simplified'&&input.checked)active?.finish(true);
  });
 }
 if(!writable)panel.querySelector('[data-intro-save-status]').textContent='Настройка недоступна. Автоматическая заставка отключена.';
 panel.querySelector('[data-intro-preview]').addEventListener('click',showIntro);host.append(panel);
}
export async function installStartupIntro(){
 if(installed)return;installed=true;
 const app=document.querySelector('#app');if(!app)return;
 const observer=new MutationObserver(()=>{active?.finish(true);mountSettings()});observer.observe(app,{childList:true});
 addEventListener('pagehide',()=>observer.disconnect(),{once:true});
 addEventListener('storage',e=>{if(e.key===INTRO_KEY){if(!preference().value.enabled)active?.finish(true);app.querySelector('[data-intro-settings]')?.remove();mountSettings()}});
 if(!await ensureStyles())return;mountSettings();
 if(document.hidden||document.activeElement!==document.body)return;
 // Нет Web Locks / persistence — нет автопоказа. Lock охватывает read + write.
 if(!navigator.locks?.request)return;
 await navigator.locks.request('nexus-startup-intro-v1',{ifAvailable:true},lock=>{
  if(!lock||document.hidden)return;
  const state=preference();if(!state.writable||!state.value.enabled||state.value.seen===INTRO_VERSION)return;
  if(!persist({...state.value,seen:INTRO_VERSION}))return;showIntro();
 });
}
