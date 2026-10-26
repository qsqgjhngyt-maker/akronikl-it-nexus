import { CORE_VERSION, LIMITS, CoreError, safeErrorCode, record, exactKeys, field, id, text, locale, freeze, result, fail, normalizeInclude } from './contracts.js';
import { createContextSnapshot } from './context.js';
import { createCapabilityRegistry } from './capabilities.js';
import { createModelRegistry } from './model-api.js';

export { CORE_VERSION };
export { createNexusContextAdapter, createContextSnapshot, routeFromNexus } from './context.js';
export { createCapabilityRegistry } from './capabilities.js';
export { createModelRegistry } from './model-api.js';
export { createKnowledgeIndex } from './knowledge.js';
export { loadPreparedKnowledge } from './offline.js';
export { selectionFromCodeStudio, diagnosticFromNexus } from './studio.js';

const ERROR_MESSAGES = Object.freeze({
  cancelled: 'Контекст изменился или запрос отменён. Повторите действие в текущем разделе.',
  denied: 'Это действие или выбранные данные недоступны в текущем контексте.',
  unavailable: 'Возможность пока недоступна. Локальные функции помощника продолжают работать.',
  error: 'Запрос не выполнен. Проверьте выбранную возможность и входные данные.'
});
const CANCEL_CODES = new Set(['CONTEXT_CHANGED', 'REQUEST_CANCELLED', 'CORE_DISPOSED']);
const UNAVAILABLE_CODES = new Set(['KNOWLEDGE_NOT_PREPARED', 'PROVIDER_UNAVAILABLE', 'EXTERNAL_PROVIDER_DISABLED', 'LOCAL_MODEL_DISABLED', 'REQUEST_TIMEOUT', 'CONTEXT_UNAVAILABLE']);
const signalAborted = Object.getOwnPropertyDescriptor(AbortSignal.prototype, 'aborted').get;
const addAbortListener = EventTarget.prototype.addEventListener;
const removeAbortListener = EventTarget.prototype.removeEventListener;

function errorResult(error, requestId, capability) {
  // Внешние исключения не раскрывают message/stack/body и не управляют кодом ошибки.
  const code = safeErrorCode(error);
  const status = CANCEL_CODES.has(code) ? 'cancelled' : code === 'ACCESS_DENIED' || code === 'DATA_ACCESS_DENIED' ? 'denied' : UNAVAILABLE_CODES.has(code) ? 'unavailable' : 'error';
  return result({ requestId, capability, status, message: ERROR_MESSAGES[status], error: { code } });
}

function validateInput(capability, input) {
  const keys = {
    'assistant.capabilities': [],
    'context.current': ['include'],
    'knowledge.search': ['query', 'locale', 'limit'],
    'navigation.propose': ['lessonId', 'locale'],
    'model.generate': ['providerId', 'prompt', 'include']
  };
  exactKeys(input, keys[capability]);
  const output = {};
  if (capability === 'knowledge.search') {
    output.query = text(field(input, 'query'), LIMITS.query, 'INVALID_QUERY', { empty: true });
    output.locale = field(input, 'locale') === undefined ? null : locale(field(input, 'locale'));
    output.limit = field(input, 'limit') ?? 5;
    if (!Number.isSafeInteger(output.limit) || output.limit < 1 || output.limit > 10) fail('INVALID_LIMIT');
  }
  if (capability === 'navigation.propose') { output.lessonId = id(field(input, 'lessonId')); output.locale = field(input, 'locale') === undefined ? null : locale(field(input, 'locale')); }
  if (capability === 'context.current' || capability === 'model.generate') output.include = normalizeInclude(field(input, 'include') ?? []);
  if (capability === 'model.generate') { output.providerId = id(field(input, 'providerId')); output.prompt = text(field(input, 'prompt'), LIMITS.query); }
  return freeze(output);
}

function sourceReference(record) {
  return { sourceId: record.sourceId, contentVersion: record.contentVersion, courseId: record.courseId, lessonId: record.lessonId, locale: record.locale, title: record.title, section: record.section, sourcePath: record.sourcePath, contentHash: record.contentHash };
}

export function createAssistantCore({ host, knowledge = [], providers = [], policy = {}, timeoutMs = LIMITS.timeoutMs } = {}) {
  record(host, 'INVALID_HOST_ADAPTER');
  if (['readBoundary', 'readContext', 'authorize'].some(key => typeof field(host, key) !== 'function')) fail('INVALID_HOST_ADAPTER');
  record(policy, 'INVALID_POLICY');
  exactKeys(policy, ['selection', 'diagnostics', 'localModels'], 'INVALID_POLICY');
  if (Object.values(policy).some(v => typeof v !== 'boolean')) fail('INVALID_POLICY');
  const permissions = freeze({ selection: policy.selection === true, diagnostics: policy.diagnostics === true, localModels: policy.localModels === true });
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 30000) fail('INVALID_TIMEOUT');
  if (!Array.isArray(knowledge) || knowledge.length > 2 || knowledge.some(k => !k || typeof k.search !== 'function' || typeof k.getLesson !== 'function' || !['ru', 'en'].includes(k.stats?.locale) || typeof k.stats?.contentVersion !== 'string')) fail('INVALID_KNOWLEDGE');
  const indexes = new Map(knowledge.map(k => [k.stats.locale, k]));
  if (indexes.size !== knowledge.length) fail('INVALID_KNOWLEDGE');
  const registry = createCapabilityRegistry(), models = createModelRegistry(providers);
  // Захватываем методы: изменение переданного host после создания не меняет полномочия.
  const readBoundary = host.readBoundary.bind(host), readContext = host.readContext.bind(host), authorize = host.authorize.bind(host);
  let epoch = 0, disposed = false, sequence = 0;
  const pending = new Set();

  function invalidate() { epoch++; for (const controller of pending) controller.abort(); }
  function dispose() { disposed = true; invalidate(); }

  async function invoke(request, options = {}) {
    const requestId = 'ak0-' + (++sequence);
    let capability = null, controller, timer, unsubscribe, boundary, capturedEpoch, signal;
    try {
      if (disposed) fail('CORE_DISPOSED');
      exactKeys(options, ['signal']); signal = field(options, 'signal');
      exactKeys(request, ['capability', 'input']);
      const requested = id(field(request, 'capability'));
      if (!registry.has(requested)) fail('UNKNOWN_CAPABILITY');
      capability = requested;
      const input = validateInput(capability, field(request, 'input') ?? {});
      boundary = readBoundary(); capturedEpoch = epoch;
      if (!boundary || typeof boundary !== 'object') fail('CONTEXT_UNAVAILABLE');
      let initiallyAborted = false;
      if (signal != null) {
        try { initiallyAborted = signalAborted.call(signal); }
        catch { fail('INVALID_ABORT_SIGNAL'); }
      }
      controller = new AbortController(); pending.add(controller);
      if (signal != null) {
        const externalAbort = () => controller.abort();
        // Используем нативный EventTarget: пользовательские методы signal не исполняются.
        try { addAbortListener.call(signal, 'abort', externalAbort, { once: true }); }
        catch { fail('INVALID_ABORT_SIGNAL'); }
        unsubscribe = () => { try { removeAbortListener.call(signal, 'abort', externalAbort); } catch {} };
        if (initiallyAborted) controller.abort();
      }
      const assertCurrent = () => {
        if (disposed) fail('CORE_DISPOSED');
        if (controller.signal.aborted) fail('REQUEST_CANCELLED');
        if (epoch !== capturedEpoch || readBoundary() !== boundary) fail('CONTEXT_CHANGED');
      };
      const cancellation = new Promise((_, reject) => {
        const abort = () => reject(new CoreError('REQUEST_CANCELLED'));
        controller.signal.addEventListener('abort', abort, { once: true });
        timer = setTimeout(() => { reject(new CoreError('REQUEST_TIMEOUT')); controller.abort(); }, timeoutMs);
      });
      const operation = async () => {
        assertCurrent();
        const allowed = await authorize(freeze({ capability, input }), { boundary, signal: controller.signal });
        assertCurrent();
        if (allowed !== true) fail('ACCESS_DENIED');
        const include = input.include ?? [];
        if (include.some(key => !permissions[key])) fail('DATA_ACCESS_DENIED');
        let knowledgeLocale = input.locale;
        if (['knowledge.search', 'navigation.propose'].includes(capability) && knowledgeLocale === null) {
          const raw = await readContext({ include: [], signal: controller.signal }); assertCurrent();
          knowledgeLocale = createContextSnapshot(raw).courseLocale;
        }
        let response;
        if (capability === 'assistant.capabilities') {
          response = result({ requestId, capability, message: 'Доступные возможности ядра Akronikl.', data: { capabilities: registry.list(), providers: models.list(), localModelEnabled: permissions.localModels, externalModelEnabled: false } });
        } else if (capability === 'context.current') {
          const raw = await readContext({ include, signal: controller.signal }); assertCurrent();
          const context = createContextSnapshot(raw, { include });
          response = result({ requestId, capability, message: 'Контекст текущего раздела.', data: context });
        } else if (capability === 'knowledge.search') {
          const index = indexes.get(knowledgeLocale);
          if (!index) fail('KNOWLEDGE_NOT_PREPARED');
          if (!input.query.trim()) response = result({ requestId, capability, status: 'clarify', message: 'Что найти в материалах Академии?', data: { matches: [] } });
          else {
            const matches = index.search(input.query, { locale: knowledgeLocale, limit: input.limit });
            response = result({ requestId, capability, status: matches.length ? 'ok' : 'empty', message: matches.length ? 'Найдены материалы в подготовленном локальном индексе.' : 'В подготовленных материалах совпадений не найдено.', data: { matches }, sources: matches.map(sourceReference) });
          }
        } else if (capability === 'navigation.propose') {
          const index = indexes.get(knowledgeLocale);
          if (!index) fail('KNOWLEDGE_NOT_PREPARED');
          const source = index.getLesson(input.lessonId, knowledgeLocale)[0];
          if (!source) response = result({ requestId, capability, status: 'empty', message: 'Урок не найден в подготовленном индексе.', data: null });
          else response = result({ requestId, capability, message: 'Можно открыть найденный урок.', sources: [sourceReference(source)], actions: [{ kind: 'navigation.proposal', label: source.title, target: { courseId: source.courseId, lessonId: source.lessonId }, requiresUserGesture: true }] });
        } else if (capability === 'model.generate') {
          if (!permissions.localModels) fail('LOCAL_MODEL_DISABLED');
          const raw = await readContext({ include, signal: controller.signal }); assertCurrent();
          const context = createContextSnapshot(raw, { include });
          const generated = await models.generate({ providerId: input.providerId, prompt: input.prompt, context, signal: controller.signal, allowLocal: permissions.localModels });
          assertCurrent();
          response = result({ requestId, capability, mode: 'local-model', message: generated.text, data: { providerId: generated.providerId, modelId: generated.modelId, generated: true, grounded: false } });
        }
        assertCurrent();
        return response;
      };
      return await Promise.race([operation(), cancellation]);
    } catch (error) {
      // Отменяем также ошибки, завершившиеся после смены контекста: они относятся к прежнему экрану.
      if (boundary) {
        try { if (disposed || epoch !== capturedEpoch || readBoundary() !== boundary) error = new CoreError('CONTEXT_CHANGED'); }
        catch { error = new CoreError('CONTEXT_CHANGED'); }
      }
      return errorResult(error, requestId, capability);
    }
    finally { clearTimeout(timer); try { unsubscribe?.(); } catch {} if (controller) pending.delete(controller); }
  }

  return Object.freeze({ version: CORE_VERSION, invoke, invalidate, dispose });
}
