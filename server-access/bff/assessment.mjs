import{Buffer}from'node:buffer';import{createHash}from'node:crypto';
import{ASSESSMENT_ID,TASK_VERSION,RUBRIC_VERSION,FINAL_LIMITS,validateSubmissionBundle}from'../../course-final/contract.js';
import{validateAssessmentRequest,validateAssessmentDTO}from'../../course-final/transport-contract.js';
import{AUTOMATIC_POLICY,PRACTICAL_CHECKS,PROJECT_CHECKS,DEFENSE_CHECKS,emptyChecks,sourceIdentity}from'../../course-final/automatic-policy.js';
export class AssessmentBridgeError extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status}}
const fail=(code,status)=>{throw new AssessmentBridgeError(code,status)},sha=b=>createHash('sha256').update(b).digest('hex');
export const disabledAssessment=()=>({enabled:false,assessmentId:ASSESSMENT_ID,taskVersion:TASK_VERSION,rubricVersion:RUBRIC_VERSION,canAssign:false,canReview:false,limits:FINAL_LIMITS,policy:AUTOMATIC_POLICY,mode:'automatic'});
function automaticProof(bundle){
 const e=bundle.automatic,practical={};
 const checked=(source,observation,maxima)=>{if(observation===null)return emptyChecks(maxima);if(source===null||sha(sourceIdentity(source))!==observation.sourceHash)fail('ASSESSMENT_AUTOMATIC_INVALID');return observation.checks};
 for(const[id,maxima]of Object.entries(PRACTICAL_CHECKS))practical[id]=checked(bundle.practical[id],e.practical[id],maxima);
 const project=checked(bundle.project.source,e.project,PROJECT_CHECKS),d=e.defense;let defense=emptyChecks(DEFENSE_CHECKS),codeChanged=false;
 if(d!==null){if(sha(sourceIdentity(bundle.project.source))!==d.baselineHash||sha(sourceIdentity(d.source))!==d.sourceHash)fail('ASSESSMENT_AUTOMATIC_INVALID');defense=d.checks;codeChanged=sourceIdentity(bundle.project.source,{codeOnly:true})!==sourceIdentity(d.source,{codeOnly:true})}
 return{policy:AUTOMATIC_POLICY,choices:Object.fromEntries(Object.entries(bundle.answers).map(([key,a])=>[key,a.optionId])),practical,project,defense,codeChanged};
}
function bound(data,p,expected){
 if(data.attempt){const a=data.attempt;if(p.attemptId&&a.id!==p.attemptId)fail('ASSESSMENT_RESPONSE_INVALID',502);if(['open','track','begin','submit','checkpoint','withdraw','appeal'].includes(p.phase)&&a.accountId!==expected)fail('ASSESSMENT_RESPONSE_INVALID',502);if(['detail','manifest'].includes(p.phase)&&a.accountId!==expected&&a.reviewerId!==expected)fail('ASSESSMENT_RESPONSE_INVALID',502);}
 if(p.phase==='parts'&&(data.uploadId!==p.uploadId||data.offset!==p.offset))fail('ASSESSMENT_RESPONSE_INVALID',502);
 if(p.phase==='put'&&(data.index!==p.index||data.sha256!==p.sha256))fail('ASSESSMENT_RESPONSE_INVALID',502);
 if(p.phase==='begin'&&(data.upload.snapshotHash!==p.snapshotHash||data.upload.totalBytes!==p.totalBytes||data.upload.chunkCount!==p.chunkCount))fail('ASSESSMENT_RESPONSE_INVALID',502);
 return data;
}
export async function assessmentBridge(payload,rpc,{expectedAccountId,signal=AbortSignal.timeout(45000)}={}){
 try{validateAssessmentRequest(payload)}catch{fail('ASSESSMENT_INPUT_INVALID')}
 const call=async p=>{
  signal.throwIfAborted();const data=await rpc(p,{signal:AbortSignal.any([signal,AbortSignal.timeout(12000)])});signal.throwIfAborted();
  try{return bound(validateAssessmentDTO(data,p.phase,expectedAccountId),p,expectedAccountId)}catch(error){if(error instanceof AssessmentBridgeError)throw error;fail('ASSESSMENT_RESPONSE_INVALID',502)}
 };
 if(!['submit','checkpoint'].includes(payload.phase))return call(payload);
 const{attemptId,uploadId}=payload,manifest=await call({phase:'manifest',attemptId,uploadId}),{attempt:a,upload:u,parts}=manifest;
 if(a.accountId!==expectedAccountId)fail('NOT_FOUND',404);
 if(a.status!=='draft'){if(a.uploadId===u.id&&a.snapshotHash===u.snapshotHash)return{attempt:a};fail('ASSESSMENT_STATE_INVALID',409)}
 if(parts.length!==u.chunkCount||parts.some((r,i)=>r.index!==i||r.bytes!==(i===u.chunkCount-1?u.totalBytes-i*FINAL_LIMITS.chunkBytes:FINAL_LIMITS.chunkBytes)))fail('ASSESSMENT_INCOMPLETE',409);
 const chunks=[];
 for(let offset=0;offset<u.chunkCount;offset+=5){
  const page=await call({phase:'parts',attemptId,uploadId,offset});if(page.parts.length!==Math.min(5,u.chunkCount-offset))fail('ASSESSMENT_INCOMPLETE',409);
  for(const[index,row]of page.parts.entries()){
   const i=offset+index,bytes=Buffer.from(row.data,'base64');if(row.index!==i||row.bytes!==parts[i].bytes||row.sha256!==parts[i].sha256||bytes.length!==row.bytes||bytes.toString('base64')!==row.data||sha(bytes)!==row.sha256)fail('ASSESSMENT_PART_INVALID',409);chunks.push(bytes);
  }
 }
 const bytes=Buffer.concat(chunks,u.totalBytes);if(sha(bytes)!==u.snapshotHash)fail('ASSESSMENT_BUNDLE_INVALID');let bundle;
 try{const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);bundle=JSON.parse(text);if(text!==JSON.stringify(bundle))fail('ASSESSMENT_BUNDLE_INVALID');validateSubmissionBundle(bundle,{variant:a.variant,trackId:a.trackId,mode:a.mode})}catch(error){fail(['ASSESSMENT_SENSITIVE_DATA','ASSESSMENT_AUTOMATIC_INVALID'].includes(error.code)?error.code:'ASSESSMENT_BUNDLE_INVALID')}
 const completeness={answers:Object.fromEntries(Object.entries(bundle.answers).map(([key,text])=>[key,a.mode==='automatic'?text.optionId!==null:!!text.trim()])),practical:Object.fromEntries(Object.entries(bundle.practical).map(([key,value])=>[key,value!==null])),project:bundle.project.source!==null};
 const automatic=a.mode==='automatic'?automaticProof(bundle):null;
 const data=await rpc({phase:'certify',intent:payload.phase,requestId:payload.requestId,attemptId,uploadId,snapshotHash:u.snapshotHash,totalBytes:u.totalBytes,expectedVersion:a.version,completeness,automatic},{signal:AbortSignal.any([signal,AbortSignal.timeout(12000)])});
 try{return bound(validateAssessmentDTO(data,payload.phase,expectedAccountId),payload,expectedAccountId)}catch{fail('ASSESSMENT_RESPONSE_INVALID',502)}
}
