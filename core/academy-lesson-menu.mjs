const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));

export function academyLessonMenuToggle(locale) {
  const en = locale==='en';
  return `<button type="button" class="btn lesson-tools-toggle" data-action="tools" data-academy-menu-toggle
    aria-label="${en?'Lesson navigation':'Навигация по уроку'}" aria-controls="academy-lesson-tools" aria-expanded="false">${en?'Menu':'Меню'}</button>`;
}

export function academyLessonMenuPanel({locale, programHref, assistantEnabled}) {
  const t = (ru, en) => locale === 'en' ? en : ru;
  return `<div class="lesson-tools academy-lesson-tools" id="academy-lesson-tools" data-academy-menu-panel hidden><div class="academy-lesson-menu-items">
    <a class="btn" data-academy-menu-item="program" href="${escape(programHref)}">${t('Программа курса', 'Course outline')}</a>
    <button type="button" class="btn" data-r3-assistant data-academy-menu-item="assistant"${assistantEnabled ? '' : ' disabled'}>
      ${t('Разобрать с Akronikl', 'Discuss with Akronikl')}
    </button>
    <button type="button" class="btn" data-academy-menu-item="reading">${t('Что почитать по теме', 'What to read')}</button>
    <button type="button" class="btn" data-academy-menu-item="video">${t('Что посмотреть по теме', 'What to watch')}</button>
  </div></div>`;
}

export function bindAcademyLessonMenu(root, {locale, courseId, topicId, title, offline, signal,
  isCurrent, openAssistant, showError}) {
  let activeDialog;
  let request = 0;
  const live = () => !signal.aborted && root.isConnected && isCurrent();
  const toggle = root.querySelector('[data-academy-menu-toggle]');
  const panel = root.querySelector('[data-academy-menu-panel]');
  const header = toggle.closest('header');
  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded',String(open));
  }
  toggle.addEventListener('click',()=>setOpen(panel.hidden),{signal});
  header.addEventListener('keydown',event=>{
    if (event.key!=='Escape'||panel.hidden) return;
    event.preventDefault();
    setOpen(false);
    toggle.focus({preventScroll:true});
  },{signal});
  window.addEventListener('pointerdown',event=>{
    if (live()&&!panel.hidden&&!event.composedPath().includes(header)) setOpen(false);
  },{signal});
  root.addEventListener('focusin',event=>{
    if (!panel.hidden&&!event.composedPath().includes(header)) setOpen(false);
  },{signal});
  root.addEventListener('click', async event => {
    const action = event.target.closest('[data-academy-menu-item]');
    if (!action || !live()) return;
    const kind = action.dataset.academyMenuItem;
    if (kind === 'program') return;
    setOpen(false);
    showError('');
    if (kind === 'assistant') {
      openAssistant?.(toggle);
      return;
    }
    if (kind !== 'reading' && kind !== 'video') return;
    const serial = ++request;
    try {
      const {openAcademyLibrary} = await import('./academy-lesson-library.mjs');
      if (!live() || request !== serial) return;
      activeDialog?.close();
      activeDialog = openAcademyLibrary(root, {kind, courseId, topicId, title, locale, trigger:toggle, offline});
    } catch {
      if (live() && request === serial) showError(locale === 'en'
        ? 'The lesson library could not be opened. Try again.'
        : 'Библиотеку урока не удалось открыть. Попробуйте ещё раз.');
    }
  }, {signal});
  signal.addEventListener('abort', () => activeDialog?.close(), {once:true});
  return setOpen;
}
