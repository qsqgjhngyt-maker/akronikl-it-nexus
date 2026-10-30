// Доверие actor возникает только после private BFF HMAC и серверной сессии.
// Исходники не компилируются на Worker. Полный bundle проверяет BFF, части — Worker.
import{Buffer}from'node:buffer';
import{query,first,rows,sha,deny}from'./admin-service.mjs';
import{AlphaError}from'./alpha-admission.mjs';
import{ASSESSMENT_ID,TASK_VERSION,RUBRIC_VERSION,FINAL_LIMITS,calculateReview}from'../../course-final/contract.js';
import{validateAssessmentRequest,exact,uuid,hash}from'../../course-final/transport-contract.js';
import{AUTOMATIC_POLICY,validateAutomaticProof,calculateAutomatic}from'../../course-final/automatic-policy.js';
import{BANK_HASHES}from'../../course-final/bank-integrity.js';
const stamp=()=>new Date().toISOString(),j=value=>JSON.stringify(value);
function guard(env,actor,id,phase,condition,args=[]){
 const n=3+args.length,time=stamp(),freshAdmin=phase==='assessment-admin';
 const session=`EXISTS(SELECT 1 FROM account_sessions s JOIN account_subjects a ON a.id=s.subject_id AND a.status='active' JOIN account_devices d ON d.id=s.device_id AND d.subject_id=a.id AND d.status='active' JOIN session_login_methods slm ON slm.session_id=s.id AND slm.account_id=a.id JOIN login_methods lm ON lm.id=slm.login_method_id AND lm.account_id=a.id AND lm.status='active' WHERE s.id=?${n} AND s.subject_id=?${n+1} AND s.status='active' AND s.auth_strength='account-method-v1' AND s.revoked_at IS NULL AND s.idle_expires_at>?${n+2} AND s.absolute_expires_at>?${n+2} AND (EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=a.id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>?${n+2})) OR EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=a.id AND g.status='active'))${freshAdmin?` AND lm.kind='passkey' AND s.created_at>=?${n+3} AND s.created_at<=?${n+2} AND EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=a.id AND g.status='active') AND EXISTS(SELECT 1 FROM nexus_passkey_credentials k WHERE k.login_method_id=lm.id AND k.account_id=a.id)`:''})`;
 return query(env.DB,'INSERT INTO nexus_assessment_write_guards(request_id,phase,valid) VALUES(?1,?2,(('+condition+') AND '+session+'))',id,phase,...args,actor.session_id,actor.account_id,time,...(freshAdmin?[new Date(Date.now()-300000).toISOString()]:[]));
}
const audit=(db,actor,id,action,attemptId,time)=>query(db,'INSERT INTO nexus_assessment_audit(id,actor_id,action,attempt_id,created_at) VALUES(?1,?2,?3,?4,?5)',id,actor.account_id,action,attemptId,time);
const select="SELECT a.*,COALESCE(g.result,r.result) review_result FROM nexus_assessment_attempts a LEFT JOIN nexus_assessment_reviews r ON r.id=a.latest_review_id LEFT JOIN nexus_assessment_auto_results g ON g.attempt_id=a.id";
function dto(a){return{id:a.id,accountId:a.account_id,mode:a.assessment_mode,variant:a.variant,trackId:a.track_id,ordinal:a.ordinal,parentAttemptId:a.parent_attempt_id,status:a.status,reviewerId:a.reviewer_id,snapshotHash:a.snapshot_hash,uploadId:a.upload_id,latestReviewId:a.latest_review_id,createdAt:a.created_at,submittedAt:a.submitted_at,version:a.version,result:a.review_result?JSON.parse(a.review_result):null,interruptReason:a.interrupt_reason}}
const uploadDTO=u=>({id:u.id,snapshotHash:u.snapshot_hash,totalBytes:u.total_bytes,chunkCount:u.chunk_count});
const reviewDTO=r=>r?{id:r.id,attemptId:r.attempt_id,reviewerId:r.reviewer_id,previousReviewId:r.previous_review_id,rubric:JSON.parse(r.rubric),result:JSON.parse(r.result),createdAt:r.created_at}:null;
const appealDTO=a=>a?{id:a.id,attemptId:a.attempt_id,reviewId:a.review_id,text:a.text,createdAt:a.created_at}:null;
async function transaction(env,commands){try{const result=await env.DB.batch(commands);if(result.some(r=>!r.success))deny('CONTROL_WRITE_UNCONFIRMED',503);return result}catch(e){if(e instanceof AlphaError)throw e;if(String(e.message).includes('assessment_quota'))deny('ASSESSMENT_QUOTA',409);deny('CONTROL_CONFLICT',409)}}
async function attempt(env,actor,id,{owner=false,admin=false}={}){
 const a=await first(env.DB,select+' WHERE a.id=?1',id);
 if(!a||a.account_id!==actor.account_id&&(owner||a.reviewer_id!==actor.account_id&&!admin))deny('NOT_FOUND',404);return a;
}
async function privateUpload(env,actor,attemptId,uploadId){
 const a=await attempt(env,actor,attemptId),u=await first(env.DB,'SELECT * FROM nexus_assessment_uploads WHERE id=?1 AND attempt_id=?2',uploadId,a.id);
 if(!u||a.account_id!==actor.account_id&&a.upload_id!==u.id)deny('NOT_FOUND',404);return{a,u};
}
const meta=async(env,id)=>dto(await first(env.DB,select+' WHERE a.id=?1',id));
const summary=async(env,id)=>({attempt:await meta(env,id)});
const version=(a,v)=>{if(a.version!==v)deny('CONTROL_CONFLICT',409)};
const draft=a=>{if(a.status!=='draft')deny('ASSESSMENT_STATE_INVALID',409)};
function completeness(value){
 const answerKeys=[...Array.from({length:12},(_,i)=>'C'+String(i+1).padStart(2,'0')),...Array.from({length:8},(_,i)=>'D'+String(i+1).padStart(2,'0'))];
 return exact(value,['answers','practical','project'])&&exact(value.answers,answerKeys)&&exact(value.practical,['P1','P2','P3','P4'])&&[...Object.values(value.answers),...Object.values(value.practical),value.project].every(v=>typeof v==='boolean');
}
export async function assessmentOperation(env,value,{requireAdmin}){
 if(env.COURSE_FINAL_ENABLED!=='true')deny('ASSESSMENT_UNAVAILABLE',503);
 const{actor,method,payload:p}=value;if(method!=='POST')deny('INVALID_INPUT');
 // certify — только внутренний BFF этап. Public BFF validator его не принимает.
 if(p?.phase==='certify'){
  if(!exact(p,['phase','intent','requestId','attemptId','uploadId','snapshotHash','totalBytes','completeness','expectedVersion','automatic'])||!['submit','checkpoint'].includes(p.intent)||![p.requestId,p.attemptId,p.uploadId].every(uuid)||!hash(p.snapshotHash)||!Number.isSafeInteger(p.totalBytes)||!Number.isSafeInteger(p.expectedVersion)||p.expectedVersion<1||!completeness(p.completeness))deny('INVALID_INPUT');
  if(p.automatic!==null)try{validateAutomaticProof(p.automatic)}catch{deny('ASSESSMENT_AUTOMATIC_INVALID')}
 }else try{validateAssessmentRequest(p)}catch{deny('ASSESSMENT_INPUT_INVALID')}
 const admin=!!await first(env.DB,"SELECT 1 ok FROM nexus_admin_grants WHERE account_id=?1 AND status='active'",actor.account_id);
 if(!admin&&!await first(env.DB,"SELECT 1 ok FROM nexus_alpha_members WHERE account_id=?1 AND state='active' AND (access_expires_at IS NULL OR access_expires_at>?2)",actor.account_id,stamp()))deny('SESSION_REQUIRED',401);
 const expert=env.COURSE_FINAL_EXPERT_ENABLED==='true',mode=expert?'expert':'automatic';
 if(!expert&&['queue','unassigned','assign','review','review-detail','appeal','appeal-detail'].includes(p.phase))deny('ASSESSMENT_UNAVAILABLE',503);
 const caps=async()=>({enabled:true,assessmentId:ASSESSMENT_ID,taskVersion:TASK_VERSION,rubricVersion:RUBRIC_VERSION,canAssign:expert&&admin,canReview:expert&&!!await first(env.DB,"SELECT 1 ok FROM nexus_assessment_attempts WHERE reviewer_id=?1 AND assessment_mode='expert' LIMIT 1",actor.account_id),limits:FINAL_LIMITS,policy:expert?'pilot-40-50-10-v1':AUTOMATIC_POLICY,mode});
 if(p.phase==='capabilities')return caps();
 if(['list','queue','unassigned'].includes(p.phase)){
  if(p.phase==='unassigned')await requireAdmin(env,actor);
  const filter=p.phase==='list'?'a.account_id=?1':p.phase==='queue'?'a.reviewer_id=?1':"a.reviewer_id IS NULL AND a.status IN('submitted','reviewed')";
  const args=p.phase==='unassigned'?[]:[actor.account_id];let cursor='';
  if(p.cursor){const c=await first(env.DB,select+' WHERE '+filter+' AND a.id=?'+(args.length+1),...args,p.cursor);if(!c)deny('NOT_FOUND',404);const n=args.length+1;cursor=' AND (a.created_at,a.id)<(?'+n+',?'+(n+1)+')';args.push(c.created_at,c.id)}
  const all=await rows(query(env.DB,select+' WHERE '+filter+cursor+' ORDER BY a.created_at DESC,a.id DESC LIMIT 26',...args));
  return{items:all.slice(0,25).map(dto),nextCursor:all.length>25?all[24].id:null};
 }
 if(p.phase==='open'){
  const existing=await first(env.DB,select+' WHERE a.create_request_id=?1 AND a.account_id=?2',p.requestId,actor.account_id);
  if(existing){if(existing.track_id!==p.trackId||existing.parent_attempt_id!==p.parentAttemptId)deny('CONTROL_CONFLICT',409);return{attempt:dto(existing)}}
  const owner=await first(env.DB,'SELECT * FROM nexus_assessment_owners WHERE account_id=?1',actor.account_id),count=await first(env.DB,"SELECT count(*) n,COALESCE(max(ordinal),0) ordinal FROM nexus_assessment_attempts WHERE account_id=?1",actor.account_id),used=await first(env.DB,"SELECT count(*) n FROM nexus_assessment_attempts WHERE account_id=?1 AND status<>'interrupted'",actor.account_id);
  if(expert&&used.n>=2+(owner?.extra_attempts||0)||count.ordinal>=1000)deny('ASSESSMENT_ATTEMPT_LIMIT',409);
  let parent=null;if(p.parentAttemptId){parent=await attempt(env,actor,p.parentAttemptId,{owner:true});if(parent.assessment_mode!==mode||parent.status!=='interrupted'&&(!['reviewed','assessed'].includes(parent.status)||JSON.parse(parent.review_result).status!=='requires-revision'))deny('ASSESSMENT_STATE_INVALID',409)}else if(count.n)deny('ASSESSMENT_PARENT_REQUIRED',409);
  const id=crypto.randomUUID(),ordinal=count.ordinal+1,variant=['A','B','C'][(parseInt((await sha(actor.account_id)).slice(0,2),16)+ordinal-1)%3],created=stamp();
  const limit=expert?2+(owner?.extra_attempts||0):1000;
  await transaction(env,[query(env.DB,'INSERT OR IGNORE INTO nexus_assessment_owners(account_id) VALUES(?1)',actor.account_id),guard(env,actor,p.requestId,'assessment-open',"NOT EXISTS(SELECT 1 FROM nexus_assessment_attempts WHERE account_id=?3 AND status='draft') AND (SELECT count(*) FROM nexus_assessment_attempts WHERE account_id=?3 AND status<>'interrupted')<?6 AND ((?4 IS NULL AND NOT EXISTS(SELECT 1 FROM nexus_assessment_attempts WHERE account_id=?3)) OR EXISTS(SELECT 1 FROM nexus_assessment_attempts p LEFT JOIN nexus_assessment_reviews r ON r.id=p.latest_review_id LEFT JOIN nexus_assessment_auto_results g ON g.attempt_id=p.id WHERE p.id=?4 AND p.account_id=?3 AND p.version=?5 AND p.assessment_mode=?7 AND (p.status='interrupted' OR p.status IN('reviewed','assessed') AND json_extract(COALESCE(g.result,r.result),'$.status')='requires-revision')))",[actor.account_id,p.parentAttemptId,parent?.version||0,limit,mode]),query(env.DB,"INSERT INTO nexus_assessment_attempts(id,account_id,assessment_id,task_version,rubric_version,assessment_mode,variant,track_id,ordinal,parent_attempt_id,create_request_id,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",id,actor.account_id,ASSESSMENT_ID,TASK_VERSION,RUBRIC_VERSION,mode,variant,p.trackId,ordinal,p.parentAttemptId,p.requestId,created),audit(env.DB,actor,p.requestId,'assessment-open',id,created)]);return summary(env,id);
 }
 if(['detail','review-detail','appeal-detail'].includes(p.phase)){
  const a=await attempt(env,actor,p.attemptId);
  if(p.phase==='review-detail'){const r=await first(env.DB,'SELECT * FROM nexus_assessment_reviews WHERE id=?1 AND attempt_id=?2',p.reviewId,a.id);if(!r)deny('NOT_FOUND',404);return{review:reviewDTO(r)}}
  if(p.phase==='appeal-detail'){const r=await first(env.DB,'SELECT * FROM nexus_assessment_appeals WHERE id=?1 AND attempt_id=?2',p.appealId,a.id);if(!r)deny('NOT_FOUND',404);return{appeal:appealDTO(r)}}
  const history=await rows(query(env.DB,'SELECT id,created_at,result FROM nexus_assessment_reviews WHERE attempt_id=?1 ORDER BY created_at DESC,id DESC LIMIT 16',a.id)),appeals=await rows(query(env.DB,'SELECT * FROM nexus_assessment_appeals WHERE attempt_id=?1 ORDER BY created_at DESC,id DESC LIMIT 16',a.id));
  return{attempt:dto(a),review:reviewDTO(a.latest_review_id?await first(env.DB,'SELECT * FROM nexus_assessment_reviews WHERE id=?1',a.latest_review_id):null),history:history.map(r=>({id:r.id,createdAt:r.created_at,result:JSON.parse(r.result)})),appeals:appeals.map(r=>({id:r.id,reviewId:r.review_id,createdAt:r.created_at})),latestAppeal:appealDTO(appeals[0])};
 }
 if(p.phase==='track'){
  const a=await attempt(env,actor,p.attemptId,{owner:true});draft(a);version(a,p.expectedVersion);
  await transaction(env,[guard(env,actor,p.requestId,'assessment-track',"EXISTS(SELECT 1 FROM nexus_assessment_attempts WHERE id=?3 AND account_id=?4 AND status='draft' AND version=?5)",[a.id,actor.account_id,a.version]),query(env.DB,'UPDATE nexus_assessment_attempts SET track_id=?1,version=version+1 WHERE id=?2',p.trackId,a.id)]);return summary(env,a.id);
 }
 if(p.phase==='withdraw'){
  const a=await attempt(env,actor,p.attemptId,{owner:true});if(a.status==='interrupted'&&a.interrupt_reason===p.reason)return{attempt:dto(a)};draft(a);version(a,p.expectedVersion);const time=stamp();
  await transaction(env,[guard(env,actor,p.requestId,'assessment-withdraw',"EXISTS(SELECT 1 FROM nexus_assessment_attempts WHERE id=?3 AND account_id=?4 AND status='draft' AND version=?5)",[a.id,actor.account_id,a.version]),query(env.DB,"UPDATE nexus_assessment_attempts SET status='interrupted',interrupt_reason=?1,version=version+1 WHERE id=?2",p.reason,a.id),audit(env.DB,actor,p.requestId,'assessment-interrupt',a.id,time)]);return summary(env,a.id);
 }
 if(p.phase==='begin'){
  const a=await attempt(env,actor,p.attemptId,{owner:true});draft(a);const existing=await first(env.DB,'SELECT * FROM nexus_assessment_uploads WHERE attempt_id=?1 AND snapshot_hash=?2',a.id,p.snapshotHash);
  if(existing){if(existing.total_bytes!==p.totalBytes||existing.chunk_count!==p.chunkCount)deny('CONTROL_CONFLICT',409);return{attempt:dto(a),upload:uploadDTO(existing)}}
  if((await first(env.DB,'SELECT count(*) n FROM nexus_assessment_uploads WHERE attempt_id=?1',a.id)).n>=8)deny('ASSESSMENT_UPLOAD_LIMIT',409);
  const id=crypto.randomUUID();await transaction(env,[guard(env,actor,p.requestId,'assessment-begin',"EXISTS(SELECT 1 FROM nexus_assessment_attempts WHERE id=?3 AND account_id=?4 AND status='draft') AND (SELECT count(*) FROM nexus_assessment_uploads WHERE attempt_id=?3)<8",[a.id,actor.account_id]),query(env.DB,'INSERT INTO nexus_assessment_uploads(id,attempt_id,snapshot_hash,total_bytes,chunk_count,created_at) VALUES(?1,?2,?3,?4,?5,?6)',id,a.id,p.snapshotHash,p.totalBytes,p.chunkCount,stamp())]);
  return{attempt:dto(a),upload:uploadDTO(await first(env.DB,'SELECT * FROM nexus_assessment_uploads WHERE id=?1',id))};
 }
 if(['put','manifest','parts','certify'].includes(p.phase)){
  const{a,u}=await privateUpload(env,actor,p.attemptId,p.uploadId);
  if(p.phase==='manifest'){const parts=await rows(query(env.DB,'SELECT part_index,bytes,sha256 FROM nexus_assessment_parts WHERE upload_id=?1 ORDER BY part_index',u.id));return{attempt:dto(a),upload:uploadDTO(u),parts:parts.map(r=>({index:r.part_index,bytes:r.bytes,sha256:r.sha256}))}}
  if(p.phase==='parts'){const parts=await rows(query(env.DB,'SELECT part_index,bytes,sha256,data FROM nexus_assessment_parts WHERE upload_id=?1 AND part_index>=?2 ORDER BY part_index LIMIT 5',u.id,p.offset));return{uploadId:u.id,offset:p.offset,parts:parts.map(r=>({index:r.part_index,bytes:r.bytes,sha256:r.sha256,data:Buffer.from(r.data).toString('base64')}))}}
  if(a.account_id!==actor.account_id)deny('NOT_FOUND',404);
  if(p.phase==='certify'){
   if(a.status!=='draft'){if(a.upload_id===u.id&&a.snapshot_hash===p.snapshotHash)return{attempt:dto(a)};deny('ASSESSMENT_STATE_INVALID',409)}
   version(a,p.expectedVersion);if(p.snapshotHash!==u.snapshot_hash||p.totalBytes!==u.total_bytes)deny('ASSESSMENT_BUNDLE_INVALID');
   const present=await first(env.DB,'SELECT count(*) n,COALESCE(sum(bytes),0) bytes FROM nexus_assessment_parts WHERE upload_id=?1',u.id);if(present.n!==u.chunk_count||present.bytes!==u.total_bytes)deny('ASSESSMENT_INCOMPLETE',409);
   if(p.intent==='checkpoint'){
    if(a.upload_id===u.id&&a.snapshot_hash===u.snapshot_hash)return{attempt:dto(a)};
    const time=stamp();await transaction(env,[guard(env,actor,p.requestId,'assessment-checkpoint',"EXISTS(SELECT 1 FROM nexus_assessment_attempts WHERE id=?3 AND account_id=?4 AND status='draft' AND version=?5)",[a.id,actor.account_id,a.version]),query(env.DB,'UPDATE nexus_assessment_attempts SET upload_id=?1,snapshot_hash=?2,completeness=?3,version=version+1 WHERE id=?4',u.id,u.snapshot_hash,j(p.completeness),a.id),audit(env.DB,actor,p.requestId,'assessment-checkpoint',a.id,time)]);return summary(env,a.id);
   }
   let automaticResult=null;
   if(a.assessment_mode==='automatic'){
    if(p.automatic===null)deny('ASSESSMENT_AUTOMATIC_INVALID');
    for(const[id,selected]of Object.entries(p.automatic.choices))if(p.completeness.answers[id]!==(selected!==null))deny('ASSESSMENT_AUTOMATIC_INVALID');
    for(const[id,out]of Object.entries(p.automatic.practical))if(!p.completeness.practical[id]&&Object.values(out).some(Boolean))deny('ASSESSMENT_AUTOMATIC_INVALID');
    if(!p.completeness.project&&(Object.values(p.automatic.project).some(Boolean)||Object.values(p.automatic.defense).some(Boolean)||p.automatic.codeChanged))deny('ASSESSMENT_AUTOMATIC_INVALID');
    const key=await first(env.DB,'SELECT bank_hash,answers FROM nexus_assessment_answer_keys WHERE policy=?1 AND variant=?2',AUTOMATIC_POLICY,a.variant);
    if(!key||key.bank_hash!==BANK_HASHES[a.variant])deny('ASSESSMENT_KEYS_UNAVAILABLE',503);
    try{automaticResult=calculateAutomatic(p.automatic,JSON.parse(key.answers))}catch{deny('ASSESSMENT_KEYS_UNAVAILABLE',503)}
   }else if(!expert||p.automatic!==null)deny('ASSESSMENT_UNAVAILABLE',503);
   const time=stamp(),encoded=automaticResult?j(automaticResult):null;
   await transaction(env,[guard(env,actor,p.requestId,'assessment-submit',"EXISTS(SELECT 1 FROM nexus_assessment_attempts WHERE id=?3 AND account_id=?4 AND status='draft' AND version=?5)",[a.id,actor.account_id,a.version]),query(env.DB,"UPDATE nexus_assessment_attempts SET status=?1,upload_id=?2,snapshot_hash=?3,completeness=?4,submitted_at=?5,version=version+1 WHERE id=?6",automaticResult?'assessed':'submitted',u.id,u.snapshot_hash,j(p.completeness),time,a.id),...(automaticResult?[query(env.DB,'INSERT INTO nexus_assessment_auto_results(attempt_id,account_id,snapshot_hash,result,created_at,bytes) VALUES(?1,?2,?3,?4,?5,?6)',a.id,a.account_id,u.snapshot_hash,encoded,time,Buffer.byteLength(encoded))]:[]),audit(env.DB,actor,p.requestId,'assessment-submit',a.id,time)]);return summary(env,a.id);
  }
  draft(a);if(p.index>=u.chunk_count)deny('ASSESSMENT_INPUT_INVALID');
  const bytes=Buffer.from(p.data,'base64'),expected=p.index===u.chunk_count-1?u.total_bytes-p.index*FINAL_LIMITS.chunkBytes:FINAL_LIMITS.chunkBytes;
  if(bytes.length!==expected||bytes.toString('base64')!==p.data||Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex')!==p.sha256)deny('ASSESSMENT_PART_INVALID');
  const old=await first(env.DB,'SELECT sha256,bytes FROM nexus_assessment_parts WHERE upload_id=?1 AND part_index=?2',u.id,p.index);if(old){if(old.sha256!==p.sha256||old.bytes!==bytes.length)deny('ASSESSMENT_PART_CONFLICT',409);return{ok:true,index:p.index,sha256:p.sha256}}
  await transaction(env,[guard(env,actor,p.requestId,'assessment-put',"EXISTS(SELECT 1 FROM nexus_assessment_attempts WHERE id=?3 AND account_id=?4 AND status='draft')",[a.id,actor.account_id]),query(env.DB,'INSERT OR IGNORE INTO nexus_assessment_parts(upload_id,account_id,part_index,bytes,sha256,data) VALUES(?1,?2,?3,?4,?5,?6)',u.id,actor.account_id,p.index,bytes.length,p.sha256,bytes)]);
  const stored=await first(env.DB,'SELECT sha256,bytes FROM nexus_assessment_parts WHERE upload_id=?1 AND part_index=?2',u.id,p.index);if(stored?.sha256!==p.sha256||stored.bytes!==bytes.length)deny('ASSESSMENT_PART_CONFLICT',409);return{ok:true,index:p.index,sha256:p.sha256};
 }
 if(['submit','checkpoint'].includes(p.phase))deny('ASSESSMENT_INPUT_INVALID'); // Только BFF после полной проверки bundle.
 if(p.phase==='assign'||p.phase==='interrupt'){
  await requireAdmin(env,actor,true);const a=await attempt(env,actor,p.attemptId,{admin:true});version(a,p.expectedVersion);
  if(p.phase==='assign'){
   if(a.assessment_mode!=='expert')deny('ASSESSMENT_STATE_INVALID',409);
   if(a.account_id===p.reviewerId)deny('ASSESSMENT_SELF_REVIEW',403);if(!['submitted','reviewed'].includes(a.status))deny('ASSESSMENT_STATE_INVALID',409);
   if(!await first(env.DB,"SELECT 1 ok FROM account_subjects s LEFT JOIN nexus_alpha_members m ON m.account_id=s.id WHERE s.id=?1 AND s.status='active' AND ((m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>?2)) OR EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=s.id AND g.status='active'))",p.reviewerId,stamp()))deny('NOT_FOUND',404);
  }else if(['reviewed','assessed'].includes(a.status))deny('ASSESSMENT_STATE_INVALID',409);
  const time=stamp();await transaction(env,[guard(env,actor,p.requestId,'assessment-admin','EXISTS(SELECT 1 FROM nexus_assessment_attempts WHERE id=?3 AND version=?4)',[a.id,a.version]),p.phase==='assign'?query(env.DB,'UPDATE nexus_assessment_attempts SET reviewer_id=?1,version=version+1 WHERE id=?2',p.reviewerId,a.id):query(env.DB,"UPDATE nexus_assessment_attempts SET status='interrupted',interrupt_reason=?1,version=version+1 WHERE id=?2",p.reason,a.id),audit(env.DB,actor,p.requestId,'assessment-'+p.phase,a.id,time)]);return summary(env,a.id);
 }
 if(p.phase==='review'){
  const a=await attempt(env,actor,p.attemptId);if(a.reviewer_id!==actor.account_id||a.account_id===actor.account_id)deny('ASSESSMENT_SELF_REVIEW',403);version(a,p.expectedVersion);if(p.previousReviewId!==a.latest_review_id)deny('CONTROL_CONFLICT',409);
  if(a.assessment_mode!=='expert')deny('ASSESSMENT_STATE_INVALID',409);
  const result=calculateReview(p.review),c=JSON.parse(a.completeness||'null');if(!completeness(c))deny('ASSESSMENT_STATE_INVALID',409);
  for(const[key,points]of Object.entries(p.review.exam))if(points>0&&!(key.startsWith('P')?c.practical[key]:c.answers[key]))deny('ASSESSMENT_REVIEW_INVALID');
  if(result.project>0&&!c.project||result.status==='passed'&&(!c.project||!c.practical.P4))deny('ASSESSMENT_REVIEW_INVALID');
  const id=crypto.randomUUID(),time=stamp(),rubric=j(p.review),encoded=j(result),bytes=Buffer.byteLength(rubric)+Buffer.byteLength(encoded);
  await transaction(env,[guard(env,actor,p.requestId,'assessment-review',"EXISTS(SELECT 1 FROM nexus_assessment_attempts WHERE id=?3 AND reviewer_id=?4 AND account_id<>?4 AND version=?5 AND status IN('submitted','reviewed'))",[a.id,actor.account_id,a.version]),query(env.DB,'INSERT INTO nexus_assessment_reviews(id,attempt_id,account_id,reviewer_id,previous_review_id,rubric,result,created_at,bytes) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)',id,a.id,a.account_id,actor.account_id,p.previousReviewId,rubric,encoded,time,bytes),audit(env.DB,actor,p.requestId,'assessment-review',a.id,time)]);
  return{attempt:await meta(env,a.id),review:reviewDTO(await first(env.DB,'SELECT * FROM nexus_assessment_reviews WHERE id=?1',id))};
 }
 if(p.phase==='appeal'){
  const a=await attempt(env,actor,p.attemptId,{owner:true});if(!await first(env.DB,'SELECT 1 ok FROM nexus_assessment_reviews WHERE id=?1 AND attempt_id=?2',p.reviewId,a.id))deny('NOT_FOUND',404);
  const existing=await first(env.DB,'SELECT * FROM nexus_assessment_appeals WHERE attempt_id=?1 AND review_id=?2',a.id,p.reviewId);if(existing){if(existing.text!==p.text)deny('CONTROL_CONFLICT',409);return{attempt:dto(a),appeal:appealDTO(existing)}}
  const id=crypto.randomUUID(),time=stamp();await transaction(env,[guard(env,actor,p.requestId,'assessment-appeal','EXISTS(SELECT 1 FROM nexus_assessment_attempts a JOIN nexus_assessment_reviews r ON r.attempt_id=a.id WHERE a.id=?3 AND a.account_id=?4 AND r.id=?5)',[a.id,actor.account_id,p.reviewId]),query(env.DB,'INSERT INTO nexus_assessment_appeals(id,attempt_id,account_id,review_id,text,created_at,bytes) VALUES(?1,?2,?3,?4,?5,?6,?7)',id,a.id,actor.account_id,p.reviewId,p.text,time,Buffer.byteLength(p.text)),audit(env.DB,actor,p.requestId,'assessment-appeal',a.id,time)]);return{attempt:dto(a),appeal:appealDTO(await first(env.DB,'SELECT * FROM nexus_assessment_appeals WHERE id=?1',id))};
 }
 deny('ASSESSMENT_INPUT_INVALID');
}
