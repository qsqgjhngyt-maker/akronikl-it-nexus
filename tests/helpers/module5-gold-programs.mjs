// Исполняемые контракты извлекаются из учебных RU/EN JSON без правки исходников.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GOLD_OOP_LESSONS,goldLessonPath} from '../../core/academy-gold-catalog.js';
export {programFiles} from './module4-gold-programs.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export async function module5GoldLessons(){
 const result=[];for(const id of GOLD_OOP_LESSONS)for(const locale of ['ru','en'])result.push(JSON.parse(await readFile(new URL('../../'+goldLessonPath(id,locale),import.meta.url),'utf8')));return result;
}
export async function module5GoldPrograms(){
 const unique=new Map();
 const add=(g,part,source,cases,files={},metadata={},expectation='exact',diagnostic)=>{
  assert.ok(source.includes('int main('),g.lessonId+' '+part);
  const contract={source,files,metadata,cases,expectation,diagnostic},key=hash(JSON.stringify(contract)),alias={lesson:g.lessonId,locale:g.locale,part};
  if(unique.has(key))unique.get(key).aliases.push(alias);
  else unique.set(key,{id:g.lessonId.slice(4)+'-'+part,...contract,sourceSha256:hash(source),bundleSha256:key,aliases:[alias]});
 };
 for(const g of await module5GoldLessons()){
  for(const e of g.workedExamples)add(g,'example-'+e.id,e.code,[{stdin:e.stdin,stdout:e.expectedStdout},...(e.cases||[])],e.files,e.metadata);
  for(const [part,a]of [['lab',g.laboratory],['block',g.blockPracticum],['project',g.modulePracticum]])if(a){
   add(g,part+'-starter',a.starterCode,[{stdin:a.cases[0].stdin,stdout:a.starterExpectedStdout}],a.starterFiles,a.metadata);
   add(g,part+'-reference',a.referenceCode,a.cases,a.referenceFiles,a.metadata);
   if(a.testDriver)add(g,part+'-test-driver',a.testDriver,[{stdin:'',stdout:a.testExpectedStdout}],a.referenceFiles,a.metadata);
  }
  for(const n of g.diagnosticExamples||[])add(g,'negative-'+n.id,n.code,[{stdin:'',stdout:''}],n.files,n.metadata,n.expectation,n.diagnostic);
 }
 return [...unique.values()];
}
