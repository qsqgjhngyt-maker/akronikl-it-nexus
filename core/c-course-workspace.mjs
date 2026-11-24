import {accountStoragePrefix, verifiedAccount} from './account-storage.js';
import {bindCodeStudio, codeStudioMarkup} from '../sandbox/code-studio.js';
import {createCodeWorkspace, normalizeWorkspacePath} from '../sandbox/code-workspace.js';
import {parseRuntimeError} from '../sandbox/diagnostics.js';
import {MODERN_CPP_TOOLCHAIN} from '../sandbox/runtime-assets.js';
import {showRuntimeFileResults} from '../sandbox/runtime-files.js';
import {pickProvider} from '../sandbox/sandbox.js';

const entryFile = 'main.c';
const courseStoragePrefix = 'akronikl:it-nexus:c-course:v1:';

function normalizeFiles(value) {
  if (!Array.isArray(value)) return [];
  const files = new Map();
  for (const file of value) {
    if (typeof file?.path !== 'string' || !file.path.trim()) continue;
    const content = file.content ?? file.source;
    if (typeof content !== 'string') continue;
    const path = normalizeWorkspacePath(file.path);
    if (!files.has(path)) files.set(path, {path, content});
  }
  return [...files.values()];
}

function makeStarter(starter, practice) {
  const files = normalizeFiles(starter?.files ?? practice?.files);
  const entry = files.find(file => file.path === entryFile);
  if (typeof starter?.source === 'string') {
    if (entry) entry.content = starter.source;
    else files.unshift({path: entryFile, content: starter.source});
  } else if (!entry) {
    files.unshift({path: entryFile, content: ''});
  }
  return {files, activeFile: entryFile, stdin: String(starter?.stdin ?? practice?.stdin ?? '')};
}

function readDraft(raw) {
  if (raw === null) return null;
  const draft = JSON.parse(raw);
  const files = normalizeFiles(draft?.files);
  if (draft?.version !== 1 || typeof draft.stdin !== 'string' ||
     files.length !== draft.files?.length || !files.some(file => file.path === entryFile)) {
    throw Error('INVALID_C_COURSE_DRAFT');
  }
  const activeFile = files.some(file => file.path === draft.activeFile) ? draft.activeFile : entryFile;
  return {files, activeFile, stdin: draft.stdin};
}

function serializeDraft(draft) {
  return JSON.stringify({version: 1, ...draft});
}

export function createCCourseStorage() {
  const account = verifiedAccount();
  if (!account) return null;
  const prefix = accountStoragePrefix(account.accountId) + courseStoragePrefix;
  function local() {
    if (verifiedAccount() !== account) throw Error('C_COURSE_ACCOUNT_CHANGED');
    return globalThis.localStorage;
  }
  return {
    getItem(key) { return local().getItem(prefix + key); },
    setItem(key, value) { local().setItem(prefix + key, value); },
    removeItem(key) { local().removeItem(prefix + key); },
  };
}

export function bindCCourseWorkspace({
  host, locale = 'ru', lesson, lessonId = lesson?.id, starter = lesson?.practice?.starter,
  storageScope = '', storage = createCCourseStorage(), onSaved, onRun,
} = {}) {
  if (!host || typeof lessonId !== 'string' || !lessonId) throw Error('C_COURSE_WORKSPACE_REQUIRED');
  const en = locale === 'en';
  const t = (ru, english) => en ? english : ru;
  const scopeKey = encodeURIComponent(storageScope) + ':' + encodeURIComponent(lessonId);
  const key = 'draft:' + scopeKey;
  const checkpointKey = 'before-starter:' + scopeKey;
  const initial = makeStarter(starter, lesson?.practice);
  let originalRaw = null;
  let draft = null;
  let readable = Boolean(storage);
  try {
    originalRaw = storage?.getItem(key) ?? null;
    draft = readDraft(originalRaw);
  } catch {
    readable = false;
  }
  const opened = draft ?? initial;
  const account = verifiedAccount();
  const events = new AbortController();
  const {signal} = events;
  let disposed = false;
  let dirty = false;
  let saveTimer;
  let running = false;
  let revision = 0;
  let opening = false;
  let workWindow;

  host.innerHTML = `
    <section class="sandbox-block" aria-label="Code Studio · C17">
      ${codeStudioMarkup({files: opened.files, activeFile: opened.activeFile, entryFile, locale, languageId: 'c'})}
      <label class="stdin-label">
        ${t('Входные данные программы (stdin)', 'Program input (stdin)')}
        <textarea class="stdin" rows="3" spellcheck="false" autocapitalize="off" data-c-stdin></textarea>
      </label>
      <div class="runrow">
        <button type="button" class="btn primary" data-c-run>${t('Запустить мою работу', 'Run my code')}</button>
        <button type="button" class="btn" data-c-starter>${t('Восстановить исходную заготовку', 'Restore original starter')}</button>
        <button type="button" class="btn" data-c-recover hidden>${t('Вернуть предыдущую работу', 'Recover previous work')}</button>
        <button type="button" class="btn" data-c-download>${t('Скачать мою работу', 'Download my work')}</button>
      </div>
      <p class="sandbox-status" data-c-save role="status"></p>
      <p class="sandbox-status" data-c-result role="status"></p>
      <section data-c-output hidden>
        <h4>${t('Вывод программы (stdout)', 'Program output (stdout)')}</h4>
        <pre class="output" data-c-stdout></pre>
        <div data-c-stderr-wrap hidden>
          <h4>${t('Сообщения программы (stderr)', 'Program messages (stderr)')}</h4>
          <pre class="output" data-c-stderr></pre>
        </div>
        <div data-c-compiler-wrap hidden>
          <h4>${t('Диагностика среды', 'Runtime diagnostics')}</h4>
          <pre class="output" data-c-compiler></pre>
        </div>
      </section>
    </section>`;

  const find = selector => host.querySelector(selector);
  find('#codeLoadDemo')?.remove();
  const stdin = find('[data-c-stdin]');
  const runButton = find('[data-c-run]');
  const saveStatus = find('[data-c-save]');
  const runStatus = find('[data-c-result]');
  const outputs = find('[data-c-output]');
  const recoverButton = find('[data-c-recover]');
  const editor = find('#editor');
  const course = host.closest('[data-c-course]');
  const openButton = course?.querySelector('[data-c-open-work-window]');
  stdin.value = opened.stdin;
  const studio = bindCodeStudio({
    editor, locale, languageId: 'c', fileName: entryFile, files: opened.files,
    activeFile: opened.activeFile, onWorkspaceChange: (_, change) => {
      if (change !== 'init' && change !== 'view-state') markEdited(change !== 'active-file');
    },
  });
  saveStatus.textContent = !readable
    ? t('Локальный черновик недоступен. Скопируйте свою работу перед уходом.', 'The local draft is unavailable. Copy your work before leaving.')
    : draft
      ? t('Код и входные данные восстановлены с этого устройства.', 'Code and input restored from this device.')
      : t('Изменения сохраняются на этом устройстве.', 'Changes are saved on this device.');
  updateRecovery();

  function snapshot() {
    return {
      files: studio.getSnapshot().files.map(({path, content}) => ({path, content})),
      activeFile: studio.getActiveFile(),
      stdin: stdin.value,
    };
  }

  function clearFileResults() {
    outputs.querySelector('[data-runtime-files]')?.remove();
  }

  function saveRunFiles(files, base) {
    if (!readable) throw Error('C_COURSE_DRAFT_UNAVAILABLE');
    if (Object.keys(files).some(path => normalizeWorkspacePath(path) !== path)) {
      throw Error('RUNTIME_FILE_PATH_INVALID');
    }

    // Validate the change before updating either the stored draft or the editor.
    const before = studio.getSnapshot();
    const candidate = createCodeWorkspace({
      languageId: 'c', entryFile, activeFile: before.activeFile, files: before.files,
    });
    const after = candidate.applyRuntimeFiles(files, base);
    const next = serializeDraft({
      files: after.files.map(({path, content}) => ({path, content})),
      activeFile: after.activeFile, stdin: stdin.value,
    });
    try {
      const current = storage.getItem(key);
      if ((current ?? null) !== originalRaw && current !== next) {
        saveStatus.textContent = t('В другой вкладке есть новая версия. Файлы запуска не сохранены.',
          'Another tab has a newer version. Run files were not saved.');
        throw Error('C_COURSE_DRAFT_CONFLICT');
      }
      storage.setItem(key, next);
    } catch (error) {
      if (error.message !== 'C_COURSE_DRAFT_CONFLICT') {
        saveStatus.textContent = t('Файлы запуска сохранить не удалось. Рабочая область не изменилась.',
          'The run files could not be saved. Your workspace is unchanged.');
      }
      throw error;
    }
    // The same write was checked on a detached workspace. The live update is synchronous.
    studio.applyRuntimeFiles(files, base);
    clearTimeout(saveTimer);
    originalRaw = next;
    dirty = false;
    saveStatus.textContent = t('Файлы запуска добавлены в сохранённый черновик.',
      'The run files were added to your saved draft.');
    onSaved?.({lessonId});
  }

  function flush() {
    clearTimeout(saveTimer);
    if (!dirty) return true;
    try {
      if (!readable) throw Error('C_COURSE_DRAFT_UNAVAILABLE');
      // Keep a newer draft from a different tab intact.
      const next = serializeDraft(snapshot());
      const current = storage.getItem(key);
      if ((current ?? null) !== originalRaw && current !== next) {
        saveStatus.textContent = t(
          'В другой вкладке есть новая версия. Скопируйте текущий код перед уходом.',
          'Another tab has a newer version. Copy the current code before leaving.');
        return false;
      }
      storage.setItem(key, next);
      originalRaw = next;
      dirty = false;
      saveStatus.textContent = t('Черновик сохранён на этом устройстве.', 'Draft saved on this device.');
    } catch {
      saveStatus.textContent = t('Сохранить черновик не удалось. Скопируйте код перед уходом.', 'The draft could not be saved. Copy your code before leaving.');
      return false;
    }
    onSaved?.({lessonId});
    return true;
  }

  function invalidateRunOutput() {
    revision++;
    clearFileResults();
    studio.clearRuntimeDiagnostics();
    if (!outputs.hidden) runStatus.textContent = t(
      'Ниже результат предыдущего запуска. Запустите текущую работу, чтобы проверить изменения.',
      'The result below is from the previous run. Run the current code to check your changes.');
  }

  function markEdited(programChanged = true) {
    dirty = true;
    if (programChanged) invalidateRunOutput();
    saveStatus.textContent = t('Есть несохранённые изменения.', 'There are unsaved changes.');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 300);
  }

  function displayOutput(stdout, stderr, diagnostics) {
    find('[data-c-stdout]').textContent = stdout || t('(пусто)', '(empty)');
    find('[data-c-stderr]').textContent = stderr;
    find('[data-c-compiler]').textContent = diagnostics;
    find('[data-c-stderr-wrap]').hidden = !stderr;
    find('[data-c-compiler-wrap]').hidden = !diagnostics;
    outputs.hidden = false;
  }

  async function run() {
    if (running || disposed) return;
    const request = studio.runtimeRequest(stdin.value);
    const runRevision = revision;
    const current = () => !disposed && host.isConnected && verifiedAccount() === account &&
      revision === runRevision;
    let completed;
    running = true;
    runButton.disabled = true;
    outputs.hidden = true;
    clearFileResults();
    studio.clearRuntimeDiagnostics();
    runStatus.textContent = t('Компилируем и запускаем программу C17…', 'Compiling and running the C17 program…');
    try {
      const {provider} = await pickProvider(request);
      const result = await provider.run(request);
      if (disposed) return;
      displayOutput(result.stdout, result.stderr, [result.compilerStdout, result.compilerStderr].filter(Boolean).join('\n'));
      const exactC17 = result.languageId === 'c' && result.target === MODERN_CPP_TOOLCHAIN.target &&
        provider.id === 'wasm-cpp';
      const runtime = exactC17 ? 'C17 · Clang/WASI' : provider.label;
      const status = t(`${runtime} · код выхода ${result.exitCode}`, `${runtime} · exit code ${result.exitCode}`);
      runStatus.textContent = revision === runRevision ? status :
        t(`${status} · до последних изменений`, `${status} · before the last changes`);
      if (exactC17 && result.exitCode === 0 && current()) {
        showRuntimeFileResults({
          output: outputs, result, request, locale, current,
          studio: readable ? {applyRuntimeFiles: saveRunFiles} : undefined,
        });
      }
      completed = {lessonId, result, current: revision === runRevision};
    } catch (error) {
      if (disposed) return;
      const diagnostic = parseRuntimeError(error, request.source, {
        locale, files: request.files, entryFile, activeFile: studio.getActiveFile(),
      });
      if (revision === runRevision && diagnostic.compilerDiagnostic) {
        studio.setRuntimeDiagnostics([{...diagnostic, title: t('Ошибка компиляции C17', 'C17 compilation error')}]);
      }
      displayOutput('', '', diagnostic.raw);
      const status = diagnostic.compilerDiagnostic
        ? t('Clang остановил компиляцию C17. Проверьте сообщение ниже.', 'Clang stopped C17 compilation. Check the message below.')
        : t('Запуск C17 не выполнен. Подробности ниже.', 'The C17 run did not finish. See the details below.');
      runStatus.textContent = revision === runRevision ? status :
        t(`${status} Результат до последних изменений.`, `${status} The result predates your last changes.`);
    } finally {
      running = false;
      if (!disposed) runButton.disabled = false;
    }
    if (completed) onRun?.(completed);
  }

  function updateRecovery() {
    let saved;
    try {
      saved = readable && readDraft(storage.getItem(checkpointKey));
    } catch {
      saved = null;
    }
    recoverButton.hidden = !saved;
  }

  function replaceWithCheckpoint(nextDraft, expectedCheckpoint) {
    if (!flush()) return false;
    const previous = serializeDraft(snapshot());
    const next = serializeDraft(nextDraft);
    let checkpoint;
    let checkpointWritten = false;
    try {
      if (!readable) throw Error('C_COURSE_DRAFT_UNAVAILABLE');
      checkpoint = storage.getItem(checkpointKey);
      if ((expectedCheckpoint !== undefined && checkpoint !== expectedCheckpoint) ||
          (storage.getItem(key) ?? null) !== originalRaw) throw Error('C_COURSE_DRAFT_CONFLICT');
      storage.setItem(checkpointKey, previous);
      checkpointWritten = true;
      if ((storage.getItem(key) ?? null) !== originalRaw) throw Error('C_COURSE_DRAFT_CONFLICT');
      storage.setItem(key, next);
    } catch (error) {
      if (checkpointWritten) {
        try {
          if (storage.getItem(checkpointKey) === previous) {
            if (checkpoint === null) storage.removeItem?.(checkpointKey);
            else storage.setItem(checkpointKey, checkpoint);
          }
        } catch {
          // The current draft was already saved by flush before the checkpoint write.
        }
      }
      updateRecovery();
      saveStatus.textContent = error.message === 'C_COURSE_DRAFT_CONFLICT'
        ? t('В другой вкладке есть новая версия. Текущая работа оставлена как есть.',
          'Another tab has a newer version. Your current work is unchanged.')
        : t('Не удалось сохранить предыдущую работу. Текущая работа оставлена как есть.',
          'Your previous work could not be saved. Your current work is unchanged.');
      return false;
    }

    stdin.value = nextDraft.stdin;
    studio.setWorkspace(nextDraft.files, nextDraft.activeFile, {emit: false});
    originalRaw = next;
    invalidateRunOutput();
    updateRecovery();
    onSaved?.({lessonId});
    return true;
  }

  function restoreStarter() {
    const current = snapshot();
    if (JSON.stringify(current.files) === JSON.stringify(initial.files) && current.stdin === initial.stdin) return;
    const confirmed = globalThis.confirm(t(
      'Восстановить исходную заготовку? Перед заменой текущие файлы и stdin будут сохранены как предыдущая работа.',
      'Restore the original starter? Your current files and stdin will be saved as previous work before replacement.'));
    if (confirmed && replaceWithCheckpoint(initial)) saveStatus.textContent = t(
      'Заготовка восстановлена. Предыдущая работа сохранена на этом устройстве.',
      'The starter was restored. Your previous work is saved on this device.');
  }

  function recoverWork() {
    let checkpoint;
    let previous;
    try {
      checkpoint = storage.getItem(checkpointKey);
      previous = readDraft(checkpoint);
    } catch {
      updateRecovery();
    }
    if (!previous) return;
    const confirmed = globalThis.confirm(t(
      'Вернуть предыдущие файлы и stdin? Текущая работа будет сохранена перед заменой.',
      'Recover the previous files and stdin? Your current work will be saved before replacement.'));
    if (confirmed && replaceWithCheckpoint(previous, checkpoint)) saveStatus.textContent = t(
      'Предыдущая работа восстановлена и сохранена на этом устройстве.',
      'Your previous work was restored and saved on this device.');
  }

  function downloadWork() {
    const body = JSON.stringify({version: 1, lessonId, languageId: 'c', ...snapshot()}, null, 2);
    const url = URL.createObjectURL(new Blob([body], {type:'application/json;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = lessonId + '-my-work.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function openWorkWindow() {
    if (disposed || opening || workWindow) return;
    const task = course.querySelector('[data-c-work-task]');
    if (!task) return;
    opening = true;
    openButton.disabled = true;
    try {
      const {ensureGoldStyles, openGoldWorkspace} = await import('./academy-gold-presentation.js');
      await ensureGoldStyles();
      if (disposed || !host.isConnected) return;
      workWindow = openGoldWorkspace(course, openButton, {lessonId, locale}, {
        workspace: host,
        task,
        taskAdditions: [course.querySelector('[data-c-work-cases]')],
        mobilePanel: 'task',
        editorTabLabel: t('Редактор', 'Editor'),
        beforeClose: flush,
        bindTask: null,
        onShowEditor: () => studio.recalculateEditorHeight(),
        onClose: () => { workWindow = null; },
      });
    } catch {
      if (!disposed) saveStatus.textContent = t(
        'Не удалось открыть рабочее окно. Редактор доступен в уроке.',
        'The work window could not be opened. The editor is available in the lesson.');
    } finally {
      opening = false;
      if (!disposed) openButton.disabled = false;
    }
  }

  stdin.addEventListener('input', () => markEdited(), {signal});
  runButton.addEventListener('click', run, {signal});
  find('[data-c-starter]').addEventListener('click', restoreStarter, {signal});
  recoverButton.addEventListener('click', recoverWork, {signal});
  find('[data-c-download]').addEventListener('click', downloadWork, {signal});
  openButton?.addEventListener('click', openWorkWindow, {signal});
  globalThis.addEventListener('pagehide', flush, {signal});
  globalThis.addEventListener('beforeunload', event => {
    if (flush()) return;
    event.preventDefault();
    event.returnValue = true;
  }, {signal});

  return {
    flush,
    dispose() {
      if (disposed) return true;
      if (!flush()) return false;
      disposed = true;
      events.abort();
      workWindow?.dispose();
      clearFileResults();
      studio.dispose();
      return true;
    },
  };
}

export const mount = bindCCourseWorkspace;
