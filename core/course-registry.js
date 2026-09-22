let catalogCache; let cppCache; let programmingCache;
async function getJson(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${url}: HTTP ${r.status}`);return r.json();}
export async function getCatalog(){if(!catalogCache)catalogCache=await getJson('./courses/catalog.json');return catalogCache;}
export async function getCppCourse(){if(!cppCache){const [manifest,curriculum,lessonsRu,lessonsEn,practicumsRu,projectsRu]=await Promise.all([
 getJson('./courses/cpp/manifest.json'),
 getJson('./courses/cpp/curriculum.json'),
 getJson('./courses/cpp/data/lessons.ru.json'),
 getJson('./courses/cpp/data/lessons.en.json'),
 getJson('./courses/cpp/data/practicums.ru.json'),
 getJson('./courses/cpp/data/projects.ru.json')]);
 cppCache={manifest,curriculum,lessonsRu,lessonsEn,practicumsRu,projectsRu};}return cppCache;}

export async function getProgrammingLanguages(){if(!programmingCache)programmingCache=await getJson('./courses/programming/languages.json');return programmingCache;}
