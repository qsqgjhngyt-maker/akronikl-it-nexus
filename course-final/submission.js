import{ASSESSMENT_ID,TASK_VERSION,RUBRIC_VERSION,FINAL_LIMITS,validateSubmissionBundle}from'./contract.js';import{AUTOMATIC_PROFILE,sourceIdentity}from'./automatic-policy.js';import{assessmentRequest}from'./api.js';import{digest}from'../sandbox/qt/verified-pack.js';
const encoder=new TextEncoder(),bytesHash=async bytes=>digest(bytes);
export async function uploadFinalBundle(bundle,attempt,{phase='submit',request=assessmentRequest,savePending=()=>{},progress=()=>{},signal,current=()=>true}={}){
 if(!['submit','checkpoint'].includes(phase))throw Error('ASSESSMENT_INPUT_INVALID');validateSubmissionBundle(bundle,{variant:attempt.variant,trackId:attempt.trackId,mode:'automatic'});
 const bytes=encoder.encode(JSON.stringify(bundle)),snapshotHash=await bytesHash(bytes),call=async payload=>{if(!current())throw Error('ACCOUNT_SESSION_CHANGED');signal?.throwIfAborted();const r=await request(payload,{signal});if(!current())throw Error('ACCOUNT_SESSION_CHANGED');return r};
 const begin=await call({phase:'begin',requestId:crypto.randomUUID(),attemptId:attempt.id,snapshotHash,totalBytes:bytes.length,chunkCount:Math.ceil(bytes.length/FINAL_LIMITS.chunkBytes)}),upload=begin.upload;
 if(upload.snapshotHash!==snapshotHash||upload.totalBytes!==bytes.length)throw Error('ASSESSMENT_RESPONSE_INVALID');savePending({uploadId:upload.id,snapshotHash,totalBytes:bytes.length});
 const manifest=await call({phase:'manifest',attemptId:attempt.id,uploadId:upload.id}),parts=new Map(manifest.parts.map(p=>[p.index,p]));
 for(let index=0;index<upload.chunkCount;index++){
  const part=bytes.subarray(index*FINAL_LIMITS.chunkBytes,(index+1)*FINAL_LIMITS.chunkBytes),sha256=await bytesHash(part),old=parts.get(index);
  if(old&&(old.sha256!==sha256||old.bytes!==part.length))throw Error('ASSESSMENT_PART_CONFLICT');
  if(!old){let binary='';for(const b of part)binary+=String.fromCharCode(b);await call({phase:'put',requestId:crypto.randomUUID(),attemptId:attempt.id,uploadId:upload.id,index,data:btoa(binary),sha256})}
  progress({sent:index+1,total:upload.chunkCount});
 }
 return(await call({phase,requestId:crypto.randomUUID(),attemptId:attempt.id,uploadId:upload.id})).attempt;
}
export async function readFinalBundle(attempt,{request=assessmentRequest,signal,current=()=>true}={}){
 if(!attempt.uploadId)throw Error('ASSESSMENT_INCOMPLETE');const call=async p=>{if(!current())throw Error('ACCOUNT_SESSION_CHANGED');const r=await request(p,{signal});if(!current())throw Error('ACCOUNT_SESSION_CHANGED');return r};
 const m=await call({phase:'manifest',attemptId:attempt.id,uploadId:attempt.uploadId}),u=m.upload,bytes=new Uint8Array(u.totalBytes);if(u.id!==attempt.uploadId||u.snapshotHash!==attempt.snapshotHash||m.parts.length!==u.chunkCount)throw Error('ASSESSMENT_RESPONSE_INVALID');
 let total=0;
 for(let offset=0;offset<u.chunkCount;offset+=5){const page=await call({phase:'parts',attemptId:attempt.id,uploadId:u.id,offset});if(page.uploadId!==u.id||page.offset!==offset||page.parts.length!==Math.min(5,u.chunkCount-offset))throw Error('ASSESSMENT_RESPONSE_INVALID');for(const[index,row]of page.parts.entries()){
  const expected=offset+index,part=Uint8Array.from(atob(row.data),c=>c.charCodeAt(0)),record=m.parts[expected];if(row.index!==expected||record.index!==expected||part.length!==row.bytes||record.bytes!==row.bytes||record.sha256!==row.sha256||await bytesHash(part)!==row.sha256)throw Error('ASSESSMENT_PART_INVALID');bytes.set(part,total);total+=part.length;
 }}
 if(total!==u.totalBytes||await bytesHash(bytes)!==u.snapshotHash)throw Error('ASSESSMENT_BUNDLE_INVALID');const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),bundle=JSON.parse(text);if(JSON.stringify(bundle)!==text)throw Error('ASSESSMENT_BUNDLE_INVALID');validateSubmissionBundle(bundle,{variant:attempt.variant,trackId:attempt.trackId,mode:attempt.mode});return bundle;
}
export async function buildFinalBundle(attempt,draft,sources,{requireFresh=false}={}){
 const practical={},observations={};for(const part of['P1','P2','P3','P4']){practical[part]=sources[part]||null;observations[part]=await observation(practical[part],draft.evidence[part],requireFresh)}
 const project=sources.project||null,projectObservation=await observation(project,draft.evidence.project,requireFresh);let defense=null;
 if(sources.defense&&draft.evidence.defense&&project){const d=draft.evidence.defense,hash=await digest(encoder.encode(sourceIdentity(sources.defense))),baseHash=await digest(encoder.encode(sourceIdentity(project)));if(d.sourceHash===hash&&d.baselineHash===baseHash)defense={source:sources.defense,sourceHash:d.sourceHash,baselineHash:d.baselineHash,challengeId:d.challengeId,checks:d.checks};else if(requireFresh)throw Error('ASSESSMENT_SOURCE_CHANGED')}
 const bundle={schemaVersion:2,assessmentId:ASSESSMENT_ID,taskVersion:TASK_VERSION,rubricVersion:RUBRIC_VERSION,variant:attempt.variant,answers:draft.answers,practical,project:{trackId:attempt.trackId,source:project},report:draft.report||'',automatic:{profile:AUTOMATIC_PROFILE,practical:observations,project:projectObservation,defense}};validateSubmissionBundle(bundle,{variant:attempt.variant,trackId:attempt.trackId});return bundle;
}
async function observation(source,value,requireFresh){if(!source||!value)return null;if(await digest(encoder.encode(sourceIdentity(source)))!==value.sourceHash){if(requireFresh)throw Error('ASSESSMENT_SOURCE_CHANGED');return null}return{sourceHash:value.sourceHash,checks:value.checks}}
