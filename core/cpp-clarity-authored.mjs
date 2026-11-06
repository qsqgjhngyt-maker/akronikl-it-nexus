// Авторская подача включается только у явно согласованной темы.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function authoredMarkup(lesson,{code,table,url}){
 const en=lesson.locale==='en',say=(ru,enText)=>en?enText:ru;
 const paragraphs=xs=>(xs||[]).map(x=>`<p>${esc(x)}</p>`).join('');
 const revealBody=s=>(s.tables||[]).map(table).join('')+paragraphs(s.paragraphs)+(s.code?code(s.code.source,s.code.output,s.code.stdin):'');
 const sectionBody=s=>paragraphs(s.paragraphs)+(s.prediction?`<pre class="prediction-code"><code>${esc(s.prediction.join('\n'))}</code></pre>`:'')+(s.reveal?`<details class="prediction-reveal"><summary>${esc(s.reveal.title)}</summary>${revealBody(s.reveal)}</details>`:'')+(s.code?code(s.code.source,s.code.output,s.code.stdin):'')+(s.deep?`<details class="optional-reading"><summary>${say('Разобраться глубже: ','Explore further: ')}${esc(s.deep.title)}</summary><p>${esc(s.deep.text)}</p><a href="#reading-goldberg">${say('Источник и дальнейшее чтение','Source and further reading')}</a></details>`:'');
 const reading=()=>`<section class="lesson-reading" id="lesson-reading"><h2>${say('Что почитать','Further reading')}</h2><p>${say('Всё необходимое для задания уже есть в уроке. Эти материалы можно открыть по желанию. Внешние ссылки требуют сети.','The lesson contains everything required for the task. These optional external sources require a connection.')}</p>${lesson.reading.map(s=>`<article id="reading-${esc(s.id)}"><h3>${esc(s.title)}</h3><p>${esc(s.author)} · ${esc(s.edition)} · ${esc(s.section)} · ${esc(s.language)}</p><p>${esc(s.purpose)}</p><a href="${esc(s.url)}" target="_blank" rel="noopener">${say('Открыть источник','Open source')} ↗</a></article>`).join('')}</section>`;
 return {
  explanation:()=>`<div class="authored-intro"><p class="eyebrow">${say('От наблюдения к своей программе','From an observation to your own program')}</p><h1>${esc(lesson.title)}</h1><p class="goal">${esc(lesson.goal)}</p>${paragraphs(lesson.prerequisites.map(p=>p.text))}<details class="lesson-map-wrap"><summary>${say("Девять шагов урока", "Nine steps in this lesson")}</summary><nav class="lesson-map" aria-label="${say('Содержание урока','Lesson contents')}">${lesson.sections.map((s,i)=>`<a href="${url(lesson.id,'explanation',lesson.locale,s.id)}">${i+1}. ${esc(s.title)}</a>`).join('')}</nav></details></div>${lesson.sections.map((s,i)=>`<section class="lesson-section authored-section" id="${esc(s.id)}"><div class="section-index">${say('Шаг','Step')} ${i+1} / ${lesson.sections.length}</div><h2>${esc(s.title)}</h2>${sectionBody(s)}</section>`).join('')}<a class="btn primary" href="${url(lesson.id,'selfcheck')}">${say('Проверить, что я понял','Check my understanding')} →</a>${reading()}`,
  recall:id=>{const s=lesson.sections.find(s=>s.id===id);return s?{title:s.title,body:paragraphs(s.paragraphs)+(s.reveal?revealBody(s.reveal):s.code?code(s.code.source,s.code.output,s.code.stdin):'')}:null;},
  reading,
 };
}
export const authoredStyles=`
 .r3-lesson[data-authored=true]{--r3-line:#50657a;font-size:17px;line-height:1.8}
 .r3-lesson[data-authored=true] .stage-body{background:#0b1929;padding:28px;border-radius:18px;margin-top:18px}
 .r3-lesson[data-authored=true] .authored-intro,.r3-lesson[data-authored=true] .authored-section{max-width:1000px;margin-left:auto;margin-right:auto}
 .r3-lesson[data-authored=true] .authored-section{background:#122438;border-color:#3d536a;padding:30px}
 .r3-lesson[data-authored=true] p{max-width:78ch}
 .r3-lesson[data-authored=true] .lesson-map{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:12px 0}
 .r3-lesson[data-authored=true] .lesson-map a{padding:8px 12px;border:1px solid #50657a;border-radius:8px;white-space:normal}
 .r3-lesson[data-authored=true] .example-label{color:#97e2ce;font-weight:700}
 .r3-lesson[data-authored=true] .example-output{border-left:3px solid #97e2ce;padding-left:16px}
 .r3-lesson[data-authored=true] .prediction-reveal{border:2px solid #82e6ce;background:#102d34}
 .r3-lesson[data-authored=true] summary{cursor:pointer;font-weight:650;min-height:32px}
 .r3-lesson[data-authored=true] .prediction-reveal td:nth-child(2){background:#24504b;font-weight:700}
 .r3-lesson[data-authored=true] .lesson-reading{margin-top:32px;border-top:1px solid #50657a;padding-top:20px}
 .r3-lesson[data-authored=true] .lesson-reading article{margin:20px 0;padding:16px;background:#122438;border-radius:12px}
 .r3-lesson[data-authored=true] .question{background:#102c30}
 .r3-lesson[data-authored=true] [data-r3-editor]{border-top:3px solid #82e6ce;padding-top:16px}
 .r3-lesson[data-authored=true] :is(a,button,input,summary,textarea):focus-visible{outline:3px solid #f5d78c;outline-offset:3px}
 @media(max-width:720px){.r3-lesson[data-authored=true]{font-size:16px}.r3-lesson[data-authored=true] .stage-body{padding:12px}.r3-lesson[data-authored=true] .authored-section{padding:16px}.r3-lesson[data-authored=true] .lesson-map{grid-template-columns:1fr}.r3-lesson[data-authored=true] h1{font-size:1.7rem}.r3-lesson[data-authored=true] th,.r3-lesson[data-authored=true] td{padding:6px;min-width:0;font-size:13px;line-height:1.5;overflow-wrap:anywhere}.r3-lesson[data-authored=true] table{table-layout:fixed}.r3-lesson[data-authored=true] .prediction-reveal{padding:10px}}
`;
