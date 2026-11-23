// Создать отдельную диагностическую копию; исходный тест и assertions побайтно сохраняются.
import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(process.argv[2]||'.'),out=path.resolve(process.env.NEXUS_M6_EVIDENCE);
const baseline='7bafbe88e2eb07c972c33525afb8f0de365faa31';
assert.equal(execFileSync('git',['-c','core.longpaths=true','rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),baseline);
execFileSync('git',['-c','core.longpaths=true','diff','--exit-code','HEAD'],{cwd:root,stdio:'pipe'});
const original=await readFile(path.join(root,'tests/cpp-clarity-b6-qt-browser.mjs'),'utf8');
let instrumented=original;const additions=[];
function insert(needle,code,after=false){
 assert.equal(instrumented.split(needle).length,2,'Unique insertion point required');
 const marker='QT03-'+additions.length,addition='/* '+marker+' BEGIN */\n'+code+'\n/* '+marker+' END */\n';
 instrumented=instrumented.replace(needle,after?needle+addition:addition+needle);additions.push(addition);
}
const setupLine=original.split('\n').find(x=>x.startsWith('const diagnostic='));
insert(setupLine+'\n',"const {observeQt03Selection}=await import('./helpers/cpp-clarity-qt03-selection-diagnostic.mjs');\nconst qt03=await observeQt03Selection({page:p,out});",true);
const click=" await contents.click({position:{x:list.x-client.x+12,y:list.y-client.y+12+18*row}});\n";
insert(click," await qt03.capture('before-task-click',{frame,row,list,client});");
insert(click," await qt03.capture('after-task-click',{frame,row});",true);
const complete="   await frame.getByRole('button',{name:'Complete selected',exact:true}).press('Enter');\n";
insert(complete,"   await qt03.capture('before-final-complete',{frame});");
insert(complete,"   await qt03.capture('after-final-complete',{frame});",true);
insert(" await diagnostic.flush();\n"," await qt03.flush();");
let restored=instrumented;for(const addition of additions)restored=restored.replace(addition,'');assert.equal(restored,original,'Every original byte and assertion must remain');
const controlRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dest=path.join(root,'tests/cpp-clarity-qt03-instrumented.mjs');
await copyFile(path.join(controlRoot,'tests/helpers/cpp-clarity-qt03-selection-diagnostic.mjs'),path.join(root,'tests/helpers/cpp-clarity-qt03-selection-diagnostic.mjs'));
await writeFile(dest,instrumented);
await mkdir(out,{recursive:true});
const hash=s=>createHash('sha256').update(s).digest('hex');
await writeFile(path.join(out,'B06_QT03_ASSERTION_PRESERVATION.json'),JSON.stringify({baseline,qaControlCommit:process.env.NEXUS_QT03_CONTROL_SHA,originalTestSha256:hash(original),instrumentedTestSha256:hash(instrumented),originalRecoveredByteExactly:restored===original,additiveBlocks:additions.length,originalFileOverwritten:false,clickMethodChanged:false,rowStepChanged:false,timeoutChanged:false,existingWorkflowChanged:false},null,2)+'\n');
console.log('PASS: отдельная QA-копия, все исходные statements/assertions сохранены побайтно');
