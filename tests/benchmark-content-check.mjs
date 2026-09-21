import fs from 'node:fs';

const ru=JSON.parse(fs.readFileSync(new URL('../courses/cpp/data/lessons.ru.json', import.meta.url),'utf8'));
const en=JSON.parse(fs.readFileSync(new URL('../courses/cpp/data/lessons.en.json', import.meta.url),'utf8'));
const manifest=JSON.parse(fs.readFileSync(new URL('../courses/cpp/manifest.json', import.meta.url),'utf8'));

const ids=['cpp.first-cpp-program','cpp.pointers-references-addresses','cpp.oop-principles'];
const required=['whyItMatters','outcomes','prerequisites','quickUnderstand','fullTheory','glossary','inside','walkthrough','experiments','errors','practice','lab','knowledgeCheck','sandboxModel','skillGraph','summary','modernNotes','historicalContext'];
function assert(value,message){if(!value)throw new Error(message)}
function publicLessonCopy(l){const clone=structuredClone(l);delete clone.provenanceRef;delete clone.pdfPages;delete clone.pdfNotes;return JSON.stringify(clone)}
assert(ru.lessons.length===40,'RU baseline must remain 40 lessons');
assert(en.lessons.length===3,'EN partial package must contain exactly three authored benchmark lessons');
for(const id of ids){
  const r=ru.lessons.find(x=>x.id===id),e=en.lessons.find(x=>x.id===id);
  assert(r&&e,`Benchmark ${id} must exist in RU and EN`);
  for(const field of required){assert(field in r.benchmark,`RU ${id} missing ${field}`);assert(field in e.benchmark,`EN ${id} missing ${field}`)}
  assert(r.benchmark.fullTheory.sections.length>=16,`RU ${id} full theory too shallow`);
  assert(e.benchmark.fullTheory.sections.length>=16,`EN ${id} full theory too shallow`);
  assert(r.benchmark.glossary.length>=18,`RU ${id} glossary too small`);
  assert(e.benchmark.glossary.length>=18,`EN ${id} glossary too small`);
  assert(r.benchmark.knowledgeCheck.length>=6,`RU ${id} understanding check too small`);
  assert(e.benchmark.knowledgeCheck.length>=6,`EN ${id} understanding check too small`);
  assert(!/PDF/i.test(publicLessonCopy(r)),`RU ${id} learner-facing copy still references PDF`);
  assert(!/PDF/i.test(publicLessonCopy(e)),`EN ${id} learner-facing copy still references PDF`);
  assert(manifest.benchmarkStatus.completed.includes(id),`Manifest must mark ${id} complete`);
}
const ptrRu=ru.lessons.find(x=>x.id==='cpp.pointers-references-addresses');
const ptrEn=en.lessons.find(x=>x.id==='cpp.pointers-references-addresses');
for(const l of [ptrRu,ptrEn]){
  assert(l.benchmark.interactiveMemory?.steps?.length>=5,'Pointer benchmark needs a 5-step interactive memory model');
  assert(l.benchmark.interactiveMemory.addressNote,'Pointer benchmark must state that addresses are symbolic');
  assert(l.benchmark.skillGraph.strengthens.includes('cpp.lifetime.safety'),'Pointer benchmark must strengthen lifetime safety');
}
const oopRu=ru.lessons.find(x=>x.id==='cpp.oop-principles');
const oopEn=en.lessons.find(x=>x.id==='cpp.oop-principles');
for(const l of [oopRu,oopEn]){
  assert(l.benchmark.interactiveOop?.steps?.length>=6,'OOP benchmark needs a 6-step interactive OOP model');
  assert(l.benchmark.skillGraph.strengthens.includes('cpp.oop.virtual-dispatch'),'OOP benchmark must strengthen virtual dispatch');
}
console.log('BENCHMARK_CONTENT_PASS',{ruLessons:ru.lessons.length,enAuthored:en.lessons.length,completed:manifest.benchmarkStatus.completed,pointerTheory:ptrRu.benchmark.fullTheory.sections.length,pointerGlossary:ptrRu.benchmark.glossary.length,memorySteps:ptrRu.benchmark.interactiveMemory.steps.length,oopSteps:oopRu.benchmark.interactiveOop.steps.length});
