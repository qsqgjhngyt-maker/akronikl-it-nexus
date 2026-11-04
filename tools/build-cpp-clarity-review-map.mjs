import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GOLD_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
const curriculum=JSON.parse(await readFile('courses/cpp/curriculum.json')),topics=[];
for(const id of GOLD_LESSONS){
 const row=curriculum.lessons.find(x=>x.id===id),locales={};
 for(const locale of ['ru','en']){const file=goldLessonPath(id,locale),bytes=await readFile(file),g=JSON.parse(bytes),c=g.clarity;
  locales[locale]={source:file,sha256:createHash('sha256').update(bytes).digest('hex'),leadingThought:c?.goal||g.lead,prerequisites:c?.prerequisites||g.prerequisites,declaredTerms:g.concepts,newTermExplanation:c?{method:'Defined at use in primary model',paragraphs:c.model}:'NOT NEWLY REVIEWED',workedExample:c?{id:c.example.id,stdin:c.example.stdin,expectedStdout:c.example.expectedStdout,trace:c.example.trace}:{examples:g.workedExamples.map(x=>({id:x.id||null,title:x.title,steps:x.steps})),status:id==='cpp.functions-contracts'?'SCOPED AUTHOR WALKTHROUGH REVIEW':'STRUCTURAL EXTRACTION ONLY'},practice:c?{challenge:c.training.challenge,hints:c.training.hints,independentTask:c.laboratory.challenge,criterion:c.laboratory.rubric,negativeControl:c.negative}:g.practice.map(x=>({task:x.task,criterion:x.criteria,hint:x.hint})),authorSemanticReview:c?'REVISED PRIMARY PATH / AUTHOR REVIEW':id==='cpp.functions-contracts'?'SCOPED EXAMPLES AND OBSERVABILITY ONLY':'NOT RUN',independentSemanticReview:'NOT RUN',learnerFeedback:'NOT RUN'};
 }
 topics.push({lessonId:id,moduleId:row.sectionId,legacyIndex:row.legacyIndex,order:row.order,learningOrder:row.learningOrder,scope:locales.ru.authorSemanticReview,locales});
}
await mkdir('docs/ru/03-content/cpp-clarity-01',{recursive:true});
await writeFile('docs/ru/03-content/cpp-clarity-01/REVIEW_MAP_67.json',JSON.stringify({baseline:'ee2787c0cd92da2ad1d5e79df5e2bfadab2c3dd6',revision:'cpp-clarity-01-v1',topicCount:67,localeCount:134,revisedTopics:20,functionsScope:'walkthrough, hints and direct output-parameter observation',mechanicalExtractionIsNotSemanticApproval:true,topics},null,2)+'\n');
console.log('67 topics / 134 locales mapped; 20 primary paths authored; independent/learner review NOT RUN');
