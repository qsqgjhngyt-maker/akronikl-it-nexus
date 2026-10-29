import{validateProjectWorkspace,strictProjectPath}from'../../project-studio/project-transfer.js';
const fail=()=>{throw Object.assign(Error('QT_PROJECT_CONFIG'),{code:'QT_PROJECT_CONFIG'})};
export function qtProject(workspace,includeRoots=['include']){
 const clean=validateProjectWorkspace(workspace),files=Object.fromEntries(clean.files.map(f=>[f.path,f.content]));let config;
 try{config=JSON.parse(files['nexus-application.json'])}catch{fail()}
 if(config.schemaVersion!==1||config.target!=='qt-wasm'||!Array.isArray(config.outputDataFiles)||config.outputDataFiles.length>8)fail();
 const outputs=config.outputDataFiles;
 if(new Set(outputs).size!==outputs.length||outputs.some(p=>strictProjectPath(p)!==p||!/^taskflow\.txt$|^data\/[\p{L}\p{N}._/-]+\.(?:txt|json)$/u.test(p)))fail();
 // Адаптер прежнего TaskFlow — только в памяти. Исходники/manifest не мигрируются.
 let units=config.targets?.gui;
 if(units===undefined){
  const gui=['src/gui.cpp','gui.cpp'].find(p=>Object.hasOwn(files,p));
  const console=config.targets?.console;
  if(!gui||!Array.isArray(console))fail();
  units=[gui,...console.filter(p=>p!==clean.entryFile&&!/(^|\/)main\.(cpp|cc|cxx)$/.test(p)&&p!==gui)];
 }
 if(!Array.isArray(units)||!units.length||units.length>64||new Set(units).size!==units.length||units.some(p=>strictProjectPath(p)!==p||!Object.hasOwn(files,p)||! /\.(cpp|cc|cxx|c\+\+)$/i.test(p)))fail();
 if(!Array.isArray(includeRoots)||includeRoots.length>64)fail();
 const roots=[...new Set(includeRoots.map(p=>p==='.'?'.':strictProjectPath(p)))];
 return{workspace:clean,files,units,includeRoots:roots,outputDataFiles:[...outputs]};
}
export function qtCompilerArgs(project){
 const root='__nexus_student__';
 return['clang++','--target=wasm32-unknown-emscripten','--sysroot=emscripten','-nostdinc++','-isystem','emscripten/include/c++/v1',
  '-Iqt/include','-Iqt/include/QtCore','-Iqt/include/QtGui','-Iqt/include/QtWidgets','-Iqt/mkspecs/wasm-emscripten',
  '-I'+root,...project.includeRoots.map(p=>'-I'+root+(p==='.'?'':'/'+p)),
  '-DQT_CORE_LIB','-DQT_GUI_LIB','-DQT_WIDGETS_LIB','-std=c++20','-fPIC','-fexceptions','-mllvm','-enable-emscripten-cxx-exceptions',
  '-O0','-g0','-fdiagnostics-color=never','-nostdlib','-shared','-Wl,--no-entry,--allow-undefined,--export-all','-o','student.wasm',
  '--',...project.units.map(p=>root+'/'+p)];
}
