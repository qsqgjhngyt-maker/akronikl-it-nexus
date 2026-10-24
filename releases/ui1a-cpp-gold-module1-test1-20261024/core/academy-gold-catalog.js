// CP-GOLD: только точный набор утверждённых ID первого модуля, без произвольных URL.
export const GOLD_ALGORITHM_LESSONS=Object.freeze([
  'cpp.programming-process',
  'cpp.algorithm-definition-properties',
  'cpp.algorithm-representations',
  'cpp.pseudocode-euclidean-algorithm',
  'cpp.flowcharts',
  'cpp.top-down-design',
  'cpp.sequence-branching-loops',
  'cpp.languages-compilation-debugging'
]);
const allowed=new Set(GOLD_ALGORITHM_LESSONS);
export function goldLessonPath(id,locale='ru'){
  if(!allowed.has(id)||!['ru','en'].includes(locale))return null;
  return 'courses/cpp/gold/algorithms/'+id.slice(4)+'.'+locale+'.json';
}
