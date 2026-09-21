import {browserRuntimeProvider} from './providers/browser-runtime.js';
import {wasmRuntimeProvider} from './providers/wasm-runtime.js';
import {cloudRuntimeProvider} from './providers/cloud-runtime.js';
import {analyzeSource,parseRuntimeError} from './diagnostics.js';

export const sandboxProviders=[browserRuntimeProvider,wasmRuntimeProvider,cloudRuntimeProvider];

export async function pickProvider(source=''){
  const inspected=sandboxProviders.map(provider=>({provider,assessment:typeof provider.inspect==='function'?provider.inspect(source):{confidence:provider.planned?'planned':'unknown',features:[],bestEffort:[]}}));
  for(const item of inspected){
    if(item.provider.planned)continue;
    if(await item.provider.available())return{...item,reason:item.assessment.confidence==='best-effort'?'best-effort-fallback':'guaranteed-browser'};
  }
  throw new Error('Нет доступного Nexus Sandbox provider.');
}

async function probeBasic(provider){
  const source='#include <iostream>\nint main(){std::cout << "NEXUS_OK\\n";return 0;}';
  const result=await provider.run(source,'');
  return{ok:result.stdout.includes('NEXUS_OK'),result};
}

async function probeOop(provider){
  const source='#include <iostream>\nclass A{public:virtual int value(){return 1;}};\nclass B:public A{public:int value() override{return 2;}};\nint main(){B b;A& a=b;std::cout<<a.value()<<"\\n";return 0;}';
  try{const result=await provider.run(source,'');return{ok:result.stdout.includes('2'),result,error:null}}
  catch(error){return{ok:false,result:null,error}}
}

export async function sandboxSelfTest(){
  const route=await pickProvider('');
  const basic=await probeBasic(route.provider);
  const oop=await probeOop(route.provider);
  return{ok:basic.ok,provider:route.provider,basic,oop,route};
}

export function createSandboxController({editor,stdin,output,engine,status,requirements=[],locale='ru',onCodeChange=()=>{}}){
  const en=locale==='en';
  let lastErrorLine=null;
  let runtimeState={kind:'idle',text:en?'Runtime: not run':'Runtime: не запускался'};
  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const renderLines=()=>{
    const gutter=document.querySelector('#editorLines');if(!gutter)return;
    const lines=editor.value.split('\n');
    gutter.innerHTML=lines.map((_,i)=>`<span class="${lastErrorLine===i+1?'error-line':''}">${i+1}</span>`).join('');
  };
  const renderAnalysis=()=>{
    const analysis=analyzeSource(editor.value,requirements);
    renderLines();
    if(status){
      const hard=analysis.issues.filter(x=>x.level==='error').length;
      const warn=analysis.issues.filter(x=>x.level==='warning').length;
      const req=analysis.requirementsTotal?`${analysis.requirementsPassed}/${analysis.requirementsTotal}`:'—';
      status.className='sandbox-status '+(hard?'bad':warn?'warn':'ok');
      status.innerHTML=`<span class="sandbox-check ${hard?'bad':warn?'warn':'ok'}">${hard?'●':warn?'▲':'●'} ${en?(hard?'Static analysis: issue':warn?'Static analysis: check':'Static analysis: passed'):(hard?'Статический анализ: ошибка':warn?'Статический анализ: проверьте':'Статический анализ: пройден')}</span><span class="sandbox-check ${analysis.requirementsTotal&&analysis.requirementsPassed===analysis.requirementsTotal?'ok':'neutral'}">${en?'Task checks':'Условия задания'}: ${req}</span><span class="sandbox-check ${runtimeState.kind}">${escapeHtml(runtimeState.text)}</span>`;
    }
    return analysis;
  };
  const setRuntimeState=(kind,text)=>{runtimeState={kind,text};renderAnalysis()};
  const setEngine=(state,text)=>{if(engine){engine.className=`engine-status ${state}`;engine.textContent=text}};
  const showDiagnostic=(diag)=>{
    lastErrorLine=diag.line;renderLines();
    output.className='output '+(diag.providerLimit?'provider-limit-output':'error-output');
    const badge=diag.providerLimit?`<span class="diagnostic-badge provider-limit">${en?'ENVIRONMENT LIMIT':'ОГРАНИЧЕНИЕ СРЕДЫ'}</span>`:'';
    output.innerHTML=`${badge}<div class="diagnostic-head"><strong>${escapeHtml(diag.title)}</strong>${diag.line?`<span>${en?'line':'строка'} ${diag.line}${diag.column?`, ${en?'column':'столбец'} ${diag.column}`:''}</span>`:''}</div><p class="diagnostic-help">${escapeHtml(diag.explanation)}</p>${diag.snippet?`<pre class="diagnostic-snippet"><code>${escapeHtml(diag.snippet)}</code></pre>`:''}<details><summary>${en?'Technical output':'Технический вывод'}</summary><pre>${escapeHtml(diag.raw)}</pre></details>`;
  };
  const run=async()=>{
    lastErrorLine=null;output.className='output';setRuntimeState('busy',en?'Runtime: running':'Runtime: выполняется');setEngine('busy',en?'Nexus Runtime · running':'Nexus Runtime · выполняется');
    output.textContent=en?'Running…':'Выполнение…';
    const analysis=renderAnalysis();
    try{
      const route=await pickProvider(editor.value);const result=await route.provider.run(editor.value,stdin?.value||'');
      setEngine('ok',en?`${route.provider.label} · ready`:`${route.provider.label} · готов`);
      setRuntimeState('ok',en?'Runtime: passed':'Runtime: выполнено');
      const adapter=result.normalized.adapted?`\n\n${en?'Compatibility adapter':'Адаптер совместимости'}: ${result.normalized.changes.join(', ')}`:'';
      const exit=result.exitCode!==undefined&&result.exitCode!==0?`\n${en?'Exit code':'Код завершения'}: ${result.exitCode}`:'';
      output.className='output success-output';
      output.textContent=(result.stdout||(en?'(program produced no output)':'(программа ничего не вывела)'))+exit+adapter+`\n\nNexus Sandbox · ${result.elapsedMs} ms`;
      return result;
    }catch(err){
      const capability=err?.anxCapability||browserRuntimeProvider.inspect(editor.value);
      const diag=parseRuntimeError(err,editor.value,{analysis,capability,locale});
      if(diag.providerLimit){
        setEngine('warn',en?'Nexus Runtime · environment limit':'Nexus Runtime · ограничение среды');
        setRuntimeState('warn',en?'Runtime: provider limit':'Runtime: ограничение provider');
      }else{
        setEngine('bad',en?'Nexus Runtime · error':'Nexus Runtime · ошибка');
        setRuntimeState('bad',en?'Runtime: error':'Runtime: ошибка');
      }
      showDiagnostic(diag);throw err;
    }
  };
  const selfTest=async()=>{
    lastErrorLine=null;setRuntimeState('busy',en?'Runtime: self-test':'Runtime: самопроверка');setEngine('busy',en?'Nexus Runtime · self-test':'Nexus Runtime · самопроверка');output.className='output';output.textContent=en?'Testing Browser Runtime…':'Проверяем Browser Runtime…';
    try{
      const result=await sandboxSelfTest();if(!result.ok)throw new Error('Self-test returned unexpected output.');
      setEngine(result.oop.ok?'ok':'warn',en?(result.oop.ok?'Nexus Runtime · full probe passed':'Nexus Runtime · base ready, OOP limited'):(result.oop.ok?'Nexus Runtime · полная проверка пройдена':'Nexus Runtime · база готова, OOP ограничено'));
      setRuntimeState(result.oop.ok?'ok':'warn',en?(result.oop.ok?'Runtime: base + OOP passed':'Runtime: base passed · OOP best-effort'):(result.oop.ok?'Runtime: база + OOP пройдены':'Runtime: база пройдена · OOP best-effort'));
      output.className='output '+(result.oop.ok?'success-output':'provider-limit-output');
      output.innerHTML=result.oop.ok
        ?(en?'✓ Browser Runtime is ready. Console I/O and the OOP capability probe passed.':'✓ Browser Runtime готов. Консольный ввод/вывод и OOP-проверка выполнены успешно.')
        :(en?'✓ Base console runtime is ready.<br>⚠ Advanced OOP is currently best-effort in the lightweight Browser Runtime. Nexus will distinguish this environment limit from learner-code errors.':'✓ Базовый консольный runtime готов.<br>⚠ Расширенное ООП сейчас работает в лёгком Browser Runtime в режиме best-effort. Nexus отличает это ограничение среды от ошибок кода ученика.');
      return result;
    }catch(err){
      setEngine('bad',en?'Nexus Runtime · self-test failed':'Nexus Runtime · ошибка самопроверки');setRuntimeState('bad',en?'Runtime: self-test failed':'Runtime: самопроверка не пройдена');showDiagnostic(parseRuntimeError(err,editor.value,{analysis:renderAnalysis(),locale}));throw err;
    }
  };
  editor.addEventListener('input',()=>{lastErrorLine=null;runtimeState={kind:'idle',text:en?'Runtime: not run':'Runtime: не запускался'};onCodeChange(editor.value);renderAnalysis()});
  editor.addEventListener('scroll',()=>{const gutter=document.querySelector('#editorLines');if(gutter)gutter.scrollTop=editor.scrollTop});
  renderAnalysis();
  return{run,selfTest,renderAnalysis};
}
