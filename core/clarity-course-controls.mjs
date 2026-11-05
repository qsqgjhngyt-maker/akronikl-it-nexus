// Явные действия ученика используют существующие отметки/попытки.
// Смена раздела, runtime PASS и самоотчёт не создают завершение автоматически.
export function mountCourseControls(root,{lesson,adapter,session,isCurrent,onSaved=()=>{}}){
 const en=lesson.locale==='en',say=(ru,enText)=>en?enText:ru,control=new AbortController();
 const host=root.querySelector('[data-course-progress]'),check=root.querySelector('[data-course-checkpoint]');
 if(!host||!adapter)return()=>{};
 const entry=()=>adapter.read().entry||{},cpp=lesson.courseId==='cpp';
 const button=(parent,text,run)=>{const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=text;parent.append(b);b.addEventListener('click',async()=>{if(!isCurrent())return;b.disabled=true;try{await session.flush();if(!isCurrent())return;await run();if(!isCurrent())return;render();onSaved();}catch{if(isCurrent())status.textContent=say('Отметка не сохранена. Проверьте ответы и подтверждение практики; ваша работа остаётся открытой.','The mark was not saved. Check your answers and practice confirmation; your work remains open.');}finally{if(isCurrent())b.disabled=false;}},{signal:control.signal});return b;};
 const status=document.createElement('p');status.setAttribute('role','status');host.append(status);
 function render(){if(!isCurrent())return;const value=entry();status.textContent=(value.completed?say('Сохранённая отметка прохождения есть. ','A saved completion mark exists. '):say('Урок ещё не отмечен пройденным. ','No completion mark yet. '))+(Array.isArray(value.attempts)?say('Сохранённых попыток: ','Saved attempts: ')+value.attempts.length+'. ':'')+say('Это ваш учёт работы, а не подтверждение понимания преподавателем.','This records your work; it is not a teacher’s assessment of understanding.');}
 render();
 if(cpp&&adapter.progress){button(host,say('Изменить мою отметку прохождения','Change my completion mark'),()=>adapter.progress(old=>({completed:!old.completed})));}
 if(!cpp&&lesson.assessment&&adapter.recordAttempt&&adapter.complete){
  const qs=lesson.selfcheck.filter(q=>q.kind!=='free');
  button(check||host,say('Сохранить попытку самопроверки','Save self-check attempt'),()=>{
   const answers=qs.map(q=>session.draft.answers[q.id]?.value);
   if(answers.some((a,i)=>!Number.isInteger(a)||a<0||a>=qs[i].options.length))throw Error('ANSWERS_REQUIRED');
   return adapter.recordAttempt(lesson.assessment.quiz,answers,{contentRevision:lesson.assessment.contentRevision,sharedRefs:lesson.assessment.sharedRefs});
  });
  const label=document.createElement('label'),attest=document.createElement('input');attest.type='checkbox';label.append(attest,document.createTextNode(say(' Я выполнил практику в своей учебной среде и сохранил результат.',' I completed the practice in my learning environment and saved the result.')));host.append(label);
  button(host,say('Отметить выполненным по самоотчёту','Mark complete by self-report'),()=>adapter.complete(attest.checked,lesson.assessment.contentRevision));
 }
 return()=>control.abort();
}
