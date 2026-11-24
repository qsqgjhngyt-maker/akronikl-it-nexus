const catalogs = new Map();
const styleURL = new URL('../styles/academy-lesson-library.css', import.meta.url).href;
const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));

function loadCatalog(courseId) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(courseId)) return Promise.reject(Error('Invalid course'));
  if (!catalogs.has(courseId)) {
    const url = new URL('../courses/academy-library/' + courseId + '.json', import.meta.url);
    catalogs.set(courseId, fetch(url, {credentials:'omit'}).then(response => {
      if (!response.ok) throw Error('Library is unavailable');
      return response.json();
    }).then(data => {
      if (data.schemaVersion !== 1 || data.courseId !== courseId) throw Error('Invalid catalog');
      return data;
    }).catch(error => {
      catalogs.delete(courseId);
      throw error;
    }));
  }
  return catalogs.get(courseId);
}

function safeURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

function timeLabel(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(seconds / 60);
  const parts = [minutes % 60, seconds % 60];
  if (minutes >= 60) parts.unshift(Math.floor(minutes / 60));
  return parts.map((part, index) => index ? String(part).padStart(2, '0') : String(part)).join(':');
}

function resourceMarkup(source, row, locale) {
  const url = safeURL(source?.url);
  if (!url) return '';
  const t = (ru, en) => locale === 'en' ? en : ru;
  const language = source.language === 'en' ? t('английский', 'English') : t('русский', 'Russian');
  const access = {
    free:t('Бесплатно', 'Free'),
    paid:t('Платно', 'Paid'),
    subscription:t('По подписке', 'Subscription'),
  }[source.access];
  const level = {
    beginner:t('Начальный', 'Beginner'),
    intermediate:t('Средний', 'Intermediate'),
    advanced:t('Продвинутый', 'Advanced'),
  }[source.level];
  const facts = source.kind === 'reading'
    ? [source.author, source.year, source.edition, language, access]
    : [source.author, timeLabel(source.durationSeconds), language, level, access];
  return `<li class="academy-library-source">
    <h3><a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a></h3>
    <p class="academy-library-meta">${facts.filter(Boolean).map(escape).join(' · ')}</p>
    ${row.section?.[locale] ? `<p><strong>${t('Раздел', 'Section')}</strong> ${escape(row.section[locale])}</p>` : ''}
    ${Number.isInteger(row.startSeconds) ? `<p><strong>${t('Фрагмент с', 'Start at')}</strong> ${timeLabel(row.startSeconds)}</p>` : ''}
    <p>${escape(row.benefit?.[locale])}</p>
    ${source.note?.[locale] ? `<p class="academy-library-note">${escape(source.note[locale])}</p>` : ''}
  </li>`;
}

export function openAcademyLibrary(root, {kind, courseId, topicId, title, locale, trigger, offline}) {
  const t = (ru, en) => locale === 'en' ? en : ru;
  const heading = kind === 'reading' ? t('Что почитать по теме', 'What to read') : t('Что посмотреть по теме', 'What to watch');
  const dialog = document.createElement('dialog');
  dialog.className = 'academy-library-dialog';
  dialog.lang = locale;
  dialog.setAttribute('aria-labelledby', 'academy-library-title');
  dialog.innerHTML = `<link rel="stylesheet" href="${escape(styleURL)}">
    <header><div><h2 id="academy-library-title">${heading}</h2><p>${escape(title)}</p></div>
      <button type="button" class="btn" data-library-close>${t('Закрыть', 'Close')}</button></header>
    ${offline || navigator.onLine === false ? `<p class="academy-library-note">
      ${t('Описания доступны офлайн. Для открытия источников нужен интернет.', 'Descriptions are available offline. Opening sources requires an internet connection.')}
    </p>` : ''}
    <div data-library-results aria-live="polite" aria-busy="true">${t('Загрузка каталога…', 'Loading the catalog…')}</div>`;
  root.append(dialog);
  const close = dialog.querySelector('[data-library-close]');
  const result = dialog.querySelector('[data-library-results]');
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (trigger?.isConnected) trigger.focus({preventScroll:true});
  }, {once:true});
  dialog.showModal();
  close.focus({preventScroll:true});
  void loadCatalog(courseId).then(data => {
    if (!dialog.open) return;
    const rows = data.topics?.[topicId]?.[kind] ?? [];
    const markup = rows.map(row => {
      const source = data.sources?.[row.id];
      return source?.kind === kind ? resourceMarkup(source, row, locale) : '';
    }).join('');
    result.innerHTML = markup ? `<ul class="academy-library-list">${markup}</ul>` :
      `<p>${t('Для этой темы пока нет подтверждённых материалов.', 'Verified resources for this lesson are not available yet.')}</p>`;
  }).catch(() => {
    if (!dialog.open) return;
    result.textContent = t('Каталог сейчас недоступен. Проверьте соединение и повторите.', 'The catalog is unavailable. Check your connection and try again.');
  }).finally(() => result.removeAttribute('aria-busy'));
  return dialog;
}
