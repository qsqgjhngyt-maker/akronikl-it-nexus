// Проверка публичной версии. Никогда не очищает хранилища и не перезагружает редактор сама.
const participants=new Set();let mounted;
export function registerUpdateParticipant(participant){participants.add(participant);return()=>participants.delete(participant)}
export async function flushBeforeInterfaceUpdate(){
 for(const p of participants)if(p.isDirty?.())throw Error('Сначала сохраните изменения в редакторе.');
 await Promise.all([...participants].map(p=>p.flush?.()));
 for(const p of participants)if(p.isDirty?.()||p.isPending?.())throw Error('Во время сохранения появились новые изменения. Сохраните их перед обновлением.');
}
export function validInterfaceRelease(v){return !!v&&typeof v==='object'&&typeof v.version==='string'&&/^[0-9][A-Za-z0-9.+-]{0,79}$/.test(v.version)&&/^ui1a-[a-z0-9-]{1,110}$/.test(v.assetGeneration||'')}
export function workerStatus(worker,{timeout=20000}={}){
 return new Promise((resolve,reject)=>{if(!worker)return reject(Error('Новая офлайн-версия ещё не установлена.'));const c=new MessageChannel(),timer=setTimeout(()=>{c.port1.close();reject(Error('Проверка офлайн-версии не завершилась. Повторите проверку при сети.'))},timeout);c.port1.onmessage=e=>{clearTimeout(timer);c.port1.close();resolve(e.data)};worker.postMessage({type:'nexus-pwa-status'},[c.port2])});
}
export function currentInterfaceGeneration(url=import.meta.url){return new URL(url).pathname.match(/\/releases\/(ui1a-[a-z0-9-]+)\//)?.[1]||'local-source'}
export function mountInterfaceUpdate({fetchImpl=globalThis.fetch,navigatorImpl=globalThis.navigator,documentImpl=globalThis.document,locationImpl=globalThis.location,generation=currentInterfaceGeneration(),reload=()=>locationImpl.reload()}={}){
 if(mounted?.isConnected)return mounted;
 const root=documentImpl.createElement('aside');root.className='nexus-interface-update glass-panel';root.setAttribute('aria-label','Версия и обновление Nexus');root.hidden=true;
 const toggle=documentImpl.createElement('button');toggle.className='btn';toggle.textContent='Доступно обновление';toggle.type='button';toggle.setAttribute('aria-expanded','false');
 const panel=documentImpl.createElement('div');panel.hidden=true;
 const current=documentImpl.createElement('details'),caption=documentImpl.createElement('summary'),technical=documentImpl.createElement('small');caption.textContent='Сведения об установленном интерфейсе';technical.textContent=generation;current.append(caption,technical);
 const status=documentImpl.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Проверка не очищает проекты, кеши или базы.';
 const check=documentImpl.createElement('button');check.className='btn';check.type='button';check.textContent='Проверить обновление';
 const apply=documentImpl.createElement('button');apply.className='btn primary';apply.type='button';apply.textContent='Сохранить работу и обновить';apply.hidden=true;
 const close=documentImpl.createElement('button');close.className='btn';close.type='button';close.textContent='Закрыть';close.dataset.interfaceUpdateClose='';
 panel.append(current,status,check,apply,close);root.append(toggle,panel);documentImpl.body.append(root);mounted=root;
 let busy=false,target=null,ready=false,queued=false,disposed=false,manualOpen=false,hasUpdate=false,controller=new AbortController();
 const visibility=()=>{root.hidden=!manualOpen&&!hasUpdate};
 const tell=text=>{status.textContent=text};
 const examine=async()=>{
  if(disposed)return;if(busy){queued=true;return}busy=true;check.disabled=true;apply.hidden=true;ready=false;
  const timeout=new AbortController(),timer=setTimeout(()=>timeout.abort(),15000);
  try{
   tell('Проверяем опубликованную версию…');const base=locationImpl.hostname==='qsqgjhngyt-maker.github.io'?'/akronikl-it-nexus/':'/';
   const r=await fetchImpl(base+'version.json?interface-check='+Date.now(),{cache:'no-store',credentials:'omit',redirect:'error',signal:timeout.signal});
   if(!r.ok||r.redirected||!r.headers.get('content-type')?.startsWith('application/json'))throw Error('Не удалось получить текущую версию. Подключитесь к сети и повторите проверку.');
   const raw=await r.text();if(raw.length>16384)throw Error('Описание версии не прошло проверку.');const metadata=JSON.parse(raw);target={version:metadata.version,assetGeneration:metadata.releaseCandidate?.assetGeneration||metadata.assetGeneration};if(!validInterfaceRelease(target))throw Error('Описание версии не прошло проверку.');
   const reg=await navigatorImpl.serviceWorker?.getRegistration();if(!reg)throw Error('Защищённая офлайн-версия ещё не установлена. Откройте подготовку офлайна.');
   await reg.update();const proof=await workerStatus(reg.active);
   if(proof.protocol!=='nexus-verified-public-v1')throw Error('Офлайн-защита не подтвердила версию.');
   hasUpdate=target.assetGeneration!==generation;visibility();
   ready=proof.publicReady===true&&proof.generation===target.assetGeneration&&reg.active?.state==='activated'&&!reg.installing&&!reg.waiting;
   if(target.assetGeneration===generation&&ready){toggle.textContent='Проверка обновления';tell('Используется актуальная версия '+target.version+'.')}
   else if(ready){tell('Версия '+target.version+' полностью проверена и готова. Обновление выполняется только по вашей кнопке.');apply.hidden=false;toggle.textContent='Доступно обновление';panel.hidden=false;toggle.setAttribute('aria-expanded','true')}
   else{toggle.textContent=hasUpdate?'Загружается обновление':'Проверка обновления';tell('Новая версия загружается и проверяется. Текущая продолжает работать; повторите проверку после завершения загрузки.')}
  }catch(error){tell(error.name==='AbortError'?'Сеть не ответила. Текущая версия и ваши данные сохранены.':error.message)}
  finally{clearTimeout(timer);busy=false;check.disabled=false;if(queued&&!disposed){queued=false;queueMicrotask(()=>void examine())}}
 };
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(panel.hidden){manualOpen=false;visibility()}};check.onclick=()=>void examine();
 close.onclick=()=>{manualOpen=false;panel.hidden=true;toggle.setAttribute('aria-expanded','false');visibility()};
 documentImpl.addEventListener('click',event=>{if(!event.target?.closest?.('[data-interface-update-check]'))return;event.preventDefault();manualOpen=true;root.hidden=false;panel.hidden=false;toggle.textContent=hasUpdate?'Доступно обновление':'Проверка обновления';toggle.setAttribute('aria-expanded','true');void examine()},{signal:controller.signal});
 apply.onclick=async()=>{if(busy||!ready||!target)return;busy=true;apply.disabled=true;
  try{await flushBeforeInterfaceUpdate();const reg=await navigatorImpl.serviceWorker.getRegistration(),worker=reg?.active,p=await workerStatus(worker);if(p.protocol!=='nexus-verified-public-v1'||p.generation!==target.assetGeneration||p.publicReady!==true||reg.active?.state!=='activated'||reg.installing||reg.waiting)throw Error('Установка ещё не завершена. Повторите проверку.');
   // Во время проверки SW пользователь мог продолжить редактирование.
   await flushBeforeInterfaceUpdate();if(disposed||reg.active!==worker||worker.state!=='activated'||reg.installing||reg.waiting)throw Error('Установка изменилась. Повторите проверку.');tell('Работа сохранена. Открываем проверенный интерфейс…');reload()}
  catch(error){tell(error.message)}finally{busy=false;apply.disabled=false;if(queued&&!disposed){queued=false;queueMicrotask(()=>void examine())}}
 };
 navigatorImpl.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='nexus-update-ready')void examine()},{signal:controller.signal});
 globalThis.addEventListener?.('online',()=>void examine(),{signal:controller.signal});
 documentImpl.addEventListener('visibilitychange',()=>{if(documentImpl.visibilityState==='visible')void examine()},{signal:controller.signal});
 globalThis.addEventListener?.('pagehide',()=>{disposed=true;controller.abort();mounted=null},{once:true});
 if(navigatorImpl.onLine!==false)void examine();
 return root;
}
