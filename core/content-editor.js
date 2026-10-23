import {bindBlogLayoutEditor} from './blog-layout-editor.js';
import {bindBlogMedia,restoreLayoutArticle} from './blog-layout.js';
import {registerUpdateParticipant} from '../pwa/interface-update.js';
import {HOME_SLOTS} from './content-contract.js';
import {verifiedAccount} from './account-storage.js';
import {accountControlRequest,controlMessage} from './account-control-api.js';
import {BLOG_DRAFTS} from './blog-seeds.js';
import {blogArticleMarkup,bindBlogSections} from './blog-presentation.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sameDraft=(a,b)=>!!a&&!!b&&['title','summary','body'].every(key=>a[key]===b[key]);
export async function bindContentEditor(root){
 const accountId=verifiedAccount()?.accountId;
 const status=root.querySelector('[data-content-status]'),host=root.querySelector('[data-content-editor]'),list=root.querySelector('[data-content-list]'),refresh=root.querySelector('[data-content-refresh]');
 const request=async(options={})=>{const {path='/api/v2/account/control/content',...rest}=options;const data=await accountControlRequest(path,{accountId,...rest});if(Array.isArray(data.posts))data.posts=data.posts.map(p=>({...p,draft:restoreLayoutArticle(p.draft),published:p.published?restoreLayoutArticle(p.published):null}));return data};
 let layoutEditor,unregisterUpdate,data,current,busy=false,loading=null,ready=false,conflict=false,awaitingRead=null,keyConfirmation=null;
 const valid=()=>root.isConnected&&verifiedAccount()?.accountId===accountId;
 const message=(text,state)=>{if(valid()){status.textContent=text;root.dataset.contentState=state}};
 function confirmKey(){
  if(keyConfirmation)return keyConfirmation;
  if(busy||loading||!ready||conflict||!valid())return Promise.reject(Error('Сначала дождитесь загрузки списка статей.'));
  const button=root.querySelector('[data-content-key]');button.disabled=true;
  keyConfirmation=(async()=>{try{await(await import('/account/access/passkey-client.js')).login();if(!valid())throw Object.assign(Error('ACCOUNT_SESSION_CHANGED'),{code:'ACCOUNT_SESSION_CHANGED'})}catch(error){throw Object.assign(Error(controlMessage(error)),{code:error.code||'',name:error.name})}finally{keyConfirmation=null;if(valid())button.disabled=false}})();return keyConfirmation;
 }
 function controls(){
  const locked=busy||!!loading;
  for(const button of root.querySelectorAll('[data-content-home],[data-content-new],[data-content-seeds] button,[data-content-list] button'))button.disabled=locked||!ready;
  refresh.disabled=locked;
  for(const field of host.querySelectorAll('input,textarea'))if(!field.closest('[data-blog-layout]'))field.disabled=busy;
  for(const button of host.querySelectorAll('button'))if(!button.closest('[data-blog-layout]'))button.disabled=locked||(!button.hasAttribute('data-preview')&&(!ready||conflict));
  layoutEditor?.setLocked(locked||!ready||conflict);
 }
 function selectSaved(){
  const pending=awaitingRead;
  if(!pending)return;
  const saved=data.posts.find(p=>p.id===pending.id)||data.posts.find(p=>p.slug===pending.slug);
  if(saved&&sameDraft(saved.draft,pending.content)){post(saved);awaitingRead=null;message('Сохранённая версия подтверждена сервером. Статью можно опубликовать отдельным действием.','ready');return}
  conflict=!!saved;awaitingRead=null;
  message(saved?'Список обновлён. Сохранённая статья отличается от полей редактора. Введённый текст оставлен; откройте нужный черновик из списка.':'Список обновлён. Введённые поля сохранены в редакторе; автоматического повтора записи нет.',saved?'conflict':'ready');
 }
 function load(){
  if(loading)return loading;
  loading=(async()=>{
   try{
    const next=await request();if(!valid())return false;
    if(!Array.isArray(next?.posts)||!next.home)throw Error('CONTROL_UNAVAILABLE');
    data=next;ready=true;list.replaceChildren();
    if(!data.posts.length){const p=document.createElement('p');p.textContent='Сохранённых статей пока нет.';list.append(p)}
    for(const item of data.posts){const button=document.createElement('button');button.className='btn';button.type='button';button.textContent=item.draft.title+' · '+({draft:'Черновик',published:'Опубликовано',archived:'Снято с публикации'}[item.state]);button.onclick=()=>{if(!busy&&!loading&&ready&&valid()){post(item);message('Открыта сохранённая версия статьи.','ready')}};list.append(button)}
    return true;
   }catch(error){if(valid()){ready=false;message('Не удалось загрузить сохранённые статьи. '+controlMessage(error)+' Нажмите «Обновить список». Поля редактора сохранены.','read-error')}return false}
   finally{loading=null;if(valid())controls()}
  })();controls();return loading;
 }
 async function mutate(payload){
  if(busy||loading||!ready||conflict||!valid())return;
  busy=true;controls();let committed=false;
  try{
   await request({method:'POST',body:{requestId:crypto.randomUUID(),...payload}});committed=true;if(!valid())return;
   if(!await load()){
    awaitingRead=payload.target==='post'?{id:payload.id,slug:payload.slug,content:payload.action==='save'?payload.content:current?.draft}:null;
    message('Сервер подтвердил изменение, но список не обновился. Нажмите «Обновить список»; повторная запись не запускается.','read-error');return;
   }
   if(payload.target==='home'||payload.action==='delete')home();
   else{const saved=data.posts.find(p=>p.id===payload.id);if(!saved){ready=false;message('Изменение подтверждено, но статья отсутствует в полученном списке. Обновите список.','read-error');return}post(saved)}
   message(payload.action==='publish'?'Опубликовано.':'Изменение сохранено.','ready');
  }catch(error){
   if(!valid())return;
   if(payload.target==='post'&&['CONTROL_CONFLICT','CONTROL_UNAVAILABLE','CONTROL_WRITE_UNCONFIRMED'].includes(error.code||error.message)){
    awaitingRead={id:payload.id,slug:payload.slug,content:payload.action==='save'?payload.content:current?.draft};
    if(await load())selectSaved();
   }else message(controlMessage(error),committed?'read-error':'write-error');
  }finally{busy=false;if(valid())controls()}
 }
 function home(){
  if(!ready)return;layoutEditor?.dispose();layoutEditor=null;unregisterUpdate?.();unregisterUpdate=null;current=null;conflict=false;awaitingRead=null;
  const version=data.home.version;
  host.innerHTML='<h2>Тексты главной страницы</h2><p>Пустое поле использует исходный текст. Сначала сохраните черновик, проверьте предпросмотр, затем опубликуйте. Учебные материалы не меняются.</p><form data-home-form>'+Object.entries(HOME_SLOTS).map(([key,slot])=>'<label>'+esc(slot.label)+'<textarea name="'+key+'" maxlength="'+slot.max+'">'+esc(data.home.draft[key]||'')+'</textarea></label>').join('')+'<div class="account-actions"><button class="btn" type="submit">Сохранить черновик</button><button class="btn" type="button" data-preview>Предпросмотр</button><button class="btn primary" type="button" data-publish>Опубликовать главную</button></div></form><div data-content-preview class="glass-panel" hidden></div>';
  let dirty=false;unregisterUpdate=registerUpdateParticipant({isDirty:()=>valid()&&dirty});host.addEventListener('input',()=>{dirty=true},{once:true});
  const form=host.querySelector('form'),values=()=>Object.fromEntries(Object.keys(HOME_SLOTS).map(k=>[k,form.elements[k].value.trim()]).filter(([,v])=>v));
  form.onsubmit=e=>{e.preventDefault();void mutate({target:'home',id:'home',slug:'',version,action:'save',content:values()})};
  host.querySelector('[data-preview]').onclick=()=>{const p=host.querySelector('[data-content-preview]');p.hidden=false;p.replaceChildren();for(const [k,v]of Object.entries(values())){const n=document.createElement('p');n.textContent=HOME_SLOTS[k].label+': '+v;p.append(n)}};
  host.querySelector('[data-publish]').onclick=()=>{if(confirm('Опубликовать сохранённый черновик главной страницы для пользователей Nexus?'))void mutate({target:'home',id:'home',slug:'',version,action:'publish',content:data.home.draft})};controls();
 }
 function post(item,preset){
  layoutEditor?.dispose();unregisterUpdate?.();
  current=item||{id:crypto.randomUUID(),slug:preset?.slug||'',version:0,draft:{title:preset?.title||'',summary:preset?.summary||'',body:preset?.body||''},published:null,state:'draft'};conflict=false;awaitingRead=null;
  const selected=current;
  host.innerHTML='<h2>'+(item?'Статья блога':'Новая статья')+'</h2><p>Сохранение изменяет только черновик. Публикация доступна всем; не добавляйте личные данные и данные входа.</p><form><label>Адрес статьи (латиница, цифры и дефис)<input name="slug" required maxlength="80" pattern="[a-z0-9]+(-[a-z0-9]+)*" value="'+esc(current.slug)+'" '+(item?'readonly':'')+'></label><label>Заголовок<input name="title" required maxlength="160" value="'+esc(current.draft.title)+'"></label><label>Кратко<textarea name="summary" maxlength="500">'+esc(current.draft.summary)+'</textarea></label><div data-blog-layout></div><div class="account-actions"><button class="btn" type="submit">Сохранить черновик</button><button class="btn" type="button" data-preview>Предпросмотр</button>'+(item?'<button class="btn primary" type="button" data-publish>Опубликовать статью</button><button class="btn" type="button" data-unpublish>Снять с публикации</button><button class="btn danger" type="button" data-delete>Удалить статью</button>':'')+'</div></form><article data-content-preview class="glass-panel" hidden></article>';
  const form=host.querySelector('form'),values=()=>({title:form.elements.title.value.trim(),summary:form.elements.summary.value.trim(),body:layoutEditor.body()});
  let dirty=false;
  layoutEditor=bindBlogLayoutEditor({host:host.querySelector('[data-blog-layout]'),body:current.draft.body,isCurrent:()=>valid()&&current===selected,
   confirmPhotoAccess:confirmKey,
   getMediaAvailability:async()=>{const data=await request({path:'/api/v2/account/control/content?mediaStatus=1'});return data.mediaAvailability},
   privateRead:(path,{signal}={})=>request({method:'GET',path,signal}),
   uploadPhoto:async jpegBase64=>{if(busy||loading||!ready||conflict||!valid())throw Error('Сначала дождитесь загрузки списка статей.');try{return await request({method:'POST',body:{requestId:crypto.randomUUID(),target:'media',id:crypto.randomUUID(),slug:'',version:0,action:'upload',content:{jpegBase64}}})}catch(error){throw Object.assign(Error(controlMessage(error)),{code:error.code||error.message,status:error.status})}},
   onChange:()=>{dirty=true},onStatus:text=>message(text,'ready')});
  // GET photos uses the same server-checked Account expectation and never a public draft URL.
  form.addEventListener('input',()=>{dirty=true});
  unregisterUpdate=registerUpdateParticipant({isDirty:()=>valid()&&(dirty||busy||!!layoutEditor?.isBusy())});

  form.onsubmit=e=>{e.preventDefault();try{void mutate({target:'post',id:selected.id,slug:form.elements.slug.value,version:selected.version,action:'save',content:values()})}catch(error){message(error.message,'write-error')}};
  host.querySelector('[data-preview]').onclick=()=>{const p=host.querySelector('[data-content-preview]');p.hidden=false;try{p.innerHTML=blogArticleMarkup({...values(),slug:form.elements.slug.value},{preview:true});bindBlogSections(p);void bindBlogMedia(p,{privateRead:path=>request({path}),isCurrent:valid})}catch(error){message(error.message,'write-error')}};
  for(const action of ['publish','unpublish','delete'])host.querySelector('[data-'+action+']')?.addEventListener('click',()=>{if(action==='publish'&&dirty){message('Сначала сохраните изменения статьи. Публикуется только подтверждённая сервером версия.','ready');return}if(confirm({publish:'Опубликовать сохранённую версию статьи?',unpublish:'Снять статью с публикации?',delete:'Безвозвратно удалить статью и черновик из рабочей базы?'}[action]))void mutate({target:'post',id:selected.id,slug:selected.slug,version:selected.version,action,content:action==='publish'?{layoutVersion:1}:{}})});controls();
 }
 root.querySelector('[data-content-home]').onclick=()=>{if(!busy&&!loading&&ready&&valid())home()};root.querySelector('[data-content-new]').onclick=()=>{if(!busy&&!loading&&ready&&valid())post()};
 for(const draft of BLOG_DRAFTS){const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=draft.title;button.onclick=()=>{if(busy||loading||!ready||!valid())return;const existing=data.posts.find(p=>p.slug===draft.slug);if(existing){post(existing);message('Статья с этим адресом уже есть. Открыта её текущая версия.','ready');return}if(host.querySelector('form')&&!confirm('Открыть подготовленную статью? Несохранённые поля текущего редактора не будут перенесены.'))return;post(null,draft);message('Подготовленный текст открыт. Проверьте предпросмотр, сохраните черновик и опубликуйте отдельным действием.','ready')};root.querySelector('[data-content-seeds]').append(button)}
 refresh.onclick=async()=>{if(busy||loading||!valid())return;const pending=awaitingRead;if(await load()){if(pending)selectSaved();else{if(!host.querySelector('form'))home();message('Список обновлён. Выберите нужную сохранённую статью. Поля редактора оставлены.','ready')}}};
 root.querySelector('[data-content-key]').onclick=async event=>{if(busy||loading)return;event.target.disabled=true;try{await confirmKey();if(valid())message('Вход подтверждён. Повторите выбранное действие.','ready')}catch(error){if(valid())message(error.message,'write-error')}finally{event.target.disabled=false}};
 controls();if(await load()){home();message('Редактор готов. Изменения публикуются отдельным действием.','ready')}
}
export function contentEditorMarkup(){
 return '<section class="account-panel glass-panel" data-content-admin><h2>Контент Nexus</h2><p role="status" aria-live="polite" data-content-status>Загружаем сохранённые статьи…</p><div class="account-actions"><button class="btn" data-content-key>Подтвердить ключом</button><button class="btn" data-content-refresh>Обновить список</button><button class="btn" data-content-home disabled>Главная страница</button><button class="btn primary" data-content-new disabled>Новая статья</button></div><details class="blog-seed-list"><summary>Первые истории Nexus</summary><p>Три подготовленных текста с фотообложками. Сначала откройте и сохраните черновик. Публикация выполняется отдельно и требует серверного допуска.</p><div class="account-actions" data-content-seeds></div></details><h3>Сохранённые статьи</h3><div data-content-list class="account-actions"></div><div data-content-editor></div></section>';
}
