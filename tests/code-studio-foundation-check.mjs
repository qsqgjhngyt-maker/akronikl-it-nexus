import fs from 'node:fs';
import {codeStudioMarkup} from '../sandbox/code-studio.js';
import {createCodeWorkspace,normalizeWorkspacePath,inferLanguageFromPath} from '../sandbox/code-workspace.js';

const assert=(value,message)=>{if(!value)throw new Error(message)};

const markup=codeStudioMarkup({source:'#include <iostream>\nint main(){return 0;}',locale:'ru',languageId:'cpp'});
for(const token of ['id="codeStudio"','id="editorHighlight"','id="editor"','id="codeUndo"','id="codeRedo"','id="codeSearch"','id="codeStudioProblems"','id="codeCursor"'])assert(markup.includes(token),`Code Studio markup missing ${token}`);

const source=fs.readFileSync(new URL('../sandbox/code-studio.js',import.meta.url),'utf8');
for(const token of ['tok-keyword','tok-bracket-match','Ctrl+Z','Ctrl+F','setRuntimeDiagnostics','jumpTo','insertLineBreak','event.shiftKey'])assert(source.includes(token),`Code Studio capability marker missing: ${token}`);

const sandbox=fs.readFileSync(new URL('../sandbox/sandbox.js',import.meta.url),'utf8');
assert(sandbox.includes('codeStudio?.setRuntimeDiagnostics'),'Sandbox does not publish runtime diagnostics to Code Studio');
assert(sandbox.includes('diagnostic-jump'),'Detailed diagnostics are not clickable');
assert(sandbox.includes('codeStudio?.setStaticDiagnostics'),'Static analysis is not connected to Problems');

const app=fs.readFileSync(new URL('../core/app.js',import.meta.url),'utf8');
assert(app.includes("codeStudioMarkup"),'Lesson UI does not render Code Studio');
assert(app.includes("bindCodeStudio"),'Lesson UI does not bind Code Studio');
assert(app.includes("codeStudio:studio"),'Sandbox controller is not connected to Code Studio');

const workspace=createCodeWorkspace({languageId:'cpp',entryFile:'main.cpp',files:[{path:'main.cpp',content:'int main(){}'}]});
assert(workspace.getFile('main.cpp')?.content==='int main(){}','Workspace entry file failed');
workspace.addFile('include/device.hpp','#pragma once');
workspace.addFile('src/device.cpp','// impl');
workspace.setActiveFile('src/device.cpp');
workspace.setActiveContent('// implementation');
assert(workspace.activeFile==='src/device.cpp','Workspace active file failed');
assert(workspace.getFile('src/device.cpp')?.content==='// implementation','Workspace content update failed');
workspace.renameFile('src/device.cpp','src/printer.cpp');
assert(workspace.hasFile('src/printer.cpp'),'Workspace rename failed');
workspace.removeFile('include/device.hpp');
assert(workspace.listFiles().length===2,'Workspace file removal failed');
assert(normalizeWorkspacePath('../src/../main.cpp')==='main.cpp','Workspace path normalization failed');
assert(inferLanguageFromPath('src/a.cpp')==='cpp','Workspace C++ language inference failed');
assert(inferLanguageFromPath('tool.py')==='python','Workspace Python language inference failed');

console.log('CODE_STUDIO_FOUNDATION_PASS',workspace.snapshot().files.length);
