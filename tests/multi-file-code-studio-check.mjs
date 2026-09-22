import fs from 'node:fs';
import {codeStudioMarkup,MULTI_FILE_CPP_DEMO} from '../sandbox/code-studio.js';
import {createCodeWorkspace} from '../sandbox/code-workspace.js';
import {normalizeRuntimeRequest,runtimeProjectFileCount} from '../sandbox/provider-contract.js';
import {browserRuntimeProvider} from '../sandbox/providers/browser-runtime.js';
import {wasmRuntimeProvider} from '../sandbox/providers/wasm-runtime.js';
import {parseRuntimeError} from '../sandbox/diagnostics.js';

const assert=(value,message)=>{if(!value)throw new Error(message)};

const workspace=createCodeWorkspace({languageId:'cpp',entryFile:'main.cpp',files:MULTI_FILE_CPP_DEMO,activeFile:'Printer.cpp'});
assert(workspace.listFiles().length===4,'Demo workspace must contain 4 files');
assert(workspace.activeFile==='Printer.cpp','Workspace active file restore failed');
const request=normalizeRuntimeRequest(workspace.runtimeRequest(''));
assert(request.entryFile==='main.cpp','Runtime request entryFile mismatch');
assert(runtimeProjectFileCount(request)===4,'Runtime request did not preserve 4 project files');
assert(request.files['Printer.cpp'].includes('Printer::name'),'Printer.cpp missing from runtime file map');

const browser=browserRuntimeProvider.inspect(request);
assert(browser.support==='unsupported','Browser Runtime must not accept multi-file projects');
assert(browser.reasons.includes('multi-file-not-supported'),'Browser Runtime multi-file reason missing');
const wasm=wasmRuntimeProvider.inspect(request);
assert(wasm.support==='guaranteed','WASM Runtime must guarantee basic multi-file build routing');
assert(wasm.reasons.includes('multi-file-wasm-required'),'WASM Runtime multi-file reason missing');

const markup=codeStudioMarkup({files:MULTI_FILE_CPP_DEMO,activeFile:'Printer.cpp',entryFile:'main.cpp',locale:'ru',languageId:'cpp'});
for(const token of ['id="codeFileTree"','id="codeFileTreeList"','id="codeFileTabs"','id="codeAddFile"','id="codeLoadDemo"','multi-file'])assert(markup.includes(token),`Multi-file markup missing ${token}`);
assert(markup.includes('std::string Printer::name'),'Active file content was not rendered');

const files=Object.fromEntries(MULTI_FILE_CPP_DEMO.map(file=>[file.path,file.content]));
const error=new Error('compile failed');
error.anxCompilerOutput='Printer.cpp:4:12: error: expected expression';
const diag=parseRuntimeError(error,files['main.cpp'],{locale:'ru',files,entryFile:'main.cpp',activeFile:'main.cpp'});
assert(diag.file==='Printer.cpp',`Compiler diagnostic file mismatch: ${diag.file}`);
assert(diag.line===4&&diag.column===12,'Compiler diagnostic coordinates mismatch');
assert(diag.snippet.includes('return "Printer"'),'Compiler diagnostic snippet must come from Printer.cpp');

const worker=fs.readFileSync(new URL('../sandbox/workers/wasm-runtime-worker.js',import.meta.url),'utf8');
for(const token of ['collectTranslationUnits','...translationUnits','translationUnits:compiled.translationUnits'])assert(worker.includes(token),`WASM Worker multi-file marker missing: ${token}`);
const studio=fs.readFileSync(new URL('../sandbox/code-studio.js',import.meta.url),'utf8');
for(const token of ['code-file-tree','code-file-tab','workspace.addFile','workspace.renameFile','workspace.removeFile','runtimeRequest:stdin=>workspace.runtimeRequest'])assert(studio.includes(token),`Code Studio multi-file capability missing: ${token}`);
const app=fs.readFileSync(new URL('../core/app.js',import.meta.url),'utf8');
for(const token of ['savedWorkspace','workspaceFiles','onWorkspaceChange','studio?.setWorkspace'])assert(app.includes(token),`Lesson persistence integration missing: ${token}`);

console.log('MULTI_FILE_CODE_STUDIO_PASS',workspace.listFiles().map(x=>x.path).join(','));
