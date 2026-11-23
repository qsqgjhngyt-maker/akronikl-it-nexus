import {accountLocalStorage,verifiedAccount,accountStorageLocked} from './account-storage.js';

const STATE_KEY='akronikl:it-nexus:state:v1';const PREFS_KEY='akronikl:it-nexus:prefs:v1';
// Неизменяемый состав исторической программы. Не индекс будущего curriculum.
export const CPP_LEGACY_LESSON_IDS=Object.freeze([
 'cpp.programming-process','cpp.algorithm-definition-properties','cpp.algorithm-representations','cpp.pseudocode-euclidean-algorithm','cpp.flowcharts','cpp.top-down-design','cpp.sequence-branching-loops','cpp.languages-compilation-debugging',
 'cpp.first-cpp-program','cpp.tokens-identifiers-keywords','cpp.comments-constants-literals','cpp.data-types','cpp.variables-scope','cpp.expressions-operators-blocks','cpp.arithmetic-assignment','cpp.type-conversions','cpp.relations-logic','cpp.increment-decrement-sizeof-conditional','cpp.pointers-references-addresses','cpp.standard-io',
 'cpp.if-else-switch','cpp.for-loop','cpp.while-do-while','cpp.one-dimensional-arrays','cpp.two-dimensional-arrays','cpp.char-arrays-strings','cpp.structures','cpp.unions-typedef-enums','cpp.formatted-io','cpp.streams-state','cpp.files','cpp.linked-lists','cpp.stacks-queues',
 'cpp.sorting-basic','cpp.search-linear-binary','cpp.pseudo-random-numbers','cpp.oop-principles','cpp.classes-objects-state-control','cpp.constructors-destructors','cpp.visual-event-model'
]);
export function cppProgramProgress(state={},curriculum=null){
 const lessons=state.courses?.cpp?.lessons||{};
 const count=ids=>{const done=ids.filter(id=>lessons[id]?.completed).length,total=ids.length;return{done,total,pct:total?Math.round(done/total*100):0}};
 const ids=curriculum?.lessons?.map(l=>l.id)||CPP_LEGACY_LESSON_IDS;
 if(ids.some(id=>typeof id!=='string'||!id.startsWith('cpp.'))||new Set(ids).size!==ids.length)throw Error('CPP_PROGRAM_IDS_INVALID');
 const legacySet=new Set(CPP_LEGACY_LESSON_IDS),historical=ids.length===legacySet.size&&ids.every(id=>legacySet.has(id));
 const version=curriculum?.programVersion||(historical?'cpp-v7':null);
 if(typeof version!=='string'||!version.trim()||(!historical&&version==='cpp-v7'))throw Error('CPP_PROGRAM_VERSION_REQUIRED');
 return{...count(ids),programVersion:version,legacy:{...count(CPP_LEGACY_LESSON_IDS),programVersion:'cpp-v7'}};
}
const defaultState=()=>({schemaVersion:1,courses:{},skills:{},migrations:{},updatedAt:null});
const defaultPrefs=()=>({uiLocale:'ru',courseLocale:'ru',mentorLocale:'ru',sidebarCollapsed:false,focusReading:false,effectsQuality:'auto',rightRailCollapsed:false});
function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch{return fallback}}
const stateSources=new WeakMap();let writerContext=null;
const storageError=code=>Object.assign(Error(code),{code});
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const context=()=>{const account=verifiedAccount();if(!account||accountStorageLocked())throw storageError('VERIFIED_ACCOUNT_REQUIRED');return{account,storage:accountLocalStorage()}};
function checkContext(c){if(accountStorageLocked()||verifiedAccount()!==c.account)throw storageError('ACCOUNT_STORAGE_CONTEXT_CHANGED');}
function validateState(s){if(!plain(s)||s.schemaVersion!==1||!plain(s.courses))throw storageError('COURSE_STATE_INVALID');const cpp=s.courses.cpp;if(cpp!==undefined&&(!plain(cpp)||(cpp.lessons!==undefined&&!plain(cpp.lessons))||(cpp.practicums!==undefined&&!plain(cpp.practicums))))throw storageError('COURSE_STATE_INVALID');return s;}
function readState(strict){
 const c=writerContext||context();checkContext(c);const raw=c.storage.getItem(STATE_KEY);let value;
 if(raw===null)value=defaultState();else try{value=JSON.parse(raw);}catch{if(strict)throw storageError('COURSE_STATE_UNREADABLE');value=null;}
 if(strict)validateState(value);const result={...defaultState(),...(plain(value)?value:{})};
 if(value?.schemaVersion===1&&plain(value.courses))stateSources.set(result,{raw,context:c});
 return result;
}
export function loadState(){return readState(!!writerContext)}
export function readCourseStateStrict(){return readState(true)}
function requireWriter(){if(!writerContext){context();throw storageError('COURSE_WRITER_REQUIRED');}checkContext(writerContext);return writerContext;}
export async function withCourseStateWriter(fn,{expectedContext=verifiedAccount()}={}){
 if(typeof fn!=='function'||fn.constructor?.name==='AsyncFunction')throw storageError('COURSE_WRITER_SYNC_REQUIRED');
 if(writerContext)throw storageError('COURSE_WRITER_REENTRY');const captured=context();if(captured.account!==expectedContext)throw storageError('ACCOUNT_STORAGE_CONTEXT_CHANGED');
 const locks=globalThis.navigator?.locks;if(!locks?.request)throw storageError('COURSE_WRITER_UNAVAILABLE');
 return locks.request('nexus:cpp-course-state:writer:'+encodeURIComponent(captured.account.accountId),{mode:'exclusive'},()=>{
  checkContext(captured);writerContext=captured;
  try{const result=fn();if(result&&typeof result.then==='function')throw storageError('COURSE_WRITER_SYNC_REQUIRED');checkContext(captured);return result;}
  finally{writerContext=null;}
 });
}
export function saveState(state,{expected=state}={}){
 const c=requireWriter(),source=stateSources.get(expected);if(!source||source.context.account!==c.account)throw storageError('COURSE_STATE_SOURCE_REQUIRED');
 checkContext(source.context);if(source.context.storage.getItem(STATE_KEY)!==source.raw)throw storageError('COURSE_STATE_CONFLICT');
 validateState(state);const next={...state,updatedAt:new Date().toISOString()},serialized=JSON.stringify(next);checkContext(c);c.storage.setItem(STATE_KEY,serialized);
 checkContext(c);if(c.storage.getItem(STATE_KEY)!==serialized)throw storageError('COURSE_STATE_ACK_MISSING');stateSources.set(next,{raw:serialized,context:c});return next;
}
export function updateState(mutator){requireWriter();const s=readCourseStateStrict(),next=mutator(s)||s;if(next&&typeof next.then==='function')throw storageError('COURSE_WRITER_SYNC_REQUIRED');return saveState(next,{expected:s})}
export function courseWorkToken(state,kind,id){
 const area=kind==='lesson'?'lessons':kind==='practicum'?'practicums':null;if(!area)throw storageError('COURSE_WORK_KIND_INVALID');
 const entry=state.courses?.cpp?.[area]?.[id];if(entry!==undefined&&!plain(entry))throw storageError('COURSE_STATE_INVALID');
 return JSON.stringify({workspace:entry?.workspace??null,code:entry?.code??null,stdin:entry?.stdin??''});
}
function validateWorkPatch(s,kind,id,patch,options){
 if(Object.hasOwn(patch,'clarityDraft'))throw storageError('CLARITY_WRITER_REQUIRED');
 if(['workspace','code','stdin'].some(k=>Object.hasOwn(patch,k))){if(typeof options.expectedWorkToken!=='string')throw storageError('COURSE_WORK_SOURCE_REQUIRED');if(courseWorkToken(s,kind,id)!==options.expectedWorkToken)throw storageError('COURSE_WORK_CONFLICT');}
}
export async function saveCppClarityDraft(id,draft,options={}){
 const captured=context();if(options.expectedContext&&captured.account!==options.expectedContext)throw storageError('ACCOUNT_STORAGE_CONTEXT_CHANGED');
 const module=await import('./cpp-clarity-r3-session.mjs');checkContext(captured);return module.writeCppClarityDraft(id,draft,{...options,expectedContext:captured.account});
}

function preferenceStore(){if(accountStorageLocked())throw Object.assign(Error('VERIFIED_ACCOUNT_REQUIRED'),{code:'VERIFIED_ACCOUNT_REQUIRED'});return verifiedAccount()?accountLocalStorage():localStorage}
export function loadPrefs(){return {...defaultPrefs(),...parse(preferenceStore().getItem(PREFS_KEY),{})}}
export function savePrefs(p){const n={...defaultPrefs(),...p};preferenceStore().setItem(PREFS_KEY,JSON.stringify(n));return n}
export function storageKeys(){return{state:STATE_KEY,prefs:PREFS_KEY}}
export function lessonState(id){return loadState().courses?.cpp?.lessons?.[id]||{}}
export function patchLesson(id,patch,options={}){return updateState(s=>{validateWorkPatch(s,'lesson',id,patch,options);s.courses??={};s.courses.cpp??={courseId:'cpp'};s.courses.cpp.lessons??={};s.courses.cpp.lessons[id]={...(s.courses.cpp.lessons[id]||{}),...patch};return s})}
export function toggleLesson(id,value){return patchLesson(id,{completed:value})}
export function patchPracticum(id,patch,options={}){return updateState(s=>{validateWorkPatch(s,'practicum',id,patch,options);s.courses??={};s.courses.cpp??={courseId:'cpp'};s.courses.cpp.practicums??={};s.courses.cpp.practicums[id]={...(s.courses.cpp.practicums[id]||{}),...patch};return s})}
