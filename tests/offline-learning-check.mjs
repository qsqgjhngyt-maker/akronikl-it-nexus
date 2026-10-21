import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {exerciseCopy,learningState,rememberLearningWorkspace,markTask} from '../pwa/offline-learning.js';
const load=async file=>JSON.parse(await readFile(new URL('../courses/cpp/data/'+file,import.meta.url)));
const data=()=>({state:{courses:{},skills:{}},projects:{}});
const practicums=(await load('practicums.ru.json')).practicums,projects=(await load('projects.ru.json')).projects;
for(const item of practicums){
 const d=data(),p=exerciseCopy(d,'practicum',item);assert.equal(p.workspace.files[0].content,item.starter);assert.equal(p.stdin,item.stdin||'');
 p.workspace.files[0].content='offline change';p.stdin='42';rememberLearningWorkspace(d,p);assert.equal(d.state.courses.cpp.practicums[item.id].code,'offline change');
 markTask(d,'practicum',item,0,true);markTask(d,'practicum',item,0,true);assert.deepEqual(d.state.courses.cpp.practicums[item.id].tasks,[0]);markTask(d,'practicum',item,0,false);assert.deepEqual(d.state.courses.cpp.practicums[item.id].tasks,[]);
 assert.throws(()=>markTask(d,'practicum',item,item.tasks.length,true),/INVALID/);assert.equal(exerciseCopy(d,'practicum',item),p);assert.equal(p.workspace.files[0].content,'offline change');
 console.log('PASS practicum '+item.id+' starter, canonical workspace/stdin/tasks, no reset and invalid index');
}
for(const item of projects){const d=data(),p=exerciseCopy(d,'exercise',item);assert.equal(p.workspace.entryFile,'src/main.cpp');assert.equal(p.workspace.files[0].content,item.starter);assert.equal(p.workspace.files.length,3);assert.equal(p.origin.projectId,item.id);assert.equal(d.state.courses.cpp,undefined);console.log('PASS course project '+item.id+' reuses installed multifile template without fake lesson progress')}
const d=data();learningState(d,'lesson','lesson-id').workspace={entryFile:'lesson.cpp',activeFile:'lesson.cpp',files:[{path:'lesson.cpp',content:'saved lesson'}]};assert.equal(exerciseCopy(d,'lesson',{id:'lesson-id',title:'Lesson',code:'original'}).workspace.files[0].content,'saved lesson');assert.throws(()=>exerciseCopy(d,'unknown',{id:'x'}),/UNKNOWN/);assert.throws(()=>learningState(d,'exercise','x'),/UNKNOWN/);console.log('PASS saved lesson workspace survives; unknown learning routes fail closed');
