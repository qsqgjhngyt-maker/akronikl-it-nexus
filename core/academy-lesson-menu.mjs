const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));

export function academyLessonMenuItems({locale, programHref, assistantEnabled}) {
  const t = (ru, en) => locale === 'en' ? en : ru;
  return `<div class="academy-lesson-menu-items">
    <a class="btn" data-academy-menu-item="program" href="${escape(programHref)}">${t('Программа курса', 'Course outline')}</a>
    <button type="button" class="btn" data-r3-assistant data-academy-menu-item="assistant"${assistantEnabled ? '' : ' disabled'}>
      ${t('Разобрать с Akronikl', 'Discuss with Akronikl')}
    </button>
    <button type="button" class="btn" data-academy-menu-item="reading">${t('Что почитать по теме', 'What to read')}</button>
    <button type="button" class="btn" data-academy-menu-item="video">${t('Что посмотреть по теме', 'What to watch')}</button>
  </div>`;
}

export function bindAcademyLessonMenu(root, {locale, courseId, topicId, title, offline, signal,
  isCurrent, closeMenu, focusTarget, openAssistant, showError}) {
  let activeDialog;
  let request = 0;
  const live = () => !signal.aborted && root.isConnected && isCurrent();
  root.addEventListener('click', async event => {
    const action = event.target.closest('[data-academy-menu-item]');
    if (!action || !live()) return;
    const kind = action.dataset.academyMenuItem;
    if (kind === 'program') return;
    const trigger = focusTarget();
    closeMenu();
    showError('');
    if (kind === 'assistant') {
      openAssistant?.(trigger);
      return;
    }
    if (kind !== 'reading' && kind !== 'video') return;
    const serial = ++request;
    try {
      const {openAcademyLibrary} = await import('./academy-lesson-library.mjs');
      if (!live() || request !== serial) return;
      activeDialog?.close();
      activeDialog = openAcademyLibrary(root, {kind, courseId, topicId, title, locale, trigger, offline});
    } catch {
      if (live() && request === serial) showError(locale === 'en'
        ? 'The lesson library could not be opened. Try again.'
        : 'Библиотеку урока не удалось открыть. Попробуйте ещё раз.');
    }
  }, {signal});
  signal.addEventListener('abort', () => activeDialog?.close(), {once:true});
}
