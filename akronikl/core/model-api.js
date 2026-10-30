import { record, field, id, text, LIMITS, freeze, clone, fail } from './contracts.js';

// Контракт адаптеров, а не готовая интеграция LLM/BYOK.
// Провайдеры — доверенный код host. Core не является sandbox для их JavaScript.
export function createModelRegistry(adapters = []) {
  if (!Array.isArray(adapters) || adapters.length > 16) fail('INVALID_PROVIDERS');
  const providers = new Map();
  for (const adapter of adapters) {
    record(adapter, 'INVALID_PROVIDER');
    const providerId = id(field(adapter, 'id')), kind = field(adapter, 'kind');
    if (!['local', 'external'].includes(kind) || typeof field(adapter, 'generate') !== 'function' || providers.has(providerId)) fail('INVALID_PROVIDER');
    const descriptor = freeze({ id: providerId, kind, label: text(field(adapter, 'label') ?? providerId, 120), modelId: id(field(adapter, 'modelId') ?? providerId), protocolVersion: 1, methods: ['generate'], enabled: kind === 'local' });
    providers.set(providerId, { descriptor, generate: field(adapter, 'generate') });
  }
  return Object.freeze({
    list() { return freeze([...providers.values()].map(p => clone(p.descriptor))); },
    async generate({ providerId, prompt, context, signal, allowLocal = false }) {
      const provider = providers.get(id(providerId));
      if (!provider) fail('PROVIDER_UNAVAILABLE');
      // AKRONIKL-3 имеет отдельный security gate. Нет переключателя из запроса.
      if (provider.descriptor.kind === 'external') fail('EXTERNAL_PROVIDER_DISABLED');
      if (allowLocal !== true) fail('LOCAL_MODEL_DISABLED');
      const input = freeze({ schemaVersion: 1, modelId: provider.descriptor.modelId, prompt: text(prompt, LIMITS.query), context: clone(context) });
      const raw = await provider.generate(input, { signal });
      if (signal?.aborted) fail('REQUEST_CANCELLED');
      record(raw, 'INVALID_MODEL_RESPONSE');
      // Любые tools/actions/URL из ответа намеренно не входят в результат API.
      return freeze({ providerId, modelId: provider.descriptor.modelId, text: text(field(raw, 'text'), LIMITS.answer, 'INVALID_MODEL_RESPONSE'), generated: true });
    }
  });
}
