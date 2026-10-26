import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync}from'node:child_process';
import {module5GoldLessons}from'./helpers/module5-gold-programs.mjs';import{goldLessonPath}from'../core/academy-gold-catalog.js';
import{M5_ACCEPTANCE_BASE,proveM5EditorialScope,proveM5EditorialLesson}from'../tools/academy-gold-m5-editorial-scope.mjs';
test('18 редакторских объектов сохраняют исходники, cases, metadata, stable IDs и legacyQuiz',async()=>{const r=await proveM5EditorialScope();assert.equal(r.objects,18);assert.equal(r.questions,144)});
test('Scope отвергает изменения программы, старого quiz, теории, ответа и плохую обратную связь',async()=>{
 const all=await module5GoldLessons(),g=all.find(g=>g.lessonId==='cpp.classes-objects-state-control'&&g.locale==='ru'),before=JSON.parse(execFileSync('git',['show',M5_ACCEPTANCE_BASE+':'+goldLessonPath(g.lessonId,g.locale)]));
 const questions=new Map(all.map(g=>[g.lessonId+'|'+g.locale,g.assessment]));proveM5EditorialLesson(before,g,questions);
 for(const mutate of [x=>x.workedExamples[0].code+='\n// changed',x=>x.legacyQuiz.correctIndex=99,x=>x.sections[0].title+='!',x=>x.assessment[0].correctIndex=99,x=>x.assessment[0].explanation=x.assessment[0].answers[x.assessment[0].correctIndex],x=>x.readinessCheck[0].question+='?']){
  const copy=structuredClone(g);mutate(copy);assert.throws(()=>proveM5EditorialLesson(before,copy,questions));
 }
});
