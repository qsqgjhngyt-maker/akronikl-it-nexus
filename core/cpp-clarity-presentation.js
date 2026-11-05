// Только учебное представление. Сохранения выполняют переданные штатные API.
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=a=>'<ol>'+a.map(x=>'<li>'+e(x)+'</li>').join('')+'</ol>';
const code=s=>'<pre><code>'+e(s)+'</code></pre>';
export function clarityMarkup(g){
 const c=g.clarity;if(!c)return'';const en=g.locale==='en',t=(ru,enText)=>en?enText:ru;
 const open=(mode,title)=>'<button type="button" class="btn" data-clarity-open="'+mode+'">'+e(title)+'</button>';
 const x=c.example,p=c.training,l=c.laboratory;
 const stdout=text=>'<div class="clarity-stdout"><h4>'+t('Ожидаемый результат','Expected output')+'</h4>'+code(text)+'<details><summary>'+t('Точные символы','Exact characters')+'</summary>'+code(JSON.stringify(text))+'</details></div>';
 return '<div class="academy-gold cpp-clarity" data-clarity-lesson="'+e(g.lessonId)+'" lang="'+e(g.locale)+'"><section class="block glass-panel"><h2>'+e(c.goal)+'</h2><h3>'+t('Что уже нужно знать','What you need to know')+'</h3>'+list(c.prerequisites)+c.model.map(p=>'<p>'+e(p)+'</p>').join('')+'</section><section class="block glass-panel" data-clarity-example><h2>'+t('Разобранный пример','Worked example')+'</h2><p>'+e(x.title)+'</p><div class="clarity-example-layout"><div><h3>'+t('Текст программы','Program source')+'</h3>'+code(x.code)+'<p>'+t('Ввод stdin: ','stdin input: ')+(x.stdin?'<code>'+e(JSON.stringify(x.stdin))+'</code>':t('пусто; данные заданы в коде.','empty; the data is in the source.'))+'</p>'+open('example',t('Открыть пример…','Open example…'))+'</div><div>'+stdout(x.expectedStdout)+'<p>'+t('Это ожидаемый вывод. Фактический результат относится к последнему запуску; после ошибки сборки новый код не выполнялся.','This is expected output. Actual output belongs to the last run; a failed build did not execute the new source.')+'</p></div></div><div class="clarity-table-scroll" tabindex="0" role="region" aria-label="'+t('Разбор состояния','State walkthrough')+'"><table><thead><tr>'+[t('Строка / действие','Line / action'),t('До','Before'),t('После','After'),t('Почему','Why')].map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr></thead><tbody>'+x.trace.map(s=>'<tr><th scope="row"><code>'+e(s.line)+'</code></th><td>'+e(s.before)+'</td><td>'+e(s.after)+'</td><td>'+e(s.why)+'</td></tr>').join('')+'</tbody></table></div><p data-clarity-example-negative>'+t('Ошибочный вариант этого примера: ','Incorrect version of this example: ')+e(c.negative)+'</p></section><section class="block glass-panel" data-clarity-training><h2>'+t('Тренировка: измените один случай','Training: change a case')+'</h2><p>'+e(p.challenge)+'</p>'+open('training',t('Открыть тренировку…','Open training…'))+p.hints.map((h,i)=>'<details><summary>'+t('Подсказка ','Hint ')+(i+1)+'</summary><p>'+e(h)+'</p></details>').join('')+'<details><summary>'+t('Проверка после прогноза','Check after predicting')+'</summary>'+stdout(p.expectedStdout)+'</details></section><section class="block glass-panel" id="cppLab" data-clarity-laboratory><h2>'+t('Лабораторная — самостоятельная вариация','Laboratory — independent variation')+'</h2><p>'+e(l.challenge)+'</p>'+open('laboratory',t('Открыть заготовку лабораторной…','Open laboratory starter…'))+'<details><summary>'+t('Посмотреть заготовку','View starter')+'</summary>'+code(l.starterCode)+'</details><h3>'+t('Критерии самопроверки','Self-check criteria')+'</h3>'+list(l.rubric)+'<div data-clarity-lab-expected><h4>'+t('Вывод для первого контрольного случая','Output for the first reference case')+'</h4>'+code(l.cases[0].stdout)+'</div>'+(l.referenceCode?'<details><summary>'+t('Эталон после собственной попытки','Reference after your own attempt')+'</summary>'+code(l.referenceCode)+'</details>':'')+(l.cases?.length?'<details><summary>'+t('Контрольные случаи','Reference cases')+'</summary>'+l.cases.map(x=>'<p>stdin: <code>'+e(JSON.stringify(x.stdin))+'</code></p>'+stdout(x.stdout)).join('')+'</details>':'')+'<p>'+t('Правильный вывод проверяет этот случай. Объяснение и решение похожей задачи проверяйте отдельно. Отметка урока не ставится автоматически.','Correct output checks this case. Assess your explanation and a similar task separately. The lesson is not marked complete automatically.')+'</p></section><p class="block">'+e(c.next)+'</p></div>';
}

export function bindClarityEditor(root,gold,{studio,persist,createCopy,isCurrent}){
 if(!gold||!studio)return;
 const en=gold.locale==='en',t=(ru,enText)=>en?enText:ru,editor=root.querySelector('#editor'),stdin=root.querySelector('#stdin'),out=root.querySelector('#output');
 const host=editor?.closest('.sandbox-block');if(!host)return;
 const capture=()=>{const s=studio.getSnapshot();return{...s,files:s.files.map(f=>f.path===s.activeFile?{...f,content:editor.value}:f)}};
 const label=document.createElement('p');label.dataset.clarityCurrent='';label.textContent=t('Ваша работа. Открытие примера само по себе её не заменяет.','Your work. Opening an example does not replace it automatically.');host.prepend(label);
 const choice=(mode)=>{
  const c=gold.clarity;
  if(mode==='example')return{title:t('Пример','Example'),code:c?.example.code||gold.workedExamples[0].code,stdin:c?.example.stdin??gold.workedExamples[0].stdin??''};
  if(mode==='training')return{title:t('Тренировка','Training'),code:c.training.starterCode,stdin:c.training.stdin||''};
  return{title:t('Лабораторная','Laboratory'),code:c?.laboratory.starterCode||gold.laboratory.starterCode,stdin:c?.laboratory.stdin??gold.laboratory.cases?.[0]?.stdin??''};
 };
 function open(mode){
  if(!isCurrent()||root.querySelector('[data-clarity-choose]'))return;
  const selected=choice(mode),dialog=document.createElement('dialog');dialog.dataset.clarityChoose='';dialog.className='clarity-choice';dialog.lang=gold.locale;
  dialog.innerHTML='<h2>'+e(selected.title)+' · '+e(gold.title)+'</h2><p>'+t('Новая копия открывается отдельным проектом. Перед заменой текущая работа со всеми файлами сохраняется отдельным проектом. Если сохранение не удалось, замены не будет.','A new copy opens as a separate project. Before replacing, your current work and all its files are saved as a separate project. If saving fails, replacement stops.')+'</p><button type="button" class="btn primary" data-choice="copy">'+t('Открыть новую копию','Open a new copy')+'</button><button type="button" class="btn" data-choice="replace">'+t('Сохранить мою работу и заменить','Save my work and replace')+'</button><button type="button" class="btn" data-choice="cancel">'+t('Отмена','Cancel')+'</button><p data-choice-status role="status" aria-live="polite"></p>';
  const title=dialog.querySelector('h2');title.id='clarityChoiceTitle';dialog.setAttribute('aria-labelledby',title.id);
  root.append(dialog);dialog.showModal();let busy=false;
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault()});
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.addEventListener('click',async event=>{
   const action=event.target.closest('[data-choice]')?.dataset.choice;if(!action||busy)return;
   if(action==='cancel'){dialog.close();return}
   if(action==='replace'&&(root.querySelector('#engine')?.classList.contains('busy')||root.querySelector('#runCode')?.disabled)){
    dialog.querySelector('[data-choice-status]').textContent=t('Дождитесь завершения текущего запуска и повторите замену.','Wait for the current run to finish, then try replacement again.');return;
   }
   busy=true;for(const b of dialog.querySelectorAll('button'))b.disabled=true;
   const status=dialog.querySelector('[data-choice-status]');status.textContent=t('Сохраняем работу…','Saving work…');
   const snapshot=capture(),originalInput=stdin.value,signature=JSON.stringify(snapshot);
   try{
    if(!isCurrent())throw Error(t('Окно или аккаунт изменились. Откройте действие снова.','The window or account changed. Open the action again.'));
    const files=action==='copy'?[{path:'main.cpp',content:selected.code,languageId:'cpp'}]:snapshot.files.map(f=>({...f}));
    const input=action==='copy'?selected.stdin:originalInput;
    let notes='NEXUS_LESSON_INPUT.txt';while(files.some(f=>f.path===notes))notes='_'+notes;
    files.push({path:notes,content:t('Скопируйте в поле stdin:\n','Copy into the stdin field:\n')+input,languageId:'text'});
    const project=await createCopy(files,(action==='copy'?selected.title:t('Моя работа до замены','My work before replacement'))+' · '+gold.title,action==='copy'?'main.cpp':snapshot.entryFile);
    if(!isCurrent())throw Error(t('Окно изменилось; редактор не заменён.','The window changed; the editor was not replaced.'));
    const link=document.createElement('a');link.className='btn';link.href='#view=code-studio&project='+encodeURIComponent(project.id);link.target='_blank';link.rel='noopener';link.textContent=t('Открыть сохранённый проект','Open saved project');status.replaceChildren(link);
    if(action==='copy')return;
    if(signature!==JSON.stringify(capture())||originalInput!==stdin.value)throw Error(t('После сохранения появились новые правки. Повторите действие: текущий код сохранён в редакторе.','New edits appeared during saving. Repeat the action: the current source remains in the editor.'));
    const nextFiles=[{path:'main.cpp',content:selected.code,languageId:'cpp'}];
    // Save first. Quota/locked-account failures leave the editor untouched.
    await persist({code:selected.code,stdin:selected.stdin,workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:snapshot.revision+1,files:nextFiles}});
    if(!isCurrent())throw Error(t('Окно изменилось; сохранённая копия доступна отдельно.','The window changed; your saved copy remains available separately.'));
    studio.setWorkspace(nextFiles,'main.cpp',{emit:false});stdin.value=selected.stdin;
    label.textContent=t('Ваша работа · исходная заготовка: ','Your work · starting material: ')+selected.title;
    studio.clearRuntimeDiagnostics?.();out.className='output';out.textContent=t('Заготовка открыта. Этот код ещё не запускался.','Starter opened. This source has not run yet.');
    dialog.close();
   }catch(error){status.append(document.createTextNode(' '+t('Замена остановлена: ','Replacement stopped: ')+(error?.message||String(error))));}
   finally{busy=false;for(const b of dialog.querySelectorAll('button'))b.disabled=false;}
  });
 }
 root.querySelectorAll('[data-clarity-open]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.clarityOpen)));
 // Intercept the existing reset control before its unguarded legacy listener.
 root.querySelector('#resetCode')?.addEventListener('click',event=>{event.stopImmediatePropagation();event.preventDefault();open('example')},{capture:true});
}
