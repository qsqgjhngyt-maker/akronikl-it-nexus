const STATE_KEY='akronikl:it-nexus:state:v1';const PREFS_KEY='akronikl:it-nexus:prefs:v1';
const defaultState=()=>({schemaVersion:1,courses:{},skills:{},migrations:{},updatedAt:null});
const defaultPrefs=()=>({uiLocale:'ru',courseLocale:'ru',mentorLocale:'ru',sidebarCollapsed:false,focusReading:false,effectsQuality:'auto'});
function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch{return fallback}}
export function loadState(){return {...defaultState(),...parse(localStorage.getItem(STATE_KEY),defaultState())}}
export function saveState(state){const next={...state,updatedAt:new Date().toISOString()};localStorage.setItem(STATE_KEY,JSON.stringify(next));return next}
export function updateState(mutator){const s=loadState();return saveState(mutator(s)||s)}
export function loadPrefs(){return {...defaultPrefs(),...parse(localStorage.getItem(PREFS_KEY),{})}}
export function savePrefs(p){const n={...defaultPrefs(),...p};localStorage.setItem(PREFS_KEY,JSON.stringify(n));return n}
export function storageKeys(){return{state:STATE_KEY,prefs:PREFS_KEY}}
export function lessonState(id){return loadState().courses?.cpp?.lessons?.[id]||{}}
export function patchLesson(id,patch){return updateState(s=>{s.courses??={};s.courses.cpp??={courseId:'cpp'};s.courses.cpp.lessons??={};s.courses.cpp.lessons[id]={...(s.courses.cpp.lessons[id]||{}),...patch};return s})}
export function toggleLesson(id,value){return patchLesson(id,{completed:value})}
export function patchPracticum(id,patch){return updateState(s=>{s.courses??={};s.courses.cpp??={courseId:'cpp'};s.courses.cpp.practicums??={};s.courses.cpp.practicums[id]={...(s.courses.cpp.practicums[id]||{}),...patch};return s})}
