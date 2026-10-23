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
   getJson('./courses/cpp/data/projects.ru.json')
  ]).then(([outline,lessonsRu,lessonsEn,practicumsRu,projectsRu])=>{
   cppCache={...outline,lessonsRu,lessonsEn,practicumsRu,projectsRu};
   return cppCache;
  }).catch(error=>{cppPromise=null;throw error;});
 }
 return cppPromise;
}

export async function getProgrammingLanguages(){if(!programmingCache)programmingCache=await getJson('./courses/programming/languages.json');return programmingCache;}
