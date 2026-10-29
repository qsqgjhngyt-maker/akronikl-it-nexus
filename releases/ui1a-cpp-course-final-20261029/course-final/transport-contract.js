import{ASSESSMENT_ID,TASK_VERSION,RUBRIC_VERSION,FINAL_LIMITS,TRACK_IDS,calculateReview}from'./contract.js';
import{AUTOMATIC_POLICY,validAutomaticResult}from'./automatic-policy.js';
export const ASSESSMENT_PATH='/api/v2/account/control/assessment';
export const ASSESSMENT_ERROR_CODES=Object.freeze(['ASSESSMENT_UNAVAILABLE','ASSESSMENT_INPUT_INVALID','ASSESSMENT_RESPONSE_INVALID','ASSESSMENT_BUNDLE_INVALID','ASSESSMENT_BUNDLE_TOO_LARGE','ASSESSMENT_SENSITIVE_DATA','ASSESSMENT_STATE_INVALID','ASSESSMENT_INCOMPLETE','ASSESSMENT_PART_INVALID','ASSESSMENT_PART_CONFLICT','ASSESSMENT_QUOTA','ASSESSMENT_ATTEMPT_LIMIT','ASSESSMENT_UPLOAD_LIMIT','ASSESSMENT_PARENT_REQUIRED','ASSESSMENT_SELF_REVIEW','ASSESSMENT_REVIEW_INVALID','ASSESSMENT_AUTOMATIC_INVALID','ASSESSMENT_KEYS_UNAVAILABLE']);
export const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
export const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export const exact=(value,keys)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
export const accountId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const text=(v,max,min=0)=>typeof v==='string'&&v.length>=min&&v.length<=max&&!v.includes('\0');
const fail=()=>{throw Object.assign(Error('ASSESSMENT_INPUT_INVALID'),{code:'ASSESSMENT_INPUT_INVALID'})};
const layouts={capabilities:[],list:['cursor'],queue:['cursor'],unassigned:['cursor'],detail:['attemptId'],'review-detail':['attemptId','reviewId'],'appeal-detail':['attemptId','appealId'],open:['requestId','trackId','parentAttemptId'],track:['requestId','attemptId','expectedVersion','trackId'],begin:['requestId','attemptId','snapshotHash','totalBytes','chunkCount'],put:['requestId','attemptId','uploadId','index','data','sha256'],manifest:['attemptId','uploadId'],parts:['attemptId','uploadId','offset'],submit:['requestId','attemptId','uploadId'],checkpoint:['requestId','attemptId','uploadId'],withdraw:['requestId','attemptId','expectedVersion','reason'],assign:['requestId','attemptId','expectedVersion','reviewerId'],review:['requestId','attemptId','expectedVersion','previousReviewId','review'],appeal:['requestId','attemptId','reviewId','text'],interrupt:['requestId','attemptId','expectedVersion','reason']};
export function validateAssessmentRequest(value){
 if(!value||!Object.hasOwn(layouts,value.phase)||!exact(value,['phase',...layouts[value.phase]]))fail();
 for(const key of['requestId','attemptId','uploadId','reviewId','appealId'])if(Object.hasOwn(value,key)&&!uuid(value[key]))fail();
 for(const key of['cursor','parentAttemptId','previousReviewId'])if(Object.hasOwn(value,key)&&value[key]!==null&&!uuid(value[key]))fail();
 if(Object.hasOwn(value,'reviewerId')&&!accountId(value.reviewerId))fail();
 if(Object.hasOwn(value,'expectedVersion')&&!integer(value.expectedVersion,1,1000000))fail();
 if(Object.hasOwn(value,'trackId')&&!TRACK_IDS.includes(value.trackId))fail();
 if(value.phase==='begin'&&(!hash(value.snapshotHash)||!integer(value.totalBytes,1,FINAL_LIMITS.bundleBytes)||value.chunkCount!==Math.ceil(value.totalBytes/FINAL_LIMITS.chunkBytes)))fail();
 if(value.phase==='put'&&(!integer(value.index,0,191)||!hash(value.sha256)||typeof value.data!=='string'||value.data.length>43692||value.data.length%4!==0||! /^[A-Za-z0-9+/]+={0,2}$/.test(value.data)))fail();
 if(value.phase==='parts'&&!integer(value.offset,0,191))fail();
 if(value.phase==='review')calculateReview(value.review);
 if(value.phase==='appeal'&&!text(value.text,4000,1))fail();
 if(['interrupt','withdraw'].includes(value.phase)&&!text(value.reason,1000,1))fail();
 return value;
}
function result(value){
 return value===null||validAutomaticResult(value)||exact(value,['exam','project','defense','weighted','status','policyVersion','empiricallyValidated'])&&[value.exam,value.project,value.defense,value.weighted].every(n=>Number.isFinite(n)&&n>=0&&n<=100)&&['passed','requires-revision'].includes(value.status)&&value.policyVersion==='pilot-40-50-10-v1'&&value.empiricallyValidated===false;
}
export function validAttempt(a){
 return exact(a,['id','accountId','mode','variant','trackId','ordinal','parentAttemptId','status','reviewerId','snapshotHash','uploadId','latestReviewId','createdAt','submittedAt','version','result','interruptReason'])&&uuid(a.id)&&accountId(a.accountId)&&['automatic','expert'].includes(a.mode)&&['A','B','C'].includes(a.variant)&&TRACK_IDS.includes(a.trackId)&&integer(a.ordinal,1,1000)&&(a.parentAttemptId===null||uuid(a.parentAttemptId))&&['draft','submitted','reviewed','assessed','interrupted'].includes(a.status)&&(a.reviewerId===null||accountId(a.reviewerId))&&(a.snapshotHash===null||hash(a.snapshotHash))&&(a.uploadId===null||uuid(a.uploadId))&&(a.latestReviewId===null||uuid(a.latestReviewId))&&text(a.createdAt,64,1)&&(a.submittedAt===null||text(a.submittedAt,64,1))&&integer(a.version,1,1000000)&&result(a.result)&&(a.mode!=='automatic'||a.reviewerId===null&&a.latestReviewId===null&&(a.result===null||validAutomaticResult(a.result)))&&(a.status!=='assessed'||a.mode==='automatic'&&a.result!==null)&&(a.interruptReason===null||text(a.interruptReason,1000));
}
function upload(u){return exact(u,['id','snapshotHash','totalBytes','chunkCount'])&&uuid(u.id)&&hash(u.snapshotHash)&&integer(u.totalBytes,1,FINAL_LIMITS.bundleBytes)&&u.chunkCount===Math.ceil(u.totalBytes/FINAL_LIMITS.chunkBytes)}
function review(r){if(r===null)return true;if(!exact(r,['id','attemptId','reviewerId','previousReviewId','rubric','result','createdAt'])||!uuid(r.id)||!uuid(r.attemptId)||!accountId(r.reviewerId)||r.previousReviewId!==null&&!uuid(r.previousReviewId)||!text(r.createdAt,64,1))return false;try{return JSON.stringify(calculateReview(r.rubric))===JSON.stringify(r.result)}catch{return false}}
const appeal=a=>a===null||exact(a,['id','attemptId','reviewId','text','createdAt'])&&uuid(a.id)&&uuid(a.attemptId)&&uuid(a.reviewId)&&text(a.text,4000,1)&&text(a.createdAt,64,1);
export function validateAssessmentDTO(data,phase,expected){
 let valid=false;
 if(phase==='capabilities')valid=exact(data,['enabled','assessmentId','taskVersion','rubricVersion','canAssign','canReview','limits','policy','mode'])&&typeof data.enabled==='boolean'&&data.assessmentId===ASSESSMENT_ID&&data.taskVersion===TASK_VERSION&&data.rubricVersion===RUBRIC_VERSION&&typeof data.canAssign==='boolean'&&typeof data.canReview==='boolean'&&JSON.stringify(data.limits)===JSON.stringify(FINAL_LIMITS)&&['automatic','expert'].includes(data.mode)&&data.policy===(data.mode==='automatic'?AUTOMATIC_POLICY:'pilot-40-50-10-v1')&&(data.mode!=='automatic'||!data.canAssign&&!data.canReview);
 else if(['list','queue','unassigned'].includes(phase))valid=exact(data,['items','nextCursor'])&&Array.isArray(data.items)&&data.items.length<=25&&data.items.every(validAttempt)&&(data.nextCursor===null||uuid(data.nextCursor))&&(phase!=='list'||data.items.every(a=>a.accountId===expected))&&(phase!=='queue'||data.items.every(a=>a.reviewerId===expected));
 else if(phase==='detail')valid=exact(data,['attempt','review','history','appeals','latestAppeal'])&&validAttempt(data.attempt)&&review(data.review)&&Array.isArray(data.history)&&data.history.length<=16&&data.history.every(r=>exact(r,['id','createdAt','result'])&&uuid(r.id)&&text(r.createdAt,64,1)&&result(r.result))&&Array.isArray(data.appeals)&&data.appeals.length<=16&&data.appeals.every(a=>exact(a,['id','reviewId','createdAt'])&&uuid(a.id)&&uuid(a.reviewId)&&text(a.createdAt,64,1))&&appeal(data.latestAppeal);
 else if(phase==='review-detail')valid=exact(data,['review'])&&review(data.review);
 else if(phase==='appeal-detail')valid=exact(data,['appeal'])&&appeal(data.appeal);
 else if(['open','track','submit','checkpoint','withdraw','assign','interrupt'].includes(phase))valid=exact(data,['attempt'])&&validAttempt(data.attempt);
 else if(phase==='review')valid=exact(data,['attempt','review'])&&validAttempt(data.attempt)&&review(data.review);
 else if(phase==='appeal')valid=exact(data,['attempt','appeal'])&&validAttempt(data.attempt)&&appeal(data.appeal);
 else if(phase==='begin')valid=exact(data,['attempt','upload'])&&validAttempt(data.attempt)&&upload(data.upload);
 else if(phase==='put')valid=exact(data,['ok','index','sha256'])&&data.ok===true&&integer(data.index,0,191)&&hash(data.sha256);
 else if(phase==='manifest')valid=exact(data,['attempt','upload','parts'])&&validAttempt(data.attempt)&&upload(data.upload)&&Array.isArray(data.parts)&&data.parts.length<=192&&data.parts.every(r=>exact(r,['index','bytes','sha256'])&&integer(r.index,0,data.upload.chunkCount-1)&&integer(r.bytes,1,32768)&&hash(r.sha256));
 else if(phase==='parts')valid=exact(data,['uploadId','offset','parts'])&&uuid(data.uploadId)&&integer(data.offset,0,191)&&Array.isArray(data.parts)&&data.parts.length<=5&&data.parts.every(r=>exact(r,['index','bytes','sha256','data'])&&integer(r.index,0,191)&&integer(r.bytes,1,32768)&&hash(r.sha256)&&typeof r.data==='string'&&r.data.length<=43692&&/^[A-Za-z0-9+/]+={0,2}$/.test(r.data));
 if(!valid)throw Object.assign(Error('ASSESSMENT_RESPONSE_INVALID'),{code:'ASSESSMENT_RESPONSE_INVALID'});return data;
}
