import{createControlSession}from'./control-session.js';import{capstoneControlSource,capstoneGuiControlSource,capstoneSpec}from'./capstone-controls.js';import{PROJECT_CHECKS,DEFENSE_CHECKS,DEFENSE_CHALLENGES,emptyChecks}from'./automatic-policy.js';
import{portableProjectArchive,portableSourceFiles}from'../project-studio/portable-archive.js';import{validateProjectWorkspace,strictProjectPath}from'../project-studio/project-transfer.js';
const guiIds=['guiAdd','guiAction','guiReject','guiRestore'],modelIds=Object.keys(PROJECT_CHECKS).filter(id=>id!=='build'&&id!=='portableRoundTrip'&&!guiIds.includes(id));
// Только собственный bounded STORE ZIP производителя, не общий ZIP importer.
export function restoreControlArchive(bytes,source){
 if(!(bytes instanceof Uint8Array)||bytes.length>2*1024*1024)throw Error('ASSESSMENT_ARCHIVE_INVALID');const decoder=new TextDecoder('utf-8',{fatal:true}),files=[],seen=new Set(),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let offset=0;
 while(offset+30<=bytes.length&&view.getUint32(offset,true)===0x04034b50){
  if(files.length>=64||view.getUint16(offset+6,true)!==0x800||view.getUint16(offset+8,true)!==0||view.getUint16(offset+28,true)!==0)throw Error('ASSESSMENT_ARCHIVE_INVALID');
  const size=view.getUint32(offset+18,true),raw=view.getUint32(offset+22,true),length=view.getUint16(offset+26,true),start=offset+30+length,end=start+size;if(size!==raw||end>bytes.length)throw Error('ASSESSMENT_ARCHIVE_INVALID');
  const path=strictProjectPath(decoder.decode(bytes.slice(offset+30,start)));if(seen.has(path))throw Error('ASSESSMENT_ARCHIVE_INVALID');seen.add(path);files.push({path,content:decoder.decode(bytes.slice(start,end)),languageId:'cpp'});offset=end;
 }
 if(offset+46>bytes.length||view.getUint32(offset,true)!==0x02014b50||bytes.length<22||view.getUint32(bytes.length-22,true)!==0x06054b50||view.getUint16(bytes.length-12,true)!==files.length||view.getUint32(bytes.length-6,true)!==offset)throw Error('ASSESSMENT_ARCHIVE_INVALID');
 const expected=portableSourceFiles(source);if(Object.keys(expected).length!==files.length||files.some(f=>expected[f.path]!==f.content))throw Error('ASSESSMENT_ARCHIVE_INVALID');
 return{title:source.title,manifest:structuredClone(source.manifest),workspace:validateProjectWorkspace({languageId:'cpp',entryFile:source.workspace.entryFile,files})};
}
export function createCapstoneControlRunner(options={}){
 const session=createControlSession(options);
 async function project(scope,trackId){
  capstoneSpec(trackId);const{source,sourceHash}=scope,nonce=crypto.randomUUID(),checks=emptyChecks(PROJECT_CHECKS),program=capstoneControlSource(trackId,nonce);let output='';
  const model=await scope.wasm(source,program,modelIds,nonce);checks.build=model.build;for(const id of modelIds)checks[id]=model.outcomes[id]===true;output=model.output;
  if(!checks.build)return{sourceHash,checks,output};
  const gui=await scope.qt(source,capstoneGuiControlSource(trackId,nonce),guiIds,nonce);checks.build&&=gui.build;for(const id of guiIds)checks[id]=gui.outcomes[id]===true;output=(output+'\n'+gui.output).slice(-65536);
  if(checks.build){scope.tell('portable-running');const restored=restoreControlArchive(portableProjectArchive(source),source),r=await scope.wasm(restored,program,modelIds,nonce);checks.portableRoundTrip=r.build&&modelIds.every(id=>Object.hasOwn(model.outcomes,id)&&Object.hasOwn(r.outcomes,id)&&model.outcomes[id]===r.outcomes[id]);output=(output+'\n'+r.output).slice(-65536)}
  scope.check();return{sourceHash,checks,output};
 }
 return{
  runProject(input,{trackId}){return session.run(input,scope=>project(scope,trackId))},
  runDefense(input,{trackId,baseline}){return session.run(input,async scope=>{
   if(!baseline||typeof baseline.sourceHash!=='string'||Object.keys(PROJECT_CHECKS).some(id=>typeof baseline.checks?.[id]!=='boolean'))throw Error('ASSESSMENT_BASELINE_REQUIRED');
   const nonce=crypto.randomUUID(),r=await scope.wasm(scope.source,capstoneControlSource(trackId,nonce,{defense:true}),['newBehavior','boundary','regression'],nonce),checks=emptyChecks(DEFENSE_CHECKS);checks.build=r.build;checks.newBehavior=r.outcomes.newBehavior===true;checks.boundary=r.outcomes.boundary===true;let output=r.output;
   if(r.build){const repeated=await project(scope,trackId);checks.build&&=repeated.checks.build;checks.regression=r.outcomes.regression===true&&Object.keys(PROJECT_CHECKS).every(id=>!baseline.checks[id]||repeated.checks[id]);output=(output+'\n'+repeated.output).slice(-65536)}
   return{sourceHash:scope.sourceHash,baselineHash:baseline.sourceHash,challengeId:DEFENSE_CHALLENGES[trackId],checks,output};
  })},
  cancel:session.cancel,get busy(){return session.busy}
 };
}
