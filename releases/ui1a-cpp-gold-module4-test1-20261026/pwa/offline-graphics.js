import {normalizeGraphicsDocument,resolveGraphicsDocument} from '../effects/nexus-graphics-projects.js';
import {bindProjectControls} from '../project-studio/project-controls.js';
import {loadVerifiedGraphicsFrame} from './verified-frame.js';
const clone=v=>structuredClone(v);
// Все чтения — из уже открытой копии; запись подтверждается зашифрованным commit.
export function localGraphicsAdapter({read,save,settled,root}){
 const bound=read();
 const data=()=>{const value=read();if(!bound||value!==bound)throw Error('Локальная копия закрыта или изменена.');return value};
 const drafts=()=>{const value=data();value.graphics??={version:1,active:null,drafts:{}};return value.graphics};
 const project=id=>{const p=data().projects[id];if(!p||p.origin?.kind!=='graphics-lab')throw Error('Локальный 3D-проект не найден.');return p};
 const audit=(p,action)=>{p.audit??=[];p.audit.unshift({action,summary:action,createdAt:new Date().toISOString()});p.audit=p.audit.slice(0,100)};
 const store={
  getProject:project,isCurrentProjectOwner:()=>true,getProjectAudit:id=>project(id).audit||[],
  async createCheckpoint(id,label){const p=project(id);p.checkpoints.unshift({id:crypto.randomUUID(),label,createdAt:new Date().toISOString(),workspace:clone(p.workspace),progress:clone(p.progress)});audit(p,'Контрольная точка');await save()},
  async restoreCheckpoint(id,point){const p=project(id),cp=p.checkpoints.find(c=>c.id===point);if(!cp)throw Error('Контрольная точка не найдена.');p.workspace=clone(cp.workspace);p.progress=clone(cp.progress);audit(p,'Восстановление');await save()},
  async renameProject(id,title){const p=project(id);p.title=title;audit(p,'Переименование');await save()},
  async deleteProject(id){project(id);delete data().projects[id];await save()}
 };
 return {
  root,
  immediateFlush:true,
  active:()=>read()===bound&&!!bound,
  readGraphicsDrafts:()=>clone(drafts()),
  async writeGraphicsDraft(key,document,changed=true,removeKey=null){const db=drafts();if(!db.drafts[key]&&Object.keys(db.drafts).length>=20)throw Error('Достигнут лимит черновиков. Сохраните проект.');db.drafts[key]={...normalizeGraphicsDocument(document),changed};db.active=key;if(removeKey&&removeKey!==key&&removeKey.startsWith('draft:'))delete db.drafts[removeKey];await save()},
  ownGraphicsProjects:()=>Object.values(data().projects).filter(p=>p.origin?.kind==='graphics-lab'),
  graphicsProjectDocument(id){const p=project(id);return normalizeGraphicsDocument({name:p.title,code:p.workspace.files.find(f=>f.path==='scene.js')?.content,files:p.workspace.files,activeFile:p.workspace.activeFile,settings:JSON.parse(p.workspace.files.find(f=>f.path==='settings.json')?.content||'{}'),template:p.origin.template,projectId:p.id})},
  async saveGraphicsProject(value){const d=resolveGraphicsDocument(value),id=d.projectId||crypto.randomUUID();if(d.projectId)project(id);const old=data().projects[id];const p={...old,id,title:d.name,description:old?.description||'Nexus · 3D',languageId:'javascript',origin:{kind:'graphics-lab',template:d.template},workspace:{languageId:'javascript',entryFile:'scene.js',activeFile:d.activeFile,files:d.files},progress:old?.progress||{},checkpoints:old?.checkpoints||[]};data().projects[id]=p;audit(p,'Сохранение 3D-проекта');await save();return id},
  async removeGraphicsDraft(key){const db=drafts();delete db.drafts[key];if(db.active===key)db.active=null;await save()},
  bindProjectControls:options=>bindProjectControls({...options,store}),
  loadFrame:loadVerifiedGraphicsFrame,
  settled
 };
}
