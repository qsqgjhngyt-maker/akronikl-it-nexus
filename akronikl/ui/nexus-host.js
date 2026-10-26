import {createNexusContextAdapter, selectionFromCodeStudio} from '../core/index.js';

// Только функции приложения являются источником identity/редактора. Ни URL,
// ни текст запроса не дают полномочий. Нет чтения storage или Cloud.
export function createUiHost({root, readIdentity, readRoute, readLocale,
  readCourseLocale, readEditor = () => null, readReady = () => true, publicMode = false} = {}) {
  for (const fn of [readIdentity, readRoute, readLocale, readCourseLocale, readEditor, readReady]) {
    if (typeof fn !== 'function') throw Error('AKRONIKL_HOST_INVALID');
  }
  const identity = readIdentity();
  let alive = true;
  const boundary = Object.freeze({});
  const routeKey = JSON.stringify(readRoute());
  const uiLocale = readLocale(), materialLocale = readCourseLocale();
  const editor = readEditor();
  const workspace = editor?.__nexusCodeStudio?.workspace;
  const revision = workspace?.revision, activeFile = workspace?.activeFile;
  function current() {
    return alive && readReady() === true && root.isConnected && readIdentity() === identity &&
      (publicMode || identity != null) && JSON.stringify(readRoute()) === routeKey &&
      readLocale() === uiLocale && readCourseLocale() === materialLocale &&
      readEditor() === editor && workspace?.revision === revision &&
      workspace?.activeFile === activeFile && (!editor || editor.isConnected);
  }
  function readSelection() {
    if (!current() || identity == null || !editor || !workspace) return null;
    // Читаем только один файл и только по явному include:['selection'].
    const file = workspace.getFile(activeFile);
    if (!file || file.content !== editor.value) throw Error('AKRONIKL_SELECTION_STALE');
    return selectionFromCodeStudio({revision, languageId:workspace.languageId, files:[file]}, {
      filePath:activeFile, startOffset:editor.selectionStart, endOffset:editor.selectionEnd
    });
  }
  const adapter = createNexusContextAdapter({
    readBoundary:() => current() ? boundary : null,
    readRoute, readLocale, readCourseLocale, readSelection,
    authorize:({capability, input}) => current() &&
      ['assistant.capabilities', 'context.current', 'knowledge.search', 'navigation.propose'].includes(capability) &&
      (!(input.include || []).length || identity != null && input.include.length === 1 && input.include[0] === 'selection')
  });
  return Object.freeze({adapter, current, workspace,
    selectionAvailable:identity != null && !!workspace,
    dispose(){alive = false;}
  });
}
