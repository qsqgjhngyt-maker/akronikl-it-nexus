const supportedCourses = new Set(['c', 'cpp', 'onec', '1c-enterprise']);

export function lessonHelpRoute(route, locale) {
  const course = route?.courseId ?? route?.course;
  const lesson = route?.lessonId ?? route?.lesson;
  if (!supportedCourses.has(course) || !['ru','en'].includes(locale) ||
    typeof lesson !== 'string' || !lesson.startsWith(course + '.') || !/^[a-z0-9.-]{3,100}$/.test(lesson)) return null;
  const section = route.sectionId ?? route.section ?? '';
  const stage = route.stage ?? (/^(practice|lab|diagnostics)$/.test(section) ? 'practice' :
    /^(selfcheck|review)$/.test(section) ? 'selfcheck' : 'explanation');
  return {course, lesson, locale, stage:['explanation','selfcheck','practice'].includes(stage) ? stage : 'explanation'};
}

async function loadLesson({course, lesson, locale}) {
  const file = lesson + '.' + locale + '.json';
  if (course !== 'c') {
    const {clarityResource} = await import('../../core/cpp-clarity-r3-renderer.mjs');
    return clarityResource('lessons/' + file);
  }
  const response = await fetch(new URL('../../courses/c/lessons/' + file, import.meta.url), {credentials:'omit'});
  if (!response.ok) throw Error('LESSON_HELP_UNAVAILABLE');
  return response.json();
}

function shortText(value) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (text.length <= 520) return text;
  return text.slice(0,520).replace(/\s+\S*$/u,'') + '…';
}

export function authoredHelp(lesson, context, uiLocale) {
  if (lesson?.id !== context.lesson || lesson?.courseId !== context.course || lesson?.locale !== context.locale) return null;
  const t = (ru, en) => uiLocale === 'en' ? en : ru;
  const teaching = lesson.teaching ?? {};
  const practice = lesson.practice ?? {};
  const sections = lesson.sections ?? [];
  const questions = lesson.selfcheck ?? [];
  const prediction = questions.find(item => /(?:^|-)predict$/.test(item.id)) ?? questions[0];
  const anchor = context.stage === 'practice' ? practice.returnAnchor :
    context.stage === 'selfcheck' ? prediction?.recall : 'orientation';
  const rule = sections.find(s => s.id === anchor) ??
    sections.find(s => s.id === 'idea') ?? sections[0];
  const authoredQuestion = shortText(context.stage === 'selfcheck' ? prediction?.prompt : teaching.predict?.prompt ?? prediction?.prompt);
  const question = context.stage === 'practice'
    ? t('Какой один признак покажет, что первый шаг задания выполнен? Запишите ожидание и сравните его с наблюдением.',
        'What one observation would confirm that the first step worked? Write your expectation and compare it with the result.')
    : authoredQuestion ||
      t('Какой результат вы ожидаете увидеть в первом примере? Объясните свой прогноз одним предложением.',
        'What result do you expect in the first example? Explain your prediction in one sentence.');
  const transfer = shortText(teaching.apply?.prompt);
  const diagnosis = shortText(teaching.practice?.diagnosis ?? practice.passport?.errors);
  const steps = [
    [t('Первый шаг', 'First step'), question, context.stage !== 'practice' && authoredQuestion ? context.locale : uiLocale],
    [t('Вспомнить правило', 'Recall the rule'), teaching.syntax?.explanation ?? rule?.paragraphs?.[0] ?? lesson.goal, context.locale],
    [t('Выбрать действие', 'Choose an action'), teaching.practice?.strategy ?? practice.hint, context.locale],
    [t('Проверить ещё один случай', 'Try another case'), transfer ||
      t('Измените одно входное значение или одно действие из примера. Запишите, что должно измениться, и проверьте это.',
        'Change one input value or one action in the example. Write down what should change, then check it.'), transfer ? context.locale : uiLocale],
    [t('Найти причину расхождения', 'Find the first difference'), diagnosis ||
      t('Сравните ожидание и наблюдение. На каком первом шаге они разошлись? Проверьте входные данные и правило этого шага.',
        'Compare your expectation with what you observed. Find the first step where they differ, then check its input and rule.'), diagnosis ? context.locale : uiLocale],
  ];
  const seen = new Set();
  const help = steps.flatMap(([label, value, lang]) => {
    const text = shortText(value);
    if (!text || seen.has(text)) return [];
    seen.add(text);
    return [{label, text, lang}];
  });
  return {title:shortText(lesson.title), help};
}

export function createLessonHelp({log, isCurrent, load = loadLesson}) {
  const doc = log.ownerDocument;
  let card, generation = 0;
  const reset = () => { generation++; card?.remove(); card = null; };
  async function open(context, uiLocale, trigger) {
    reset();
    if (!context || !isCurrent()) return;
    const ticket = generation;
    const t = (ru, en) => uiLocale === 'en' ? en : ru;
    const section = doc.createElement('section');
    section.className = 'ak-lesson-help-card';
    section.dataset.akLessonHelp = '';
    const heading = doc.createElement('h3');
    heading.tabIndex = -1;
    heading.textContent = t('Подсказки к уроку', 'Lesson hints');
    const stepTitle = doc.createElement('strong');
    stepTitle.dataset.akLessonHelpStep = '';
    stepTitle.hidden = true;
    const status = doc.createElement('p');
    status.setAttribute('role','status');
    status.textContent = t('Открываю материалы урока…', 'Opening lesson material…');
    const actions = doc.createElement('div');
    actions.className = 'ak-lesson-help-actions';
    const next = doc.createElement('button');
    next.type = 'button';
    next.className = 'ak-btn';
    next.hidden = true;
    const close = doc.createElement('button');
    close.type = 'button';
    close.className = 'ak-btn';
    close.textContent = t('Свернуть подсказки', 'Close hints');
    close.addEventListener('click', () => { reset(); if (trigger?.isConnected) trigger.focus(); });
    actions.append(next, close);
    section.append(heading, stepTitle, status, actions);
    log.append(section);
    card = section;
    heading.focus({preventScroll:true});
    log.scrollTop = log.scrollHeight;
    try {
      const guide = authoredHelp(await load(context), context, uiLocale);
      if (ticket !== generation || !isCurrent() || !section.isConnected) return;
      if (!guide?.help.length) throw Error('LESSON_HELP_UNAVAILABLE');
      let step = 0;
      const display = () => {
        heading.textContent = guide.title;
        heading.lang = context.locale;
        stepTitle.hidden = false;
        stepTitle.textContent = guide.help[step].label;
        status.textContent = guide.help[step].text;
        status.lang = guide.help[step].lang;
        const following = guide.help[step+1];
        next.hidden = !following;
        next.textContent = following?.label ?? '';
        log.scrollTop = log.scrollHeight;
      };
      next.addEventListener('click', () => {
        if (!isCurrent() || ticket !== generation || step+1 >= guide.help.length) return;
        step++;
        display();
        if (next.hidden) close.focus();
      });
      display();
    } catch {
      if (ticket === generation && isCurrent()) status.textContent =
        t('Материалы урока сейчас недоступны. Попробуйте открыть урок снова.', 'Lesson material is unavailable. Try opening the lesson again.');
    }
  }
  return {open, reset};
}
