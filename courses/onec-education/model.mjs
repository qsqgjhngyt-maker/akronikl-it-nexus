// Изолированная модель кандидата. Не изменяет Account, основной state и Project Studio.
export const COURSE_IDS=Object.freeze(['onec','1c-enterprise']);
export const courseKey=id=>{if(!COURSE_IDS.includes(id))throw Error('UNKNOWN_COURSE');return `akronikl:it-nexus:onec-candidate:v1:${id}`};
const clone=value=>JSON.parse(JSON.stringify(value));
export function gradeQuiz(quiz,answers){
 if(!Array.isArray(quiz)||!quiz.length)throw Error('QUIZ_REQUIRED');
 const correct=quiz.reduce((n,q,i)=>n+(Number.isInteger(answers?.[i])&&answers[i]===q.correct?1:0),0);
 return{correct,total:quiz.length,passed:correct===quiz.length,kind:'local-self-check',codeVerifiedServer:false,credentialEligible:false};
}
export function progressFor(curriculum,state){
 const topics=curriculum.modules.filter(m=>m.status==='IMPLEMENTED').flatMap(m=>m.topics.filter(t=>t.status==='IMPLEMENTED'));
 const done=topics.filter(t=>{const entry=state.lessons?.[t.topicId];return entry?.completed===true&&(t.progressPolicy!=='current-revision-required'||entry.completionRevision===t.contentRevision);}).length;
 return{done,total:topics.length,pct:topics.length?Math.round(done/topics.length*100):0,scope:'implemented-modules-only',wholeCourseComplete:false};
}
export function createCandidateStore(storage,courseId,curriculum=null){
 const key=courseKey(courseId);
 if(curriculum&&(curriculum.courseId!==courseId||!Array.isArray(curriculum.modules)))throw Error('INVALID_CURRICULUM');
 const topics=curriculum?new Map(curriculum.modules.flatMap(m=>m.topics.map(t=>[t.topicId,m.status==='IMPLEMENTED'&&t.status==='IMPLEMENTED']))):null;
 function read(){const raw=storage.getItem(key);if(!raw)return{schemaVersion:1,courseId,lessons:{},projects:[]};let state;try{state=JSON.parse(raw)}catch{throw Error('SAVED_DATA_UNREADABLE')}
  if(state?.schemaVersion!==1||state.courseId!==courseId||!state.lessons||typeof state.lessons!=='object'||Array.isArray(state.lessons)||!Array.isArray(state.projects))throw Error('SAVED_DATA_INVALID');return state;}
 function save(change){const next=change(clone(read()));storage.setItem(key,JSON.stringify(next));return next;}
 function lessonId(id){
  if(typeof id!=='string'||!id.startsWith(courseId+'.')||!/^[a-z0-9.-]+$/.test(id))throw Error('FOREIGN_TOPIC');
  if(!topics)throw Error('CURRICULUM_REQUIRED');
  if(!topics.has(id))throw Error('UNKNOWN_TOPIC');
  if(!topics.get(id))throw Error('TOPIC_NOT_IMPLEMENTED');
 }
 return{read,
  attempt(id,grade,answers,metadata={}){
   lessonId(id);if(grade?.kind!=='local-self-check')throw Error('INVALID_GRADE');
   if(metadata.contentRevision!==undefined&&(typeof metadata.contentRevision!=='string'||!metadata.contentRevision.trim()))throw Error('REVISION_REQUIRED');
   if(metadata.sharedRefs!==undefined&&(!Array.isArray(metadata.sharedRefs)||metadata.sharedRefs.some(ref=>!/^[-a-z0-9.]+@\d+\.\d+\.\d+$/.test(ref))))throw Error('SHARED_VERSION_REQUIRED');
   const attemptId=metadata.attemptId||crypto.randomUUID();if(!/^[-a-zA-Z0-9.]+$/.test(attemptId))throw Error('INVALID_ATTEMPT_ID');
   return save(s=>{if(Object.values(s.lessons).some(l=>l.attempts?.some(a=>a.attemptId===attemptId)))throw Error('ATTEMPT_EXISTS');const previous=Object.hasOwn(s.lessons,id)?s.lessons[id]:{};s.lessons[id]={...previous,attempts:[...(previous.attempts||[]),{attemptId,at:new Date().toISOString(),grade:clone(grade),answers:clone(answers),...(metadata.contentRevision?{contentRevision:metadata.contentRevision}:{}),...(metadata.sharedRefs?{sharedRefs:clone(metadata.sharedRefs)}:{})}]};return s;});
  },
  complete(id,attested,requiredRevision=null){lessonId(id);return save(s=>{
   const entry=Object.hasOwn(s.lessons,id)?s.lessons[id]:{},attempt=entry.attempts?.at(-1);
   if(!attested||!attempt?.grade?.passed)throw Error('SELF_CHECK_AND_LAB_REQUIRED');
   if(requiredRevision&&attempt.contentRevision!==requiredRevision)throw Error('CURRENT_REVISION_ATTEMPT_REQUIRED');
   const history=[...(entry.completionHistory||[])];if(entry.completed&&!history.length)history.push({contentRevision:entry.completionRevision||null,kind:'preserved-prior-self-report'});
   history.push({contentRevision:attempt.contentRevision||null,attemptId:attempt.attemptId||null,at:new Date().toISOString(),kind:'self-reported'});
   s.lessons[id]={...entry,completed:true,completionKind:'self-reported',labAttested:true,completionRevision:attempt.contentRevision||null,completionHistory:history};return s;
  });},
  createProject({id,note='',origin=null}){if(typeof id!=='string'||!id.trim()||note.length>20000)throw Error('INVALID_PROJECT');return save(s=>{if(s.projects.some(p=>p.id===id))throw Error('PROJECT_EXISTS');s.projects.push({id,courseId,note,dataPolicy:'synthetic-only',origin:clone(origin),createdAt:new Date().toISOString()});return s;});},
  editProject(id,note){if(typeof note!=='string'||note.length>20000)throw Error('INVALID_NOTE');return save(s=>{const p=s.projects.find(p=>p.id===id);if(!p)throw Error('PROJECT_NOT_FOUND');p.note=note;return s;});}
 };
}
export function copyProject(sourceStore,targetStore,sourceId,newId){
 const source=sourceStore.read().projects.find(p=>p.id===sourceId);if(!source)throw Error('PROJECT_NOT_FOUND');
 if(sourceId===newId)throw Error('NEW_PROJECT_ID_REQUIRED');
 if(source.courseId===targetStore.read().courseId)throw Error('OTHER_COURSE_REQUIRED');
 return targetStore.createProject({id:newId,note:source.note,origin:{sourceProjectId:source.id,sourceCourseId:source.courseId,credit:'none'}});
}
