import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {GOLD_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
import {academyGoldMarkup} from '../core/academy-gold-presentation.js';
import {cppProgramProgress,CPP_LEGACY_LESSON_IDS} from '../core/storage.js';
test('Общий renderer: все 67 тем / 134 локализации, включая Qt и функции',async()=>{
 const catalog=JSON.parse(await readFile('courses/cpp/data/gold-laboratories.json'));
 assert.equal(Object.keys(catalog.lessons).length,55);
 for(const id of GOLD_LESSONS)for(const locale of ['ru','en']){const g=JSON.parse(await readFile(goldLessonPath(id,locale))),html=academyGoldMarkup(g);assert.ok(html.includes('data-gold-lesson="'+id+'"'));assert.ok(html.includes('lang="'+locale+'"'));assert.equal((html.match(/id="cppLab"/g)||[]).length,1);assert.ok(html.includes('Expected output')||html.includes('Ожидаемый вывод'));if(g.clarity){assert.equal(catalog.lessons[id][locale].goal,g.clarity.laboratory.catalogGoal);assert.equal(catalog.lessons[id][locale].stepCount,g.clarity.laboratory.steps.length)}if(g.runtimeTarget==='qt-wasm')assert.ok(html.includes('Preview'));
 }
});
test('67 completion и 40 legacy: расчёт прогресса не переписывает попытки, проекты или код',async()=>{
 const c=JSON.parse(await readFile('courses/cpp/curriculum.json')),state={courses:{cpp:{lessons:Object.fromEntries(c.lessons.map((x,i)=>[x.id,{completed:true,quiz:i%3,attempts:[{revision:'old',answer:i%3}],code:'SYNTHETIC-'+i,workspace:{keep:true}}]))}},projects:{keep:{private:true}}},before=JSON.stringify(state),p=cppProgramProgress(state,c);
 assert.equal(p.done,67);assert.equal(p.total,67);assert.equal(p.legacy.done,40);assert.equal(p.legacy.total,40);assert.equal(CPP_LEGACY_LESSON_IDS.length,40);assert.equal(JSON.stringify(state),before);
});
