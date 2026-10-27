import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm, readFile} from 'node:fs/promises';
import {execFile as exec} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {createCodeWorkspace} from '../sandbox/code-workspace.js';
import {parseRuntimeError} from '../sandbox/diagnostics.js';
import {beginRuntimeEvidence, finishRuntimeEvidence, clearRuntimeEvidence, readRuntimeEvidence, runtimeEvidenceBoundary} from '../sandbox/runtime-evidence.js';
import {createUiHost} from '../akronikl/ui/nexus-host.js';
import {createAssistantCore, createKnowledgeIndex} from '../akronikl/core/index.js';
import {currentStudy} from '../akronikl/learning/current-study.js';
import {resolveMessage} from '../akronikl/experience/intents.js';
const execFile=promisify(exec);
const SOURCE='int main(){ return 0 }';
function fixture(){
  const workspace=createCodeWorkspace({files:[{path:'main.cpp',content:SOURCE},{path:'other.cpp',content:'PRIVATE_NEIGHBOUR'}]});
  const studio={workspace},editor={isConnected:true,value:SOURCE,selectionStart:0,selectionEnd:SOURCE.length,__nexusCodeStudio:studio};
  let identity={};const root={isConnected:true};
  const host=()=>createUiHost({root,readIdentity:()=>identity,readRoute:()=>({view:'code-studio',project:'synthetic'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',readEditor:()=>editor});
  return{workspace,studio,editor,root,host,lock(){identity=null;}};
}
function diagnostic(){return{compilerDiagnostic:true,providerLimit:false,file:'main.cpp',line:1,column:21,
 raw:"main.cpp:1:21: error: expected ';' before '}' token\n  1 | PRIVATE_SOURCE_LINE\nother.cpp:3:1: error: PRIVATE_OTHER_FILE"};}
const publish=f=>{const t=beginRuntimeEvidence(f.studio,f.workspace.runtimeRequest());return finishRuntimeEvidence(t,diagnostic());};
const invoke=host=>createAssistantCore({host:host.adapter,policy:{selection:true,diagnostics:true}});
const diagnosticRequest={capability:'context.current',input:{include:['selection','diagnostics']}};

test('нет запуска — нет вымышленного сообщения компилятора',()=>{const f=fixture();assert.equal(readRuntimeEvidence(f.studio),null);});
test('свидетельство содержит только первичную строку, без stdout и соседнего исходника',()=>{const f=fixture();assert.equal(publish(f),true);const e=readRuntimeEvidence(f.studio);assert.equal(e.status,'compiler-error');assert.equal(e.revision,0);assert.doesNotMatch(JSON.stringify(e),/PRIVATE_|stdin|stdout/);assert.ok(Object.isFrozen(e.diagnostic));});
test('одноразовый ticket нельзя применить повторно или выдумать',()=>{const f=fixture();const t=beginRuntimeEvidence(f.studio,f.workspace.runtimeRequest());assert.equal(finishRuntimeEvidence({},diagnostic()),false);assert.equal(finishRuntimeEvidence(t,diagnostic()),true);assert.equal(finishRuntimeEvidence(t,diagnostic()),false);});
test('запрос с неизвестной ревизией не связывается с текущим файлом',()=>{const f=fixture();const r=f.workspace.runtimeRequest();delete r.metadata.workspaceRevision;assert.equal(beginRuntimeEvidence(f.studio,r),null);});
test('запрос с другим исходником не связывается с workspace',()=>{const f=fixture();const r=f.workspace.runtimeRequest();r.files['main.cpp']='OTHER';assert.equal(beginRuntimeEvidence(f.studio,r),null);});
test('поздний результат после редактирования отклоняется',()=>{const f=fixture();const t=beginRuntimeEvidence(f.studio,f.workspace.runtimeRequest());f.workspace.updateFile('main.cpp','int main(){}');assert.equal(finishRuntimeEvidence(t,diagnostic()),false);assert.equal(readRuntimeEvidence(f.studio),null);});
test('старый run не заменяет новый даже при одинаковой ревизии',()=>{const f=fixture();const old=beginRuntimeEvidence(f.studio,f.workspace.runtimeRequest());const next=beginRuntimeEvidence(f.studio,f.workspace.runtimeRequest());assert.equal(finishRuntimeEvidence(old,diagnostic()),false);assert.equal(finishRuntimeEvidence(next),true);assert.equal(readRuntimeEvidence(f.studio).status,'complete');});
test('self-test и ручная очистка отзывают старый ticket',()=>{const f=fixture();const t=beginRuntimeEvidence(f.studio,f.workspace.runtimeRequest());clearRuntimeEvidence(f.studio);assert.equal(finishRuntimeEvidence(t,diagnostic()),false);assert.equal(readRuntimeEvidence(f.studio),null);});
test('новый экземпляр workspace не наследует диагностическое доказательство',()=>{const f=fixture();publish(f);f.studio.workspace=createCodeWorkspace({files:[{path:'main.cpp',content:SOURCE}]});assert.equal(readRuntimeEvidence(f.studio),null);});
test('сообщение чужого файла не проходит read-only host',async()=>{const f=fixture();publish(f);f.workspace.setActiveFile('other.cpp');f.editor.value='PRIVATE_NEIGHBOUR';f.editor.selectionEnd=f.editor.value.length;const h=f.host(),c=invoke(h);const r=await c.invoke(diagnosticRequest);assert.equal(r.status,'ok');assert.deepEqual(r.data.diagnostics,[]);c.dispose();h.dispose();});
test('provider-limit не называется ошибкой компиляции пользователя',()=>{const f=fixture(),t=beginRuntimeEvidence(f.studio,f.workspace.runtimeRequest());finishRuntimeEvidence(t,{...diagnostic(),providerLimit:true});assert.equal(readRuntimeEvidence(f.studio).diagnostic,null);});
test('несовпадение координат не превращается в подтверждённый факт',()=>{const f=fixture(),t=beginRuntimeEvidence(f.studio,f.workspace.runtimeRequest());finishRuntimeEvidence(t,{...diagnostic(),line:100});assert.equal(readRuntimeEvidence(f.studio).diagnostic,null);});
test('слишком длинная строка отклоняется, а не обрезается до другого смысла',()=>{const f=fixture(),t=beginRuntimeEvidence(f.studio,f.workspace.runtimeRequest());finishRuntimeEvidence(t,{...diagnostic(),raw:'main.cpp:1:21: error: '+ 'x'.repeat(1001)});assert.equal(readRuntimeEvidence(f.studio).diagnostic,null);});
test('неизвестное имя файла не получает подстановку activeFile',()=>{const f=fixture(),t=beginRuntimeEvidence(f.studio,f.workspace.runtimeRequest());finishRuntimeEvidence(t,{...diagnostic(),file:'not-in-request.cpp',raw:'not-in-request.cpp:1:21: error: x'});assert.equal(readRuntimeEvidence(f.studio).diagnostic,null);});
test('каждый фактический run меняет границу уже открытой панели',()=>{const f=fixture(),h=f.host();assert.equal(h.current(),true);beginRuntimeEvidence(f.studio,f.workspace.runtimeRequest());assert.equal(h.current(),false);h.dispose();});
test('завершение run меняет границу даже при той же ревизии кода',()=>{const f=fixture(),t=beginRuntimeEvidence(f.studio,f.workspace.runtimeRequest()),h=f.host(),b=runtimeEvidenceBoundary(f.studio);finishRuntimeEvidence(t,diagnostic());assert.notEqual(runtimeEvidenceBoundary(f.studio),b);assert.equal(h.current(),false);h.dispose();});
test('контекст без explicit include не содержит диагностику или код',async()=>{const f=fixture();publish(f);const h=f.host(),c=invoke(h);const r=await c.invoke({capability:'context.current',input:{include:[]}});assert.equal(r.status,'ok');assert.equal(r.data.selection,undefined);assert.equal(r.data.diagnostics,undefined);assert.doesNotMatch(JSON.stringify(r),/expected|PRIVATE_/);c.dispose();h.dispose();});
test('диагностика без selection запрещена даже прямым вызовом API',async()=>{const f=fixture();publish(f);const h=f.host(),c=invoke(h);const r=await c.invoke({capability:'context.current',input:{include:['diagnostics']}});assert.notEqual(r.status,'ok');c.dispose();h.dispose();});
test('только явное разрешение открывает подтверждённую строку',async()=>{const f=fixture();publish(f);const h=f.host(),c=invoke(h);const r=await c.invoke(diagnosticRequest);assert.equal(r.status,'ok');assert.equal(r.data.diagnostics.length,1);assert.equal(r.data.diagnostics[0].revision,0);assert.doesNotMatch(JSON.stringify(r.data.diagnostics),/PRIVATE_/);c.dispose();h.dispose();});
test('после блокировки code и compiler evidence недоступны',async()=>{const f=fixture();publish(f);const h=f.host(),c=invoke(h);f.lock();const r=await c.invoke(diagnosticRequest);assert.notEqual(r.status,'ok');assert.doesNotMatch(JSON.stringify(r),/expected|PRIVATE_/);c.dispose();h.dispose();});
test('метаданные файла читаются без перечисления всех исходников',()=>{const f=fixture(),h=f.host();assert.deepEqual(h.editorContext(),{filePath:'main.cpp',languageId:'cpp',revision:0});assert.doesNotMatch(JSON.stringify(h.editorContext()),/int main|PRIVATE/);h.dispose();});

const index=createKnowledgeIndex(JSON.parse(await readFile(new URL('../akronikl/knowledge/core-index.ru.json',import.meta.url))));
const known=index.search('RAII',{locale:'ru',limit:1})[0];
test('название текущего урока берётся из подготовленного индекса',()=>{const r=currentStudy(index,{courseLocale:'ru',route:{courseId:known.courseId,lessonId:known.lessonId}});assert.equal(r.title,known.title);assert.equal(r.progressAvailable,false);assert.equal(r.taskAvailable,false);assert.ok(r.contentHash);});
test('несуществующий урок в URL не выдаётся за существующий',()=>{assert.equal(currentStudy(index,{courseLocale:'ru',route:{courseId:'cpp',lessonId:'cpp.invented'}}),null);});
test('контекст урока не подменяет другой курс или язык',()=>{for(const c of [{courseLocale:'en',route:{courseId:'cpp',lessonId:known.lessonId}},{courseLocale:'ru',route:{courseId:'python',lessonId:known.lessonId}},{courseLocale:'ru',route:{}}])assert.equal(currentStudy(index,c),null);});
test('естественный вопрос об открытом уроке RU/EN имеет отдельное намерение',()=>{for(const s of ['Акроникл, что мы сейчас изучаем?','Что сейчас изучаем?','What are we learning now?','Current lesson'])assert.equal(resolveMessage(s).kind,'study');});

test('реальный g++ → Nexus parser → run evidence → Core с ограниченной выборкой',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ak-context-'));
 try{
  const sources=[SOURCE,'int main(){ return missing_name; }','int main(){ int x = "text"; }','int twice(int); int main(){return twice();}'];
  for(const source of sources){
   await writeFile(path.join(dir,'main.cpp'),source);
   let stderr;try{await execFile('g++',['-fsyntax-only','-fdiagnostics-color=never','main.cpp'],{cwd:dir,timeout:10000,maxBuffer:100000});assert.fail('Ошибочный исходник принят');}catch(e){assert.ok(e.stderr);stderr=e.stderr;}
   const f=fixture();f.workspace.updateFile('main.cpp',source);f.editor.value=source;f.editor.selectionEnd=source.length;
   const request=f.workspace.runtimeRequest(),ticket=beginRuntimeEvidence(f.studio,request);
   const parsed=parseRuntimeError(Object.assign(Error('Compiler failed'),{anxCompilerOutput:stderr}),source,{files:request.files,entryFile:'main.cpp',activeFile:'main.cpp'});
   assert.equal(parsed.compilerDiagnostic,true);assert.equal(finishRuntimeEvidence(ticket,parsed),true);
   const h=f.host(),c=invoke(h),r=await c.invoke(diagnosticRequest);
   assert.equal(r.status,'ok');assert.equal(r.data.diagnostics.length,1);assert.equal(r.data.diagnostics[0].source,'compiler');assert.equal(r.data.diagnostics[0].revision,request.metadata.workspaceRevision);
   assert.doesNotMatch(r.data.diagnostics[0].message,/\n|PRIVATE_/);c.dispose();h.dispose();
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('запрос условий текущего задания не запускает генерацию по вымышленному taskId',()=>{for(const text of ['Что мне нужно сделать в этом задании?','What should I do in this task?'])assert.equal(resolveMessage(text).kind,'task');});
