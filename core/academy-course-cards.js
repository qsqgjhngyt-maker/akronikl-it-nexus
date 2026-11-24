import {learnerAcademyEntries} from './academy-presentation.js';

// Публичные сведения сверяются с curriculum трёх курсов в проверке презентации.
export const availableCourseCards = Object.freeze({
  cpp: {topics:67,modules:6,name:{ru:'C++',en:'C++'},
    outcome:{ru:'Написать и проверить собственную программу на C++.',en:'Write and check a C++ program of your own.'}},
  onec: {topics:52,modules:12,name:{ru:'Программирование 1С',en:'1C programming'},
    outcome:{ru:'Написать обработчик на BSL и проверить запрос на учебных данных.',en:'Write a BSL handler and check a query on training data.'}},
  '1c-enterprise': {topics:32,modules:8,name:{ru:'Прикладная 1С',en:'Applied 1C'},
    outcome:{ru:'Настроить учебную базу и записать заявку клиента.',en:'Configure a training infobase and record a client request.'}}
});

const category1c={ru:'1С',en:'1C'};
export function academyCourseCards(catalog) {
  const byId = new Map(catalog.courses.map(course=>[course.id,course]));
  return learnerAcademyEntries(catalog).map(entry=>{
    const course=entry.id==='programming' ? byId.get('cpp')??entry : entry;
    if (course.id==='c') return {...course,profile:{topics:14,modules:2,name:course.title,
      outcome:{ru:'Написать, запустить и проверить первую программу на C17.',en:'Write, run and check your first C17 program.'}}};
    const profile=availableCourseCards[course.id];
    if (!profile) return course;
    return {...course,profile,...(course.id==='cpp'?{}:{category:'one-c',categoryTitle:category1c})};
  });
}

const pluralRu=new Intl.PluralRules('ru');
export function topicsCountLabel(count,locale){
  if(locale==='en')return count+' '+(count===1?'topic':'topics');
  return count+' '+({one:'тема',few:'темы'}[pluralRu.select(count)]??'тем');
}

export function courseCardFacts(profile,locale) {
  const modules=locale==='en'?(profile.modules===1?'module':'modules'):
    ({one:'модуль',few:'модуля'}[pluralRu.select(profile.modules)]??'модулей');
  return topicsCountLabel(profile.topics,locale)+' · '+profile.modules+' '+modules;
}
