// Локальные ответы только по проверенному корпусу. Запрос не становится
// полномочием: курс, тема и шаг приходят отдельно из актуального host-контекста.
export function answerOnecCourse({guide,query,courseId,topicId=null,sectionId='overview',state=null,allowLesson=true,allowProgress=true}={}){
 if(!['onec','1c-enterprise'].includes(courseId))return null;
 if(typeof query!=='string'||!query.trim()||query.length>1500)throw Error('ONEC_TUTOR_QUERY');
 const en=guide.locale==='en',t=(ru,english)=>en?english:ru,q=query.normalize('NFKC').toLowerCase().replace(/ё/g,'е'),lesson=allowLesson&&topicId?guide.lesson(courseId,topicId):null;
 const sources=[],source=(l,section)=>{if(!l)return;const s=section||l.sections?.find(x=>x.sectionId==='overview');sources.push({courseId,lessonId:l.topicId,sectionId:s?.sectionId||'overview',title:l.title,text:(s?.text||l.text).slice(0,5000),sourcePath:`courses/${courseId}/${l.sourcePath}`,contentVersion:l.contentRevision,contentHash:l.sha256});};
 const limits=t('Я вижу материалы и выбранный шаг Nexus. Окно установленной 1С и результат запуска мне не видны. Отметка прохождения — самоотчёт.','I can read course material and the selected Nexus step. I cannot inspect your installed 1C window or its execution result. Completion is self-reported.');
 const orientation=/что дальше|где я|продолж|следующ|прогресс|where am i|what next|continu|next step|progress/.test(q);
 if(orientation){if(!allowProgress)return{text:t('Доступ к прогрессу отключён в настройках помощника. Можно искать в материалах курса.','Progress access is disabled in assistant settings. You can still search course material.'),sources,kind:'progress-disabled'};
  const p=guide.orientation(courseId,state,topicId),parts=[p.done===null?t('Прогресс этого аккаунта сейчас недоступен.','Progress for this account is unavailable.'):t(`По самоотчёту пройдено ${p.done} из ${p.total} уроков.`,`Your self-report marks ${p.done} of ${p.total} lessons complete.`)];
  if(lesson){const step=lesson.sections?.find(s=>s.sectionId===sectionId);parts.push(t('Текущий урок: ','Current lesson: ')+lesson.title);if(step){parts.push(step.title+'\n'+step.text);source(lesson,step);}else source(lesson);}
  if(p.next){parts.push(t('Первый урок без актуальной отметки: ','First lesson without a current completion mark: ')+p.next.title);if(!sources.some(s=>s.lessonId===p.next.topicId))source(p.next);}else parts.push(t('Далее — итоговый тест, практические работы и проект.','Continue to the final test, practical tasks and project.'));
  return{text:[...parts,limits].join('\n\n').slice(0,9500),sources:sources.slice(0,3),kind:'orientation'};
 }
 const termQuery=q.replace(/^(что такое|что значит|объясни|what is|explain|define)\s+/u,'').replace(/[?!.,]/gu,'').trim();
 const glossary=guide.references().find(x=>x.sectionId==='glossary'),terms=glossary?.terms||[];
 const term=terms.find(x=>[x.term,x.full,...(x.aliases||[])].some(a=>a.toLowerCase().replace(/ё/g,'е')===termQuery));
 if(term)return{text:[term.term+(term.full?' — '+term.full:''),term.definition,term.example,limits].filter(Boolean).join('\n\n'),sources:[{courseId,title:term.term,text:term.definition,sourcePath:'courses/onec-education/'+glossary.sourcePath,contentVersion:glossary.contentRevision,contentHash:glossary.sha256}],kind:'term'};
 const routeQuestion=/как.*(?:запуст|откры|начать|установ)|что нажать|куда.*код|где.*(?:код|окно)|how.*(?:run|open|start|install)|where.*(?:code|window)|what.*click/.test(q);
 const stuck=/не получилось|не работает|ошибк|не вижу|не появ|почему|does not work|doesn't work|error|cannot|can't|why|not appear/.test(q);
 let sections=lesson?.sections||[],selected=null;
 if(lesson&&/не понял|попроще|простыми словами|more simply|explain simply|simpler/.test(q))selected=sections.find(s=>s.sectionId==='theory-1');
 if(lesson&&/пример|example/.test(q))selected=sections.find(s=>s.sectionId==='examples');
 if(lesson&&/упражнен|практик|задани|exercise|practice|assignment/.test(q))selected=sections.find(s=>s.sectionId==='practice');
 if(lesson&&/что.*изучаем|текущ.*(?:урок|тема)|current lesson|what are we.*(?:studying|learning)/.test(q))selected=sections.find(s=>s.sectionId==='overview');
 if(routeQuestion||stuck)selected=sections.find(s=>s.sectionId===sectionId&&s.sectionId.startsWith('step-'))||sections.find(s=>s.sectionId===(stuck?'diagnostics':'lab'));
 if(!selected&&lesson&&/объясни.*(?:шаг|это)|этот шаг|explain.*(?:step|this)|this step/.test(q))selected=sections.find(s=>s.sectionId===sectionId);
 if(!selected){const tokens=[...new Set(q.match(/[\p{L}\p{N}.-]+/gu)||[])].filter(x=>x.length>2&&!['что','как','это','мне','the','what','how','can','you','explain'].includes(x));const ranked=sections.map((s,i)=>({s,i,score:tokens.reduce((n,x)=>n+(s.title.toLowerCase().includes(x)?5:s.text.toLowerCase().includes(x)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.i-b.i);selected=ranked[0]?.s;}
 let target=lesson;if(!selected){target=guide.search(courseId,query.slice(0,200))[0]||null;selected=target?.sections?.find(s=>s.sectionId==='overview');}
 if(!target)return{text:t('В материалах курса не нашёл надёжного ответа. Укажите название темы, термин или шаг лабораторной.','I could not find a supported answer in the course. Name a topic, term or laboratory step.'),sources,kind:'not-found'};
 source(target,selected);return{text:[t('По материалам урока «','From the lesson “')+target.title+(en?'”:':'»: '),selected?.title||'',selected?.text||target.text.slice(0,5000),stuck?t('Сверьте действие и ожидаемый результат по ссылке. Если окно отличается, напишите его заголовок и текст ошибки без личных данных.','Compare the action and expected result at the link. If your window differs, provide its title and error message without personal data.'):'',limits].filter(Boolean).join('\n\n').slice(0,9500),sources,kind:stuck?'diagnostic-reference':'explanation'};
}
