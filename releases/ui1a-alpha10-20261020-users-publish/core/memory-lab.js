const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

export function memoryLabMarkup(model,locale='ru'){
  if(!model?.steps?.length)return'';
  const en=locale==='en';
  const L=en?{
    eyebrow:'INTERACTIVE MEMORY MODEL',prev:'Previous',next:'Next',reset:'Reset',step:'Step',object:'Object',pointer:'Pointer object',reference:'Reference alias',address:'symbolic address',stores:'stores',notBound:'not bound',sameObject:'same object',experiment:'Free experiment',plusValue:'value += 1',plusPointer:'*p += 10',minusRef:'ref -= 3',note:'Educational model'
  }:{
    eyebrow:'ИНТЕРАКТИВНАЯ МОДЕЛЬ ПАМЯТИ',prev:'Назад',next:'Далее',reset:'Сбросить',step:'Шаг',object:'Объект',pointer:'Объект-указатель',reference:'Ссылка-alias',address:'символический адрес',stores:'хранит',notBound:'не связана',sameObject:'тот же объект',experiment:'Свободный эксперимент',plusValue:'value += 1',plusPointer:'*p += 10',minusRef:'ref -= 3',note:'Учебная модель'
  };
  const first=model.steps[0];
  return `<section class="block memory-lab glass-panel" id="memoryLab">
    <div class="memory-lab-head"><div><span class="eyebrow">${esc(L.eyebrow)}</span><h2>${esc(model.title)}</h2><p>${esc(model.description)}</p></div><div class="memory-step-badge"><span>${esc(L.step)}</span><strong id="memoryStepIndex">1/${model.steps.length}</strong></div></div>
    <div class="memory-stage" aria-live="polite">
      <article class="memory-node pointer-node" id="memoryPointerNode"><span>${esc(L.pointer)}</span><code>int* p</code><strong id="memoryPointerValue">—</strong><small>${esc(L.address)} · ${esc(model.addresses?.pointer||'0x2000')}</small></article>
      <article class="memory-node value-node active" id="memoryValueNode"><span>${esc(L.object)}</span><code>int value</code><strong id="memoryValue">${esc(first.value)}</strong><small>${esc(L.address)} · ${esc(model.addresses?.value||'0x1000')}</small></article>
      <article class="memory-node reference-node" id="memoryReferenceNode"><span>${esc(L.reference)}</span><code>int& ref</code><strong id="memoryReferenceValue">—</strong><small id="memoryReferenceMeta">${esc(L.notBound)}</small></article>
      <div class="memory-link pointer-link" id="memoryPointerLink"><span>p ${esc(L.stores)} &amp;value</span><i></i></div>
      <div class="memory-link reference-link" id="memoryReferenceLink"><span>ref → ${esc(L.sameObject)}</span><i></i></div>
    </div>
    <div class="memory-explain"><strong id="memoryStepTitle">${esc(first.title)}</strong><p id="memoryStepText">${esc(first.explanation)}</p><small>${esc(model.addressNote||'')}</small></div>
    <div class="memory-controls"><button type="button" class="btn" id="memoryPrev">← ${esc(L.prev)}</button><button type="button" class="btn primary" id="memoryNext">${esc(L.next)} →</button><button type="button" class="btn" id="memoryReset">${esc(L.reset)}</button></div>
    <div class="memory-freeplay"><span>${esc(L.experiment)}</span><div><button type="button" class="mini-action" id="memoryValuePlus">${esc(L.plusValue)}</button><button type="button" class="mini-action" id="memoryPointerPlus">${esc(L.plusPointer)}</button><button type="button" class="mini-action" id="memoryRefMinus">${esc(L.minusRef)}</button></div><small>${esc(L.note)} · ${esc(model.addressNote||'')}</small></div>
  </section>`;
}

export function bindMemoryLab(model,locale='ru'){
  const host=document.querySelector('#memoryLab');if(!host||!model?.steps?.length)return;
  let stepIndex=0;let freeValue=null;
  const q=id=>host.querySelector('#'+id);
  const prev=q('memoryPrev'),next=q('memoryNext'),reset=q('memoryReset');
  const valueNode=q('memoryValueNode'),pointerNode=q('memoryPointerNode'),referenceNode=q('memoryReferenceNode');
  const pointerLink=q('memoryPointerLink'),referenceLink=q('memoryReferenceLink');
  const en=locale==='en';
  const render=()=>{
    const s=model.steps[stepIndex];const value=freeValue===null?s.value:freeValue;
    q('memoryStepIndex').textContent=`${stepIndex+1}/${model.steps.length}`;
    q('memoryStepTitle').textContent=s.title;q('memoryStepText').textContent=s.explanation;
    q('memoryValue').textContent=value;
    q('memoryPointerValue').textContent=s.pointerBound?(model.addresses?.value||'0x1000'):'—';
    q('memoryReferenceValue').textContent=s.referenceBound?value:'—';
    q('memoryReferenceMeta').textContent=s.referenceBound?(en?'alias of value':'alias объекта value'):(en?'not bound':'не связана');
    pointerNode.classList.toggle('active',!!s.pointerBound);referenceNode.classList.toggle('active',!!s.referenceBound);
    pointerLink.classList.toggle('active',!!s.pointerBound);referenceLink.classList.toggle('active',!!s.referenceBound);
    prev.disabled=stepIndex===0;next.disabled=stepIndex===model.steps.length-1;
    q('memoryPointerPlus').disabled=!s.pointerBound;q('memoryRefMinus').disabled=!s.referenceBound;
  };
  prev.addEventListener('click',()=>{if(stepIndex>0){stepIndex--;freeValue=null;render()}});
  next.addEventListener('click',()=>{if(stepIndex<model.steps.length-1){stepIndex++;freeValue=null;render()}});
  reset.addEventListener('click',()=>{stepIndex=0;freeValue=null;render()});
  q('memoryValuePlus').addEventListener('click',()=>{const s=model.steps[stepIndex];freeValue=(freeValue===null?s.value:freeValue)+1;render()});
  q('memoryPointerPlus').addEventListener('click',()=>{const s=model.steps[stepIndex];if(!s.pointerBound)return;freeValue=(freeValue===null?s.value:freeValue)+10;render()});
  q('memoryRefMinus').addEventListener('click',()=>{const s=model.steps[stepIndex];if(!s.referenceBound)return;freeValue=(freeValue===null?s.value:freeValue)-3;render()});
  render();
}
