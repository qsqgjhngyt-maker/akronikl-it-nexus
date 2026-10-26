import {createAssistantCore} from '../core/index.js';
import {createUiHost} from './nexus-host.js';
import {loadUiKnowledge} from './knowledge-loader.js';

const labels = {
  ru:{close:'Закрыть',intro:'Поиск по подготовленным материалам Академии. Без внешней нейросети.',query:'Что найти в Академии?',search:'Найти',context:'Показать контекст',selection:'Включить выделенный фрагмент кода (только на этом устройстве)',cancel:'Отменить',ready:'Локальное ядро готово. Индекс загрузится при первом поиске.',busy:'Проверяем ресурсы и ищем…',found:'Найдены материалы Академии.',empty:'Совпадений нет. Попробуйте другие слова.',clarify:'Введите тему для поиска.',error:'Действие не выполнено. Проверьте выделение и подготовку ресурсов; затем повторите.',cancelled:'Запрос отменён.',open:'Открыть урок',source:'Источник',limited:'Это выдержки из курса, а не сгенерированный ответ. Полное объяснение — в уроке.',noSelection:'Фрагмент кода не включён.',contextNote:'Просмотр контекста. Автоматического объяснения кода пока нет.'},
  en:{close:'Close',intro:'Search prepared Academy materials. No external AI model.',query:'What would you like to find?',search:'Search',context:'Show context',selection:'Include selected code (on this device only)',cancel:'Cancel',ready:'Local core ready. The index loads on the first search.',busy:'Verifying resources and searching…',found:'Academy materials found.',empty:'No matches. Try different words.',clarify:'Enter a topic to search.',error:'Could not complete the action. Check the selection and prepared resources, then retry.',cancelled:'Request cancelled.',open:'Open lesson',source:'Source',limited:'These are course excerpts, not generated answers. Open the lesson for the full explanation.',noSelection:'No code fragment included.',contextNote:'Context preview. Automatic code explanations are not connected.'}
};
let styles;
function ensureStyles(documentRef) {
  if (styles?.isConnected) return;
  styles = documentRef.createElement('link'); styles.rel = 'stylesheet';
  styles.href = new URL('./panel.css', import.meta.url).href; documentRef.head.append(styles);
}
export function openAssistantPanel(options) {
  const {documentRef = globalThis.document, windowRef = globalThis.window, root, trigger, onNavigate = () => {}, onDispose = () => {},
    loadKnowledge = loadUiKnowledge} = options;
  const host = createUiHost(options), en = options.readLocale() === 'en', t = labels[en ? 'en' : 'ru'];
  if (!host.current()) throw Error('AKRONIKL_CONTEXT_CHANGED');
  ensureStyles(documentRef);
  let disposed = false, sequence = 0, request = null;
  let core = createAssistantCore({host:host.adapter, policy:{selection:true}});
  const dialog = documentRef.createElement('dialog'); dialog.className = 'akronikl-core-dialog';
  dialog.dataset.akroniklPanel = ''; dialog.setAttribute('aria-labelledby','akronikl-panel-title');
  const make = (tag, text, parent = dialog) => {const node = documentRef.createElement(tag); if (text) node.textContent = text; parent.append(node); return node;};
  const header = make('header'); const title = make('h2','Akronikl',header); title.id = 'akronikl-panel-title';
  const close = make('button',t.close,header); close.type = 'button'; close.className = 'btn';
  make('p', t.intro);
  const form = make('form'); const label = make('label', t.query, form);
  const query = make('input','',label); query.type = 'search'; query.name = 'query'; query.maxLength = 2000; query.autocomplete = 'off';
  const row = make('div','',form); row.className = 'akronikl-actions';
  const search = make('button',t.search,row); search.type = 'submit'; search.className = 'btn primary';
  const context = make('button',t.context,row); context.type = 'button'; context.className = 'btn';
  const cancel = make('button',t.cancel,row); cancel.type = 'button'; cancel.className = 'btn'; cancel.disabled = true;
  const choice = make('label'); choice.className = 'akronikl-selection';
  const selection = make('input','',choice); selection.type = 'checkbox'; selection.disabled = !host.selectionAvailable;
  make('span',t.selection,choice);
  const status = make('p',t.ready); status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
  const output = make('section'); output.dataset.akroniklResults = ''; output.setAttribute('aria-label',en ? 'Assistant result' : 'Результат помощника');
  make('p',t.limited).className = 'akronikl-note';
  function stop() {sequence++; request?.abort(); request = null; core.invalidate(); cancel.disabled = true; output.removeAttribute('aria-busy');}
  function dispose() {
    if (disposed) return; disposed = true; stop(); core.dispose(); host.dispose(); unsubscribe?.(); observer.disconnect();
    output.replaceChildren(); query.value = ''; selection.checked = false;
    dialog.remove(); onDispose(); if (trigger?.isConnected && windowRef.location.hash === initialHash) trigger.focus();
  }
  const initialHash = windowRef.location.hash;
  const observer = new MutationObserver(() => {if (!host.current()) dispose();});
  // Закрытие вложенной области редактора или повторный bind тоже меняют контекст.
  observer.observe(root, {childList:true, subtree:true});
  const unsubscribe = host.workspace?.subscribe?.(() => dispose());
  function current(ticket) {return !disposed && ticket === sequence && host.current();}
  async function act(kind, target = null) {
    if (!host.current()) {dispose(); return;}
    stop(); const ticket = sequence; request = new AbortController(); const signal = request.signal;
    output.replaceChildren(); status.textContent = t.busy; output.setAttribute('aria-busy','true'); cancel.disabled = false;
    try {
      if (kind === 'search' || kind === 'navigate') {
        if (kind === 'search' && !query.value.trim()) {status.textContent = t.clarify; return;}
        const index = await loadKnowledge(options.readCourseLocale(), {signal});
        if (!current(ticket) || signal.aborted) return;
        core.dispose(); core = createAssistantCore({host:host.adapter, knowledge:[index], policy:{selection:true}});
      }
      const invocation = kind === 'search' ? {capability:'knowledge.search',input:{query:query.value,locale:options.readCourseLocale(),limit:5}} :
        kind === 'navigate' ? {capability:'navigation.propose',input:{lessonId:target,locale:options.readCourseLocale()}} :
        {capability:'context.current',input:{include:selection.checked ? ['selection'] : []}};
      const response = await core.invoke(invocation,{signal});
      if (!current(ticket) || signal.aborted) return;
      if (kind === 'navigate') {
        const proposal = response.status === 'ok' && response.actions.find(a => a.kind === 'navigation.proposal');
        if (proposal) {dispose(); onNavigate(proposal.target);} else status.textContent = t.error;
        return;
      }
      status.textContent = response.status === 'ok' ? (kind === 'search' ? t.found : t.contextNote) :
        response.status === 'empty' ? t.empty : response.status === 'clarify' ? t.clarify : response.status === 'cancelled' ? t.cancelled : t.error;
      if (response.status !== 'ok') return;
      if (kind === 'search') {
        for (const match of response.data.matches) {
          const card = make('article','',output); make('h3',match.title,card); make('p',match.text,card);
          const details = make('details','',card); make('summary',t.source,details);
          make('p',match.sourceId + '\n' + match.sourcePath + '\n' + match.contentVersion,details);
          const open = make('button',t.open,card); open.type = 'button'; open.className = 'btn';
          open.addEventListener('click',() => {void act('navigate',match.lessonId);});
        }
      } else {
        const data = response.data;
        make('p',[data.route.view,data.route.courseId,data.route.lessonId,data.route.projectId].filter(Boolean).join(' · '),output);
        if (data.selection) {
          make('p',data.selection.filePath + ' · ' + data.selection.startLine + '–' + data.selection.endLine,output);
          make('pre',data.selection.code,output);
        } else make('p',t.noSelection,output);
      }
    } catch {if (current(ticket) && !signal.aborted) status.textContent = t.error;}
    finally {if (current(ticket)) {cancel.disabled = true; output.removeAttribute('aria-busy');}}
  }
  form.addEventListener('submit', event => {event.preventDefault(); void act('search');});
  context.addEventListener('click', () => {void act('context');});
  cancel.addEventListener('click', () => {stop(); output.replaceChildren(); status.textContent = t.cancelled;});
  selection.addEventListener('change', () => {stop(); output.replaceChildren(); status.textContent = t.ready;});
  query.addEventListener('input', () => {stop(); output.replaceChildren(); status.textContent = t.ready;});
  close.addEventListener('click',dispose); dialog.addEventListener('cancel',event => {event.preventDefault(); dispose();});
  dialog.addEventListener('close',dispose);
  root.append(dialog); dialog.showModal(); query.focus();
  return Object.freeze({dispose,focus:() => query.focus()});
}
