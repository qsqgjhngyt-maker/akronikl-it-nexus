// Дополнительные маршруты на прежних ID. Не содержат прогресс или состояние аккаунта.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const REFERENCE_ROUTES=Object.freeze([
 {course:'cpp',ru:'C++ · Старт с нуля',en:'C++ · Start from zero',topics:[
  ['cpp.programming-process','Как устроено программирование','What programming does','Наблюдать результат и отличить этапы работы.','Observe a result and distinguish the stages.'],
  ['cpp.first-cpp-program','Первая программа','Your first program','Изменить сообщение и исправить ошибку.','Change a message and fix an error.'],
  ['cpp.data-types','Типы данных','Data types','Объяснить потерю половины минуты и выбрать тип.','Explain the lost half-minute and choose a type.'],
  ['cpp.variables-scope','Переменные и область действия','Variables and scope','Создать, переименовать и изменить значение.','Create, rename and update a value.']]},
 {course:'onec',ru:'Программирование 1С · Старт с нуля',en:'1C programming · Start from zero',topics:[
  ['onec.p1.architecture','Где работает 1С','Where 1C runs','Подготовить отдельную пустую базу и различить режимы.','Prepare a separate empty infobase and identify the modes.'],
  ['onec.p1.lifecycle','Первое настоящее сообщение','Your first actual message','Запустить сообщение в учебной 1С.','Run a message in training 1C.'],
  ['onec.p2.topic-1','Первый расчёт','Your first calculation','Отличить число, текст и вывод значения.','Distinguish a number, text and displaying a value.']]},
 {course:'1c-enterprise',ru:'1С:Предприятие · Старт с нуля',en:'1C:Enterprise · Start from zero',topics:[
  ['1c-enterprise.a2.topic-1','Подготовить учебную службу','Prepare the training service','Загрузить учебное приложение в новую базу.','Load the training application into a new infobase.'],
  ['1c-enterprise.a2.topic-2','Создать и найти клиента','Create and find a customer','Сохранить карточку и открыть её снова.','Save a card and reopen it.'],
  ['1c-enterprise.a2.topic-3','Записать заявку','Record a service request','Выбрать клиента и услугу, записать и проверить.','Select a customer and service, save and verify.']]}
]);
export const REFERENCE_IDS=Object.freeze(REFERENCE_ROUTES.flatMap(r=>r.topics.map(t=>t[0])));
export const referenceRouteFor=id=>REFERENCE_ROUTES.find(r=>r.topics.some(t=>t[0]===id));
export const referenceBadge=(id,locale='ru')=>REFERENCE_IDS.includes(id)?`<span class="reference-badge" data-reference-badge>◇ ${locale==='en'?'Reference · under review':'Эталон · на проверке'}</span>`:'';
export const referenceHref=(id,locale='ru',stage='explanation')=>'#'+new URLSearchParams({course:referenceRouteFor(id)?.course||id.split('.')[0],lesson:id,stage,locale});
export function referenceOverviewMarkup(locale='ru'){
 const en=locale==='en';return `<section class="reference-overview" data-reference-overview><h2>${en?'Reference lessons — review':'Эталонные уроки — проверка'}</h2><p>${en?'Ten lessons on their existing IDs. Technical results and learner understanding are reviewed separately. Choose one starting route.':'Десять уроков на прежних ID. Технические результаты и понимание учащегося проверяются отдельно. Выберите начальный маршрут.'}</p>${REFERENCE_ROUTES.map(r=>`<section><h3>${esc(r[locale])}</h3><ol>${r.topics.map(t=>`<li>${referenceBadge(t[0],locale)} <a href="${referenceHref(t[0],locale)}">${esc(t[en?2:1])}</a><p>${esc(t[en?4:3])}</p><small>${esc(t[0])}</small></li>`).join('')}</ol></section>`).join('')}<p>${en?'Review questions: Is the goal clear? Which words need help? Can you explain, change, fix and apply the example? Can you find the next lesson and return to your work? Record any help you needed. Do not include personal data. Review feedback is separate from learner progress.':'Вопросы review: понятна ли цель? Какие слова непонятны? Можете объяснить, изменить, исправить и применить пример? Удалось найти следующий урок и вернуться к работе? Запишите потребовавшуюся помощь. Не включайте личные данные. Отзыв отделён от учебного прогресса.'}</p><label>${en?'My review notes (not a completion mark)':'Мои замечания (не отметка прохождения)'}<textarea data-reference-review-note rows="6"></textarea></label><button type="button" class="btn" data-reference-review-download>${en?'Download review notes':'Скачать замечания'}</button></section>`;
}
