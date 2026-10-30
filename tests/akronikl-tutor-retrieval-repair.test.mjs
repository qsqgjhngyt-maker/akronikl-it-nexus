import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createKnowledgeIndex} from '../akronikl/core/index.js';
import {retrieveTutorEvidence,selectTutorSource,tutorExcerpt,rankTutorQuotes} from '../akronikl/tutor/retrieval.js';
const indexes={};for(const l of ['ru','en'])indexes[l]=createKnowledgeIndex(JSON.parse(await readFile(new URL(`../akronikl/knowledge/core-index.${l}.json`,import.meta.url))));
function source(locale,lesson,query){const records=retrieveTutorEvidence(indexes[locale],{query,locale,route:{courseId:'cpp',lessonId:lesson}});const record=selectTutorSource(records,query);assert.ok(record);const excerpt=tutorExcerpt(record.text,query);assert.ok(record.text.includes(excerpt.text));return excerpt.text;}
test('formula tokens retrieve actual cost text, including a relevant second paragraph',()=>{
 const q='Всегда ли вариант O(n log n) проигрывает варианту O(n)?';
 const s=source('ru','cpp.algorithm-complexity',q);assert.match(s,/константы/);assert.match(s,/измерени/);assert.doesNotMatch(s,/^Память/);
});
test('indices plural finds element bounds instead of a linear-search end marker',()=>{
 const s=source('en','cpp.one-dimensional-arrays','Explain valid indices for an array with n elements');assert.match(s,/0,1,2,3/);assert.match(s,/not the final index/);
});
test('word-form and filler differences do not replace destructor evidence with override',()=>{
 const s=source('ru','cpp.composition-inheritance-polymorphism','Когда действительно требуется виртуальный деструктор?');assert.match(s,/Удаление через/);assert.match(s,/деструктора базы/);
});
test('comparison retrieves both copy and move definitions, not just counters',()=>{
 const s=source('ru','cpp.value-copy-move','В чём разница копирования и перемещения?');assert.match(s,/копир|копи/iu);assert.match(s,/Перемещение:/);assert.doesNotMatch(s,/Инструментированный тип/);
});
test('while/do comparison retains both halves of the pre/post condition',()=>{
 const q='How do while and do while differ?';const s=source('en','cpp.while-do-while',q);assert.match(s,/tests before the body/);assert.match(s,/tests after the body/);
});
test('exception rollback question keeps the actual basic/strong guarantee distinction',()=>{
 const s=source('en','cpp.exceptions-guarantees','Does an exception undo every state change?');assert.match(s,/basic guarantee/);assert.match(s,/state to change/);assert.match(s,/strong guarantee/);
});
test('query excerpts are exact source spans and retain a complete paragraph subject',()=>{
 const text='Flags and buffer\nclear resets flags but does not consume a bad character. Read or discard the bad input after clearing flags.\nA later unrelated paragraph mentions another flag.';
 const e=tutorExcerpt(text,'bad input flags',130);assert.ok(text.includes(e.text));assert.match(e.text,/clear resets flags/);assert.doesNotMatch(e.text,/^Read or discard/);
});
test('failure/state question ranks a state-on-failure sentence above a no-throw definition',()=>{
 const quotes=['A nonthrowing guarantee promises that no exception escapes the operation.','The basic guarantee permits state to change after failure.'];
 const r=rankTutorQuotes(quotes,'Does an exception undo all state changes?');assert.equal(r[0].text,quotes[1]);assert.ok(r[0].score>r[1].score);
});
test('Russian failure forms retain the same literal counter-condition',()=>{
 const quotes=['Гарантия отсутствия исключений обещает, что операция не выпустит исключение.','Базовая гарантия не допускает утечки ресурсов, но состояние после отказа может измениться.'];
 assert.equal(rankTutorQuotes(quotes,'Если возникло исключение, все изменения автоматически отменяются?')[0].text,quotes[1]);
});
