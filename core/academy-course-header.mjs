const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
const styles = new URL('../styles/academy-course-navigation.css', import.meta.url).href;

export function courseBackMarkup(locale, href, level = 'course') {
  const en = locale === 'en';
  const label = level === 'academy' ? (en ? 'Back to Academy' : 'Назад в Академию') :
    (en ? 'Back to course' : 'Назад к курсу');
  return `<a class="back-link academy-back" data-academy-back="${level}" href="${escape(href)}"><span aria-hidden="true">←</span> ${label}</a>`;
}

export function courseHeroMarkup({id, locale, title, description, symbol, suffix, facts, progress, includeStyles = true, academyHref = '#view=academy'}) {
  const en = locale === 'en';
  const percent = progress?.total ? Math.round(100 * progress.done / progress.total) : 0;
  const progressLabel = en ? 'Progress' : 'Прогресс';
  return `${includeStyles ? `<link rel="stylesheet" href="${escape(styles)}">` : ''}
    ${courseBackMarkup(locale, academyHref, 'academy')}
    <header class="course-hero academy-course-hero" data-academy-course-hero data-course-id="${escape(id)}" data-course-locale="${locale}">
      <div class="course-code large" aria-hidden="true">${escape(symbol)}${suffix ? `<span>${escape(suffix)}</span>` : ''}</div>
      <div class="academy-course-hero-copy">
        <span class="eyebrow">${en ? 'Academy course' : 'Курс Академии'}</span>
        <h1>${escape(title)}</h1>
        ${description ? `<p>${escape(description)}</p>` : ''}
        <div class="learning-course-facts">${facts.map(([count, label]) => `<span><b>${escape(count)}</b> ${escape(label)}</span>`).join('')}</div>
        ${progress?.total ? `<div class="progress-row"><span>${progressLabel} <strong data-progress>${progress.done}/${progress.total}</strong></span><span data-progress-percent>${percent}%</span></div>
          <progress class="progress" aria-label="${progressLabel}" max="${progress.total}" value="${progress.done}" aria-valuemax="${progress.total}" aria-valuenow="${progress.done}">${percent}%</progress>` : ''}
      </div>
    </header>`;
}

export function courseContinueMarkup({locale, title, stage, href, visited}) {
  const en = locale === 'en';
  const label = visited ? (en ? 'Last opened lesson' : 'Последняя открытая тема') : (en ? 'First lesson' : 'Первая тема');
  const action = visited ? (en ? 'Continue' : 'Продолжить') : (en ? 'Start learning' : 'Начать обучение');
  return `<section class="academy-course-continue" data-academy-course-continue>
    <div><p data-academy-continue-label>${label}</p><strong data-academy-continue-title>${escape(title)}</strong><p data-academy-continue-stage${stage ? '' : ' hidden'}>${escape(stage)}</p></div>
    <a class="btn primary" data-learning-continue href="${escape(href)}">${action} <span aria-hidden="true">→</span></a>
  </section>`;
}

export function courseTabsMarkup(locale, links) {
  const label = locale === 'en' ? 'Course sections' : 'Разделы курса';
  return `<nav class="course-tabs academy-course-tabs" aria-label="${label}">${links.map(({href,title,active}) =>
    `<a href="${escape(href)}"${active ? ' class="active" aria-current="page"' : ''}>${escape(title)}</a>`).join('')}</nav>`;
}
