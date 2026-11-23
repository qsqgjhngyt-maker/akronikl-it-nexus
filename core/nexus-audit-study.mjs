const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const pair=(cpp,bsl,ru,en)=>[{id:cpp,peer:bsl,ru,en},{id:bsl,peer:cpp,ru,en}];
const bridges=new Map([
  ...pair('cpp.variables-scope','onec.p2.topic-1','Присваивание связывает имя с новым значением. В C++ учитывайте тип переменной и блок объявления, в BSL проверьте тип текущего значения.','Assignment binds a name to a new value. In C++, check its declared type and scope. In BSL, check the type of the current value.'),
  ...pair('cpp.data-types','onec.p2.topic-2','Целочисленное деление в C++ отбрасывает дробную часть. В BSL отдельно проверьте число и строку с теми же цифрами, прежде чем использовать значение в расчёте.','C++ integer division discards the fractional part. In BSL, distinguish a number from a string containing the same digits before using it in a calculation.'),
  ...pair('cpp.if-else-switch','onec.p2.topic-3','Составьте одну таблицу граничных случаев и проверьте её для if в C++ и Если в BSL.','Use one table of boundary cases to check if in C++ and If in BSL.'),
  ...pair('cpp.for-loop','onec.p2.topic-4','Проверьте число повторов при пустом и граничном диапазоне. В BSL цикл Для включает обе заданные границы. В C++ условие задаётся явно.','Check iteration counts at empty and boundary ranges. BSL For includes both bounds. C++ uses the condition you write.'),
  ...pair('cpp.functions-contracts','onec.p3.topic-2','Назовите входы и возвращаемое значение. Отдельно проверьте, меняет ли вызов исходные данные.','Name the inputs and return value. Check separately whether the call changes its inputs.')
].map(item=>[item.id,item]));

const review={
  'cpp.data-types':{
    source:'cpp.first-cpp-program',
    ru:[['За что отвечает main?','Это функция, с которой запускается программа.'],['Где появляется результат std::cout?','В стандартном выводе.']],
    en:[['What is main for?','It is the function where the program starts.'],['Where does std::cout write its result?','To standard output.']]
  },
  'cpp.variables-scope':{
    source:'cpp.data-types',
    ru:[['Чему равно 41 / 2 при двух целых операндах?','20. Дробная часть отбрасывается.'],['Что изменится в 41 / 2.0?','Результат будет 20.5, потому что вычисление идёт с дробным типом.']],
    en:[['What is 41 / 2 with two integer operands?','20. The fraction is discarded.'],['What changes in 41 / 2.0?','The result is 20.5 because floating-point division is used.']]
  },
  'onec.p2.topic-2':{
    source:'onec.p2.topic-1',
    ru:[['Что делает присваивание в расчёте?','Записывает текущее значение выражения в переменную.'],['Что можно вывести, чтобы проверить результат?','Само вычисленное значение, отдельно от подписи.']],
    en:[['What does assignment do in a calculation?','It stores the expression’s current result in the variable.'],['What can you display to check the result?','The calculated value, separately from its label.']]
  }
};
export const auditStudyPilot=id=>Object.hasOwn(review,id);
const href=(id,locale)=>'#'+new URLSearchParams({
  course:id.slice(0,id.indexOf('.')),
  lesson:id,
  stage:'explanation',
  locale:locale==='en'?'en':'ru'
});

export function studyReviewMarkup(id,locale){
  const en=locale==='en',item=review[id];
  if(!item)return '';
  return `<details class="practice-card audit-recall" data-reference-static><summary>${en?'Recall the previous lesson':'Вспомнить прошлую тему'}</summary>
    <p>${en?'Answer first, then compare.':'Сначала ответьте своими словами, затем сравните.'}</p>
    <ol>${item[en?'en':'ru'].map(([q,a])=>`<li><p>${e(q)}</p><details><summary>${en?'Compare':'Сравнить ответ'}</summary><p>${e(a)}</p></details></li>`).join('')}</ol>
    <a href="${e(href(item.source,locale))}">${en?'Open the previous lesson':'Открыть прошлую тему'} →</a></details>`;
}

const diagnostics={
  'cpp.data-types':{
    ru:['Пропала дробная часть','Передайте в расчёт 18 и 23. Какой результат даст (18 + 23) / 2 и что изменит 2.0?','Два целых операнда дают 20. При делении на 2.0 получается 20.5.'],
    en:['Missing fractional part','Use 18 and 23. What does (18 + 23) / 2 give, and what does 2.0 change?','Two integer operands give 20. Division by 2.0 gives 20.5.']
  },
  'onec.p2.topic-2':{
    ru:['Строка выглядит как число','Сравните типы значения 30 и строки «30». Одинаковый вид означает одинаковый тип?','ТипЗнч позволяет различить число и строку. Совпадающие цифры не делают строку числом.'],
    en:['A string looks like a number','Compare the types of 30 and the string "30". Does identical appearance imply the same type?','TypeOf distinguishes a number from a string. Matching digits do not give them the same type.']
  }
};
export function diagnosticMarkup(id,locale){
  const item=diagnostics[id],en=locale==='en';
  if(!item)return '';
  const [title,task,answer]=item[en?'en':'ru'];
  return `<details class="practice-card audit-diagnostic" data-reference-static><summary>${e(title)}</summary><p>${e(task)}</p>
    <details><summary>${en?'Compare your diagnosis':'Сверить диагноз'}</summary><p>${e(answer)}</p></details></details>`;
}

export function studyBridgeMarkup(id,locale){
  const en=locale==='en',item=bridges.get(id);
  if(!item)return '';
  return `<aside class="practice-card audit-language-bridge"><h2>${en?'Compare C++ and BSL':'Сравните C++ и BSL'}</h2>
    <p>${e(item[en?'en':'ru'])}</p><a href="${e(href(item.peer,locale))}">${item.peer.startsWith('cpp.')?'C++':'BSL'} · ${en?'Related lesson':'Связанная тема'} →</a></aside>`;
}

export function selfAssessmentMarkup(locale){
  const en=locale==='en';
  return `<details class="practice-card" data-audit-self-assessment><summary>${en?'Rate your explanation':'Оцените своё объяснение'}</summary>
  <label>${en?'How well can you explain your answer?':'Насколько уверенно вы можете объяснить свой ответ?'}
  <select data-audit-rating><option value="">${en?'Choose a level':'Выберите уровень'}</option>
    <option value="0">${en?'0 · I cannot explain it yet':'0 · Пока не могу объяснить'}</option>
    <option value="1">${en?'1 · I can explain it with help':'1 · Объясняю с подсказкой'}</option>
    <option value="2">${en?'2 · I can explain it and apply it to a new example':'2 · Объясняю и применяю на новом примере'}</option>
  </select></label>
  <p>${en?'Your choice stays on this page. Compare it with the reference.':'Оценка действует на этой странице. Сравните её с эталоном.'}</p></details>`;
}

export function addStudyFeedback(panel,locale){
  const en=locale==='en';
  for(const section of panel.querySelectorAll('.lesson-section[id]')){
    const button=document.createElement('button');
    button.type='button';
    button.className='btn quiet audit-step-feedback';
    button.dataset.auditStep=section.id;
    button.textContent=en?'What is unclear here?':'Что здесь непонятно?';
    section.append(button);
  }
}

export function addSectionGroups(panel,locale,link){
  const sections=[...panel.querySelectorAll('.lesson-section[id]')];
  if(sections.length<9)return;
  const en=locale==='en',nav=document.createElement('nav');
  nav.className='practice-card audit-section-groups';
  nav.setAttribute('aria-label',en?'Parts of this lesson':'Части урока');
  const list=document.createElement('ol');
  const span=Math.ceil(sections.length/4);
  for(let i=0;i<sections.length;i+=span){
    const item=document.createElement('li'),href=document.createElement('a'),section=sections[i];
    href.href=link(section.id);
    href.textContent=section.querySelector('h2')?.textContent??(en?'Open part':'Открыть часть');
    item.append(href);
    list.append(item);
  }
  nav.append(list);
  const intro=panel.querySelector('.intro,.authored-intro');
  if(intro)intro.after(nav);
  else panel.prepend(nav);
}

export function studyFeedbackBody(id,step,locale){
  const en=locale==='en',course=id.slice(0,id.indexOf('.'));
  return `<p>${en?'Copy this reference to the step into your feedback.':'Скопируйте ссылку на этот шаг в сообщение команде.'}</p>
  <dl><dt>${en?'Course':'Курс'}</dt><dd>${e(course)}</dd><dt>${en?'Topic':'Тема'}</dt><dd>${e(id)}</dd><dt>${en?'Step':'Шаг'}</dt><dd>${e(step)}</dd></dl>
  <label>${en?'Difficulty':'Трудность'} <select data-audit-difficulty>
    <option value="instruction">${en?'Unclear instruction':'Неясное объяснение'}</option>
    <option value="example">${en?'Unclear example':'Неясный пример'}</option>
    <option value="practice">${en?'Unclear task':'Неясное задание'}</option>
  </select></label>
  <label>${en?'Preview':'Предпросмотр'} <textarea readonly data-audit-feedback-text></textarea></label>
  <a class="btn" href="#view=feedback">${en?'Open feedback form':'Открыть форму обратной связи'} →</a>`;
}
