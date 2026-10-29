import{createQtCompiler}from'../sandbox/qt/compiler.js';
import{qtProject}from'../sandbox/qt/project.js';
import{QT_BROWSER_PROFILE as profile}from'../sandbox/qt/profile.js';
import{digest}from'../sandbox/qt/verified-pack.js';
import{downloadPortableProject}from'./portable-archive.js';
import{createProjectBuildPlan}from'./project-build.js';
import{wasmRuntimeProvider}from'../sandbox/providers/wasm-runtime.js';

export async function bindBrowserApplicationPanel({project,studio,current,save,runButton,locale='ru'}){
 const en=locale==='en',host=document.querySelector('.ps-workbench');if(!host)return null;
 const panel=document.createElement('section');panel.className='ps-panel nexus-application-panel';
 panel.setAttribute('aria-label',en?'C++ application and checks':'Приложение C++ и проверка');
 panel.innerHTML=`<style>.nexus-application-panel{min-width:0;padding:12px}.nexus-application-panel .app-actions{display:flex;flex-wrap:wrap;gap:8px}.nexus-application-panel iframe{width:100%;height:520px;border:1px solid #34516b;border-radius:8px;background:#122035}.nexus-application-panel pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto}.nexus-application-panel button{white-space:normal}</style>
 <h2>${en?'Application and checks':'Приложение и проверка'}</h2>
 <p>${en?'QtCore, QtGui, QtWidgets · C++20. Code is compiled on this device. The first run downloads the compiler and Qt libraries; allow time and keep your work saved.':'QtCore, QtGui, QtWidgets · C++20. Код собирается на этом устройстве. Первый запуск скачивает компилятор и библиотеки Qt; это займёт время. Сохраните свою работу.'}</p>
 <p><a href="${new URL('source/index.html',profile.previewUrl).href}" target="_blank" rel="noopener noreferrer">${en?'Qt licenses and corresponding source':'Лицензии и соответствующие исходники Qt'}</a></p><div class="app-actions"></div><p data-app="status" role="status" aria-live="polite"></p><div data-app="preview"></div><pre data-app="log" tabindex="0" aria-label="${en?'Build and test output':'Вывод сборки и тестов'}"></pre>`;
 host.append(panel);document.querySelector('.ps-layout')?.classList.add('nexus-app-layout');
 const q=name=>panel.querySelector('[data-app="'+name+'"]'),actions=panel.querySelector('.app-actions'),log=q('log');
 let disposed=false,frame=null,nonce=null,compiled=null,compiledHash=null,snapshotHash=null,baseFiles={},outputs=[],generation=0,changed=0,loadedAt=0,busy=false,previewTimer=null,windowStart=0,messageCount=0;
 const valid=()=>!disposed&&current(),message=value=>{if(valid())q('status').textContent=value},append=value=>{if(valid())log.textContent=(log.textContent+'\n'+String(value)).slice(-65536)};
 const add=(name,label)=>{const button=document.createElement('button');button.type='button';button.className='btn';button.dataset.app=name;button.textContent=label;actions.append(button);return button};
 const tests=add('tests',en?'Run my tests':'Запустить мои тесты'),stop=add('stop',en?'Stop':'Остановить'),data=add('data',en?'Save app data':'Сохранить данные приложения'),zip=add('zip',en?'Download source ZIP':'Скачать исходники ZIP');data.disabled=true;
 const compiler=createQtCompiler({current:valid,progress:phase=>message(({headers:en?'Loading Qt headers…':'Загружаем заголовки Qt…',compiler:en?'Preparing the compiler…':'Готовим компилятор…',compile:en?'Compiling your C++ code…':'Собираем ваш C++ код…'})[phase])});
 const unsubscribe=studio.workspace.subscribe(event=>{if(!['active-file','active-file-changed','init','view-state','runtime-files-applied'].includes(event.type)){changed++;if(frame)message(en?'Sources changed. The application shows an earlier version.':'Исходники изменены. В окне работает предыдущая версия.')}});
 function enabled(){runButton.disabled=tests.disabled=busy;stop.disabled=!busy&&!frame}
 function stopCurrent(){generation++;compiler.cancel();wasmRuntimeProvider.shutdown();clearTimeout(previewTimer);frame?.remove();frame=null;compiled=null;data.disabled=true;busy=false;enabled()}
 function savedWorkspace(){if(save()===false)throw Error(en?'Could not save. Keep the editor open and download your source ZIP.':'Не удалось сохранить. Не закрывайте редактор и скачайте исходники ZIP.');return studio.getSnapshot()}
 function supported(){return globalThis.isSecureContext&&typeof Worker==='function'&&typeof WebAssembly==='object'&&typeof BigInt==='function'&&typeof DecompressionStream==='function'&&!!crypto.subtle}
 function check(){const ok=supported();document.querySelector('#engine').textContent=ok?'Qt 6.8.3 · browser':(en?'Browser capabilities unavailable':'Возможности браузера недоступны');message(ok?(en?'Ready. Compilation starts when you press Run. Custom moc, OS threads and QtNetwork are outside this profile.':'Готово. Сборка начнётся по кнопке «Запустить». Собственный moc, потоки ОС и QtNetwork в этот профиль не входят.'):(en?'Use an up-to-date browser over HTTPS. Your sources are preserved.':'Откройте Nexus по HTTPS в актуальном браузере. Исходники сохранены.'));return ok}
 const onMessage=event=>{
  if(!valid()||!frame||event.source!==frame.contentWindow||event.origin!=='null'||event.data?.nonce!==nonce||event.data?.profile!==profile.id)return;
  const d=event.data,now=Date.now();if(now-windowStart>1000){windowStart=now;messageCount=0}if(++messageCount>100){stopCurrent();message(en?'Application stopped: too many messages.':'Приложение остановлено: слишком много сообщений.');return}
  if(d.type==='nexus-qt-ready'&&compiled){const bytes=compiled.wasm;compiled=null;frame.contentWindow.postMessage({type:'nexus-qt-start',nonce,profile:profile.id,snapshotHash,wasm:bytes,wasmHash:compiledHash,outputDataFiles:outputs,files:Object.fromEntries(outputs.filter(p=>Object.hasOwn(baseFiles,p)).map(p=>[p,baseFiles[p]]))},'*',[bytes.buffer]);return}
  if(d.snapshotHash!==snapshotHash)return;
  if(d.type==='nexus-qt-running'){clearTimeout(previewTimer);busy=false;enabled();data.disabled=false;message(changed===loadedAt?(en?'Application is running.':'Приложение работает.'):(en?'An earlier version is running.':'Работает предыдущая версия.'))}
  else if(d.type==='nexus-qt-output'&&typeof d.text==='string')append(d.text.slice(0,32768));
  else if(d.type==='nexus-qt-error'&&typeof d.message==='string'){clearTimeout(previewTimer);busy=false;enabled();message(d.message.slice(0,1000))}
  else if(d.type==='nexus-qt-exited'){data.disabled=true;message(en?'Application finished.':'Приложение завершено.')}
  else if(d.type==='nexus-qt-data')try{
   if(!d.files||typeof d.files!=='object'||Array.isArray(d.files)||Object.keys(d.files).some(p=>!outputs.includes(p)||typeof d.files[p]!=='string'||new TextEncoder().encode(d.files[p]).length>65536))throw Error('QT_DATA_INVALID');
   studio.applyRuntimeFiles(d.files,baseFiles);if(save()===false)throw Error(en?'Could not save app data. Keep this project open and download the ZIP.':'Не удалось сохранить данные приложения. Не закрывайте проект и скачайте ZIP.');
   baseFiles={...baseFiles,...d.files};message(en?'Application data saved in the project.':'Данные приложения сохранены в проекте.');
  }catch(error){message(error.message)}
 };
 window.addEventListener('message',onMessage);
 async function run(){
  stopCurrent();const token=generation;busy=true;enabled();log.textContent='';
  try{
   if(!check())throw Error('QT_BROWSER_UNSUPPORTED');const workspace=savedWorkspace(),plan=qtProject(workspace,project.manifest?.includeRoots||['include']);
   baseFiles=plan.files;outputs=plan.outputDataFiles;loadedAt=changed;
   snapshotHash=await digest(new TextEncoder().encode(JSON.stringify({entryFile:plan.workspace.entryFile,files:plan.workspace.files.map(({path,content})=>({path,content})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)})));
   const result=await compiler.compile(workspace,plan.includeRoots);if(token!==generation||!valid())return;append(result.output);compiled=result;compiledHash=result.wasmHash;
   const url=new URL(profile.previewUrl);if(url.origin===location.origin||url.protocol!=='https:')throw Error('QT_PREVIEW_ORIGIN_INVALID');
   nonce=crypto.randomUUID();url.hash=new URLSearchParams({run:nonce,parent:location.origin});frame=document.createElement('iframe');frame.title=en?'Running C++ application':'Работающее приложение C++';frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';frame.src=url.href;q('preview').replaceChildren(frame);
   message(en?'Opening the Qt application…':'Открываем приложение Qt…');
   previewTimer=setTimeout(()=>{if(token!==generation||!valid())return;stopCurrent();message(en?'The application did not start in time. Sources are saved; try again.':'Приложение не открылось вовремя. Исходники сохранены; повторите запуск.')},profile.toolchainTimeoutMs);
  }catch(error){if(token!==generation||!valid())return;append(error.compilerOutput||'');message(error.code||error.message);busy=false;enabled()}
 }
 async function runTests(){
  stopCurrent();const token=generation;busy=true;enabled();log.textContent='';
  try{const workspace=savedWorkspace(),plan=createProjectBuildPlan({...project,workspace},'tests'),entryFile=plan.translationUnits[0];if(!entryFile)throw Error('APPLICATION_TEST_TARGET_REQUIRED');
   message(en?'Running the project’s own tests…':'Запускаем собственные тесты проекта…');
   const result=await wasmRuntimeProvider.run({languageId:'cpp',entryFile,source:plan.files[entryFile],files:plan.files,metadata:{entryFile,translationUnits:plan.translationUnits,includeRoots:plan.includeRoots}});
   if(token!==generation||!valid())return;append(result.compilerStdout||'');append(result.compilerStderr||'');append(result.stdout);append(result.stderr);
   message(result.exitCode===0?(en?'Your tests passed. Course control checks run separately.':'Собственные тесты пройдены. Контрольная проверка курса запускается отдельно.'):(en?'Tests failed; see the output.':'Тесты не пройдены; смотрите вывод.'));
  }catch(error){if(token===generation&&valid()){append(error.anxCompilerOutput||'');message(error.code||error.message)}}
  finally{if(token===generation&&valid()){wasmRuntimeProvider.shutdown();busy=false;enabled()}}
 }
 runButton.onclick=()=>void run();tests.onclick=()=>void runTests();stop.onclick=()=>{stopCurrent();message(en?'Application stopped.':'Приложение остановлено.')};
 data.onclick=()=>frame?.contentWindow.postMessage({type:'nexus-qt-snapshot',nonce,profile:profile.id,snapshotHash},'*');
 zip.onclick=()=>{if(valid())try{downloadPortableProject({...project,workspace:studio.getSnapshot()})}catch(error){message(error.message)}};
 const runtimeTest=document.querySelector('#testRuntime'),clearOutput=document.querySelector('#clearOutput');runtimeTest.textContent=en?'Check browser':'Проверить браузер';runtimeTest.onclick=check;clearOutput.onclick=()=>{log.textContent=''};enabled();check();
 return{stop:stopCurrent,dispose(){if(disposed)return;disposed=true;stopCurrent();unsubscribe?.();window.removeEventListener('message',onMessage);runtimeTest.onclick=null;clearOutput.onclick=null;panel.remove()}};
}
