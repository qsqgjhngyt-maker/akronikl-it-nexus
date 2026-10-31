// S1: редактор и текстовый перенос. Исполнитель BSL здесь не регистрируется.
import {IMPORT_LIMITS,strictProjectPath} from '../../project-studio/project-transfer.js';
export {IMPORT_LIMITS};
const fail=code=>{throw Object.assign(Error(code),{code})};
const size=s=>new TextEncoder().encode(s).length;
export const STUDIO_PROFILE='onec-editor-s1';
export const NATIVE_FILES=Object.freeze(['Configuration.xml','Catalogs/Клиенты.xml','Catalogs/Услуги.xml','Enums/СтатусыЗаявки.xml','Documents/ЗаявкаУслуги.xml','Documents/ЗаявкаУслуги/Ext/ObjectModule.bsl','Ext/ManagedApplicationModule.bsl','Languages/Русский.xml','Subsystems/УчебнаяСлужба.xml']);
export function title(value){if(typeof value!=='string'||!value.isWellFormed()||!value.trim()||value.length>120||/[\u0000-\u001f\u007f]/.test(value))fail('TITLE');return value.trim()}
export function validateOnecWorkspace(value,{metadataEditable=false}={}){
 if(!value||value.languageId!=='onec'||!Array.isArray(value.files)||!value.files.length||value.files.length>IMPORT_LIMITS.files)fail('FORMAT');
 const seen=new Set();let total=0;
 const files=value.files.map(f=>{
  const path=strictProjectPath(f?.path);if(!path.isWellFormed())fail('PATH');if(seen.has(path))fail('DUPLICATE');seen.add(path);
  if(!/\.(bsl|os|xml|md|txt|json)$/i.test(path)||typeof f.content!=='string'||!f.content.isWellFormed()||/[\u0000\uFFFD]/.test(f.content))fail('FORMAT');
  if(/\.xml$/i.test(path)&&/<!\s*(DOCTYPE|ENTITY)\b/i.test(f.content))fail('XML_ENTITY');
  const n=size(f.content);if(n>IMPORT_LIMITS.fileBytes||(total+=n)>IMPORT_LIMITS.totalBytes)fail('SIZE');
  return{path,content:f.content,languageId:'onec',readOnly:/\.xml$/i.test(path)&&!metadataEditable};
 });
 for(const p of seen)for(const other of seen)if(other.startsWith(p+'/'))fail('PATH_CONFLICT');
 const entryFile=strictProjectPath(value.entryFile);if(!seen.has(entryFile)||!/\.(bsl|os)$/i.test(entryFile))fail('ENTRY');
 return{languageId:'onec',entryFile,activeFile:seen.has(value.activeFile)?value.activeFile:entryFile,revision:Number.isSafeInteger(value.revision)&&value.revision>=0?value.revision:0,files};
}
export function onecImportInput(value){
 // Только переносимые исходники. Произвольные id/ACL/progress/origin/sync не принимаются.
 if(value?.languageId!=='onec')fail('FORMAT');
 return{title:title(value.title),workspace:validateOnecWorkspace(value.workspace),origin:{kind:'user-import',credit:'none'}};
}
export async function readOnecImport(file){
 if(!file||!Number.isSafeInteger(file.size)||file.size<0||file.size>IMPORT_LIMITS.jsonBytes)fail('SIZE');
 const bytes=await file.arrayBuffer();if(bytes.byteLength>IMPORT_LIMITS.jsonBytes)fail('SIZE');
 let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{fail('FORMAT')}
 return onecImportInput(value);
}
export function onecExportSources(project,workspace=project.workspace){
 const clean=validateOnecWorkspace(workspace,{metadataEditable:project.manifest?.onec?.metadataEditable===true});
 // Не экспортируем owner, ACL, аккаунт, Cloud, путь базы, историю и зачёты.
 return JSON.stringify({format:'nexus-onec-sources-v1',title:title(project.title),languageId:'onec',workspace:clean},null,2);
}
export function bindingFor(curriculum,topicId){
 if(!['onec','1c-enterprise'].includes(curriculum?.courseId))fail('COURSE');
 const module=curriculum.modules.find(m=>m.status==='IMPLEMENTED'&&['onec.p2','1c-enterprise.a2'].includes(m.moduleId||m.id)&&m.topics.some(t=>t.topicId===topicId&&t.status==='IMPLEMENTED'));
 // Curriculum использует id в зависимости от CP версии; topic binding всегда явный.
 const topic=module?.topics.find(t=>t.topicId===topicId);if(!topic)fail('TOPIC');
 return{courseId:curriculum.courseId,topicId,moduleId:module.moduleId||module.id,contentRevision:topic.contentRevision,configurationRevision:'0.2.0-a2p2'};
}
