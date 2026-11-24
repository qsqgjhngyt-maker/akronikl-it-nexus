import {bindCCourseWorkspace, createCCourseStorage} from './c-course-workspace.mjs';
import {registerUpdateParticipant} from '../pwa/interface-update.js';

const stages = [
  ['explanation', 'Объяснение', 'Explanation'],
  ['selfcheck', 'Самопроверка', 'Self-check'],
  ['practice', 'Практика', 'Practice'],
];
const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
const localized = (entry, locale) => entry?.[locale] ?? entry?.ru ?? '';
const dataRoot = new URL('../courses/c/', import.meta.url);

async function loadJson(path) {
  const response = await fetch(new URL(path, dataRoot));
  if (!response.ok) throw new Error('C course data could not be loaded: ' + response.status);
  return response.json();
}

let course;
async function loadCourse() {
  return course ??= Promise.all([loadJson('manifest.json'), loadJson('curriculum.json')])
    .then(([manifest, curriculum]) => {
      const available = new Set(manifest.availableTopicIds);
      const topics = curriculum.modules
        .filter(module => manifest.availableModuleIds.includes(module.id))
        .flatMap(module => module.topics.filter(topic => available.has(topic.id)));
      return {manifest, curriculum, topics};
    })
    .catch(error => { course = undefined; throw error; });
}

function routeLink(locale, lessonId, stage) {
  const params = new URLSearchParams({course:'c'});
  if (lessonId) params.set('lesson', lessonId);
  if (lessonId && stage && stage !== 'explanation') params.set('stage', stage);
  params.set('locale', locale);
  return '#' + params.toString();
}

function button(href, text, primary = false) {
  return '<a class="btn' + (primary ? ' primary' : '') + '" href="' + escape(href) + '">' + escape(text) + '</a>';
}

function codeBlock(value, empty) {
  return value === '' && empty ? '<p>' + escape(empty) + '</p>' : '<pre><code>' + escape(value) + '</code></pre>';
}

function list(items) {
  return '<ul>' + items.map(item => '<li>' + escape(item) + '</li>').join('') + '</ul>';
}

function safeRead(storage, key) {
  try { return JSON.parse(storage?.getItem(key) ?? 'null'); }
  catch { return null; }
}

function overview({data, locale, t, resume, progress}) {
  const {manifest, curriculum, topics} = data;
  const last = topics.find(topic => topic.id === resume?.lessonId);
  const start = last ?? topics[0];
  const modules = curriculum.modules.map(module => {
    const active = manifest.availableModuleIds.includes(module.id);
    const links = module.topics.map(topic => {
      const title = escape(localized(topic.title, locale));
      if (!active || !topics.some(item => item.id === topic.id)) return '<li>' + title + '</li>';
      const completed = progress.has(topic.id);
      return '<li><a href="' + escape(routeLink(locale, topic.id)) + '">' + title + '</a>' +
        (completed ? ' <small>' + escape(t('Изучен', 'Studied')) + '</small>' : '') + '</li>';
    }).join('');
    const heading = '<h2>' + escape(localized(module.title, locale)) + '</h2>';
    const goals = list(localized(module.goals, locale) || []);
    return active
      ? '<section class="c-panel">' + heading + goals + '<ol class="c-outline">' + links + '</ol></section>'
      : '<details class="c-panel"><summary>' + escape(localized(module.title, locale)) + ' · ' +
        escape(t('В плане', 'Planned')) + '</summary>' + goals + '<ol>' + links + '</ol></details>';
  }).join('');
  return '<a class="back-link" href="#view=academy">← ' + escape(t('Академия', 'Academy')) + '</a>' +
    '<header class="c-panel"><p>C17 · ' + escape(t('Первый модуль', 'First module')) + '</p><h1>' +
    escape(localized(manifest.title, locale)) + '</h1><p>' + escape(localized(manifest.description, locale)) +
    '</p><p>' + escape(t('Изучено ', 'Studied ') + progress.size + ' / ' + topics.length) + '</p>' +
    button(routeLink(locale, start?.id, last ? resume.stage : undefined),
      last ? t('Продолжить: ', 'Resume: ') + localized(last.title, locale) : t('Начать первый урок', 'Start the first lesson'), true) +
    '</header>' + modules;
}

function renderCode(code, t, {showResult = true} = {}) {
  if (!code) return '';
  const input = code.stdin ? '<div><h4>' + t('Ввод', 'Input') + '</h4>' + codeBlock(code.stdin) + '</div>' : '';
  const result = !showResult || code.output === undefined ? '' : '<div><h4>' + t('Вывод', 'Output') + '</h4>' +
    codeBlock(code.output, t('Пустой вывод', 'No output')) + '</div>';
  const diagnostic = code.diagnostic ? '<p><strong>' + t('Диагностика', 'Diagnostic') + '</strong> ' +
    escape(code.diagnostic) + '</p>' : '';
  return '<div class="c-example"><div><h4>main.c</h4>' + codeBlock(code.source) + '</div>' +
    (input || result ? '<div class="c-example-io">' + input + result + '</div>' : '') + diagnostic + '</div>';
}

function explanation(lesson, t) {
  const contents = '<nav class="c-panel c-contents" aria-label="' + t('Содержание объяснения', 'Explanation contents') +
    '"><h2>' + t('Содержание', 'Contents') + '</h2><ol>' + lesson.sections.map(section =>
      '<li><button type="button" class="c-section-link" data-c-jump="' + escape(section.id) + '">' +
      escape(section.title) + '</button></li>').join('') + '</ol></nav>';
  const sections = lesson.sections.map(section =>
    '<section class="c-panel" data-c-section="' + escape(section.id) + '" tabindex="-1"><h2>' + escape(section.title) + '</h2>' +
    (section.paragraphs ?? []).map(paragraph => '<p>' + escape(paragraph) + '</p>').join('') +
    renderCode(section.code, t) +
    (section.steps?.length ? '<ol>' + section.steps.map(step => '<li>' + escape(step) + '</li>').join('') + '</ol>' : '') +
    (section.trace?.length ? '<ol class="c-trace">' + section.trace.map(row => '<li>' +
      row.map((cell, index) => (index === 0 ? '<strong>' + escape(cell) + '</strong>' : '<span>' + escape(cell) + '</span>')).join('') +
      '</li>').join('') + '</ol>' : '') + '</section>').join('');
  const prerequisites = lesson.prerequisites.map(item => item.text ?? item).filter(Boolean);
  const bibliography = (lesson.reading ?? []).map(item => '<li><strong>' + escape(item.title) + '</strong> ' +
    escape([item.edition, item.section].filter(Boolean).join(' · ')) + '<p>' + escape(item.purpose) + '</p></li>').join('');
  const diagnostics = (lesson.diagnosticExercises ?? []).map(item =>
    '<section class="c-panel"><h2>' + t('Разбор ошибки компиляции', 'Read a compiler diagnostic') + '</h2>' +
    '<p>' + t('Найдите место ошибки в программе и сравните его с сообщением компилятора.', 'Find the error in the program and compare its location with the compiler message.') +
    '</p>' + codeBlock(item.source) + '<h3>' + t('Фрагмент сообщения Clang', 'Excerpt from the Clang diagnostic') +
    '</h3>' + codeBlock(Array.isArray(item.stderrIncludes) ? item.stderrIncludes.join(' · ') : item.stderrIncludes) + '</section>').join('');
  return '<div class="c-reading">' + contents + '<div><section class="c-panel"><h2>' + t('На этом уроке', 'In this lesson') +
    '</h2><p>' + escape(lesson.goal) + '</p>' + (prerequisites.length ? list(prerequisites) : '') + '</section>' + sections + diagnostics +
    (bibliography ? '<details class="c-panel"><summary>' + t('Дополнительное чтение', 'Further reading') + '</summary><ul>' +
    bibliography + '</ul></details>' : '') + '</div></div>';
}

function selfcheck(lesson, t, responses) {
  return lesson.selfcheck.map((item, index) => {
    const response = responses[item.id];
    const answer = item.kind === 'choice' ? '<fieldset><legend>' + t('Выберите ответ', 'Choose an answer') +
      '</legend>' + item.options.map((option, optionIndex) => '<label class="c-option"><input type="radio" name="c-question-' +
        index + '" value="' + optionIndex + '"' + (response === optionIndex ? ' checked' : '') + '> ' + escape(option) + '</label>').join('') +
      '</fieldset><button class="btn" type="button" data-c-check>' + t('Проверить ответ', 'Check answer') +
      '</button><p role="status" data-c-feedback></p>' : '<label>' + t('Ваше объяснение', 'Your explanation') +
      '<textarea data-c-explanation rows="3">' + escape(response ?? '') + '</textarea></label>' +
      '<details><summary>' + t('Сверить объяснение', 'Compare your explanation') + '</summary><p>' +
      escape(item.feedback) + '</p></details>';
    return '<section class="c-panel" data-c-question="' + index + '"><h2>' + escape(item.prompt) + '</h2>' +
      renderCode(item.code, t, {showResult:false}) + answer + '</section>';
  }).join('');
}

function practice(lesson, t, readonly) {
  const work = lesson.practice;
  const steps = (work.steps ?? []).map(step => '<li><strong>' + escape(step.action) + '</strong>' +
    (step.where && step.where !== 'Code Studio' ? ' <small>' + escape(step.where) + '</small>' : '') +
    (step.why ? '<p>' + escape(step.why) + '</p>' : '') +
    (step.expected ? '<p>' + escape(step.expected) + '</p>' : '') + '</li>').join('');
  const cases = work.cases.map(test => '<section class="c-test"><h3>' + escape(test.label) + '</h3>' +
    '<div class="c-case-pair"><div><h4>' + t('Ввод', 'Input') + '</h4>' + codeBlock(test.input, t('Ввод не нужен', 'No input')) +
    '</div><div><h4>' + t('Ожидаемый вывод', 'Expected output') + '</h4>' +
    codeBlock(test.output, t('Пустой вывод', 'No output')) + '</div></div></section>').join('');
  const reference = work.referenceSolution;
  return '<section class="c-panel"><h2>' + escape(work.title) + '</h2><p>' + escape(work.task) +
    '</p><ol>' + steps + '</ol><details><summary>' + t('Подсказка', 'Hint') + '</summary><p>' + escape(work.hint) +
    '</p></details></section>' +
    (readonly
      ? '<section class="c-panel"><h2>Code Studio</h2><p>' + t('Автономная версия урока доступна для чтения. Для запуска и сохранения откройте рабочую страницу Nexus.', 'The offline lesson is available for reading. Open the Nexus workspace to run and save your program.') + '</p>' +
        (work.files ?? []).map(file => '<h3>' + escape(file.path) + '</h3>' + codeBlock(file.content ?? file.source)).join('') +
        '</section>'
      : '<section class="c-panel c-workspace" data-c-workspace aria-label="Code Studio"></section>') +
    '<section class="c-panel"><h2>' + t('Как проверить свою работу', 'How to check your work') + '</h2>' +
    cases + list(work.criteria) + '</section>' +
    (work.exercises ?? []).map(item => '<section class="c-panel"><h2>' + escape(item.title) + '</h2><p>' +
      escape(item.task) + '</p>' + list(item.criteria ?? []) + '</section>').join('') +
    (reference ? '<details class="c-panel"><summary>' + t('Эталонное решение', 'Reference solution') +
      '</summary><p>' + t('Откройте после своей попытки и сравните с вашим решением.', 'Open after your attempt and compare with your solution.') +
      '</p>' + codeBlock(reference.source) + Object.entries(reference.files ?? {}).map(([path, source]) =>
        '<h3>' + escape(path) + '</h3>' + codeBlock(typeof source === 'string' ? source : source.content ?? source.source)).join('') +
      '</details>' : '');
}

function lessonMarkup({lesson, data, locale, t, stage, progress, responses, canSave, readonly}) {
  const index = data.topics.findIndex(topic => topic.id === lesson.id);
  const previous = data.topics[index - 1], next = data.topics[index + 1];
  const titleOf = topic => localized(topic.title, locale);
  const nextLabel = next ? t('Следующий урок: ', 'Next lesson: ') + titleOf(next) + ' →' : '';
  const contents = stage === 'explanation' ? explanation(lesson, t) :
    stage === 'selfcheck' ? selfcheck(lesson, t, responses) : practice(lesson, t, readonly);
  const tabs = stages.map(([id, ru, en]) =>
    '<a class="btn" href="' + escape(routeLink(locale, lesson.id, id)) + '"' +
    (id === stage ? ' aria-current="page"' : '') + '>' + t(ru, en) + '</a>').join('');
  const action = stage === 'explanation'
    ? button(routeLink(locale, lesson.id, 'selfcheck'), t('Дальше: самопроверка →', 'Next: self-check →'), true)
    : stage === 'selfcheck'
      ? button(routeLink(locale, lesson.id, 'practice'), t('Перейти к практике →', 'Go to practice →'), true)
      : next ? button(routeLink(locale, next.id), nextLabel, true)
        : '<p>' + t('Это последний урок первого модуля.', 'This is the last lesson in the first module.') + '</p>' +
          button(routeLink(locale), t('Вернуться к программе →', 'Back to the course outline →'), true);
  const terms = '<details class="c-panel c-glossary"><summary>' + t('Справка по теме', 'Lesson reference') + '</summary><dl>' +
    lesson.terms.map(term => '<dt>' + escape(term.term ?? term.title) + '</dt><dd>' + escape(term.definition) + '</dd>').join('') +
    '</dl></details>';
  return '<header class="c-panel c-lesson-header"><a class="back-link" href="' + escape(routeLink(locale)) + '">' +
    t('← Программа C', '← C course outline') + '</a><p>C17 · ' + t('Тема ', 'Lesson ') + (index + 1) +
    ' / ' + data.topics.length + '</p><h1 tabindex="-1" data-c-heading>' + escape(lesson.title) + '</h1>' +
    '<nav class="c-neighbors" aria-label="' + t('Уроки', 'Lessons') + '">' +
    (previous ? button(routeLink(locale, previous.id), t('← Предыдущий урок: ', '← Previous lesson: ') + titleOf(previous)) : '') +
    (next ? button(routeLink(locale, next.id), nextLabel) : '') + '</nav>' +
    '<nav class="c-stages" aria-label="' + t('Этапы урока', 'Lesson stages') + '">' + tabs + '</nav></header>' +
    '<div class="c-unit-body"><div class="c-main">' + contents + '<footer class="c-panel c-actions">' +
    (stage === 'practice' && canSave ? '<button class="btn" type="button" data-c-complete aria-pressed="' + progress.has(lesson.id) +
      '">' + (progress.has(lesson.id) ? t('Отмечен изученным', 'Marked as studied') : t('Отметить изученным', 'Mark as studied')) +
      '</button>' : '') + action + '</footer></div>' + terms + '</div>';
}

export async function mountCCourse(host, {lessonId, stage, locale = 'ru', readonly = false, isCurrent = () => true} = {}) {
  if (!host) return null;
  locale = locale === 'en' ? 'en' : 'ru';
  stage = stages.some(([id]) => id === stage) ? stage : 'explanation';
  const t = (ru, en) => locale === 'en' ? en : ru;
  const data = await loadCourse();
  const topic = data.topics.find(item => item.id === lessonId);
  const lesson = topic ? await loadJson('lessons/' + topic.id + '.' + locale + '.json') : null;
  if (!isCurrent()) return null;
  const hash = location.hash;
  const storage = readonly ? null : createCCourseStorage();
  const resume = safeRead(storage, 'last-lesson');
  const storedProgress = safeRead(storage, 'studied');
  const progress = new Set(Array.isArray(storedProgress) ? data.topics.filter(item => storedProgress.includes(item.id)).map(item => item.id) : []);
  const responseKey = 'responses:' + lessonId + ':' + locale;
  const storedResponses = safeRead(storage, responseKey);
  const responses = storedResponses && typeof storedResponses === 'object' && !Array.isArray(storedResponses) ? storedResponses : {};
  const events = new AbortController();
  const options = {signal:events.signal};
  host.lang = locale;
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('./c-course.css', import.meta.url).href;
  host.innerHTML = '<p class="c-route-status" role="status" data-c-status></p>' +
    (lesson ? lessonMarkup({lesson, data, locale, t, stage, progress, responses, canSave:Boolean(storage), readonly}) :
      (lessonId ? '<p role="status">' + t('Эта тема пока недоступна.', 'This lesson is not available yet.') + '</p>' : '') +
      overview({data, locale, t, resume, progress}));
  host.prepend(style);

  const status = host.querySelector('[data-c-status]');
  function store(key, value) {
    if (!storage) return false;
    try { storage.setItem(key, JSON.stringify(value)); return true; }
    catch {
      status.textContent = t('Не удалось сохранить состояние урока на этом устройстве.', 'Lesson state could not be saved on this device.');
      return false;
    }
  }

  if (lesson) store('last-lesson', {lessonId, stage});
  let workspace;
  if (lesson && stage === 'practice' && !readonly) {
    workspace = bindCCourseWorkspace({host:host.querySelector('[data-c-workspace]'), locale, lesson});
  }
  let unsavedResponse = false;
  function saveResponse(question, value) {
    responses[question.id] = value;
    if (storage) unsavedResponse = !store(responseKey, responses);
  }

  host.querySelectorAll('[data-c-jump]').forEach(button => button.addEventListener('click', () => {
    const section = [...host.querySelectorAll('[data-c-section]')].find(element => element.dataset.cSection === button.dataset.cJump);
    section?.focus({preventScroll:true});
    section?.scrollIntoView({block:'start'});
  }, options));
  host.querySelectorAll('[data-c-question]').forEach(panel => {
    const question = lesson.selfcheck[Number(panel.dataset.cQuestion)];
    panel.querySelectorAll('input[type="radio"]').forEach(radio =>
      radio.addEventListener('change', () => saveResponse(question, Number(radio.value)), options));
    panel.querySelector('[data-c-explanation]')?.addEventListener('input', event =>
      saveResponse(question, event.target.value), options);
    panel.querySelector('[data-c-check]')?.addEventListener('click', () => {
      const answer = responses[question.id];
      panel.querySelector('[data-c-feedback]').textContent = question.feedback[answer] ??
        t('Сначала выберите ответ.', 'Choose an answer first.');
    }, options);
  });
  host.querySelector('[data-c-complete]')?.addEventListener('click', event => {
    if (progress.has(lesson.id) || workspace?.flush() === false) return;
    const next = new Set(safeRead(storage, 'studied')?.filter?.(id => data.topics.some(topic => topic.id === id)) ?? []);
    next.add(lesson.id);
    if (!store('studied', [...next])) return;
    progress.add(lesson.id);
    event.currentTarget.setAttribute('aria-pressed', 'true');
    event.currentTarget.textContent = t('Отмечен изученным', 'Marked as studied');
  }, options);

  const heading = host.querySelector('[data-c-heading]');
  heading?.focus({preventScroll:true});
  function flush() {
    const saved = (workspace?.flush() ?? true) && (!unsavedResponse || store(responseKey, responses));
    if (saved) unsavedResponse = false;
    return saved;
  }
  const unregisterUpdate = registerUpdateParticipant({
    flush() {
      if (!flush()) throw Error(t('Сначала сохраните работу в уроке C.', 'Save your work in the C lesson first.'));
    },
  });
  if (lesson && stage === 'selfcheck' && storage) {
    window.addEventListener('beforeunload', event => {
      if (!unsavedResponse || flush()) return;
      event.preventDefault();
      event.returnValue = true;
    }, options);
  }
  return {
    prepareNavigation() {
      if (!flush()) {
        if (location.hash !== hash) history.replaceState(null, '', hash);
        status.textContent = t('Переход остановлен. Проверьте сохранение работы.', 'Navigation stopped. Check that your work can be saved.');
        (workspace ? host.querySelector('[data-c-workspace]') : status)?.scrollIntoView({block:'start'});
        return false;
      }
      return true;
    },
    dispose() {
      events.abort();
      unregisterUpdate();
      workspace?.dispose();
    },
  };
}
