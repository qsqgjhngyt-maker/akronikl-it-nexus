import {createNexusContextAdapter, selectionFromCodeStudio, diagnosticFromNexus} from '../core/index.js';
import {runtimeEvidenceBoundary, readRuntimeEvidence} from '../../sandbox/runtime-evidence.js';

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
  const studio = editor?.__nexusCodeStudio;
  const workspace = studio?.workspace;
  const revision = workspace?.revision, activeFile = workspace?.activeFile;
  const runBoundary = runtimeEvidenceBoundary(studio);
  function current() {
    return alive && readReady() === true && root.isConnected && readIdentity() === identity &&
      (publicMode || identity != null) && JSON.stringify(readRoute()) === routeKey &&
      readLocale() === uiLocale && readCourseLocale() === materialLocale &&
      readEditor() === editor && editor?.__nexusCodeStudio === studio &&
      studio?.workspace === workspace && workspace?.revision === revision &&
      workspace?.activeFile === activeFile && runtimeEvidenceBoundary(studio) === runBoundary && (!editor || editor.isConnected);
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
  function readDiagnostics() {
    if (!current() || identity == null || !workspace) return [];
    const evidence = readRuntimeEvidence(studio);
    if (evidence?.status !== 'compiler-error' || evidence.revision !== revision) return [];
    try {
      const selection = readSelection();
      return selection ? [diagnosticFromNexus(evidence.diagnostic, {selection, runRevision:evidence.revision})] : [];
    } catch { return []; } // Несовпадение файла/ревизии не становится диагнозом.
  }
  function editorContext() {
    if (!current() || identity == null || !workspace) return null;
    return Object.freeze({filePath:activeFile, languageId:workspace.languageId, revision});
  }
  const adapter = createNexusContextAdapter({
    readBoundary:() => current() ? boundary : null,
    readRoute, readLocale, readCourseLocale, readSelection, readDiagnostics,
    authorize:({capability, input}) => current() &&
      ['assistant.capabilities', 'context.current', 'knowledge.search', 'navigation.propose'].includes(capability) &&
      (!(input.include || []).length || identity != null && input.include.includes('selection') &&
        input.include.every(value => value === 'selection' || value === 'diagnostics'))
  });
  function platformState() {
    if (!current()) throw Error('AKRONIKL_CONTEXT_CHANGED');
    return {mode:publicMode ? (identity == null ? 'offline-public' : 'offline-private') : 'online',
      connected:globalThis.navigator?.onLine !== false, route:readRoute()};
  }
  return Object.freeze({adapter, current, workspace, platformState, editorContext,
    selectionAvailable:identity != null && !!workspace,
    dispose(){alive = false;}
  });
}
