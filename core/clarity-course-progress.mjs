// Только представление прогресса. Сохранённые попытки и версии не переписываются.
import {CLARITY_COURSES} from './clarity-course-registry.mjs';
import {hasRevisionCompletion} from '../courses/onec-education/model.mjs';
import {REFERENCE_IDS} from './reference-course-routes.mjs';
export function curriculumForClarityProgress(curriculum,state){
 return {...curriculum,modules:curriculum.modules.map(module=>({...module,topics:module.topics.map(topic=>{
  const edition=CLARITY_COURSES[topic.topicId],entry=state.lessons?.[topic.topicId];
  if(REFERENCE_IDS.includes(topic.topicId)&&edition?.contentRevision)return {...topic,contentRevision:edition.contentRevision,progressPolicy:'current-revision-required'};
  if(edition?.courseId!==curriculum.courseId||!edition.contentRevision||hasRevisionCompletion(entry,topic.contentRevision)||!hasRevisionCompletion(entry,edition.contentRevision))return topic;
  return {...topic,contentRevision:edition.contentRevision};
 })}))};
}
