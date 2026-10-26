// Публичный список содержит только метаданные; код и теория остаются в ленивых уроках.
import {readFile,writeFile} from 'node:fs/promises';
import {GOLD_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
const lessons={};
for(const id of GOLD_LESSONS){
 lessons[id]={};
 for(const locale of ['ru','en']){
  const gold=JSON.parse(await readFile(goldLessonPath(id,locale),'utf8')),lab=gold.laboratory;
  lessons[id][locale]={title:lab.title,goal:lab.catalogGoal||lab.challenge,stepCount:lab.steps.length,proof:lab.rubric[0]};
 }
}
const text=JSON.stringify({schemaVersion:1,lessons},null,2)+'\n';
await writeFile('courses/cpp/data/gold-laboratories.json',text);
console.log(JSON.stringify({lessons:GOLD_LESSONS.length,locales:2,bytes:Buffer.byteLength(text)}));
