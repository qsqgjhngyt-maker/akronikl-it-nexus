import{createProjectBuildPlan}from'./project-build.js';
import{wasmRuntimeProvider}from'../sandbox/providers/wasm-runtime.js';
export function bindProjectTests({project,studio,current,save,runButton,locale='ru'}){
 const en=locale==='en',plan=createProjectBuildPlan(project,'tests');
 if(!Object.keys(plan.files).some(file=>/\.(cpp|cc|cxx|c\+\+)$/i.test(file)&&plan.testRoots.some(root=>root==='.'||file.startsWith(root+'/'))))return null;
 const button=document.createElement('button'),stop=document.createElement('button');button.type=stop.type='button';button.className=stop.className='btn';button.dataset.projectTests='';stop.dataset.projectTestsStop='';button.textContent=en?'Run my tests':'Запустить мои тесты';stop.textContent=en?'Stop tests':'Остановить тесты';stop.disabled=true;runButton.after(button,stop);
 const output=document.querySelector('#output'),status=document.querySelector('#sandboxStatus');let disposed=false,own=false,token=0;
 const valid=()=>!disposed&&current(),busy=state=>['loading-toolchain','loading-wasi-runner','compiling','running'].includes(state.status);
 const unsubscribe=wasmRuntimeProvider.subscribe(state=>{if(valid()){button.disabled=busy(state)||own;runButton.disabled=own}});
 const cancel=()=>{token++;if(own)wasmRuntimeProvider.shutdown();own=false;stop.disabled=true;if(valid()){button.disabled=busy(wasmRuntimeProvider.getState());runButton.disabled=false}};
 button.onclick=async()=>{
  if(!valid()||own||busy(wasmRuntimeProvider.getState()))return;const generation=++token;
  try{
   if(save()===false)throw Error(en?'Could not save; download your sources before continuing.':'Не удалось сохранить; экспортируйте исходники перед продолжением.');
   const p=createProjectBuildPlan({...project,workspace:studio.getSnapshot()},'tests'),entryFile=p.translationUnits[0];if(!entryFile)throw Error('PROJECT_TEST_TARGET_REQUIRED');
   own=true;button.disabled=runButton.disabled=true;stop.disabled=false;status.textContent=en?'Running your project tests…':'Запускаем ваши тесты проекта…';output.className='output';output.textContent='';
   const result=await wasmRuntimeProvider.run({languageId:'cpp',entryFile,source:p.files[entryFile],files:p.files,metadata:{entryFile,translationUnits:p.translationUnits,includeRoots:p.includeRoots}});
   if(!valid()||generation!==token)return;output.className='output '+(result.exitCode===0?'success-output':'error-output');output.textContent=[result.compilerStderr,result.stdout,result.stderr,(en?'Exit code: ':'Код завершения: ')+result.exitCode].filter(Boolean).join('\n');status.textContent=en?'Your tests finished. Course control checks run separately.':'Собственные тесты завершены. Контрольная проверка курса запускается отдельно.';
  }catch(error){if(valid()&&generation===token){output.className='output error-output';output.textContent=error.anxCompilerOutput||error.message;status.textContent=en?'Tests could not complete. Sources are preserved.':'Проверка не завершена. Исходники сохранены.'}}
  finally{if(generation===token)cancel()}
 };
 stop.onclick=()=>{cancel();if(valid())status.textContent=en?'Tests stopped.':'Тесты остановлены.'};
 return{dispose(){cancel();disposed=true;unsubscribe();button.remove();stop.remove()}};
}
