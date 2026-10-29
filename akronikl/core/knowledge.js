// AKRONIKL-0: локальный поиск по подготовленным публичным материалам Nexus.
// Модуль не читает DOM/storage и не выполняет сеть, навигацию или текст источников.
export const KNOWLEDGE_LIMITS = Object.freeze({
  records: 900, textChars: 4000, totalTextChars: 1500000,
  queryChars: 2000, queryTerms: 24, results: 10
});

const locales = new Set(['ru', 'en']);
const sections = new Set(['overview', 'theory', 'glossary']);
const modules = new Set([
  'cpp.section.algorithms', 'cpp.section.cpp-basics',
  'cpp.section.structured-programming', 'cpp.section.classic-algorithms',
  'cpp.section.oop', 'cpp.section.visual-programming'
]);
const lessonPattern = /^cpp\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const controls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const stopwords = new Set(('а без в во для до и из или как к ко на о об от по при с со у что это ' +
  'the a an and or to of in on at is are with how what').split(' '));

function fail(code) {
  const error = new TypeError(code);
  error.code = code;
  throw error;
}
function object(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const names = Reflect.ownKeys(descriptors);
  if (names.length !== keys.length || names.some(key => !keys.includes(key))) fail(code);
  if (names.some(key => !Object.hasOwn(descriptors[key], 'value'))) fail(code);
}
function text(value, max, code) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || controls.test(value)) fail(code);
  return value;
}
function locale(value) {
  if (!locales.has(value)) fail('KNOWLEDGE_LOCALE_INVALID');
  return value;
}
function normalized(value) {
  return value.normalize('NFKC').toLowerCase().replace(/ё/g, 'е');
}
function stem(value) {
  // Консервативное совпадение словоформ; это лексический поиск, не модель языка.
  if (/^[а-я]{5,}$/.test(value)) return value.replace(/(иями|ями|ами|ией|ого|ему|ому|ими|ыми|его|ов|ев|ам|ям|ах|ях|ой|ый|ий|ая|яя|ое|ее|ые|ие|ую|юю|а|я|ы|и|у|ю|е|о)$/, '').replace(/ь$/, '');
  if (/^[a-z]{5,}s$/.test(value) && !value.endsWith('ss')) return value.slice(0, -1);
  return value;
}
function words(value) {
  return normalized(value).match(/[\p{L}\p{N}]+(?:\+\+|#)?/gu) || [];
}
function terms(value) {
  return [...new Set(words(value).filter(word => word.length > 1 && !stopwords.has(word)).map(stem))];
}
function freezeRecord(record, score) {
  const result = {...record, route: Object.freeze({...record.route})};
  if (score !== undefined) result.score = score;
  return Object.freeze(result);
}
function copyRecord(raw, bundleLocale) {
  object(raw, ['sourceId', 'courseId', 'lessonId', 'moduleId', 'locale', 'title', 'section', 'text', 'sourcePath', 'contentHash', 'route'], 'KNOWLEDGE_RECORD_INVALID');
  if (raw.courseId !== 'cpp' || !lessonPattern.test(text(raw.lessonId, 120, 'KNOWLEDGE_LESSON_INVALID'))) fail('KNOWLEDGE_LESSON_INVALID');
  if (!modules.has(raw.moduleId)) fail('KNOWLEDGE_MODULE_INVALID');
  if (locale(raw.locale) !== bundleLocale) fail('KNOWLEDGE_LOCALE_MISMATCH');
  if (!sections.has(raw.section)) fail('KNOWLEDGE_SECTION_INVALID');
  const sourceId = text(raw.sourceId, 240, 'KNOWLEDGE_SOURCE_INVALID');
  const idPrefix = `nexus:cpp:${raw.lessonId}:`;
  const idSuffix = `:${raw.locale}`;
  if (!sourceId.startsWith(idPrefix) || !sourceId.endsWith(idSuffix)) fail('KNOWLEDGE_SOURCE_INVALID');
  const part = sourceId.slice(idPrefix.length, -idSuffix.length);
  if (!(part === raw.section || (raw.section === 'theory' && /^theory-[1-9]\d{0,2}$/.test(part)))) fail('KNOWLEDGE_SOURCE_INVALID');
  const sourcePath = text(raw.sourcePath, 200, 'KNOWLEDGE_PATH_INVALID');
  const gold = /^courses\/cpp\/gold\/(algorithms|basics|structured|classic|oop|events)\/([a-z0-9-]+)\.(ru|en)\.json$/.exec(sourcePath);
  const baselinePath = `courses/cpp/data/lessons.${raw.locale}.json`;
  if (gold) {
    if (`cpp.${gold[2]}` !== raw.lessonId || gold[3] !== raw.locale) fail('KNOWLEDGE_PATH_INVALID');
    const expectedModules = {algorithms: 'cpp.section.algorithms', basics: 'cpp.section.cpp-basics', structured: 'cpp.section.structured-programming', classic: 'cpp.section.classic-algorithms', oop: 'cpp.section.oop', events: 'cpp.section.visual-programming'};
    if (expectedModules[gold[1]] !== raw.moduleId) fail('KNOWLEDGE_MODULE_INVALID');
  } else if (sourcePath !== baselinePath && sourcePath !== 'courses/cpp/curriculum.json') fail('KNOWLEDGE_PATH_INVALID');
  if (typeof raw.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(raw.contentHash)) fail('KNOWLEDGE_HASH_INVALID');
  object(raw.route, ['courseId', 'lessonId'], 'KNOWLEDGE_ROUTE_INVALID');
  if (raw.route.courseId !== 'cpp' || raw.route.lessonId !== raw.lessonId) fail('KNOWLEDGE_ROUTE_INVALID');
  return freezeRecord({
    sourceId, courseId: 'cpp', lessonId: raw.lessonId, moduleId: raw.moduleId,
    locale: raw.locale, title: text(raw.title, 240, 'KNOWLEDGE_TITLE_INVALID'),
    section: raw.section, text: text(raw.text, KNOWLEDGE_LIMITS.textChars, 'KNOWLEDGE_TEXT_INVALID'),
    sourcePath, contentHash: raw.contentHash, route: {courseId: 'cpp', lessonId: raw.lessonId}
  });
}

/**
 * Подготовленный JSON — доверенный источник публичных данных приложения.
 * Проверка схемы не заменяет проверку целостности пакета при его подготовке.
 */
export function createKnowledgeIndex(bundle) {
  object(bundle, ['schemaVersion', 'id', 'locale', 'contentVersion', 'records'], 'KNOWLEDGE_BUNDLE_INVALID');
  if (bundle.schemaVersion !== 1) fail('KNOWLEDGE_VERSION_UNSUPPORTED');
  if (typeof bundle.id !== 'string' || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(bundle.id)) fail('KNOWLEDGE_ID_INVALID');
  const bundleLocale = locale(bundle.locale);
  const contentVersion = text(bundle.contentVersion, 128, 'KNOWLEDGE_CONTENT_VERSION_INVALID');
  if (!Array.isArray(bundle.records) || !bundle.records.length || bundle.records.length > KNOWLEDGE_LIMITS.records) fail('KNOWLEDGE_RECORDS_INVALID');
  if (Reflect.ownKeys(bundle.records).length !== bundle.records.length + 1) fail('KNOWLEDGE_RECORDS_INVALID');
  const ids = new Set();
  let totalTextChars = 0;
  const records = [];
  for (let i = 0; i < bundle.records.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(bundle.records, String(i));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) fail('KNOWLEDGE_RECORDS_INVALID');
    const record = copyRecord(descriptor.value, bundleLocale);
    if (ids.has(record.sourceId)) fail('KNOWLEDGE_SOURCE_DUPLICATE');
    ids.add(record.sourceId);
    totalTextChars += record.text.length;
    if (totalTextChars > KNOWLEDGE_LIMITS.totalTextChars) fail('KNOWLEDGE_SIZE_EXCEEDED');
    records.push(freezeRecord({...record, contentVersion}));
  }
  records.sort((a, b) => a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0);
  const documents = records.map(record => ({
    record, title: normalized(record.title), body: normalized(record.text),
    titleTerms: new Set(terms(record.title)), bodyTerms: new Set(terms(record.text))
  }));
  const stats = Object.freeze({
    schemaVersion: 1, id: bundle.id, locale: bundleLocale, contentVersion,
    recordCount: records.length, lessonCount: new Set(records.map(r => r.lessonId)).size,
    sourceFileCount: new Set(records.map(r => r.sourcePath)).size, textChars: totalTextChars
  });
  return Object.freeze({
    stats,
    search(query, options = {}) {
      const descriptors = options && typeof options === 'object' && !Array.isArray(options) ? Object.getOwnPropertyDescriptors(options) : null;
      if (!descriptors || ![Object.prototype, null].includes(Object.getPrototypeOf(options)) || Reflect.ownKeys(descriptors).some(key => !['locale', 'limit'].includes(key) || !Object.hasOwn(descriptors[key], 'value'))) fail('KNOWLEDGE_SEARCH_OPTIONS_INVALID');
      const requestedLocale = locale(descriptors.locale?.value ?? bundleLocale);
      const limit = descriptors.limit?.value ?? 5;
      if (!Number.isInteger(limit) || limit < 1 || limit > KNOWLEDGE_LIMITS.results) fail('KNOWLEDGE_LIMIT_INVALID');
      if (typeof query !== 'string' || query.length > KNOWLEDGE_LIMITS.queryChars || controls.test(query)) fail('KNOWLEDGE_QUERY_INVALID');
      const queryTerms = terms(query);
      if (queryTerms.length > KNOWLEDGE_LIMITS.queryTerms) fail('KNOWLEDGE_QUERY_TOO_MANY_TERMS');
      if (requestedLocale !== bundleLocale || !queryTerms.length) return Object.freeze([]);
      const phrase = normalized(query).trim();
      const matches = [];
      for (const doc of documents) {
        let score = 0;
        for (const term of queryTerms) {
          if (doc.titleTerms.has(term)) score += 30;
          else if (doc.bodyTerms.has(term)) score += 5;
          else { score = 0; break; }
        }
        if (!score) continue;
        if (doc.title.includes(phrase)) score += 60;
        if (doc.body.includes(phrase)) score += 10;
        if (doc.record.section === 'overview') score += 1;
        matches.push({record: doc.record, score});
      }
      matches.sort((a, b) => b.score - a.score || (a.record.sourceId < b.record.sourceId ? -1 : 1));
      return Object.freeze(matches.slice(0, limit).map(match => freezeRecord(match.record, match.score)));
    },
    getLesson(lessonId, requestedLocale = bundleLocale) {
      if (typeof lessonId !== 'string' || lessonId.length > 120 || !lessonPattern.test(lessonId)) fail('KNOWLEDGE_LESSON_INVALID');
      if (locale(requestedLocale) !== bundleLocale) return Object.freeze([]);
      return Object.freeze(records.filter(record => record.lessonId === lessonId)
        .sort((a, b) => (a.section === 'overview' ? -1 : 0) - (b.section === 'overview' ? -1 : 0))
        .map(record => freezeRecord(record)));
    },
    getSources() { return Object.freeze(records.map(record => freezeRecord(record))); }
  });
}
