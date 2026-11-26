import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
import {goldLessonPath} from '../core/academy-gold-catalog.js';

const root = new URL('../courses/', import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(name,root),'utf8'));
const outputs = new URL('academy-work/',root);
const check = process.argv.includes('--check');
if (!check) await mkdir(outputs,{recursive:true});
const topicIds=new Map();

for (const course of ['c','onec','1c-enterprise']) {
  const curriculum = await read(course+'/curriculum.json');
  const topics=curriculum.modules.filter(module=>['implemented','IMPLEMENTED'].includes(module.status))
    .flatMap(module=>module.topics);
  topicIds.set(course,new Set(topics.map(topic=>topic.id??topic.topicId)));
  for (const locale of ['ru','en']) {
    const index={};
    for (const topic of topics) {
      const id=topic.id??topic.topicId;
      if (course==='c') {
        const {practice}=await read('c/lessons/'+id+'.'+locale+'.json');
        index[id]={assignments:practice.exercises.map(({title,task,criteria})=>({title,task,criteria})),
          lab:{title:practice.title,task:practice.task}};
      } else {
        const native=await read(course+'/'+topic.content[locale]);
        const folder=CLARITY_COURSES[id]?.pilot?'cpp-clarity-r3':'clarity';
        const {practice}=await read(folder+'/lessons/'+id+'.'+locale+'.json');
        index[id]={assignments:native.exercises.map(({level,task,criteria})=>({title:level,task,criteria:[criteria]})),
          lab:{title:practice.title,task:practice.task}};
      }
      assert.ok(index[id].lab.title&&index[id].lab.task,id);
      assert.ok(index[id].assignments.length&&index[id].assignments.every(item=>
        item.title&&item.task&&Array.isArray(item.criteria)&&item.criteria.every(line=>typeof line==='string')),id);
    }
    const rows=Object.entries(index).map(([id,entry])=>'  '+JSON.stringify(id)+': '+JSON.stringify(entry));
    const body='{\n'+rows.join(',\n')+'\n}\n';
    const file=new URL(course+'.'+locale+'.json',outputs);
    if (check) assert.equal(await readFile(file,'utf8'),body,file.pathname);
    else await writeFile(file,body);
    console.log(course,locale,Object.keys(index).length,'topics with assignments and labs');
  }
}

if (check) {
  const [ru,en]=await Promise.all(['ru','en'].map(locale=>read('academy-work-projects.'+locale+'.json')));
  for (const [course,ids] of topicIds) {
    assert.ok(ru[course].length>=4,course);
    assert.equal(new Set(ru[course].map(project=>project.id)).size,ru[course].length,course);
    const routes=projects=>projects.map(project=>({
      id:project.id,lesson:project.lesson,stage:project.stage,final:project.final,
      steps:project.steps?.map(step=>[step.lesson,step.stage]),
    }));
    assert.deepEqual(routes(ru[course]),routes(en[course]),course);
    for(const list of [ru[course],en[course]]) for(const project of list) {
      assert.ok(project.title&&project.description&&project.criterion,project.id);
      for(const entry of [project,...project.steps??[]]) assert.ok(ids.has(entry.lesson),entry.lesson);
    }
  }
  assert.equal(ru.c.filter(project=>project.final).length,1);
  assert.equal(ru.c.find(project=>project.final).lesson,'c.capstone-contract');

  const editions=await Promise.all(['ru','en'].map(locale=>read('c/reference.'+locale+'.json')));
  const cLessons=topicIds.get('c');
  for(const cards of editions) {
    assert.ok(cards.length>=40);
    assert.equal(new Set(cards.map(card=>card.id)).size,cards.length);
    assert.deepEqual(new Set(cards.flatMap(card=>card.lessons)),cLessons);
    for(const card of cards) {
      for(const key of ['term','simple','definition','purpose','form','example','observation','mistake'])
        assert.ok(typeof card[key]==='string'&&card[key].trim(),card.id+' '+key);
      assert.ok(card.breakdown.length>=2,card.id);
      assert.ok(card.aliases.length&&card.lessons.length,card.id);
    }
  }
  const index=cards=>cards.map(({id,form,example,lessons})=>({id,form,example,lessons}));
  assert.deepEqual(index(editions[0]),index(editions[1]));

  const legacy=await read('cpp/data/gold-laboratories.json'), extension=await read('cpp/data/gold-laboratories-m6.json');
  const cpp={...legacy.lessons,...extension.lessons};
  assert.equal(Object.keys(cpp).length,67);
  for(const [id,languages] of Object.entries(cpp)) for(const locale of ['ru','en']) {
    const gold=await read(goldLessonPath(id,locale).slice('courses/'.length));
    const lab=gold.clarity?.laboratory??gold.laboratory;
    assert.equal(lab.title,languages[locale].title,id);
    assert.equal(lab.steps.length,languages[locale].stepCount,id);
    assert.ok(lab.challenge&&lab.cases.length&&lab.starterCode&&lab.referenceCode&&lab.rubric.length,id);
  }
  console.log('PASS: 67 C++ labs, 13 projects, '+editions[0].length+' C17 references, both locales');
}
