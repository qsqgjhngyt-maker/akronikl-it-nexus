const courseProjectLabels = [
  ['cpp','Программирование на C++','C++ programming'],
  ['c','Программирование на C17','C17 programming'],
  ['onec','Программирование 1С','1C programming'],
  ['1c-enterprise','1С:Предприятие','1C:Enterprise'],
  ['independent','Без привязки к курсу','No linked course'],
];

export function projectCourseGroups(projects, courseProjects) {
  const cppIds = new Set(courseProjects.map(project=>project.id));
  const group = project => {
    const origin=project.origin;
    if(courseProjectLabels.some(([id])=>id===origin?.courseId))return origin.courseId;
    if(origin?.kind==='course-final'&&origin.assessmentId==='cpp.course-final.v1')return 'cpp';
    const template=typeof origin?.templateKey==='string'?origin.templateKey:'';
    if(origin?.kind==='course-project'&&(cppIds.has(origin.projectId)||
      template.startsWith('cpp-course:')&&cppIds.has(template.slice('cpp-course:'.length))))return 'cpp';
    const learning=project.learning;
    if(learning?.id&&['lesson','practicum','exercise'].includes(learning.kind)&&
      project.id==='exercise-'+learning.kind+'-'+learning.id)return 'cpp';
    return 'independent';
  };
  return encodeURIComponent(JSON.stringify(projects.map(project=>[project.id,group(project)])));
}

function groupStudioCards(library, en){
  const grid=library.querySelector('.ps-project-grid');
  const cards=[...grid.querySelectorAll('[data-studio-project]')];
  if(!cards.length)return;
  const encoded=library.closest('[data-studio-project-courses]')?.dataset.studioProjectCourses??'%5B%5D';
  const courses=new Map(JSON.parse(decodeURIComponent(encoded)));
  const buckets=new Map(courseProjectLabels.map(([id,ru,english])=>[id,{title:en?english:ru,cards:[]}]));
  for(const card of cards){
    const id=new URLSearchParams(card.querySelector('a.btn').hash.slice(1)).get('project');
    const headline=card.querySelector('h3'),title=document.createElement('h4');
    title.textContent=headline.textContent;
    headline.replaceWith(title);
    buckets.get(courses.get(id)??'independent').cards.push(card);
  }
  const populated=[...buckets].filter(([,group])=>group.cards.length);
  const output=document.createDocumentFragment();
  if(populated.length>1){
    const filter=document.createElement('div');
    filter.className='studio-course-filters';
    filter.setAttribute('role','group');
    filter.setAttribute('aria-label',en?'Filter by course':'Фильтр по курсам');
    for(const [id,{title}] of [['all',{title:en?'All projects':'Все проекты'}],...populated]){
      const button=document.createElement('button');
      button.type='button';
      button.className='btn';
      button.dataset.studioCourseFilter=id;
      button.setAttribute('aria-pressed',String(id==='all'));
      button.textContent=title;
      filter.append(button);
    }
    output.append(filter);
  }
  for(const [id,group] of populated){
    const section=document.createElement('section');
    section.className='studio-project-group';
    section.dataset.studioProjectGroup=id;
    const title=document.createElement('h3');
    title.id='studio-project-group-'+id;
    title.textContent=group.title;
    section.setAttribute('aria-labelledby',title.id);
    const columns=document.createElement('div');
    columns.className='ps-project-grid';
    columns.append(...group.cards);
    section.append(title,columns);
    output.append(section);
  }
  grid.replaceWith(output);
}

const bound=new WeakSet();
export function bindStudioProjectLibrary(library,locale){
  if(!library||bound.has(library))return;
  bound.add(library);
  const en=locale==='en';
  if(!library.querySelector('[data-studio-project-group]'))groupStudioCards(library,en);
  const input=library.querySelector('input'),clear=library.querySelector('[data-studio-search-clear]');
  const filters=[...library.querySelectorAll('[data-studio-course-filter]')];
  const normalize=value=>String(value).normalize('NFKC').toLocaleLowerCase(locale).trim();
  const groups=[...library.querySelectorAll('[data-studio-project-group]')].map(group=>{
    const title=group.querySelector('h3').textContent;
    const cards=[...group.querySelectorAll('[data-studio-project]')].map(card=>({card,text:normalize(
      [card.querySelector('h4').textContent,card.querySelector('p').textContent,card.querySelector('.ps-language').textContent,title].join(' '))}));
    return {group,cards};
  });
  const total=groups.reduce((count,{cards})=>count+cards.length,0);
  input.disabled=total===0;
  let selected='all';
  const apply=()=>{
    const query=normalize(input.value);
    let count=0;
    for(const {group,cards} of groups){
      const matchesCourse=selected==='all'||selected===group.dataset.studioProjectGroup;
      let visible=0;
      for(const {card,text} of cards){
        card.hidden=!matchesCourse||!text.includes(query);
        if(!card.hidden)visible++;
      }
      group.hidden=visible===0;
      count+=visible;
    }
    library.querySelector('[data-studio-search-count]').textContent=en?`Showing ${count} of ${total}`:`Показано ${count} из ${total}`;
    library.querySelector('[data-studio-search-empty]').hidden=!query||count!==0;clear.hidden=!input.value;
  };
  for(const filter of filters)filter.addEventListener('click',()=>{
    selected=filter.dataset.studioCourseFilter;
    for(const button of filters)button.setAttribute('aria-pressed',String(button===filter));
    apply();
  });
  input.addEventListener('input',apply);clear.addEventListener('click',()=>{input.value='';apply();input.focus()});apply();
}
