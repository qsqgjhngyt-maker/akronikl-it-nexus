import {readFile} from 'node:fs/promises';
import {goldLessonPath} from '../../core/academy-gold-catalog.js';
export const B1_NEW=['first-cpp-program','comments-constants-literals','variables-scope','expressions-operators-blocks','arithmetic-assignment','type-conversions','relations-logic','pointers-references-addresses','standard-io'].map(x=>'cpp.'+x);
export const B1_IDS=[...B1_NEW.slice(0,2),'cpp.data-types',...B1_NEW.slice(2)];
export const B1_BASE='bf8eabb0a6ec40c3ed767f073ed6c02c321531b1';
export async function b1Lesson(id,locale){const g=JSON.parse(await readFile(goldLessonPath(id,locale),'utf8')),l=JSON.parse(await readFile('courses/clarity/lessons/'+id+'.'+locale+'.json','utf8'));return {g,l};}
export function record(id,locale,name,c){return {id,locale,name,source:c.source,stdin:c.stdin||'',files:c.files||{'main.cpp':c.source},metadata:c.metadata||{entryFile:'main.cpp'},expected:c.expected??c.output,expectCompileFailure:!!c.expectCompileFailure};}
export async function b1Programs(){const rows=[];for(const id of B1_NEW)for(const locale of ['ru','en']){const {g,l}=await b1Lesson(id,locale);
for(const s of l.sections)for(const c of [s.code,s.reveal?.code].filter(Boolean))rows.push(record(id,locale,s.id,c));
for(const q of l.selfcheck)if(q.execution)rows.push(record(id,locale,'question-'+q.id,q.execution));
for(const c of g.teachingEdition.verificationCases)rows.push(record(id,locale,c.label,c));
rows.push(record(id,locale,'starter',{source:l.practice.files[0].content,stdin:l.practice.stdin,expected:g.teachingEdition.starterExpected,files:{'main.cpp':l.practice.files[0].content},metadata:l.practice.metadata}));
}return rows;}
