import {browserRuntimeProvider} from './providers/browser-runtime.js';
import {wasmRuntimeProvider} from './providers/wasm-runtime.js';
import {cloudRuntimeProvider} from './providers/cloud-runtime.js';
import {NexusRuntimeRouter} from './runtime-router.js';
import {normalizeRuntimeRequest} from './provider-contract.js';
import {languageLabel} from './languages.js';
import {analyzeSource,parseRuntimeError} from './diagnostics.js';

export const sandboxProviders=[browserRuntimeProvider,wasmRuntimeProvider,cloudRuntimeProvider];
export const runtimeRouter=new NexusRuntimeRouter(sandboxProviders);

export async function pickProvider(input='',options={}){
  const request=normalizeRuntimeRequest(typeof input==='string'?{languageId:options.languageId||'cpp',source:input}:input);
  return runtimeRouter.route(request);
}

async function probeBasic(provider,languageId='cpp'){
  if(languageId!=='cpp')return{ok:false,skipped:true,reason:'probe-not-defined'};
  const source='#include <iostream>\nint main(){std::cout << "NEXUS_OK\\n";return 0;}';
  const result=await provider.run({languageId,source,stdin:''});
  return{ok:result.stdout.includes('NEXUS_OK'),result};
}

async function probeOop(provider,languageId='cpp'){
  if(languageId!=='cpp')return{ok:false,skipped:true,reason:'probe-not-defined'};
  const source='#include <iostream>\nclass A{public:virtual int value(){return 1;}};\nclass B:public A{public:int value() override{return 2;}};\nint main(){B b;A& a=b;std::cout<<a.value()<<"\\n";return 0;}';
  try{const result=await provider.run({languageId,source,stdin:''});return{ok:result.stdout.includes('2'),result,error:null}}
  catch(error){return{ok:false,result:null,error}}
}

export async function sandboxSelfTest({languageId='cpp'}={}){
  const route=await pickProvider({languageId,source:''});
  const basic=await probeBasic(route.provider,languageId);
  const oop=await probeOop(route.provider,languageId);
  return{ok:basic.ok,provider:route.provider,basic,oop,route,languageId};
}

function routeReasonText(route,en=false){
  if(!route)return en?'AUTO · waiting':'AUTO · ожидание';
  const label=route.provider?.label||'Runtime';
  if(route.reason==='preferred-provider-unavailable-fallback'){
    const preferred=route.preferredUnavailable?.provider?.label||'extended provider';
    return en?`AUTO · ${label} fallback · ${preferred} pending`:`AUTO · ${label} fallback · ${preferred} ожидается`;
  }
  if(route.reason==='best-effort-fallback')return en?`AUTO · ${label} · best-effort`:`AUTO · ${label} · best-effort`;
  return en?`AUTO · ${label}`:`AUTO · ${label}`;
}

export function createSandboxController({editor,stdin,output,engine,status,routeInfo,requirements=[],locale='ru',languageId='cpp',onCodeChange=()=>{}}){
  const en=locale==='en';
  const language=languageId||'cpp';
  let lastErrorLine=null;
  let lastRoute=null;
  let runtimeState={kind:'idle',text:en?'Runtime: not run':'Runtime: не запускался'};
  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const setRouteInfo=(route=null)=>{
    lastRoute=route||lastRoute;
    if(routeInfo){
      routeInfo.className='runtime-route '+(route?.reason==='preferred-provider-unavailable-fallback'?'fallback':route?'selected':'idle');
      routeInfo.textContent=route?routeReasonText(route,en):`AUTO · ${languageLabel(language,locale)}`;
      routeInfo.title=route?.preferredUnavailable
        ?(en?`Preferred provider ${route.preferredUnavailable.provider.label} is not ready yet.`:`Предпочтительный provider ${route.preferredUnavailable.provider.label} пока недоступен.`)
        :(en?'Nexus Runtime Router selects the provider automatically.':'Nexus Runtime Router выбирает provider автоматически.');
    }
  };
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
    lastErrorLine=null;lastRoute=null;setRouteInfo(null);setRuntimeState('busy',en?'Runtime: routing':'Runtime: маршрутизация');setEngine('busy',en?'Nexus Runtime · routing':'Nexus Runtime · маршрутизация');
    output.className='output';output.textContent=en?'Selecting runtime provider…':'Выбираем runtime provider…';
    const analysis=renderAnalysis();
    let route=null;
    try{
      const request={languageId:language,source:editor.value,stdin:stdin?.value||'',metadata:{origin:'lesson-sandbox'}};
      route=await pickProvider(request);setRouteInfo(route);
      setRuntimeState('busy',en?'Runtime: running':'Runtime: выполняется');setEngine('busy',en?`${route.provider.label} · running`:`${route.provider.label} · выполняется`);
      const result=await route.provider.run(request);
      setEngine('ok',en?`${route.provider.label} · ready`:`${route.provider.label} · готов`);
      setRuntimeState('ok',en?'Runtime: passed':'Runtime: выполнено');
      const adapter=result.normalized?.adapted?`\n\n${en?'Compatibility adapter':'Адаптер совместимости'}: ${result.normalized.changes.join(', ')}`:'';
      const exit=result.exitCode!==undefined&&result.exitCode!==0?`\n${en?'Exit code':'Код завершения'}: ${result.exitCode}`:'';
      const routing=`\n\n${en?'Provider':'Provider'}: ${route.provider.label}${route.preferredUnavailable?` · ${en?'fallback while':'fallback, пока'} ${route.preferredUnavailable.provider.label} ${en?'is unavailable':'недоступен'}`:''}`;
      output.className='output success-output';
      output.textContent=(result.stdout||(en?'(program produced no output)':'(программа ничего не вывела)'))+exit+adapter+routing+`\nNexus Sandbox · ${result.elapsedMs} ms`;
      return result;
    }catch(err){
      if(err?.anxRuntimeRoute?.candidates&&!route){
        setRouteInfo(null);
        setEngine('bad',en?'Nexus Runtime · no provider':'Nexus Runtime · provider недоступен');
        setRuntimeState('bad',en?'Runtime: provider unavailable':'Runtime: provider недоступен');
        output.className='output error-output';output.textContent=err.message;throw err;
      }
      const capability=err?.anxCapability||route?.assessment||browserRuntimeProvider.inspect({languageId:language,source:editor.value});
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
    lastErrorLine=null;setRuntimeState('busy',en?'Runtime: self-test':'Runtime: самопроверка');setEngine('busy',en?'Nexus Runtime · self-test':'Nexus Runtime · самопроверка');output.className='output';output.textContent=en?'Testing routed runtime…':'Проверяем маршрутизируемую среду…';
    try{
      const result=await sandboxSelfTest({languageId:language});setRouteInfo(result.route);if(!result.ok)throw new Error('Self-test returned unexpected output.');
      setEngine(result.oop.ok?'ok':'warn',en?(result.oop.ok?'Nexus Runtime · full probe passed':'Nexus Runtime · base ready, OOP limited'):(result.oop.ok?'Nexus Runtime · полная проверка пройдена':'Nexus Runtime · база готова, OOP ограничено'));
      setRuntimeState(result.oop.ok?'ok':'warn',en?(result.oop.ok?'Runtime: base + OOP passed':'Runtime: base passed · OOP best-effort'):(result.oop.ok?'Runtime: база + OOP пройдены':'Runtime: база пройдена · OOP best-effort'));
      output.className='output '+(result.oop.ok?'success-output':'provider-limit-output');
      output.innerHTML=result.oop.ok
        ?(en?'✓ Routed Browser Runtime is ready. Console I/O and the OOP capability probe passed.':'✓ Маршрутизируемый Browser Runtime готов. Консольный ввод/вывод и OOP-проверка выполнены успешно.')
        :(en?'✓ Base console runtime is ready.<br>⚠ Advanced OOP is currently best-effort in the lightweight Browser Runtime. The Runtime Router already knows that the future WASM provider is preferred for this capability.':'✓ Базовый консольный runtime готов.<br>⚠ Расширенное ООП сейчас работает в лёгком Browser Runtime в режиме best-effort. Runtime Router уже знает, что для этой возможности предпочтителен будущий WASM provider.');
      return result;
    }catch(err){
      setEngine('bad',en?'Nexus Runtime · self-test failed':'Nexus Runtime · ошибка самопроверки');setRuntimeState('bad',en?'Runtime: self-test failed':'Runtime: самопроверка не пройдена');showDiagnostic(parseRuntimeError(err,editor.value,{analysis:renderAnalysis(),locale}));throw err;
    }
  };
  editor.addEventListener('input',()=>{lastErrorLine=null;lastRoute=null;runtimeState={kind:'idle',text:en?'Runtime: not run':'Runtime: не запускался'};setRouteInfo(null);onCodeChange(editor.value);renderAnalysis()});
  editor.addEventListener('scroll',()=>{const gutter=document.querySelector('#editorLines');if(gutter)gutter.scrollTop=editor.scrollTop});
  setRouteInfo(null);renderAnalysis();
  return{run,selfTest,renderAnalysis,getRoute:()=>lastRoute};
}
