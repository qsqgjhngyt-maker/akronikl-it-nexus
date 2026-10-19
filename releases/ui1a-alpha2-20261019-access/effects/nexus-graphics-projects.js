import {createProject,patchProject,getProject,listProjects} from '../project-studio/project-store.js';
import {activePrincipalId} from '../core/identity.js';
import {normalizeWorkspacePath} from '../sandbox/code-workspace.js';

export const graphicsDefaults={planets:10,inclination:48,speed:1,stars:1,moons:true,rings:true};
export function normalizeGraphicsSettings(value={}){
  const bound=(key,min,max)=>{const v=Number(value[key]??graphicsDefaults[key]);if(!Number.isFinite(v))throw Error('Invalid setting: '+key);return Math.max(min,Math.min(max,v))};
  for(const key of ['moons','rings'])if(value[key]!==undefined&&typeof value[key]!=='boolean')throw Error('Invalid setting: '+key);
  return {planets:Math.round(bound('planets',1,12)),inclination:bound('inclination',0,80),speed:bound('speed',0,2),stars:bound('stars',0,2),moons:value.moons??true,rings:value.rings??true};
}
export function normalizeGraphicsDocument(value){
  if(!value||typeof value!=='object'||typeof value.code!=='string'||value.code.length>80000)throw Error('Invalid graphics project');
  const settings=normalizeGraphicsSettings(value.settings),input=value.files??[{path:'scene.js',content:value.code,languageId:'javascript'},{path:'settings.json',content:JSON.stringify(settings,null,2),languageId:'json'}];
  if(!Array.isArray(input)||input.length>48)throw Error('Invalid graphics files');
  const seen=new Set(),files=input.map(file=>{
    if(!file||typeof file.path!=='string'||file.path!==normalizeWorkspacePath(file.path)||seen.has(file.path)||typeof file.content!=='string')throw Error('Invalid graphics file');
    seen.add(file.path);return {path:file.path,content:file.content,languageId:file.path.endsWith('.json')?'json':file.path.endsWith('.js')?'javascript':'text'};
  });
  if(!seen.has('scene.js'))throw Error('Missing scene.js');
  if(!seen.has('settings.json'))files.push({path:'settings.json',content:JSON.stringify(settings,null,2),languageId:'json'});
  if(files.reduce((size,f)=>size+f.content.length,0)>90000)throw Error('Graphics project is too large');
  return {name:String(value.name||'My universe').trim().slice(0,100)||'My universe',code:files.find(f=>f.path==='scene.js').content,files,activeFile:seen.has(value.activeFile)?value.activeFile:'scene.js',settings,template:['nexus','sphere','orbit','system','blank'].includes(value.template)?value.template:'blank',projectId:value.projectId||null};
}
export function resolveGraphicsDocument(value){
  const doc=normalizeGraphicsDocument(value);
  try{doc.settings=normalizeGraphicsSettings(JSON.parse(doc.files.find(f=>f.path==='settings.json').content))}
  catch(error){throw Object.assign(Error('settings.json: '+error.message),{file:'settings.json',line:1,column:1})}
  return doc;
}
// JavaScript helpers share a script scope; the entry script executes last.
export function graphicsProgram(document){
  const doc=resolveGraphicsDocument(document),files=doc.files.filter(f=>f.path.endsWith('.js')&&f.path!=='scene.js').sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  files.push(doc.files.find(f=>f.path==='scene.js'));
  let line=1;const ranges=[],code=files.map(file=>{const start=line;line+=file.content.split('\n').length+1;ranges.push({file:file.path,start,end:line-1});return file.content+'\n'}).join('\n');
  return {code,ranges,files:Object.fromEntries(doc.files.map(f=>[f.path,f.content]))};
}
export function ownGraphicsProjects(){const owner=activePrincipalId();return listProjects().filter(p=>p.origin?.kind==='graphics-lab'&&p.access?.ownerId===owner)}
export function graphicsProjectDocument(id){
  const p=getProject(id);if(!p||p.origin?.kind!=='graphics-lab'||p.access?.ownerId!==activePrincipalId())throw Error('Graphics project unavailable');
  const code=p.workspace.files.find(f=>f.path==='scene.js')?.content,settings=JSON.parse(p.workspace.files.find(f=>f.path==='settings.json')?.content||'{}');
  return normalizeGraphicsDocument({name:p.title,code,settings,files:p.workspace.files,activeFile:p.workspace.activeFile,template:p.origin.template,projectId:p.id});
}
export function saveGraphicsProject(document){
  const d=resolveGraphicsDocument(document),files=d.files;
  let p;if(d.projectId){graphicsProjectDocument(d.projectId);p=patchProject(d.projectId,{title:d.name,origin:{kind:'graphics-lab',template:d.template},workspace:{languageId:'javascript',entryFile:'scene.js',activeFile:d.activeFile,files},manifest:{title:d.name,entryFile:'scene.js',build:{profile:'graphics-preview',standard:'javascript',runtime:'nexus-graphics'}}})}
  else {p=createProject({title:d.name,description:'Nexus Computer Graphics · editable 3D scene',languageId:'javascript',entryFile:'scene.js',activeFile:d.activeFile,files,sourceRoots:['.'],includeRoots:[],testRoots:[],origin:{kind:'graphics-lab',template:d.template}});p=patchProject(p.id,{manifest:{build:{profile:'graphics-preview',standard:'javascript',runtime:'nexus-graphics'}}})}
  return p.id;
}
const draftKey=()=> 'akronikl:it-nexus:graphics-drafts:v1:'+activePrincipalId();
export function readGraphicsDrafts(){try{const db=JSON.parse(localStorage.getItem(draftKey())||'null');return db?.version===1&&db.drafts&&typeof db.drafts==='object'?db:{version:1,active:null,drafts:{}}}catch{return {version:1,active:null,drafts:{}}}}
export function writeGraphicsDraft(key,document,changed=true,removeKey=null){
  const db=readGraphicsDrafts();if(!db.drafts[key]&&Object.keys(db.drafts).length>=20)throw Error('Draft limit reached');
  if(removeKey&&removeKey!==key&&removeKey.startsWith('draft:'))delete db.drafts[removeKey];
  db.drafts[key]={...normalizeGraphicsDocument(document),changed,updatedAt:new Date().toISOString()};db.active=key;
  localStorage.setItem(draftKey(),JSON.stringify(db));return db;
}
export function removeGraphicsDraft(key){const db=readGraphicsDrafts();delete db.drafts[key];if(db.active===key)db.active=null;localStorage.setItem(draftKey(),JSON.stringify(db))}
export function graphicsProjectJSON(document){return JSON.stringify({format:'nexus-graphics-project',version:1,document:normalizeGraphicsDocument(document)},null,2)}
export function readGraphicsProjectJSON(text){if(typeof text!=='string'||text.length>120000)throw Error('Invalid graphics project');const data=JSON.parse(text);if(data.format!=='nexus-graphics-project'||data.version!==1)throw Error('Unsupported graphics project');return {...normalizeGraphicsDocument(data.document),projectId:null}}
