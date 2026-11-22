// Авторские JSON — источник; маршруты и прежние ID сохраняются.
import {readFile,writeFile} from 'node:fs/promises';
import {REFERENCE_IDS} from '../core/reference-course-routes.mjs';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
export async function buildReferenceCourses(repo=fileURLToPath(new URL('../',import.meta.url))){
 const read=p=>readFile(path.join(repo,p),'utf8');
 for(const id of Object.keys(CLARITY_COURSES))for(const locale of ['ru','en']){
  const source='courses/reference/authoring/'+id+'.'+locale+'.json',bytes=await read(source),lesson=JSON.parse(bytes);
  if(lesson.id!==id||lesson.locale!==locale||!(REFERENCE_IDS.includes(id)?lesson.referenceEdition:lesson.lessonFormat==='guided-v2')||!lesson.contentRevision)throw Error('REFERENCE_LESSON_INVALID: '+source);
  const folder=CLARITY_COURSES[id].pilot?'cpp-clarity-r3':'clarity';
  await writeFile(path.join(repo,'courses',folder,'lessons',id+'.'+locale+'.json'),bytes);
 }
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){await buildReferenceCourses();console.log('Единый формат: 302 редакции подготовлены без публикации.');}
