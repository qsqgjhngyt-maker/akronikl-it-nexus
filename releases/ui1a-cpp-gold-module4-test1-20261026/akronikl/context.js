import { loadPrefs } from '../core/storage.js';

const context = {
  schemaVersion: 1,
  courseId: null,
  lessonId: null,
  sectionId: null,
  taskId: null,
  code: null,
  stdin: null,
  stdout: null,
  stderr: null,
  attempts: []
};

export function getAkroniklContext() {
  const prefs = loadPrefs();
  return { ...context, language: prefs.mentorLocale, courseLanguage: prefs.courseLocale };
}

export function setAkroniklContext(patch) {
  Object.assign(context, patch || {});
  return getAkroniklContext();
}

export function clearAkroniklTaskContext() {
  Object.assign(context, { taskId: null, code: null, stdin: null, stdout: null, stderr: null, attempts: [] });
  return getAkroniklContext();
}
