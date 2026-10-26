// Допуск только методической правки поверх точного B80. Это не новый запуск C++.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {module5GoldLessons} from '../tests/helpers/module5-gold-programs.mjs';
import {GOLD_OOP_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
export const M5_ACCEPTANCE_BASE='b80fbfa4682e4cbaffa723650b1652d66b3b1112';
const fixes=[["Нужен ли деструктор каждому классу?", "Нужно ли каждому классу писать собственный деструктор?"],["Does every class need a destructor?", "Does every class need a user-defined destructor?"],["initialization of an empty interval", "initialization of the closed, degenerate interval [0,0], which contains the point zero"], ["Потерянный const или другой тип параметра может иначе создать отдельную перегрузку.", "Потерянный const или другой тип параметра может иначе объявить другой метод, скрывающий имя из базы, а не переопределение."], ["Omitting const or changing a parameter type might otherwise introduce a different overload.", "Omitting const or changing a parameter type can instead declare a different member that hides the base name rather than overriding it."], ["При поиске обработчика уничтожаются завершённые автоматические объекты покидаемых областей.", "При передаче управления от throw к найденному обработчику уничтожаются завершённые автоматические объекты покидаемых областей."], ["During handler search, fully constructed automatic objects in exited scopes are destroyed.", "As control transfers from throw to a matching handler, fully constructed automatic objects in exited scopes are destroyed."], ["В подготовленной feature используется Clang/WASI с EH;", "В Code Studio используется Clang/WASI с EH;"], ["The feature uses Clang/WASI with EH;", "Code Studio uses Clang/WASI with EH;"]],prereq=[[["structures", 0], ["property-testing-benchmarks", 0], ["property-testing-benchmarks", 4]], [["oop-principles", 0], ["oop-principles", 1], ["oop-principles", 4]], [["classes-objects-state-control", 0], ["classes-objects-state-control", 2], ["classes-objects-state-control", 4]], [["constructors-destructors", 0], ["constructors-destructors", 3], ["constructors-destructors", 4]], [["raii-smart-pointers", 0], ["raii-smart-pointers", 1], ["raii-smart-pointers", 4]], [["value-copy-move", 0], ["value-copy-move", 1], ["value-copy-move", 3]], [["composition-inheritance-polymorphism", 0], ["raii-smart-pointers", 1], ["raii-smart-pointers", 4]], [["value-copy-move", 3], ["iterators-algorithms-lambdas", 0], ["iterators-algorithms-lambdas", 4]], [["templates-concepts", 0], ["exceptions-guarantees", 1], ["multifile-build", 2]]];
const revise=v=>typeof v==='string'?fixes.reduce((s,[a,b])=>s.replaceAll(a,b),v):Array.isArray(v)?v.map(revise):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,revise(x)])):v;
export function proveM5EditorialLesson(before,after,previousQuestions){
 const i=GOLD_OOP_LESSONS.indexOf(after.lessonId);assert.ok(i>=0);assert.equal(before.lessonId,after.lessonId);assert.equal(before.locale,after.locale);
 const expected=revise(structuredClone(before));
 for(const q of [...after.assessment,...after.readinessCheck]){
  assert.ok(q.explanation.length>=100,'Нужна причина, а не повтор ответа');assert.notEqual(q.explanation,q.answers[q.correctIndex]);
 }
 assert.equal(after.assessment.length,5);assert.equal(after.readinessCheck.length,3);
 for(let j=0;j<5;j++)expected.assessment[j].explanation=after.assessment[j].explanation;
 for(let j=0;j<3;j++){
  const [slug,index]=prereq[i][j],source=previousQuestions.get('cpp.'+slug+'|'+after.locale)?.[index];assert.ok(source,'Предпосылка существует');
  const {explanation,...question}=source;const {explanation:reason,...actual}=after.readinessCheck[j];assert.deepEqual(actual,question,'Входной вопрос взят из уже изученной темы');
 }
 expected.readinessCheck=structuredClone(after.readinessCheck);
 assert.deepEqual(after,expected,'Любая иная правка, включая код, cases и legacyQuiz, запрещена');
 return {lessonId:after.lessonId,locale:after.locale,assessment:5,readiness:3};
}
export async function proveM5EditorialScope(){
 const all=await module5GoldLessons(),questions=new Map(all.map(g=>[g.lessonId+'|'+g.locale,g.assessment]));
 for(const slug of ['structures','property-testing-benchmarks','iterators-algorithms-lambdas','multifile-build'])for(const locale of ['ru','en']){
  const g=JSON.parse(await readFile(goldLessonPath('cpp.'+slug,locale)));questions.set(g.lessonId+'|'+locale,g.assessment);
 }
 const records=[];for(const g of all){const file=goldLessonPath(g.lessonId,g.locale),before=JSON.parse(execFileSync('git',['show',M5_ACCEPTANCE_BASE+':'+file],{maxBuffer:4000000}));records.push(proveM5EditorialLesson(before,g,questions));}
 for(const locale of ['ru','en'])assert.equal(new Set(all.filter(g=>g.locale===locale).map(g=>JSON.stringify(g.readinessCheck.map(q=>q.question)))).size,9,'Девять разных входных проверок');
 return {status:'PASS',baseline:M5_ACCEPTANCE_BASE,objects:records.length,questions:records.reduce((n,r)=>n+r.assessment+r.readiness,0),programsChanged:false,legacyQuizChanged:false,records};
}
