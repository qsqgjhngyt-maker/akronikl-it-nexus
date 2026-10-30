// Only the host's current verified account supplies progress. Completion is self-reported.
export function createLearningProgressReader({readIdentity,loadCourse,readState,readResume=()=>null,readLocale=()=> 'ru',readLesson=()=>null}){
 return async()=>{const identity=readIdentity();if(!identity?.accountId)return null;const course=await loadCourse();if(readIdentity()!==identity)return null;const state=readState();return learningProgress({course,state,resume:readResume(course,state),locale:readLocale(),currentLessonId:readLesson()});};
}
export function learningProgress({course,state={},resume=null,locale='ru',currentLessonId=null}={}){
 const source=course?.curriculum?.lessons;if(!Array.isArray(source)||!source.length)return null;
 const byId=new Map(source.filter(l=>/^cpp\.[a-z0-9.-]+$/.test(l.id)).map(l=>[l.id,l]));
 const ids=[...new Set([...(course.curriculum.sections??[]).flatMap(s=>s.lessonIds??[]),...byId.keys()])].filter(id=>byId.has(id));
 const title=l=>String(typeof l.title==='string'?l.title:l.title?.[locale]??l.title?.ru??l.title?.en??l.id).replace(/[\x00-\x1f]/g,' ').slice(0,160);
 const lesson=id=>byId.has(id)?{id,title:title(byId.get(id))}:null,states=state.courses?.cpp?.lessons??{};
 const completed=ids.filter(id=>states[id]?.completed===true),next=ids.find(id=>states[id]?.completed!==true),last=lesson(resume?.lesson?.id??resume?.lessonId);
 return Object.freeze({source:'current-account-on-this-device',completionEvidence:'user-marked-complete',courseId:'cpp',locale:locale==='en'?'en':'ru',done:completed.length,total:ids.length,current:lesson(currentLessonId),last,next:lesson(next),recentCompleted:completed.slice(-3).map(lesson),updatedAt:typeof state.updatedAt==='string'?state.updatedAt:null});
}
export function progressText(p,locale='ru'){
 if(!p)return locale==='en'?'Your progress is unavailable right now.':'Сейчас не удалось загрузить ваш прогресс.';
 const en=locale==='en';let text=en?`On this device, ${p.done} of ${p.total} C++ topics are marked complete.`:`На этом устройстве отмечено пройденными ${p.done} из ${p.total} тем C++.`;
 const resume=p.current??p.last;if(resume)text+=en?` Last opened topic: ${resume.title}.`:` Последняя открытая тема: ${resume.title}.`;
 if(p.next)text+=en?` You can continue with “${p.next.title}” or review a completed topic.`:` Можно продолжить с темы «${p.next.title}» или повторить пройденное.`;
 else text+=en?' All topics are marked complete. You can revisit a topic or open practice.':'Все темы отмечены пройденными. Можно повторить материал или открыть практику.';
 return text+(en?' Completion marks do not prove a knowledge check.':'Отметки прохождения не подтверждают проверку знаний.');
}
export function startupGreeting(p,locale='ru',variant=0){
 const en=locale==='en';if(p?.next&&p.done>0)return en?`Welcome back! You have marked ${p.done} topics complete. Shall we continue with “${p.next.title}”?`:`С возвращением! У вас отмечено пройденными ${p.done} тем. Продолжим с темы «${p.next.title}»?`;
 if(p&&!p.next)return en?'Welcome back! Shall we practise or review a topic today?':'С возвращением! Сегодня попрактикуемся или повторим одну из тем?';
 const phrases=en?["What shall we start with today?","What’s on our agenda today?","Ready to learn? What shall we explore?"]:['С чего сегодня начнём?','Что у нас сегодня на повестке дня?','Готовы позаниматься? Какую тему разберём?'];return phrases[Math.abs(Math.trunc(variant))%phrases.length];
}
