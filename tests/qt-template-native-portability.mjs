// Настоящий native Qt с публичными исходниками; нет сервера/аккаунта ученика.
import{readFile,writeFile,mkdir,mkdtemp}from'node:fs/promises';import path from'node:path';import assert from'node:assert/strict';import{spawnSync}from'node:child_process';import{createHash}from'node:crypto';
import{taskFlowApplicationTemplate}from'../project-studio/application-template.js';import{module6GoldPrograms}from'./helpers/module6-gold-programs.mjs';
import{qtProject}from'../sandbox/qt/project.js';
const out=path.resolve(process.env.NEXUS_QT_EVIDENCE_DIR),image=process.env.NEXUS_QT_NATIVE_IMAGE||'nexus-qt-native-portability:6.8.3',records=[];await mkdir(out,{recursive:true});const work=await mkdtemp(path.join(out,'native-public-'));let failure;
const t=taskFlowApplicationTemplate(),bundles=new Map();
bundles.set('default',{source:t.files.find(f=>f.path==='src/gui.cpp').content,files:Object.fromEntries(t.files.map(f=>[f.path,f.content]))});
for(const b of(await module6GoldPrograms()).filter(b=>b.target==='qt-wasm')){const key=createHash('sha256').update(JSON.stringify({source:b.source,files:Object.fromEntries(Object.entries(b.files).filter(([f])=>f!=='README.md'))})).digest('hex');if(!bundles.has(key))bundles.set(key,b);}
function run(cwd,entry,args,name){const q=spawnSync('docker',['run','--rm','--read-only','--network','none','--cap-drop','ALL','--security-opt','no-new-privileges','--user','1000:1000','--memory','1g','--cpus','2','--pids-limit','128','--mount','type=bind,source='+work+',target=/work','--tmpfs','/tmp:rw,uid=1000,gid=1000,size=128m','-e','QT_QPA_PLATFORM=offscreen','-e','XDG_RUNTIME_DIR=/tmp/qt-native','--workdir',cwd,'--entrypoint',entry,image,...args],{encoding:'utf8',timeout:180000});return writeFile(path.join(out,name+'.log'),(q.stdout||'')+(q.stderr||'')).then(()=>{assert.equal(q.status,0,name+': '+(q.stderr||'').slice(-800));return q.stdout});}
try{
 for(const[index,[key,b]]of[...bundles].entries()){
  const dir=path.join(work,'bundle-'+index);await mkdir(dir);const files={...b.files,'src/gui.cpp':b.source};
  for(const[f,content]of Object.entries(files)){const p=path.resolve(dir,f);assert.ok(p.startsWith(dir+path.sep));await mkdir(path.dirname(p),{recursive:true});await writeFile(p,content);}
  const units=qtProject({languageId:'cpp',entryFile:'src/main.cpp',files:Object.entries(files).map(([path,content])=>({path,content,languageId:'cpp'}))}).units.filter(f=>f!=='src/gui.cpp');assert.ok(b.source.includes('QFile f("taskflow.txt")'));assert.equal(b.source.includes('QFile f("/taskflow.txt")'),false);
  let cmake='cmake_minimum_required(VERSION 3.21)\nproject(portability LANGUAGES CXX)\nset(CMAKE_CXX_STANDARD 20)\nfind_package(Qt6 6.8 REQUIRED COMPONENTS Widgets)\n';
  for(const mode of ['before','after']){
   await mkdir(path.join(dir,mode));await writeFile(path.join(dir,'gui_'+mode+'.cpp'),mode==='before'?b.source.replaceAll('QFile f("taskflow.txt")','QFile f("/taskflow.txt")'):b.source);
   const driver='#define main nexus_original_gui_main\n#include "gui_'+mode+'.cpp"\n#undef main\nint main(int argc,char**argv){QApplication app(argc,argv);TaskWindow window;window.show();app.processEvents();auto inputs=window.findChildren<QLineEdit*>();if(inputs.empty())return 3;QPushButton*add=nullptr,*save=nullptr;for(auto*b:window.findChildren<QPushButton*>()){if(b->text()=="Add task")add=b;if(b->text()=="Save application data")save=b;}if(!add||!save)return 4;inputs.front()->setText("native portability");add->click();save->click();app.processEvents();QFile f("taskflow.txt");bool ok=f.open(QIODevice::ReadOnly)&&f.readAll().contains("native portability");return ok=='+(mode==='after'?'true':'false')+'?0:5;}\n';
   await writeFile(path.join(dir,'driver_'+mode+'.cpp'),driver);cmake+='add_executable('+mode+' driver_'+mode+'.cpp '+units.join(' ')+')\ntarget_include_directories('+mode+' PRIVATE include)\ntarget_link_libraries('+mode+' PRIVATE Qt6::Widgets)\n';
  }
  await writeFile(path.join(dir,'CMakeLists.native.txt'),cmake);await mkdir(path.join(dir,'native'));await writeFile(path.join(dir,'native/CMakeLists.txt'),cmake.replaceAll(/driver_(before|after)\.cpp/g,'../driver_$1.cpp').replaceAll(/src\//g,'../src/').replaceAll('PRIVATE include','PRIVATE ../include'));
  const cwd='/work/bundle-'+index;await run(cwd,'cmake',['-S',cwd+'/native','-B',cwd+'/build','-GNinja','-DCMAKE_CXX_COMPILER=/usr/bin/g++','-DCMAKE_PREFIX_PATH=/opt/qt/6.8.3/gcc_64'],index+'-configure');await run(cwd,'cmake',['--build',cwd+'/build','--parallel','2'],index+'-build');
  for(const mode of ['before','after'])await run(cwd+'/'+mode,cwd+'/build/'+mode,[],index+'-'+mode);
  records.push({bundle:key,status:'PASS',actualNativeQt:true,realCppModel:true,readOnlyRoot:true,beforeRejected:true,afterSavedRelativeFile:true,sourceSha256:createHash('sha256').update(b.source).digest('hex')});console.log('PASS native Qt bundle '+index);
 }
}catch(e){failure=e.stack;console.error(e.message)}finally{await writeFile(path.join(out,'QT_TEMPLATE_NATIVE_PORTABILITY.json'),JSON.stringify({status:failure?'FAIL':'PASS',records,cases:records.length*2,failure,productionRequests:0,physicalDevices:false},null,2)+'\n');if(failure)process.exitCode=1;}
