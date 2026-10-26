import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { createAssistantCore, createKnowledgeIndex, createContextSnapshot, createNexusContextAdapter, routeFromNexus, loadPreparedKnowledge, selectionFromCodeStudio, diagnosticFromNexus } from '../akronikl/core/index.js';
import { CoreError } from '../akronikl/core/contracts.js';
import { createCodeWorkspace } from '../sandbox/code-workspace.js';
import { parseRuntimeError } from '../sandbox/diagnostics.js';

const root = new URL('../', import.meta.url);
const readJSON = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const manifest = await readJSON('akronikl/knowledge/manifest.json');
const ru = createKnowledgeIndex(await readJSON('akronikl/knowledge/core-index.ru.json'));
const en = createKnowledgeIndex(await readJSON('akronikl/knowledge/core-index.en.json'));
function fixture(options = {}) {
  let boundary = Object.freeze({});
  const route = { view: 'lesson', courseId: 'cpp', lessonId: 'cpp.pointers-references-addresses' };
  const context = { locale: 'ru', courseLocale: 'ru', route, ...options.context };
  const host = { readBoundary: () => boundary, readContext: () => context, authorize: () => true, ...options.host };
  const core = createAssistantCore({ knowledge: [ru, en], ...options, host });
  return { core, context, changeBoundary: () => { boundary = Object.freeze({}); } };
}

test('реальный ESM API импортируется и перечисляет только пять возможностей этапа 0', async () => {
  const { core } = fixture();
  const response = await core.invoke({ capability: 'assistant.capabilities' });
  assert.equal(response.status, 'ok');
  assert.equal(response.coreVersion, '0.1.0');
  assert.deepEqual(response.data.capabilities.map(x => x.id), ['assistant.capabilities', 'context.current', 'knowledge.search', 'navigation.propose', 'model.generate']);
  assert.equal(response.data.externalModelEnabled, false);
  assert.equal(response.data.localModelEnabled, false);
  assert.deepEqual(response.data.providers, []);
});

test('реальный поиск возвращает versioned источники и не предлагает исполнение', async () => {
  const { core } = fixture();
  const response = await core.invoke({ capability: 'knowledge.search', input: { query: 'бинарный поиск', locale: 'ru' } });
  assert.equal(response.status, 'ok');
  assert.ok(response.sources.some(s => s.lessonId === 'cpp.search-linear-binary'));
  for (const source of response.sources) { assert.equal(source.contentVersion, ru.stats.contentVersion); assert.match(source.contentHash, /^[a-f0-9]{64}$/); }
  assert.deepEqual(response.actions, []);
});

test('пустой запрос просит уточнить, неизвестный не выдумывает ответ', async () => {
  const { core } = fixture();
  const empty = await core.invoke({ capability: 'knowledge.search', input: { query: '  ' } });
  assert.equal(empty.status, 'clarify');
  const missing = await core.invoke({ capability: 'knowledge.search', input: { query: 'qzxnonexistentmaterial987' } });
  assert.equal(missing.status, 'empty'); assert.deepEqual(missing.sources, []); assert.deepEqual(missing.actions, []);
});

test('навигация выдаёт предложение только для существующего урока, без URL или выполнения', async () => {
  const { core } = fixture();
  const found = await core.invoke({ capability: 'navigation.propose', input: { lessonId: 'cpp.pointers-references-addresses' } });
  assert.equal(found.status, 'ok');
  assert.deepEqual(found.actions[0].target, { courseId: 'cpp', lessonId: 'cpp.pointers-references-addresses' });
  assert.equal(found.actions[0].requiresUserGesture, true);
  assert.equal(Object.hasOwn(found.actions[0], 'url'), false);
  const unknown = await core.invoke({ capability: 'navigation.propose', input: { lessonId: 'cpp.not-real-lesson' } });
  assert.equal(unknown.status, 'empty'); assert.deepEqual(unknown.actions, []);
});

test('локаль по умолчанию берётся из языка курса после авторизации', async () => {
  const { core } = fixture({ context: { locale: 'ru', courseLocale: 'en' }, knowledge: [en] });
  const found = await core.invoke({ capability: 'knowledge.search', input: { query: 'pointers' } });
  assert.equal(found.status, 'ok'); assert.ok(found.sources.length); assert.ok(found.sources.every(s => s.locale === 'en'));
  const nav = await core.invoke({ capability: 'navigation.propose', input: { lessonId: 'cpp.pointers-references-addresses' } });
  assert.equal(nav.status, 'ok'); assert.equal(nav.sources[0].locale, 'en');
});

test('нет пакета выбранного языка — unavailable, без скрытого fallback', async () => {
  const { core } = fixture({ knowledge: [en] });
  const response = await core.invoke({ capability: 'knowledge.search', input: { query: 'указатели', locale: 'ru' } });
  assert.equal(response.status, 'unavailable'); assert.equal(response.error.code, 'KNOWLEDGE_NOT_PREPARED'); assert.deepEqual(response.sources, []);
});

test('повторные и противоречивые пакеты одного языка отклоняются при настройке', () => {
  assert.throws(() => fixture({ knowledge: [ru, ru] }), /INVALID_KNOWLEDGE/);
});

test('locale context не читается до отказа в доступе', async () => {
  let reads = 0;
  const { core } = fixture({ host: { authorize: () => false, readContext: () => { reads++; throw new Error('not allowed'); } } });
  const response = await core.invoke({ capability: 'knowledge.search', input: { query: 'pointers' } });
  assert.equal(response.status, 'denied'); assert.equal(reads, 0);
});

test('адаптер понимает реальные ключи маршрута core/app.js и отдельные языки наставника/курса', async () => {
  const boundary = {};
  const adapter = createNexusContextAdapter({ readBoundary: () => boundary, readRoute: () => ({ view: 'home', course: 'cpp', lesson: 'cpp.files', project: null, tab: 'overview' }), readLegacyContext: () => ({ courseId: 'cpp', lessonId: 'cpp.files', sectionId: 'cpp.section.structured-programming', code: 'old', language: 'ru', courseLanguage: 'en' }), readLocale: () => 'ru', readCourseLocale: () => 'en', authorize: () => true });
  const response = await createAssistantCore({ host: adapter }).invoke({ capability: 'context.current' });
  assert.equal(response.status, 'ok');
  assert.equal(response.data.route.view, 'lesson'); assert.equal(response.data.route.lessonId, 'cpp.files');
  assert.equal(response.data.locale, 'ru'); assert.equal(response.data.courseLocale, 'en'); assert.equal(Object.hasOwn(response.data, 'code'), false);
});

test('конфликт старого и нового имени маршрутного поля отклоняется', () => {
  assert.throws(() => routeFromNexus({ course: 'cpp', courseId: 'other' }), /INVALID_ROUTE/);
});

test('старый учебный контекст не переносится на другой урок или домашнюю страницу', () => {
  const boundary = {}; let route = { view: 'home', course: 'cpp', lesson: 'cpp.files' };
  const adapter = createNexusContextAdapter({ readBoundary: () => boundary, readRoute: () => route, readLegacyContext: () => ({ courseId: 'cpp', lessonId: 'cpp.variables-scope', sectionId: 'cpp.section.cpp-basics' }) });
  assert.equal(Object.hasOwn(adapter.readContext(), 'learning'), false);
  route = { view: 'home' }; assert.equal(adapter.readContext().route.lessonId, null); assert.equal(Object.hasOwn(adapter.readContext(), 'learning'), false);
});

test('реальный снимок CodeWorkspace даёт только явно выбранный диапазон', () => {
  const source = '// private header\nint answer = 42;\n// private tail';
  const workspace = createCodeWorkspace({ files: [{ path: 'main.cpp', content: source }, { path: 'other.cpp', content: 'unrelated private source' }] });
  const start = source.indexOf('int answer'), end = source.indexOf(';', start) + 1;
  const selection = selectionFromCodeStudio(workspace.snapshot(), { filePath: 'main.cpp', startOffset: start, endOffset: end });
  assert.equal(selection.code, 'int answer = 42;'); assert.equal(selection.startLine, 2); assert.equal(selection.revision, workspace.revision);
  assert.equal(JSON.stringify(selection).includes('private'), false);
  assert.throws(() => selectionFromCodeStudio(workspace.snapshot(), { filePath: 'main.cpp' }), /INVALID_SELECTION_RANGE/);
});

test('выбор неизвестного файла, traversal, слишком большого диапазона и duplicate file отклоняется', () => {
  const workspace = createCodeWorkspace({ files: [{ path: 'main.cpp', content: 'x'.repeat(13000) }] }).snapshot();
  assert.throws(() => selectionFromCodeStudio(workspace, { filePath: '../main.cpp', startOffset: 0, endOffset: 1 }), /INVALID_FILE_PATH/);
  assert.throws(() => selectionFromCodeStudio(workspace, { filePath: 'missing.cpp', startOffset: 0, endOffset: 1 }), /INVALID_STUDIO_SNAPSHOT/);
  assert.throws(() => selectionFromCodeStudio(workspace, { filePath: 'main.cpp', startOffset: 0, endOffset: 13000 }), /SELECTION_TOO_LARGE/);
  workspace.files.push({ ...workspace.files[0] });
  assert.throws(() => selectionFromCodeStudio(workspace, { filePath: 'main.cpp', startOffset: 0, endOffset: 1 }), /INVALID_STUDIO_SNAPSHOT/);
});

test('настоящий Nexus parseRuntimeError передаёт compiler diagnostic с файлом и ревизией', () => {
  const code = 'int main(){ return absent; }';
  const selected = selectionFromCodeStudio(createCodeWorkspace({ files: [{ path: 'main.cpp', content: code }] }).snapshot(), { filePath: 'main.cpp', startOffset: 0, endOffset: code.length });
  const error = new Error('Compilation failed'); error.anxCompilerOutput = "main.cpp:1:20: error: use of undeclared identifier 'absent'"; error.anxPhase = 'compile';
  const parsed = parseRuntimeError(error, code, { activeFile: 'main.cpp', files: [{ path: 'main.cpp', content: code }] });
  const diagnostic = diagnosticFromNexus(parsed, { selection: selected, runRevision: selected.revision });
  assert.equal(diagnostic.source, 'compiler'); assert.equal(diagnostic.filePath, 'main.cpp'); assert.equal(diagnostic.line, 1); assert.match(diagnostic.message, /undeclared identifier/);
  const context = createContextSnapshot({ locale: 'ru', route: { view: 'code-studio' }, selection: selected, diagnostics: [diagnostic] }, { include: ['selection', 'diagnostics'] });
  assert.equal(context.diagnostics[0].revision, selected.revision);
});

test('устаревшая диагностика, другой файл и ограничение runtime не превращаются в ошибку ученика', () => {
  const selected = { filePath: 'main.cpp', revision: 2 };
  const parsed = { file: 'main.cpp', raw: 'actual error', compilerDiagnostic: true };
  assert.throws(() => diagnosticFromNexus(parsed, { selection: selected, runRevision: 1 }), /STALE_DIAGNOSTICS/);
  assert.throws(() => diagnosticFromNexus({ ...parsed, file: 'other.cpp' }, { selection: selected, runRevision: 2 }), /STALE_DIAGNOSTICS/);
  assert.throws(() => diagnosticFromNexus({ ...parsed, providerLimit: true }, { selection: selected, runRevision: 2 }), /INVALID_DIAGNOSTICS/);
  const warning = diagnosticFromNexus({ ...parsed, raw: 'main.cpp:1:2: warning: unused variable' }, { selection: selected, runRevision: 2 });
  assert.equal(warning.severity, 'warning');
});

test('loader читает один подготовленный пакет и проверяет SHA256 перед поиском', async () => {
  const descriptor = manifest.indexes.find(x => x.locale === 'ru'); const reads = [];
  const index = await loadPreparedKnowledge({ descriptor, subtle: webcrypto.subtle, readBytes: async path => { reads.push(path); return readFile(new URL(path, root)); } });
  assert.deepEqual(reads, [descriptor.path]); assert.equal(index.stats.recordCount, 410); assert.equal(index.stats.contentVersion, descriptor.contentVersion);
  assert.ok(index.search('указатели').length);
});

test('tamper одного байта и обрезанный пакет не проходят проверку целостности', async () => {
  const descriptor = manifest.indexes[0]; const bytes = await readFile(new URL(descriptor.path, root));
  const tampered = Uint8Array.from(bytes); tampered[100] ^= 1;
  for (const payload of [tampered, bytes.subarray(0, bytes.length - 1)]) await assert.rejects(loadPreparedKnowledge({ descriptor, subtle: webcrypto.subtle, readBytes: async () => payload }), /KNOWLEDGE_INTEGRITY_FAILED/);
});

test('loader отклоняет неправильную локаль/версию и URL до чтения ресурса', async () => {
  let calls = 0; const descriptor = manifest.indexes[0]; const readBytes = async () => { calls++; return readFile(new URL(descriptor.path, root)); };
  await assert.rejects(loadPreparedKnowledge({ descriptor: { ...descriptor, path: 'https://example.invalid/key' }, readBytes, subtle: webcrypto.subtle }), /INVALID_KNOWLEDGE_DESCRIPTOR/);
  assert.equal(calls, 0);
  await assert.rejects(loadPreparedKnowledge({ descriptor: { ...descriptor, contentVersion: 'wrong-version' }, readBytes, subtle: webcrypto.subtle }), /KNOWLEDGE_INTEGRITY_FAILED/);
});

test('неподготовленный ресурс и недоступная crypto дают безопасные коды', async () => {
  const descriptor = manifest.indexes[0];
  await assert.rejects(loadPreparedKnowledge({ descriptor, readBytes: async () => { throw new Error('synthetic private read detail'); }, subtle: webcrypto.subtle }), error => error.code === 'KNOWLEDGE_NOT_PREPARED' && !String(error).includes('private'));
  await assert.rejects(loadPreparedKnowledge({ descriptor, readBytes: async () => new Uint8Array(), subtle: null }), /CRYPTO_UNAVAILABLE/);
});

test('loader уважает отмену до чтения и после асинхронного чтения', async () => {
  const descriptor = manifest.indexes[0]; const early = new AbortController(); early.abort(); let reads = 0;
  await assert.rejects(loadPreparedKnowledge({ descriptor, signal: early.signal, subtle: webcrypto.subtle, readBytes: async () => { reads++; } }), /REQUEST_CANCELLED/); assert.equal(reads, 0);
  const late = new AbortController();
  await assert.rejects(loadPreparedKnowledge({ descriptor, signal: late.signal, subtle: webcrypto.subtle, readBytes: async path => { const bytes = await readFile(new URL(path, root)); late.abort(); return bytes; } }), /REQUEST_CANCELLED/);
});

test('неизвестная capability не отражает произвольную строку в error/result', async () => {
  const { core } = fixture(); const marker = 'synthetic.private.marker';
  const response = await core.invoke({ capability: marker });
  assert.equal(response.error.code, 'UNKNOWN_CAPABILITY'); assert.equal(response.capability, null); assert.equal(JSON.stringify(response).includes(marker), false);
});

test('подделка prototype CoreError не раскрывает секрет как error.code', async () => {
  const forged = Object.create(CoreError.prototype); Object.defineProperty(forged, 'code', { value: 'SYNTHETIC_PRIVATE_ERROR' });
  const { core } = fixture({ host: { authorize: () => { throw forged; } } });
  const response = await core.invoke({ capability: 'context.current' });
  assert.equal(response.error.code, 'OPERATION_FAILED'); assert.equal(JSON.stringify(response).includes('PRIVATE'), false);
});

test('plain model registry contract не обещает реальную модель: local mock явно маркирован generated/ungrounded', async () => {
  const { core } = fixture({ providers: [{ id: 'synthetic-local', kind: 'local', generate: async () => ({ text: 'Только тест протокола.' }) }], policy: { localModels: true } });
  const response = await core.invoke({ capability: 'model.generate', input: { providerId: 'synthetic-local', prompt: 'test' } });
  assert.equal(response.status, 'ok'); assert.equal(response.mode, 'local-model'); assert.equal(response.data.generated, true); assert.equal(response.data.grounded, false); assert.deepEqual(response.actions, []); assert.deepEqual(response.sources, []);
});
