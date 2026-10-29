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
export const GOLD_STRUCTURED_LESSONS=Object.freeze([
  'cpp.if-else-switch','cpp.for-loop','cpp.while-do-while',
  'cpp.functions-contracts','cpp.standard-sequences','cpp.one-dimensional-arrays',
  'cpp.two-dimensional-arrays','cpp.char-arrays-strings','cpp.structures',
  'cpp.unions-typedef-enums','cpp.lifetime-ownership','cpp.formatted-io',
  'cpp.streams-state','cpp.testing-diagnostics','cpp.multifile-build',
  'cpp.files','cpp.linked-lists','cpp.stacks-queues'
]);
export const GOLD_CLASSIC_LESSONS=Object.freeze(['cpp.algorithm-complexity','cpp.sorting-basic','cpp.iterators-algorithms-lambdas','cpp.search-linear-binary','cpp.recursion-divide-conquer','cpp.associative-containers','cpp.pseudo-random-numbers','cpp.property-testing-benchmarks']);
export const GOLD_OOP_LESSONS=Object.freeze(["cpp.oop-principles","cpp.classes-objects-state-control","cpp.constructors-destructors","cpp.raii-smart-pointers","cpp.value-copy-move","cpp.composition-inheritance-polymorphism","cpp.exceptions-guarantees","cpp.templates-concepts","cpp.design-testability-refactoring"]);
export const GOLD_EVENT_LESSONS=Object.freeze(["cpp.visual-event-model", "cpp.event-queues-dispatch", "cpp.states-typed-events", "cpp.model-view-presenter", "cpp.validated-user-commands", "cpp.callback-lifetime-subscriptions", "cpp.responsive-work-cancellation", "cpp.versioned-model-persistence", "cpp.event-testing-replay", "cpp.multifile-event-application", "cpp.qt-graphical-adapter", "cpp.application-build-delivery"]);
export const GOLD_LESSONS=Object.freeze([...GOLD_ALGORITHM_LESSONS,...GOLD_BASICS_LESSONS,...GOLD_STRUCTURED_LESSONS,...GOLD_CLASSIC_LESSONS,...GOLD_OOP_LESSONS,...GOLD_EVENT_LESSONS]);
const modules=new Map([
  ...GOLD_ALGORITHM_LESSONS.map(id=>[id,'cpp.section.algorithms']),
  ...GOLD_BASICS_LESSONS.map(id=>[id,'cpp.section.cpp-basics']),
  ...GOLD_STRUCTURED_LESSONS.map(id=>[id,'cpp.section.structured-programming']),
  ...GOLD_CLASSIC_LESSONS.map(id=>[id,'cpp.section.classic-algorithms']),
  ...GOLD_OOP_LESSONS.map(id=>[id,'cpp.section.oop']),
  ...GOLD_EVENT_LESSONS.map(id=>[id,'cpp.section.visual-programming'])
]);
export function goldLessonModule(id){return modules.get(id)||null;}
export function goldLessonPath(id,locale='ru'){
  const moduleId=goldLessonModule(id);
  if(!moduleId||!['ru','en'].includes(locale))return null;
  const folder=moduleId==='cpp.section.visual-programming'?'events':moduleId==='cpp.section.oop'?'oop':moduleId==='cpp.section.algorithms'?'algorithms':moduleId==='cpp.section.cpp-basics'?'basics':moduleId==='cpp.section.classic-algorithms'?'classic':'structured';
  return 'courses/cpp/gold/'+folder+'/'+id.slice(4)+'.'+locale+'.json';
}
