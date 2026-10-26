// Контракт Core v1. Только обычные данные; ошибки не отражают входные значения.
export const CORE_VERSION = '0.1.0';
export const SCHEMA_VERSION = 1;
export const LIMITS = Object.freeze({ query: 2000, code: 12000, diagnostics: 20, diagnosticMessage: 1000, answer: 16000, timeoutMs: 10000 });

const ERROR_CODES = new Set([
  'OPERATION_FAILED', 'INVALID_INPUT', 'INVALID_ID', 'UNSUPPORTED_LOCALE', 'INVALID_DATA_SELECTION', 'INVALID_FILE_PATH',
  'INVALID_ROUTE', 'UNSUPPORTED_ROUTE', 'INVALID_SELECTION', 'INVALID_SELECTION_REVISION', 'SELECTION_TOO_LARGE', 'INVALID_SELECTION_RANGE',
  'INVALID_DIAGNOSTICS', 'DIAGNOSTICS_REQUIRE_SELECTION', 'STALE_DIAGNOSTICS', 'DIAGNOSTIC_TOO_LARGE', 'CONTEXT_UNAVAILABLE',
  'INVALID_LEARNING_CONTEXT', 'STALE_LEARNING_CONTEXT', 'INVALID_HOST_ADAPTER', 'INVALID_LEGACY_CONTEXT', 'CONTEXT_CHANGED',
  'INVALID_PROVIDERS', 'INVALID_PROVIDER', 'PROVIDER_UNAVAILABLE', 'EXTERNAL_PROVIDER_DISABLED', 'LOCAL_MODEL_DISABLED',
  'REQUEST_CANCELLED', 'INVALID_MODEL_RESPONSE', 'INVALID_POLICY', 'INVALID_TIMEOUT', 'INVALID_KNOWLEDGE', 'CORE_DISPOSED',
  'UNKNOWN_CAPABILITY', 'INVALID_ABORT_SIGNAL', 'REQUEST_TIMEOUT', 'ACCESS_DENIED', 'DATA_ACCESS_DENIED', 'KNOWLEDGE_NOT_PREPARED',
  'INVALID_QUERY', 'INVALID_LIMIT', 'INVALID_STUDIO_SNAPSHOT', 'INVALID_KNOWLEDGE_DESCRIPTOR', 'KNOWLEDGE_INTEGRITY_FAILED', 'CRYPTO_UNAVAILABLE'
]);

export class CoreError extends Error {
  constructor(code) { const safe = ERROR_CODES.has(code) ? code : 'OPERATION_FAILED'; super(safe); this.name = 'CoreError'; Object.defineProperty(this, 'code', { value: safe, enumerable: true }); }
}

export function safeErrorCode(error) {
  const own = error instanceof CoreError ? Object.getOwnPropertyDescriptor(error, 'code') : null;
  return own && 'value' in own && ERROR_CODES.has(own.value) ? own.value : 'OPERATION_FAILED';
}

export function fail(code) { throw new CoreError(code); }

export function record(value, code = 'INVALID_INPUT') {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(code);
  for (const key of Reflect.ownKeys(value)) {
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key) || !d || !('value' in d)) fail(code);
  }
  return value;
}

export function exactKeys(value, allowed, code = 'INVALID_INPUT') {
  record(value, code);
  if (Object.keys(value).some(key => !allowed.includes(key))) fail(code);
  return value;
}

export function field(value, key) {
  const d = value && Object.getOwnPropertyDescriptor(value, key);
  if (d && !('value' in d)) fail('INVALID_INPUT');
  return d?.value;
}

export function text(value, max, code = 'INVALID_INPUT', { empty = false } = {}) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) fail(code);
  return value;
}

export function id(value, { nullable = false } = {}) {
  if (nullable && (value === null || value === undefined)) return null;
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value)) fail('INVALID_ID');
  return value;
}

export function locale(value = 'ru') {
  if (!['ru', 'en'].includes(value)) fail('UNSUPPORTED_LOCALE');
  return value;
}

export function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export function clone(value) { return structuredClone(value); }

export function result({ requestId, capability, status = 'ok', mode = 'core', message = '', data = null, sources = [], actions = [], error = null }) {
  return freeze({ schemaVersion: SCHEMA_VERSION, coreVersion: CORE_VERSION, requestId, capability, status, mode, text: message, data, sources, actions, error });
}

export function normalizeInclude(input = []) {
  const values = list(input, 2, 'INVALID_DATA_SELECTION');
  if (values.some(x => !['selection', 'diagnostics'].includes(x)) || new Set(values).size !== values.length) fail('INVALID_DATA_SELECTION');
  return values;
}

export function list(input, max, code = 'INVALID_INPUT') {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype || input.length > max) fail(code);
  const own = Reflect.ownKeys(input);
  if (own.length !== input.length + 1) fail(code);
  const output = [];
  for (let n = 0; n < input.length; n++) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(n));
    if (!descriptor || !('value' in descriptor)) fail(code);
    output.push(descriptor.value);
  }
  return output;
}

export function safePath(value) {
  if (typeof value !== 'string' || value.length > 240 || !value || value.includes('\\') || value.includes('\0') || value.startsWith('/') || value.includes(':') || /[\r\n]/.test(value)) fail('INVALID_FILE_PATH');
  if (value.split('/').some(part => !part || part === '.' || part === '..')) fail('INVALID_FILE_PATH');
  return value;
}
