import {HOME_SLOTS} from './content-contract.js';
import {blogPageMarkup,blogIndexMarkup,blogArticleMarkup,blogCardMarkup,bindBlogSections} from './blog-presentation.js';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function blogMarkup(){return blogPageMarkup({article:new URLSearchParams(globalThis.location?.hash?.slice(1)||'').has('article')})}
export async function bindPublicContent(route){
 const blog=document.querySelector('[data-blog-feed]'),home=document.querySelector('.visual-home');if(!blog&&!home)return;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const slug=route.view==='blog'?new URLSearchParams(location.hash.slice(1)).get('article'):null;
  const response=await fetch('/api/v2/content/feed'+(slug?'?slug='+encodeURIComponent(slug):''),{credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal,headers:{accept:'application/json'}});
  if(!response.ok)throw Error();const data=await response.json();
  if(!Array.isArray(data.posts)||data.posts.length>20||data.posts.some(p=>!p||typeof p.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)||p.slug.length>80||typeof p.title!=='string'||typeof p.summary!=='string'||(slug&&typeof p.body!=='string')))throw Error();
  if(home?.isConnected){
   for(const [key,text]of Object.entries(data.home||{})){const slot=HOME_SLOTS[key],node=slot&&home.querySelector(slot.selector);if(node&&typeof text==='string')node.textContent=text}
   if(data.posts.length&&!home.querySelector('[data-blog-preview]')){
    const section=document.createElement('section');section.className='visual-section';section.dataset.blogPreview='';
    section.classList.add('blog-preview');
    section.innerHTML='<div class="section-head"><div><span class="eyebrow">NEXUS JOURNAL</span><h2>Истории и открытия</h2></div><a class="visual-text-link" href="#view=blog">Все статьи →</a></div><div class="blog-grid">'+data.posts.slice(0,3).map(p=>blogCardMarkup(p)).join('')+'</div>';
    const target=home.querySelector('.visual-account-area');if(target)target.before(section);else home.append(section);
   }
  }
  if(blog?.isConnected){
   blog.innerHTML=slug?(data.posts.length?blogArticleMarkup(data.posts[0]):'<p role="status">Статья не опубликована или снята с публикации.</p>'):blogIndexMarkup(data.posts);
   bindBlogSections(blog);
  }
 }catch{if(blog?.isConnected)blog.textContent='Не удалось загрузить блог. Обновите страницу, чтобы повторить.'}
 finally{clearTimeout(timer)}
}
