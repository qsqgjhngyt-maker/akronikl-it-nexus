import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import test from 'node:test';

const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const manifest = read('courses/c/manifest.json');
const curriculum = read('courses/c/curriculum.json');
const locales = ['ru', 'en'];
const text = value => typeof value === 'string' && value.trim().length > 0;

test('Шесть модулей C доступны, остальные помечены как запланированные', () => {
  assert.equal(manifest.id, 'c');
  assert.equal(manifest.languageId, 'c');
  assert.equal(manifest.standard, 'C17');
  assert.deepEqual(manifest.availableLocales, locales);
  assert.deepEqual(manifest.availableModuleIds, ['c.m1', 'c.m2', 'c.m3', 'c.m4', 'c.m5', 'c.m6']);
  const modules = curriculum.modules;
  assert.ok(modules.length > 1);
  assert.equal(new Set(modules.map(module => module.id)).size, modules.length);
  const topics = modules.flatMap(module => module.topics);
  assert.equal(new Set(topics.map(topic => topic.id)).size, topics.length);
  for (const module of modules) {
    assert.equal(module.status, manifest.availableModuleIds.includes(module.id) ? 'implemented' : 'planned');
    for (const topic of module.topics) {
      assert.equal(topic.status, module.status);
      for (const locale of locales) assert.ok(text(topic.title[locale]), topic.id);
    }
    for (const locale of locales) {
      assert.ok(text(module.title[locale]), module.id);
      assert.ok(module.goals[locale].length > 0, module.id);
      assert.ok(text(module.practice[locale]), module.id);
      assert.ok(text(module.completion[locale]), module.id);
    }
  }
  assert.equal(manifest.availableTopicIds.length, 32);
  assert.equal(curriculum.availableModuleCount, 6);
  assert.equal(curriculum.availableTopicCount, 32);
  assert.deepEqual(manifest.availableTopicIds.slice(9, 14), [
    'c.read-input', 'c.conditions', 'c.counted-loops', 'c.sentinel-loops', 'c.guard-boundaries',
  ]);
  assert.deepEqual(manifest.availableTopicIds.slice(14, 19), [
    'c.functions', 'c.parameters', 'c.scope', 'c.function-test-cases', 'c.function-project',
  ]);
  assert.deepEqual(manifest.availableTopicIds.slice(19, 23), [
    'c.array-bounds', 'c.array-parameters', 'c.array-statistics', 'c.array-sort',
  ]);
  assert.deepEqual(manifest.availableTopicIds.slice(23, 27), [
    'c.null-terminated-strings', 'c.line-input', 'c.string-library', 'c.text-project',
  ]);
  assert.deepEqual(manifest.availableTopicIds.slice(27), [
    'c.addresses-and-pointers', 'c.pointer-arrays', 'c.pointer-parameters', 'c.const-and-null', 'c.pointer-lifetime-errors',
  ]);
  assert.equal(modules.find(module => module.id === 'c.m5').project.status, 'implemented');
  assert.equal(modules.find(module => module.id === 'c.m3').project.status, 'implemented');
  assert.deepEqual(topics.filter(topic => topic.status === 'implemented').map(topic => topic.id), manifest.availableTopicIds);
  const filenames = manifest.availableTopicIds.flatMap(id => locales.map(locale => id + '.' + locale + '.json'));
  assert.deepEqual(readdirSync(new URL('../courses/c/lessons/', import.meta.url)).sort(), filenames.sort());
});

test('Академия и Code Hub открывают тот же курс C', () => {
  const catalog = read('courses/catalog.json');
  const hub = read('courses/programming/languages.json');
  assert.equal(catalog.count, catalog.courses.length);
  for (const entries of [catalog.courses, hub.tracks]) {
    assert.equal(entries.filter(entry => entry.id === 'c').length, 1);
    const entry = entries.find(entry => entry.id === 'c');
    assert.equal(entry.status, 'available-alpha');
    assert.equal(entry.route, '#course=c');
  }
});

function executable(lesson) {
  return {
    examples: lesson.sections.flatMap(section => section.code ? [section.code] : []),
    files: lesson.practice.files,
    input: lesson.practice.stdin,
    cases: lesson.practice.cases.map(({input, output, stderr, exitCode}) => ({input, output, stderr, exitCode})),
    solution: lesson.practice.referenceSolution,
    diagnostics: lesson.diagnosticExercises ?? [],
  };
}

for (const id of manifest.availableTopicIds) {
  test('RU/EN и исполняемые материалы ' + id, () => {
    const editions = locales.map(locale => read('courses/c/lessons/' + id + '.' + locale + '.json'));
    for (const [index, lesson] of editions.entries()) {
      assert.equal(lesson.id, id);
      assert.equal(lesson.courseId, 'c');
      const module = curriculum.modules.find(module => module.topics.some(topic => topic.id === id));
      assert.equal(lesson.moduleId, module.id);
      assert.equal(lesson.locale, locales[index]);
      assert.equal(lesson.title, module.topics.find(topic => topic.id === id).title[lesson.locale]);
      assert.ok(text(lesson.goal));
      assert.ok(lesson.terms.length >= 2);
      assert.ok(lesson.reading.length > 0);
      assert.equal(new Set(lesson.sections.map(section => section.id)).size, lesson.sections.length);
      const example = lesson.sections.find(section => section.code);
      assert.ok(text(example?.code?.source));
      assert.equal(example.code.language, 'c');
      assert.equal(typeof example.code.output, 'string');
      assert.ok(example.steps.length > 0);
      assert.ok(example.trace.length > 0);
      assert.ok(lesson.selfcheck.length >= 3);
      assert.ok(lesson.selfcheck.some(question => question.kind === 'free'));
      for (const question of lesson.selfcheck.filter(question => question.kind === 'choice')) {
        assert.ok(question.options.length >= 2);
        assert.ok(question.correct >= 0 && question.correct < question.options.length);
        assert.equal(question.feedback.length, question.options.length);
      }
      const practice = lesson.practice;
      assert.equal(practice.kind, 'c-console');
      assert.deepEqual(practice.metadata, {entryFile:'main.c', languageId:'c', standard:'C17'});
      const starter = practice.files.find(file => file.path === 'main.c')?.content;
      assert.ok(text(starter));
      assert.ok(text(practice.referenceSolution.source));
      assert.notEqual(starter, practice.referenceSolution.source);
      assert.notEqual(example.code.source, practice.referenceSolution.source);
      assert.ok(text(practice.task) && text(practice.hint));
      assert.ok(practice.steps.length > 0 && practice.criteria.length > 0);
      assert.ok(practice.cases.length > 0);
      for (const item of practice.cases) {
        assert.ok(text(item.label));
        assert.equal(typeof item.input, 'string');
        assert.equal(typeof item.output, 'string');
      }
    }
    assert.deepEqual(executable(editions[0]), executable(editions[1]));
  });
}
