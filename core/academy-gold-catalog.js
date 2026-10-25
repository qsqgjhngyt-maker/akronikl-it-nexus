// CP-GOLD: точные ID подготовленных уроков, без произвольных URL.
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
export const GOLD_BASICS_LESSONS=Object.freeze([
  'cpp.first-cpp-program',
  'cpp.tokens-identifiers-keywords',
  'cpp.comments-constants-literals',
  'cpp.data-types',
  'cpp.variables-scope',
  'cpp.expressions-operators-blocks',
  'cpp.arithmetic-assignment',
  'cpp.type-conversions',
  'cpp.relations-logic',
  'cpp.increment-decrement-sizeof-conditional',
  'cpp.pointers-references-addresses',
  'cpp.standard-io'
]);
export const GOLD_LESSONS=Object.freeze([...GOLD_ALGORITHM_LESSONS,...GOLD_BASICS_LESSONS]);
const modules=new Map([
  ...GOLD_ALGORITHM_LESSONS.map(id=>[id,'cpp.section.algorithms']),
  ...GOLD_BASICS_LESSONS.map(id=>[id,'cpp.section.cpp-basics'])
]);
export function goldLessonModule(id){return modules.get(id)||null;}
export function goldLessonPath(id,locale='ru'){
  const moduleId=goldLessonModule(id);
  if(!moduleId||!['ru','en'].includes(locale))return null;
  const folder=moduleId==='cpp.section.algorithms'?'algorithms':'basics';
  return 'courses/cpp/gold/'+folder+'/'+id.slice(4)+'.'+locale+'.json';
}
