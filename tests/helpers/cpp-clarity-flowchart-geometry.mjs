// Эти функции исполняются Playwright внутри страницы; обращения к Node API отсутствуют.
export function flowchartGeometry(svg){
 const scale=svg.getBoundingClientRect().width/svg.viewBox.baseVal.width;
 const arrows=[...svg.querySelectorAll('.flowchart-arrow')];
 return [...svg.querySelectorAll('text')].map(text=>{
  const b=text.getBBox(),pad=4/scale,shape=text.previousElementSibling;
  const branch=text.classList.contains('flowchart-branch');
  const isNode=!branch&&shape&&['path','ellipse','rect'].includes(shape.tagName);
  const corners=[{x:b.x-pad,y:b.y-pad},{x:b.x+b.width+pad,y:b.y-pad},{x:b.x-pad,y:b.y+b.height+pad},{x:b.x+b.width+pad,y:b.y+b.height+pad}];
  const inside=isNode?corners.every(p=>shape.isPointInFill(new DOMPoint(p.x,p.y))):null;
  const arrowPad=2/scale;
  const arrowCollisions=arrows.filter(path=>{
   const length=path.getTotalLength();
   for(let d=0;d<=length;d+=1){const p=path.getPointAtLength(d);if(p.x>b.x-arrowPad&&p.x<b.x+b.width+arrowPad&&p.y>b.y-arrowPad&&p.y<b.y+b.height+arrowPad)return true;}
   return false;
  }).length;
  return {text:text.textContent,branch,node:isNode?shape.tagName:null,insideWith4pxPadding:inside,arrowCollisions,fontPx:parseFloat(getComputedStyle(text).fontSize)*scale};
 });
}

export async function stableOnecPracticeGeometry(node){
 await document.fonts.ready;
 const editor=node.querySelector('#editor'),highlight=node.querySelector('#editorHighlight'),report=node.querySelector('[data-r3-report]'),save=node.querySelector('[data-r3-record]');
 if(!editor||!highlight||!report||!save)throw Error('PRACTICE_GEOMETRY_TARGET_MISSING');
 const rect=el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
 let previous='',equal=0;
 for(let frame=0;frame<40;frame++){
  await new Promise(r=>requestAnimationFrame(r));
  const next=JSON.stringify([rect(editor),rect(highlight),rect(report),rect(save)]);
  equal=next===previous?equal+1:0;previous=next;
  if(equal>=3)break;
 }
 if(equal<3)throw Error('PRACTICE_LAYOUT_NOT_STABLE');
 const a=rect(highlight),b=rect(report),studio=rect(editor.closest('.code-studio')),stage=rect(editor.closest('.code-editor-stage'));
 return {
  editor:rect(editor),highlight:a,report:b,save:rect(save),studio,stage,
  overlap:Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)),
  highlightPosition:getComputedStyle(highlight).position,editorPosition:getComputedStyle(editor).position,
  sourceValue:editor.value,reportValue:report.value,
  stylesheetImported:[...node.getRootNode().styleSheets].some(sheet=>[...sheet.cssRules].some(rule=>rule.href?.endsWith('/styles/clarity-onec-code-studio.css'))),
  stableFrames:equal
 };
}
