import {browserRuntimeProvider} from './providers/browser-runtime.js';
import {wasmRuntimeProvider} from './providers/wasm-runtime.js';
import {cloudRuntimeProvider} from './providers/cloud-runtime.js';
import {analyzeSource,parseRuntimeError} from './diagnostics.js';

export const sandboxProviders=[browserRuntimeProvider,wasmRuntimeProvider,cloudRuntimeProvider];

export function pickProvider(){return browserRuntimeProvider}

export async function sandboxSelfTest(){
  const provider=pickProvider();
  const source='#include <iostream>\nint main(){std::cout << "NEXUS_OK\\n";return 0;}';
  const result=await provider.run(source,'');
  return{ok:result.stdout.includes('NEXUS_OK'),provider,result};
}

export function createSandboxController({editor,stdin,output,engine,status,requirements=[],locale='ru',onCodeChange=()=>{}}){
  const en=locale==='en';
  let lastErrorLine=null;
  const renderLines=(analysis)=>{
    const gutter=document.querySelector('#editorLines');if(!gutter)return;
    const lines=editor.value.split('\n');
    gutter.innerHTML=lines.map((_,i)=>`<span class="${lastErrorLine===i+1?'error-line':''}">${i+1}</span>`).join('');
  };
  const renderAnalysis=()=>{
    const analysis=analyzeSource(editor.value,requirements);
    renderLines(analysis);
    if(status){
      const hard=analysis.issues.filter(x=>x.level==='error').length;
      const warn=analysis.issues.filter(x=>x.level==='warning').length;
      const req=analysis.requirementsTotal?`${analysis.requirementsPassed}/${analysis.requirementsTotal}`:'—';
      status.className='sandbox-status '+(hard?'bad':warn?'warn':'ok');
      status.innerHTML=`<span>${hard?'●':warn?'▲':'●'} ${en?(hard?'Structure issue':warn?'Check code':'Structure looks valid'):(hard?'Есть структурная ошибка':warn?'Проверьте код':'Структура выглядит корректно')}</span><span>${en?'Task checks':'Условия задания'}: ${req}</span>`;
    }
    return analysis;
  };
  const setEngine=(state,text)=>{if(engine){engine.className=`engine-status ${state}`;engine.textContent=text}};
  const showDiagnostic=(diag)=>{
    lastErrorLine=diag.line;renderAnalysis();
    output.innerHTML=`<div class="diagnostic-head"><strong>${diag.title}</strong>${diag.line?`<span>${en?'line':'строка'} ${diag.line}${diag.column?`, ${en?'column':'столбец'} ${diag.column}`:''}</span>`:''}</div><p class="diagnostic-help">${diag.explanation}</p>${diag.snippet?`<pre class="diagnostic-snippet"><code>${escapeHtml(diag.snippet)}</code></pre>`:''}<details><summary>${en?'Technical output':'Технический вывод'}</summary><pre>${escapeHtml(diag.raw)}</pre></details>`;
  };
  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const run=async()=>{
    lastErrorLine=null;renderAnalysis();setEngine('busy',en?'Nexus Runtime · running':'Nexus Runtime · выполняется');
    output.textContent=en?'Running…':'Выполнение…';
    try{
      const provider=pickProvider();const result=await provider.run(editor.value,stdin?.value||'');
      setEngine('ok',en?`${provider.label} · ready`:`${provider.label} · готов`);
      const adapter=result.normalized.adapted?`\n\n${en?'Compatibility adapter':'Адаптер совместимости'}: ${result.normalized.changes.join(', ')}`:'';
      const exit=result.exitCode!==undefined&&result.exitCode!==0?`\n${en?'Exit code':'Код завершения'}: ${result.exitCode}`:'';
      output.textContent=(result.stdout||(en?'(program produced no output)':'(программа ничего не вывела)'))+exit+adapter+`\n\nNexus Sandbox · ${result.elapsedMs} ms`;
      output.classList.add('success-output');
      return result;
    }catch(err){output.classList.remove('success-output');setEngine('bad',en?'Nexus Runtime · error':'Nexus Runtime · ошибка');showDiagnostic(parseRuntimeError(err,editor.value));throw err}
  };
  const selfTest=async()=>{
    lastErrorLine=null;setEngine('busy',en?'Nexus Runtime · self-test':'Nexus Runtime · самопроверка');output.textContent=en?'Testing browser provider…':'Проверяем браузерный provider…';
    try{const result=await sandboxSelfTest();if(!result.ok)throw new Error('Self-test returned unexpected output.');setEngine('ok',en?'Nexus Runtime · self-test passed':'Nexus Runtime · самопроверка пройдена');output.textContent=en?'✓ Browser Runtime is ready. std::cout compatibility and stdout passed.':'✓ Browser Runtime готов. Проверены слой совместимости std::cout и стандартный вывод.';return result}catch(err){setEngine('bad',en?'Nexus Runtime · self-test failed':'Nexus Runtime · ошибка самопроверки');showDiagnostic(parseRuntimeError(err,editor.value));throw err}
  };
  editor.addEventListener('input',()=>{lastErrorLine=null;onCodeChange(editor.value);renderAnalysis()});
  editor.addEventListener('scroll',()=>{const gutter=document.querySelector('#editorLines');if(gutter)gutter.scrollTop=editor.scrollTop});
  renderAnalysis();
  return{run,selfTest,renderAnalysis};
}
