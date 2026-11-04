// Actual account-scoped storage / project writer with a synthetic DTO on loopback.
// This is an adapter fixture, not server authentication or production LIVE evidence.
import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';
import {clarityLocalFixture} from './helpers/cpp-clarity-local-fixture.mjs';
const out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE||'cpp-clarity-evidence');await mkdir(out,{recursive:true});const f=await clarityLocalFixture(path.join(out,'native-adapter')),p=f.page,prefix='/releases/'+f.generation;let failure,result;
try{
 result=await p.evaluate(async prefix=>{
  const account=await import(prefix+'/core/account-storage.js');account.initializeAccountStorage({account:{accountId:'synthetic-account-adapter',status:'active',displayName:'Synthetic adapter'}});
  const storage=await import(prefix+'/core/storage.js'),projects=await import(prefix+'/project-studio/project-store.js'),{withProjectWriter}=await import(prefix+'/project-studio/project-writer.js'),{codeStudioMarkup,bindCodeStudio}=await import(prefix+'/sandbox/code-studio.js'),{bindClarityEditor,clarityMarkup}=await import(prefix+'/core/cpp-clarity-presentation.js');
  const g=await(await fetch(prefix+'/courses/cpp/gold/algorithms/programming-process.ru.json')).json(),id=g.lessonId;
  const root=document.createElement('div');root.id='adapterFixture';root.innerHTML=clarityMarkup(g)+'<section class="sandbox-block">'+codeStudioMarkup({source:'int main() {}',files:[{path:'main.cpp',content:'int main() {}',languageId:'cpp'}],activeFile:'main.cpp',locale:'ru',languageId:'cpp'})+'<textarea id="stdin"></textarea><div id="output"></div><button id="resetCode">reset</button></section>';document.body.append(root);
  const editor=root.querySelector('#editor'),studio=bindCodeStudio({editor,locale:'ru',files:[{path:'main.cpp',content:'int main() {}',languageId:'cpp'}],activeFile:'main.cpp',fileName:'main.cpp',languageId:'cpp',onWorkspaceChange:snapshot=>storage.patchLesson(id,{workspace:snapshot,code:snapshot.files.find(x=>x.path==='main.cpp').content})});
  storage.patchLesson(id,{completed:true,quiz:2,attempts:[{revision:'old',synthetic:true}]});editor.value='// unsaved in active buffer\nint main() {}';
  let release;const gate=new Promise(resolve=>{release=resolve});
  bindClarityEditor(root,g,{studio,persist:patch=>storage.patchLesson(id,patch),isCurrent:()=>editor.isConnected&&document.querySelector('#editor')===editor,createCopy:async(files,title,entryFile)=>{await gate;return withProjectWriter(()=>projects.createProject({title,files,entryFile,sourceRoots:['.']}))}});
  const click=s=>root.querySelector(s).click(),wait=async fn=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,20))}throw Error('ADAPTER_TIMEOUT')};
  click('[data-clarity-open="example"]');click('[data-choice="replace"]');
  const dialog=root.querySelector('[data-clarity-choose]'),cancel=new Event('cancel',{cancelable:true});dialog.dispatchEvent(cancel);if(!cancel.defaultPrevented||!dialog.open||!dialog.getAttribute('aria-labelledby'))throw Error('PENDING_SAVE_CANCEL_GUARD');release();await wait(()=>!root.querySelector('[data-clarity-choose]'));
  const backup=projects.listProjects().find(x=>x.title.startsWith('Моя работа до замены'));if(!backup?.workspace.files.some(x=>x.content.startsWith('// unsaved')))throw Error('BACKUP_MISSING');if(backup.manifest.entryFile!=='main.cpp')throw Error('BAD_ENTRY_FILE');
  if(editor.value!==g.clarity.example.code)throw Error('WRONG_TEMPLATE');const saved=storage.lessonState(id);if(!saved.completed||saved.quiz!==2||saved.attempts[0].revision!=='old')throw Error('HISTORY_CHANGED');
  editor.value='// keep on quota\nint main() {}';const before=editor.value,original=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Synthetic quota','QuotaExceededError')};
  try{click('[data-clarity-open="laboratory"]');click('[data-choice="replace"]');await wait(()=>root.querySelector('[data-choice-status]')?.textContent.includes('Замена остановлена'));if(editor.value!==before)throw Error('QUOTA_OVERWRITE')}finally{Storage.prototype.setItem=original;click('[data-choice="cancel"]')}
  await wait(()=>!root.querySelector('[data-clarity-choose]'));
  account.lockAccountStorage();click('[data-clarity-open="example"]');click('[data-choice="replace"]');await wait(()=>root.querySelector('[data-choice-status]')?.textContent.includes('Замена остановлена'));if(editor.value!==before)throw Error('LOCKED_OVERWRITE');click('[data-choice="cancel"]');root.remove();
  return{backup:true,unsavedBuffer:true,entryFile:true,history:true,quota:true,lockedAccount:true,escapeDuringSaveGuard:true,accessibleDialogName:true,serverAuthentication:'NOT TESTED',syntheticAccount:true,productionRequests:0};
 },prefix);assert.ok(Object.values(result).length);console.log('PASS: actual account storage/project-writer adapter, backup/quota/lock/history');
}catch(error){failure={message:error.message,stack:String(error.stack).slice(0,2200)};console.error(error)}finally{await writeFile(path.join(out,'ACCOUNT_ADAPTER.json'),JSON.stringify({status:failure?'FAIL':'PASS',failure,result},null,2)+'\n');await f.close();if(failure)process.exitCode=1}
