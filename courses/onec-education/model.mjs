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
 const ids=curriculum.modules.filter(m=>m.status==='IMPLEMENTED').flatMap(m=>m.topics.map(t=>t.topicId));
 const done=ids.filter(id=>state.lessons?.[id]?.completed===true).length;
 return{done,total:ids.length,pct:ids.length?Math.round(done/ids.length*100):0,scope:'implemented-module-only',wholeCourseComplete:false};
}
export function createCandidateStore(storage,courseId){
 const key=courseKey(courseId);
 function read(){const raw=storage.getItem(key);if(!raw)return{schemaVersion:1,courseId,lessons:{},projects:[]};let state;try{state=JSON.parse(raw)}catch{throw Error('SAVED_DATA_UNREADABLE')}
  if(state?.schemaVersion!==1||state.courseId!==courseId||!state.lessons||typeof state.lessons!=='object'||Array.isArray(state.lessons)||!Array.isArray(state.projects))throw Error('SAVED_DATA_INVALID');return state;}
 function save(change){const next=change(clone(read()));storage.setItem(key,JSON.stringify(next));return next;}
 function lessonId(id){if(typeof id!=='string'||!id.startsWith(courseId+'.')||!/^[a-z0-9.-]+$/.test(id))throw Error('FOREIGN_TOPIC');}
 return{read,
  attempt(id,grade,answers){lessonId(id);if(grade?.kind!=='local-self-check')throw Error('INVALID_GRADE');return save(s=>{const previous=Object.hasOwn(s.lessons,id)?s.lessons[id]:{};s.lessons[id]={...previous,attempts:[...(previous.attempts||[]),{at:new Date().toISOString(),grade:clone(grade),answers:clone(answers)}]};return s;});},
  complete(id,attested){lessonId(id);return save(s=>{const entry=Object.hasOwn(s.lessons,id)?s.lessons[id]:{};if(!attested||!entry.attempts?.at(-1)?.grade?.passed)throw Error('SELF_CHECK_AND_LAB_REQUIRED');s.lessons[id]={...entry,completed:true,completionKind:'self-reported',labAttested:true};return s;});},
  createProject({id,note='',origin=null}){if(typeof id!=='string'||!id.trim()||note.length>20000)throw Error('INVALID_PROJECT');return save(s=>{if(s.projects.some(p=>p.id===id))throw Error('PROJECT_EXISTS');s.projects.push({id,courseId,note,dataPolicy:'synthetic-only',origin:clone(origin),createdAt:new Date().toISOString()});return s;});},
  editProject(id,note){if(typeof note!=='string'||note.length>20000)throw Error('INVALID_NOTE');return save(s=>{const p=s.projects.find(p=>p.id===id);if(!p)throw Error('PROJECT_NOT_FOUND');p.note=note;return s;});}
 };
}
export function copyProject(sourceStore,targetStore,sourceId,newId){
 const source=sourceStore.read().projects.find(p=>p.id===sourceId);if(!source)throw Error('PROJECT_NOT_FOUND');
 if(source.courseId===targetStore.read().courseId)throw Error('OTHER_COURSE_REQUIRED');
 return targetStore.createProject({id:newId,note:source.note,origin:{sourceProjectId:source.id,sourceCourseId:source.courseId,credit:'none'}});
}
