const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// В модуле P2 нужна настоящая обратная стрелка; прежние линейные трассы не меняются.
function whileCycleMarkup(flow){
 const l=flow.labels,x=132;
 const text=(value,cx,cy,branch=false)=>`<text${branch?' class="flowchart-branch"':''} x="${cx}" y="${cy}" dominant-baseline="central">${esc(value)}</text>`;
 const node=(id,shape,value,cy)=>`<g data-flowchart-node="${id}">${shape}${text(value,x,cy)}</g>`;
 const rect=(id,value,y)=>node(id,`<rect x="12" y="${y}" width="240" height="64" rx="12"/>`,value,y+32);
 const arrow=(line,head,edge='')=>`<path class="flowchart-arrow"${edge?' data-flow-edge="'+esc(edge)+'"':''} d="${line} ${head}"/>`;
 const down=(from,to)=>arrow(`M${x} ${from}V${to}`,'m-5-7 5 7 5-7');
 return `<figure class="learning-flow" data-while-cycle><figcaption>${esc(flow.caption)}</figcaption>
 <svg viewBox="0 0 320 616" role="img" aria-label="${esc(flow.caption)}"><desc>${esc(flow.alternative.join(' '))}</desc>
 ${rect('initial',l.initial,4)}${down(68,104)}
 ${node('condition','<path style="fill:#243b52;stroke:#93abc2;stroke-width:1.7" d="M132 104 232 152 132 200 32 152Z"/>',l.condition,152)}
 ${down(200,250)}${text(l.yes,154,225,true)}
 ${rect('body',l.body,250)}${down(314,344)}${rect('advance',l.advance,344)}
 ${arrow('M12 376H3V152H32','m-7-5 7 5-7 5','return')}
 ${arrow('M232 152H292V502H252','m7-5-7 5 7 5','exit')}${text(l.no,260,126,true)}
 ${node('result','<path style="fill:#172d44;stroke:#a6bfd7;stroke-width:1.5" d="M24 470H252l-12 64H12Z"/>',l.result,502)}
 ${down(534,568)}
 ${node('end','<ellipse style="fill:#172d44;stroke:#a6bfd7;stroke-width:1.5" cx="132" cy="590" rx="68" ry="22"/>',l.end,590)}
 </svg><details><summary>${esc(flow.textLabel)}</summary><ol>${flow.alternative.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></details></figure>`;
}
// SVG хранится локально; полный смысл доступен и обычным текстом.
export function learningFlowMarkup(flow){
 if(!flow)return '';
 if(flow.kind==='while-cycle')return whileCycleMarkup(flow);
 // Длинные подписи занимают необходимую высоту, а не обрезаются рамкой SVG.
 if(flow.nodes.some(n=>[n.title,...n.lines].some(t=>String(t).length>24)||n.lines.length>2))return `<figure class="learning-flow" data-wrapped-flow><figcaption>${esc(flow.caption)}</figcaption>
 <ol class="flow-steps">${flow.nodes.map((n,i)=>`<li class="flow-step"><strong>${esc(n.title)}</strong>${n.lines.map(line=>`<p>${esc(line)}</p>`).join('')}${i<flow.nodes.length-1?'<span class="flow-step-arrow" aria-hidden="true">↓</span>':''}</li>`).join('')}</ol>
 <details><summary>${esc(flow.textLabel)}</summary><ol>${flow.alternative.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></details></figure>`;
 const height=flow.nodes.length*108-22;
 return `<figure class="learning-flow"><figcaption>${esc(flow.caption)}</figcaption>
 <svg viewBox="0 0 260 ${height}" role="img" aria-label="${esc(flow.caption)}"><desc>${esc(flow.alternative.join(' '))}</desc>
 ${flow.nodes.map((n,i)=>`<g><rect x="6" y="${i*108+3}" width="248" height="76" rx="12"/>
 <text x="130" y="${i*108+29}">${esc(n.title)}</text>
 ${n.lines.map((line,j)=>`<text x="130" y="${i*108+53+j*19}">${esc(line)}</text>`).join('')}
 ${i<flow.nodes.length-1?`<path d="M130 ${i*108+81}v22m-5-6 5 6 5-6"/>`:''}</g>`).join('')}
 </svg><details><summary>${esc(flow.textLabel)}</summary><ol>${flow.alternative.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></details></figure>`;
}
export const learningVisualStyles=`
 .r3-lesson .learning-flow{margin:22px 0}
 .r3-lesson .learning-flow figcaption{font-weight:700}
 .r3-lesson .learning-flow svg{display:block;width:100%;max-width:260px;height:auto;margin:16px auto}
 .r3-lesson .learning-flow rect{fill:#172d44;stroke:#a6bfd7;stroke-width:1.5}
 .r3-lesson .learning-flow path{fill:none;stroke:#c6d9ea;stroke-width:2}
 .r3-lesson .learning-flow text{fill:#f1f7ff;font:600 18px system-ui,sans-serif;text-anchor:middle}
 .r3-lesson .flow-steps{display:grid;gap:32px;list-style:none;padding:0;margin:16px auto;max-width:640px;min-width:0}
 .r3-lesson .flow-step{position:relative;box-sizing:border-box;min-width:0;padding:16px 20px;border:1.5px solid #a6bfd7;border-radius:12px;background:#172d44;color:#f1f7ff;text-align:center;white-space:normal;overflow-wrap:anywhere}
 .r3-lesson .flow-step p{margin:6px 0 0}
 .r3-lesson .flow-step-arrow{position:absolute;left:50%;bottom:-30px;transform:translateX(-50%);line-height:28px;font-size:24px;color:#c6d9ea}
 .r3-lesson .authored-native-media{max-width:100%;min-width:0}
 .r3-lesson .authored-native-media .onec-shot-scroll{overflow:auto;max-width:100%;border:1px solid var(--r3-line);border-radius:8px}
 .r3-lesson .authored-native-media .onec-shot-frame{position:relative;overflow:hidden}
 .r3-lesson .authored-native-media .onec-shot-frame svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
 .r3-lesson .authored-native-media figcaption{overflow-wrap:anywhere}
 .r3-lesson .practice-observation{white-space:pre-wrap;overflow-wrap:anywhere}
 .r3-lesson [data-observation-example] pre{white-space:pre-wrap;overflow-wrap:anywhere}
`;
