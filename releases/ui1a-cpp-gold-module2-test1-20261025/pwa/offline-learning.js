import {cppCourseProjectTemplate} from '../project-studio/project-templates.js';
const clone=value=>structuredClone(value);
export function learningState(data,kind,id){
 if(!['lesson','practicum'].includes(kind))throw Error('UNKNOWN_LEARNING_KIND');
 data.state.courses??={};data.state.courses.cpp??={courseId:'cpp'};
 const area=kind==='lesson'?'lessons':'practicums';data.state.courses.cpp[area]??={};
 return data.state.courses.cpp[area][id]??={};
}
export function exerciseCopy(data,kind,item){
 if(!['lesson','practicum','exercise'].includes(kind)||!item?.id)throw Error('UNKNOWN_LEARNING_ITEM');
 const id='exercise-'+kind+'-'+item.id;if(data.projects[id])return data.projects[id];
 const template=kind==='exercise'?cppCourseProjectTemplate(item):null;
 const previous=template?null:learningState(data,kind,item.id);
 const seed=typeof item.starter==='string'?item.starter:typeof item.code==='string'?item.code:'';
 const workspace=previous?.workspace?.files?.length?clone(previous.workspace):{languageId:'cpp',entryFile:template?.entryFile||'main.cpp',activeFile:template?.entryFile||'main.cpp',revision:0,files:clone(template?.files||[{path:'main.cpp',content:previous?.code??seed,languageId:'cpp'}])};
 const project={id,title:item.title,description:item.pitch||'',languageId:'cpp',workspace,progress:{milestones:[]},checkpoints:[],learning:{kind,id:item.id},stdin:previous?.stdin??item.stdin??''};
 if(template)project.origin=clone(template.origin);
 return data.projects[id]=project;
}
export function rememberLearningWorkspace(data,project){
 const ref=project.learning;if(!ref||ref.kind==='exercise')return;
 const state=learningState(data,ref.kind,ref.id);
 state.workspace=clone(project.workspace);state.code=project.workspace.files.find(f=>f.path===project.workspace.entryFile)?.content||'';state.stdin=project.stdin||'';
}
export function markTask(data,kind,item,index,checked){
 if(kind!=='practicum'||!Number.isInteger(index)||index<0||index>=(item.tasks?.length||0))throw Error('INVALID_LEARNING_TASK');
 const state=learningState(data,kind,item.id),tasks=new Set(state.tasks||[]);checked?tasks.add(index):tasks.delete(index);state.tasks=[...tasks].sort((a,b)=>a-b);
}
