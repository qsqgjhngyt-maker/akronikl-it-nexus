// Авторская подача включается только у явно согласованной темы.
import {learningFlowMarkup,learningVisualStyles} from './clarity-visuals.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));


// Геометрия roomy включается явно; разметка остальных схем сохраняется.
function roomyDecisionFlowchart(chart,say){
 const x=90,resultX=262,exitX=334,firstY=250,step=260,half=110,ioH=28,ioW=65;
 const lastY=firstY+(chart.decisions.length-1)*step,fallbackY=lastY+170,endY=fallbackY+80;
 const label=(text,x,y,cls='')=>`<text class="${cls}" x="${x}" y="${y}">${esc(text)}</text>`;
 const decisionLabel=(text,cx,cy)=>{
  const split=String(text).match(/^(.*\s(?:или|or))\s(.+)$/);
  return split?`<text x="${cx}" y="${cy}"><tspan x="${cx}" dy="-11">${esc(split[1])} </tspan><tspan x="${cx}" dy="22">${esc(split[2])}</tspan></text>`:label(text,cx,cy);
 };
 const splitOutput=text=>String(text).length>8?String(text).match(/^(\S+)\s(.+)$/):null;
 const outputLabel=(text,cx,cy)=>{const split=splitOutput(text);return split?`<text x="${cx}" y="${cy}"><tspan x="${cx}" dy="-11">${esc(split[1])} </tspan><tspan x="${cx}" dy="22">${esc(split[2])}</tspan></text>`:label(text,cx,cy);};
 const node=(id,kind,shape,text,cx,cy)=>`<g data-flowchart-node="${id}" data-node-kind="${kind}">${shape}${kind==='decision'?decisionLabel(text,cx,cy):kind==='output'?outputLabel(text,cx,cy):label(text,cx,cy)}</g>`;
 const terminal=(id,text,y)=>node(id,'terminal',`<ellipse cx="${x}" cy="${y}" rx="68" ry="24"/>`,text,x,y);
 const io=(id,text,cx,y)=>{const h=splitOutput(text)?40:ioH;return node(id,'output',`<path d="M${cx-ioW+12} ${y-h}H${cx+ioW}l-12 ${h*2}H${cx-ioW}Z"/>`,text,cx,y);};
 const arrow=(line,tip)=>`<path class="flowchart-arrow" d="${line} ${tip}"/>`;
 const down=(from,to)=>arrow(`M${x} ${from}V${to}`,`m-4-7 4 7 4-7`);
 const branch=b=>b==='yes'?say('да','yes'):say('нет','no');
 const decisions=chart.decisions.map((d,i)=>{
  const y=firstY+i*step,next=i===chart.decisions.length-1?fallbackY-ioH:y+step-half;
  return node('decision-'+i,'decision',`<path class="flowchart-decision" d="M${x} ${y-half}l82 ${half}-82 ${half}-82-${half}Z"/>`,d.condition,x,y)
   +arrow(`M${x+82} ${y}H${resultX-ioW+6}`,`m-7-4 7 4-7 4`)
   +label(branch(d.branch),187,y-22,'flowchart-branch')
   +io('output-'+i,d.output,resultX,y)
   +`<path class="flowchart-arrow" d="M${resultX+ioW-6} ${y}H${exitX}"/>`
   +down(y+half,next)
   +label(branch(d.branch==='yes'?'no':'yes'),x+24,(y+half+next)/2,'flowchart-branch');
 }).join('');
 return `<figure class="lesson-flowchart"><figcaption>${esc(chart.caption)}</figcaption>
 <svg viewBox="0 0 336 ${endY+28}" role="img" aria-label="${esc(chart.caption)}"><desc>${esc(chart.paths.join(' '))}</desc>
 ${terminal('start',say('Начало','Start'),27)}${down(51,91-ioH)}${io('input',chart.input,x,91)}${down(91+ioH,firstY-half)}
 ${decisions}${io('fallback',chart.fallback,x,fallbackY)}${down(fallbackY+ioH,endY-24)}
 ${arrow(`M${exitX} ${firstY}V${endY}H${x+68}`,`m7-4-7 4 7 4`)}${terminal('end',say('Конец','End'),endY)}
 </svg><details><summary>${say('Маршруты схемы текстом','Flowchart paths in text')}</summary><ul>${chart.paths.map(line=>`<li>${esc(line)}</li>`).join('')}</ul></details></figure>`;
}

// A decision ladder follows the next check down and exits to the right.
function decisionFlowchart(chart,say){
 if(chart.layout==='roomy')return roomyDecisionFlowchart(chart,say);
 const x=90,exitX=325,resultX=266,firstY=164,step=88;
 const lastY=firstY+(chart.decisions.length-1)*step;
 const fallbackY=lastY+78,endY=fallbackY+70;
 const label=(text,x,y,cls='')=>`<text class="${cls}" x="${x}" y="${y}">${esc(text)}</text>`;
 const terminal=(text,y)=>`<ellipse cx="${x}" cy="${y}" rx="53" ry="20"/>${label(text,x,y)}`;
 const io=(text,x,y,halfWidth)=>`<path d="M${x-halfWidth+9} ${y-20}H${x+halfWidth}l-9 40H${x-halfWidth}Z"/>${label(text,x,y)}`;
 const arrow=(line,tip)=>`<path class="flowchart-arrow" d="${line} ${tip}"/>`;
 const down=(from,to)=>arrow(`M${x} ${from}V${to}`,`m-4-7 4 7 4-7`);
 const branchLabel=branch=>branch==='yes'?say('да','yes'):say('нет','no');
 const decisions=chart.decisions.map((decision,i)=>{
  const y=firstY+i*step,next=i===chart.decisions.length-1?fallbackY-20:y+step-29;
  return `<g>
   <path class="flowchart-decision" d="M${x} ${y-29}l82 29-82 29-82-29Z"/>
   ${label(decision.condition,x,y)}
   ${arrow(`M${x+82} ${y}H${resultX-44}`,`m-7-4 7 4-7 4`)}
   ${label(branchLabel(decision.branch),196,y-11,'flowchart-branch')}
   ${io(decision.output,resultX,y,49)}
   <path class="flowchart-arrow" d="M${resultX+45} ${y}H${exitX}"/>
   ${down(y+29,next)}
   ${label(branchLabel(decision.branch==='yes'?'no':'yes'),x+24,(y+29+next)/2,'flowchart-branch')}
  </g>`;
 }).join('');
 return `<figure class="lesson-flowchart">
  <figcaption>${esc(chart.caption)}</figcaption>
  <svg viewBox="0 0 336 ${endY+28}" role="img" aria-label="${esc(chart.caption)}">
   <desc>${esc(chart.paths.join(' '))}</desc>
   ${terminal(say('Начало','Start'),27)}
   ${down(47,71)}
   ${io(chart.input,x,91,65)}
   ${down(111,firstY-29)}
   ${decisions}
   ${io(chart.fallback,x,fallbackY,56)}
   ${down(fallbackY+20,endY-20)}
   ${arrow(`M${exitX} ${firstY}V${endY}H${x+53}`,`m7-4-7 4 7 4`)}
   ${terminal(say('Конец','End'),endY)}
  </svg>
  <details><summary>${say('Маршруты схемы текстом','Flowchart paths in text')}</summary>
   <ul>${chart.paths.map(line=>`<li>${esc(line)}</li>`).join('')}</ul>
  </details>
 </figure>`;
}

export function authoredMarkup(lesson,{code,table,url,programBundle,figures=()=>''}){
 const en=lesson.locale==='en',say=(ru,enText)=>en?enText:ru;
 const paragraphs=xs=>(xs||[]).map(x=>`<p>${esc(x)}</p>`).join('');
 const program=spec=>{
  if(!spec)return '';
  const {source,output,stdin,files,metadata,outputFiles}=spec;
  return files||metadata||outputFiles||lesson.courseId!=='cpp'?code(source,output,stdin,undefined,spec):code(source,output,stdin);
 };
 const revealBody=s=>(s.tables||[]).map(table).join('')+paragraphs(s.paragraphs)+program(s.code);
 const diagram=s=>s.flow?learningFlowMarkup(s.flow):s.flowchart?decisionFlowchart(s.flowchart,say):s.diagram?`<figure class="lesson-diagram"><figcaption>${esc(s.diagram.caption)}</figcaption><pre>${esc(s.diagram.text)}</pre></figure>`:'';
 const optionalReading=deep=>deep?`<details class="optional-reading"><summary>${say('Разобраться глубже: ','Explore further: ')}${esc(deep.title)}</summary><p>${esc(deep.text)}</p>${program(deep.code)}<a href="#reading-${esc(deep.sourceId||'goldberg')}">${say('Источник и дальнейшее чтение','Source and further reading')}</a></details>`:'';
 const predictionInput=s=>(s.predictionInput?`<p>${say('Ввод для прогноза','Prediction input')}</p><pre>${s.predictionInput.startsWith('\n')?'\n':''}${esc(s.predictionInput)}</pre>`:'')+(s.predictionBundle?programBundle(s.predictionBundle):'');
 const caseObservation=s=>{
  const c=s.casePreview;if(!c)return '';
  const qt=c.kind==='qt-ui',value=(v,key)=>qt?`<div data-authored-${key}>${paragraphs(v.split('\n'))}</div>`:`<pre data-authored-${key} tabindex="0" role="region" aria-label="${key==='input'?say('Ввод в программу (stdin)','Program input (stdin)'):say('Ожидаемый вывод (stdout)','Expected output (stdout)')}">\n${esc(v)}</pre>`;
  return `<div class="authored-case-io" data-authored-case-preview>
   <div><p class="example-label">${qt?say('Действия в окне','Actions in the window'):say('Ввод в программу (stdin)','Program input (stdin)')}</p>${value(c.input,'input')}</div>
   <div><p class="example-label">${qt?say('Ожидаемое наблюдение','Expected observation'):say('Ожидаемый вывод (stdout)','Expected output (stdout)')}</p>${value(c.output,'output')}</div>
  </div>`;
 };
 const resources=s=>(s.resources||[]).map(r=>{const href=r.path?new URL('../courses/'+r.path,import.meta.url).href:r.url;if(!r.path&&!/^https:\/\//.test(href)||r.path&&(!/^[a-zA-Z0-9_./-]+$/.test(r.path)||r.path.split('/').includes('..')))return '';return `<p><a class="btn" href="${esc(href)}" ${r.path?'download':'target="_blank" rel="noopener"'}>${esc(r.label)} ↗</a></p>`}).join('');
 const sectionBody=s=>paragraphs(s.paragraphs)+resources(s)+figures(s.figures)+caseObservation(s)+diagram(s)+predictionInput(s)+(s.prediction?`<pre class="prediction-code"><code>${esc(s.prediction.join('\n'))}</code></pre>`:'')+(s.reveal?`<details class="prediction-reveal"><summary>${esc(s.reveal.title)}</summary>${revealBody(s.reveal)}</details>`:'')+program(s.code)+(s.tables||[]).map(table).join('')+optionalReading(s.deep);
 const reading=()=>`<section class="lesson-reading" id="lesson-reading"><h2>${say('Что почитать','Further reading')}</h2><p>${say('Всё необходимое для задания уже есть в уроке. Эти материалы можно открыть по желанию. Внешние ссылки требуют сети.','The lesson contains everything required for the task. These optional external sources require a connection.')}</p>${lesson.reading.map(s=>`<article id="reading-${esc(s.id)}"><h3>${esc(s.title)}</h3><p>${esc(s.author)} · ${esc(s.edition)} · ${esc(s.section)} · ${esc(s.language)}</p><p>${esc(s.purpose)}</p><a href="${esc(s.url)}" target="_blank" rel="noopener">${say('Открыть источник','Open source')} ↗</a></article>`).join('')}</section>`;
 return {
  explanation:()=>`<div class="authored-intro"><p class="eyebrow">${(lesson.courseId==='cpp'?say('От наблюдения к своей программе','From an observation to your own program'):say('От наблюдения к самостоятельному действию','From an observation to independent action'))}</p><h1>${esc(lesson.title)}</h1><p class="goal">${esc(lesson.goal)}</p>${paragraphs(lesson.prerequisites.map(p=>p.text))}<details class="lesson-map-wrap"><summary>${say('Содержание урока','Lesson contents')}</summary><nav class="lesson-map" aria-label="${say('Содержание урока','Lesson contents')}">${lesson.sections.map((s,i)=>`<a href="${url(lesson.id,'explanation',lesson.locale,s.id)}">${i+1}. ${esc(s.title)}</a>`).join('')}</nav></details></div>${lesson.sections.map((s,i)=>`<section class="lesson-section authored-section" id="${esc(s.id)}"><div class="section-index">${say('Шаг','Step')} ${i+1} / ${lesson.sections.length}</div><h2>${esc(s.title)}</h2>${sectionBody(s)}</section>`).join('')}<a class="btn primary" href="${url(lesson.id,'selfcheck')}">${say('Проверить, что я понял','Check my understanding')} →</a>${reading()}`,
  recall:id=>{const s=lesson.sections.find(s=>s.id===id);return s?{title:s.title,body:paragraphs(s.paragraphs)+figures(s.figures)+caseObservation(s)+diagram(s)+(s.reveal?revealBody(s.reveal):program(s.code))+(s.tables||[]).map(table).join('')}:null;},
  reading,
 };
}
export const authoredStyles=learningVisualStyles+`
 .r3-lesson[data-authored=true]{--r3-line:#50657a;font-size:17px;line-height:1.8}
 .r3-lesson[data-authored=true] .authored-intro,.r3-lesson[data-authored=true] .authored-section{max-width:1000px;margin-left:auto;margin-right:auto}
 .r3-lesson[data-authored=true] .authored-section{background:#122438;border-color:#3d536a;padding:30px}
 .r3-lesson[data-authored=true] p{max-width:78ch}
 .r3-lesson[data-authored=true] .lesson-map{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:12px 0}
 .r3-lesson[data-authored=true] .lesson-map a{padding:8px 12px;border:1px solid #50657a;border-radius:8px;white-space:normal}
 .r3-lesson[data-authored=true] .example-label{color:#97e2ce;font-weight:700}
 .r3-lesson[data-authored=true] .example-output{border-left:3px solid #97e2ce;padding-left:16px}
 .r3-lesson[data-authored=true] .authored-case-io{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px}
 .r3-lesson[data-authored=true] .authored-case-io>div{min-width:0}
 .r3-lesson[data-authored=true] .authored-case-io pre:focus-visible{outline:3px solid #f5d78c;outline-offset:3px}
 @media(max-width:720px){.r3-lesson[data-authored=true] .authored-case-io{display:block}}
 .r3-lesson[data-authored=true] .prediction-reveal{border:2px solid #50657a;background:#0b1929}
 .r3-lesson[data-authored=true] summary{cursor:pointer;font-weight:650;min-height:32px}
 .r3-lesson[data-authored=true] .prediction-reveal td:nth-child(2){background:#182e43;font-weight:700}
 .r3-lesson[data-authored=true] .lesson-reading{margin-top:32px;border-top:1px solid #50657a;padding-top:20px}
 .r3-lesson[data-authored=true] .lesson-reading article{margin:20px 0;padding:16px;background:#122438;border-radius:12px}
 .r3-lesson[data-authored=true] [data-r3-editor]{border-top:3px solid #82e6ce;padding-top:16px}
 .r3-lesson[data-authored=true] :is(a,button,input,summary,textarea):focus-visible{outline:3px solid #f5d78c;outline-offset:3px}
 @media(max-width:720px){.r3-lesson[data-authored=true]{font-size:16px}.r3-lesson[data-authored=true] .authored-section{padding:16px}.r3-lesson[data-authored=true] .lesson-map{grid-template-columns:1fr}.r3-lesson[data-authored=true] h1{font-size:1.7rem}.r3-lesson[data-authored=true] th,.r3-lesson[data-authored=true] td{padding:6px;min-width:0;font-size:13px;line-height:1.5;overflow-wrap:anywhere}.r3-lesson[data-authored=true] table{table-layout:fixed}.r3-lesson[data-authored=true] .prediction-reveal{padding:10px}}

 .r3-lesson[data-authored=true] .lesson-diagram{margin:16px 0}
 .r3-lesson[data-authored=true] .lesson-diagram figcaption{font-weight:650}
 .r3-lesson .lesson-flowchart{margin:18px 0}
 .r3-lesson .lesson-flowchart figcaption{font-weight:700}
 .r3-lesson .lesson-flowchart svg{display:block;width:100%;max-width:360px;height:auto;margin:12px auto}
 .r3-lesson .lesson-flowchart svg :is(path,ellipse){fill:#172d44;stroke:#93abc2;stroke-width:1.7}
 .r3-lesson .lesson-flowchart svg .flowchart-decision{fill:#243b52}
 .r3-lesson .lesson-flowchart svg .flowchart-arrow{fill:none;stroke:#b1c8de;stroke-linejoin:round;stroke-linecap:round}
 .r3-lesson .lesson-flowchart text{fill:#f0f6ff;font:600 18px system-ui,sans-serif;text-anchor:middle;dominant-baseline:central}
 .r3-lesson .lesson-flowchart .flowchart-branch{fill:#bcd5e9;font-size:16px}
 .r3-lesson[data-authored=true] .table-scroll-note{display:none}
 .r3-lesson[data-authored=true] [data-wide-table]:focus-visible{outline:2px solid #f5d78c;outline-offset:2px}
 @media(max-width:480px){
  .r3-lesson[data-authored=true] .table-scroll-note{display:block;margin:6px 0;font-size:.85rem}
  .r3-lesson[data-authored=true] .table-wrap[data-wide-table]{overscroll-behavior-x:contain}
  .r3-lesson[data-authored=true] .table-wrap[data-wide-table] table{min-width:432px;table-layout:auto}
  .r3-lesson[data-authored=true] [data-wide-table] :is(th,td){min-width:108px;overflow-wrap:break-word}
  .r3-lesson[data-authored=true] [data-wide-table=state] table{min-width:360px}
  .r3-lesson[data-authored=true] [data-wide-table=state] :is(th,td){overflow-wrap:normal;word-break:normal}
  .r3-lesson[data-authored=true] [data-wide-table=state] :is(th,td):first-child{white-space:nowrap}
 }
`;
