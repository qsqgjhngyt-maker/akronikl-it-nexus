import {GRAPHICS_FRAME_CSP} from './policy.js';
const operations=new WeakMap();
// Каждый запуск получает собственный nonce и готовность loader. Поздний load предыдущей
// сцены не может забрать одноразовый обработчик следующей навигации.
export function loadVerifiedGraphicsFrame(iframe,html,{fetchImpl=globalThis.fetch,windowImpl=globalThis.window,timeout=10000}={}){
 if(!['allow-scripts','allow-scripts allow-same-origin'].includes(iframe.getAttribute('sandbox'))||typeof html!=='string'||html.length>500000)return Promise.reject(Error('Небезопасный документ сцены.'));
 operations.get(iframe)?.();
 const controller=new AbortController(),nonce=crypto.randomUUID(),url=new URL('./graphics-frame.html',import.meta.url);
 return new Promise((resolve,reject)=>{
  let done=false,sent=false;const timer=setTimeout(()=>finish(Error('Не удалось открыть изолированную сцену.')),timeout);
  function finish(error){if(done)return;done=true;clearTimeout(timer);controller.abort();if(operations.get(iframe)===cancel)operations.delete(iframe);error?reject(error):resolve()}
  const cancel=()=>finish(Error('Запуск сцены заменён новым.'));operations.set(iframe,cancel);
  windowImpl.addEventListener('message',event=>{
   if(done||event.source!==iframe.contentWindow||event.data?.nonce!==nonce)return;
   if(event.data.type==='nexus-scene-loader-ready'&&!sent){sent=true;try{iframe.contentWindow.postMessage({type:'nexus-scene-document',nonce,html},'*')}catch(error){finish(error)}}
   else if(event.data.type==='nexus-scene-document-accepted'&&sent)finish();
  },{signal:controller.signal});
  void(async()=>{try{
   const r=await fetchImpl(url,{credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
   if(!r.ok||r.headers.get('content-security-policy')!==GRAPHICS_FRAME_CSP||!/^[a-f0-9]{64}$/.test(r.headers.get('x-nexus-verified-sha256')||''))throw Error('Изоляция сцены не подтверждена.');
   await r.body?.cancel();if(done)return;
   const parent=iframe.parentNode,next=iframe.nextSibling;if(!parent)throw Error('Редактор сцены закрыт.');
   // Новый browsing context исключает same-document hash navigation и старый load.
   // Fragment остаётся локальным идентификатором; публичный ресурс проверяется без него.
   iframe.remove();iframe.setAttribute('sandbox','allow-scripts allow-same-origin');iframe.removeAttribute('srcdoc');url.hash=nonce;iframe.src=url.href;parent.insertBefore(iframe,next);
  }catch(error){if(!done)finish(error)}})();
 });
}
