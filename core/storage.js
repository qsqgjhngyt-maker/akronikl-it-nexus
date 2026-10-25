import {accountLocalStorage} from './account-storage.js';

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
export function loadState(){return {...defaultState(),...parse(accountLocalStorage().getItem(STATE_KEY),defaultState())}}
export function saveState(state){const next={...state,updatedAt:new Date().toISOString()};accountLocalStorage().setItem(STATE_KEY,JSON.stringify(next));return next}
export function updateState(mutator){const s=loadState();return saveState(mutator(s)||s)}
export function loadPrefs(){return {...defaultPrefs(),...parse(localStorage.getItem(PREFS_KEY),{})}}
export function savePrefs(p){const n={...defaultPrefs(),...p};localStorage.setItem(PREFS_KEY,JSON.stringify(n));return n}
export function storageKeys(){return{state:STATE_KEY,prefs:PREFS_KEY}}
export function lessonState(id){return loadState().courses?.cpp?.lessons?.[id]||{}}
export function patchLesson(id,patch){return updateState(s=>{s.courses??={};s.courses.cpp??={courseId:'cpp'};s.courses.cpp.lessons??={};s.courses.cpp.lessons[id]={...(s.courses.cpp.lessons[id]||{}),...patch};return s})}
export function toggleLesson(id,value){return patchLesson(id,{completed:value})}
export function patchPracticum(id,patch){return updateState(s=>{s.courses??={};s.courses.cpp??={courseId:'cpp'};s.courses.cpp.practicums??={};s.courses.cpp.practicums[id]={...(s.courses.cpp.practicums[id]||{}),...patch};return s})}
