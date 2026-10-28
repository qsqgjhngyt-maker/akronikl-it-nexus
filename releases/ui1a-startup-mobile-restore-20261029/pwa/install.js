// Системное приглашение — только по нажатию пользователя, один вызов на event.
// Никаких credentials, сетевых запросов, APK или изменений пользовательских данных.
export function bindInstallButton({windowRef=globalThis.window,documentRef=globalThis.document,navigatorRef=globalThis.navigator}={}){
 if(!windowRef||!documentRef)return;
 const mount=documentRef.querySelector('[data-install-mount]')||documentRef.querySelector('.access-card');
 if(!mount)return;
 if(mount.querySelector('.nexus-install'))return;
 let promptEvent=null,busy=false,disposed=false,confirmedInstalled=false;
 const mode=windowRef.matchMedia('(display-mode: standalone)'),controller=new AbortController(),options={signal:controller.signal};
 const installed=()=>confirmedInstalled||mode.matches||navigatorRef?.standalone===true;
 const apple=/iPhone|iPad|iPod/.test(navigatorRef?.userAgent||'')||navigatorRef?.platform==='MacIntel'&&navigatorRef?.maxTouchPoints>1;
 const block=documentRef.createElement('div');block.className='nexus-install';
 const button=documentRef.createElement('button');button.type='button';button.className='install-button';button.textContent='Установить Nexus';button.dataset.install='';
 const note=documentRef.createElement('p');note.className='install-note';note.setAttribute('role','status');note.setAttribute('aria-live','polite');
 block.append(button,note);mount.append(block);
 const update=()=>{if(disposed)return;block.hidden=installed();button.disabled=busy;button.textContent=busy?'Открываем установку…':'Установить Nexus'};
 const instructions=()=>apple?'На iPhone или iPad откройте меню «Поделиться» браузера (Safari или Яндекс), выберите «На экран “Домой”» и подтвердите добавление.':'Откройте меню браузера → «Установить приложение». В Яндекс Браузере пункт может называться «Добавить на главный экран». Если доступен только ярлык, системная установка пока не предложена: проверьте подключение и откройте Nexus в обычной вкладке Chrome, Samsung Internet или Яндекс.';
 windowRef.addEventListener('beforeinstallprompt',event=>{if(typeof event.prompt!=='function')return;event.preventDefault();promptEvent=event;note.textContent='';update()},options);
 windowRef.addEventListener('appinstalled',()=>{confirmedInstalled=true;promptEvent=null;note.textContent='Nexus установлен.';update()},options);
 mode.addEventListener?.('change',update,options);
 button.addEventListener('click',async()=>{
  if(busy||installed())return;
  if(!promptEvent){note.textContent=instructions();return}
  const event=promptEvent;promptEvent=null;busy=true;note.textContent='';update();
  try{
   // prompt() вызывается синхронно внутри gesture до первого await.
   const result=event.prompt();await result;
   const choice=await event.userChoice;
   if(!disposed)note.textContent=choice?.outcome==='accepted'?'Установка подтверждена. Завершение выполняет браузер.':'Установка отменена. Её можно снова выбрать в меню браузера.';
  }catch{if(!disposed)note.textContent='Диалог установки недоступен. '+instructions()}
  finally{busy=false;update()}
 },options);
 update();
 return ()=>{disposed=true;controller.abort();block.remove();promptEvent=null};
}
