// CP-GOLD учебная разметка и интерактив без изменения сохранения кода/прогресса.
import {goldVisualizationSteps} from './academy-gold-model.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
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
function visualSvg(steps,index,lang){
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
  const steps=goldVisualizationSteps(gold.visualization);
  const fields=kind==='euclid'?'<label>a <input data-gold-var="a" type="number" min="0" max="100000" value="48" inputmode="numeric"></label><label>b <input data-gold-var="b" type="number" min="0" max="100000" value="18" inputmode="numeric"></label>':kind==='control-flow'?'<label>n <input data-gold-var="n" type="number" min="0" max="12" value="5" inputmode="numeric"></label>':kind==='flowchart'?'<label>x <input data-gold-var="x" type="number" min="-10000" max="10000" value="1000" inputmode="numeric"></label>':'';
  return '<section class="block glass-panel academy-gold-viz" data-gold-viz data-gold-kind="'+E(kind)+'"><header><span class="eyebrow">'+E(label(lang,'ИНТЕРАКТИВНАЯ МОДЕЛЬ','INTERACTIVE MODEL'))+'</span><h2>'+E(label(lang,'Проследите алгоритм шаг за шагом','Trace the algorithm step by step'))+'</h2></header><div class="gold-viz-inputs">'+fields+'</div><div class="gold-svg-scroll" data-gold-graphic>'+visualSvg(steps,0,lang)+'</div><div class="gold-controls"><button type="button" class="btn" data-gold-prev>'+E(label(lang,'← Назад','← Previous'))+'</button><span data-gold-index aria-live="polite">1 / '+steps.length+'</span><button type="button" class="btn" data-gold-next>'+E(label(lang,'Далее →','Next →'))+'</button></div><p class="gold-viz-explanation" data-gold-explanation role="status" aria-live="polite">'+E(steps[0].description)+'</p><p class="gold-viz-error" data-gold-error role="alert" hidden></p></section>';
}
const sourceLink=id=>{const s=links[id];return s?'<li><a href="'+E(s.url)+'" target="_blank" rel="noopener noreferrer">'+E(s.label)+'</a></li>':''};
export function academyGoldMarkup(gold){
  if(!gold)return'';
  const lang=gold.locale, t=(ru,en)=>label(lang,ru,en);
  const heading=(k)=>'<span class="eyebrow">'+E(k)+'</span>';
  const sections=gold.sections.map((s,i)=>'<article class="gold-theory-unit"><span class="gold-counter">'+String(i+1).padStart(2,'0')+'</span><div><h3>'+E(s.title)+'</h3>'+s.paragraphs.map(p=>'<p>'+E(p)+'</p>').join('')+'</div></article>').join('');
  const examples=gold.workedExamples.map((x,i)=>'<article class="gold-example"><div><span class="gold-counter">'+String(i+1).padStart(2,'0')+'</span><h3>'+E(x.title)+'</h3></div><p>'+E(x.purpose)+'</p>'+ordered(x.steps)+'<details><summary>'+E(t('Показать исходный код и ожидаемый вывод','Show source and expected output'))+'</summary><pre><code>'+E(x.code)+'</code></pre><p>'+E(t('Ввод (stdin)','Input (stdin)'))+': <code>'+E(JSON.stringify(x.stdin))+'</code></p><p>'+E(t('Ожидаемый stdout','Expected stdout'))+': <code>'+E(JSON.stringify(x.expectedStdout))+'</code></p><button type="button" class="btn" data-gold-copy>'+E(t('Скопировать код','Copy code'))+'</button></details></article>').join('');
  const activities=gold.practice.map(x=>'<article class="gold-practice-card">'+badge(x.level)+'<p>'+E(x.task)+'</p><p><strong>'+E(t('Критерий','Success criterion'))+':</strong> '+E(x.criteria)+'</p><details><summary>'+E(t('Подсказка','Hint'))+'</summary><p>'+E(x.hint)+'</p></details></article>').join('');
  const diagnostics=gold.diagnostics.map(x=>'<article class="gold-error-card"><h3>'+E(x.symptom)+'</h3><p><strong>'+E(t('Причина','Cause'))+':</strong> '+E(x.cause)+'</p><p><strong>'+E(t('Исправление','Fix'))+':</strong> '+E(x.fix)+'</p></article>').join('');
  const experiments=gold.experiments.map(x=>'<article class="gold-experiment"><h3>'+E(x.title)+'</h3><p>'+E(x.action)+'</p><details><summary>'+E(t('Предсказание и проверка','Prediction and check'))+'</summary><p>'+E(x.prediction)+'</p><p>'+E(x.verification)+'</p></details></article>').join('');
  const lab=gold.laboratory;
  const tests='<table><thead><tr><th>stdin</th><th>stdout</th></tr></thead><tbody>'+lab.cases.map(c=>'<tr><td><code>'+E(JSON.stringify(c.stdin))+'</code></td><td><code>'+E(JSON.stringify(c.stdout))+'</code></td></tr>').join('')+'</tbody></table>';
  const quiz=gold.assessment.map((q,i)=>'<article class="gold-question" data-gold-question data-gold-answer="'+Number(q.correctIndex)+'" data-gold-explanation="'+E(q.explanation)+'"><h3>'+String(i+1)+'. '+E(q.question)+'</h3>'+q.answers.map((a,j)=>'<label><input type="radio" name="gold-q-'+E(gold.lessonId)+'-'+i+'" value="'+j+'"><span>'+E(a)+'</span></label>').join('')+'<button type="button" class="btn" data-gold-check>'+E(t('Проверить ответ','Check answer'))+'</button><p data-gold-feedback role="status" aria-live="polite"></p></article>').join('');
  return '<div class="academy-gold" data-gold-lesson="'+E(gold.lessonId)+'" lang="'+E(lang)+'"><section class="block glass-panel gold-overview">'+heading('ACADEMY GOLD STANDARD 1.1')+'<h2>'+E(gold.title)+'</h2><p>'+E(gold.why)+'</p><div class="gold-overview-columns"><div><h3>'+E(t('После занятия сможете','Learning outcomes'))+'</h3>'+ordered(gold.objectives)+'</div><div><h3>'+E(t('Перед началом','Prerequisites'))+'</h3>'+ordered(gold.prerequisites)+'</div></div></section><section class="block glass-panel gold-theory">'+heading(t('ОСНОВАТЕЛЬНАЯ ТЕОРИЯ','FOUNDATIONAL THEORY'))+'<h2>'+E(t('Разбираемся в причинах и связях','Explain the reasons, not only the rules'))+'</h2>'+sections+'</section>'+goldVisualizationMarkup(gold)+'<section class="block glass-panel">'+heading(t('РАЗОБРАННЫЕ ПРИМЕРЫ','WORKED EXAMPLES'))+'<h2>'+E(t('От задачи к работающему коду','From problem to working code'))+'</h2><div class="gold-example-grid">'+examples+'</div></section><section class="block glass-panel">'+heading(t('УПРАВЛЯЕМЫЕ ЭКСПЕРИМЕНТЫ','GUIDED EXPERIMENTS'))+experiments+'</section><section class="block glass-panel">'+heading(t('ТИПИЧНЫЕ ОШИБКИ','DIAGNOSTICS'))+diagnostics+'</section><section class="block glass-panel">'+heading(t('САМОСТОЯТЕЛЬНАЯ ПРАКТИКА','INDEPENDENT PRACTICE'))+activities+'</section><section class="block glass-panel gold-laboratory">'+heading(t('ЛАБОРАТОРНАЯ РАБОТА','LABORATORY'))+'<h2>'+E(lab.title)+'</h2><p>'+E(lab.challenge)+'</p>'+ordered(lab.steps)+'<h3>'+E(t('Контрольные сценарии для сравнения вывода','Reference cases for comparing output'))+'</h3>'+tests+'<p><strong>'+E(t('Доказательства выполнения','Completion evidence'))+':</strong> '+E(lab.artifact)+'</p>'+ordered(lab.rubric)+'<details><summary>'+E(t('Эталонное решение (по запросу)','Reference solution (on request)'))+'</summary><pre><code>'+E(lab.referenceCode)+'</code></pre><button type="button" class="btn" data-gold-copy>'+E(t('Скопировать код','Copy code'))+'</button></details><p class="gold-evidence-note">'+E(t('Проверка в этом кандидате: запуск в Code Studio и ручное сравнение stdout с указанными случаями. Автоматическая оценка решения ученика не заявляется.','In this candidate: run in Code Studio and compare stdout with the listed cases. Automatic grading of learner submissions is not claimed.'))+'</p></section><section class="block glass-panel">'+heading(t('КОНТРОЛЬ ПОНИМАНИЯ','KNOWLEDGE CHECK'))+quiz+'<h3>'+E(t('Объясните своими словами','Explain in your own words'))+'</h3>'+ordered(gold.reflection)+'</section><section class="block glass-panel">'+heading(t('ИТОГ И ДАЛЬШЕ','SUMMARY AND NEXT'))+'<p>'+E(gold.bridge)+'</p><h3>'+E(t('Проверенные справочные источники','Reference sources'))+'</h3><ul>'+gold.sourceRefs.map(sourceLink).join('')+'</ul></section></div>';
}
export function bindAcademyGold(root=document){
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
    const gold=v?.dataset.goldModel;
    // Model is resolved from the authored module via a registry, never from HTML attributes.
    const kind=card.dataset.goldKind,fields=[...card.querySelectorAll('[data-gold-var]')],graphic=card.querySelector('[data-gold-graphic]'),exp=card.querySelector('[data-gold-explanation]'),err=card.querySelector('[data-gold-error]'),indexEl=card.querySelector('[data-gold-index]'),prev=card.querySelector('[data-gold-prev]'),next=card.querySelector('[data-gold-next]');
    const parsed=globalThis.__NEXUS_GOLD_VISUALIZATIONS__?.get(v?.dataset.goldLesson);
    if(!parsed)continue;
    let steps=[],index=0;
    const update=()=>{
      const values=Object.fromEntries(fields.map(f=>[f.dataset.goldVar,f.value]));
      try{
        steps=goldVisualizationSteps(parsed,values);index=Math.min(index,steps.length-1);
        err.hidden=true;err.textContent='';
        graphic.innerHTML=visualSvg(steps,index,english?'en':'ru');
        indexEl.textContent=(index+1)+' / '+steps.length;
        exp.textContent=steps[index]?.description||'';
        prev.disabled=index===0;next.disabled=index===steps.length-1;
      }catch(e){
        err.hidden=false;err.textContent=(english?'Check the input range. ':'Проверьте допустимый диапазон. ')+String(e.message);
        steps=[];prev.disabled=true;next.disabled=true;
      }
    };
    fields.forEach(f=>f.addEventListener('input',()=>{index=0;update()}));
    prev?.addEventListener('click',()=>{index=Math.max(0,index-1);update()});
    next?.addEventListener('click',()=>{index=Math.min(steps.length-1,index+1);update()});
    update();
  }
}
export function registerGoldVisualization(id,model){
  // Pure lesson-local data. Does not include account, progress, or executable user code.
  if(!globalThis.__NEXUS_GOLD_VISUALIZATIONS__)globalThis.__NEXUS_GOLD_VISUALIZATIONS__=new Map();
  globalThis.__NEXUS_GOLD_VISUALIZATIONS__.set(id,model);
}
export function ensureGoldStyles(){
  if(typeof document==='undefined'||document.querySelector('link[data-academy-gold-css]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.dataset.academyGoldCss='';link.href=new URL('../styles/academy-gold.css',import.meta.url).href;document.head.appendChild(link);
}
