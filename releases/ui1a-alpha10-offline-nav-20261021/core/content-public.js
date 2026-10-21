import {HOME_SLOTS} from './content-contract.js';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function blogMarkup(){return '<section class="feedback-page"><header class="feedback-head glass-panel"><span class="eyebrow">NEXUS · БЛОГ</span><h1>Новости и заметки команды</h1><p>Обновления Nexus, планы и жизнь проекта.</p></header><div data-blog-feed role="status">Загружаем статьи…</div></section>'}
export async function bindPublicContent(route){
 const blog=document.querySelector('[data-blog-feed]'),home=document.querySelector('.visual-home');if(!blog&&!home)return;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const slug=route.view==='blog'?new URLSearchParams(location.hash.slice(1)).get('article'):null;
  const response=await fetch('/api/v2/content/feed'+(slug?'?slug='+encodeURIComponent(slug):''),{credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal,headers:{accept:'application/json'}});
  if(!response.ok)throw Error();const data=await response.json();
  if(home?.isConnected){
   for(const [key,text]of Object.entries(data.home||{})){const slot=HOME_SLOTS[key],node=slot&&home.querySelector(slot.selector);if(node&&typeof text==='string')node.textContent=text}
   if(data.posts.length&&!home.querySelector('[data-blog-preview]')){
    const section=document.createElement('section');section.className='visual-section';section.dataset.blogPreview='';
    section.innerHTML='<div class="section-head"><h2>Из блога Nexus</h2><a href="#view=blog">Все статьи →</a></div><div class="feedback-review-grid"></div>';
    for(const post of data.posts.slice(0,3)){
     const card=document.createElement('article');card.className='feedback-card glass-panel';
     card.innerHTML='<h3>'+escape(post.title)+'</h3><p>'+escape(post.summary)+'</p><a class="btn" href="#view=blog&amp;article='+encodeURIComponent(post.slug)+'">Читать статью</a>';
     section.querySelector('.feedback-review-grid').append(card);
    }
    const target=home.querySelector('.visual-account-area');if(target)target.before(section);else home.append(section);
   }
  }
  if(blog?.isConnected){
   blog.replaceChildren();
   if(!data.posts.length){blog.textContent=slug?'Статья не опубликована или снята с публикации.':'Скоро здесь появятся первые статьи команды.';return}
   for(const post of data.posts){
    const card=document.createElement('article');card.className='feedback-card glass-panel';card.innerHTML='<h2>'+escape(post.title)+'</h2><small>'+escape(new Date(post.publishedAt).toLocaleDateString('ru-RU'))+'</small><p class="community-text">'+escape(post.summary)+'</p>';
    if(slug){const body=document.createElement('p');body.className='community-text';body.textContent=post.body;card.append(body);const back=document.createElement('a');back.href='#view=blog';back.className='btn';back.textContent='Все статьи';card.append(back)}
    else{const link=document.createElement('a');link.href='#view=blog&article='+encodeURIComponent(post.slug);link.className='btn';link.textContent='Читать статью';card.append(link)}
    blog.append(card);
   }
  }
 }catch{if(blog?.isConnected)blog.textContent='Не удалось загрузить блог. Обновите страницу, чтобы повторить.'}
 finally{clearTimeout(timer)}
}
