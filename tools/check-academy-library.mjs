import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const courseSizes = {'cpp':67, 'c':59, 'onec':52, '1c-enterprise':32};
const accessKinds = new Set(['free', 'paid', 'subscription']);
const proficiencyLevels = new Set(['beginner', 'intermediate', 'advanced']);
const languages = new Set(['ru', 'en']);
const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const isText = value => typeof value === 'string' && value.trim().length > 0;
const isLocalized = value => isRecord(value) && isText(value.ru) && isText(value.en);
const readJson = file => readFile(path.join(root, file), 'utf8').then(JSON.parse);

function httpsUrl(value, base) {
  if (!isText(value) || value.trim() !== value) return null;
  if (!base && !/^https:\/\//i.test(value)) return null;
  try {
    const url = new URL(value, base);
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function validateCatalog(courseId, catalog, expectedIds) {
  const issues = [];
  const check = (condition, field, expectation) => {
    if (!condition) issues.push({field:courseId + '.' + field, expectation});
    return condition;
  };
  const counts = {courseId, topics:0, sources:0, readingRefs:0, videoRefs:0};
  const links = [];
  if (!check(isRecord(catalog), 'catalog', 'объект каталога')) return {counts, issues, links};
  check(catalog.schemaVersion === 1, 'schemaVersion', '1');
  check(catalog.courseId === courseId, 'courseId', courseId);
  const sources = check(isRecord(catalog.sources), 'sources', 'карта источников') ? catalog.sources : {};
  const topics = check(isRecord(catalog.topics), 'topics', 'карта тем курса') ? catalog.topics : {};
  counts.sources = Object.keys(sources).length;
  counts.topics = Object.keys(topics).length;

  for (const [id, source] of Object.entries(sources)) {
    const field = 'sources.' + id;
    check(isText(id) && id.trim() === id, field, 'идентификатор источника без крайних пробелов');
    if (!check(isRecord(source), field, 'объект источника')) continue;
    check(source.kind === 'reading' || source.kind === 'video', field + '.kind', 'reading или video');
    check(isText(source.title), field + '.title', 'название ресурса');
    check(isText(source.author), field + '.author', 'автор или редакция');
    if (check(Boolean(httpsUrl(source.url)), field + '.url', 'точный HTTPS-адрес без учётных данных')) {
      links.push({courseId, id, url:source.url});
    }
    check(languages.has(source.language), field + '.language', 'ru или en');
    check(accessKinds.has(source.access), field + '.access', 'free, paid или subscription');
    check(isCalendarDate(source.verifiedOn), field + '.verifiedOn', 'дата проверки ГГГГ-ММ-ДД');
    if (Object.hasOwn(source, 'note')) check(isLocalized(source.note), field + '.note', 'текст на RU и EN');
    if (source.kind === 'reading') {
      check(Number.isSafeInteger(source.year) && source.year > 0, field + '.year', 'положительный год издания');
      check(isText(source.edition), field + '.edition', 'обозначение издания или версии документа');
      check(!Object.hasOwn(source, 'durationSeconds') && !Object.hasOwn(source, 'level'), field, 'поля отчёта для чтения');
    } else if (source.kind === 'video') {
      check(Number.isFinite(source.durationSeconds) && source.durationSeconds > 0,
        field + '.durationSeconds', 'положительная продолжительность в секундах');
      check(proficiencyLevels.has(source.level), field + '.level', 'beginner, intermediate или advanced');
      check(!Object.hasOwn(source, 'year') && !Object.hasOwn(source, 'edition'), field, 'поля отчёта для видео');
    }
  }

  const expected = new Set(expectedIds);
  for (const id of expected) check(Object.hasOwn(topics, id), 'topics.' + id, 'тема присутствует в каталоге');
  for (const [topicId, topic] of Object.entries(topics)) {
    const field = 'topics.' + topicId;
    check(expected.has(topicId), field, 'ID из действующей программы курса');
    if (!check(isRecord(topic), field, 'объект материалов темы')) continue;
    const refs = new Set();
    for (const kind of ['reading', 'video']) {
      const items = topic[kind];
      if (!check(Array.isArray(items) && items.length > 0, field + '.' + kind, 'непустой список ресурсов')) continue;
      counts[kind === 'reading' ? 'readingRefs' : 'videoRefs'] += items.length;
      for (const [index, item] of items.entries()) {
        const itemField = field + '.' + kind + '[' + index + ']';
        if (!check(isRecord(item), itemField, 'ссылка на источник')) continue;
        if (!check(isText(item.id), itemField + '.id', 'ID источника')) continue;
        check(!refs.has(item.id), itemField + '.id', 'уникальная ссылка в пределах темы');
        refs.add(item.id);
        const source = Object.hasOwn(sources, item.id) ? sources[item.id] : null;
        check(isRecord(source) && source.kind === kind, itemField + '.id', 'разрешённый источник типа ' + kind);
        check(isLocalized(item.benefit), itemField + '.benefit', 'польза для учащегося на RU и EN');
        if (kind === 'reading') {
          check(isLocalized(item.section), itemField + '.section', 'раздел или глава на RU и EN');
          check(!Object.hasOwn(item, 'startSeconds'), itemField, 'раздел для чтения');
        } else if (Object.hasOwn(item, 'startSeconds')) {
          check(Number.isSafeInteger(item.startSeconds) && item.startSeconds >= 0 && item.startSeconds < source?.durationSeconds,
            itemField + '.startSeconds', 'отметка внутри видео в целых секундах');
        }
      }
    }
  }
  return {counts, issues, links};
}

async function curriculumIds(courseId) {
  const curriculum = await readJson('courses/' + courseId + '/curriculum.json');
  const topics = courseId === 'cpp' ? curriculum.lessons : curriculum.modules.flatMap(module => module.topics);
  const ids = topics.map(topic => topic.topicId ?? topic.id);
  if (ids.length !== courseSizes[courseId] || new Set(ids).size !== ids.length || !ids.every(isText)) {
    throw new Error('Неверный набор тем в действующей программе ' + courseId);
  }
  return ids;
}

async function checkLink(link) {
  const signal = AbortSignal.timeout(8_000);
  let url = httpsUrl(link.url);
  let method = 'HEAD';
  try {
    for (let attempt = 0; attempt < 7; attempt++) {
      const response = await fetch(url, {method, redirect:'manual', signal});
      await response.body?.cancel();
      const {status} = response;
      if (method === 'HEAD' && (status === 405 || status === 501)) {
        method = 'GET';
        continue;
      }
      if ([301, 302, 303, 307, 308].includes(status)) {
        const redirect = httpsUrl(response.headers.get('location'), url);
        if (!redirect) return {link, result:'redirect-unconfirmed', status};
        url = redirect;
        continue;
      }
      if (response.ok) return {link, result:'http-response', status};
      if (status === 404 || status === 410) return {link, result:'not-found', status};
      if (status === 401 || status === 403 || status === 451) return {link, result:'access-unconfirmed', status};
      return {link, result:'http-unconfirmed', status};
    }
    return {link, result:'too-many-redirects'};
  } catch {
    return {link, result:'network-unconfirmed'};
  }
}

export async function checkLinks(links) {
  const unique = [...new Map(links.map(link => [link.url, link])).values()];
  const results = [];
  for (let index = 0; index < unique.length; index += 6) {
    results.push(...await Promise.all(unique.slice(index, index + 6).map(checkLink)));
  }
  const unconfirmed = results.filter(result => result.result !== 'http-response');
  return {
    total:results.length,
    httpResponses:results.length - unconfirmed.length,
    unconfirmed:unconfirmed.map(({link, ...detail}) => ({courseId:link.courseId, id:link.id, ...detail})),
    scope:'HTTP-ответ по указанному URL. Содержание, стоимость и подписка этим не подтверждаются.',
  };
}

async function main(args) {
  if (args.some(arg => arg !== '--links')) throw new Error('Использование: node tools/check-academy-library.mjs [--links]');
  const courses = await Promise.all(Object.keys(courseSizes).map(async courseId => {
    const ids = await curriculumIds(courseId);
    const catalog = await readJson('courses/academy-library/' + courseId + '.json');
    return validateCatalog(courseId, catalog, ids);
  }));
  const issues = courses.flatMap(course => course.issues);
  if (issues.length) {
    console.error(JSON.stringify({status:'FAIL', issues}, null, 2));
    process.exitCode = 1;
    return;
  }
  const links = args.includes('--links') ? await checkLinks(courses.flatMap(course => course.links)) : null;
  console.log(JSON.stringify({
    status:links?.unconfirmed.length ? 'PASS_WITH_LINK_WARNINGS' : 'PASS',
    topics:courses.reduce((total, course) => total + course.counts.topics, 0),
    courses:courses.map(course => course.counts),
    ...(links ? {links} : {}),
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
