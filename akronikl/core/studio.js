import { record, field, list, id, text, safePath, LIMITS, freeze, fail } from './contracts.js';

// Снимок соответствует Code Studio getSnapshot()/code-workspace.snapshot().
// Передать диапазон обязан пользовательский host; весь файл автоматически не выбирается.
export function selectionFromCodeStudio(snapshot, { filePath, startOffset, endOffset } = {}) {
  record(snapshot, 'INVALID_STUDIO_SNAPSHOT');
  const path = safePath(filePath), revision = field(snapshot, 'revision');
  if (!Number.isSafeInteger(revision) || revision < 0) fail('INVALID_SELECTION_REVISION');
  const files = list(field(snapshot, 'files'), 128, 'INVALID_STUDIO_SNAPSHOT');
  const matches = files.filter(file => { record(file, 'INVALID_STUDIO_SNAPSHOT'); return field(file, 'path') === path; });
  if (matches.length !== 1) fail('INVALID_STUDIO_SNAPSHOT');
  const file = matches[0], source = text(field(file, 'content'), 2000000, 'INVALID_STUDIO_SNAPSHOT', { empty: true });
  if (!Number.isSafeInteger(startOffset) || !Number.isSafeInteger(endOffset) || startOffset < 0 || endOffset <= startOffset || endOffset > source.length) fail('INVALID_SELECTION_RANGE');
  const code = text(source.slice(startOffset, endOffset), LIMITS.code, 'SELECTION_TOO_LARGE');
  return freeze({ filePath: path, languageId: id(field(file, 'languageId') ?? field(snapshot, 'languageId')), revision, code, startLine: source.slice(0, startOffset).split('\n').length, endLine: source.slice(0, endOffset).split('\n').length });
}

// Принимается DTO настоящего parseRuntimeError, привязанный host к ревизии запуска.
// Ограничение провайдера не выдаётся за ошибку исходного кода обучающегося.
export function diagnosticFromNexus(diagnostic, { selection, runRevision } = {}) {
  record(diagnostic, 'INVALID_DIAGNOSTICS'); record(selection, 'INVALID_SELECTION');
  if (!Number.isSafeInteger(runRevision) || runRevision < 0 || runRevision !== field(selection, 'revision')) fail('STALE_DIAGNOSTICS');
  if (field(diagnostic, 'providerLimit') === true) fail('INVALID_DIAGNOSTICS');
  const filePath = safePath(field(diagnostic, 'file'));
  if (filePath !== field(selection, 'filePath')) fail('STALE_DIAGNOSTICS');
  const compiler = field(diagnostic, 'compilerDiagnostic') === true;
  let message, severity = 'error';
  if (compiler) {
    const raw = text(field(diagnostic, 'raw'), 100000, 'INVALID_DIAGNOSTICS');
    const expectedLine = field(diagnostic, 'line'), expectedColumn = field(diagnostic, 'column');
    const primary = raw.split('\n').map(line => /^(.+?):(\d+):(\d+):\s*(warning|error|fatal\s+error):\s*(.+)$/i.exec(line)).find(match => match && match[1].replace(/^\.\//, '') === filePath && (expectedLine == null || Number(match[2]) === expectedLine) && (expectedColumn == null || Number(match[3]) === expectedColumn));
    if (!primary) fail('INVALID_DIAGNOSTICS');
    message = primary[0].slice(0, LIMITS.diagnosticMessage);
    severity = primary[4].toLowerCase() === 'warning' ? 'warning' : 'error';
  } else message = text(field(diagnostic, 'explanation'), LIMITS.diagnosticMessage, 'INVALID_DIAGNOSTICS');
  const entry = { source: compiler ? 'compiler' : 'runtime', severity, message, filePath, revision: runRevision };
  for (const key of ['line', 'column']) {
    const value = field(diagnostic, key);
    if (value != null) {
      if (!Number.isSafeInteger(value) || value < 1 || value > 1000000) fail('INVALID_DIAGNOSTICS');
      entry[key] = value;
    }
  }
  return freeze(entry);
}
