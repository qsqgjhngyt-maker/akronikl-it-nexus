import {CLARITY_COURSES} from './clarity-course-registry.mjs';
import {clarityContentRevision} from './cpp-clarity-r3-state.mjs';
import {codeStudioMarkup,bindCodeStudio} from '../sandbox/code-studio.js';
import {createLearningSession,createClarityRunObserver} from './cpp-clarity-r3-session.mjs';
import {emptyClarityDraft,validateClarityDraft,answerIsChecked,CLARITY_CONTENT_REVISION,snapshotDigests,canonicalJson} from './cpp-clarity-r3-state.mjs';
import {referenceCourseStyles,mountReferenceNavigation} from './reference-course-ui.mjs';
import {evaluateReferenceRun} from './reference-practice-assessment.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const R3_TOPICS=Object.freeze(Object.keys(CLARITY_COURSES));
const stages=['explanation','selfcheck','practice'],cache=new Map();
export async function clarityResource(path){const id=path.match(/^lessons\/(.+)\.(ru|en)\.json$/)?.[1],folder=path==='courses.json'||(id&&!CLARITY_COURSES[id]?.pilot)?'clarity':'cpp-clarity-r3';const url=new URL('../courses/'+folder+'/'+path,import.meta.url);if(!cache.has(path))cache.set(path,fetch(url,{credentials:'omit'}).then(r=>{if(!r.ok)throw Error('R3_RESOURCE_UNAVAILABLE');return r.json();}).catch(e=>{cache.delete(path);throw e;}));return cache.get(path);}
export async function mountClarityLesson(root,{topicId,locale='ru',adapter=null,isCurrent=()=>true,onViewChange=()=>{},openAssistant=null}={}){
 if(!R3_TOPICS.includes(topicId))throw Error('R3_TOPIC_REJECTED');
 const [lesson,catalog]=await Promise.all([clarityResource('lessons/'+topicId+'.'+locale+'.json'),clarityResource('courses.json')]);
 if(!isCurrent())return null;
 let disposed=false,studio=null,runtime=null,session=null,publicDraft=emptyClarityDraft(topicId),initial=null,readyEditor=null;
 const live=()=>!disposed&&isCurrent()&&(!adapter||adapter.isCurrent());
 const route={id:topicId,locale,stage:'explanation'},course=catalog.find(c=>c.topics.some(t=>t.id===topicId)),topic=course.topics.find(t=>t.id===topicId);
 const en=locale==='en',say=(ru,enText)=>en?enText:ru,contentRevision=clarityContentRevision(topicId);
 let disposeTerms=null,disposeProgress=null,disposeNavigation=null,contextObserver=null;
 const notifyView=()=>{if(live())onViewChange({courseId:lesson.courseId,lessonId:topicId,sectionId:route.stage,locale,hash:location.hash});};
const words = {
 ru:{explanation:'Объяснение',selfcheck:'Самопроверка',practice:'Практика',program:'Программа курса',previous:'Предыдущая тема',next:'Следующая тема',first:'Первая тема курса',goal:'После урока',required:'Что нужно до начала',source:'Разобранный пример',output:'Ожидаемый вывод',trace:['Строка','До','После','Почему'],check:'Проверить ответ',free:'Сохранить объяснение в открытом просмотре',return:'Вернуться к объяснению',nextStage:'Дальше',review:'Образцы R3 · ожидают review 03/07',scope:'Работа хранится в памяти этого открытого просмотра. Переключение раздела и темы сохраняет её. Обновление страницы и закрытие окна удалят черновик; скачайте файл перед выходом.',work:'Моя самостоятельная работа',file:'Текущий файл',stdin:'Вход программы (stdin)',reported:'Моя запись результата внешнего запуска',record:'Записать результат для текущей версии файлов',download:'Скачать текущий файл',example:'Посмотреть пример без замены моей работы',setup:'Подготовка среды',criteria:'Как проверить свою работу',hint:'Подсказка',outside:'Эта соседняя тема пока вне трёх образцов R3.',outsideText:'Название и место взяты из действующей программы курса. Содержимое этой темы здесь не переписано. Возвращение к образцу сохраняет открытый черновик.',openR2:'Открыть действующую тему в отдельной вкладке (локальный стенд R2)',back:'Вернуться к образцу',runtime:'Экран для review: запуск кода здесь ещё не подключён. Файл можно скачать и выполнить в указанной среде. Записанный ниже результат — ваш самоотчёт, а не проверка платформой.',saved:'Записано для текущей версии. Это самоотчёт.',stale:'Файлы или вход изменились после записи результата. Выполните программу снова.',none:'Результат ещё не записан.',unrecorded:'Текст самоотчёта изменён — изменения ещё не записаны.',draft:'Необязательный браузерный черновик',draftNote:'Можно работать сразу в Конфигураторе. Этот файл не синхронизируется с 1С; снимок ниже содержит только браузерный черновик и вашу запись, а не проверенный исходник внешнего запуска.',outsideChoice:'Тема вне образцов R3',answerDraft:'Ответ ещё не проверен.',freeSaved:'Объяснение сохранено в памяти просмотра; правильность автоматически не оценивается.',close:'Закрыть',prepTitle:'Подготовка отдельной учебной среды',optional:'По необходимости',snapshot:'Версия файлов результата',notCompleted:'Открытие раздела не создаёт попытку и не завершает тему.'},
 en:{explanation:'Explanation',selfcheck:'Self-check',practice:'Practice',program:'Course outline',previous:'Previous topic',next:'Next topic',first:'First topic in this course',goal:'After this lesson',required:'Before you start',source:'Worked example',output:'Expected output',trace:['Line','Before','After','Why'],check:'Check answer',free:'Keep explanation in this open preview',return:'Return to explanation',nextStage:'Continue',review:'R3 samples · awaiting 03/07 review',scope:'Work stays in memory in this open preview. Switching stages and topics preserves it. Refreshing or closing the window discards drafts; download your file before leaving.',work:'My independent work',file:'Current file',stdin:'Program input (stdin)',reported:'My record of an external run',record:'Record result for the current file versions',download:'Download current file',example:'View example without replacing my work',setup:'Environment setup',criteria:'How to check your work',hint:'Hint',outside:'This neighbouring topic is outside the three R3 samples.',outsideText:'Its title and position come from the current course outline. Its content has not been rewritten here. Returning to a sample keeps your open draft.',openR2:'Open the current topic in a separate tab (local R2 preview)',back:'Return to sample',runtime:'Review screen: code execution is not connected here yet. Download the file and run it in the specified environment. A result entered below is your self-report, not platform verification.',saved:'Recorded for this version. This is a self-report.',stale:'Files or input changed after the result was recorded. Run your program again.',none:'No result recorded yet.',unrecorded:'Self-report text changed — edits have not been recorded.',draft:'Optional browser draft',draftNote:'You can work directly in Designer (Configurator). This file is not synchronised with 1C; the snapshot below contains only the browser draft and your record, not verified source from the external run.',outsideChoice:'Topic outside the R3 samples',answerDraft:'Answer not checked yet.',freeSaved:'Explanation kept in preview memory; correctness is not graded automatically.',close:'Close',prepTitle:'Prepare a separate learning environment',optional:'If needed',snapshot:'Result file version',notCompleted:'Opening a stage creates no attempt and completes no topic.'}
};

 function position(params,fallback='explanation'){const old=params.get('section')||params.get('focus')||'',requested=params.get('stage');return {stage:stages.includes(requested)?requested:/^(practice|lab|laboratory|code|sandbox|step-)/.test(old)?'practice':/^(quiz|knowledge|selfcheck)$/.test(old)?'selfcheck':old?'explanation':fallback,anchor:params.get('at')||(/^theory-\d+$|^step-/.test(old)?old:old==='examples'?'example-1':'')};}
 const text=()=>words[locale],w=text();
 w.free=say('Сохранить объяснение','Save explanation');w.freeSaved=say('Объяснение сохранено; правильность автоматически не оценивается.','Explanation saved; correctness is not graded automatically.');
 const url=(id=topicId,stage=route.stage,language=locale,anchor='')=>'#'+new URLSearchParams({course:CLARITY_COURSES[id]?.courseId||lesson.courseId,lesson:id,stage,locale:language,...(anchor?{at:anchor}:{}),...(id===topicId&&new URLSearchParams(location.hash.slice(1)).has('copy')?{copy:new URLSearchParams(location.hash.slice(1)).get('copy')}:{})});
function table(t){
 const state=lesson.authored&&t.columns.length===2&&(lesson.moduleId==='cpp.section.structured-programming'||t.kind==='state');
 const wide=lesson.authored&&(t.columns.length>=3||state);
 const attributes=wide?` data-wide-table${state?'="state"':''} tabindex="0" role="region" aria-label="${esc(t.caption)}"`:'';
 const note=wide?`<p class="table-scroll-note">${say('Таблицу можно прокрутить вправо.','Scroll the table to see more.')}</p>`:'';
 return `${note}<div class="table-wrap"${attributes}><table><caption>${esc(t.caption)}</caption><thead><tr>${t.columns.map(x=>`<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function programFiles(files,label,after=''){
 if(!files)return '';
 const entries=Object.entries(files);
 return entries.length?`<details class="program-files"><summary>${label}</summary>${entries.map(([path,content])=>
  `<p>${esc(path)}</p><pre data-program-file="${esc(path)}"><code>${esc(content)}</code></pre>`
 ).join('')}${after}</details>`:`<p>${say('Входных файлов нет','No input files')}</p>`;
}
function programBundle(bundle){
 const metadata=bundle?.metadata;
 const compilation=metadata?.translationUnits?.length?`<p class="program-build">${say('Компилируются','Translation units')}: ${esc(metadata.translationUnits.join(', '))}.
  ${metadata.includeRoots?.length?`${say('Каталоги заголовков','Include roots')}: ${esc(metadata.includeRoots.join(', '))}.`:''}</p>`:'';
 const qtTarget=metadata?.target==='qt-wasm'?`<p class="program-build">Qt/WebAssembly · ${say('входной файл','entry file')}: ${esc(metadata.entryFile||'src/gui.cpp')}. ${say('Полный набор откройте в отдельной копии Project Studio. Консольный Clang/WASI не содержит Qt.','Open the complete bundle in a separate Project Studio copy. Console Clang/WASI does not contain Qt.')}</p>`:'';
 return bundle?programFiles(bundle.files,say('Входные файлы','Input files'))+compilation+qtTarget:'';
}
function code(source,output,stdin='',label=w.source,bundle){
 const hasOutput=output!==undefined,native=lesson.authored&&lesson.courseId!=='cpp';
 return `<div class="example-layout"${hasOutput?'':' data-example-single'}${native&&bundle?.language==='text'?' data-observation-example':''}>
  <div><div class="example-label">${label}</div><pre><code>${esc(source)}</code></pre>
  ${stdin?`<p>${say('Ввод примера','Example input')}</p><pre>\n${esc(stdin)}</pre>`:''}</div>
  ${hasOutput?`<div class="example-output"><div class="example-label">${bundle?.metadata?.target==='qt-wasm'?say('Технический журнал при запуске','Diagnostic log on startup'):native?say('Ожидаемое наблюдение','Expected observation'):w.output}</div>${native?`<p class="practice-observation" data-expected-output>${esc(output)}</p>`:`<pre data-expected-output>\n${esc(output)}</pre>`}</div>`:''}
 </div>${programBundle(bundle)}${programFiles(bundle?.outputFiles,say('Ожидаемые файлы результата','Expected output files'))}`;
}
function questionCode(example){
 if(!example)return '';
 const {source,stdin}=typeof example==='string'?{source:example}:example;
 const bundle=typeof example==='object'?{files:example.files,metadata:example.metadata}:undefined;
 return code(source,undefined,stdin,external?w.source:say('Код для вопроса','Code for this question'),bundle);
}
function prerequisite(p){return `${esc(p.text)}${p.target?` <a href="${url(p.target,'explanation')}">${text().program} →</a>`:''}${p.setup?` <button class="button quiet" data-action="setup">${text().setup}</button>`:''}`;}
function clarification(d){
 const links=d.links||[];
 return `<details class="clarification"><summary>${esc(d.title)}</summary><p>${esc(d.text)}</p>
  ${links.length?`<ul class="clarification-links">${links.map(a=>
   `<li><a href="${url(a.target||a.id,'explanation')}">${esc(a.text||a.label||a.title)}</a></li>`
  ).join('')}</ul>`:''}
 </details>`;
}
const authorModule=lesson.authored?await import('./cpp-clarity-authored.mjs'):null;
 if(!live())return null;
 const authoredMedia=lesson.authored&&lesson.sections.some(s=>s.figures?.length)?await import('../courses/onec-education/lesson-media.mjs'):null;
 const author=authorModule?.authoredMarkup(lesson,{code,table,url,programBundle,figures:items=>(items||[]).map(f=>'<div class="authored-native-media">'+authoredMedia.lessonFiguresMarkup([f],locale,false,f.assetRoot==='clarity'?new URL('../courses/clarity/',import.meta.url):undefined,true)+'</div>').join('')});
function explanation(){if(author)return author.explanation();const w=text();return `<div class="intro"><div class="eyebrow">${w.goal}</div><h1>${esc(lesson.title)}</h1><p class="goal">${esc(lesson.goal)}</p><div class="prerequisites"><strong>${w.required}</strong><ul>${lesson.prerequisites.map(p=>`<li>${prerequisite(p)}</li>`).join('')}</ul></div></div>${lesson.sections.map((s,i)=>`<section class="lesson-section" id="${s.id}"><div class="section-index">${String(i+1).padStart(2,'0')} / ${String(lesson.sections.length).padStart(2,'0')}</div><h2>${esc(s.title)}</h2>${s.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}${s.code?code(s.code.source,s.code.output,s.code.stdin):''}${s.steps?.length?`<ol>${s.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol>`:''}${(s.tables||[]).map(table).join('')}${s.trace?`<div class="trace-wrap"><table><caption>${route.locale==='ru'?'Разбор выполнения по шагам':'Execution, step by step'}</caption><thead><tr>${w.trace.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${s.trace.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}${(s.clarifications||[]).map(clarification).join('')}</section>`).join('')}<div class="next-card"><span>${w.notCompleted}</span><a class="button primary" href="${url(route.id,'selfcheck')}">${w.selfcheck} →</a></div>`;}
function practiceSteps(p){const w=text();
 const notes=s=>p.starterRevision?`<p data-step-why><strong>${say('Зачем','Why')}</strong> ${esc(s.why)}</p><p data-step-expected><strong>${say('Что должно получиться','What to expect')}</strong> ${esc(s.expected)}</p>`:`<p class="muted">${esc(s.why)}</p><p>${esc(s.expected)}</p>`;
 return p.steps?`<section class="practice-card practice-steps"><h2>${w.practice}: ${route.locale==='ru'?'по шагам':'step by step'}</h2><ol class="steps">${p.steps.map(s=>`<li ${s.id?`id="step-${esc(s.id)}"`:''}><div class="where">${esc(s.where)}</div><p>${esc(s.action)}</p>${notes(s)}${s.code?code(s.code):''}${s.before?`<details><summary>${say('Перед этим шагом','Before this step')}</summary><p>${esc(s.before)}</p></details>`:''}${s.troubleshooting?`<details><summary>${say('Если не получилось','Troubleshooting')}</summary><p>${esc(s.troubleshooting)}</p></details>`:''}${s.figures?.length?`<div data-course-figures="${esc(s.id)}"></div>`:''}</li>`).join('')}</ol></section>`:'';}
function queryTransfer(t){return t?`<details class="clarification query-transfer"><summary>${esc(t.title)}</summary><p>${esc(t.text)}</p>${t.functions.map(f=>`<pre><code>${esc(f)}</code></pre>`).join('')}<p>${esc(t.execution)}</p><pre><code>${esc(t.calls)}</code></pre></details>`:'';}
 const draft=()=>session?.draft||publicDraft;
 const external=CLARITY_COURSES[topicId].courseId!=='cpp',qt=CLARITY_COURSES[topicId].runtime==='qt-project',reported=external||qt;
 const workSeed=()=>({workspace:{languageId:external?'onec':'cpp',entryFile:lesson.practice.files[0].path,activeFile:lesson.practice.files[0].path,revision:0,files:lesson.practice.files.map(f=>({path:f.path,content:f.content,languageId:external?'onec':'cpp',readOnly:false}))},code:lesson.practice.files[0].content,stdin:lesson.practice.stdin||''});
 let currentWork=null;
 const capture=()=>{
  if(!studio)return {work:currentWork,cursor:draft().cursor};
  const c=studio.captureForPersistence(),entry=c.workspace.files.find(f=>f.path===c.workspace.entryFile);
  return {work:{workspace:c.workspace,code:entry?.content||'',stdin:external?'':root.querySelector('#stdin')?.value||''},cursor:c.cursor};
 };
 const status=(kind,error)=>{
  if(!live())return;const node=root.querySelector('[data-r3-save]');if(!node)return;
  node.dataset.state=kind;
  const messages={restored:say('Восстановлена сохранённая работа.','Saved work restored.'),saved:say('Сохранено на этом устройстве.','Saved on this device.'),dirty:say('Есть несохранённые изменения.','Unsaved changes.'),saving:say('Сохраняем…','Saving…'),partial:say('Файлы сохранены, ответы или место занятия — ещё нет. Повторите сохранение.','Files saved; answers or lesson position are still unsaved. Retry saving.'),error:say('Не удалось сохранить. Работа остаётся в этом окне. Повторите сохранение или скачайте её.','Could not save. Your work remains in this window. Retry or download it.'),branched:say('Создана отдельная локальная копия: другая вкладка изменила прежнюю.','A separate local copy was created because another tab changed the previous copy.')};
  node.textContent=messages[kind]||messages.error;if(kind==='branched')node.textContent+=' '+say('Копия ','Copy ')+error.id.slice(0,8)+say(', версия ', ', revision ')+error.revision+'.';
  if(kind==='error'&&/CONFLICT/.test(error?.code||error?.message||''))node.textContent=say('Другая вкладка изменила сохранённую работу. Ваша версия остаётся здесь; скачайте её перед повторным открытием.','Another tab changed the saved work. Your version remains here; download it before reopening.');
  for(const b of root.querySelectorAll('[data-r3-retry],[data-r3-export]'))b.hidden=!['error','partial'].includes(kind);
 };
 if(adapter){initial=adapter.read();currentWork=initial.work;session=createLearningSession({topicId,adapter,capture,onStatus:status,onSaved:()=>{if(acceptedHash!==location.hash)notifyView();acceptedHash=location.hash;const copy=new URLSearchParams(location.hash.slice(1)).get('copy');if(copy)for(const link of root.querySelectorAll('a[href^="#"]')){const p=new URLSearchParams(link.hash.slice(1));if(p.get('lesson')===topicId){p.set('copy',copy);link.hash=p.toString();}}}});}
 if(!currentWork&&!reported&&typeof initial?.entry?.code==='string'){const code=initial.entry.code;currentWork={code,stdin:initial.entry.stdin||'',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:0,files:[{path:'main.cpp',content:code,languageId:'cpp'}]}};}
 currentWork ||= !reported?workSeed():null;
 let d=draft();const requested=position(new URLSearchParams(location.hash.slice(1)),d.stage);route.stage=requested.stage;
 const idx=course.topics.findIndex(t=>t.id===topicId);
 const neighbor=(t,label)=>t?`<a href="${url(t.id,'explanation')}">${label}</a>`:'';
 function selfcheck(){return `<h1>${w.selfcheck}</h1><p>${esc(lesson.goal)}</p>${lesson.selfcheck.map(q=>{const a=d.answers[q.id];return `<form class="question" data-question="${q.id}"><fieldset><legend>${esc(q.prompt)}</legend>${questionCode(q.code)}${q.kind==='free'?`<textarea data-answer="${q.id}" aria-label="${esc(q.prompt)}" ${adapter?'':'disabled'}>${esc(a?.value||'')}</textarea>`:q.options.map((v,i)=>`<label class="option"><input type="radio" name="${q.id}" value="${i}" data-answer="${q.id}" ${a?.value===i?'checked':''} ${adapter?'':'disabled'}><span>${esc(v)}</span></label>`).join('')}<button class="btn" ${adapter?'':'disabled'}>${q.kind==='free'?w.free:w.check}</button></fieldset><div data-feedback="${q.id}" role="status"></div>${q.recall?`<button type="button" class="btn" data-recall="${esc(q.recall)}">${say('Вспомнить теорию','Recall the rule')}</button>`:''}</form>`;}).join('')}<div data-course-checkpoint></div><a class="btn" href="${url(topicId,'practice')}">${w.practice} →</a>`;}
 function practiceCases(p){
  if(reported&&!qt&&!(external&&lesson.authored))return p.cases.map(c=>`<h3>${esc(c.label)}</h3><pre>${esc(c.input)}</pre>${c.output!==undefined?`<pre data-expected-output>${esc(c.output)}</pre>`:''}${c.table?table(c.table):''}`).join('');
  if(!p.cases.length)return '';
  return `<ol class="practice-cases">${p.cases.map(c=>{
   const values=c.output?.trim().split(/\s+/);
   const meaning=p.outputFields&&values?.length===p.outputFields.length
    ?`<dl class="practice-case-meaning">${p.outputFields.map((label,i)=>`<div><dt>${esc(label)}</dt><dd>${esc(values[i])}</dd></div>`).join('')}</dl>`
    :'';
   return `<li class="practice-case">
    <h3>${esc(c.label)}</h3>
    <dl class="practice-case-io">
     <div><dt>${qt||external&&lesson.authored?say('Действия в окне','Actions in the window'):say('Ввод в программу','Program input')}</dt><dd>${c.input?(external&&lesson.authored?`<p class="practice-observation">${esc(c.input)}</p>`:`<pre>\n${esc(c.input)}</pre>`):`<p>${say('Без ввода','No input')}</p>`}</dd></div>
     ${c.output!==undefined?`<div><dt>${qt||external&&lesson.authored?say('Ожидаемое наблюдение','Expected observation'):w.output}</dt><dd>${external&&lesson.authored?`<p class="practice-observation" data-expected-output>${esc(c.output)}</p>`:`<pre data-expected-output>\n${esc(c.output)}</pre>`}</dd></div>`:''}
    </dl>
    ${programFiles(c.files,say('Входные файлы для проверки','Input files for this case'))}
    ${programFiles(c.outputFiles,say('Ожидаемые файлы результата','Expected output files'))}
    ${c.fileChecks?.length?'<h4>'+say('Свойства файлов результата','Output file checks')+'</h4><ul>'+c.fileChecks.map(({path,description})=>'<li><code>'+esc(path)+'</code> · '+esc(description)+'</li>').join('')+'</ul>':''}
    ${meaning}
    ${c.table?table(c.table):''}
   </li>`;
  }).join('')}</ol>`;
 }
 function referenceDisclosure(){
  return `<details class="practice-card" data-lab-reference>
   <summary>${say('Эталонное решение (по запросу)','Reference solution (on request)')}</summary>
   <p>${external?say('Откройте после своей попытки и сравните объяснение и наблюдения.','Open after your own attempt and compare the reasoning and observations.'):say('Откройте после своей попытки и сравните ход решения. Код можно скопировать отдельно.','Open after your own attempt and compare the approach. You can copy the code separately.')}</p>
   <div data-lab-reference-content aria-live="polite"></div>
  </details>`;
 }
 function practiceChecks(p){
  return `<section class="practice-card"><h2>${w.criteria}</h2>${practiceCases(p)}<ul>${p.criteria.map(c=>`<li>${esc(c)}</li>`).join('')}</ul><details><summary>${w.hint}</summary><p>${esc(p.hint)}</p></details></section>`;
 }
 function starterDisclosure(p){
  const files=Object.fromEntries(p.files.map(({path,content})=>[path,content]));
  const result=p.starterObservation;
  const preview=result?.kind==='qt-ui'?`<div data-starter-observation><p><strong>${say('Первый запуск заготовки Qt','First run of the Qt starter')}</strong></p><p>${esc(result.description)}</p></div>`:result?`<div data-starter-observation>
   <p><strong>${say('Первый запуск заготовки','First run of the starter')}</strong></p>
   <p>${esc(p.cases[result.case].label)}. ${say('Вывод до выполнения TODO','Output before completing the TODOs')}.</p>
   ${result.stdout===''?'<p>'+say('Заготовка пока ничего не печатает.','The starter produces no output yet.')+'</p>':''}
   <pre data-starter-output>\n${esc(result.stdout)}</pre>
   <p>${say('Код завершения','Exit code')} ${result.exitCode}</p>
  </div>`:'';
  return programFiles(files,say('Посмотреть заготовку','View the starter files'),preview);
 }
 function workspaceCallout(p){
  const projects=[
   [p.blockPracticum||lesson.extras?.blockPracticum,'block-practicum',say('Практикум блока','Block practicum')],
   [p.modulePracticum||lesson.extras?.modulePracticum,'module-practicum',say('Итоговый практикум','Module practicum')],
  ].filter(([item])=>item);
  return `<section class="environment" data-r3-workspace-callout>
   <h2>${say('Где выполнять работу','Where to do the work')}</h2>
   <p>${external?say('Настоящий запуск выполняется в своей учебной 1С. После создания необязательного черновика можно открыть условие рядом с его редактором; окно не синхронизирует файлы с Конфигуратором.','Actual execution takes place in your learning 1C. After creating an optional draft you can open the task beside its editor; this window does not synchronise files with Designer.'):say('Откройте рабочее окно, чтобы видеть условие и контрольные случаи рядом с текущим редактором.','Open the work window to see the task and reference cases beside your current editor.')}</p>
   <div class="work-actions"><button type="button" class="btn primary" data-action="lab-window" ${external&&!currentWork?'disabled':''}>${say('Задание и Code Studio','Task and Code Studio')}</button>
    <a class="btn" href="#view=code-studio">${say('Отдельный проект в Code Studio','Separate project in Code Studio')}</a>
    ${projects.map(([,anchor,label])=>`<a class="btn" href="${url(topicId,'practice',locale,anchor)}">${label}</a>`).join('')}
   </div>
  </section>`;
 }
 let labReferencePromise;
 async function labReference(){
  if(lesson.practice.referenceSolution)return lesson.practice.referenceSolution;
  if(!labReferencePromise)labReferencePromise=(async()=>{
   const {goldLessonPath}=await import('./academy-gold-catalog.js');
   const response=await fetch(new URL('../'+goldLessonPath(topicId,locale),import.meta.url),{credentials:'omit'});
   if(!response.ok)throw Error('LAB_REFERENCE_UNAVAILABLE');
   const gold=await response.json(),authored=gold.teachingEdition;
   if(authored?.referenceProgram)return {source:authored.referenceProgram,files:authored.referenceFiles,metadata:lesson.practice.metadata};
   const lab=CLARITY_COURSES[topicId].pilot?gold.clarity?.laboratory:gold.laboratory;
   if(!lab?.referenceCode)throw Error('LAB_REFERENCE_UNAVAILABLE');
   return {source:lab.referenceCode,files:lab.referenceFiles,metadata:lab.metadata};
  })().catch(error=>{labReferencePromise=null;throw error;});
  return labReferencePromise;
 }
 function practice(){
  const p=lesson.practice,canCreate=external&&p.files.length>0;
  return `<h1>${esc(p.title)}</h1><p class="goal">${esc(p.task)}</p>
  ${p.passport?`<details class="practice-card" data-practice-passport open><summary>${say('Паспорт задачи: что, где и как проверить','Task guide: what, where and how to check')}</summary><dl>${Object.entries(p.passport).map(([key,value])=>`<div><dt><strong>${esc(({goal:say('Цель','Goal'),start:say('Начальное состояние','Starting state'),where:say('Где работать','Where to work'),knowledge:say('Уже изучено','Already introduced'),change:say('Что менять','What to change'),inputs:say('Данные','Inputs'),result:say('Результат','Result'),checks:say('Проверка','Verification'),errors:say('Типичные ошибки','Common mistakes'),recovery:say('Восстановление','Recovery')})[key]||key)}</strong></dt><dd style="white-space:pre-wrap;margin:0 0 12px">${esc(value)}</dd></div>`).join('')}</dl></details>`:''}
  <section class="environment"><strong>${w.setup}</strong><p>${external?esc(p.environment):qt?say('Графическое приложение Qt выполняется в Project Studio. Для первоначальной подготовки Qt нужна сеть. Ваш C++ собирается на устройстве; консольный runner не запускает этот интерфейс.','The Qt graphical application runs in Project Studio. Initial Qt preparation requires a connection. Your C++ builds on the device; the console runner cannot run this interface.'):say('Штатный C++ runner Nexus. Технический запуск и объяснение решения проверяются отдельно.','The standard Nexus C++ runner. Execution and understanding are assessed separately.')}</p>${external?`<button class="btn" data-action="setup">${w.setup}</button>`:''}</section>
  ${external?`<p>${esc(p.externalRoute)}</p>${practiceSteps(p)}${queryTransfer(p.transfer)}`:''}
  ${p.exercises?`<section class="practice-card"><h2>${say('От разбора к самостоятельному действию','From the example to independent work')}</h2><ol>${p.exercises.map(x=>`<li><p>${esc(x.task)}</p><details><summary>${w.criteria}</summary><p>${esc(x.criteria)}</p></details></li>`).join('')}</ol></section>`:''}
  ${canCreate?`<h2>${w.draft}</h2><p>${w.draftNote}</p><button class="btn" data-r3-create ${adapter?'':'disabled'} ${currentWork?'hidden':''}>${say('Создать свою работу в Studio','Create my Studio work')}</button>`:''}
  ${!reported||external&&p.referenceSolution&&p.files.length?workspaceCallout(p):''}
  ${qt?`<p>${say('Откройте Project Studio в соседней вкладке и создайте новое приложение C++. Перенесите заготовку в отдельный проект; сохранённая работа останется на месте. Эта страница хранит условие и место чтения.','Open Project Studio in another tab and create a new C++ application. Copy the starter into a separate project; your saved work remains intact. This page retains the task and reading position.')}</p><a class="btn" href="./#view=project-studio" target="_blank" rel="noopener">Project Studio ↗</a>${lesson.authored?'':`<details><summary>${say('Файлы заготовки','Starter files')}</summary>${p.files.map(f=>`<h3>${esc(f.path)}</h3><pre><code>${esc(f.content)}</code></pre>`).join('')}</details>`}`:'<div data-r3-editor class="sandbox-block"></div>'}
  <div class="work-actions">${p.recall?`<button type="button" class="btn" data-recall="${esc(p.recall)}">${say('Вспомнить теорию','Recall the rule')}</button>`:''}<a href="${url(topicId,'explanation',locale,p.returnAnchor)}">${w.example}</a><button class="btn" data-r3-export ${currentWork?'':'hidden'}>${say('Скачать мою работу','Download my work')}</button></div>
  ${reported?`<label>${w.reported}<textarea data-r3-report ${adapter?'':'disabled'}>${esc(d.reportDraft)}</textarea></label><button class="btn" data-r3-record ${adapter?'':'disabled'}>${say('Сохранить самоотчёт','Save self-report')}</button>`:''}
  <p data-r3-result role="status"></p><details data-r3-snapshot hidden><summary>${w.snapshot}</summary><pre></pre></details>
  ${practiceChecks(p)}
  ${!external||p.referenceSolution&&p.files.length?starterDisclosure(p):''}
  ${!external||p.referenceSolution?referenceDisclosure():''}
  ${external?'':practiceSteps({...p,steps:p.steps?.map(s=>({...s,action:s.action.replace('после подключения пилота','').replace('after pilot integration','').replace('once the pilot is connected','').replace(/\s+([.,])/g,'$1')}))})}
  <div data-course-progress></div>`;
 }
 root.innerHTML=`<div class="r3-lesson" lang="${locale}" data-authored="${!!author}" data-r3-topic="${topicId}"><style>${authorModule?.authoredStyles||''}${referenceCourseStyles}
 .r3-lesson{--r3-line:#486377;line-height:1.7;max-width:1220px;margin:auto;min-width:0}.r3-lesson .option span,.r3-lesson .practice-card li{white-space:pre-wrap}.r3-lesson [data-onec-figure] img{max-width:100%}.r3-lesson [data-course-figures] .onec-shot-frame{position:relative;overflow:hidden}.r3-lesson [data-course-figures] svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.r3-lesson [hidden]{display:none!important}.r3-lesson .stage-body{padding:24px 0;min-width:0}.r3-lesson .lesson-section,.r3-lesson .question,.r3-lesson .practice-card{border:1px solid var(--r3-line);border-radius:14px;padding:24px;margin:20px 0}.r3-lesson .section-index{font-size:.8rem;opacity:.7}.r3-lesson .example-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(170px,.65fr);gap:24px}.r3-lesson .example-layout>div{min-width:0}.r3-lesson pre:not(.editor-highlight){white-space:pre;overflow:auto;max-width:100%;background:#071522;color:#e6f1ff;padding:16px;border-radius:8px;line-height:1.7}.r3-lesson .table-wrap,.r3-lesson .trace-wrap{overflow:auto}.r3-lesson table{width:100%;border-collapse:collapse}.r3-lesson th,.r3-lesson td{padding:12px;border:1px solid var(--r3-line);text-align:left;vertical-align:top}.r3-lesson caption{font-weight:600;text-align:left}.r3-lesson .option{display:flex;gap:12px;padding:10px}.r3-lesson textarea[data-answer],.r3-lesson textarea[data-r3-report],.r3-lesson #stdin{display:block;width:100%;min-height:100px;padding:12px;color:inherit;background:transparent;border:1px solid var(--r3-line);border-radius:8px}.r3-lesson fieldset{border:0;padding:0;min-width:0;width:100%}.r3-lesson legend{font-weight:700;max-width:100%;overflow-wrap:anywhere}.r3-lesson .feedback{border-left:3px solid #82e6ce;padding:12px}.r3-lesson details,.r3-lesson .environment{padding:16px;border:1px solid var(--r3-line);border-radius:8px;margin:16px 0}.r3-lesson .work-actions{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.r3-lesson .r3-dialog{max-width:min(900px,94vw);max-height:85vh;overflow:auto;background:#102333;color:#e6edf5;border:1px solid var(--r3-line);border-radius:16px;padding:24px}.r3-lesson a:focus-visible,.r3-lesson button:focus-visible,.r3-lesson textarea:focus-visible{outline:3px solid #82e6ce;outline-offset:3px}.r3-lesson .code-studio{min-width:0}.r3-lesson .next-card{display:flex;gap:16px;flex-wrap:wrap}.r3-lesson [data-r3-save]{min-height:1.7em}
 .r3-lesson .breadcrumbs{margin-bottom:8px;font-size:.82rem;color:var(--muted,#a9c0d3)}
 .r3-lesson[data-r3-topic] .stage-body{background:#0b1929;padding:28px;border-radius:18px;margin-top:18px}
 .r3-lesson[data-r3-topic] :is(.lesson-section,.question,.practice-card){background:#122438;border-color:#3d536a}
 .r3-lesson[data-r3-topic^="cpp."] .example-layout[data-example-single]{grid-template-columns:minmax(0,1fr)}
 .r3-lesson .clarification-links{display:flex;flex-wrap:wrap;gap:8px 16px;list-style:none;margin:0;padding:0}
 .r3-lesson [data-lab-reference-content] :is(pre,pre code){white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal}
 .r3-lesson [data-lab-reference-content] pre{height:auto;max-height:none;overflow:visible}
 .r3-lesson [data-reference-language="text"] :is(pre,pre code){font:inherit;line-height:inherit}
 .r3-lesson .clarification-links li{max-width:100%;min-width:0}
 .r3-lesson .clarification-links a{display:inline-block;padding-block:4px;text-decoration:underline;text-underline-offset:.18em;overflow-wrap:anywhere}
 .r3-lesson .practice-cases{list-style:none;display:grid;gap:16px;padding:0}
 .r3-lesson .practice-cases .practice-case{border:1px solid var(--r3-line);border-radius:10px;background:#0b1929;padding:16px;min-width:0;white-space:normal}
 .r3-lesson .practice-case h3{margin:0 0 12px}
 .r3-lesson .practice-case-io,.r3-lesson .practice-case-meaning{display:grid;gap:12px;margin:0}
 .r3-lesson .practice-case-io{grid-template-columns:repeat(2,minmax(0,1fr))}
 .r3-lesson .practice-case-io > div{min-width:0}
 .r3-lesson .practice-case-io dt{font-weight:700}
 .r3-lesson .practice-case-io dd,.r3-lesson .practice-case-meaning dd{margin:0}
 .r3-lesson .practice-case-io :is(pre,p){margin:6px 0 0;padding:10px 12px;border:1px solid var(--r3-line);border-radius:8px}
 .r3-lesson .practice-case-meaning{grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));border-top:1px solid var(--r3-line);margin-top:12px;padding-top:10px}
 .r3-lesson .practice-case-meaning dt{color:#c3d2e5}
 .r3-lesson .practice-case-meaning dd{font-family:monospace;font-weight:700}
 .r3-lesson .lesson-context{
  position:sticky;top:var(--r3-shell-top,0px);z-index:5;
  padding:4px 8px;background:var(--panel,#102333);
  border:1px solid var(--r3-line);border-radius:10px;
 }
 .r3-lesson .context-row{display:flex;align-items:center;gap:8px;margin-bottom:4px}
 .r3-lesson .context-row .context-title{display:flex;align-items:center;gap:6px;flex:1;min-width:0;max-width:none;margin:0;font-size:.88rem;font-weight:700}
 .r3-lesson .topic-marker{flex:none;padding:0 5px;border:1px solid var(--r3-line);border-radius:5px;font-size:.7rem;white-space:nowrap}
 .r3-lesson .lesson-topic-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .r3-lesson .lesson-tools-toggle{min-height:30px;padding:0 8px;border-radius:7px;font-size:12px;flex:none}
 .r3-lesson .lesson-tools{
  position:absolute;inset-inline:0;top:calc(100% + 4px);padding:12px;
  max-height:calc(100dvh - var(--r3-shell-top,0px) - var(--r3-context-height,80px) - 12px);
  overflow:auto;overscroll-behavior:contain;overflow-anchor:none;
  background:var(--panel,#102333);border:1px solid var(--r3-line);border-radius:10px;
  box-shadow:0 10px 24px #0005;
 }
 .r3-lesson .lesson-tools p{margin:0 0 8px;font-weight:700}
 .r3-lesson .course-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
 .r3-lesson .course-controls a{padding:6px 8px}
 .r3-lesson .course-controls button{white-space:normal}
 .r3-lesson .stages{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
 .r3-lesson .stages a{
  position:relative;display:grid;place-items:center;min-height:36px;
  padding:2px;text-align:center;line-height:1.15;font-size:clamp(11px,2.8vw,14px);
  border:1px solid var(--r3-line);border-radius:7px;overflow-wrap:anywhere;
 }
 .r3-lesson .stages [aria-current=step]{background:#24594b;color:#e8fff7;border-color:#82e6ce;font-weight:750}
 .r3-lesson [data-current-marker]{position:absolute;bottom:2px;width:12px;height:2px;background:currentColor;border-radius:2px}
 .r3-lesson :is(.lesson-section,.stage-body [id],.stage-body :is(a,button,input,textarea,select,summary)){
  scroll-margin-top:calc(var(--r3-shell-top,0px) + var(--r3-context-height,80px) + 12px)
 }
 @media(max-width:720px){
  .r3-lesson .example-layout{display:block}
  .r3-lesson[data-r3-topic] .stage-body{padding:12px}
  .r3-lesson .practice-case-io{grid-template-columns:minmax(0,1fr)}
  .r3-lesson .lesson-section,.r3-lesson .question,.r3-lesson .practice-card{padding:16px}
  .r3-lesson .lesson-context{padding-inline:5px}
  .r3-lesson .context-row .context-title{font-size:12px}
  .r3-lesson .topic-marker-label{display:none}
  .r3-lesson .breadcrumbs{font-size:11px}
  .r3-lesson .stages{gap:4px}
 }
 </style>
 <nav class="breadcrumbs" aria-label="${say('Вы здесь','You are here')}">
  <a href="#view=academy">${say('Академия','Academy')}</a> ›
  <a href="#course=${lesson.courseId}">${esc(course.title[locale])}</a> ›
  <span>${esc(topic.module[locale])}</span>
 </nav>
 <header class="lesson-context">
  <div class="context-row">
   <p class="context-title">
    <span class="topic-marker"><span class="topic-marker-label">${say('Тема','Topic')} </span>${idx+1}/${course.topics.length}</span>
    <span class="lesson-topic-name" title="${esc(topic.title[locale])}">${esc(topic.title[locale])}</span>
   </p>
   <button type="button" class="btn lesson-tools-toggle" data-action="tools"
     aria-label="${say('Навигация по уроку','Lesson navigation')}" aria-controls="r3-tools" aria-expanded="false">${say('Меню','Menu')}</button>
  </div>
  <div class="lesson-tools" id="r3-tools" hidden>
   <p>${esc(topic.title[locale])}</p>
   <nav class="course-controls" aria-label="${w.program}">
    <button type="button" class="btn" data-action="outline">${w.program}</button>
    ${neighbor(course.topics[idx-1],'← '+w.previous)}${neighbor(course.topics[idx+1],w.next+' →')}
    ${openAssistant?`<button type="button" class="btn" data-r3-assistant>${say('Разобрать с Akronikl','Discuss with Akronikl')}</button>`:''}
   </nav>
  </div>
  <nav class="stages" aria-label="${say('Раздел урока','Lesson stage')}">
   ${stages.map(stage=>`<a data-stage="${stage}" aria-label="${esc(w[stage])}" href="${url(topicId,stage)}"><span>${stage==='selfcheck'&&locale==='ru'?'Само&shy;проверка':w[stage]}</span><span data-current-marker aria-hidden="true" hidden></span></a>`).join('')}
  </nav>
 </header><p data-r3-save role="status" aria-live="polite">${adapter?say('Ответы и работа сохраняются на этом устройстве.','Answers and work are saved on this device.'):(external?say('Просмотр материалов. Войдите в аккаунт, чтобы сохранять ответы и работу.','Read-only materials. Sign in to save answers and work.'):say('Просмотр материалов. Войдите в аккаунт или откройте личную копию C++, чтобы сохранять работу.','Read-only materials. Sign in or open your C++ local copy to save work.'))}</p><button class="btn" data-r3-retry hidden>${say('Повторить сохранение','Retry saving')}</button><button class="btn" data-r3-export hidden>${say('Скачать несохранённую работу','Download unsaved work')}</button>${stages.map(s=>`<section data-r3-panel="${s}" class="stage-body" tabindex="-1" ${s===route.stage?'':'hidden'}>${s==='explanation'?explanation():s==='selfcheck'?selfcheck():practice()}</section>`).join('')}<p>${w.notCompleted}</p></div>`;
 const contextHeader=root.querySelector('.lesson-context');
 const shellHeader=document.querySelector('.topbar');
 const lessonElement=root.querySelector('.r3-lesson');
 const updateContextOffset=()=>{
  if(!live())return;
  lessonElement.style.setProperty('--r3-shell-top',(shellHeader?.getBoundingClientRect().height??0)+'px');
  lessonElement.style.setProperty('--r3-context-height',contextHeader.getBoundingClientRect().height+'px');
 };
 updateContextOffset();
 if(typeof ResizeObserver!=='undefined'){
  contextObserver=new ResizeObserver(updateContextOffset);
  contextObserver.observe(contextHeader);
  if(shellHeader)contextObserver.observe(shellHeader);
 }
 if(author){const readingButton=document.createElement('button');readingButton.type='button';readingButton.className='btn';readingButton.dataset.action='reading';readingButton.textContent=say('Что почитать по теме','Topic reading');root.querySelector('.course-controls').append(readingButton);}
 const panel=s=>root.querySelector('[data-r3-panel="'+s+'"]');
 function feedback(q){
  const a=draft().answers[q.id],node=root.querySelector('[data-feedback="'+q.id+'"]');if(!node)return;node.className='feedback';
  if(q.kind==='free'){node.textContent=a?.value?say('Текст сохранится вместе с вашим черновиком. ','The text will be saved with your draft. ')+q.feedback:w.answerDraft;return;}
  if(!answerIsChecked(a,contentRevision)){node.textContent=w.answerDraft;return;}
  node.textContent=Array.isArray(q.feedback)?q.feedback[a.value]:(a.value===q.correct?say('Верно. ','Correct. '):say('Пока неверно. ','Not yet. '))+q.feedback;
 }
 lesson.selfcheck.forEach(feedback);
 function executionRequest(stdin){const request=studio.runtimeRequest(stdin),m=lesson.practice.metadata||{};return {...request,metadata:{...request.metadata,...(m.translationUnits?{translationUnits:m.translationUnits}:{}),...(m.includeRoots?{includeRoots:m.includeRoots}:{})}};}
 function showAssessment(result){
  const node=root.querySelector('[data-reference-assessment]');if(!node)return;
  node.hidden=!lesson.practice.runAssessment;if(node.hidden)return;
  const state=result?.state||'unrun';node.dataset.state=state;
  const title={unrun:say('Не проверено: запустите текущую работу.','Not checked: run your current work.'),running:say('Выполняется текущая программа…','Running the current program…'),stale:say('Предыдущая проверка устарела: код, вход или редакция задания изменились. Запустите снова.','The previous check is stale: code, input or task revision changed. Run again.'),passed:say('Проверено для этого задания','Checked for this task'),failed:say('Проверка выявила отличие','The check found a difference')}[state];
  node.innerHTML='<strong>'+esc(title)+'</strong>'+(result?.checks?'<p>'+result.passed+'/'+result.total+' · '+say('проверок вывода и завершения','output and exit checks')+'</p><dl>'+result.checks.map(c=>'<div><dt>'+say('Ожидалось','Expected')+'</dt><dd>'+esc(c.expected)+'</dd><dt>'+say('Получено','Actual')+'</dt><dd>'+esc(c.actual||say('(пусто)','(empty)'))+' · '+(c.ok?'✓':'×')+'</dd></div>').join('')+'</dl>':'')+(state==='failed'?'<p>'+say('Сравните ожидаемые строки с выводом; проверьте кавычки, имена и выражения. Ошибка компиляции означает, что новый код не выполнялся.','Compare expected lines with your output; check quotes, names and expressions. A compilation error means the new code did not run.')+'</p>':'')+'<p>'+say('«Сохранено» относится к файлу. «Проверено» относится только к показанным условиям. Объяснение решения и «Освоено» автоматически не оцениваются.','“Saved” describes the file. “Checked” covers only the shown conditions. Your reasoning and mastery are not graded automatically.')+'</p>';
 }
 function showResult(){if(!live())return;const r=draft().lastResult,node=root.querySelector('[data-r3-result]'),details=root.querySelector('[data-r3-snapshot]');if(!r){node.textContent=w.none;showAssessment(evaluateReferenceRun(lesson.practice.runAssessment,null));return;}let matches=false;try{if(studio&&r.inputSnapshot){const request=executionRequest(root.querySelector('#stdin')?.value||''),input={...request,languageId:CLARITY_COURSES[topicId].languageId,files:Object.entries(request.files).map(([path,content])=>({path,content}))};const digests=snapshotDigests(input);matches=digests.sourceDigest===r.sourceDigest&&digests.stdinDigest===r.stdinDigest;}}catch{}matches=matches&&r.contentRevision===contentRevision;showAssessment(evaluateReferenceRun(lesson.practice.runAssessment,r,{current:matches}));node.textContent=(r.kind==='external-self-report'?say('Сохранён самоотчёт о внешнем запуске.','External run self-report saved.'):say('Сохранён результат запуска C++. Это не оценка понимания.','C++ run result saved. This is not an assessment of understanding.'))+(r.inputSnapshot&&!matches?' '+w.stale:'');details.hidden=false;details.querySelector('pre').textContent=(r.inputSnapshot?.files.map(f=>f.path+'\n'+f.content).join('\n\n')||'')+'\n'+r.output.stdout+(r.output.stderr?'\n'+r.output.stderr:'');}
 async function ensureEditor(){
  if(studio||qt||!currentWork||!live())return;if(readyEditor)return readyEditor;
  readyEditor=(async()=>{
   const host=root.querySelector('[data-r3-editor]'),s=currentWork.workspace;
   host.innerHTML=`<h2>${external?w.draft:w.work}</h2>${codeStudioMarkup({source:currentWork.code,locale,languageId:external?'onec':'cpp',files:s.files,entryFile:s.entryFile,activeFile:draft().activeFile||s.activeFile})}${external?'':`<label for="stdin">${w.stdin}</label><textarea id="stdin">${esc(currentWork.stdin)}</textarea><p>${esc(lesson.practice.stdinNote||'')}</p><button class="btn primary" id="runCode">${say('Запустить мою работу','Run my work')}</button><span id="engine"></span><section class="reference-assessment" data-reference-assessment role="status" aria-live="polite" aria-atomic="true"></section><p id="sandboxStatus" role="status"></p><p id="runtimeRoute"></p><h3>${say('Результат моего запуска','My run result')}</h3><pre id="output">${say('Здесь появится фактический вывод вашей программы.','Actual output from your program will appear here.')}</pre>`}`;
   const ed=host.querySelector('#editor'),cursor=draft().cursor,path=draft().activeFile;
   studio=bindCodeStudio({editor:ed,locale,languageId:external?'onec':'cpp',fileName:s.entryFile,files:s.files,activeFile:path||s.activeFile,viewState:cursor&&path?{version:1,files:{[path]:{selectionStart:cursor.start,selectionEnd:cursor.end,scrollTop:cursor.scrollTop,scrollLeft:cursor.scrollLeft}}}:null,onWorkspaceChange:(_,type)=>{if(type==='init'||!live())return;if(session){session.mark({work:type!=='view-state'});showResult();}}});
   if(!adapter){for(const node of host.querySelectorAll('button,input,textarea'))node.disabled=true;return;}
   if(cursor){ed.setSelectionRange(cursor.start,cursor.end,cursor.direction);ed.scrollTop=cursor.scrollTop;ed.scrollLeft=cursor.scrollLeft;}
   host.querySelector('#stdin')?.addEventListener('input',()=>{session.mark({work:true});showResult();});
   host.querySelector('#runCode')?.addEventListener('click',async()=>{const button=host.querySelector('#runCode');if(button.disabled)return;button.disabled=true;showAssessment({state:'running'});try{session.mark({work:true});await session.flush();if(!live())return;const {createSandboxController}=await import('../sandbox/sandbox.js');if(!live())return;runtime??=createSandboxController({editor:ed,stdin:host.querySelector('#stdin'),output:host.querySelector('#output'),engine:host.querySelector('#engine'),status:host.querySelector('#sandboxStatus'),routeInfo:host.querySelector('#runtimeRoute'),locale,languageId:'cpp',codeStudio:{...studio,runtimeRequest:executionRequest},onCodeChange:()=>{},runObserver:createClarityRunObserver({session,topicId,onResult:showResult,onError:()=>{if(live())root.querySelector('[data-r3-result]').textContent=say('Запуск доступен, но его полный снимок не сохранён.','Execution is available, but its full snapshot was not saved.');}})});await runtime.run();}catch(error){if(session.error)status('error',error);}finally{if(live())button.disabled=false;}});
   showResult();
  })();return readyEditor;
 }
 function remember(){if(!session||!live())return;const next={x:Math.max(0,scrollX),y:Math.max(0,scrollY)};if(canonicalJson(session.draft.positions[route.stage])!==canonicalJson(next))session.change(d=>{d.positions[route.stage]=next;});}
 let acceptedHash=location.hash;
 async function showStage(stage,anchor='',rememberOld=true){
  if(!live())return;
  if(rememberOld)remember();
  route.stage=stage;
  if(session&&session.draft.stage!==stage)session.change(d=>{d.stage=stage;});
  for(const s of stages){
   panel(s).hidden=s!==stage;
   const tab=root.querySelector('[data-stage="'+s+'"]');
   if(s===stage)tab.setAttribute('aria-current','step');
   else tab.removeAttribute('aria-current');
   tab.querySelector('[data-current-marker]').hidden=s!==stage;
  }
  setToolsOpen(false);
  panel(stage).focus({preventScroll:true});
  if(stage==='practice')await ensureEditor();
  if(!live())return;
  acceptedHash=location.hash;
  notifyView();
  const position=draft().positions[stage];
  requestAnimationFrame(()=>{
   if(!live()||route.stage!==stage)return;
   const focused=root.getRootNode().activeElement||document.activeElement;
   if(focused?.matches('input,textarea,button,a'))return;
   if(anchor)root.querySelector('#'+CSS.escape(anchor))?.scrollIntoView({block:'start'});
   else scrollTo({left:position.x,top:position.y,behavior:'instant'});
  });
 }
 function download(){if(!session?.isCurrent())return;const value=session.exportBuffer(),blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=topicId+'-my-work.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 let lastEditable=null;
 const abort=new AbortController(),listen=(node,event,fn)=>node.addEventListener(event,fn,{signal:abort.signal});
 const toolsToggle=contextHeader.querySelector('[data-action="tools"]');
 const toolsPanel=contextHeader.querySelector('.lesson-tools');
 function setToolsOpen(open){
  toolsPanel.hidden=!open;
  toolsToggle.setAttribute('aria-expanded',String(open));
 }
 listen(window,'pointerdown',event=>{
  if(live()&&!toolsPanel.hidden&&!event.composedPath().includes(contextHeader)&&!root.querySelector('dialog[open]'))setToolsOpen(false);
 });
 listen(contextHeader,'keydown',event=>{
  if(event.key!=='Escape'||toolsPanel.hidden)return;
  event.preventDefault();
  toolsToggle.focus({preventScroll:true});
  setToolsOpen(false);
 });
 listen(root,'focusin',event=>{
  if(!toolsPanel.hidden&&event.target.closest('.stage-body'))setToolsOpen(false);
  if(event.target.matches('textarea,input'))lastEditable=event.target;
 });
 listen(root,'input',event=>{if(!session||!live())return;const el=event.target;if(el.dataset.answer){const id=el.dataset.answer;session.change(d=>{d.answers[id]={value:el.type==='radio'?Number(el.value):el.value,checked:false,contentRevision};});feedback(lesson.selfcheck.find(q=>q.id===id));}if(el.hasAttribute('data-r3-report'))session.change(d=>{d.reportDraft=el.value;});});
 listen(root,'submit',event=>{const q=lesson.selfcheck.find(q=>q.id===event.target.dataset.question);if(!q)return;event.preventDefault();if(!session||!live()||!draft().answers[q.id])return;session.change(d=>{d.answers[q.id].checked=q.kind!=='free';d.answers[q.id].contentRevision=contentRevision;});feedback(q);void session.flush().catch(()=>{});});
 function dialog(title,body){const opener=root.getRootNode().activeElement||document.activeElement,node=document.createElement('dialog');node.className='r3-dialog';node.innerHTML=`<h2>${esc(title)}</h2><button class="btn" data-close>${w.close}</button>${body}`;root.querySelector('.r3-lesson').append(node);node.querySelector('[data-close]').onclick=()=>node.close();node.onclose=()=>{node.remove();opener?.focus();};node.showModal();return node;}
 root.addEventListener('toggle',async event=>{
  const details=event.target;
  if(!details.matches?.('details[data-lab-reference]')||!details.open||details.dataset.loaded)return;
  details.dataset.loaded='loading';
  const panel=details.querySelector('[data-lab-reference-content]');
  panel.textContent=say('Открываем эталон…','Opening the reference solution…');
  try{
   const solution=await labReference();
   if(!live()||!details.isConnected)return;
    panel.dataset.referenceLanguage=solution.language||'';
   panel.innerHTML=(solution.paragraphs||[]).map(t=>'<p>'+esc(t)+'</p>').join('')+(solution.source?`<pre data-reference-source><code>${esc(solution.source)}</code></pre>${programBundle(solution)}
     <button type="button" class="btn" data-action="copy-reference">${solution.language==='text'?say('Скопировать текст','Copy text'):say('Скопировать код','Copy code')}</button>`:'');
   details.dataset.loaded='ready';
  }catch{
   if(!live()||!details.isConnected)return;
   delete details.dataset.loaded;
   panel.textContent=say('Эталон недоступен. Сверните и откройте раздел снова.','The reference is unavailable. Close and reopen this section to retry.');
  }
 },{capture:true,signal:abort.signal});
 listen(root,'click',async event=>{
  if(!live())return;
  const link=event.target.closest('a[href^="#"]');if(link){const p=new URLSearchParams(link.hash.slice(1));if(p.get('lesson')===topicId&&p.get('locale')===locale&&stages.includes(p.get('stage'))){event.preventDefault();root.querySelector('dialog')?.close();history.pushState(null,'',link.hash);await showStage(p.get('stage'),p.get('at'));return;}}
  const button=event.target.closest('button');if(!button)return;
  try{
   if(button.dataset.action==='lab-window'&&(!reported||external&&lesson.practice.referenceSolution&&currentWork)){
    await ensureEditor();
    const {ensureGoldStyles,openGoldWorkspace}=await import('./academy-gold-presentation.js');
    await ensureGoldStyles();
    if(!live()||route.stage!=='practice')return;
    const p=lesson.practice,task=document.createElement('section');
    task.innerHTML=`<h2>${esc(p.title)}</h2><p>${esc(p.task)}</p>${starterDisclosure(p)}${practiceSteps(p)}${practiceChecks(p)}${referenceDisclosure()}`;
    const lessonRoot=root.querySelector('.r3-lesson');
    openGoldWorkspace(lessonRoot,button,{lessonId:topicId,locale},{workspace:lessonRoot.querySelector('[data-r3-editor]'),task});
   }
   if(button.dataset.action==='copy-reference'){
    const source=button.closest('[data-lab-reference-content]').querySelector('[data-reference-source] code').textContent;
    try{
     await navigator.clipboard.writeText(source);
     button.textContent=say('Скопировано','Copied');
    }catch{button.textContent=say('Выделите код для копирования','Select the code to copy');}
   }
   if(author&&button.dataset.action==='reading')dialog(say('Что почитать по теме','Topic reading'),author.reading());
   if(author&&button.dataset.recall){const content=author.recall(button.dataset.recall);if(content){const owner=button.closest('[data-question]')||button.closest('[data-r3-panel]');const target=lastEditable&&root.contains(lastEditable)&&owner?.contains(lastEditable)&&lastEditable.getClientRects().length?lastEditable:button,x=scrollX,y=scrollY,start=target.selectionStart,end=target.selectionEnd,top=target.scrollTop,left=target.scrollLeft;const node=dialog(content.title,content.body);node.onclose=()=>{node.remove();if(!live())return;target.focus({preventScroll:true});if(typeof start==='number')target.setSelectionRange(start,end);target.scrollTop=top;target.scrollLeft=left;scrollTo(x,y);};}}
   if(button===toolsToggle)setToolsOpen(toolsPanel.hidden);
   if(button.hasAttribute('data-r3-assistant')&&openAssistant){notifyView();openAssistant(button,{courseId:lesson.courseId,lessonId:topicId,sectionId:route.stage,locale});}
   if(button.hasAttribute('data-r3-export'))download();
   if(button.hasAttribute('data-r3-retry'))await session?.retry();
   if(button.dataset.action==='outline')dialog(w.program,`<ul>${course.topics.map(t=>`<li><a href="${url(t.id,'explanation')}">${esc(t.title[locale])}</a></li>`).join('')}</ul>`);
   if(button.dataset.action==='setup'&&!CLARITY_COURSES[topicId].pilot){const [{labHelpMarkup},response]=await Promise.all([import('../courses/onec-education/lab-help.mjs'),fetch(new URL('../courses/onec-education/lab-route.v2.json',import.meta.url),{credentials:'omit'})]);if(!response.ok)throw Error('COURSE_SETUP_UNAVAILABLE');const copy=await response.json();if(live())dialog(w.prepTitle,labHelpMarkup(locale,{copy,open:true}));}
   if(button.dataset.action==='setup'&&CLARITY_COURSES[topicId].pilot){const data=await clarityResource('setup.'+locale+'.json');if(live())dialog(w.prepTitle,(data[topicId]||[]).map((s,i)=>`<section><h3>${i+1}. ${esc(s.title)}</h3><p>${esc(s.text)}</p>${(s.links||[]).map(l=>{const href=l.external?l.href:new URL('../courses/cpp-clarity-r3/'+l.href.replace(/^\.\//,''),import.meta.url).href;return `<p><a href="${esc(href)}" ${l.external?'target="_blank" rel="noopener"':'download'}>${esc(l.label)}</a></p>`;}).join('')}${s.code?code(s.code):''}</section>`).join(''));}
   if(button.hasAttribute('data-r3-create')&&session){button.disabled=true;const work=workSeed(),receipt=await adapter.createWork(work,lesson.title);if(!live())return;currentWork=work;session.attachNewWork(work,receipt);button.hidden=true;await ensureEditor();const open=root.querySelector('[data-action=lab-window]');if(open)open.disabled=false;await session.flush();}
   if(button.hasAttribute('data-r3-record')&&session){let inputSnapshot=null,workBinding=null,digests={sourceDigest:null,stdinDigest:null},workspaceRevision=0;if(studio){session.mark({work:true});await session.flush();if(!live())return;const request=executionRequest('');inputSnapshot={...request,languageId:CLARITY_COURSES[topicId].languageId,files:Object.entries(request.files).map(([path,content])=>({path,content}))};digests=snapshotDigests(inputSnapshot);workspaceRevision=inputSnapshot.metadata.workspaceRevision;workBinding=session.binding;}const lastResult={kind:'external-self-report',runId:'report-'+crypto.randomUUID(),contentRevision,workspaceRevision,workBinding,inputSnapshot,...digests,output:{stdout:draft().reportDraft,stderr:''},exitCode:null,providerId:null};const candidate=structuredClone(draft());candidate.lastResult=lastResult;validateClarityDraft(topicId,candidate,{persisted:false});session.change(d=>{d.lastResult=lastResult;});await session.flush();showResult();}
  }catch(error){status('error',error);}finally{if(live()&&button.hasAttribute('data-r3-create'))button.disabled=false;}
 });
 const invalidate=()=>{if(adapter&&!adapter.isCurrent()){dispose();root.replaceChildren();}};
 listen(window,'nexus:context-invalidated',invalidate);listen(window,'pagehide',()=>{dispose();root.replaceChildren();});
 listen(window,'beforeunload',event=>{if(session?.dirty){event.preventDefault();event.returnValue='';}});
 function dispose(){if(disposed)return;disposed=true;abort.abort();contextObserver?.disconnect();contextObserver=null;disposeProgress?.();disposeProgress=null;disposeNavigation?.();disposeNavigation=null;disposeTerms?.();disposeTerms=null;studio?.dispose();studio=null;session?.dispose();session=null;currentWork=null;initial=null;publicDraft=null;d=null;runtime=null;}
 if(lesson.extras){const tools=await import('./academy-gold-presentation.js');await tools.ensureGoldStyles();if(!live()){dispose();return null;}const markup=tools.clarityLessonToolsMarkup(lesson.extras);panel('explanation').insertAdjacentHTML('beforeend',markup.explanation);panel('practice').insertAdjacentHTML('beforeend',markup.practice);tools.bindAcademyGold(root,lesson.extras);}
 if(adapter){const {mountCourseControls}=await import('./clarity-course-controls.mjs');if(!live()){dispose();return null;}disposeProgress=mountCourseControls(root,{lesson,adapter,session,isCurrent:live,onSaved:notifyView});}
 disposeNavigation=mountReferenceNavigation(root,{lesson,catalog,url,isCurrent:live});
 const {mountReferenceHelp}=await import('./reference-learning-help.mjs');
 if(!live()){dispose();return null;}disposeTerms=await mountReferenceHelp(root,{lesson,locale,isCurrent:live});
 if(!live()){dispose();return null;}
 if(lesson.practice.steps?.some(s=>s.figures?.length)){const {lessonFiguresMarkup}=await import('../courses/onec-education/lesson-media.mjs');if(!live()){dispose();return null;}for(const s of lesson.practice.steps){if(s.figures?.length)root.querySelector('[data-course-figures="'+CSS.escape(s.id)+'"]').innerHTML=lessonFiguresMarkup(s.figures,locale);}}
 await showStage(route.stage,requested.anchor,false);if(!live()){dispose();return null;}showResult();if(session&&initial?.draft&&!session.dirty)status('restored');
 return {get session(){return session;},dispose,
  async handleRoute(hash,nextLocale=locale){if(!live())return false;const p=new URLSearchParams(hash.slice(1));if(p.get('lesson')!==topicId||(p.get('course')||lesson.courseId)!==lesson.courseId||(p.get('locale')||nextLocale)!==locale)return false;const next=position(p);await showStage(next.stage,next.anchor);return true;},
  async prepareNavigation(){if(!live())return true;remember();const okay=!session||await session.prepareNavigation();if(!okay&&live())history.replaceState(null,'',acceptedHash||'#view=academy');return okay;}
 };
}
