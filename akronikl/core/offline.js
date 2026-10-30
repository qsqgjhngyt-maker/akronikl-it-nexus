import { record, field, locale, text, fail } from './contracts.js';
import { createKnowledgeIndex } from './knowledge.js';

// descriptor берётся из доверенного manifest выбранной версии приложения.
// readBytes — внедрённый host reader подготовленного ресурса; собственной сети/storage нет.
export async function loadPreparedKnowledge({ descriptor, readBytes, subtle = globalThis.crypto?.subtle, signal } = {}) {
  record(descriptor, 'INVALID_KNOWLEDGE_DESCRIPTOR');
  const language = locale(field(descriptor, 'locale'));
  const path = field(descriptor, 'path'), size = field(descriptor, 'bytes'), expected = field(descriptor, 'sha256');
  if (path !== `akronikl/knowledge/core-index.${language}.json` || !Number.isSafeInteger(size) || size < 1 || size > 2000000 || typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected) || typeof readBytes !== 'function') fail('INVALID_KNOWLEDGE_DESCRIPTOR');
  const expectedId = text(field(descriptor, 'id'), 80, 'INVALID_KNOWLEDGE_DESCRIPTOR');
  const expectedVersion = text(field(descriptor, 'contentVersion'), 128, 'INVALID_KNOWLEDGE_DESCRIPTOR');
  if (!subtle || typeof subtle.digest !== 'function') fail('CRYPTO_UNAVAILABLE');
  if (signal?.aborted) fail('REQUEST_CANCELLED');
  let supplied;
  try { supplied = await readBytes(path, { signal }); }
  catch { if (signal?.aborted) fail('REQUEST_CANCELLED'); fail('KNOWLEDGE_NOT_PREPARED'); }
  if (signal?.aborted) fail('REQUEST_CANCELLED');
  if (!(supplied instanceof Uint8Array) || supplied.byteLength !== size) fail('KNOWLEDGE_INTEGRITY_FAILED');
  const bytes = new Uint8Array(supplied);
  let digest;
  try { digest = new Uint8Array(await subtle.digest('SHA-256', bytes)); }
  catch { fail('KNOWLEDGE_INTEGRITY_FAILED'); }
  if (signal?.aborted) fail('REQUEST_CANCELLED');
  if ([...digest].map(b => b.toString(16).padStart(2, '0')).join('') !== expected) fail('KNOWLEDGE_INTEGRITY_FAILED');
  let bundle;
  try { bundle = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail('KNOWLEDGE_INTEGRITY_FAILED'); }
  if (bundle?.id !== expectedId || bundle?.locale !== language || bundle?.contentVersion !== expectedVersion) fail('KNOWLEDGE_INTEGRITY_FAILED');
  try { return createKnowledgeIndex(bundle); }
  catch { fail('KNOWLEDGE_INTEGRITY_FAILED'); }
}
