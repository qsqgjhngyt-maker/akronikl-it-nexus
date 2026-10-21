import {normalizeGraphicsDocument,resolveGraphicsDocument} from '../effects/nexus-graphics-projects.js';
import {bindProjectControls} from '../project-studio/project-controls.js';
import {GRAPHICS_FRAME_CSP} from './policy.js';
const clone=v=>structuredClone(v);
const frameLoads=new WeakMap();
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
  async loadFrame(iframe,html){
   if(!['allow-scripts','allow-scripts allow-same-origin'].includes(iframe.getAttribute('sandbox')))throw Error('Небезопасный sandbox.');
   frameLoads.get(iframe)?.();
   const nonce=crypto.randomUUID(),url=new URL('./graphics-frame.html',import.meta.url);
   const response=await fetch(url,{credentials:'omit',cache:'no-store',redirect:'error'});
   if(!response.ok||response.headers.get('content-security-policy')!==GRAPHICS_FRAME_CSP||!/^[a-f0-9]{64}$/.test(response.headers.get('x-nexus-verified-sha256')||''))throw Error('Изоляция сцены не подтверждена.');
   await response.body?.cancel();
   // Opaque origin обеспечивает более строгий sandbox заголовка. Без него loader
   // откажется принимать документ: self.origin должен быть ровно "null".
   iframe.setAttribute('sandbox','allow-scripts allow-same-origin');
   return new Promise((resolve,reject)=>{const controller=new AbortController(),finish=error=>{clearTimeout(timer);controller.abort();if(frameLoads.get(iframe)===cancel)frameLoads.delete(iframe);error?reject(error):resolve()},cancel=()=>finish(Error('Запуск сцены заменён новым.')),timer=setTimeout(()=>finish(Error('Не удалось открыть изолированную сцену.')),10000);frameLoads.set(iframe,cancel);window.addEventListener('message',event=>{if(event.source!==iframe.contentWindow||event.data?.type!=='nexus-scene-document-accepted'||event.data.nonce!==nonce)return;finish()},{signal:controller.signal});iframe.addEventListener('load',()=>iframe.contentWindow?.postMessage({type:'nexus-scene-document',nonce,html},'*'),{once:true,signal:controller.signal});iframe.removeAttribute('srcdoc');iframe.src=url.href})
  },
  settled
 };
}
