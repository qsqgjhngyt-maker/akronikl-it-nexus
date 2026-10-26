#!/usr/bin/env node
// Детерминированная подготовка публичного offline knowledge index. Сеть не используется.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {GOLD_LESSONS, goldLessonModule, goldLessonPath} from '../core/academy-gold-catalog.js';
import {createKnowledgeIndex, KNOWLEDGE_LIMITS} from '../akronikl/core/knowledge.js';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const serialize = value => JSON.stringify(value, null, 2) + '\n';
const boundedExcerpt = parts => {
  const clean = parts.filter(part => typeof part === 'string' && part.trim()).map(part => part.trim());
  let result = '';
  for (const part of clean) {
    const candidate = result ? `${result}\n${part}` : part;
    if (candidate.length <= KNOWLEDGE_LIMITS.textChars) result = candidate;
    else {
      if (!result) result = part.slice(0, KNOWLEDGE_LIMITS.textChars - 1) + '…';
      break;
    }
  }
  return result;
};

export async function buildKnowledgeArtifacts(sourceRoot = root) {
  const sources = new Map();
  async function source(relativePath) {
    if (sources.has(relativePath)) return sources.get(relativePath);
    const bytes = await readFile(path.join(sourceRoot, relativePath));
    const value = {path: relativePath, sha256: sha256(bytes), bytes: bytes.length, data: JSON.parse(bytes.toString('utf8'))};
    sources.set(relativePath, value);
    return value;
  }
  const curriculum = await source('courses/cpp/curriculum.json');
  const manifest = await source('courses/cpp/manifest.json');
  if (curriculum.data.schemaVersion !== 1 || curriculum.data.courseId !== 'cpp' || !Array.isArray(curriculum.data.lessons)) throw Error('AKRONIKL_CURRICULUM_INVALID');
  const lessons = curriculum.data.lessons;
  const canonicalIds = new Set(lessons.map(lesson => lesson.id));
  if (canonicalIds.size !== lessons.length || GOLD_LESSONS.some(id => !canonicalIds.has(id))) throw Error('AKRONIKL_CONTENT_IDS_INVALID');
  const catalogBytes = await readFile(path.join(sourceRoot, 'core/academy-gold-catalog.js'));
  const artifacts = [];
  const indexes = [];
  const goldSet = new Set(GOLD_LESSONS);
  for (const locale of ['ru', 'en']) {
    const baseline = await source(`courses/cpp/data/lessons.${locale}.json`);
    if (baseline.data.courseId !== 'cpp' || baseline.data.locale !== locale || !Array.isArray(baseline.data.lessons)) throw Error('AKRONIKL_BASELINE_INVALID');
    const baselineById = new Map(baseline.data.lessons.map(lesson => [lesson.id, lesson]));
    const records = [];
    const usedSources = new Set([curriculum.path, manifest.path, baseline.path]);
    const titleOnlyLessons = [];
    let goldLessons = 0, baselineLessons = 0;
    function add(lesson, src, section, text, number = null) {
      if (!text) return;
      const part = section === 'theory' && number !== null ? `theory-${number}` : section;
      const canonical = lessons.find(item => item.id === lesson.id);
      records.push({
        sourceId: `nexus:cpp:${lesson.id}:${part}:${locale}`,
        courseId: 'cpp', lessonId: lesson.id, moduleId: canonical.sectionId,
        locale, title: lesson.title, section, text, sourcePath: src.path, contentHash: src.sha256,
        route: {courseId: 'cpp', lessonId: lesson.id}
      });
      usedSources.add(src.path);
    }
    for (const canonical of lessons) {
      if (goldSet.has(canonical.id)) {
        const src = await source(goldLessonPath(canonical.id, locale));
        const data = src.data;
        if (data.lessonId !== canonical.id || data.locale !== locale || data.moduleId !== goldLessonModule(canonical.id) || data.moduleId !== canonical.sectionId || data.standardVersion !== 'academy-gold-1.1') throw Error('AKRONIKL_GOLD_CONTRACT_MISMATCH');
        if (typeof data.title !== 'string' || !Array.isArray(data.sections) || !Array.isArray(data.concepts)) throw Error('AKRONIKL_GOLD_KNOWLEDGE_INVALID');
        const lesson = {id: canonical.id, title: data.title};
        add(lesson, src, 'overview', boundedExcerpt([data.lead, ...(Array.isArray(data.objectives) ? data.objectives : [])]));
        for (const [index, section] of data.sections.entries()) {
          if (!section || !Array.isArray(section.paragraphs) || section.paragraphs.some(text => typeof text !== 'string')) throw Error('AKRONIKL_GOLD_SECTION_INVALID');
          add(lesson, src, 'theory', boundedExcerpt([section.title, ...section.paragraphs]), index + 1);
        }
        const terms = data.concepts.filter(concept => typeof concept?.term === 'string' && typeof concept?.definition === 'string');
        add(lesson, src, 'glossary', boundedExcerpt(terms.map(concept => `${concept.term}: ${concept.definition}`)));
        goldLessons++;
      } else {
        const data = baselineById.get(canonical.id);
        if (data) {
          if (data.sectionId !== canonical.sectionId || typeof data.title !== 'string') throw Error('AKRONIKL_BASELINE_LESSON_INVALID');
          const lesson = {id: canonical.id, title: data.title};
          add(lesson, baseline, 'overview', boundedExcerpt([data.description || data.title]));
          add(lesson, baseline, 'theory', boundedExcerpt([...(Array.isArray(data.theory) ? data.theory : []), data.deep]), 1);
          add(lesson, baseline, 'glossary', boundedExcerpt((Array.isArray(data.terms) ? data.terms : []).filter(item => Array.isArray(item) && item.length === 2 && item.every(value => typeof value === 'string')).map(item => `${item[0]}: ${item[1]}`)));
          baselineLessons++;
        } else {
          // Только реально существующий заголовок. Русский текст не выдаётся за английский.
          const title = canonical.title?.[locale];
          if (typeof title !== 'string' || !title.trim()) throw Error('AKRONIKL_TITLE_MISSING');
          add({id: canonical.id, title}, curriculum, 'overview', title);
          titleOnlyLessons.push(canonical.id);
        }
      }
    }
    records.sort((a, b) => a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0);
    const fingerprint = [...usedSources].sort().map(sourcePath => ({path: sourcePath, sha256: sources.get(sourcePath).sha256}));
    const contentVersion = 'sha256:' + sha256(serialize({catalog: sha256(catalogBytes), sources: fingerprint}));
    const bundle = {schemaVersion: 1, id: `nexus-core-cpp-${locale}-v1`, locale, contentVersion, records};
    const checked = createKnowledgeIndex(bundle);
    const target = `akronikl/knowledge/core-index.${locale}.json`;
    const content = serialize(bundle);
    artifacts.push({path: target, content});
    indexes.push({
      id: bundle.id, locale, path: target, sha256: sha256(content), bytes: Buffer.byteLength(content),
      contentVersion, records: checked.stats.recordCount, lessons: checked.stats.lessonCount,
      goldLessons, baselineLessons, titleOnlyLessons
    });
  }
  const outputManifest = {
    schemaVersion: 1, id: 'nexus-core-cpp-knowledge-v1',
    sourcePolicy: 'repository-curriculum-and-gold-allowlist',
    sourceApproval: 'current-repository-content; no-additional-pedagogical-validation',
    extraction: 'overview-theory-glossary-only',
    excludes: ['solutions', 'quiz-answers', 'assessment', 'private-projects', 'learner-state'],
    excerptsMayBeTruncated: true, maxRecordTextChars: KNOWLEDGE_LIMITS.textChars,
    programVersion: manifest.data.programVersion, indexes,
    sources: [
      {path: 'core/academy-gold-catalog.js', sha256: sha256(catalogBytes), bytes: catalogBytes.length},
      ...[...sources.values()].map(src => ({path: src.path, sha256: src.sha256, bytes: src.bytes}))
    ].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
  };
  artifacts.push({path: 'akronikl/knowledge/manifest.json', content: serialize(outputManifest)});
  return {artifacts, manifest: outputManifest};
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check') || args.length > 1) throw Error('USAGE: node tools/build-akronikl-knowledge.mjs [--check]');
  const check = args.includes('--check');
  const {artifacts, manifest} = await buildKnowledgeArtifacts();
  for (const artifact of artifacts) {
    const target = path.join(root, artifact.path);
    if (check) {
      const actual = await readFile(target, 'utf8');
      if (actual !== artifact.content) throw Error('AKRONIKL_KNOWLEDGE_DRIFT: ' + artifact.path);
    } else {
      await mkdir(path.dirname(target), {recursive: true});
      await writeFile(target, artifact.content, 'utf8');
    }
  }
  console.log(JSON.stringify({status: 'PASS', mode: check ? 'check' : 'build', indexes: manifest.indexes}, null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
