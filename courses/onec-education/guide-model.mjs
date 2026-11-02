// Публичные материалы и самоотчёт. Модели, ответы на тесты и изменения сохранений отсутствуют.
export function onecGuideLessonSections(l){
 const en=l.locale==='en',out=[],add=(sectionId,title,items)=>out.push({sectionId,title,text:items.flat(Infinity).filter(x=>typeof x==='string'&&x).join('\n')});
 add('overview',l.title,[l.title,l.goal,l.prerequisites,l.outcomes]);
 l.sections.forEach(([title,...paragraphs],i)=>add('theory-'+(i+1),title,paragraphs));
 for(const x of l.examples||[])add('examples',x.title,[x.source,x.expected,x.explanation,x.trace||[]]);
 add('walkthrough',en?'Worked walkthrough':'Пошаговый разбор',l.walkthrough.flatMap(x=>[x.action,x.expected]));
 for(const x of l.exercises)add('practice',x.level,[x.task,x.criteria,x.hint||'']);
 // В подробном маршруте действия и результаты уже имеют собственные точные
 // якоря step-*. Повторять те же строки ещё раз в сводке лабораторной не нужно.
 add('lab',l.lab.title,[l.lab.environment,...(l.experience?.route?[]:[l.lab.steps,l.lab.expected]),l.lab.evidence,l.lab.negative]);
 for(const s of l.experience?.route?.steps||[])add('step-'+s.id,s.title,[s.where,s.before,s.action,s.why,s.expected,s.troubleshooting,s.code||'',(s.figures||[]).map(f=>f.caption)]);
 if(l.experience?.diagram)add('diagram',l.experience.diagram.title[l.locale],l.experience.diagram.nodes.flatMap(n=>[n.label[l.locale],n.detail[l.locale]]));
 add('diagnostics',en?'Mistakes and diagnosis':'Ошибки и диагностика',l.mistakes);
 add('review',en?'Review and next step':'Закрепление и следующий шаг',l.review);
 return out;
}
export const onecGuideLessonText=l=>onecGuideLessonSections(l).map(s=>[s.title,s.text].join('\n')).join('\n');
export function createOnecGuide(index) {
 if(index?.schemaVersion!==1||!['ru','en'].includes(index.locale)||!Array.isArray(index.courses)||index.courses.length!==2)throw Error('GUIDE_INDEX_REJECTED');
 index=structuredClone(index);
 for(const c of index.courses){if(!c||!Array.isArray(c.lessons))throw Error('GUIDE_COURSE_REJECTED');for(const l of c.lessons){if(!l||typeof l!=='object')throw Error('GUIDE_LESSON_REJECTED');if(l.sections?.length){if(!Array.isArray(l.sections)||l.sections.length>64||l.sections.some(s=>!s||!/^[a-z][a-z0-9-]{0,159}$/.test(s.sectionId)||typeof s.title!=='string'||typeof s.text!=='string'||s.text.length>40000))throw Error('GUIDE_SECTIONS_REJECTED');l.text=l.sections.map(s=>s.title+'\n'+s.text).join('\n');}}}
 const ids=new Set();
 for(const c of index.courses){if(!['onec','1c-enterprise'].includes(c.courseId)||ids.has(c.courseId)||!Array.isArray(c.lessons)||!Array.isArray(c.modules))throw Error('GUIDE_COURSE_REJECTED');ids.add(c.courseId);
  const seen=new Set();for(const l of c.lessons){if(!l.topicId.startsWith(c.courseId+'.')||seen.has(l.topicId)||!/^lessons\/(ru|en)\/[a-z0-9-]+\.json$/.test(l.sourcePath)||!l.sourcePath.startsWith('lessons/'+index.locale+'/')||!/^[a-f0-9]{64}$/.test(l.sha256)||typeof l.text!=='string'||l.text.length>40000||typeof l.title!=='string'||!c.modules.some(m=>m.moduleId===l.moduleId))throw Error('GUIDE_LESSON_REJECTED');seen.add(l.topicId);}}
 const norm=s=>s.normalize('NFKC').toLocaleLowerCase(index.locale).replace(/ё/g,'е');
 const freeze=value=>{if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;};freeze(index);
 function course(id){const c=index.courses.find(c=>c.courseId===id);if(!c)throw Error('UNKNOWN_COURSE');return c;}
 return Object.freeze({locale:index.locale,courses:index.courses.map(c=>({courseId:c.courseId,title:c.title})),
  outline(id){return course(id).modules.map(m=>({...m,lessons:course(id).lessons.filter(l=>l.moduleId===m.moduleId).map(({topicId,title})=>({topicId,title}))}));},
  orientation(id,state,currentId){const c=course(id);if(state!==null&&(state?.schemaVersion!==1||state.courseId!==id||!state.lessons||Array.isArray(state.lessons)))throw Error('GUIDE_PROGRESS_UNREADABLE');
   const completed=l=>{const s=state?.lessons[l.topicId];return s?.completed===true&&(l.progressPolicy!=='current-revision-required'||s.completionRevision===l.contentRevision||s.completionHistory?.some(h=>h.contentRevision===l.contentRevision&&h.kind==='self-reported'));};
   return{courseId:id,current:c.lessons.find(l=>l.topicId===currentId)||null,next:c.lessons.find(l=>!completed(l))||null,done:state===null?null:c.lessons.filter(completed).length,total:c.lessons.length,progressKind:state===null?'unavailable':'local-self-report',codeVerifiedServer:false};},
  lesson(id,topicId){const l=course(id).lessons.find(l=>l.topicId===topicId);return l?structuredClone(l):null;},
  references(){return structuredClone(index.references||[]);},
  search(id,query){if(typeof query!=='string'||query.length>200)throw Error('GUIDE_QUERY_LIMIT');const tokens=[...new Set(norm(query).match(/[\p{L}\p{N}.-]+/gu)||[])].slice(0,12);if(!tokens.length)return[];
   return course(id).lessons.map(l=>{const body=norm(l.text),title=norm(l.title+' '+l.moduleCode+' '+l.topicId);const score=tokens.reduce((n,t)=>n+(title.includes(t)?8:body.includes(t)?1:0),0);const pos=Math.max(0,body.indexOf(tokens.find(t=>body.includes(t))||''));return{...l,score,excerpt:l.text.slice(Math.max(0,pos-100),pos+600)};}).filter(l=>l.score>0).sort((a,b)=>b.score-a.score||a.order-b.order).slice(0,6);}
 });
}
