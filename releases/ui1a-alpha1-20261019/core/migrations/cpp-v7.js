import { loadState, saveState } from '../storage.js';

export const LEGACY_KEY = 'cpp_programming_pdf_course_v1';
export const MIGRATION_ID = 'cpp-v7-to-anx-v1';

const lessonIds = [
  'cpp.programming-process','cpp.algorithm-definition-properties','cpp.algorithm-representations','cpp.pseudocode-euclidean-algorithm','cpp.flowcharts','cpp.top-down-design','cpp.sequence-branching-loops','cpp.languages-compilation-debugging',
  'cpp.first-cpp-program','cpp.tokens-identifiers-keywords','cpp.comments-constants-literals','cpp.data-types','cpp.variables-scope','cpp.expressions-operators-blocks','cpp.arithmetic-assignment','cpp.type-conversions','cpp.relations-logic','cpp.increment-decrement-sizeof-conditional','cpp.pointers-references-addresses','cpp.standard-io',
  'cpp.if-else-switch','cpp.for-loop','cpp.while-do-while','cpp.one-dimensional-arrays','cpp.two-dimensional-arrays','cpp.char-arrays-strings','cpp.structures','cpp.unions-typedef-enums','cpp.formatted-io','cpp.streams-state','cpp.files','cpp.linked-lists','cpp.stacks-queues',
  'cpp.sorting-basic','cpp.search-linear-binary','cpp.pseudo-random-numbers','cpp.oop-principles','cpp.classes-objects-state-control','cpp.constructors-destructors','cpp.visual-event-model'
];

function parseLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? { raw, data } : null;
  } catch { return null; }
}

export function inspectLegacyCppV7() {
  const legacy = parseLegacy();
  if (!legacy) return { found: false, done: 0, total: 40 };
  const done = Array.isArray(legacy.data.done) ? legacy.data.done.filter(i => Number.isInteger(i) && i >= 0 && i < 40).length : 0;
  return { found: true, done, total: 40, alreadyImported: Boolean(loadState().migrations?.[MIGRATION_ID]) };
}

function keyedValue(obj, index) {
  if (!obj || typeof obj !== 'object') return undefined;
  return obj[index] ?? obj[String(index)];
}

export function importLegacyCppV7() {
  const legacy = parseLegacy();
  if (!legacy) return { ok: false, reason: 'not-found' };
  const state = loadState();
  const existing = state.courses?.cpp || {};
  const existingLessons = existing.lessons || {};
  const nextLessons = { ...existingLessons };
  const doneSet = new Set(Array.isArray(legacy.data.done) ? legacy.data.done : []);

  lessonIds.forEach((id, index) => {
    const prev = nextLessons[id] || {};
    const migrated = {
      ...prev,
      completed: Boolean(prev.completed || doneSet.has(index)),
      legacyIndex: index
    };
    const quiz = keyedValue(legacy.data.quiz, index); if (quiz !== undefined && migrated.quiz === undefined) migrated.quiz = quiz;
    const code = keyedValue(legacy.data.code, index); if (code !== undefined && migrated.code === undefined) migrated.code = code;
    const stdin = keyedValue(legacy.data.stdin, index); if (stdin !== undefined && migrated.stdin === undefined) migrated.stdin = stdin;
    const deep = keyedValue(legacy.data.deep, index); if (deep !== undefined && migrated.deep === undefined) migrated.deep = deep;
    const note = keyedValue(legacy.data.notes, index); if (note !== undefined && migrated.note === undefined) migrated.note = note;
    const confidence = keyedValue(legacy.data.confidence, index); if (confidence !== undefined && migrated.confidence === undefined) migrated.confidence = confidence;
    const mentor = keyedValue(legacy.data.mentor, index); if (mentor !== undefined && migrated.legacyMentor === undefined) migrated.legacyMentor = mentor;
    nextLessons[id] = migrated;
  });

  state.courses = {
    ...state.courses,
    cpp: {
      ...existing,
      courseId: 'cpp',
      lessons: nextLessons,
      legacyV7: {
        practicums: existing.legacyV7?.practicums ?? legacy.data.practicum ?? {},
        practicumCode: existing.legacyV7?.practicumCode ?? legacy.data.practicumCode ?? {},
        practicumStdin: existing.legacyV7?.practicumStdin ?? legacy.data.practicumStdin ?? {},
        practicumNotes: existing.legacyV7?.practicumNotes ?? legacy.data.practicumNotes ?? {},
        projectId: existing.legacyV7?.projectId ?? legacy.data.projectId ?? null,
        projectChecks: existing.legacyV7?.projectChecks ?? legacy.data.projectChecks ?? {},
        projectCode: existing.legacyV7?.projectCode ?? legacy.data.projectCode ?? {},
        projectStdin: existing.legacyV7?.projectStdin ?? legacy.data.projectStdin ?? {},
        projectReleaseChecks: existing.legacyV7?.projectReleaseChecks ?? legacy.data.projectReleaseChecks ?? {},
        projectSnapshots: existing.legacyV7?.projectSnapshots ?? legacy.data.projectSnapshots ?? {},
        projectReleaseNotes: existing.legacyV7?.projectReleaseNotes ?? legacy.data.projectReleaseNotes ?? {},
        projectLessonChecks: existing.legacyV7?.projectLessonChecks ?? legacy.data.projectLessonChecks ?? {}
      }
    }
  };
  state.migrations = {
    ...state.migrations,
    [MIGRATION_ID]: {
      importedAt: new Date().toISOString(),
      sourceKey: LEGACY_KEY,
      sourcePreserved: true,
      sourceSha256: null,
      completedCount: lessonIds.filter((_, i) => doneSet.has(i)).length,
      rawSnapshot: legacy.data
    }
  };
  saveState(state);
  return { ok: true, completedCount: state.migrations[MIGRATION_ID].completedCount };
}

export function getCppProgress() {
  const course = loadState().courses?.cpp;
  if (!course?.lessons) return { done: 0, total: 40, pct: 0 };
  const done = Object.values(course.lessons).filter(x => x?.completed).length;
  return { done, total: 40, pct: Math.round(done / 40 * 100) };
}
