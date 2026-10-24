// В RC до SEC-PWA gate разрешена только сеть. Старые CacheStorage entries не имеют
// public authority: глобальный поиск fallback запрещён даже для canonical JSON.
const publicJSON=new Set(['courses/catalog.json','courses/programming/languages.json','courses/cpp/manifest.json','courses/cpp/curriculum.json','courses/cpp/data/lessons.ru.json','courses/cpp/data/lessons.en.json','courses/cpp/data/practicums.ru.json','courses/cpp/data/projects.ru.json','locales/registry.json','locales/ru/ui.json','locales/en/ui.json']);
export async function fetchPublicJSON(url){
 const base=new URL('../',import.meta.url),target=new URL(url,base),path=target.href.startsWith(base.href)?target.href.slice(base.href.length):'';
 if(path.startsWith('courses/cpp/gold/algorithms/')){
  const {GOLD_ALGORITHM_LESSONS,goldLessonPath}=await import('./academy-gold-catalog.js');
  for(const id of GOLD_ALGORITHM_LESSONS)for(const locale of ['ru','en'])publicJSON.add(goldLessonPath(id,locale));
 }
 if(!publicJSON.has(path)||target.search||target.hash)throw new TypeError('Not a public offline asset');
 return fetch(target.href,{cache:'no-store'});
}
