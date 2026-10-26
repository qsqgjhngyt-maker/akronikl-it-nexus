import { SCHEMA_VERSION, LIMITS, record, field, id, locale, text, safePath, freeze, normalizeInclude, list, fail } from './contracts.js';

const VIEWS = new Set(['home', 'akronikl', 'academy', 'programming', 'code-studio', 'projects', 'project-studio', 'lesson', 'practicum']);

export function normalizeRoute(raw = {}) {
  record(raw, 'INVALID_ROUTE');
  const view = field(raw, 'view') ?? 'home';
  if (!VIEWS.has(view)) fail('UNSUPPORTED_ROUTE');
  const route = { view, courseId: id(field(raw, 'courseId'), { nullable: true }), lessonId: id(field(raw, 'lessonId'), { nullable: true }), projectId: id(field(raw, 'projectId'), { nullable: true }), taskId: id(field(raw, 'taskId'), { nullable: true }) };
  if (route.lessonId && !route.courseId) fail('INVALID_ROUTE');
  return freeze(route);
}

function selectionSnapshot(raw) {
  record(raw, 'INVALID_SELECTION');
  const revision = field(raw, 'revision');
  if (!Number.isSafeInteger(revision) || revision < 0) fail('INVALID_SELECTION_REVISION');
  const output = { filePath: safePath(field(raw, 'filePath')), languageId: id(field(raw, 'languageId')), revision, code: text(field(raw, 'code'), LIMITS.code, 'SELECTION_TOO_LARGE', { empty: true }) };
  const start = field(raw, 'startLine'), end = field(raw, 'endLine');
  if (start !== undefined || end !== undefined) {
    if (!Number.isSafeInteger(start) || start < 1 || !Number.isSafeInteger(end) || end < start || end > 1000000) fail('INVALID_SELECTION_RANGE');
    output.startLine = start; output.endLine = end;
  }
  return output;
}

function diagnosticSnapshots(items, selection) {
  const values = list(items, LIMITS.diagnostics, 'INVALID_DIAGNOSTICS');
  // Без выбранного актуального файла невозможно доказать принадлежность диагностики.
  if (values.length && !selection) fail('DIAGNOSTICS_REQUIRE_SELECTION');
  return values.map(item => {
    record(item, 'INVALID_DIAGNOSTICS');
    const source = field(item, 'source'), severity = field(item, 'severity');
    if (!['compiler', 'runtime', 'static-analysis'].includes(source) || !['error', 'warning', 'info'].includes(severity)) fail('INVALID_DIAGNOSTICS');
    const revision = field(item, 'revision'), filePath = safePath(field(item, 'filePath'));
    if (revision !== selection.revision || filePath !== selection.filePath) fail('STALE_DIAGNOSTICS');
    const entry = { source, severity, filePath, revision, message: text(field(item, 'message'), LIMITS.diagnosticMessage, 'DIAGNOSTIC_TOO_LARGE') };
    for (const key of ['line', 'column']) {
      const value = field(item, key);
      if (value !== undefined) {
        if (!Number.isSafeInteger(value) || value < 1 || value > 1000000) fail('INVALID_DIAGNOSTICS');
        entry[key] = value;
      }
    }
    return entry;
  });
}

export function createContextSnapshot(raw, { include = [] } = {}) {
  record(raw, 'CONTEXT_UNAVAILABLE');
  const selected = normalizeInclude(include);
  if (selected.includes('diagnostics') && !selected.includes('selection')) fail('DIAGNOSTICS_REQUIRE_SELECTION');
  const output = { schemaVersion: SCHEMA_VERSION, locale: locale(field(raw, 'locale') ?? 'ru'), courseLocale: locale(field(raw, 'courseLocale') ?? field(raw, 'locale') ?? 'ru'), route: normalizeRoute(field(raw, 'route') ?? {}) };
  const learning = field(raw, 'learning');
  if (learning != null) {
    record(learning, 'INVALID_LEARNING_CONTEXT');
    if (field(learning, 'courseId') !== output.route.courseId || field(learning, 'lessonId') !== output.route.lessonId) fail('STALE_LEARNING_CONTEXT');
    output.learning = { courseId: output.route.courseId, lessonId: output.route.lessonId, sectionId: id(field(learning, 'sectionId'), { nullable: true }) };
  }
  if (selected.includes('selection') && field(raw, 'selection') != null) output.selection = selectionSnapshot(field(raw, 'selection'));
  if (selected.includes('diagnostics')) output.diagnostics = diagnosticSnapshots(field(raw, 'diagnostics') ?? [], output.selection);
  return freeze(output);
}

// Доверенный host передаёт текущий маршрут, жизненный цикл и выбранный редактор.
// Legacy singleton не используется как источник кода, stdout/stderr или полномочий.
export function routeFromNexus(raw) {
  record(raw, 'INVALID_ROUTE');
  const pick = (canonical, legacy) => {
    const a = field(raw, canonical), b = field(raw, legacy);
    if (a != null && b != null && a !== b) fail('INVALID_ROUTE');
    return a ?? b ?? null;
  };
  const lessonId = pick('lessonId', 'lesson'), courseId = pick('courseId', 'course');
  const practicum = field(raw, 'practicum');
  return normalizeRoute({ view: lessonId ? 'lesson' : practicum ? 'practicum' : field(raw, 'view') ?? 'home', courseId, lessonId, projectId: pick('projectId', 'project'), taskId: field(raw, 'taskId') ?? null });
}

export function createNexusContextAdapter({ readBoundary, readRoute, readLegacyContext = () => null, readSelection = () => null, readDiagnostics = () => [], readLocale = () => 'ru', readCourseLocale = readLocale, authorize = () => false } = {}) {
  if (typeof readBoundary !== 'function' || typeof readRoute !== 'function' || [readLegacyContext, readSelection, readDiagnostics, readLocale, readCourseLocale, authorize].some(fn => typeof fn !== 'function')) fail('INVALID_HOST_ADAPTER');
  return Object.freeze({
    readBoundary,
    authorize,
    readContext({ include = [] } = {}) {
      const before = readBoundary();
      if (!before || typeof before !== 'object') fail('CONTEXT_UNAVAILABLE');
      const route = routeFromNexus(readRoute());
      const currentLocale = locale(readLocale());
      const legacy = readLegacyContext();
      let learning;
      if (legacy != null) {
        record(legacy, 'INVALID_LEGACY_CONTEXT');
        if (route.lessonId && field(legacy, 'courseId') === route.courseId && field(legacy, 'lessonId') === route.lessonId) learning = { courseId: route.courseId, lessonId: route.lessonId, sectionId: field(legacy, 'sectionId') ?? null };
      }
      const chosen = normalizeInclude(include);
      const raw = { locale: currentLocale, courseLocale: locale(readCourseLocale()), route, ...(learning ? { learning } : {}) };
      if (chosen.includes('selection')) raw.selection = readSelection();
      if (chosen.includes('diagnostics')) raw.diagnostics = readDiagnostics();
      if (readBoundary() !== before) fail('CONTEXT_CHANGED');
      return createContextSnapshot(raw, { include: chosen });
    }
  });
}
