import {createTutorSession} from './session.js';
import {createModelConnections} from '../connections/controller.js';
import {mountConnectionPanel} from '../connections/panel.js';
// Режим генерации включается только после явного выбора проверенного локального файла.
export function mountTutor({parent,documentRef,host,loadKnowledge,locale,getInclude,inspectModel,loadModel=async(file,options)=>(await import('./local-model.js')).loadLocalModel(file,options)}) {
  const en=locale==='en', make=(tag,text,root)=>{const n=documentRef.createElement(tag);if(text)n.textContent=text;root.append(n);return n;};
  const details=make('details','',parent);details.dataset.akroniklTutor='';make('summary',en?'Learning dialogue — experimental':'Учебный диалог — эксперимент',details);
  const note=make('p',en?'Without a model: course excerpts. With a prepared local model: experimental explanations. History lives only in this window.':'Без модели — выдержки курса. С подготовленной локальной моделью — экспериментальные объяснения. История живёт только в этом окне.',details);
  note.className='akronikl-note';
  const label=make('label',en?'Question for the tutor':'Вопрос наставнику',details), input=make('textarea','',label);input.maxLength=1500;input.rows=3;input.dataset.akroniklTutorQuestion='';
  const controls=make('div','',details);controls.className='akronikl-actions';
  const state=make('p',en?'Mode: source excerpts, no model.':'Режим: материалы курса, без модели.',details);state.setAttribute('role','status');
  const output=make('div','',details);output.dataset.akroniklTutorMessages='';output.setAttribute('role','log');output.setAttribute('aria-label',en?'Tutor dialogue':'Учебный диалог');output.setAttribute('aria-live','polite');
  let session,dead=false,seq=0,connectedRevision=-1;
  const renew=(provider=null)=>{session?.dispose();session=createTutorSession({host:host.adapter,loadKnowledge,locale,provider});};renew();
  function resetForConnection(){seq++;session?.dispose();input.value='';output.replaceChildren();output.removeAttribute('aria-busy');delete state.dataset.tutorProgress;if(!dead)renew();}
  const connections=createModelConnections({isCurrent:()=>!dead&&host.current(),loadLocal:loadModel,inspect:inspectModel,onInvalidate:resetForConnection});
  const unsubscribe=connections.subscribe(s=>{if(dead)return;if(s.phase==='connected'&&connectedRevision!==s.revision){connectedRevision=s.revision;renew(connections.lease());state.textContent=en?'Experimental local model ready.':'Экспериментальная локальная модель готова.';}else if(s.phase!=='connected'){state.textContent=en?'Mode: source excerpts, no model.':'Режим: материалы курса, без модели.';}});
  const button=(title,fn)=>{const b=make('button',title,controls);b.type='button';b.className='btn';b.addEventListener('click',fn);return b;};
  function render(question,result){
    const item=make('section','',output);item.dataset.tutorTurn='';make('p',question,item);const answer=make('p',result.text,item);answer.dataset.tutorAnswer='';item.dataset.tutorGenerated=String(result.generated);
    if(result.notice)make('small',result.notice,item);
    for(const s of result.sources){const source=make('details','',item);make('summary',`${s.label}: ${s.title}`,source);make('p',s.text,source);if(s.truncated)make('small',en?'Source excerpt; the remaining text was not supplied.':'Фрагмент источника; остальной текст не передан.',source);if(s.kind==='course')make('small',s.sourcePath+' · '+s.contentVersion,source);else make('small',[s.filePath,s.revision].filter(v=>v!==undefined).join(' · '),source);}
    while(output.children.length>4)output.firstElementChild.remove();
  }
  async function ask(intent,followUp=false){
    if(dead||['checking','loading'].includes(connections.snapshot().phase)||!host.current())return;const query=followUp?(en?'Explain more simply':'Объясни проще'):input.value.trim();if(!query)return;
    const ticket=++seq;delete state.dataset.tutorProgress;state.textContent=en?'Preparing answer…':'Готовлю ответ…';output.setAttribute('aria-busy','true');
    let lastPhase='';
    const result=await session.ask({text:query,intent,followUp,include:getInclude()},{onProgress(progress){
      if(dead||ticket!==seq||!host.current())return;
      // Только счётчики; непроверенный ответ не попадает в live-region.
      state.dataset.tutorProgress=JSON.stringify(progress);
      if(progress.phase!==lastPhase){lastPhase=progress.phase;state.textContent=progress.phase==='generation'?(en?'Generating locally; answer is being checked…':'Локальная генерация; ответ проходит проверку…'):(en?'Processing the selected context on this device…':'Обрабатываю выбранный контекст на этом устройстве…');}
    }});
    if(dead||ticket!==seq||!host.current())return;
    output.removeAttribute('aria-busy');state.textContent=result.generated?(en?'Local-model answer; verify against sources.':'Ответ локальной модели; проверьте по источникам.'):(result.status==='ok'?(en?'Source excerpts, not generated.':'Выдержки курса, не генерация.'):result.text);
    render(query,result);
  }
  button(en?'Ask about the material':'Спросить по материалам',()=>void ask('explain'));
  button(en?'Give a hint':'Дать подсказку',()=>void ask('hint'));
  button(en?'Simpler':'Объясни проще',()=>void ask('simpler',true));
  button(en?'Explain selected code':'Разобрать выбранный код',()=>void ask('code'));
  button(en?'Stop answer':'Остановить ответ',()=>{connections.cancelPending();seq++;session.cancel();output.removeAttribute('aria-busy');state.textContent=en?'Cancelled.':'Отменено.';});
  function clear(){connections.cancelPending();delete state.dataset.tutorProgress;seq++;session.clear();input.value='';output.replaceChildren();output.removeAttribute('aria-busy');}
  button(en?'Clear dialogue':'Очистить диалог',clear);
  const connectionPanel=mountConnectionPanel({parent:details,documentRef,controller:connections,locale});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!e.isComposing){e.preventDefault();void ask('explain');}});
  return Object.freeze({clear,dispose(){if(dead)return;dead=true;seq++;unsubscribe();connections.dispose();connectionPanel.dispose();session.dispose();input.value='';output.replaceChildren();details.remove();}});
}
