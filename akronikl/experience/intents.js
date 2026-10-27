// Ограниченная маршрутизация формулировок. Не исполняет текст или команды модели.
import {DESTINATIONS, HELP_TOPICS} from '../platform/catalog.js';
export function resolveMessage(value) {
  if(typeof value!=='string'||!value.trim()||value.length>1500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value))return {kind:'invalid'};
  const text=value.normalize('NFKC').trim().replace(/^(?:акроникл|akronikl)[,!:—\s]+/iu,'');
  const n=text.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[?!.,]+$/u,'').replace(/\s+/gu,' ');
  if(/^(?:где я остановился|где я остановилась|where did i leave off)$/u.test(n))return {kind:'resume'};
  if(/^(?:что (?:мы )?(?:сейчас )?изучаем|какая (?:сейчас )?тема|какой (?:сейчас )?урок|what are we (?:studying|learning)(?: now)?|current lesson)$/u.test(n))return {kind:'study'};
  if(/^(?:что мне (?:нужно )?сделать в этом задании|что требуется в этом задании|what (?:should|do) i (?:need to )?do (?:in|for) this (?:task|assignment))$/u.test(n))return {kind:'task'};
  if(/^(?:покажи контекст|показать контекст|мой контекст|show context)$/u.test(n))return {kind:'context'};
  if(/^(?:помоги найти лабораторную(?: работу)?|найди лабораторную(?: работу)?|help me find a lab)$/u.test(n))return {kind:'platform',request:{kind:'navigate',destinationId:'labs'}};
  if(/^(?:где мои проекты|where are my projects)$/u.test(n))return {kind:'platform',request:{kind:'navigate',destinationId:'projects'}};
  if(/^(?:где я(?: сейчас)?|текущий раздел|where am i|current screen|что доступно|разделы nexus|куда можно перейти|list sections|available sections)$/u.test(n)||
    /^(?:открой|открыть|перейди в|перейди к|open|go to|сохрани|сохранить|удали|удалить|запусти|выйди|опубликуй|save|delete|run|logout|publish)(?:\s|$)/u.test(n)||
    HELP_TOPICS.some(t=>t.aliases.includes(n)))return {kind:'platform',request:{kind:'text',text:n}};
  if(/^(?:объясни (?:эту тему |текущую тему |этот урок )?(?:попроще|проще|простыми словами)|не понял(?:а)?|explain (?:this (?:topic|lesson) )?(?:more simply|simply)|simpler)$/u.test(n))
    return {kind:'tutor',intent:'simpler',followUp:true,text};
  if(/^(?:покажи|дай|приведи) (?:небольшой |другой |простой )?пример$|^(?:show|give)(?: me)? (?:an? |another )?example$/u.test(n))return {kind:'tutor',intent:'example',followUp:true,text};
  if(/(?:задач[ауи]|упражнени[ея])(?:\s|$)|\b(?:practice task|exercise)\b/u.test(n))return {kind:'tutor',intent:'practice',followUp:true,text};
  if(/(?:почему|что означает|объясни).*(?:ошибк|error)|(?:ошибк|error).*(?:код|программ|code)|^why.*code/u.test(n))return {kind:'diagnostic',text};
  if(/^(?:разбери|разобрать|объясни).*(?:код|фрагмент)|^(?:explain|review).*code/u.test(n))return {kind:'tutor',intent:'code',followUp:false,text};
  if(/^(?:дай|подскажи).*(?:подсказк)|^give.*hint/u.test(n))return {kind:'tutor',intent:'hint',followUp:true,text};
  if(/^(?:найди|найти|поиск|find|search)(?:\s|$)/u.test(n))return {kind:'search',text:text.replace(/^(?:найди|найти|поиск|find|search)\s*/iu,'')};
  return {kind:'tutor',intent:'explain',followUp:false,text};
}
export function visibleDestinations(){return DESTINATIONS.filter(d=>!['restricted','planned'].includes(d.access));}
