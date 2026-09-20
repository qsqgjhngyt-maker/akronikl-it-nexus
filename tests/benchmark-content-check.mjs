import fs from 'node:fs';

const ru=JSON.parse(fs.readFileSync(new URL('../courses/cpp/data/lessons.ru.json', import.meta.url),'utf8'));
const en=JSON.parse(fs.readFileSync(new URL('../courses/cpp/data/lessons.en.json', import.meta.url),'utf8'));
const manifest=JSON.parse(fs.readFileSync(new URL('../courses/cpp/manifest.json', import.meta.url),'utf8'));

const required=['whyItMatters','outcomes','prerequisites','quickUnderstand','fullTheory','glossary','inside','walkthrough','experiments','errors','practice','lab','knowledgeCheck','sandboxModel','skillGraph','summary','modernNotes','historicalContext'];
const id='cpp.first-cpp-program';
const ruLesson=ru.lessons.find(x=>x.id===id);
const enLesson=en.lessons.find(x=>x.id===id);
function assert(value,message){if(!value)throw new Error(message)}
function publicLessonCopy(l){
  const clone=structuredClone(l);
  delete clone.provenanceRef;delete clone.pdfPages;delete clone.pdfNotes;
  return JSON.stringify(clone);
}
assert(ru.lessons.length===40,'RU baseline must remain 40 lessons');
assert(en.lessons.length===1,'EN partial package must contain exactly the first authored benchmark lesson');
assert(ruLesson && enLesson,'Benchmark lesson must exist in RU and EN');
for(const field of required){assert(field in ruLesson.benchmark,`RU benchmark missing ${field}`);assert(field in enLesson.benchmark,`EN benchmark missing ${field}`)}
assert(ruLesson.benchmark.standardVersion==='1.1','RU benchmark must use Standard 1.1');
assert(enLesson.benchmark.standardVersion==='1.1','EN benchmark must use Standard 1.1');
assert(ruLesson.benchmark.fullTheory.sections.length>=16,'RU full theory too shallow');
assert(enLesson.benchmark.fullTheory.sections.length>=16,'EN full theory too shallow');
assert(ruLesson.benchmark.glossary.length>=18,'RU glossary too small');
assert(enLesson.benchmark.glossary.length>=18,'EN glossary too small');
assert(ruLesson.benchmark.knowledgeCheck.length>=6,'RU understanding check too small');
assert(enLesson.benchmark.knowledgeCheck.length>=6,'EN understanding check too small');
assert(!/PDF/i.test(publicLessonCopy(ruLesson)),'RU benchmark learner-facing copy still references PDF');
assert(!/PDF/i.test(publicLessonCopy(enLesson)),'EN benchmark learner-facing copy still references PDF');
assert(manifest.benchmarkStatus.completed.includes(id),'Manifest must mark benchmark as complete');
console.log('BENCHMARK_CONTENT_PASS', {
  ruLessons:ru.lessons.length,
  enAuthored:en.lessons.length,
  standard:ruLesson.benchmark.standardVersion,
  fullTheorySections:ruLesson.benchmark.fullTheory.sections.length,
  glossary:ruLesson.benchmark.glossary.length,
  deepChecks:ruLesson.benchmark.knowledgeCheck.length
});
