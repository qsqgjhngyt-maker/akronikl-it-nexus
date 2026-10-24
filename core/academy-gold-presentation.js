// CP-GOLD учебная разметка и интерактив без изменения сохранения кода/прогресса.
import {goldVisualizationSteps} from './academy-gold-model.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const E=esc;
const ordered=items=>'<ol>'+items.map(s=>'<li>'+E(s)+'</li>').join('')+'</ol>';
const badge=(s)=>'<span class="gold-badge">'+E(s)+'</span>';
const links={
  'CS2023-SDF':{label:'ACM/IEEE-CS/AAAI CS2023 — Software Development Fundamentals',url:'https://csed.acm.org/knowledge-areas/'},
  'CS2023-AL':{label:'ACM/IEEE-CS/AAAI CS2023 — Algorithmic Foundations',url:'https://csed.acm.org/knowledge-areas/'},
  'ISO-CPP':{label:'ISO C++ — официальный статус стандарта',url:'https://isocpp.org/std/the-standard'},
  'CPP-GUIDELINES':{label:'C++ Core Guidelines',url:'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines'}
};
const label=(lang,ru,en)=>lang==='en'?en:ru;
function flowchartSvg(steps,index,lang){
  const active=steps[index]?.title,yes=label(lang,'Да','Yes'),no=label(lang,'Нет','No');
  const node=(key,x,y,title,decision=false)=>{
    const cls='gold-node '+(active===key?'active':'');
    return (decision?'<polygon points="'+(x+70)+','+y+' '+(x+140)+','+(y+36)+' '+(x+70)+','+(y+72)+' '+x+','+(y+36)+'" class="'+cls+'"/>':'<rect x="'+x+'" y="'+y+'" width="140" height="56" rx="18" class="'+cls+'"/>')+'<text x="'+(x+70)+'" y="'+(y+(decision?40:33))+'" text-anchor="middle" class="gold-svg-label">'+E(title)+'</text>';
  };
  const edge=(d,x,y,t)=>'<path d="'+d+'" class="gold-arrow" marker-end="url(#gold-flow-arrow)"/>'+(t?'<text x="'+x+'" y="'+y+'" class="gold-svg-label">'+E(t)+'</text>':'');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 370" width="760" role="img" aria-label="'+E(label(lang,'Блок-схема стоимости доставки: обе ветви каждого условия подписаны','Delivery flowchart: both branches of each condition are labelled'))+'"><title>'+E(label(lang,'Проверка ввода и порога доставки','Input validation and delivery threshold'))+'</title><defs><marker id="gold-flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6" fill="#a1bed0"/></marker></defs>'+edge('M350 66 V99')+edge('M420 136 H550',454,126,yes)+edge('M350 172 V219',366,199,no)+edge('M280 256 H160 V299',208,245,no)+edge('M420 256 H550 V299',455,245,yes)+node(steps[0].title,280,10,steps[0].title)+node('x < 0?',280,100,'x < 0?',true)+node('invalid',550,108,'invalid')+node('x ≥ 1000?',280,220,'x ≥ 1000?',true)+node('150',90,300,'150')+node('free',480,300,'free')+'</svg>';
}
function visualSvg(steps,index,lang,kind){
  if(kind==='flowchart')return flowchartSvg(steps,index,lang);
  const count=steps.length,width=Math.max(770,count*158),current=Math.max(0,Math.min(index,count-1));
  const nodes=steps.map((s,i)=>{
    const x=i*158+19,y=54,active=i===current,kind=s.kind||'action';
    const shape=kind==='decision'?'<polygon points="'+(x+65)+','+y+' '+(x+130)+','+(y+39)+' '+(x+65)+','+(y+78)+' '+x+','+(y+39)+'" class="gold-node '+(active?'active':'')+'"/>':'<rect x="'+x+'" y="'+y+'" width="130" height="78" rx="14" class="gold-node '+(active?'active':'')+'"/>';
    const txt=String(s.title).slice(0,19);
    const arrow=i===0?'':'<path d="M'+(x-22)+' '+(y+39)+' h20" class="gold-arrow"/>';
    return arrow+shape+'<text x="'+(x+65)+'" y="'+(y+43)+'" text-anchor="middle" class="gold-svg-label">'+E(txt)+'</text>';
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' 160" width="'+width+'" role="img" aria-label="'+E(label(lang,'Схема этапов алгоритма','Algorithm stages'))+'"><title>'+E(label(lang,'Шаги алгоритма','Algorithm trace'))+'</title><g>'+nodes+'</g></svg>';
}
export function goldVisualizationMarkup(gold){
  const lang=gold.locale,kind=gold.visualization.kind;
  const steps=goldVisualizationSteps(gold.visualization,{},lang);
  const fields=kind==='euclid'?'<label>a <input data-gold-var="a" type="number" min="0" max="100000" value="48" inputmode="numeric"></label><label>b <input data-gold-var="b" type="number" min="0" max="100000" value="18" inputmode="numeric"></label>':kind==='control-flow'?'<label>n <input data-gold-var="n" type="number" min="0" max="12" value="5" inputmode="numeric"></label>':kind==='flowchart'?'<label>x <input data-gold-var="x" type="number" min="-10000" max="10000" value="1000" inputmode="numeric"></label>':'';
  return '<section class="block glass-panel academy-gold-viz" data-gold-viz data-gold-kind="'+E(kind)+'"><header><span class="eyebrow">'+E(label(lang,'ИНТЕРАКТИВНАЯ МОДЕЛЬ','INTERACTIVE MODEL'))+'</span><h2>'+E(label(lang,'Проследите алгоритм шаг за шагом','Trace the algorithm step by step'))+'</h2></header><div class="gold-viz-inputs">'+fields+'</div><div class="gold-svg-scroll" data-gold-graphic tabindex="0" role="region" aria-label="' + E(label(lang,'Схема с горизонтальной прокруткой','Scrollable algorithm diagram')) + '">'+visualSvg(steps,0,lang,kind)+'</div><div class="gold-controls"><button type="button" class="btn" data-gold-prev>'+E(label(lang,'← Назад','← Previous'))+'</button><span data-gold-index aria-live="polite">1 / '+steps.length+'</span><button type="button" class="btn" data-gold-next>'+E(label(lang,'Далее →','Next →'))+'</button></div><p class="gold-viz-explanation" data-gold-explanation role="status" aria-live="polite">'+E(steps[0].description)+'</p><p class="gold-viz-error" data-gold-error role="alert" hidden></p></section>';
}
const sourceLink=(id,lang)=>{const s=links[id];return s?'<li><a href="'+E(s.url)+'" target="_blank" rel="noopener noreferrer">'+E(lang==='en'&&id==='ISO-CPP'?'ISO C++ — standard status':s.label)+'</a></li>':''};
function goldCasesMarkup(cases,lang){
 const purpose=cases.some(c=>c.purpose);
 return '<table class="gold-reference-cases"><thead><tr><th scope="col">stdin</th><th scope="col">stdout</th>'+(purpose?'<th scope="col">'+E(label(lang,'Что проверяем','Purpose'))+'</th>':'')+'</tr></thead><tbody>'+cases.map(c=>'<tr><td><code>'+E(JSON.stringify(c.stdin))+'</code></td><td><code>'+E(JSON.stringify(c.stdout))+'</code></td>'+(purpose?'<td>'+E(c.purpose)+'</td>':'')+'</tr>').join('')+'</tbody></table>';
}
function modulePracticumMarkup(project,lang){
 if(!project)return '';
 const t=(ru,en)=>label(lang,ru,en);
 const code=(title,text)=>'<details><summary>'+E(title)+'</summary><pre><code>'+E(text)+'</code></pre><button type="button" class="btn" data-gold-copy>'+E(t('Скопировать код','Copy code'))+'</button></details>';
 const rubric=project.rubric.map(r=>'<li><h4>'+E(r.criterion)+'</h4><p><strong>2:</strong> '+E(r.complete)+'</p><p><strong>1:</strong> '+E(r.partial)+'</p><p><strong>0:</strong> '+E(r.missing)+'</p></li>').join('');
 return '<section class="block glass-panel gold-laboratory" data-gold-practicum><span class="eyebrow">'+E(t('ИТОГОВЫЙ ПРАКТИКУМ МОДУЛЯ','MODULE PROJECT'))+'</span><h2>'+E(project.title)+'</h2><p>'+E(project.challenge)+'</p><p>'+E(project.readiness)+'</p><h3>'+E(t('Какие навыки связываем','Skills you will connect'))+'</h3><ul>'+project.skills.map(s=>'<li><a href="#course=cpp&amp;lesson='+E(encodeURIComponent(s.lessonId))+'">'+E(s.title)+'</a></li>').join('')+'</ul><h3>'+E(t('Требования и контракт','Requirements and contract'))+'</h3>'+ordered(project.requirements)+'<h3>'+E(t('Этапы самостоятельной работы','Independent work milestones'))+'</h3>'+ordered(project.milestones)+'<h3>'+E(t('Опорный разбор','Reasoning guide'))+'</h3>'+project.walkthrough.map(p=>'<p>'+E(p)+'</p>').join('')+code(t('Заготовка: доработайте функции и main','Starter: complete the functions and main'),project.starterCode)+'<h3>'+E(t('Контрольные случаи','Reference cases'))+'</h3>'+goldCasesMarkup(project.cases,lang)+'<h3>'+E(t('Что сохранить в своём проекте','Project deliverables'))+'</h3>'+ordered(project.artifacts)+'<h3>'+E(t('Рубрика самопроверки — 0, 1 или 2 балла за критерий','Self-check rubric — 0, 1 or 2 points per criterion'))+'</h3><ol class="gold-project-rubric">'+rubric+'</ol><p class="gold-evidence-note">'+E(project.completionRule)+'</p>'+code(t('Эталон: раскройте после собственной попытки','Reference: open after your own attempt'),project.referenceCode)+'</section>';
}
export function academyGoldMarkup(gold){
  if(!gold)return'';
  const lang=gold.locale, t=(ru,en)=>label(lang,ru,en);
  const heading=(k)=>'<span class="eyebrow">'+E(k)+'</span>';
  const sections=gold.sections.map((s,i)=>'<article class="gold-theory-unit"><span class="gold-counter">'+String(i+1).padStart(2,'0')+'</span><div><h3>'+E(s.title)+'</h3>'+s.paragraphs.map(p=>'<p>'+E(p)+'</p>').join('')+'</div></article>').join('');
  const examples=gold.workedExamples.map((x,i)=>'<article class="gold-example"><div><span class="gold-counter">'+String(i+1).padStart(2,'0')+'</span><h3>'+E(x.title)+'</h3></div><p>'+E(x.purpose)+'</p>'+ordered(x.steps)+'<details><summary>'+E(t('Показать исходный код и ожидаемый вывод','Show source and expected output'))+'</summary><pre><code>'+E(x.code)+'</code></pre><p>'+E(t('Ввод (stdin)','Input (stdin)'))+': <code>'+E(JSON.stringify(x.stdin))+'</code></p><p>'+E(t('Ожидаемый stdout','Expected stdout'))+': <code>'+E(JSON.stringify(x.expectedStdout))+'</code></p>'+(x.cases?.length?'<h4>'+E(t('Дополнительные проверки','Additional checks'))+'</h4>'+goldCasesMarkup(x.cases,lang):'')+'<button type="button" class="btn" data-gold-copy>'+E(t('Скопировать код','Copy code'))+'</button></details></article>').join('');
  const activities=gold.practice.map(x=>'<article class="gold-practice-card">'+badge(lang==='en'?x.level:({basic:'Базовый',applied:'Прикладной',transfer:'Перенос навыка'}[x.level]||x.level))+'<p>'+E(x.task)+'</p><p><strong>'+E(t('Критерий','Success criterion'))+':</strong> '+E(x.criteria)+'</p><details><summary>'+E(t('Подсказка','Hint'))+'</summary><p>'+E(x.hint)+'</p></details></article>').join('');
  const diagnostics=gold.diagnostics.map(x=>'<article class="gold-error-card"><h3>'+E(x.symptom)+'</h3><p><strong>'+E(t('Причина','Cause'))+':</strong> '+E(x.cause)+'</p><p><strong>'+E(t('Исправление','Fix'))+':</strong> '+E(x.fix)+'</p></article>').join('');
  const experiments=gold.experiments.map(x=>'<article class="gold-experiment"><h3>'+E(x.title)+'</h3><p>'+E(x.action)+'</p><details><summary>'+E(t('Предсказание и проверка','Prediction and check'))+'</summary><p>'+E(x.prediction)+'</p><p>'+E(x.verification)+'</p></details></article>').join('');
  const lab=gold.laboratory;
  const tests=goldCasesMarkup(lab.cases,lang);
  const quiz=gold.assessment.map((q,i)=>'<article class="gold-question" data-gold-question data-gold-answer="'+Number(q.correctIndex)+'" data-gold-explanation="'+E(q.explanation)+'"><h3>'+String(i+1)+'. '+E(q.question)+'</h3>'+q.answers.map((a,j)=>'<label><input type="radio" name="gold-q-'+E(gold.lessonId)+'-'+i+'" value="'+j+'"><span>'+E(a)+'</span></label>').join('')+'<button type="button" class="btn" data-gold-check>'+E(t('Проверить ответ','Check answer'))+'</button><p data-gold-feedback role="status" aria-live="polite"></p></article>').join('');
  return '<div class="academy-gold" data-gold-lesson="'+E(gold.lessonId)+'" lang="'+E(lang)+'"><section class="block glass-panel gold-overview">'+heading('ACADEMY GOLD STANDARD 1.1')+'<h2>'+E(gold.title)+'</h2><p>'+E(gold.why)+'</p><div class="gold-overview-columns"><div><h3>'+E(t('После занятия сможете','Learning outcomes'))+'</h3>'+ordered(gold.objectives)+'</div><div><h3>'+E(t('Перед началом','Prerequisites'))+'</h3>'+ordered(gold.prerequisites)+'</div></div></section><section class="block glass-panel gold-theory">'+heading(t('ОСНОВАТЕЛЬНАЯ ТЕОРИЯ','FOUNDATIONAL THEORY'))+'<h2>'+E(t('Разбираемся в причинах и связях','Explain the reasons, not only the rules'))+'</h2>'+sections+'</section>'+goldVisualizationMarkup(gold)+'<section class="block glass-panel">'+heading(t('РАЗОБРАННЫЕ ПРИМЕРЫ','WORKED EXAMPLES'))+'<h2>'+E(t('От задачи к работающему коду','From problem to working code'))+'</h2><div class="gold-example-grid">'+examples+'</div></section><section class="block glass-panel">'+heading(t('УПРАВЛЯЕМЫЕ ЭКСПЕРИМЕНТЫ','GUIDED EXPERIMENTS'))+experiments+'</section><section class="block glass-panel">'+heading(t('ТИПИЧНЫЕ ОШИБКИ','DIAGNOSTICS'))+diagnostics+'</section><section class="block glass-panel">'+heading(t('САМОСТОЯТЕЛЬНАЯ ПРАКТИКА','INDEPENDENT PRACTICE'))+activities+'</section><section class="block glass-panel gold-laboratory">'+heading(t('ЛАБОРАТОРНАЯ РАБОТА','LABORATORY'))+'<h2>'+E(lab.title)+'</h2><p>'+E(lab.challenge)+'</p>'+ordered(lab.steps)+'<details><summary>'+E(t('Заготовка для самостоятельной работы','Starter for independent work'))+'</summary><pre><code>'+E(lab.starterCode)+'</code></pre><button type="button" class="btn" data-gold-copy>'+E(t('Скопировать код','Copy code'))+'</button></details><h3>'+E(t('Контрольные сценарии для сравнения вывода','Reference cases for comparing output'))+'</h3>'+tests+'<p><strong>'+E(t('Доказательства выполнения','Completion evidence'))+':</strong> '+E(t('Сохранённый исходник и материалы по критериям ниже','Saved source and the deliverables in the criteria below'))+'</p>'+ordered(lab.rubric)+'<details><summary>'+E(t('Эталонное решение (по запросу)','Reference solution (on request)'))+'</summary><pre><code>'+E(lab.referenceCode)+'</code></pre><button type="button" class="btn" data-gold-copy>'+E(t('Скопировать код','Copy code'))+'</button></details><p class="gold-evidence-note">'+E(t('Проверка в этом кандидате: запуск в Code Studio и ручное сравнение stdout с указанными случаями. Автоматическая оценка решения ученика не заявляется.','In this candidate: run in Code Studio and compare stdout with the listed cases. Automatic grading of learner submissions is not claimed.'))+'</p></section>'+modulePracticumMarkup(gold.modulePracticum,lang)+'<section class="block glass-panel">'+heading(t('КОНТРОЛЬ ПОНИМАНИЯ','KNOWLEDGE CHECK'))+quiz+'<h3>'+E(t('Объясните своими словами','Explain in your own words'))+'</h3>'+ordered(gold.reflection)+'</section><section class="block glass-panel">'+heading(t('ИТОГ И ДАЛЬШЕ','SUMMARY AND NEXT'))+'<p>'+E(gold.bridge)+'</p><h3>'+E(t('Справочные источники','Reference sources'))+'</h3><ul>'+gold.sourceRefs.map(id=>sourceLink(id,lang)).join('')+'</ul></section></div>';
}
export function bindAcademyGold(root=document,gold){
  for(const card of root.querySelectorAll('[data-gold-question]')){
    const button=card.querySelector('[data-gold-check]'),feedback=card.querySelector('[data-gold-feedback]');
    button?.addEventListener('click',()=>{
      const picked=card.querySelector('input[type="radio"]:checked');
      const english=card.closest('[data-gold-lesson]')?.getAttribute('lang')==='en';
      if(!picked){feedback.textContent=english?'Choose an answer.':'Выберите ответ.';return}
      const correct=Number(picked.value)===Number(card.dataset.goldAnswer);
      feedback.textContent=(correct?(english?'Correct. ':'Верно. '):(english?'Try again. ':'Попробуйте ещё раз. '))+(card.dataset.goldExplanation||'');
      feedback.dataset.result=correct?'correct':'incorrect';
    });
  }
  for(const button of root.querySelectorAll('[data-gold-copy]')){
    button.addEventListener('click',async()=>{
      const text=button.closest('details')?.querySelector('pre code')?.textContent||'';
      if(!text)return;
      try{
        if(!globalThis.navigator?.clipboard?.writeText)throw Error('CLIPBOARD_UNAVAILABLE');
        await navigator.clipboard.writeText(text);
        button.textContent=button.closest('[data-gold-lesson]')?.getAttribute('lang')==='en'?'Copied':'Скопировано';
      }catch{
        button.textContent=button.closest('[data-gold-lesson]')?.getAttribute('lang')==='en'?'Select the visible code to copy':'Выделите видимый код для копирования';
      }
    });
  }
  for(const card of root.querySelectorAll('[data-gold-viz]')){
    const v=card.closest('[data-gold-lesson]'),english=v?.getAttribute('lang')==='en';
    const kind=card.dataset.goldKind,fields=[...card.querySelectorAll('[data-gold-var]')],graphic=card.querySelector('[data-gold-graphic]'),exp=card.querySelector('[data-gold-explanation]'),err=card.querySelector('[data-gold-error]'),indexEl=card.querySelector('[data-gold-index]'),prev=card.querySelector('[data-gold-prev]'),next=card.querySelector('[data-gold-next]');
    const parsed=gold?.lessonId===v?.dataset.goldLesson?gold.visualization:null;
    if(!parsed)continue;
    let steps=[],index=0;
    const centerActive=()=>{const active=graphic.querySelector('.gold-node.active');if(active){const box=active.getBBox();graphic.scrollLeft=Math.max(0,box.x+box.width/2-graphic.clientWidth/2);}};
    if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(()=>{if(!card.isConnected){observer.disconnect();return}centerActive();});observer.observe(graphic);}
    const update=()=>{
      const values=Object.fromEntries(fields.map(f=>[f.dataset.goldVar,f.value]));
      try{
        steps=goldVisualizationSteps(parsed,values,english?'en':'ru');index=Math.max(0,Math.min(index,steps.length-1));
        err.hidden=true;err.textContent='';
        graphic.innerHTML=visualSvg(steps,index,english?'en':'ru',kind);
        centerActive();
        indexEl.textContent=(index+1)+' / '+steps.length;
        exp.textContent=steps[index]?.description||'';
        prev.disabled=index===0;next.disabled=index===steps.length-1;
      }catch(e){
        err.hidden=false;err.textContent=e.message==='GCD_ZERO_ZERO'?(english?'At least one input must be positive.':'Хотя бы одно число должно быть положительным.'):(english?'Enter whole numbers within the displayed limits.':'Введите целые числа в указанных границах.');
        steps=[];prev.disabled=true;next.disabled=true;
      }
    };
    fields.forEach(f=>f.addEventListener('input',()=>{index=0;update()}));
    prev?.addEventListener('click',()=>{index=Math.max(0,index-1);update()});
    next?.addEventListener('click',()=>{index=Math.min(steps.length-1,index+1);update()});
    update();
  }
}
let stylesReady;
export function ensureGoldStyles(){
  if(typeof document==='undefined')return Promise.resolve();
  if(stylesReady)return stylesReady;
  let link=document.querySelector('link[data-academy-gold-css]');
  if(link?.sheet)return Promise.resolve();
  stylesReady=new Promise((resolve,reject)=>{
    const fresh=!link;
    if(fresh){link=document.createElement('link');link.rel='stylesheet';link.dataset.academyGoldCss='';link.href=new URL('../styles/academy-gold.css',import.meta.url).href;}
    link.addEventListener('load',()=>resolve(),{once:true});
    link.addEventListener('error',()=>{link.remove();stylesReady=null;reject(Error('GOLD_STYLES_UNAVAILABLE'));},{once:true});
    if(fresh)document.head.appendChild(link);
  });
  return stylesReady;
}
