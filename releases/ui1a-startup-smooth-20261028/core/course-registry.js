import {fetchPublicJSON} from './offline-assets.js';
let catalogCache; let cppCache; let cppOutlinePromise; let cppPromise; let programmingCache;
async function getJson(url){const r=await fetchPublicJSON(url);if(!r.ok)throw new Error(`${url}: HTTP ${r.status}`);return r.json();}
export async function getCatalog(){if(!catalogCache)catalogCache=await getJson('./courses/catalog.json');return catalogCache;}
// Для Главной достаточно структуры C++: идентификаторов и названий уроков.
// Полные материалы загружаются при переходе в CODE HUB или Project Studio.
// Общий Promise предотвращает повторные запросы при быстрой навигации.
export async function getCppOutline(){
 if(!cppOutlinePromise){
  cppOutlinePromise=Promise.all([
   getJson('./courses/cpp/manifest.json'),
   getJson('./courses/cpp/curriculum.json')
  ]).then(([manifest,curriculum])=>({manifest,curriculum})).catch(error=>{
   cppOutlinePromise=null;throw error;
  });
 }
 return cppOutlinePromise;
}
export async function getCppCourse(){
 if(cppCache)return cppCache;
 if(!cppPromise){
  cppPromise=Promise.all([
   getCppOutline(),
   getJson('./courses/cpp/data/lessons.ru.json'),
   getJson('./courses/cpp/data/lessons.en.json'),
   getJson('./courses/cpp/data/practicums.ru.json'),
   getJson('./courses/cpp/data/projects.ru.json'),
   getJson('./courses/cpp/data/gold-laboratories.json')
  ]).then(([outline,lessonsRu,lessonsEn,practicumsRu,projectsRu,index])=>{
   if(index.schemaVersion!==1||!index.lessons||typeof index.lessons!=='object'||Array.isArray(index.lessons))throw Error('GOLD_LAB_INDEX_INVALID');
   for(const [id,locales]of Object.entries(index.lessons)){
    if(!outline.curriculum.lessons.some(l=>l.id===id))throw Error('GOLD_LAB_INDEX_UNKNOWN_LESSON');
    for(const locale of ['ru','en']){const lab=locales?.[locale];if(!lab||!['title','goal','proof'].every(k=>typeof lab[k]==='string'&&lab[k].trim())||!Number.isSafeInteger(lab.stepCount)||lab.stepCount<1)throw Error('GOLD_LAB_INDEX_INVALID');}
   }
   cppCache={...outline,lessonsRu,lessonsEn,practicumsRu,projectsRu,goldLaboratories:index.lessons};
   return cppCache;
  }).catch(error=>{cppPromise=null;throw error;});
 }
 return cppPromise;
}

export async function getProgrammingLanguages(){if(!programmingCache)programmingCache=await getJson('./courses/programming/languages.json');return programmingCache;}

const goldCache=new Map();
export async function prepareCppGoldLesson(course,id,locale='ru',preparePresentation=()=>{}){
 // Курс, JSON и представление независимы. Представление разрешено только
 // после проверки точного allowlist; Home и обычные уроки его не загружают.
 const [target,gold]=await Promise.all([course,(async()=>{
  const {goldLessonPath}=await import('./academy-gold-catalog.js');
  if(!goldLessonPath(id,locale))return null;
  const [lesson]=await Promise.all([getCppGoldLesson(id,locale),preparePresentation()]);
  return lesson;
 })()]);
 if(gold){target.goldLessons??={};target.goldLessons[locale]??={};target.goldLessons[locale][id]=gold;}
 return gold;
}
export async function getCppGoldLesson(id,locale='ru'){
 const {goldLessonPath,goldLessonModule}=await import('./academy-gold-catalog.js');
 const path=goldLessonPath(id,locale);
 if(!path)return null;
 const key=id+':'+locale;
 if(!goldCache.has(key)){
  const promise=getJson('./'+path).then(data=>{
   if(data.lessonId!==id||data.locale!==locale||data.moduleId!==goldLessonModule(id)||data.standardVersion!=='academy-gold-1.1')throw Error('GOLD_CONTENT_CONTRACT_MISMATCH');
   return data;
  }).catch(error=>{goldCache.delete(key);throw error});
  goldCache.set(key,promise);
 }
 return goldCache.get(key);
}
