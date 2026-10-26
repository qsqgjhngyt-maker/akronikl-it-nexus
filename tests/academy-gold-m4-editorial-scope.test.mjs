// Отрицательные контроли важны: proof разрешает повторное использование WASM evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {M4_EDITORIAL_BASE,M4_EDITORIAL_FILE,M4_EDITORIAL_BEFORE,M4_EDITORIAL_AFTER,verifyM4EditorialBytes} from '../tools/academy-gold-m4-editorial-scope.mjs';
const before=execFileSync('git',['show',M4_EDITORIAL_BASE+':'+M4_EDITORIAL_FILE]).toString(),after=before.replace(M4_EDITORIAL_BEFORE,M4_EDITORIAL_AFTER);
test('Точная редакторская замена разрешена; исходное замечание ещё не считается исправленным',()=>{verifyM4EditorialBytes(before,after);assert.throws(()=>verifyM4EditorialBytes(before,before));});
test('Изменённые C++ source, stdin, stdout и locale не могут использовать старое evidence',()=>{
 for(const mutate of [g=>{g.workedExamples[0].code+='\n// changed';},g=>{g.laboratory.cases[0].stdin+='1';},g=>{g.laboratory.cases[0].stdout+='wrong';},g=>{g.locale='ru';}]){const g=JSON.parse(after);mutate(g);assert.throws(()=>verifyM4EditorialBytes(before,JSON.stringify(g,null,2)+'\n'));}
});
test('Другая фраза и чистое переформатирование также отклоняются',()=>{assert.throws(()=>verifyM4EditorialBytes(before,after.replace('A read must not silently insert','Changed heading')));assert.throws(()=>verifyM4EditorialBytes(before,JSON.stringify(JSON.parse(after))));});
