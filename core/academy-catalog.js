import {textFor} from './i18n.js';
import {academyCourseCards,courseCardFacts} from './academy-course-cards.js';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
export function academyCatalogMarkup({catalog,cpp,prefs,t,academyViewFilter,visualIcon}){
  if(!academyViewFilter.initialized)Object.assign(academyViewFilter,{category:'all',availability:'available',query:'',initialized:true});
  const entries=academyCourseCards(catalog),en=prefs.uiLocale==='en';
  const allLabel=en?'Full catalog':'Весь каталог',availableLabel=en?'Available in alpha':'Доступно в альфе';
  const categories=[...new Map(entries.map(item=>[item.category,item.categoryTitle])).entries()];
  const categoryLabel=(id,title)=>id==='software-engineering'?t('visual.academy.softwareEngineering'):textFor(title,prefs.uiLocale);
  const available=entries.filter(item=>item.status==='available-alpha'&&item.route).length;
  const categoriesMarkup=categories.map(([id,title])=>`<button type="button" class="visual-category-chip" data-academy-category="${e(id)}" aria-pressed="${academyViewFilter.category===id}">${e(categoryLabel(id,title))}</button>`).join('');
  const statusFilters=[['available',available,availableLabel],['all',entries.length,allLabel],['planned',entries.length-available,t('catalog.planned')]].map(([id,count,label])=>`<button type="button" data-academy-availability="${id}" aria-pressed="${academyViewFilter.availability===id}">${e(label)}<span>${count}</span></button>`).join('');
  const cards=entries.map(c=>{
    const active=c.status==='available-alpha'&&Boolean(c.route);
    const searchText=[...Object.values(c.title),...Object.values(c.categoryTitle),...Object.values(c.profile?.name??{}),categoryLabel(c.category,c.categoryTitle),c.id].join(' ').normalize('NFKC').toLocaleLowerCase(prefs.uiLocale);
    const status=active?'available':'planned';
    const hidden=academyViewFilter.availability!=='all'&&academyViewFilter.availability!==status;
    const attrs=`data-academy-course="${e(c.id)}" data-academy-category-value="${e(c.category)}" data-academy-status="${status}" data-academy-search="${e(searchText)}"${hidden?' hidden':''}`;
    const profile=c.id==='cpp'&&cpp?.curriculum?{...c.profile,topics:cpp.curriculum.lessons.length,modules:cpp.curriculum.sections.length}:c.profile;
    const description=profile?`<p>${e(courseCardFacts(profile,prefs.uiLocale))}</p><p class="academy-course-outcome">${e(textFor(profile.outcome,prefs.uiLocale))}</p>`:`<p>${e(categoryLabel(c.category,c.categoryTitle))}</p>`;
    const tag=active?'a':'article';
    return `<${tag} class="course-card visual-academy-card ${status} glass-panel" ${attrs} ${active?`href="${e(c.route)}"`:''}><div class="visual-card-top"><span class="visual-icon">${visualIcon(c.category==='software-engineering'?'project':profile||c.category==='core'?'code':'book')}</span></div><h3>${e(textFor(profile?.name??c.title,prefs.uiLocale))}</h3>${description}<div class="visual-card-footer"><span class="visual-status ${status}"><i aria-hidden="true"></i>${e(c.id==='c'?(en?'Modules 1–6':'Модули 1–6'):t(active?'catalog.available':'catalog.planned'))}</span>${!active&&c.id==='computer-graphics'?`<a class="visual-card-link graphics-catalog-link" href="#view=computer-graphics">${e(t('graphics.catalog.open'))} ↗</a>`:''}</div></${tag}>`;
  }).join('');
  const body=`<div class="nexus-visual visual-academy" data-visual-academy><header class="visual-academy-heading"><h1 id="visualCatalogTitle">${e(t('nav.academy'))}</h1></header><section class="visual-catalog" aria-labelledby="visualCatalogTitle"><div class="visual-catalog-toolbar"><div class="visual-availability" role="group" aria-label="${e(t('visual.academy.availability'))}">${statusFilters}</div><div class="visual-search">${visualIcon('search')}<input id="academySearch" type="search" value="${e(academyViewFilter.query)}" placeholder="${e(t('catalog.search'))}" aria-label="${e(t('catalog.search'))}" autocomplete="off"></div></div><div class="visual-category-list" role="group" aria-label="${e(t('visual.academy.categories'))}"><button type="button" class="visual-category-chip" data-academy-category="all" aria-pressed="${academyViewFilter.category==='all'}">${e(t('visual.academy.allCategories'))}</button>${categoriesMarkup}</div><div class="visual-results-row"><span id="academyResultCount" role="status" aria-live="polite" aria-atomic="true"></span><button class="visual-reset" type="button" id="academyReset" hidden>${e(t('visual.academy.reset'))}</button></div><div class="course-grid visual-academy-grid">${cards}</div><div class="visual-empty glass-panel" id="academyEmpty" hidden><span class="visual-icon">${visualIcon('search')}</span><h3>${e(t('visual.academy.emptyTitle'))}</h3><p>${e(t('visual.academy.emptyText'))}</p><button class="btn" type="button" id="academySearchAll">${en?'Search the full catalog':'Искать во всём каталоге'}</button><button class="btn" type="button" id="academyEmptyReset">${e(t('visual.academy.reset'))}</button></div><a class="visual-text-link academy-code-link" href="#view=programming">${en?'Other languages and Code Studio':'Другие языки и Code Studio'} →</a></section></div>`;
  return body;
}
export function bindAcademyCatalog({prefs,t,academyViewFilter}){
  const academyRoot=document.querySelector('[data-visual-academy]');
  if(!academyRoot)return;
  const cards=[...academyRoot.querySelectorAll('[data-academy-course]')],search=academyRoot.querySelector('#academySearch');
  const categoryButtons=[...academyRoot.querySelectorAll('[data-academy-category]')],statusButtons=[...academyRoot.querySelectorAll('[data-academy-availability]')];
  const count=academyRoot.querySelector('#academyResultCount'),expand=academyRoot.querySelector('#academySearchAll');
  const apply=()=>{
    const query=academyViewFilter.query.trim().normalize('NFKC').toLocaleLowerCase(prefs.uiLocale);let shown=0;
    cards.forEach(card=>{const match=(!query||card.dataset.academySearch.includes(query))&&(academyViewFilter.category==='all'||card.dataset.academyCategoryValue===academyViewFilter.category)&&(academyViewFilter.availability==='all'||card.dataset.academyStatus===academyViewFilter.availability);card.hidden=!match;if(match)shown++});
    categoryButtons.forEach(button=>{
      const category=button.dataset.academyCategory;
      button.hidden=category!=='all'&&category!==academyViewFilter.category&&!cards.some(card=>card.dataset.academyCategoryValue===category&&(academyViewFilter.availability==='all'||card.dataset.academyStatus===academyViewFilter.availability));
      button.setAttribute('aria-pressed',String(category===academyViewFilter.category));
    });
    statusButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.academyAvailability===academyViewFilter.availability)));
    const text=t('visual.academy.results',{count:shown,total:cards.length});
    if(count.textContent!==text)count.textContent=text;
    academyRoot.querySelector('#academyEmpty').hidden=shown!==0;
    expand.hidden=academyViewFilter.category==='all'&&academyViewFilter.availability==='all';
    academyRoot.querySelector('#academyReset').hidden=!query&&academyViewFilter.category==='all'&&academyViewFilter.availability==='available';
  };
  const reset=()=>{academyViewFilter.query='';academyViewFilter.category='all';academyViewFilter.availability='available';search.value='';apply();search.focus()};
  search.addEventListener('input',()=>{academyViewFilter.query=search.value;apply()});
  categoryButtons.forEach(button=>button.addEventListener('click',()=>{academyViewFilter.category=button.dataset.academyCategory;apply()}));
  statusButtons.forEach(button=>button.addEventListener('click',()=>{academyViewFilter.availability=button.dataset.academyAvailability;apply()}));
  expand.addEventListener('click',()=>{academyViewFilter.category='all';academyViewFilter.availability='all';apply();search.focus()});
  academyRoot.querySelector('#academyReset').addEventListener('click',reset);
  academyRoot.querySelector('#academyEmptyReset').addEventListener('click',reset);
  apply();
}
