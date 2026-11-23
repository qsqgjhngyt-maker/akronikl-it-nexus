import {textFor} from './i18n.js';
import {clarityContentRevision} from './cpp-clarity-r3-state.mjs';

const algorithms='cpp.section.algorithms';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const skills=[
  {topic:'cpp.algorithm-definition-properties',title:{ru:'Договор входа и выхода',en:'Input and output contract'},
    task:{ru:'Назовите допустимый вход и ожидаемый результат.',en:'Specify the accepted input and the expected output.'}},
  {topic:'cpp.pseudocode-euclidean-algorithm',requires:'cpp.algorithm-definition-properties',title:{ru:'Трассировка',en:'Tracing'},
    task:{ru:'Вручную проследите смену значений для двух чисел.',en:'Trace how the values change for two numbers.'}},
  {topic:'cpp.flowcharts',requires:'cpp.pseudocode-euclidean-algorithm',title:{ru:'Граничные случаи',en:'Boundary cases'},
    task:{ru:'Проверьте ветви для обычного и граничного входа.',en:'Check the branches for typical and boundary inputs.'}},
  {topic:'cpp.top-down-design',requires:'cpp.algorithm-definition-properties',title:{ru:'Декомпозиция',en:'Decomposition'},
    task:{ru:'Разделите задачу на шаги и опишите результат каждого.',en:'Split a task into steps and describe what each produces.'}}
];

export function skillMapMarkup({cpp,lessonStates,locale='ru'}){
  const en=locale==='en';
  const section=cpp.curriculum.sections.find(item=>item.id===algorithms);
  const lessons=new Map(cpp.curriculum.lessons.map(lesson=>[lesson.id,lesson]));
  const topics=new Set(section?.lessonIds??[]);
  const completed=[...topics].filter(id=>lessonStates[id]?.completed===true).length;
  const name=skill=>textFor(skill.title,locale);
  const cards=skills.filter(skill=>topics.has(skill.topic)).map(skill=>{
    const draft=lessonStates[skill.topic]?.clarityDraft;
    const revision=clarityContentRevision(skill.topic);
    const current=draft?.topicId===skill.topic&&draft.contentRevision===revision;
    const run=current&&draft.lastResult?.kind==='runtime'&&draft.lastResult.contentRevision===revision;
    const answer=current&&Object.values(draft.answers??{}).some(item=>item.checked&&item.contentRevision===revision);
    const status=run||answer?(en?'Practice recorded':'Практика записана'):
      lessonStates[skill.topic]?.completed||current?(en?'In study':'В изучении'):(en?'Start the related lesson':'Начните связанную тему');
    const requirement=skills.find(item=>item.topic===skill.requires);
    return `<li class="glass-panel nexus-skill-card"><h2>${e(name(skill))}</h2><p>${e(textFor(skill.task,locale))}</p>
      <p class="nexus-skill-state">${e(status)}</p>
      ${requirement?`<p class="nexus-skill-prerequisite">${en?'Study first':'Сначала изучите'} · <a href="#course=cpp&lesson=${encodeURIComponent(requirement.topic)}">${e(name(requirement))}</a></p>`:''}
      <a class="btn" href="#course=cpp&lesson=${encodeURIComponent(skill.topic)}">${e(textFor(lessons.get(skill.topic)?.title,locale))} →</a></li>`;
  }).join('');
  return `<section class="nexus-visual nexus-skill-map" aria-labelledby="nexusSkillTitle">
    <header><h1 id="nexusSkillTitle">${en?'Skill map':'Карта навыков'}</h1><p>C++ · ${e(textFor(section?.title,locale))}</p></header>
    <div class="nexus-skill-overview glass-panel"><p><strong>${completed}/${topics.size}</strong> ${en?'topics completed':'тем завершено'}</p>
    <p>${en?'Skill confirmation will follow a separate assessment.':'Подтверждение навыков появится после отдельной оценки.'}</p></div>
    <ol class="nexus-skill-grid">${cards}</ol>
  </section>`;
}
