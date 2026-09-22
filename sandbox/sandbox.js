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
  const basicSource='#include <iostream>\nint main(){std::cout << "NEXUS_OK\\n";return 0;}';
  const oopSource='#include <iostream>\n#include <string>\nclass A{public:virtual std::string value(){return "1";}};\nclass B:public A{public:std::string value() override{return "2";}};\nint main(){B b;A& a=b;std::cout<<a.value()<<"\\n";return 0;}';
  const basicRoute=await pickProvider({languageId,source:basicSource});
  const basic=await probeBasic(basicRoute.provider,languageId);
  const oopRoute=await pickProvider({languageId,source:oopSource});
  const oop=await probeOop(oopRoute.provider,languageId);
  return{ok:basic.ok,provider:oopRoute.provider,basic,oop,route:oopRoute,basicRoute,oopRoute,languageId};
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

export function createSandboxController({editor,stdin,output,engine,status,routeInfo,requirements=[],locale='ru',languageId='cpp',codeStudio=null,onCodeChange=()=>{}}){
  const en=locale==='en';
  const language=languageId||'cpp';
  let lastErrorLine=null;
  let lastRoute=null;
  let runtimeState={kind:'idle',text:en?'Runtime: not run':'Runtime: не запускался'};
  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const runtimeRequest=()=>codeStudio?.runtimeRequest?.(stdin?.value||'')||{languageId:language,source:editor.value,stdin:stdin?.value||'',entryFile:language==='c'?'main.c':'main.cpp',metadata:{origin:'lesson-sandbox'}};
  const projectSnapshot=()=>codeStudio?.getSnapshot?.()||null;
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
    if(codeStudio)return;
    const gutter=document.querySelector('#editorLines');if(!gutter)return;
    const lines=editor.value.split('\n');
    gutter.innerHTML=lines.map((_,i)=>`<span class="${lastErrorLine===i+1?'error-line':''}">${i+1}</span>`).join('');
  };
  const analyzeProject=()=>{
    const snapshot=projectSnapshot();
    if(!snapshot||!Array.isArray(snapshot.files)||snapshot.files.length<=1)return analyzeSource(editor.value,requirements);
    const issues=[];const combined=[];
    for(const file of snapshot.files){
      const content=String(file.content??'');combined.push(content);
      const perFile=analyzeSource(content,[],{requireMain:file.path===snapshot.entryFile});
      for(const issue of perFile.issues||[])issues.push({...issue,file:file.path});
    }
    const joined=combined.join('\n');
    const checks=(requirements||[]).map(requirement=>({requirement,ok:joined.includes(requirement)}));
    return{issues,checks,requirementsPassed:checks.filter(x=>x.ok).length,requirementsTotal:checks.length,lineCount:String(codeStudio?.getEntrySource?.()||'').split('\n').length,multiFile:true};
  };
  const renderAnalysis=()=>{
    const analysis=analyzeProject();
    renderLines();
    codeStudio?.setStaticDiagnostics?.(analysis.issues||[]);
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
  const renderProviderProgress=(snapshot={})=>{
    const phase=snapshot.phase||'';
    const percent=Number.isFinite(snapshot.percent)?` ${snapshot.percent}%`:'';
    let runtimeText=en?'Runtime: preparing':'Runtime: подготовка';
    let engineText=en?'Modern C++ · preparing':'Modern C++ · подготовка';
    let outputText=en?'Preparing Modern C++ Runtime…':'Подготавливаем Modern C++ Runtime…';
    if(phase==='toolchain'){runtimeText=en?`Runtime: loading compiler${percent}`:`Runtime: загрузка компилятора${percent}`;engineText=en?`Clang/WASI · loading${percent}`:`Clang/WASI · загрузка${percent}`;outputText=en?`First Modern C++ launch downloads the pinned Clang/WASI toolchain${percent}. It is cached by the browser for later runs.`:`Первый запуск Modern C++ загружает закреплённый Clang/WASI toolchain${percent}. После этого браузер использует кэш для следующих запусков.`}
    else if(phase==='runner'){runtimeText=en?'Runtime: preparing WASI':'Runtime: подготовка WASI';engineText=en?'WASI · preparing':'WASI · подготовка';outputText=en?'Preparing the isolated WASI execution environment…':'Подготавливаем изолированную среду выполнения WASI…'}
    else if(phase==='compile'){runtimeText=en?'Runtime: compiling project':'Runtime: компиляция проекта';engineText=en?'Clang · compiling':'Clang · компиляция';outputText=en?'Clang is compiling and linking the Nexus workspace…':'Clang компилирует и линкует файлы Nexus workspace…'}
    else if(phase==='run'){runtimeText=en?'Runtime: running WASM':'Runtime: выполнение WASM';engineText=en?'WASI · running':'WASI · выполнение';outputText=en?'Compilation passed. Running the program inside the isolated WASI Worker…':'Компиляция пройдена. Выполняем программу внутри изолированного WASI Worker…'}
    setRuntimeState('busy',runtimeText);setEngine('busy',engineText);output.className='output';output.textContent=outputText;
  };
  const showDiagnostic=(diag)=>{
    lastErrorLine=diag.line;renderLines();
    codeStudio?.setRuntimeDiagnostics?.([diag]);
    output.className='output '+(diag.providerLimit?'provider-limit-output':'error-output');
    const badge=diag.providerLimit?`<span class="diagnostic-badge provider-limit">${en?'ENVIRONMENT LIMIT':'ОГРАНИЧЕНИЕ СРЕДЫ'}</span>`:'';
    const fileLabel=diag.file?`${escapeHtml(diag.file)} · `:'';
    const location=diag.line?`<button type="button" class="diagnostic-jump" data-file="${escapeHtml(diag.file||'')}" data-line="${diag.line}" data-column="${diag.column||1}">${fileLabel}${en?'line':'строка'} ${diag.line}${diag.column?`, ${en?'column':'столбец'} ${diag.column}`:''} ↗</button>`:'';
    output.innerHTML=`${badge}<div class="diagnostic-head"><strong>${escapeHtml(diag.title)}</strong>${location}</div><p class="diagnostic-help">${escapeHtml(diag.explanation)}</p>${diag.snippet?`<pre class="diagnostic-snippet"><code>${escapeHtml(diag.snippet)}</code></pre>`:''}<details><summary>${en?'Technical output':'Технический вывод'}</summary><pre>${escapeHtml(diag.raw)}</pre></details>`;
    output.querySelector('.diagnostic-jump')?.addEventListener('click',event=>{const file=event.currentTarget.dataset.file;const line=Number(event.currentTarget.dataset.line)||1,column=Number(event.currentTarget.dataset.column)||1;file?codeStudio?.jumpTo?.(file,line,column):codeStudio?.jumpTo?.(line,column)});
  };
  const run=async()=>{
    lastErrorLine=null;lastRoute=null;codeStudio?.clearRuntimeDiagnostics?.();setRouteInfo(null);setRuntimeState('busy',en?'Runtime: routing':'Runtime: маршрутизация');setEngine('busy',en?'Nexus Runtime · routing':'Nexus Runtime · маршрутизация');
    output.className='output';output.textContent=en?'Selecting runtime provider…':'Выбираем runtime provider…';
    const analysis=renderAnalysis();
    let route=null;let unsubscribeRuntime=null;const request=runtimeRequest();
    try{
      route=await pickProvider(request);setRouteInfo(route);
      if(typeof route.provider?.subscribe==='function')unsubscribeRuntime=route.provider.subscribe(snapshot=>{if(route?.provider?.id==='wasm-cpp')renderProviderProgress(snapshot)});
      setRuntimeState('busy',en?'Runtime: running':'Runtime: выполняется');setEngine('busy',en?`${route.provider.label} · running`:`${route.provider.label} · выполняется`);
      const result=await route.provider.run(request);
      unsubscribeRuntime?.();unsubscribeRuntime=null;
      setEngine('ok',en?`${route.provider.label} · ready`:`${route.provider.label} · готов`);
      setRuntimeState('ok',en?'Runtime: passed':'Runtime: выполнено');
      const adapter=result.normalized?.adapted?`\n\n${en?'Compatibility adapter':'Адаптер совместимости'}: ${result.normalized.changes.join(', ')}`:'';
      const exit=result.exitCode!==undefined?`\n${en?'Exit code':'Код завершения'}: ${result.exitCode}`:'';
      const routing=`\n\n${en?'Provider':'Provider'}: ${route.provider.label}${route.preferredUnavailable?` · ${en?'fallback while':'fallback, пока'} ${route.preferredUnavailable.provider.label} ${en?'is unavailable':'недоступен'}`:''}`;
      const build=Array.isArray(result.translationUnits)&&result.translationUnits.length>1?`\n${en?'Build':'Сборка'}: ${result.translationUnits.join(' + ')} (${result.translationUnits.length} TU)`:'';
      const compiler=result.compiler?`\n${en?'Compiler':'Компилятор'}: ${result.compiler}${build}${Number.isFinite(result.compileMs)?`\n${en?'Compile':'Компиляция'}: ${result.compileMs} ms`:''}${Number.isFinite(result.runMs)?` · ${en?'Run':'выполнение'}: ${result.runMs} ms`:''}`:'';
      const compilerDiagnostics=result.compilerStderr?.trim()?`\n\n${en?'Compiler diagnostics':'Диагностика компилятора'}:\n${result.compilerStderr.trim()}`:'';
      codeStudio?.clearRuntimeDiagnostics?.();
      output.className='output success-output';
      output.textContent=(result.stdout||(en?'(program produced no output)':'(программа ничего не вывела)'))+exit+adapter+routing+compiler+compilerDiagnostics+`\nNexus Sandbox · ${result.elapsedMs} ms`;
      return result;
    }catch(err){
      unsubscribeRuntime?.();unsubscribeRuntime=null;
      if(err?.anxRuntimeRoute?.candidates&&!route){
        setRouteInfo(null);
        setEngine('bad',en?'Nexus Runtime · no provider':'Nexus Runtime · provider недоступен');
        setRuntimeState('bad',en?'Runtime: provider unavailable':'Runtime: provider недоступен');
        output.className='output error-output';output.textContent=err.message;throw err;
      }
      const capability=err?.anxCapability||route?.assessment||browserRuntimeProvider.inspect(request);
      const diag=parseRuntimeError(err,request.source,{analysis,capability,locale,files:request.files,entryFile:request.entryFile,activeFile:codeStudio?.getActiveFile?.()});
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
    lastErrorLine=null;codeStudio?.clearRuntimeDiagnostics?.();setRuntimeState('busy',en?'Runtime: self-test':'Runtime: самопроверка');setEngine('busy',en?'Nexus Runtime · self-test':'Nexus Runtime · самопроверка');output.className='output';output.textContent=en?'Testing routed runtime…':'Проверяем маршрутизируемую среду…';
    try{
      const result=await sandboxSelfTest({languageId:language});setRouteInfo(result.route);if(!result.ok)throw new Error('Self-test returned unexpected output.');
      setEngine(result.oop.ok?'ok':'warn',en?(result.oop.ok?'Nexus Runtime · full probe passed':'Nexus Runtime · base ready, OOP limited'):(result.oop.ok?'Nexus Runtime · полная проверка пройдена':'Nexus Runtime · база готова, OOP ограничено'));
      setRuntimeState(result.oop.ok?'ok':'warn',en?(result.oop.ok?'Runtime: base + OOP passed':'Runtime: base passed · OOP best-effort'):(result.oop.ok?'Runtime: база + OOP пройдены':'Runtime: база пройдена · OOP best-effort'));
      output.className='output '+(result.oop.ok?'success-output':'provider-limit-output');
      output.innerHTML=result.oop.ok
        ?(en?`✓ Fast Browser Runtime passed the console probe.<br>✓ Modern C++ probe passed through ${escapeHtml(result.oopRoute?.provider?.label||'Nexus Runtime')}.`:`✓ Быстрый Browser Runtime прошёл консольную проверку.<br>✓ Modern C++ проверка пройдена через ${escapeHtml(result.oopRoute?.provider?.label||'Nexus Runtime')}.`)
        :(en?'✓ Base console runtime is ready.<br>⚠ The Modern C++ provider could not complete the OOP probe. Open the technical diagnostic and retry after the toolchain is available.':'✓ Базовый консольный runtime готов.<br>⚠ Modern C++ provider не смог завершить OOP-проверку. Откройте техническую диагностику и повторите после загрузки toolchain.');
      return result;
    }catch(err){
      const request=runtimeRequest();const diag=parseRuntimeError(err,request.source,{analysis:renderAnalysis(),locale,files:request.files,entryFile:request.entryFile,activeFile:codeStudio?.getActiveFile?.()});
      if(diag.providerLimit){setEngine('warn',en?'Nexus Runtime · environment limit':'Nexus Runtime · ограничение среды');setRuntimeState('warn',en?'Runtime: provider limit':'Runtime: ограничение provider')}
      else{setEngine('bad',en?'Nexus Runtime · self-test failed':'Nexus Runtime · ошибка самопроверки');setRuntimeState('bad',en?'Runtime: self-test failed':'Runtime: самопроверка не пройдена')}
      showDiagnostic(diag);throw err;
    }
  };
  const resetIdle=()=>{lastErrorLine=null;lastRoute=null;codeStudio?.clearRuntimeDiagnostics?.();runtimeState={kind:'idle',text:en?'Runtime: not run':'Runtime: не запускался'};setRouteInfo(null);onCodeChange(codeStudio?.getEntrySource?.()??editor.value);renderAnalysis()};
  editor.addEventListener('input',resetIdle);
  editor.addEventListener('nexus-workspace-active',()=>{lastErrorLine=null;lastRoute=null;runtimeState={kind:'idle',text:en?'Runtime: not run':'Runtime: не запускался'};setRouteInfo(null);renderAnalysis()});
  editor.addEventListener('scroll',()=>{const gutter=document.querySelector('#editorLines');if(gutter)gutter.scrollTop=editor.scrollTop});
  setRouteInfo(null);renderAnalysis();
  return{run,selfTest,renderAnalysis,getRoute:()=>lastRoute,getRequest:runtimeRequest};
}
