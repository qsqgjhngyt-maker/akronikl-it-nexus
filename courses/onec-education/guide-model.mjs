// Публичные материалы и самоотчёт. Модели, ответы на тесты и изменения сохранений отсутствуют.
export const onecGuideLessonText=l=>[l.title,l.goal,...l.prerequisites,...l.outcomes,...l.sections.flat(),...l.walkthrough.flatMap(x=>[x.action,x.expected]),...l.exercises.map(x=>x.task),l.lab.title,l.lab.environment,...l.lab.steps,...l.lab.expected,...l.lab.evidence,l.lab.negative,...l.mistakes.flat()].join('\n');
export function createOnecGuide(index) {
 if(index?.schemaVersion!==1||!['ru','en'].includes(index.locale)||!Array.isArray(index.courses)||index.courses.length!==2)throw Error('GUIDE_INDEX_REJECTED');
 const ids=new Set();
 for(const c of index.courses){if(!['onec','1c-enterprise'].includes(c.courseId)||ids.has(c.courseId)||!Array.isArray(c.lessons)||!Array.isArray(c.modules))throw Error('GUIDE_COURSE_REJECTED');ids.add(c.courseId);
  const seen=new Set();for(const l of c.lessons){if(!l.topicId.startsWith(c.courseId+'.')||seen.has(l.topicId)||!/^lessons\/(ru|en)\/[a-z0-9-]+\.json$/.test(l.sourcePath)||!l.sourcePath.startsWith('lessons/'+index.locale+'/')||!/^[a-f0-9]{64}$/.test(l.sha256)||typeof l.text!=='string'||l.text.length>40000||typeof l.title!=='string'||!c.modules.some(m=>m.moduleId===l.moduleId))throw Error('GUIDE_LESSON_REJECTED');seen.add(l.topicId);}}
 const norm=s=>s.normalize('NFKC').toLocaleLowerCase(index.locale).replace(/ё/g,'е');
 function course(id){const c=index.courses.find(c=>c.courseId===id);if(!c)throw Error('UNKNOWN_COURSE');return c;}
 return Object.freeze({locale:index.locale,courses:index.courses.map(c=>({courseId:c.courseId,title:c.title})),
  outline(id){return course(id).modules.map(m=>({...m,lessons:course(id).lessons.filter(l=>l.moduleId===m.moduleId).map(({topicId,title})=>({topicId,title}))}));},
  orientation(id,state,currentId){const c=course(id);if(state!==null&&(state?.schemaVersion!==1||state.courseId!==id||!state.lessons||Array.isArray(state.lessons)))throw Error('GUIDE_PROGRESS_UNREADABLE');
   const completed=l=>{const s=state?.lessons[l.topicId];return s?.completed===true&&(l.progressPolicy!=='current-revision-required'||s.completionRevision===l.contentRevision);};
   return{courseId:id,current:c.lessons.find(l=>l.topicId===currentId)||null,next:c.lessons.find(l=>!completed(l))||null,done:state===null?null:c.lessons.filter(completed).length,total:c.lessons.length,progressKind:state===null?'unavailable':'local-self-report',codeVerifiedServer:false};},
  search(id,query){if(typeof query!=='string'||query.length>200)throw Error('GUIDE_QUERY_LIMIT');const tokens=[...new Set(norm(query).match(/[\p{L}\p{N}.-]+/gu)||[])].slice(0,12);if(!tokens.length)return[];
   return course(id).lessons.map(l=>{const body=norm(l.text),title=norm(l.title+' '+l.moduleCode+' '+l.topicId);const score=tokens.reduce((n,t)=>n+(title.includes(t)?8:body.includes(t)?1:0),0);const pos=Math.max(0,body.indexOf(tokens.find(t=>body.includes(t))||''));return{...l,score,excerpt:l.text.slice(Math.max(0,pos-100),pos+600)};}).filter(l=>l.score>0).sort((a,b)=>b.score-a.score||a.order-b.order).slice(0,6);}
 });
}
