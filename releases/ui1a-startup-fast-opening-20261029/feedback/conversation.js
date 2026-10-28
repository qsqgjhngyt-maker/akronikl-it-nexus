const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const closeConversationDialogs=()=>{for(const d of document.querySelectorAll('[data-community-dialog]'))d.remove()};
globalThis.addEventListener?.('pagehide',closeConversationDialogs);
globalThis.addEventListener?.('nexus:session-ended',closeConversationDialogs);
export function bindConversationActions(container,items,{api,refresh,moderator=false}){
 for(const item of items){
  const anchor=[...container.querySelectorAll('[data-feedback-history],[data-history]')].find(n=>(n.dataset.feedbackHistory||n.dataset.history)===item.id);
  if(!anchor||anchor.parentElement.querySelector('[data-conversation]'))continue;
  const open=document.createElement('button');open.className='btn';open.type='button';open.dataset.conversation=item.id;open.textContent='Переписка с командой';
  const remove=document.createElement('button');remove.className='btn danger';remove.type='button';remove.dataset.feedbackDelete=item.id;remove.textContent='Удалить';
  anchor.after(open,remove);
  const dialog=title=>{
   const d=document.createElement('dialog');d.className='feedback-dialog glass-panel';d.dataset.communityDialog='';
   d.innerHTML='<header><h2>'+esc(title)+'</h2><button class="btn" type="button" data-close>Закрыть</button></header><div data-body></div><p role="status" data-result></p>';
   document.body.append(d);d.querySelector('[data-close]').onclick=()=>d.close();d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return d;
  };
  remove.onclick=()=>{
   const d=dialog(item.kind==='review'?'Удалить отзыв?':'Удалить обращение?'),body=d.querySelector('[data-body]');
   body.innerHTML='<p>Из рабочей серверной базы удалятся текст, его версии и переписка. Публикация также исчезнет. Это действие нельзя отменить. Резервные и сохранённые на устройствах копии не стираются удалённо.</p><button class="btn danger" type="button" data-confirm-delete>Да, удалить</button>';
   body.querySelector('button').onclick=async event=>{
    event.target.disabled=true;
    try{await api('items/'+item.id+'/delete',{method:'POST',body:{requestId:crypto.randomUUID(),version:item.version}});d.close();await refresh()}
    catch(error){if(d.isConnected){d.querySelector('[data-result]').textContent=error.code==='STALE_VERSION'?'Запись изменилась. Закройте окно и обновите список.':'Удаление не подтверждено. Обновите список перед новой попыткой.';event.target.disabled=false}}
   };
  };
  open.onclick=()=>{
   const d=dialog(moderator?'Переписка с пользователем':'Переписка с командой'),body=d.querySelector('[data-body]');
   body.innerHTML='<p class="feedback-muted">Эта переписка закрыта: её видят автор обращения и команда.</p><div data-replies></div><form data-reply-form><label>Ваш ответ<textarea name="body" required maxlength="4000" rows="4"></textarea></label><button class="btn primary" type="submit">Отправить ответ</button></form>';
   const list=body.querySelector('[data-replies]'),form=body.querySelector('form'),status=d.querySelector('[data-result]');
   let busy=false,offset=0;
   async function load(){
    const data=await api('items/'+item.id+'/conversation?offset='+offset);if(!d.isConnected)return;
    list.replaceChildren();
    const original=document.createElement('article');original.className='feedback-event';const quote=document.createElement('p');quote.textContent=item.body;original.append(quote);list.append(original);
    for(const r of data.replies){
     const article=document.createElement('article');article.className='feedback-event';article.innerHTML='<strong>'+esc(r.authorName)+(r.team?' · команда':'')+'</strong><small>'+esc(new Date(r.createdAt).toLocaleString('ru-RU'))+'</small><p class="community-text">'+esc(r.deleted?'Сообщение удалено':r.body)+'</p>';
     if(!r.deleted&&(r.mine||moderator)){
      const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='Удалить сообщение';b.dataset.replyDelete=r.id;
      b.onclick=async()=>{if(busy||!confirm('Удалить это сообщение из переписки?'))return;busy=true;b.disabled=true;try{await api('items/'+item.id+'/replies/'+r.id+'/delete',{method:'POST',body:{requestId:crypto.randomUUID(),version:r.version}});await load()}catch{status.textContent='Удаление не подтверждено. Обновите переписку.'}finally{busy=false;if(b.isConnected)b.disabled=false}};
      article.append(b);
     }
     list.append(article);
    }
    if(data.total>50){
     const paging=document.createElement('div');paging.className='account-actions';
     for(const [label,next,disabled]of [['Раньше',Math.max(0,offset-50),offset===0],['Далее',offset+50,offset+50>=data.total]]){
      const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=label;b.disabled=disabled;b.onclick=()=>{offset=next;load().catch(()=>{status.textContent='Не удалось загрузить страницу переписки.'})};paging.append(b);
     }
     list.append(paging);
    }
   }
   form.onsubmit=async event=>{
    event.preventDefault();if(busy)return;busy=true;const button=form.querySelector('button');button.disabled=true;status.textContent='Отправляем…';
    try{await api('items/'+item.id+'/replies',{method:'POST',body:{requestId:crypto.randomUUID(),body:form.elements.body.value}});if(!d.isConnected)return;form.reset();offset=0;await load();status.textContent='Ответ отправлен.'}
    catch{if(d.isConnected)status.textContent='Ответ не подтверждён. Проверьте переписку перед повторной отправкой.'}
    finally{busy=false;if(button.isConnected)button.disabled=false}
   };
   load().catch(()=>{if(d.isConnected)status.textContent='Не удалось открыть переписку.'});
  };
 }
}
