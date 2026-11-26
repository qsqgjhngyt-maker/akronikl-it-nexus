import {courseBackMarkup} from './academy-course-header.mjs';

const styles = new URL('../styles/academy-course-navigation.css', import.meta.url).href;

const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
const number = value => String(value).padStart(2, '0');

// Adapters supply the course's existing routes, order and completion projection.
// The navigation only displays that data and has no independent persistence.
export function courseNavigationMarkup({locale, modules, selectedModule, overviewHref, moduleHref, includeStyles = true}) {
  const en = locale === 'en';
  const selected = modules.find(module => module.id === selectedModule);
  const outlineLabel = en ? 'Course outline' : 'Программа курса';
  const studied = en ? 'Studied' : 'Изучено';
  const heading = 'academy-course-navigation-heading';

  const moduleCard = (module, index) => {
    const progress = `${module.topics.filter(topic => topic.completed).length}/${module.topics.length}`;
    const progressId = `academy-module-progress-${module.id}`;
    const searchText = [module.title, ...module.topics.map(topic => topic.title)].join(' ');
    const count = module.topics.length;
    const topicCount = en ? (count === 1 ? 'lesson' : 'lessons') :
      count % 100 >= 11 && count % 100 <= 14 ? 'тем' : count % 10 === 1 ? 'тема' : count % 10 >= 2 && count % 10 <= 4 ? 'темы' : 'тем';
    return `<li data-academy-module="${escape(module.id)}" data-search-item data-search-text="${escape(searchText)}">
      <article class="academy-nav-module">
        <div class="academy-nav-module-meta">
          <span class="eyebrow">${en ? 'Module' : 'Модуль'} ${escape(number(module.number ?? index + 1))} · ${count} ${topicCount}</span>
          <span class="academy-nav-card-meta" id="${escape(progressId)}">${module.available === false ? (en ? 'Planned' : 'В плане') : `${studied} <b>${progress}</b>`}</span>
        </div>
        <h3><a data-academy-open-module href="${escape(moduleHref(module.id))}" aria-describedby="${escape(progressId)}">${escape(module.title)} <span aria-hidden="true">↗</span></a></h3>
        ${module.description ? `<p>${escape(module.description)}</p>` : ''}
        ${module.criterion ? `<p><strong>${en ? 'Assessment' : 'Критерий'}.</strong> ${escape(module.criterion)}</p>` : ''}
        <ul class="academy-nav-topic-links">${module.topics.map(topic => `<li data-academy-module-topic="${escape(topic.id)}">${topic.href ?
          `<a href="${escape(topic.href)}"><span>${escape(topic.title)}</span><span aria-hidden="true">${topic.completed ? '✓' : '→'}</span>${topic.completed ? `<span class="academy-nav-visually-hidden"> (${studied})</span>` : ''}</a>` :
          `<span>${escape(topic.title)}</span>`}</li>`).join('')}</ul>
      </article>
    </li>`;
  };

  const topicCard = (topic, index) => {
    const label = `${en ? 'Topic' : 'Тема'} ${number(topic.number ?? index + 1)}`;
    const status = topic.href ? (topic.completed ? (en ? 'Studied' : 'Изучена') : (en ? 'To study' : 'К изучению')) : (en ? 'Planned' : 'В плане');
    const statusId = `academy-topic-status-${topic.id}`;
    const content = `<span class="academy-nav-card-label">${escape(label)}</span>
      <strong>${escape(topic.title)}</strong>
      <span class="academy-nav-card-meta" id="${escape(statusId)}"${topic.completed ? ' data-academy-topic-done' : ''}>${status}${topic.detail ? ` · ${escape(topic.detail)}` : ''}</span>`;
    return `<li data-academy-topic="${escape(topic.id)}" data-search-item>${topic.href
      ? `<a class="academy-nav-card" href="${escape(topic.href)}" aria-label="${escape(topic.title)}" aria-describedby="${escape(statusId)}">${content}<span class="academy-nav-arrow" aria-hidden="true">→</span></a>`
      : `<div class="academy-nav-card" aria-disabled="true">${content}</div>`}</li>`;
  };

  const moduleNumber = selected ? number(selected.number ?? modules.indexOf(selected) + 1) : '';
  return `${includeStyles ? `<link rel="stylesheet" href="${escape(styles)}">` : ''}
    <section data-academy-course-navigation="${selected ? 'topics' : 'modules'}" aria-labelledby="${heading}">
      <header class="academy-nav-heading">
        ${selected ? `${courseBackMarkup(locale, overviewHref)}
          <p class="academy-nav-card-label">${en ? 'Module' : 'Модуль'} ${escape(moduleNumber)}</p>` : ''}
        <h2 id="${heading}" tabindex="-1" data-academy-nav-heading>${selected ? escape(selected.title) : outlineLabel}</h2>
        ${selected?.description ? `<p>${escape(selected.description)}</p>` : ''}
        ${selected?.criterion ? `<p><strong>${en ? 'Assessment' : 'Проверка результата'}:</strong> ${escape(selected.criterion)}</p>` : ''}
      </header>
      <ul class="academy-nav-grid" role="list">${selected ? selected.topics.map(topicCard).join('') : modules.map(moduleCard).join('')}</ul>
    </section>`;
}
