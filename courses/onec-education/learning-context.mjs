// Локальная точка продолжения 1С. Хранилище передаёт существующий account adapter.
// Здесь нет кода ученика, credentials, облачной синхронизации и начисления зачёта.
const COURSES=new Set(['onec','1c-enterprise']);
const KEY='akronikl:it-nexus:learning-resume:v1:onec-experience';
const MAX_POINTS=128,MAX_BYTES=262144;
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=code=>{throw Object.assign(Error(code),{code});};
const identifier=(x,nullable=false)=>nullable&&x===null?null:typeof x==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9.:-]{0,159}$/.test(x)?x:fail('LEARNING_CONTEXT_ID');
const timestamp=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(x)&&Number.isFinite(Date.parse(x));
const keys=['courseId','topicId','contentRevision','sectionId','stepId','workId','locale','saveState','workRevision','externalState','lastAction','evidenceKind','filePath'];
const choices=(value,allowed)=>allowed.includes(value)?value:fail('LEARNING_CONTEXT_VALUE');
export function normalizeLearningPoint(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k)))fail('LEARNING_CONTEXT_SHAPE');
 const courseId=choices(input.courseId,[...COURSES]),topicId=identifier(input.topicId);
 if(!topicId.startsWith(courseId+'.'))fail('LEARNING_CONTEXT_FOREIGN_TOPIC');
 const contentRevision=identifier(input.contentRevision),stepId=identifier(input.stepId),sectionId=identifier(input.sectionId||'lab');
 const workId=identifier(input.workId??null,true),workRevision=input.workRevision??null;
 if(workRevision!==null&&(!Number.isSafeInteger(workRevision)||workRevision<0))fail('LEARNING_CONTEXT_REVISION');
 const filePath=input.filePath??null;
 if(filePath!==null&&(typeof filePath!=='string'||filePath.length>240||!filePath.isWellFormed()||!/^[\p{L}\p{N}_. /-]+$/u.test(filePath)||filePath.startsWith('/')||filePath.split('/').some(p=>!p||p==='.'||p==='..')))fail('LEARNING_CONTEXT_PATH');
 return{courseId,topicId,contentRevision,sectionId,stepId,workId,locale:choices(input.locale||'ru',['ru','en']),saveState:choices(input.saveState||'unknown',['unknown','saved','dirty','error']),workRevision,externalState:choices(input.externalState||'unknown',['unknown','reported-open','reported-result','local-protocol']),lastAction:choices(input.lastAction||'viewed',['viewed','step-selected','reported-done','saved','exported','protocol-imported','resume-rebased']),evidenceKind:choices(input.evidenceKind||'navigation',['navigation','app-save','self-report','local-protocol']),filePath};
}
const pointKey=p=>[p.courseId,p.topicId,p.workId||'native'].join('|');
let onecDocumentIdentity=null;
export function deriveOnecTabIdentity(session,newId=()=>crypto.randomUUID()){
 const key='nexus:onec-tab-document:v1',tabId=identifier(newId());let resumeTabId=null;
 try{const old=session?.getItem(key);if(old&&/^[a-zA-Z0-9][a-zA-Z0-9.:-]{0,159}$/.test(old))resumeTabId=old;session?.setItem(key,tabId);}catch{/* Без sessionStorage доступно последнее сохранённое место темы. */}
 return{tabId,resumeTabId};
}
export function onecTabIdentity(session){if(onecDocumentIdentity)return onecDocumentIdentity;if(session===undefined)try{session=globalThis.sessionStorage;}catch{session=null;}return onecDocumentIdentity=Object.freeze(deriveOnecTabIdentity(session));}
export function createOnecLearningContext({storage,isCurrent=()=>true,tabId,resumeTabId=null,withLock,now=()=>new Date().toISOString()}={}){
 identifier(tabId);if(!storage?.getItem||!storage?.setItem)fail('LEARNING_CONTEXT_STORAGE');
 const lock=withLock||(globalThis.navigator?.locks?.request?(fn=>navigator.locks.request('nexus:onec-learning-context',{mode:'exclusive'},fn)):null);
 let active=null;
 const current=()=>{if(!isCurrent()){active=null;fail('LEARNING_CONTEXT_ACCOUNT_CHANGED');}};
 function read(){current();const raw=storage.getItem(KEY);if(raw===null)return{schemaVersion:1,points:[]};if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_BYTES)fail('LEARNING_CONTEXT_LIMIT');
  let db;try{db=JSON.parse(raw);}catch{fail('LEARNING_CONTEXT_UNREADABLE');}
  if(db?.schemaVersion!==1||!Array.isArray(db.points)||db.points.length>MAX_POINTS||Object.keys(db).some(k=>!['schemaVersion','points'].includes(k)))fail('LEARNING_CONTEXT_UNREADABLE');
  const seen=new Set();for(const row of db.points){if(!row||Object.keys(row).some(k=>!['tabId','version','updatedAt','point'].includes(k))||!Number.isSafeInteger(row.version)||row.version<1||!timestamp(row.updatedAt))fail('LEARNING_CONTEXT_UNREADABLE');identifier(row.tabId);const point=normalizeLearningPoint(row.point),id=row.tabId+'|'+pointKey(point);if(seen.has(id))fail('LEARNING_CONTEXT_UNREADABLE');seen.add(id);}
  return db;
 }
 function recall(query){current();if(!COURSES.has(query?.courseId))fail('LEARNING_CONTEXT_FOREIGN_TOPIC');const rank=row=>row.tabId===tabId?2:row.tabId===resumeTabId?1:0;const rows=read().points.filter(row=>row.point.courseId===query.courseId&&(!query.topicId||row.point.topicId===query.topicId)&&(!Object.hasOwn(query,'workId')||row.point.workId===query.workId)).sort((a,b)=>rank(b)-rank(a)||Date.parse(b.updatedAt)-Date.parse(a.updatedAt));return rows[0]?clone(rows[0]):null;}
 async function remember(input,{expectedVersion}={}){current();const point=normalizeLearningPoint(input);if(!lock)fail('LEARNING_CONTEXT_LOCK_REQUIRED');
  return lock(async()=>{current();const db=read(),id=pointKey(point),previous=db.points.find(row=>row.tabId===tabId&&pointKey(row.point)===id);
   if(expectedVersion!==undefined&&expectedVersion!==(previous?.version||0))fail('LEARNING_CONTEXT_CONFLICT');
   const updatedAt=now();if(!timestamp(updatedAt))fail('LEARNING_CONTEXT_TIME');const row={tabId,version:(previous?.version||0)+1,updatedAt,point};
   const points=[...db.points.filter(item=>!(item.tabId===tabId&&pointKey(item.point)===id)),row].sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)).slice(0,MAX_POINTS);
   const raw=JSON.stringify({schemaVersion:1,points});if(new TextEncoder().encode(raw).length>MAX_BYTES)fail('LEARNING_CONTEXT_LIMIT');current();storage.setItem(KEY,raw);current();active=clone(row);return clone(row);
  });
 }
 return Object.freeze({key:KEY,read,recall,remember,activate(query){current();active=recall(query);return active?clone(active):null;},current(){current();return active?clone(active):null;},clearActive(){active=null;}});
}
export function reconcileLearningStep(saved,lesson){
 if(!saved)return{point:null,updated:false};const point=normalizeLearningPoint(saved.point||saved);
 if(point.courseId!==lesson.courseId||point.topicId!==lesson.topicId)fail('LEARNING_CONTEXT_FOREIGN_TOPIC');
 const steps=lesson.experience?.route?.steps||[];if(!steps.length)return{point,updated:false};const present=point.stepId==='overview'||steps.some(s=>s.id===point.stepId),updated=point.contentRevision!==lesson.contentRevision||!present;
 return{point:{...point,...(updated?{contentRevision:lesson.contentRevision,stepId:present?point.stepId:steps[0].id,lastAction:'resume-rebased',evidenceKind:'navigation',externalState:'unknown'}:{})},updated,previousRevision:point.contentRevision,previousStep:point.stepId};
}

