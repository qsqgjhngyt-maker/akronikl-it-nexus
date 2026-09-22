import fs from 'node:fs';
import {createCodeWorkspace} from '../sandbox/code-workspace.js';
import {createViewResume,VIEW_RESUME_KEY} from '../core/view-resume.js';

const assert=(value,message)=>{if(!value)throw new Error(message)};

const workspace=createCodeWorkspace({languageId:'cpp',entryFile:'main.cpp',activeFile:'Temp.cpp',files:[
  {path:'main.cpp',content:'int main(){return 0;}'},
  {path:'Temp.cpp',content:'123'}
]});
workspace.setActiveContent('123');
workspace.removeFile('Temp.cpp');
assert(workspace.activeFile==='main.cpp','Active-file removal must fall back to main.cpp');
assert(workspace.getFile('main.cpp')?.content==='int main(){return 0;}','Removing another file must never mutate main.cpp');

const studio=fs.readFileSync(new URL('../sandbox/code-studio.js',import.meta.url),'utf8');
for(const token of ['sessionKey=null','fileViews=new Map','studioSnapshot','restoreEditorView','syncCurrent=true','switchFile(workspace.activeFile,{emit:false,syncCurrent:false})'])assert(studio.includes(token),`Code Studio persistence marker missing: ${token}`);
const app=fs.readFileSync(new URL('../core/app.js',import.meta.url),'utf8');
for(const token of ["createViewResume","sessionKey:`course:cpp:lesson:${r.lesson}`","viewResume.begin","viewResume.restore","viewResume.install"])assert(app.includes(token),`App resume integration missing: ${token}`);

const memory=new Map();
const storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
let position={x:0,y:640};let applied=null;
const resume=createViewResume({storage,getPosition:()=>position,applyPosition:pos=>{applied=pos},scheduleFrame:fn=>fn(),addListener:()=>{},removeListener:()=>{},historyObject:{scrollRestoration:'auto'}});
resume.begin('#course=cpp&lesson=cpp.oop-principles');
resume.save();
assert(memory.has(VIEW_RESUME_KEY),'Page resume state was not saved');
position={x:0,y:0};
assert(resume.restore()===true,'Stored page position was not found');
assert(applied?.y===640,'Stored page position was not restored');
position={x:0,y:920};
resume.begin('#course=cpp&lesson=cpp.first-program');
const previous=JSON.parse(memory.get(VIEW_RESUME_KEY));
assert(previous['#course=cpp&lesson=cpp.oop-principles']?.y===920,'Route transition must save the previous page position before changing keys');

console.log('WORKSPACE_PERSISTENCE_RESUME_PASS');
