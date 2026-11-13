import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GOLD_ALGORITHM_LESSONS,GOLD_BASICS_LESSONS,goldLessonPath} from '../../core/academy-gold-catalog.js';
export const clarityIds=[...GOLD_ALGORITHM_LESSONS,...GOLD_BASICS_LESSONS];
export async function clarityLessons(){return Promise.all(clarityIds.flatMap(id=>['ru','en'].map(async locale=>JSON.parse(await readFile(goldLessonPath(id,locale),'utf8')))))}
export async function clarityPrograms(){
 const programs=[];const add=(g,name,source,cases)=>programs.push({id:g.lessonId,locale:g.locale,name,source,sourceSha256:createHash('sha256').update(source).digest('hex'),cases});
 for(const g of await clarityLessons()){
  const c=g.clarity;add(g,'primary-example',c.example.code,[{stdin:c.example.stdin,stdout:c.example.expectedStdout}]);
  for(const [i,v]of c.training.variants.entries())add(g,'training-'+i,v.code,[{stdin:v.stdin,stdout:v.stdout}]);
  add(g,'independent-reference',c.laboratory.referenceCode,c.laboratory.cases);
  if(g.lessonId==='cpp.programming-process')add(g,'lab-wrong-addition',c.laboratory.referenceCode.replace('price * count','price + count'),[{stdin:'',stdout:'75\n'}]);
 }
 const g=JSON.parse(await readFile(goldLessonPath('cpp.functions-contracts','ru'),'utf8'));
 for(const x of g.workedExamples)add(g,'functions-'+x.id,x.code,[{stdin:x.stdin,stdout:x.expectedStdout}]);
 const copied=g.workedExamples[0];add(g,'functions-transfer-10',copied.code.replace('original = 4','original = 10'),[{stdin:'',stdout:'10 11\n11\n'}]);
 const area=g.workedExamples[1];
 // A CLI-only "invalid" would not distinguish these faulty implementations.
 add(g,'negative-result-overwritten',area.code.replace('return false;','result = 0; return false;'),[{stdin:'',stdout:'0 0\n1 12\n'}]);
 add(g,'negative-rejection-reports-success',area.code.replace('return false;','return true;'),[{stdin:'',stdout:'1 17\n1 12\n'}]);
 return programs;
}
