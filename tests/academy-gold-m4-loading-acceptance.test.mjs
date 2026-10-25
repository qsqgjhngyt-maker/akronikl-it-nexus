// Приёмка M4: контролируемые задержки проверяют зависимости, не скорость сети.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GOLD_CLASSIC_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
const root=new URL('../',import.meta.url),requests=[];
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}};
let failPath=null,malformedPath=null,hold=null;
globalThis.fetch=async url=>{
 const file=String(url).slice(root.href.length);requests.push(file);
 if(hold&&file.includes('/gold/'))await hold.promise;
 if(file===failPath){failPath=null;throw Error('SYNTHETIC_GOLD_TEMPORARY');}
 const json=JSON.parse(await readFile(new URL(file,root),'utf8'));
 if(file===malformedPath){malformedPath=null;json.locale='de';}
 return{ok:true,json:async()=>json};
};
test('M4: первый JSON и presentation стартуют до разрешения course, повторы дедуплицируются',async()=>{
 const m=await import('../core/course-registry.js?m4-parallel'),course=deferred(),presentation=deferred();hold=deferred();
 let started=false,finished=false;
 const id=GOLD_CLASSIC_LESSONS[0],file=goldLessonPath(id,'ru');
 const a=m.prepareCppGoldLesson(course.promise,id,'ru',()=>{started=true;return presentation.promise}).then(x=>{finished=true;return x});
 const b=m.getCppGoldLesson(id,'ru');
 for(let i=0;i<100&&!started;i++)await new Promise(r=>setTimeout(r,2));
 assert.equal(started,true);assert.equal(requests.filter(x=>x===file).length,1);assert.equal(finished,false);
 const h=hold;hold=null;h.resolve();await b;assert.equal(finished,false);
 const target={};course.resolve(target);presentation.resolve();const g=await a;
 assert.equal(target.goldLessons.ru[id],g);assert.equal(requests.filter(x=>x===file).length,1);
});
test('M4: все 16 JSON загружаются по точному allowlist, RU/EN кэш раздельный',async()=>{
 const m=await import('../core/course-registry.js?m4-all'),before=requests.length;
 for(const id of GOLD_CLASSIC_LESSONS)for(const locale of ['ru','en']){
  const [a,b]=await Promise.all([m.getCppGoldLesson(id,locale),m.getCppGoldLesson(id,locale)]);assert.strictEqual(a,b);assert.equal(a.lessonId,id);assert.equal(a.locale,locale);
 }
 const batch=requests.slice(before);assert.equal(batch.length,16);assert.equal(new Set(batch).size,16);
 const count=requests.length;let prepared=0;
 for(const [id,locale]of [['../../secret','ru'],[GOLD_CLASSIC_LESSONS[0],'de']])assert.equal(await m.prepareCppGoldLesson({},id,locale,()=>prepared++),null);
 assert.equal(requests.length,count);assert.equal(prepared,0);
});
test('M4: временная ошибка и неверный locale не отравляют кэш; повтор реально читает JSON',async()=>{
 for(const kind of ['transport','contract']){
  const m=await import('../core/course-registry.js?m4-retry-'+kind),id=GOLD_CLASSIC_LESSONS.at(-1),file=goldLessonPath(id,'en'),before=requests.filter(x=>x===file).length;
  if(kind==='transport')failPath=file;else malformedPath=file;
  await assert.rejects(m.getCppGoldLesson(id,'en'),kind==='transport'?/SYNTHETIC_GOLD_TEMPORARY/:/GOLD_CONTENT_CONTRACT_MISMATCH/);
  assert.equal((await m.getCppGoldLesson(id,'en')).locale,'en');assert.equal(requests.filter(x=>x===file).length-before,2);
 }
});
