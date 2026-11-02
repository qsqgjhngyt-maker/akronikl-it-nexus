import {termReferenceMarkup} from '../../core/nexus-learning-ui.js';
import {bindGlossaryDrawer} from '../../core/nexus-learning-ui.js';
// Общий справочник двух курсов. Не читает аккаунт, работы, попытки или сеть.
const glossaryNormalize=s=>String(s).normalize('NFKC').toLocaleLowerCase().replace(/ё/g,'е');
export function glossaryEntries(dictionary,locale='ru'){
 if(dictionary?.schemaVersion!==1||!Array.isArray(dictionary.terms)||dictionary.terms.length>200)throw Error('GLOSSARY_SHAPE');
 const ids=new Set();return dictionary.terms.map(t=>{if(!/^[a-z][a-z0-9-]*$/.test(t.id)||ids.has(t.id)||!Array.isArray(t.aliases)||!['ru','en'].every(l=>['term','full','definition','example'].every(k=>typeof t[l]?.[k]==='string'&&t[l][k].trim())))throw Error('GLOSSARY_ENTRY');ids.add(t.id);return{id:t.id,...t[locale==='en'?'en':'ru'],aliases:[t.ru.term,t.en.term,...t.aliases]};});
}
export function findGlossaryTerms(entries,query=''){
 const q=glossaryNormalize(query).trim().slice(0,200);if(!q)return entries;
 const tokens=q.split(/\s+/u);return entries.map((x,i)=>{const name=glossaryNormalize([x.term,x.full,...x.aliases].join(' ')),body=glossaryNormalize(x.definition+' '+x.example);return{x,i,score:tokens.every(t=>name.includes(t)||body.includes(t))?tokens.reduce((n,t)=>n+(name.includes(t)?4:1),0):0};}).filter(x=>x.score).sort((a,b)=>b.score-a.score||a.i-b.i).map(x=>x.x);
}
export function lessonGlossaryTerms(entries,lesson){
 const explicit=new Set(lesson?.experience?.termIds||[]),body=glossaryNormalize(JSON.stringify([lesson?.title,lesson?.sections,lesson?.examples,lesson?.lab]));
 return entries.filter(x=>explicit.has(x.id)||x.aliases.some(a=>a.length>2&&new RegExp('(^|[^\\p{L}\\p{N}])'+glossaryNormalize(a).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^\\p{L}\\p{N}])','u').test(body)));
}
export function mountOnecGlossary(root,{dictionary,locale='ru',lesson=null,isCurrent=()=>true}={}){
 const entries=glossaryEntries(dictionary,locale),local=lesson?lessonGlossaryTerms(entries,lesson):[],en=locale==='en',doc=root.ownerDocument;
 let dead=false;const active=()=>!dead&&isCurrent(),t=(r,e)=>en?e:r;
 const node=(tag,parent,text)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;parent.append(n);return n;};
 const host=node('section',root);host.className='block glass-panel onec-terms';host.dataset.onecGlossary='';
 node('h2',host,t('Справочник терминов и сокращений','Terms and abbreviations'));
 node('p',host,t('Откройте знакомый справочник Академии: расшифровки, объяснения и примеры для обоих курсов.','Open the Academy terminology reference: full names, explanations and examples for both courses.'));
 const openAll=node('button',host,t('Справочник терминов','Terminology reference'));openAll.type='button';openAll.className='btn';openAll.dataset.openTerms='';
 const shortcuts=node('div',host);shortcuts.className='onec-term-chips';for(const x of local){const b=node('button',shortcuts,x.term);b.type='button';b.className='btn';b.dataset.termId=x.id;b.dataset.term=x.term;}
 root.insertAdjacentHTML('beforeend',termReferenceMarkup(entries,{uiLocale:locale,contentLocale:locale}));const dialog=root.querySelector('#termDrawer');dialog.dataset.termDrawer='';dialog.querySelector('#termSearch').dataset.termSearch='';dialog.querySelector('#termStatus').dataset.termStatus='';
 const scope=root.querySelector('[data-lesson]'),inserted=[];
 if(scope){const walker=doc.createTreeWalker(scope,4),texts=[];while(walker.nextNode())if(!walker.currentNode.parentElement.closest('a,button,pre,code,textarea,input,label,summary,[data-onec-glossary],#knowledge'))texts.push(walker.currentNode);
  const used=new Set();for(const textNode of texts){if(used.size>=18)break;const value=textNode.data;let choice=null;for(const x of local.filter(x=>!used.has(x.id))){for(const name of [x.term,...x.aliases].filter(a=>a.length>2).sort((a,b)=>b.length-a.length)){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),m=new RegExp('(^|[^\\p{L}\\p{N}])('+escaped+')(?=$|[^\\p{L}\\p{N}])','iu').exec(value);if(m){const start=m.index+m[1].length;if(!choice||start<choice.start||start===choice.start&&m[2].length>choice.length)choice={x,start,length:m[2].length};}}}
   if(!choice)continue;const before=doc.createTextNode(value.slice(0,choice.start)),after=doc.createTextNode(value.slice(choice.start+choice.length)),b=doc.createElement('button');b.type='button';b.className='term-link onec-inline-term';b.dataset.termId=choice.x.id;b.dataset.term=choice.x.term;b.textContent=value.slice(choice.start,choice.start+choice.length);b.setAttribute('aria-label',t('Объяснить термин: ','Explain term: ')+b.textContent);textNode.replaceWith(before,b,after);inserted.push({before,b,after,value});used.add(choice.x.id);
  }
 }

 const header=root.querySelector('[data-onec-terms]');if(header)header.dataset.openTerms='';const unbind=bindGlossaryDrawer(root);
 return{open:()=>{if(active())openAll.click();},dispose(){dead=true;unbind?.();dialog.remove();host.remove();for(const x of inserted)if(x.b.isConnected){x.b.replaceWith(doc.createTextNode(x.value));x.before.remove();x.after.remove();}}};
}
