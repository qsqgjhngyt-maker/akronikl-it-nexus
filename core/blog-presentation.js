import {decodeBlogLayout,blogLayoutMarkup,layoutText,validLayoutImage} from './blog-layout.js';
// Только представление публичных статей. Произвольный HTML и URL не исполняются.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const covers={
 'dobro-pozhalovat-v-nexus':{file:'welcome',category:'Жизнь Nexus',alt:'Рабочее место у окна в синих вечерних тонах'},
 'nexus-bez-interneta':{file:'offline',category:'Практика',alt:'Ноутбук и блокнот у окна с видом на горы'},
 'ot-uroka-k-proektu':{file:'project',category:'Учиться и создавать',alt:'Открытый блокнот, ноутбук и настольная лампа'}
};
const asset=(file,size)=>new URL('../assets/blog/'+file+'-'+size+'.webp',import.meta.url).href;
export function coverFor(slug){return Object.hasOwn(covers,slug)?covers[slug]:null}
export function readingMinutes(body=''){return Math.max(1,Math.ceil(String(decodeBlogLayout(body)?layoutText(decodeBlogLayout(body)):body).trim().split(/\s+/).filter(Boolean).length/180))}
function date(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}):''}
function photo(post,{hero=false}={}){const custom=post.cover||decodeBlogLayout(post.body)?.cover;if(custom){if(!validLayoutImage(custom))throw Error('INVALID_INPUT');return `<img class="blog-photo" data-blog-media="${custom.mediaId}" alt="${esc(custom.alt)}" style="object-position:${custom.focusX}% ${custom.focusY}%" decoding="async">`}const c=coverFor(post.slug);return c?`<img class="blog-photo" src="${esc(asset(c.file,768))}" srcset="${esc(asset(c.file,768))} 768w, ${esc(asset(c.file,1536))} 1536w" sizes="${hero?'(max-width: 760px) 100vw, 1100px':'(max-width: 760px) 100vw, 540px'}" width="1536" height="1024" alt="${esc(c.alt)}" loading="${hero?'eager':'lazy'}" decoding="async">`:'<div class="blog-photo blog-photo-placeholder" aria-hidden="true"><span>ANX</span><small>NEXUS JOURNAL</small></div>'}
const meta=post=>`<div class="blog-meta"><span>${esc(coverFor(post.slug)?.category||'Заметки команды')}</span>${post.publishedAt?`<time>${esc(date(post.publishedAt))}</time>`:''}${typeof post.body==='string'?`<span>${readingMinutes(post.body)} мин чтения</span>`:''}</div>`;
export function blogCardMarkup(post,{featured=false}={}){
 const href='#view=blog&article='+encodeURIComponent(post.slug);
 return `<article class="blog-card glass-panel ${featured?'blog-card-featured':''}"><a class="blog-photo-link" href="${esc(href)}" tabindex="-1" aria-hidden="true">${photo(post,{hero:featured})}</a><div class="blog-card-copy">${meta(post)}<h2><a href="${esc(href)}">${esc(post.title)}</a></h2><p>${esc(post.summary)}</p><a class="blog-read" href="${esc(href)}">Читать историю <span aria-hidden="true">↗</span></a></div></article>`;
}
export function blogIndexMarkup(posts,{snapshot=false}={}){
 if(!posts.length)return '<div class="blog-empty glass-panel"><h2>Готовим первые истории</h2><p>Здесь появятся опубликованные заметки команды.</p></div>';
 return `${snapshot?'<p class="blog-snapshot">Подготовленные статьи этой версии доступны на устройстве. Свежие публикации и изменения редакции появятся при подключении.</p>':''}<div class="blog-feature">${blogCardMarkup(posts[0],{featured:true})}</div><div class="blog-grid">${posts.slice(1).map(p=>blogCardMarkup(p)).join('')}</div>`;
}
export function blogBodyMarkup(body){
 const layout=decodeBlogLayout(body);if(layout)return blogLayoutMarkup(layout);
 const blocks=String(body||'').replace(/\r\n?/g,'\n').split(/\n\s*\n/).filter(x=>x.trim());
 return blocks.map((b,i)=>{
  if(/^## /.test(b)&&!b.includes('\n'))return `<h2 id="blog-section-${i}">${esc(b.slice(3))}</h2>`;
  if(b.split('\n').every(l=>/^- /.test(l)))return '<ul>'+b.split('\n').map(l=>'<li>'+esc(l.slice(2))+'</li>').join('')+'</ul>';
  if(/^> /.test(b))return '<blockquote><p>'+esc(b.replace(/^> /gm,''))+'</p></blockquote>';
  return '<p>'+esc(b).replaceAll('\n','<br>')+'</p>';
 }).join('');
}
export function blogArticleMarkup(post,{snapshot=false,preview=false}={}){
 const layout=decodeBlogLayout(post.body);
 const toc=String(layout?layout.blocks.map(b=>b.kind==='heading'?'## '+b.text:b.text).join('\n\n'):post.body||'').replace(/\r\n?/g,'\n').split(/\n\s*\n/).map((b,i)=>/^## [^\n]+$/.test(b)?`<a href="#blog-section-${i}" data-blog-section="blog-section-${i}">${esc(b.slice(3))}</a>`:'').join('');
 return `<article class="blog-article">${preview?'':'<a class="back-link" href="#view=blog">← Все истории</a>'}<header class="blog-article-head">${meta(post)}<h1>${esc(post.title)}</h1><p class="blog-deck">${esc(post.summary)}</p><span class="blog-byline">Команда AKRONIKL IT NEXUS</span></header><figure class="blog-cover">${photo(post,{hero:true})}${layout?.cover?'<figcaption>'+esc(layout.cover.caption)+'</figcaption>':coverFor(post.slug)?'<figcaption>Иллюстрация, созданная с помощью ИИ для Блога Nexus.</figcaption>':''}</figure>${snapshot?'<p class="blog-snapshot">Публичная статья из подготовленной офлайн-версии. Актуальная редакция доступна при подключении.</p>':''}<div class="blog-reading-layout"><div class="blog-prose">${blogBodyMarkup(post.body)}</div>${toc?`<aside class="blog-toc"><strong>В этой истории</strong><nav aria-label="Содержание статьи">${toc}</nav></aside>`:''}</div><footer class="blog-article-foot"><span>Учиться. Создавать. Делиться.</span>${preview?'':'<a class="btn" href="#view=blog">К другим историям →</a>'}</footer></article>`;
}
export function bindBlogSections(root){for(const link of root.querySelectorAll('[data-blog-section]'))link.addEventListener('click',event=>{event.preventDefault();root.querySelector('#'+link.dataset.blogSection)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})})}
export function blogPageMarkup({article=false}={}){return '<section class="nexus-blog"><header class="blog-heading" '+(article?'hidden':'')+'><span class="eyebrow">NEXUS JOURNAL / 01</span><h1>Истории, с которых<br>начинается новое.</h1><p>Идеи, открытия и жизнь Nexus. О том, как учиться с интересом и превращать знания в собственные проекты.</p></header><div data-blog-feed aria-live="polite"><p role="status">Загружаем статьи…</p></div></section>'}
