import {loadPreparedKnowledge} from '../core/offline.js';

// Привязка к manifest из проверенного Core candidate. При обновлении индекса
// pin меняется вместе с manifest и проходит тест согласованности.
export const KNOWLEDGE_MANIFEST_SHA256 = 'eaf6bd915561dba305054504d4058fd293eb753789171bbffa1158c89227a4ba';
const cache = new Map();
export async function readBoundedJsonBytes(url, {signal, maxBytes, fetchImpl = globalThis.fetch} = {}) {
  const response = await fetchImpl(url, {credentials:'omit', redirect:'error', cache:'no-store', signal});
  if (response.status !== 200 || response.redirected ||
      !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
    await response.body?.cancel().catch(() => {});
    throw Error('AKRONIKL_RESOURCE_UNAVAILABLE');
  }
  const reader = response.body?.getReader();
  if (!reader) throw Error('AKRONIKL_RESOURCE_UNAVAILABLE');
  const chunks = []; let size = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw Error('AKRONIKL_RESOURCE_LIMIT');
      chunks.push(value);
    }
    signal?.throwIfAborted();
    const out = new Uint8Array(size); let offset = 0;
    for (const part of chunks) {out.set(part, offset); offset += part.length;}
    return out;
  } finally {await reader.cancel().catch(() => {}); reader.releaseLock();}
}
export async function loadUiKnowledge(language, {signal, fetchImpl = globalThis.fetch} = {}) {
  if (!['ru','en'].includes(language)) throw Error('AKRONIKL_LOCALE_UNSUPPORTED');
  signal?.throwIfAborted();
  // Кэш содержит только публичный индекс. Никаких запросов/кода/истории пользователя.
  if (fetchImpl === globalThis.fetch && cache.has(language)) return cache.get(language);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, {once:true});
  if (signal?.aborted) abort();
  const timer = setTimeout(abort, 12000);
  try {
    const bytes = await readBoundedJsonBytes(new URL('../knowledge/manifest.json', import.meta.url), {
      signal:controller.signal, maxBytes:65536, fetchImpl
    });
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    if ([...digest].map(v => v.toString(16).padStart(2,'0')).join('') !== KNOWLEDGE_MANIFEST_SHA256) throw Error('AKRONIKL_MANIFEST_REJECTED');
    const manifest = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes));
    const descriptor = manifest.indexes.find(row => row.locale === language);
    const index = await loadPreparedKnowledge({descriptor, signal:controller.signal,
      readBytes:(_path, options) => readBoundedJsonBytes(new URL(`../knowledge/core-index.${language}.json`, import.meta.url), {
        ...options, maxBytes:descriptor.bytes, fetchImpl
      })
    });
    controller.signal.throwIfAborted();
    if (fetchImpl === globalThis.fetch) cache.set(language, index);
    return index;
  } finally {clearTimeout(timer); signal?.removeEventListener('abort', abort);}
}
