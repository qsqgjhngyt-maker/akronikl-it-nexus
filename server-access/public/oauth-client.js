import {ensureSafeController} from '../../pwa/client.js';
const ORIGIN='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const providers=new Map([['google',{label:'Google',host:'accounts.google.com'}],['yandex',{label:'Яндекс',host:'oauth.yandex.ru'}],['vk',{label:'VK ID',host:'id.vk.ru'}]]);
async function request(path,options={}){
 await ensureSafeController();
 if(location.origin!==ORIGIN)throw Error('FIRST_PARTY_REQUIRED');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 const signal=options.signal,abort=()=>controller.abort();
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 try{const response=await fetch(path,{...options,credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal});
  if(!response.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error('OAUTH_UNAVAILABLE');
  const text=await response.text();if(text.length>16384)throw Error('OAUTH_UNAVAILABLE');const data=JSON.parse(text);
  if(!response.ok)throw Error(data?.error?.code||'OAUTH_UNAVAILABLE');return data;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
export async function bindProviderButtons(container,{intent='login',expectedAccountId,allowedProviders,onStatus=()=>{},acquire=()=>true,release=()=>{}}={}){
 if(!container||location.origin!==ORIGIN||!['login','link'].includes(intent))return;
 let data;try{data=await request('/api/v2/account/oauth/providers',{headers:{accept:'application/json'}})}catch{return}
 if(!Array.isArray(data.providers))return;
 let busy=false,generation=0,controller=null,suspended=false;
 const lock=value=>{for(const node of container.children)node.disabled=value};
 // Leaving invalidates both successful and failed completions, including fetch mocks
 // or responses already buffered when cancellation reaches the transport.
 globalThis.addEventListener?.('pagehide',()=>{suspended=true;++generation;controller?.abort();controller=null});
 globalThis.addEventListener?.('pageshow',event=>{
  if(!event.persisted)return;suspended=false;
  if(!busy)return;
  ++generation;controller?.abort();controller=null;busy=false;lock(false);release();
  onStatus('Вы вернулись со страницы входа. Для новой попытки нажмите способ входа снова.');
 });
 for(const supplied of data.providers){
  if(allowedProviders&&!allowedProviders.includes(supplied?.id))continue;
  const definition=providers.get(supplied?.id);if(!definition||container.querySelector(`[data-provider="${supplied.id}"]`))continue;
  const button=document.createElement('button');button.type='button';button.className='provider-button btn';button.dataset.provider=supplied.id;button.textContent=(intent==='link'?'Привязать ':'Войти через ')+definition.label;
  button.addEventListener('click',async()=>{
   if(button.disabled||busy||suspended||!acquire())return;busy=true;const attempt=++generation;controller=new AbortController();lock(true);onStatus('Открываем '+definition.label+'…');
   try{const result=await request('/api/v2/account/oauth/'+supplied.id+'/start',{method:'POST',signal:controller.signal,headers:{'content-type':'application/json','x-nexus-oauth-request':'1',...(intent==='link'?{'x-nexus-oauth-account':String(expectedAccountId||'')}:{})},body:JSON.stringify({intent})});
    if(attempt!==generation||suspended)return;
    const url=new URL(result.authorizationURL);if(url.protocol!=='https:'||url.hostname!==definition.host||url.username||url.password||url.port)throw Error('OAUTH_UNAVAILABLE');location.assign(url.href);
   }catch(error){if(attempt!==generation||suspended)return;if(error.message==='ACCOUNT_SESSION_CHANGED')window.dispatchEvent(new Event('nexus:session-ended'));onStatus(error.message==='FRESH_PASSKEY_REQUIRED'?'Сначала повторите вход существующим ключом доступа, затем привяжите этот способ входа.':error.message==='OWNER_EMAIL_REQUIRED'?'Для этого аккаунта требуется подтверждённая разрешённая почта.':'Не удалось начать вход. Попробуйте ещё раз.');controller=null;busy=false;lock(false);release()}
  });container.append(button);
 }
 container.hidden=!container.children.length;
}
