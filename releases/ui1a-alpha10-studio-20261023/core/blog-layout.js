// Версионированные блоки внутри существующего body. Старые текстовые статьи сохраняются.
export const LAYOUT_PREFIX='NEXUS_LAYOUT_V1\n';
export const BODY_LIMIT=20000;
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const text=(v,max)=>typeof v==='string'&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v);
const bad=()=>{throw Object.assign(Error('Некорректная структура оформления статьи.'),{code:'INVALID_INPUT'})};
export function validLayoutImage(v){return exact(v,['mediaId','alt','caption','focusX','focusY'])&&/^[a-f0-9]{64}$/.test(v.mediaId)&&text(v.alt,300)&&text(v.caption,500)&&Number.isInteger(v.focusX)&&v.focusX>=0&&v.focusX<=100&&Number.isInteger(v.focusY)&&v.focusY>=0&&v.focusY<=100}
export function validateBlogLayout(value){
 if(!exact(value,['schemaVersion','cover','blocks'])||value.schemaVersion!==1||value.cover!==null&&!validLayoutImage(value.cover)||!Array.isArray(value.blocks)||value.blocks.length>32)bad();
 const ids=new Set();let mediaCount=value.cover?1:0;
 for(const b of value.blocks){
  if(!exact(b,['id','kind','text','width','align','ratio','columns','surface','images'])||!/^[a-f0-9-]{36}$/.test(b.id)||ids.has(b.id)||!['text','heading','quote','image','gallery'].includes(b.kind)||!text(b.text,12000)||![25,33,50,66,75,100].includes(b.width)||!['left','center','right'].includes(b.align)||!['auto','square','landscape','portrait'].includes(b.ratio)||![1,2,3].includes(b.columns)||!['plain','panel','accent'].includes(b.surface)||!Array.isArray(b.images)||b.images.some(i=>!validLayoutImage(i)))bad();
  ids.add(b.id);if(['image','gallery'].includes(b.kind)){if(b.text!==''||b.images.length<(b.kind==='image'?1:2)||b.images.length>(b.kind==='image'?1:6))bad()}else if(b.images.length)bad();mediaCount+=b.images.length;
 }
 if(mediaCount>20||JSON.stringify(value).length+LAYOUT_PREFIX.length>BODY_LIMIT)bad();
 return structuredClone(value);
}
export function decodeBlogLayout(body){if(typeof body!=='string'||!body.startsWith(LAYOUT_PREFIX))return null;try{const raw=body.slice(LAYOUT_PREFIX.length),value=JSON.parse(raw);if(JSON.stringify(value)!==raw)bad();return validateBlogLayout(value)}catch{bad()}}
export function encodeBlogLayout(value){return LAYOUT_PREFIX+JSON.stringify(validateBlogLayout(value))}
export function blogMediaIds(layout){return [...new Set([layout.cover,...layout.blocks.flatMap(b=>b.images)].filter(Boolean).map(i=>i.mediaId))]}
export function layoutText(layout){return layout.blocks.map(b=>b.text||b.images.map(i=>i.caption).join(' ')).join('\n\n')}
// Dual read: старый установленный интерфейс не получает encoded JSON в body.
// Новый редактор восстанавливает исходный layout; server guard запрещает legacy downgrade.
export function compatibleArticle(article,{editor=false}={}){
 const layout=decodeBlogLayout(article.body);if(!layout)return article;
 const plain=layoutText(layout);return {...article,body:editor?'Обновите Nexus для редактирования новой вёрстки.\n\n'+plain.slice(0,512):plain,layout:article.body};
}
export function restoreLayoutArticle(article){
 if(article.layout===undefined)return article;
 if(typeof article.layout!=='string'||!decodeBlogLayout(article.layout))bad();
 return {...article,body:article.layout};
}
export function plainTextLayout(body=''){
 const raw=String(body),paragraphs=raw.split(/\n\s*\n/).filter(Boolean),compact=paragraphs.length>32||paragraphs.some(p=>p.length>12000),parts=[];
 // Старые статьи не обрезаются ради лимита блоков. Слишком длинная итоговая
 // запись будет явно отклонена при сохранении, а исходный текст останется в форме.
 if(compact){let offset=0;while(offset<raw.length){let end=Math.min(raw.length,offset+12000);if(end<raw.length&&/[\uD800-\uDBFF]/.test(raw[end-1]))end--;parts.push(raw.slice(offset,end));offset=end}}
 else parts.push(...paragraphs);
 return {schemaVersion:1,cover:null,blocks:parts.map(text=>({id:crypto.randomUUID(),kind:!compact&&text.startsWith('## ')?'heading':!compact&&text.startsWith('> ')?'quote':'text',text:compact?text:text.replace(/^(## |\> )/,''),width:100,align:'left',ratio:'auto',columns:1,surface:'plain',images:[]}))};
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function layoutImageMarkup(image,ratio='auto'){
 if(!validLayoutImage(image)||!['auto','square','landscape','portrait'].includes(ratio))bad();return `<figure class="blog-layout-photo blog-ratio-${ratio}"><img data-blog-media="${image.mediaId}" alt="${esc(image.alt)}" style="object-position:${image.focusX}% ${image.focusY}%" decoding="async"><figcaption>${esc(image.caption)}</figcaption></figure>`;
}
export function blogLayoutMarkup(value){const v=validateBlogLayout(value);return '<div class="blog-layout-grid">'+v.blocks.map((b,i)=>`<section class="blog-layout-block blog-width-${b.width} blog-align-${b.align} blog-surface-${b.surface}" data-blog-block="${b.id}">${b.kind==='heading'?`<h2 id="blog-section-${i}">${esc(b.text)}</h2>`:b.kind==='quote'?`<blockquote><p>${esc(b.text).replaceAll('\n','<br>')}</p></blockquote>`:b.kind==='text'?`<p>${esc(b.text).replaceAll('\n','<br>')}</p>`:`<div class="blog-layout-gallery blog-columns-${b.columns}">${b.images.map(img=>layoutImageMarkup(img,b.ratio)).join('')}</div>`}</section>`).join('')+'</div>'}
export async function bindBlogMedia(root,{fetchImpl=globalThis.fetch,privateRead=false,isCurrent=()=>root.isConnected,localImages=new Map()}={}){
 const jobs=new Map();for(const img of root.querySelectorAll('[data-blog-media]')){
  const id=img.dataset.blogMedia;if(!/^[a-f0-9]{64}$/.test(id))continue;
  if(localImages.has(id)){img.src=localImages.get(id);continue}
  if(!jobs.has(id))jobs.set(id,(async()=>{
   const path=(privateRead?'/api/v2/account/control/content?media=':'/api/v2/content/feed?media=')+id;
   let data;if(typeof privateRead==='function')data=await privateRead(path);else{const c=new AbortController(),t=setTimeout(()=>c.abort(),10000);try{const r=await fetchImpl(path,{credentials:'omit',cache:'no-store',redirect:'error',signal:c.signal});if(!r.ok||r.redirected||!r.headers.get('content-type')?.startsWith('application/json'))throw Error('Фото недоступно');const raw=await r.text();if(raw.length>150000)throw Error('Фото слишком большое');data=JSON.parse(raw)}finally{clearTimeout(t)}}
   const m=data.media;if(m?.id!==id||m.mime!=='image/jpeg'||typeof m.data!=='string'||m.data.length>131072||!/^[A-Za-z0-9+/]+={0,2}$/.test(m.data)||!Number.isInteger(m.width)||m.width<1||m.width>1600||!Number.isInteger(m.height)||m.height<1||m.height>1600)throw Error('Фото не прошло проверку');
   const bytes=Uint8Array.from(atob(m.data),c=>c.charCodeAt(0)),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==id)throw Error('Контрольная сумма фото не совпала');return 'data:image/jpeg;base64,'+m.data;
  })());
  void jobs.get(id).then(src=>{if(isCurrent()&&img.isConnected){localImages.set(id,src);img.src=src}}).catch(()=>{if(isCurrent()&&img.isConnected){img.classList.add('blog-media-unavailable');img.alt+=' · Фото недоступно'}});
 }
 await Promise.allSettled(jobs.values());
}
