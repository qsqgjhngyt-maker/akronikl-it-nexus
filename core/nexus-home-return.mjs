import {createOnecLearningContext} from '../courses/onec-education/learning-context.mjs';
import {availableCourseCards} from './academy-course-cards.js';

export async function recentOnecContinuation(storage,cppResume,locale,bookmark){
  let legacy=null;
  try{
    const rows=createOnecLearningContext({storage,tabId:'home-read-only'}).read().points;
    const last=[...rows].sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt))[0];
    if(last)legacy={...last.point,updatedAt:last.updatedAt};
  }catch{/* A damaged legacy bookmark does not prevent reading the current one. */}
  const recent=[bookmark,legacy].filter(Boolean).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt))[0];
  const cppTime=cppResume?.visitedAt?Date.parse(cppResume.visitedAt):0;
  if(!recent||Date.parse(recent.updatedAt)<=cppTime)return null;
  const {courseId,topicId,sectionId}=recent;
  if(!['onec','1c-enterprise'].includes(courseId))return null;
  const response=await fetch(new URL('../courses/'+courseId+'/curriculum.json',import.meta.url),{credentials:'omit'});
  if(!response.ok)return null;
  const curriculum=await response.json();
  const lesson=curriculum.modules.flatMap(module=>module.topics).find(topic=>topic.topicId===topicId);
  if(!lesson)return null;
  const stage=['explanation','selfcheck','practice'].includes(sectionId)?sectionId:(sectionId==='lab'?'practice':'explanation');
  const search=new URLSearchParams({course:courseId,lesson:topicId,locale,stage});
  return {lesson,mode:'resume',stage,href:'#'+search,course:availableCourseCards[courseId].name};
}
