import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync, readdirSync} from 'node:fs';

const base = process.argv[2];
assert.match(base ?? '', /^[a-f0-9]{40}$/, 'Provide the verified baseline SHA');
const directory = 'courses/c/lessons/';
const files = readdirSync(directory).filter(name => /\.(ru|en)\.json$/.test(name));
assert.equal(files.length, 118);
const focusByLesson = new Map();
const authored = new Set();

function addField(value, label) {
  assert.ok(typeof value === 'string' && value.trim().length >= 16, label);
  assert.ok(!authored.has(value), label + ' repeats another teaching field');
  authored.add(value);
}

for (const file of files) {
  const path = directory + file;
  const previous = JSON.parse(execFileSync('git', ['show', base + ':' + path], {encoding:'utf8'}));
  const {teaching, ...current} = JSON.parse(readFileSync(path, 'utf8'));
  assert.ok(teaching, path);
  for (const value of [teaching.scene, teaching.predict.prompt, teaching.predict.answer, teaching.apply.prompt,
    teaching.apply.answer, teaching.practice.strategy, teaching.practice.diagnosis,
    teaching.syntax.explanation, teaching.syntax.mistake]) addField(value, path);
  assert.ok(current.terms.some(term => term.id === teaching.syntax.termId), path + ' unknown syntax term');
  assert.ok(teaching.syntax.form.trim() && teaching.syntax.example.trim(), path + ' syntax sample');
  assert.ok(teaching.focus.trim() && current.sections.find(section => section.code).code.source.includes(teaching.focus),
    path + ' fragment must be contiguous and present in the original example');
  if (focusByLesson.has(current.id)) assert.equal(teaching.focus, focusByLesson.get(current.id), path);
  else focusByLesson.set(current.id, teaching.focus);

  // Existing explanations retain their paragraphs and order. Only new paragraphs may be inserted.
  const sections = current.sections.map((section, index) => {
    const original = previous.sections[index]?.paragraphs;
    if (!original) return section;
    let next = 0;
    for (const paragraph of section.paragraphs) if (paragraph === original[next]) next++;
    assert.equal(next, original.length, path + ' lost an original explanation');
    return {...section, paragraphs:original};
  });
  assert.deepEqual({...current, sections}, previous, path + ' changed an existing lesson contract');
}

assert.equal(focusByLesson.size, 59);
console.log(JSON.stringify({status:'PASS',courses:1,lessons:59,editions:files.length,distinctTeachingFields:authored.size,base}));
