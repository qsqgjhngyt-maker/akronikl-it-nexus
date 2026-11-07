const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// SVG хранится локально; полный смысл доступен и обычным текстом.
export function learningFlowMarkup(flow){
 if(!flow)return '';
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
 .r3-lesson .authored-native-media{max-width:100%;min-width:0}
 .r3-lesson .authored-native-media .onec-shot-scroll{overflow:auto;max-width:100%;border:1px solid var(--r3-line);border-radius:8px}
 .r3-lesson .authored-native-media .onec-shot-frame{position:relative;overflow:hidden}
 .r3-lesson .authored-native-media .onec-shot-frame svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
 .r3-lesson .authored-native-media figcaption{overflow-wrap:anywhere}
 .r3-lesson .practice-observation{white-space:pre-wrap;overflow-wrap:anywhere}
 .r3-lesson [data-observation-example] pre{white-space:pre-wrap;overflow-wrap:anywhere}
`;
