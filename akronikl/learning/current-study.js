// Только подготовленный индекс подтверждает название урока. URL не доказывает
// существование задания, лабораторной работы, пройденной темы или оценки.
export function currentStudy(index, context) {
  if (!context?.route?.lessonId || !context.route.courseId ||
      context.courseLocale !== index?.stats?.locale || typeof index?.getLesson !== 'function') return null;
  const records = index.getLesson(context.route.lessonId, context.courseLocale);
  const first = records.find(r => r.lessonId === context.route.lessonId &&
    r.courseId === context.route.courseId && r.locale === context.courseLocale);
  if (!first) return null;
  return Object.freeze({courseId:first.courseId, lessonId:first.lessonId,
    title:first.title, locale:first.locale, sourcePath:first.sourcePath,
    contentVersion:first.contentVersion, contentHash:first.contentHash,
    taskAvailable:false, progressAvailable:false});
}
