import {bindCCourseWorkspace, createCCourseStorage} from './c-course-workspace.mjs';
import {courseNavigationMarkup} from './academy-course-navigation.mjs';
import {academyLessonMenuItems, bindAcademyLessonMenu} from './academy-lesson-menu.mjs';
import {bindGlossaryDrawer, termReferenceMarkup} from './nexus-learning-ui.js';
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

let styleReady;
function ensureCCourseStyle() {
  return styleReady ??= new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.cCourseStyle = '';
    link.href = new URL('./c-course.css', import.meta.url).href;
    link.addEventListener('load', resolve, {once:true});
    link.addEventListener('error', () => {
      link.remove();
      styleReady = undefined;
      reject(new Error('C course styles could not be loaded'));
    }, {once:true});
    document.head.append(link);
  });
}

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

function routeLink(locale, lessonId, stage, moduleId) {
  const params = new URLSearchParams({course:'c'});
  if (lessonId) params.set('lesson', lessonId);
  if (!lessonId && moduleId) params.set('module', moduleId);
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

function overview({data, locale, t, resume, progress, selectedModule}) {
  const {manifest, curriculum, topics} = data;
  const last = topics.find(topic => topic.id === resume?.lessonId);
  const start = last ?? topics[0];
  const moduleIds = new Set(manifest.availableModuleIds);
  const numbers = new Map(topics.map((topic, index) => [topic.id, index + 1]));
  const modules = curriculum.modules.map((module, index) => ({
    id: module.id,
    title: localized(module.title, locale),
    number: index + 1,
    available: moduleIds.has(module.id),
    topics: module.topics.map(topic => ({
      id: topic.id,
      title: localized(topic.title, locale),
      number: numbers.get(topic.id),
      href: numbers.has(topic.id) ? routeLink(locale, topic.id) : null,
      completed: progress.has(topic.id),
    })),
  }));
  const navigation = courseNavigationMarkup({locale, modules, selectedModule,
    overviewHref: routeLink(locale), moduleHref: id => routeLink(locale, null, null, id)});
  if (modules.some(module => module.id === selectedModule)) {
    return '<div class="nexus-learning c-module-view"><h1>' + escape(localized(manifest.title, locale)) +
      '</h1>' + navigation + '</div>';
  }
  const percent = topics.length ? Math.round(100 * progress.size / topics.length) : 0;
  const moduleCount = manifest.availableModuleIds.length + (manifest.availableModuleIds.length === curriculum.moduleCount ? '' : ' / ' + curriculum.moduleCount);
  const studied = t('Изучено', 'Studied');
  return '<div class="nexus-learning"><a class="back-link" href="#view=academy">← ' + t('Академия', 'Academy') + '</a>' +
    '<header class="c-panel course-hero"><div class="course-code large" aria-hidden="true">C<span>17</span></div><div>' +
    '<p class="eyebrow">' + t('Учебный курс C17', 'C17 course') + '</p><h1>' +
    escape(localized(manifest.title, locale)) + '</h1><p>' + escape(localized(manifest.description, locale)) + '</p>' +
    '<div class="learning-course-facts"><span>' + t('Модули: ', 'Modules: ') + '<b>' + moduleCount + '</b></span><span>' +
    t('Темы: ', 'Lessons: ') + '<b>' + topics.length + '</b></span></div>' +
    '<div class="progress-row"><span>' + studied + ' <b>' + progress.size + ' / ' + topics.length + '</b></span><span>' + percent +
    '%</span></div><div class="progress" role="progressbar" aria-label="' + studied + '" aria-valuemin="0" aria-valuemax="' +
    topics.length + '" aria-valuenow="' + progress.size + '"><i style="width:' + percent + '%"></i></div>' +
    button(routeLink(locale, start?.id, last ? resume.stage : undefined),
      last ? t('Продолжить: ', 'Resume: ') + localized(last.title, locale) : t('Начать первый урок', 'Start the first lesson'), true) +
    '</div></header>' + navigation + '</div>';
}

function renderFiles(files, t, heading) {
  if (!files) return '';
  const items = Object.entries(files);
  return '<div class="c-case-files"><h4>' + heading + '</h4>' +
    (items.length ? items.map(([name, content]) => '<p><code>' + escape(name) + '</code></p>' +
      codeBlock(content, t('Файл без содержимого', 'Empty file'))).join('') :
      '<p>' + t('Файлов нет', 'No files') + '</p>') + '</div>';
}

function renderCode(code, t, {showResult = true} = {}) {
  if (!code) return '';
  const input = code.stdin ? '<div><h4>' + t('Ввод', 'Input') + '</h4>' + codeBlock(code.stdin) + '</div>' : '';
  const result = !showResult || code.output === undefined ? '' : '<div><h4>' + t('Вывод', 'Output') + '</h4>' +
    codeBlock(code.output, t('Пустой вывод', 'No output')) + '</div>';
  const diagnostic = code.diagnostic ? '<p><strong>' + t('Диагностика', 'Diagnostic') + '</strong> ' +
    escape(code.diagnostic) + '</p>' : '';
  return '<div class="c-example"><div><h4>main.c</h4>' + codeBlock(code.source) + '</div>' +
    renderFiles(code.files, t, t('Файлы примера', 'Example files')) +
    (input || result ? '<div class="c-example-io">' + input + result + '</div>' : '') +
    (showResult ? renderFiles(code.outputFiles, t, t('Файлы результата', 'Result files')) +
      (code.stderr ? '<div><h4>' + t('Диагностический вывод', 'Diagnostic output') + '</h4>' + codeBlock(code.stderr) + '</div>' : '') +
      (code.exitCode ? '<p>' + t('Код завершения ', 'Exit status ') + escape(code.exitCode) + '</p>' : '') : '') +
    diagnostic + '</div>';
}

function lessonReference(lesson, locale, t) {
  const terms = lesson.terms.map(term => ({...term, term:term.term ?? term.title}));
  const examples = lesson.sections.filter(section => section.code);
  return '<div class="lesson-floating c-lesson-reference" role="group" aria-label="' + t('Справка', 'Help') + '">' +
    '<button class="quick-action" type="button" data-open-terms data-c-reference="terms"><span aria-hidden="true">⌕</span> ' +
    t('Справочник', 'Reference') + '</button>' +
    '<button class="quick-action" type="button" data-open-terms data-c-reference="syntax"><span aria-hidden="true">{ }</span> ' +
    t('Синтаксис', 'Syntax') + '</button></div>' +
    termReferenceMarkup(terms, {uiLocale:locale, contentLocale:locale}).replace('</dialog>',
      '<div class="drawer-scroll c-syntax-list" data-c-syntax-list tabindex="0" role="region" aria-labelledby="termDrawerTitle" hidden>' +
      examples.map(section => '<section><h3>' + escape(section.title) + '</h3>' + renderCode(section.code, t) + '</section>').join('') +
      '</div></dialog>');
}

function bindLessonReference(host, t) {
  const drawer = host.querySelector('#termDrawer');
  const title = drawer.querySelector('#termDrawerTitle');
  const search = drawer.querySelector('.drawer-search');
  const termList = drawer.querySelector('#termList');
  const syntaxList = drawer.querySelector('[data-c-syntax-list]');
  return bindGlossaryDrawer(host, {
    prepareOpen(trigger) {
      const syntax = trigger.dataset.cReference === 'syntax';
      drawer.toggleAttribute('data-c-syntax', syntax);
      title.textContent = syntax ? t('Синтаксис C17 по теме', 'C17 syntax for this lesson') :
        t('Справочник терминов', 'Terminology reference');
      search.hidden = syntax;
      termList.hidden = syntax;
      syntaxList.hidden = !syntax;
      return syntax ? syntaxList : search.querySelector('input');
    },
  });
}

function explanation(lesson, t) {
  const contents = '<details class="c-panel c-contents" open><summary>' + t('Содержание', 'Contents') +
    '</summary><nav aria-label="' + t('Содержание объяснения', 'Explanation contents') +
    '"><ol>' + lesson.sections.map(section =>
      '<li><button type="button" class="c-section-link" data-c-jump="' + escape(section.id) + '">' +
      escape(section.title) + '</button></li>').join('') + '</ol></nav></details>';
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
    '<section class="c-panel"><h2>' + (item.phase === 'link' ? t('Разбор ошибки компоновки', 'Read a linker diagnostic') : t('Разбор ошибки компиляции', 'Read a compiler diagnostic')) + '</h2>' +
    '<p>' + t('Найдите место ошибки в программе и сравните его с сообщением компилятора.', 'Find the error in the program and compare its location with the compiler message.') +
    '</p>' + codeBlock(item.source) + renderFiles(item.files, t, t('Файлы проекта', 'Project files')) + '<h3>' + t('Фрагмент сообщения Clang', 'Excerpt from the Clang diagnostic') +
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

function practiceFile(name, source, t) {
  return '<div class="c-practice-file"><h4>' + escape(name) + '</h4>' + codeBlock(source) +
    '<button type="button" class="btn" data-c-copy-source>' + t('Скопировать код', 'Copy code') + '</button></div>';
}

function practice(lesson, t, readonly) {
  const work = lesson.practice;
  const steps = (work.steps ?? []).map(step => '<li><strong>' + escape(step.action) + '</strong>' +
    (step.where && step.where !== 'Code Studio' ? ' <small>' + escape(step.where) + '</small>' : '') +
    (step.why ? '<p>' + escape(step.why) + '</p>' : '') +
    (step.expected ? '<p>' + escape(step.expected) + '</p>' : '') + '</li>').join('');
  const cases = work.cases.map((test, index) => '<details class="c-test"' + (index === 0 ? ' open' : '') +
    '><summary>' + escape(test.label) + '</summary>' +
    '<div class="c-case-pair"><div><h4>' + t('Ввод', 'Input') + '</h4>' + codeBlock(test.input, t('Ввод не нужен', 'No input')) +
    '</div><div><h4>' + t('Ожидаемый вывод', 'Expected output') + '</h4>' +
    codeBlock(test.output, t('Пустой вывод', 'No output')) + '</div></div>' +
    renderFiles(test.inputFiles, t, t('Входные файлы', 'Input files')) +
    renderFiles(test.outputFiles, t, t('Изменённые и созданные файлы', 'Changed and created files')) +
    (test.stderr ? '<div><h4>' + t('Диагностический вывод', 'Diagnostic output') + '</h4>' + codeBlock(test.stderr) + '</div>' : '') +
    (test.exitCode ? '<p>' + t('Код завершения ', 'Exit status ') + escape(test.exitCode) + '</p>' : '') + '</details>').join('');
  const reference = work.referenceSolution;
  const starter = work.files.map(file => practiceFile(file.path, file.content ?? file.source, t)).join('');
  const referenceFiles = Object.entries(reference?.files ?? {}).map(([name, source]) =>
    practiceFile(name, typeof source === 'string' ? source : source.content ?? source.source, t)).join('');
  return '<section class="c-panel c-practice-task" data-c-work-task><h2>' + escape(work.title) + '</h2><p>' +
    escape(work.task) + '</p><h3>' + t('Паспорт задачи', 'Task contract') + '</h3><dl class="c-task-contract">' +
    '<dt>' + t('Среда', 'Environment') + '</dt><dd>' + escape(work.environment) + '</dd><dt>' +
    t('Точка входа', 'Entry point') + '</dt><dd><code>' + escape(work.metadata.entryFile) + '</code></dd></dl>' +
    '<details class="c-practice-disclosure" data-c-starter-preview><summary>' + t('Посмотреть заготовку', 'View starter') +
    '</summary>' + starter + (work.stdin ? '<h4>' + t('Начальный ввод', 'Starter input') + '</h4>' +
      codeBlock(work.stdin) : '') + '</details>' +
    (steps ? '<h3>' + t('Порядок работы', 'Work steps') + '</h3><ol class="c-practice-steps">' + steps + '</ol>' : '') +
    (work.hint ? '<details class="c-practice-disclosure"><summary>' + t('Подсказка', 'Hint') +
      '</summary><p>' + escape(work.hint) + '</p></details>' : '') + '</section>' +
    (readonly
      ? '<section class="c-panel"><h2>Code Studio</h2><p>' + t('Автономная версия урока доступна для чтения. Для запуска и сохранения откройте рабочую страницу Nexus.', 'The offline lesson is available for reading. Open the Nexus workspace to run and save your program.') + '</p></section>'
      : '<section class="c-panel c-workspace-section"><h2>' + t('Рабочее окно урока', 'Lesson workspace') +
        '</h2><button type="button" class="btn" data-c-open-work-window>' +
        t('Задание и Code Studio', 'Task and Code Studio') +
        '</button><div class="c-workspace" data-c-workspace aria-label="Code Studio"></div></section>') +
    '<section class="c-panel" data-c-work-cases><h2>' + t('Как проверить свою работу', 'How to check your work') + '</h2>' +
    cases + list(work.criteria) + '</section>' +
    (work.exercises ?? []).map(item => '<section class="c-panel"><h2>' + escape(item.title) + '</h2><p>' +
      escape(item.task) + '</p>' + list(item.criteria ?? []) + '</section>').join('') +
    (reference ? '<details class="c-panel c-practice-disclosure" data-c-reference-solution><summary>' +
      t('Посмотреть эталонное решение', 'View reference solution') +
      '</summary><p>' + t('Откройте после своей попытки и сравните с вашим решением.', 'Open after your attempt and compare with your solution.') +
      '</p>' + practiceFile(reference.metadata?.entryFile ?? work.metadata.entryFile, reference.source, t) + referenceFiles +
      '</details>' : '');
}

function lessonMarkup({lesson, data, locale, t, stage, progress, responses, canSave, readonly, assistantEnabled}) {
  const index = data.topics.findIndex(topic => topic.id === lesson.id);
  const previous = data.topics[index - 1], next = data.topics[index + 1];
  const module = data.curriculum.modules.find(item => item.id === lesson.moduleId);
  const overviewHref = routeLink(locale);
  const moduleHref = routeLink(locale, null, null, module?.id);
  const moduleTitle = localized(module?.title, locale);
  const titleOf = topic => localized(topic.title, locale);
  const nextLabel = next ? t('Следующий урок: ', 'Next lesson: ') + titleOf(next) + ' →' : '';
  const contents = stage === 'explanation' ? explanation(lesson, t) :
    stage === 'selfcheck' ? selfcheck(lesson, t, responses) : practice(lesson, t, readonly);
  const tabs = stages.map(([id, ru, en]) =>
    '<a class="btn" href="' + escape(routeLink(locale, lesson.id, id)) + '"' +
    (id === stage ? ' aria-current="step"' : '') + '>' + t(ru, en) +
    (id === stage ? '<span class="c-current-marker" aria-hidden="true"></span>' : '') + '</a>').join('');
  const action = stage === 'explanation'
    ? button(routeLink(locale, lesson.id, 'selfcheck'), t('Дальше: самопроверка →', 'Next: self-check →'), true)
    : stage === 'selfcheck'
      ? button(routeLink(locale, lesson.id, 'practice'), t('Перейти к практике →', 'Go to practice →'), true)
      : next ? button(routeLink(locale, next.id), nextLabel, true)
        : '<p>' + t('Вы дошли до конца доступных уроков курса C17.', 'You have reached the end of the available C17 lessons.') + '</p>' +
          button(routeLink(locale), t('Вернуться к программе →', 'Back to the course outline →'), true);
  return '<nav class="c-breadcrumbs" aria-label="' + t('Место в Академии', 'Location in the Academy') +
    '"><ol><li><a href="#view=academy">' + t('Академия', 'Academy') + '</a></li><li><a href="' +
    escape(overviewHref) + '">C17</a></li>' + (module ? '<li><a href="' +
      escape(moduleHref) + '">' + escape(moduleTitle) + '</a></li>' : '') + '</ol></nav>' +
    '<header class="c-lesson-header"><div class="c-context-row"><span class="c-topic-marker">' +
    t('Тема ', 'Lesson ') + (index + 1) + '/' + data.topics.length + '</span><h1 tabindex="-1" data-c-heading>' +
    escape(lesson.title) + '</h1><details class="c-lesson-menu"><summary class="btn">' + t('Меню', 'Menu') +
    '</summary><div class="c-lesson-menu-links">' +
    academyLessonMenuItems({locale, programHref:overviewHref, assistantEnabled}) + '</div></details></div>' +
    '<nav class="c-stages" aria-label="' + t('Этапы урока', 'Lesson stages') + '">' + tabs + '</nav></header>' +
    '<p data-academy-library-status role="status"></p>' +
    '<nav class="c-neighbors" aria-label="' + t('Уроки', 'Lessons') + '">' +
    (previous ? button(routeLink(locale, previous.id), t('← Предыдущий урок: ', '← Previous lesson: ') + titleOf(previous)) : '') +
    (next ? button(routeLink(locale, next.id), nextLabel) : '') + '</nav>' +
    '<div class="c-main">' + contents + '<footer class="c-panel c-actions">' +
    (stage === 'practice' && canSave ? '<button class="btn" type="button" data-c-complete aria-pressed="' + progress.has(lesson.id) +
      '">' + (progress.has(lesson.id) ? t('Отмечен изученным', 'Marked as studied') : t('Отметить изученным', 'Mark as studied')) +
    '</button>' : '') + action + '</footer></div>' + lessonReference(lesson, locale, t);
}

export async function mountCCourse(host, {lessonId, stage, locale = 'ru', readonly = false,
  isCurrent = () => true, openAssistant = null} = {}) {
  if (!host) return null;
  locale = locale === 'en' ? 'en' : 'ru';
  stage = stages.some(([id]) => id === stage) ? stage : 'explanation';
  const t = (ru, en) => locale === 'en' ? en : ru;
  const lessonData = loadCourse().then(async data => {
    const topic = data.topics.find(item => item.id === lessonId);
    const lesson = topic ? await loadJson('lessons/' + topic.id + '.' + locale + '.json') : null;
    return {data, lesson};
  });
  const [{data, lesson}] = await Promise.all([lessonData, ensureCCourseStyle()]);
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
  host.toggleAttribute('data-c-lesson', Boolean(lesson));
  host.innerHTML = '<p class="c-route-status" role="status" data-c-status></p>' +
    (lesson ? lessonMarkup({lesson, data, locale, t, stage, progress, responses, canSave:Boolean(storage), readonly,
      assistantEnabled:Boolean(openAssistant)}) :
      (lessonId ? '<p role="status">' + t('Эта тема пока недоступна.', 'This lesson is not available yet.') + '</p>' : '') +
      overview({data, locale, t, resume, progress, selectedModule:new URLSearchParams(hash.slice(1)).get('module')}));

  const status = host.querySelector('[data-c-status]');
  const disposeReference = lesson ? bindLessonReference(host, t) : null;
  const context = host.querySelector('.c-lesson-header');
  const topbar = document.querySelector('.topbar');
  const measureContext = () => {
    host.style.setProperty('--c-shell-top', (topbar?.getBoundingClientRect().height ?? 0) + 'px');
    host.style.setProperty('--c-context-height', context.getBoundingClientRect().height + 'px');
  };
  let contextObserver;
  if (context) {
    measureContext();
    if (typeof ResizeObserver !== 'undefined') {
      contextObserver = new ResizeObserver(measureContext);
      contextObserver.observe(context);
      if (topbar) contextObserver.observe(topbar);
    }
    const menu = context.querySelector('.c-lesson-menu');
    const libraryStatus = host.querySelector('[data-academy-library-status]');
    bindAcademyLessonMenu(host, {
      locale, courseId:'c', topicId:lesson.id, title:lesson.title, offline:readonly, signal:events.signal, isCurrent,
      closeMenu:() => { menu.open = false; }, focusTarget:() => menu.querySelector('summary'),
      openAssistant, showError:message => { libraryStatus.textContent = message; },
    });
  }
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

  const contents = host.querySelector('.c-contents');
  let readingFrame = 0;
  if (contents) {
    if (matchMedia('(max-width: 760px)').matches) contents.open = false;
    const sections = [...host.querySelectorAll('[data-c-section]')];
    const jumps = [...contents.querySelectorAll('[data-c-jump]')];
    function markSection(id) {
      for (const jump of jumps) {
        if (jump.dataset.cJump === id) jump.setAttribute('aria-current', 'location');
        else jump.removeAttribute('aria-current');
      }
    }
    function trackReading() {
      if (readingFrame) return;
      readingFrame = requestAnimationFrame(() => {
        readingFrame = 0;
        const top = context.getBoundingClientRect().bottom + 24;
        const current = sections.findLast(section => section.getBoundingClientRect().top <= top) ?? sections[0];
        if (current) markSection(current.dataset.cSection);
      });
    }
    for (const [index, jump] of jumps.entries()) jump.addEventListener('click', () => {
      const section = sections[index];
      if (!section) return;
      markSection(section.dataset.cSection);
      section.focus({preventScroll:true});
      section.scrollIntoView({block:'start'});
    }, options);
    window.addEventListener('scroll', trackReading, {passive:true, ...options});
    trackReading();
  }
  host.addEventListener('click', async event => {
    const copy = event.target.closest('[data-c-copy-source]');
    if (!copy) return;
    const code = copy.closest('.c-practice-file')?.querySelector('pre');
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent);
      if (!events.signal.aborted) copy.textContent = t('Скопировано', 'Copied');
    } catch {
      if (events.signal.aborted) return;
      const selection = getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      copy.textContent = t('Скопируйте выделенный код', 'Copy the selected code');
    }
  }, options);
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

  const heading = host.querySelector('[data-c-heading], [data-academy-course-navigation="topics"] [data-academy-nav-heading]');
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
      cancelAnimationFrame(readingFrame);
      contextObserver?.disconnect();
      disposeReference?.();
      unregisterUpdate();
      workspace?.dispose();
    },
  };
}
