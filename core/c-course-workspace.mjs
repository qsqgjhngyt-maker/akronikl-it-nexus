import {accountStoragePrefix, verifiedAccount} from './account-storage.js';
import {bindCodeStudio, codeStudioMarkup} from '../sandbox/code-studio.js';
import {normalizeWorkspacePath} from '../sandbox/code-workspace.js';
import {parseRuntimeError} from '../sandbox/diagnostics.js';
import {MODERN_CPP_TOOLCHAIN} from '../sandbox/runtime-assets.js';
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
  };
}

export function bindCCourseWorkspace({
  host, locale = 'ru', lesson, lessonId = lesson?.id, starter = lesson?.practice?.starter,
  storageScope = '', storage = createCCourseStorage(), onSaved, onRun,
} = {}) {
  if (!host || typeof lessonId !== 'string' || !lessonId) throw Error('C_COURSE_WORKSPACE_REQUIRED');
  const en = locale === 'en';
  const t = (ru, english) => en ? english : ru;
  const key = 'draft:' + encodeURIComponent(storageScope) + ':' + encodeURIComponent(lessonId);
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
  const events = new AbortController();
  const {signal} = events;
  let disposed = false;
  let dirty = false;
  let saveTimer;
  let running = false;
  let revision = 0;

  host.innerHTML = `
    <section class="sandbox-block" aria-label="Code Studio · C17">
      ${codeStudioMarkup({files: opened.files, activeFile: opened.activeFile, entryFile, locale, languageId: 'c'})}
      <label class="stdin-label">
        ${t('Входные данные программы (stdin)', 'Program input (stdin)')}
        <textarea class="stdin" rows="3" spellcheck="false" autocapitalize="off" data-c-stdin></textarea>
      </label>
      <div class="runrow">
        <button type="button" class="btn primary" data-c-run>${t('Запустить мою работу', 'Run my code')}</button>
        <button type="button" class="btn" data-c-starter>${t('Восстановить заготовку', 'Restore starter')}</button>
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
  const editor = find('#editor');
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

  function snapshot() {
    return {
      files: studio.getSnapshot().files.map(({path, content}) => ({path, content})),
      activeFile: studio.getActiveFile(),
      stdin: stdin.value,
    };
  }

  function flush() {
    clearTimeout(saveTimer);
    if (!dirty) return true;
    try {
      if (!readable) throw Error('C_COURSE_DRAFT_UNAVAILABLE');
      // Keep a newer draft from a different tab intact.
      const next = JSON.stringify({version: 1, ...snapshot()});
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

  function markEdited(programChanged = true) {
    dirty = true;
    if (programChanged) {
      revision++;
      studio.clearRuntimeDiagnostics();
      if (!outputs.hidden) runStatus.textContent = t(
        'Ниже результат предыдущего запуска. Запустите текущую работу, чтобы проверить изменения.',
        'The result below is from the previous run. Run the current code to check your changes.');
    }
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
    let completed;
    running = true;
    runButton.disabled = true;
    outputs.hidden = true;
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

  function restoreStarter() {
    const current = snapshot();
    if (JSON.stringify(current.files) === JSON.stringify(initial.files) && current.stdin === initial.stdin) return;
    const confirmed = globalThis.confirm(t(
      'Заменить текущие файлы и входные данные заготовкой?',
      'Replace the current files and input with the starter?'));
    if (!confirmed) return;
    stdin.value = initial.stdin;
    studio.setWorkspace(initial.files, initial.activeFile);
  }

  stdin.addEventListener('input', () => markEdited(), {signal});
  runButton.addEventListener('click', run, {signal});
  find('[data-c-starter]').addEventListener('click', restoreStarter, {signal});
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
      studio.dispose();
      return true;
    },
  };
}

export const mount = bindCCourseWorkspace;
