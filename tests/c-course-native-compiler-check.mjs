import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const course = new URL('../courses/c/', import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, course), 'utf8'));
const manifest = read('manifest.json');
const compiler = process.argv[2] ?? 'clang';
const workspace = mkdtempSync(join(tmpdir(), 'nexus-c17-'));
const sourceFile = join(workspace, 'main.c');
const executable = join(workspace, process.platform === 'win32' ? 'program.exe' : 'program');
const totals = {editions: 0, examples: 0, practiceCases: 0, rejectedBuilds: 0};

function execute(command, args, input = '') {
  const result = spawnSync(command, args, {cwd: workspace, input, encoding: 'utf8', timeout: 10_000});
  assert.ifError(result.error);
  return result;
}

function build(source, strict = true) {
  writeFileSync(sourceFile, source);
  const flags = ['-std=c17', '-Wall', '-Wextra', '-Wpedantic'];
  if (strict) flags.push('-Werror');
  return execute(compiler, [...flags, sourceFile, '-o', executable]);
}

function compareRun(expectation, input, context) {
  const result = execute(executable, [], input);
  assert.equal(result.status, expectation.exitCode, context + ' / exit status');
  assert.equal(result.stdout, expectation.output, context + ' / stdout');
  assert.equal(result.stderr, expectation.stderr, context + ' / stderr');
}

function checkEdition(lesson) {
  const edition = lesson.id + ' / ' + lesson.locale;
  for (const section of lesson.sections.filter(section => section.code)) {
    const {code} = section;
    const context = edition + ' / ' + section.id;
    const result = build(code.source);
    assert.equal(result.status, 0, context + ' / compilation\n' + result.stderr);
    compareRun(code, code.stdin, context);
    totals.examples++;
  }

  const starter = lesson.practice.files.find(file => file.path === 'main.c').content;
  const diagnostics = lesson.diagnosticExercises ?? [];
  if (!diagnostics.some(diagnostic => diagnostic.source === starter)) {
    const result = build(starter, false);
    assert.equal(result.status, 0, edition + ' / starter compilation\n' + result.stderr);
  }

  const reference = build(lesson.practice.referenceSolution.source);
  assert.equal(reference.status, 0, edition + ' / reference compilation\n' + reference.stderr);
  for (const example of lesson.practice.cases) {
    compareRun(example, example.input, edition + ' / ' + example.label);
    totals.practiceCases++;
  }

  for (const diagnostic of diagnostics) {
    assert.equal(diagnostic.phase, 'compile', edition);
    const result = build(diagnostic.source);
    assert.ok(result.status > 0, edition + ' / expected compile rejection');
    assert.equal(result.stdout, diagnostic.expectedStdout, edition + ' / compiler stdout');
    for (const fragment of diagnostic.stderrIncludes) {
      assert.ok(result.stderr.includes(fragment), edition + ' / compiler stderr\n' + result.stderr);
    }
    totals.rejectedBuilds++;
  }
  totals.editions++;
}

try {
  const version = execute(compiler, ['--version']);
  assert.equal(version.status, 0, 'Could not identify the native C17 compiler');
  console.log(version.stdout.split('\n')[0]);
  for (const id of manifest.availableTopicIds) {
    for (const locale of manifest.availableLocales) {
      checkEdition(read('lessons/' + id + '.' + locale + '.json'));
    }
  }
  console.log(JSON.stringify(totals));
} finally {
  for (const path of readdirSync(workspace, {withFileTypes: true})) {
    if (path.isFile()) unlinkSync(join(workspace, path.name));
  }
  rmdirSync(workspace);
}
