import {textFor} from './i18n.js';
import {learnerAcademyEntries} from './academy-presentation.js';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
export function academyCatalogMarkup({catalog,cpp,prefs,t,academyViewFilter,visualIcon}){
  const cppEntry=catalog.courses.find(item=>item.id==='cpp');
  const entries=learnerAcademyEntries(catalog);
  const categories=[...new Map(entries.map(item=>[item.category,item.categoryTitle])).entries()];
  const categoryLabel=(id,title)=>id==='software-engineering'?t('visual.academy.softwareEngineering'):textFor(title,prefs.uiLocale);
  const available=entries.filter(item=>item.status==='available-alpha'&&item.route).length;
  const categoriesMarkup=categories.map(([id,title])=>`<button type="button" class="visual-category-chip" data-academy-category="${e(id)}" aria-pressed="${academyViewFilter.category===id}">${e(categoryLabel(id,title))}</button>`).join('');
  const statusFilters=[['all',entries.length,'catalog.all'],['available',available,'catalog.available'],['planned',entries.length-available,'catalog.planned']].map(([id,count,label])=>`<button type="button" data-academy-availability="${id}" aria-pressed="${academyViewFilter.availability===id}">${e(t(label))}<span>${count}</span></button>`).join('');
  const cards=entries.map(c=>{
    const active=c.status==='available-alpha'&&Boolean(c.route);
    const searchText=[...Object.values(c.title),...Object.values(c.categoryTitle),categoryLabel(c.category,c.categoryTitle),c.id,c.id==='programming'?'NEXUS CODE HUB C++ Код и разработка Code & Development':''].join(' ').normalize('NFKC').toLocaleLowerCase(prefs.uiLocale);
    const attrs=`data-academy-course="${e(c.id)}" data-academy-category-value="${e(c.category)}" data-academy-status="${active?'available':'planned'}" data-academy-search="${e(searchText)}"`;
    if(c.id==='programming')return `<article class="course-card available academy-code-hub visual-academy-hub glass-panel" ${attrs}><a class="academy-hub-main" href="${e(c.route)}"><div class="visual-card-kicker"><span class="eyebrow">NEXUS CODE HUB</span><span class="visual-status available"><i aria-hidden="true"></i>${e(t('catalog.available'))}</span></div><h2>${e(t('codeHub.title'))}</h2><p>${e(t('visual.academy.hubText',{count:c.languageTrackCount}))}</p><span class="visual-card-link">${e(t('visual.academy.openHub'))}<span aria-hidden="true">→</span></span></a>${cppEntry?`<a class="academy-hub-reference" href="${e(cppEntry.route)}"><div class="visual-cpp-symbol" aria-hidden="true">C<span>++</span></div><div><span class="visual-card-kicker">${e(t('codeHub.reference'))}</span><strong>${e(textFor(cpp.manifest.title,prefs.uiLocale))}</strong><small>${e(t('visual.academy.cppSummary',{modules:cpp.curriculum.sections.length,topics:cpp.curriculum.lessons.length}))}</small><span class="visual-card-link">${e(t('visual.academy.openCpp'))}<span aria-hidden="true">↗</span></span></div></a>`:''}</article>`;
    const tag=active?'a':'article';
    return `<${tag} class="course-card visual-academy-card ${active?'available':'planned'} glass-panel" ${attrs} ${active?`href="${e(c.route)}"`:''}><div class="visual-card-top"><span class="visual-icon">${visualIcon(c.category==='software-engineering'?'project':c.category==='core'?'code':'book')}</span><span class="visual-step-number">${String(c.order).padStart(2,'0')}</span></div><h3>${e(textFor(c.title,prefs.uiLocale))}</h3><p>${e(categoryLabel(c.category,c.categoryTitle))}</p><div class="visual-card-footer"><span class="visual-status ${active?'available':'planned'}"><i aria-hidden="true"></i>${e(t(active?'catalog.available':'catalog.planned'))}</span>${c.id==='computer-graphics'?`<a class="visual-card-link graphics-catalog-link" href="#view=computer-graphics">${e(t('graphics.catalog.open'))} ↗</a>`:''}</div></${tag}>`;
  }).join('');
  const body=`<div class="nexus-visual visual-academy" data-visual-academy><header class="visual-academy-heading"><div><span class="eyebrow">LIVING ACADEMY</span><h1>${e(t('visual.academy.title'))}</h1><p>${e(t('visual.academy.intro'))}</p></div><div class="visual-academy-total"><strong>${entries.length}</strong><span>${e(t('practiceHub.sections'))}</span></div></header><section class="visual-catalog" aria-labelledby="visualCatalogTitle"><div class="visual-catalog-heading"><h2 id="visualCatalogTitle">${e(t('visual.academy.catalogTitle'))}</h2><span>${e(t('visual.academy.catalogNote'))}</span></div><div class="visual-catalog-toolbar"><div class="visual-availability" role="group" aria-label="${e(t('visual.academy.availability'))}">${statusFilters}</div><div class="visual-search">${visualIcon('search')}<input id="academySearch" type="search" value="${e(academyViewFilter.query)}" placeholder="${e(t('catalog.search'))}" aria-label="${e(t('catalog.search'))}" autocomplete="off"></div></div><div class="visual-category-list" role="group" aria-label="${e(t('visual.academy.categories'))}"><button type="button" class="visual-category-chip" data-academy-category="all" aria-pressed="${academyViewFilter.category==='all'}">${e(t('visual.academy.allCategories'))}</button>${categoriesMarkup}</div><div class="visual-results-row"><span id="academyResultCount" role="status" aria-live="polite" aria-atomic="true"></span><button class="visual-reset" type="button" id="academyReset" hidden>${e(t('visual.academy.reset'))}</button></div><div class="course-grid visual-academy-grid">${cards}</div><div class="visual-empty glass-panel" id="academyEmpty" hidden><span class="visual-icon">${visualIcon('search')}</span><h3>${e(t('visual.academy.emptyTitle'))}</h3><p>${e(t('visual.academy.emptyText'))}</p><button class="btn" type="button" id="academyEmptyReset">${e(t('visual.academy.reset'))}</button></div></section></div>`;
  return body;
}
export function bindAcademyCatalog({prefs,t,academyViewFilter}){
  const academyRoot=document.querySelector('[data-visual-academy]');
  if(!academyRoot)return;
  const cards=[...academyRoot.querySelectorAll('[data-academy-course]')],search=academyRoot.querySelector('#academySearch');
  const categoryButtons=[...academyRoot.querySelectorAll('[data-academy-category]')],statusButtons=[...academyRoot.querySelectorAll('[data-academy-availability]')];
  const apply=()=>{
    const query=academyViewFilter.query.trim().normalize('NFKC').toLocaleLowerCase(prefs.uiLocale);let shown=0;
    cards.forEach(card=>{const match=(!query||card.dataset.academySearch.includes(query))&&(academyViewFilter.category==='all'||card.dataset.academyCategoryValue===academyViewFilter.category)&&(academyViewFilter.availability==='all'||card.dataset.academyStatus===academyViewFilter.availability);card.hidden=!match;if(match)shown++});
    categoryButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.academyCategory===academyViewFilter.category)));
    statusButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.academyAvailability===academyViewFilter.availability)));
    academyRoot.querySelector('#academyResultCount').textContent=t('visual.academy.results',{count:shown,total:cards.length});
    academyRoot.querySelector('#academyEmpty').hidden=shown!==0;
    academyRoot.querySelector('#academyReset').hidden=!query&&academyViewFilter.category==='all'&&academyViewFilter.availability==='all';
  };
  const reset=()=>{academyViewFilter.query='';academyViewFilter.category='all';academyViewFilter.availability='all';search.value='';apply();search.focus()};
  search.addEventListener('input',()=>{academyViewFilter.query=search.value;apply()});
  categoryButtons.forEach(button=>button.addEventListener('click',()=>{academyViewFilter.category=button.dataset.academyCategory;apply()}));
  statusButtons.forEach(button=>button.addEventListener('click',()=>{academyViewFilter.availability=button.dataset.academyAvailability;apply()}));
  academyRoot.querySelector('#academyReset').addEventListener('click',reset);
  academyRoot.querySelector('#academyEmptyReset').addEventListener('click',reset);
  apply();
}
