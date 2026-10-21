import {HOME_SLOTS} from './content-contract.js';
import {verifiedAccount} from './account-storage.js';
import {accountControlRequest,controlMessage} from './account-control-api.js';
import {BLOG_DRAFTS} from './blog-seeds.js';
import {blogArticleMarkup,bindBlogSections} from './blog-presentation.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function bindContentEditor(root){
 const accountId=verifiedAccount()?.accountId;
 const status=root.querySelector('[data-content-status]'),host=root.querySelector('[data-content-editor]');
 const request=options=>accountControlRequest('/api/v2/account/control/content',{accountId,...options});
 let data,current,busy=false;
 const valid=()=>root.isConnected&&verifiedAccount()?.accountId===accountId;
 const mutate=async payload=>{if(busy)return;busy=true;for(const b of host.querySelectorAll('button'))b.disabled=true;try{await request({method:'POST',body:{requestId:crypto.randomUUID(),...payload}});if(valid()){status.textContent=payload.action==='publish'?'Опубликовано.':'Изменение сохранено.';await load()}}catch(e){if(valid())status.textContent=controlMessage(e)}finally{busy=false;if(valid())for(const b of host.querySelectorAll('button'))b.disabled=false}};
 function home(){
  current=null;host.innerHTML='<h2>Тексты главной страницы</h2><p>Пустое поле использует исходный текст. Сначала сохраните черновик, проверьте предпросмотр, затем опубликуйте. Учебные материалы не меняются.</p><form data-home-form>'+Object.entries(HOME_SLOTS).map(([key,slot])=>'<label>'+esc(slot.label)+'<textarea name="'+key+'" maxlength="'+slot.max+'">'+esc(data.home.draft[key]||'')+'</textarea></label>').join('')+'<div class="account-actions"><button class="btn" type="submit">Сохранить черновик</button><button class="btn" type="button" data-preview>Предпросмотр</button><button class="btn primary" type="button" data-publish>Опубликовать главную</button></div></form><div data-content-preview class="glass-panel" hidden></div>';
  const form=host.querySelector('form'),values=()=>Object.fromEntries(Object.keys(HOME_SLOTS).map(k=>[k,form.elements[k].value.trim()]).filter(([,v])=>v));
  form.onsubmit=e=>{e.preventDefault();mutate({target:'home',id:'home',slug:'',version:data.home.version,action:'save',content:values()})};
  host.querySelector('[data-preview]').onclick=()=>{const p=host.querySelector('[data-content-preview]');p.hidden=false;p.replaceChildren();for(const [k,v]of Object.entries(values())){const n=document.createElement('p');n.textContent=HOME_SLOTS[k].label+': '+v;p.append(n)}};
  host.querySelector('[data-publish]').onclick=()=>{if(confirm('Опубликовать сохранённый черновик главной страницы для пользователей Nexus?'))mutate({target:'home',id:'home',slug:'',version:data.home.version,action:'publish',content:data.home.draft})};
 }
 function post(item,preset){
  current=item||{id:crypto.randomUUID(),slug:preset?.slug||'',version:0,draft:{title:preset?.title||'',summary:preset?.summary||'',body:preset?.body||''},published:null,state:'draft'};
  host.innerHTML='<h2>'+(item?'Статья блога':'Новая статья')+'</h2><p>Сохранение изменяет только черновик. Публикация доступна всем; не добавляйте личные данные и данные входа.</p><form><label>Адрес статьи (латиница, цифры и дефис)<input name="slug" required maxlength="80" pattern="[a-z0-9]+(-[a-z0-9]+)*" value="'+esc(current.slug)+'" '+(item?'readonly':'')+'></label><label>Заголовок<input name="title" required maxlength="160" value="'+esc(current.draft.title)+'"></label><label>Кратко<textarea name="summary" maxlength="500">'+esc(current.draft.summary)+'</textarea></label><label>Текст статьи<textarea name="body" required maxlength="20000" rows="16">'+esc(current.draft.body)+'</textarea></label><div class="account-actions"><button class="btn" type="submit">Сохранить черновик</button><button class="btn" type="button" data-preview>Предпросмотр</button>'+(item?'<button class="btn primary" type="button" data-publish>Опубликовать статью</button><button class="btn" type="button" data-unpublish>Снять с публикации</button><button class="btn danger" type="button" data-delete>Удалить статью</button>':'')+'</div></form><article data-content-preview class="glass-panel" hidden></article>';
  const form=host.querySelector('form'),values=()=>({title:form.elements.title.value.trim(),summary:form.elements.summary.value.trim(),body:form.elements.body.value.trim()});
  form.onsubmit=e=>{e.preventDefault();mutate({target:'post',id:current.id,slug:form.elements.slug.value,version:current.version,action:'save',content:values()})};
  host.querySelector('[data-preview]').onclick=()=>{const p=host.querySelector('[data-content-preview]');p.hidden=false;p.innerHTML=blogArticleMarkup({...values(),slug:form.elements.slug.value},{preview:true});bindBlogSections(p)};
  for(const action of ['publish','unpublish','delete'])host.querySelector('[data-'+action+']')?.addEventListener('click',()=>{if(confirm({publish:'Опубликовать сохранённую версию статьи?',unpublish:'Снять статью с публикации?',delete:'Безвозвратно удалить статью и черновик из рабочей базы?'}[action]))mutate({target:'post',id:current.id,slug:current.slug,version:current.version,action,content:{}})});
 }
 async function load(){
  data=await request();if(!valid())return;
  const list=root.querySelector('[data-content-list]');list.replaceChildren();
  for(const p of data.posts){const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=p.draft.title+' · '+({draft:'Черновик',published:'Опубликовано',archived:'Снято с публикации'}[p.state]);b.onclick=()=>{if(!busy&&valid())post(p)};list.append(b)}
  if(current){const next=data.posts.find(p=>p.id===current.id);post(next)}else home();
 }
 root.querySelector('[data-content-home]').onclick=()=>{if(!busy&&valid())home()};root.querySelector('[data-content-new]').onclick=()=>{if(!busy&&valid())post()};
 const seeds=root.querySelector('[data-content-seeds]');
 for(const draft of BLOG_DRAFTS){const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=draft.title;button.onclick=()=>{if(busy||!valid())return;const existing=data?.posts.find(p=>p.slug===draft.slug);if(existing){post(existing);status.textContent='Статья с этим адресом уже есть. Открыта её текущая версия.';return}if(host.querySelector('form')&&!confirm('Открыть подготовленную статью? Несохранённые поля текущего редактора не будут перенесены.'))return;post(null,draft);status.textContent='Подготовленный текст открыт. Проверьте предпросмотр, сохраните черновик и опубликуйте отдельным действием.'};seeds.append(button)}
 root.querySelector('[data-content-key]').onclick=async event=>{event.target.disabled=true;try{await(await import('/account/access/passkey-client.js')).login();if(valid())status.textContent='Вход подтверждён. Повторите выбранное действие.'}catch{if(valid())status.textContent='Подтверждение не завершено. Изменений нет.'}finally{event.target.disabled=false}};
 try{await load();if(valid())status.textContent='Редактор готов. Изменения публикуются отдельным действием.'}catch(e){if(valid())status.textContent=controlMessage(e)}
}
export function contentEditorMarkup(){
 return '<section class="account-panel glass-panel" data-content-admin><h2>Контент Nexus</h2><p role="status" data-content-status>Загружаем…</p><div class="account-actions"><button class="btn" data-content-key>Подтвердить ключом</button><button class="btn" data-content-home>Главная страница</button><button class="btn primary" data-content-new>Новая статья</button></div><details class="blog-seed-list"><summary>Первые истории Nexus</summary><p>Три подготовленных текста с фотообложками. Сначала откройте и сохраните черновик. Публикация выполняется отдельно и требует серверного допуска.</p><div class="account-actions" data-content-seeds></div></details><div data-content-list class="account-actions"></div><div data-content-editor></div></section>';
}
