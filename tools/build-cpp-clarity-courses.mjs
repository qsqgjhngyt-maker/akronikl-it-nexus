// Содержательная сборка последовательных уроков из действующих учебных материалов.
// Принятые три образца R3 остаются отдельным неизменяемым эталоном.
import {readFile,writeFile,mkdir,glob} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {GOLD_STRUCTURED_LESSONS} from '../core/academy-gold-catalog.js';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const write=async(p,v)=>{await mkdir(path.dirname(p),{recursive:true});await writeFile(p,JSON.stringify(v,null,2)+'\n');};
// Сохранить историческое написание метаданных C++ на любой ОС; это не путь для чтения.
const cppSourceRef=p=>p.replaceAll('/','\\');
const pilots=new Set(['cpp.programming-process','onec.p2.topic-1','onec.p7.topic-2']);
const authoredIds=new Set(['cpp.algorithm-definition-properties','cpp.algorithm-representations','cpp.pseudocode-euclidean-algorithm','cpp.flowcharts','cpp.top-down-design','cpp.sequence-branching-loops','cpp.languages-compilation-debugging','cpp.tokens-identifiers-keywords','cpp.increment-decrement-sizeof-conditional','cpp.data-types','cpp.first-cpp-program','cpp.comments-constants-literals','cpp.variables-scope','cpp.expressions-operators-blocks','cpp.arithmetic-assignment','cpp.type-conversions','cpp.relations-logic','cpp.pointers-references-addresses','cpp.standard-io']);
for(const id of GOLD_STRUCTURED_LESSONS)authoredIds.add(id);
const catalog=[],registry={},audit=[];
const cpp=await read('courses/cpp/curriculum.json');
const gold=new Map();for await(const p of glob('courses/cpp/gold/**/*.ru.json')){const g=await read(p);gold.set(g.lessonId,p);}
const say=(locale,ru,en)=>locale==='en'?en:ru;
const section=(id,title,paragraphs,more={})=>({id,title,paragraphs,...more});
const numberedSteps=(steps,locale,where)=>steps.map(action=>({where,action,why:'',expected:''}));
function cppExample(x,id,locale){return section(id,x.title,x.purpose?[x.purpose]:[],{code:{language:'cpp',source:x.code,output:x.expectedStdout,stdin:x.stdin||''},steps:x.steps||[],...(x.trace?{trace:x.trace.map(t=>[t.line,t.before,t.after,t.why].map(v=>typeof v==='string'&&v.includes(' / ')&&/[А-Яа-я]/.test(v)&&/[A-Za-z]/.test(v)?v.split(' / ')[locale==='en'?1:0]:v))}:{})});}
const cppCatalog={id:'cpp',title:{ru:'Программирование на C++',en:'C++ programming'},topics:[]};
for(const m of cpp.sections){for(const t of cpp.lessons.filter(t=>t.sectionId===m.id).sort((a,b)=>(a.learningOrder??a.order)-(b.learningOrder??b.order))){cppCatalog.topics.push({id:t.id,title:t.title,module:m.title,moduleId:m.id});}}
assert.equal(cppCatalog.topics.length,67);catalog.push(cppCatalog);
// Место разобранных примеров задано по ходу объяснения, а не отдельным блоком после всей теории.
const exampleAfter={
 'functions-contracts':[1,3],'standard-sequences':[1,3],'lifetime-ownership':[1,4],
 'testing-diagnostics':[1,3],'multifile-build':[1,3],'algorithm-complexity':[1,4],
 'iterators-algorithms-lambdas':[2,4],'recursion-divide-conquer':[1,4],'associative-containers':[1,4],
 'property-testing-benchmarks':[1,4],'raii-smart-pointers':[1,4],'value-copy-move':[1,4],
 'composition-inheritance-polymorphism':[2,4],'exceptions-guarantees':[1,4],'templates-concepts':[1,4],
 'design-testability-refactoring':[2,4],'event-queues-dispatch':[1,4],'states-typed-events':[1,4],
 'model-view-presenter':[2,4],'validated-user-commands':[1,4],'callback-lifetime-subscriptions':[1,4],
 'responsive-work-cancellation':[1,4],'versioned-model-persistence':[1,4],'event-testing-replay':[1,4],
 'multifile-event-application':[2,4],'qt-graphical-adapter':[2,4],'application-build-delivery':[2,5],
 'if-else-switch':[1,3],'while-do-while':[1,3],'for-loop':[1,3],'one-dimensional-arrays':[1,3],
 'two-dimensional-arrays':[1,3],'char-arrays-strings':[1,3],'formatted-io':[1,3],
 'streams-state':[1,3],'files':[1,3],'structures':[1,3],'unions-typedef-enums':[1,3],
 'linked-lists':[1,3],'stacks-queues':[1,3],'search-linear-binary':[1,4],
 'sorting-basic':[1,3,5],'pseudo-random-numbers':[1,4],'oop-principles':[1,4],
 'classes-objects-state-control':[1,4],'constructors-destructors':[1,4],'visual-event-model':[1,5]
};
for(const topic of cppCatalog.topics){
 for(const locale of ['ru','en']){
  if(pilots.has(topic.id))continue;
  const source=gold.get(topic.id).replace(/\.ru\.json$/,'.'+locale+'.json'),g=await read(source),c=g.clarity;
  const sections=[];
  let lab=g.laboratory;
  if(c){
   // Убираем прежний дублирующий слой «Углубление». Одна мысль → разобранный пример → изменённое условие → собственная работа.
   sections.push(section('model',say(locale,'От задачи к действию','From the task to an operation'),c.model));
   sections.push(cppExample(c.example,'worked-example',locale));
   sections.push(section('variation',say(locale,'Изменим условие и проверим прогноз','Change one condition and check the prediction'),[c.training.challenge,...c.training.hints],{code:{language:'cpp',source:c.training.variants.at(-1).code,stdin:c.training.stdin||'',output:c.training.expectedStdout}}));
   sections.push(section('diagnose',say(locale,'Если результат не совпал','When the result differs'),[c.negative]));
   lab=c.laboratory;
   sections.push(section('independent-work',say(locale,'Теперь выполните свою задачу','Now solve your own task'),[lab.challenge,say(locale,'В разделе «Практика» находится отдельная заготовка. Сначала запишите ожидаемый результат, затем изменяйте свою программу. Возвращение к примеру не заменяет ваш исходник.','Practice contains a separate starter. Predict the result before changing your program. Returning to the example does not replace your source.')]));
  }else{
   const slots=exampleAfter[topic.id.slice(4)];assert.ok(slots,topic.id);
   for(const [i,s]of g.sections.entries()){
    const paragraphs=[...s.paragraphs];
    // В этой лабораторной проверяется площадь, а не строка: убрана ошибочная ссылка на чужое условие.
    if(topic.id==='cpp.functions-contracts'&&i===1)paragraphs[1]=say(locale,'Небольшие целые обычно передают по значению. Параметр int& result в checkedArea нужен, потому что функция записывает проверенную площадь в объект вызывающего кода. Ссылка должна обозначать живой объект; ссылка на локальную переменную после возврата использоваться не может.','Small integers are usually passed by value. The int& result parameter in checkedArea lets the function store the validated area in the caller’s object. A reference must name a live object; a reference to a local variable cannot be used after that variable’s lifetime ends.');
    sections.push(section('concept-'+(i+1),s.title,paragraphs));
    for(const [j,x]of g.workedExamples.entries())if(slots[j]===i)sections.push(cppExample(x,'example-'+(j+1),locale));
   }
   assert.equal(sections.filter(s=>s.code).length,g.workedExamples.length,topic.id);
  }
  const predictions=c?[...new Set([...c.training.variants.map(v=>v.stdout),c.training.expectedStdout])]:[];if(c&&predictions.length<2)predictions.push(say(locale,'Ошибка компиляции','Compilation fails'));
  const questions=c?[
   {id:'predict',kind:'choice',prompt:say(locale,'Какой вывод получится после указанного изменения?','What output follows the specified change?')+' '+c.training.challenge,options:predictions,correct:predictions.indexOf(c.training.expectedStdout),feedback:c.training.hints.join(' ')},
   {id:'explain',kind:'free',prompt:lab.challenge,feedback:lab.rubric.join(' ')}
  ]:g.assessment.map((q,i)=>({id:'check-'+i,kind:'choice',prompt:q.question,options:q.answers,correct:q.correctIndex,feedback:q.explanation}));
  if(!c)questions.push({id:'explain',kind:'free',prompt:g.reflection?.[0]||g.lead,feedback:g.bridge||g.lead});
  const qt=g.runtimeTarget==='qt-wasm'||lab.target==='qt-wasm';
  const entries=Object.entries(qt?lab.starterFiles||{}:{'main.cpp':lab.starterCode,...lab.starterFiles}),files=entries.map(([path,content])=>({path,content}));
  const entry=lab.metadata?.entryFile||files.find(f=>f.path==='main.cpp')?.path||files[0].path;
  files.sort((a,b)=>(a.path===entry?-1:b.path===entry?1:0));
  const practice={title:lab.title,task:lab.challenge,kind:qt?'qt-project':'cpp-console',environment:g.target||'C++20',files,metadata:lab.metadata||{},stdin:lab.stdin??lab.cases[0]?.stdin??'',returnAnchor:c?'worked-example':'example-1',cases:lab.cases.map((x,i)=>({label:x.purpose||say(locale,'Случай ','Case ')+(i+1),input:qt?(x.actions||[]).join('\n'):x.stdin,output:qt?x.expected:x.stdout})),criteria:lab.rubric,hint:c?c.training.hints.join(' '):g.practice.find(p=>p.level==='applied')?.hint||g.practice[0].hint,steps:numberedSteps(lab.steps,locale,qt?'Project Studio':say(locale,'Моя программа','My program')),...(g.modulePracticum?{modulePracticum:g.modulePracticum}:{}),...(g.delivery?{delivery:g.delivery}:{})};
  const lesson={schemaVersion:1,contentRevision:'clarity-courses-v1',id:topic.id,courseId:'cpp',moduleId:topic.moduleId,course:cppCatalog.title[locale],module:topic.module[locale],locale,title:g.title,goal:c?.goal||g.lead,prerequisites:(c?.prerequisites||g.prerequisites).map(text=>({text})),sections,selfcheck:questions,practice,terms:g.concepts,sourceRefs:g.sourceRefs,extras:{lessonId:topic.id,locale,visualization:c?null:g.visualization,sourceRefs:g.sourceRefs,blockPracticum:g.blockPracticum,modulePracticum:g.modulePracticum,laboratory:{delivery:g.laboratory.delivery}},sourcePath:source};
  if(g.teachingEdition){const a=g.teachingEdition;assert.ok(authoredIds.has(topic.id),'Author edition needs explicit block scope');Object.assign(lesson,{contentRevision:a.revision,title:a.title,goal:a.goal,prerequisites:a.prerequisites,sections:a.sections,selfcheck:a.selfcheck,practice:a.practice,reading:a.reading,authored:true});}
  lesson.sourcePath=cppSourceRef(source);
  await write('courses/clarity/lessons/'+topic.id+'.'+locale+'.json',lesson);
  if(locale==='ru'){registry[topic.id]={courseId:'cpp',languageId:'cpp',runtime:lesson.practice.kind,questions:Object.fromEntries(lesson.selfcheck.map(q=>[q.id,q.kind==='free'?'free':q.options.length])),...(g.teachingEdition?{contentRevision:g.teachingEdition.revision}:{})};audit.push({id:topic.id,source:cppSourceRef(source),sections:lesson.sections.map(s=>s.id),runtime:lesson.practice.kind});}
 }
}
for(const courseId of ['onec','1c-enterprise']){
 const c=await read('courses/'+courseId+'/curriculum.json'),course={id:courseId,title:c.title,topics:[]};catalog.push(course);
 for(const m of c.modules.filter(m=>m.status==='IMPLEMENTED'))for(const t of m.topics.filter(t=>t.status==='IMPLEMENTED')){
  course.topics.push({id:t.topicId,title:t.title,module:m.title,moduleId:m.moduleId});
  for(const locale of ['ru','en']){
   if(pilots.has(t.topicId))continue;
   const source='courses/'+courseId+'/'+t.content[locale],g=await read(source),sections=[];
   for(const [i,s]of g.sections.entries()){
    sections.push(section('theory-'+(i+1),s[0],s.slice(1)));
    const exampleIndex=i===0?0:i===Math.min(2,g.sections.length-1)?1:-1,x=g.examples?.[exampleIndex];
    if(x)sections.push(section('example-'+(exampleIndex+1),x.title,x.explanation?[x.explanation]:[],{code:{language:'text',source:x.source,output:x.expected},...(x.trace?{tables:[{caption:say(locale,'Разбор по шагам','Step-by-step reasoning'),columns:say(locale,['Действие или состояние','Что наблюдаем','Почему'],['Action or state','Observation','Reason']),rows:x.trace}]}:{})}));
   }
   sections.push(section('diagnostics',say(locale,'Как проверить своё объяснение','Check your explanation'),g.mistakes.map(([mistake,fix])=>mistake+' '+fix)));
   const questions=g.quiz.map((q,i)=>({id:'check-'+i,kind:'choice',prompt:q.question,options:q.options,correct:q.correct,feedback:q.explanation}));
   questions.push({id:'explain',kind:'free',prompt:g.exercises.at(-1).task,feedback:g.exercises.at(-1).criteria});
   const code=g.codeFile?await readFile('courses/onec-education/'+g.codeFile,'utf8'):null;
   const practice={kind:'installed-1c',title:g.lab.title,task:g.exercises.at(-1).task,environment:g.lab.environment,externalRoute:g.experience?.route?.program||'',files:code?[{path:'lesson.bsl',content:code}]:[],returnAnchor:'example-1',steps:g.experience?.route?.steps||g.lab.steps.map((action,i)=>({where:g.lab.environment,action,expected:g.lab.expected[i]||'',why:''})),cases:g.lab.expected.map((output,i)=>({label:say(locale,'Наблюдение ','Observation ')+(i+1),input:'',output})),criteria:[...g.exercises.map(e=>e.criteria),...g.lab.evidence,g.lab.negative],hint:g.mistakes[0]?.[1]||'',exercises:g.exercises,sourceFile:g.codeFile||null,setupGuide:true};
   const lesson={schemaVersion:1,contentRevision:'clarity-courses-v1',id:t.topicId,courseId,moduleId:m.moduleId,course:c.title[locale],module:m.title[locale],locale,title:g.title,goal:g.goal,prerequisites:g.prerequisites.map(text=>({text,setup:true})),sections,selfcheck:questions,practice,terms:g.experience?.termIds||[],sourcePath:source,assessment:{contentRevision:g.contentRevision,sharedRefs:g.sharedRefs||[],quiz:g.quiz}};
   await write('courses/clarity/lessons/'+t.topicId+'.'+locale+'.json',lesson);
   if(locale==='ru'){registry[t.topicId]={courseId,languageId:'bsl',runtime:'installed-1c',questions:Object.fromEntries(questions.map(q=>[q.id,q.kind==='free'?'free':q.options.length]))};audit.push({id:t.topicId,source,sections:sections.map(s=>s.id),runtime:'installed-1c'});}
  }
 }
}
for(const id of pilots){const q=await read('courses/cpp-clarity-r3/lessons/'+id+'.ru.json');registry[id]={courseId:q.courseId,languageId:id==='onec.p7.topic-2'?'1c-query':id.startsWith('cpp.')?'cpp':'bsl',runtime:id.startsWith('cpp.')?'cpp-console':'installed-1c',questions:Object.fromEntries(q.selfcheck.map(q=>[q.id,q.kind==='free'?'free':q.options.length])),pilot:true};}
assert.equal(Object.keys(registry).length,151);
await write('courses/clarity/courses.json',catalog);
await write('courses/clarity/editorial-map.json',{contentRevision:'clarity-courses-v1',formatAcceptedByOwner:'2026-11-05',status:'IMPLEMENTED CONTENT CANDIDATE — understanding not measured',topics:audit});
await writeFile('core/clarity-course-registry.mjs','// Только канонические темы. Получено из программ действующих курсов; PLANNED не включены.\nexport const CLARITY_COURSES = Object.freeze('+JSON.stringify(registry)+');\n');
console.log(JSON.stringify({courses:catalog.map(c=>({id:c.id,topics:c.topics.length})),adapted:audit.length,preservedPilots:pilots.size,locales:2}));
