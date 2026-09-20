import fs from 'node:fs';

const ru=JSON.parse(fs.readFileSync(new URL('../courses/cpp/data/lessons.ru.json', import.meta.url),'utf8'));
const en=JSON.parse(fs.readFileSync(new URL('../courses/cpp/data/lessons.en.json', import.meta.url),'utf8'));
const manifest=JSON.parse(fs.readFileSync(new URL('../courses/cpp/manifest.json', import.meta.url),'utf8'));

const required=['whyItMatters','outcomes','prerequisites','quickUnderstand','fullTheory','inside','walkthrough','experiments','errors','practice','lab','knowledgeCheck','skillGraph','summary','modernNotes','historicalContext'];
const id='cpp.first-cpp-program';
const ruLesson=ru.lessons.find(x=>x.id===id);
const enLesson=en.lessons.find(x=>x.id===id);
function assert(value,message){if(!value)throw new Error(message)}
assert(ru.lessons.length===40,'RU baseline must remain 40 lessons');
assert(en.lessons.length===1,'EN partial package must contain exactly the first authored benchmark lesson');
assert(ruLesson && enLesson,'Benchmark lesson must exist in RU and EN');
for(const field of required){assert(field in ruLesson.benchmark,`RU benchmark missing ${field}`);assert(field in enLesson.benchmark,`EN benchmark missing ${field}`)}
assert(ruLesson.benchmark.fullTheory.sections.length>=8,'RU full theory too shallow');
assert(enLesson.benchmark.fullTheory.sections.length>=8,'EN full theory too shallow');
assert(ruLesson.benchmark.knowledgeCheck.length>=4,'RU deep check too small');
assert(enLesson.benchmark.knowledgeCheck.length>=4,'EN deep check too small');
assert(manifest.benchmarkStatus.completed.includes(id),'Manifest must mark benchmark as complete');
console.log('BENCHMARK_CONTENT_PASS', {
  ruLessons:ru.lessons.length,
  enAuthored:en.lessons.length,
  fullTheorySections:ruLesson.benchmark.fullTheory.sections.length,
  deepChecks:ruLesson.benchmark.knowledgeCheck.length
});
