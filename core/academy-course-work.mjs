import {courseTabsMarkup} from './academy-course-header.mjs';

const cache = new Map();
const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const en = locale => locale === 'en';
const labels = locale => en(locale)
  ? {overview:'Learning path',practicums:'Practicums',projects:'Course projects',final:'Final assessment',
    topics:'Topics',tasks:'Assignments',labs:'Labs'}
  : {overview:'Учебная траектория',practicums:'Практикумы',projects:'Учебные проекты',final:'Итоговая работа',
    topics:'Темы',tasks:'Задания',labs:'Лабораторные'};

function fetchCatalog(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(new URL('../courses/' + name, import.meta.url), {credentials:'omit'}).then(response => {
      if (!response.ok) throw Error('ACADEMY_WORK_UNAVAILABLE');
      return response.json();
    }).catch(error => { cache.delete(name); throw error; }));
  }
  return cache.get(name);
}

export function loadAcademyWork(course, locale) {
  return fetchCatalog('academy-work/' + course + '.' + locale + '.json');
}

export async function loadAcademyProjects(course, locale) {
  return (await fetchCatalog('academy-work-projects.' + locale + '.json'))[course] ?? [];
}

export function academyCourseRoute({course,locale,tab,path,lesson,section,stage='practice'}) {
  const query = new URLSearchParams({course,locale});
  if (lesson) {
    query.set('lesson',lesson);
    query.set('stage',stage);
    if (section) query.set('at',section);
  } else if (tab && tab!=='overview') {
    if (tab==='final' && course!=='c') query.set('assessment','final');
    else query.set('tab',tab);
  } else if (path && path!=='topics') query.set('path',path);
  return '#' + query;
}

export function academyCourseSections({course,locale,active}) {
  const words = labels(locale);
  return courseTabsMarkup(locale, ['overview','practicums','projects','final'].map(tab =>
    ({href:academyCourseRoute({course,locale,tab}),title:words[tab],active:tab===active})));
}

export function academyAssignmentsMarkup(items,locale,{embedded=false}={}) {
  if (!items?.length) return '';
  return `<section class="academy-exercises${embedded?'':' practice-card c-panel'}"${embedded?'':' id="academy-assignments" tabindex="-1"'}>
    ${embedded?'':`<h2>${en(locale)?'Assignments':'Задания'}</h2>`}
    ${items.map(item => `<article><h3>${escape(item.title)}</h3><p>${escape(item.task)}</p>${
      item.criteria?.length?`<details><summary>${en(locale)?'How to check':'Как проверить'}</summary>
        <ul>${item.criteria.map(line=>`<li>${escape(line)}</li>`).join('')}</ul></details>`:''}</article>`).join('')}
  </section>`;
}

function card({title,description,href,detail,criterion,steps},locale,action) {
  return `<article class="academy-work-card" data-academy-work-item>
    <div>${detail?`<span class="eyebrow">${escape(detail)}</span>`:''}<h3>${escape(title)}</h3>
    <p>${escape(description)}</p>
    ${criterion?`<p><strong>${en(locale)?'Result':'Результат'}.</strong> ${escape(criterion)}</p>`:''}
    ${steps?.length?`<ol>${steps.map(step=>`<li><a href="${escape(step.href)}">${escape(step.title)}</a></li>`).join('')}</ol>`:''}</div>
    <a class="btn" href="${escape(href)}">${escape(action)} <span aria-hidden="true">→</span></a>
  </article>`;
}

export function academyCourseWorkMarkup({course,locale,modules,outline,work,projects,tab='overview',path='topics'}) {
  const t = (ru, english) => en(locale) ? english : ru;
  const words = labels(locale);
  const lessonHref = (lesson, section, stage) => academyCourseRoute({course,locale,lesson,section,stage});
  const count = modules.reduce((n,module)=>n+module.topics.filter(topic=>topic.href).length,0);
  const heading = words[tab];
  const search = `<div class="academy-work-search"><label><span aria-hidden="true">⌕</span>
    <input type="search" aria-label="${t('Найти тему, задание или лабораторную','Find a topic, assignment or lab')}" placeholder="${t('Найти тему, задание или лабораторную','Find a topic, assignment or lab')}" autocomplete="off">
    <button type="button" aria-label="${t('Очистить поиск','Clear search')}" data-academy-work-clear hidden>×</button></label>
    <p data-academy-work-results role="status"></p></div>`;
  const header = `<header class="academy-work-heading"><h2>${heading}</h2>
    ${tab==='overview'?`<p>${t('Модулей','Modules')}: ${modules.length} · ${t('Тем','Topics')}: ${count}. ${t('Изучайте темы по порядку или откройте нужное задание или лабораторную.','Follow the course in order or open a specific assignment or lab.')}</p>`:''}
  </header>`;
  if (tab==='projects' || tab==='final') {
    const chosen = tab==='final' ? projects.filter(project=>project.final) : projects;
    const entries=chosen.map(project => card({...project,href:lessonHref(project.lesson,undefined,project.stage),
      steps:project.steps?.map(step=>({...step,href:lessonHref(step.lesson,undefined,step.stage)}))},
    locale,t('Открыть проект','Open project'))).join('');
    return `<section class="academy-work" data-academy-work-tab="${tab}">${header}<div class="academy-work-grid">${entries}</div></section>`;
  }
  if (tab==='practicums') {
    return `<section class="academy-work" data-academy-work-tab="practicums">${header}<div class="academy-work-grid">${modules.map(module => {
      const labs = module.topics.filter(topic=>work?.[topic.id]?.lab);
      if (!labs.length) return '';
      const topic = labs.at(-1), lab = work[topic.id].lab;
      return card({title:module.title,description:lab.title+'. '+lab.task,criterion:module.criterion,
        href:lessonHref(topic.id,'academy-lab'),
        steps:labs.map(item=>({title:work[item.id].lab.title,href:lessonHref(item.id,'academy-lab')}))},
      locale,t('Открыть итоговую лабораторную модуля','Open the module’s final lab'));
    }).join('')}</div></section>`;
  }
  const filters = `<nav class="academy-work-filters" aria-label="${t('Тип учебного материала','Learning material type')}">${['topics','tasks','labs'].map(id =>
    `<a href="${escape(academyCourseRoute({course,locale,path:id}))}"${path===id?' aria-current="page"':''}>${words[id]} <span>${count}</span></a>`).join('')}</nav>`;
  const selected = path==='topics' ? outline : modules.map(module => {
    const entries = module.topics.map(topic => {
      const item = work?.[topic.id];
      if (!item) return '';
      const lab = path==='labs', detail = lab ? item.lab : item.assignments[0];
      if (!detail) return '';
      return card({title:lab ? detail.title : topic.title, description:detail.task,
        detail:lab ? topic.title : detail.title,href:lessonHref(topic.id,lab?'academy-lab':'academy-assignments')},
      locale,lab?t('Открыть лабораторную','Open lab'):t('Открыть задания','Open assignments'));
    }).join('');
    return entries?`<section class="academy-work-group" data-academy-work-group><h3>${escape(module.title)}</h3>
      <div class="academy-work-grid">${entries}</div></section>`:'';
  }).join('');
  return `<section class="academy-work" data-academy-work-tab="overview" data-academy-work-search>${header}${search}${filters}${selected}
    <p data-academy-work-empty hidden>${t('По этому запросу ничего не найдено.','No results for this search.')}</p></section>`;
}

export function bindAcademyWorkSearch(root, locale) {
  const region = root.querySelector('[data-academy-work-search]');
  if (!region) return;
  const search = region.querySelector('input'), clear = region.querySelector('[data-academy-work-clear]');
  const status = region.querySelector('[data-academy-work-results]'), empty = region.querySelector('[data-academy-work-empty]');
  const items = [...region.querySelectorAll('[data-academy-work-item], [data-academy-module]')];
  const normalize = text => text.trim().normalize('NFKC').toLocaleLowerCase(locale);
  const searchText = items.map(item=>normalize(item.dataset.searchText||item.textContent));
  function update() {
    const query = normalize(search.value);
    let visible = 0;
    items.forEach((item,i)=>{ item.hidden = !searchText[i].includes(query); if (!item.hidden) visible++; });
    for (const group of region.querySelectorAll('[data-academy-work-group]')) {
      group.hidden = !group.querySelector('[data-academy-work-item]:not([hidden])');
    }
    clear.hidden = !search.value;
    empty.hidden = visible!==0;
    status.textContent = (en(locale)?'Shown ':'Показано ') + visible + (en(locale)?' of ':' из ') + items.length;
  }
  search.addEventListener('input',update);
  clear.addEventListener('click',()=>{search.value='';update();search.focus();});
  update();
}
