const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));

export function academyPracticeHelpMarkup({locale, title, rule, explanationUrl, start, hint, diagnosis}) {
  const t = (ru, en) => locale === 'en' ? en : ru;
  const steps = [
    [t('С чего начать', 'How to get started'), start],
    [t('Подсказка к задаче', 'Hint for this task'), hint],
    [t('Если результат отличается', 'If the result differs'), diagnosis],
  ].filter(([, text]) => text?.trim());
  const hints = steps.reduceRight((next, [label, text]) =>
    '<details data-academy-hint><summary>' + label + '</summary><p>' +
    escape(text) + '</p>' + next + '</details>', '');
  return '<section class="academy-practice-help" data-academy-practice-help aria-label="' +
    t('Помощь в практике', 'Practice help') + '">' + academyRecallMarkup({locale, title, rule, explanationUrl}) +
    hints + '</section>';
}

export function academyRecallMarkup({locale, title, rule, explanationUrl}) {
  const t = (ru, en) => locale === 'en' ? en : ru;
  return (
    '<details data-academy-recall><summary>' + t('Вспомнить теорию', 'Recall the rule') +
    '</summary><p><strong>' + escape(title) + '</strong></p><p>' + escape(rule).replace(/`([^`]+)`/g, '<code>$1</code>') +
    '</p><a class="btn" href="' + escape(explanationUrl) + '">' +
    t('Открыть разбор в объяснении', 'Open the explanation') + '</a></details>'
  );
}
