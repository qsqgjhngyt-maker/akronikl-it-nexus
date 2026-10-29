import{validateProjectWorkspace}from'../project-studio/project-transfer.js';
import{THEORY_IDS,validateAutomaticEvidence}from'./automatic-policy.js';
export const ASSESSMENT_ID='cpp.course-final.v1',TASK_VERSION='1.0.0',RUBRIC_VERSION='1.0.0';
export const FINAL_LIMITS=Object.freeze({chunkBytes:32768,bundleBytes:6*1024*1024,uploadsPerAttempt:8,answerChars:12000,totalAnswerChars:64000,reportChars:16000,ownerBytes:24*1024*1024,globalBytes:128*1024*1024});
export const PROJECT_RUBRIC=Object.freeze({correctness:30,tests:20,resources:15,design:15,algorithms:10,reproducibility:10});
export const DEFENSE_RUBRIC=Object.freeze({model:30,diagnosis:25,controlChange:30,tradeoffs:15});
export const QUESTION_MAX=Object.freeze(Object.fromEntries([...Array.from({length:12},(_,i)=>['C'+String(i+1).padStart(2,'0'),2]),...Array.from({length:8},(_,i)=>['D'+String(i+1).padStart(2,'0'),2]),...Array.from({length:4},(_,i)=>['P'+(i+1),15])]));
export const TRACK_IDS=Object.freeze(['taskflow','finance','logscope']);
const fail=code=>{throw Object.assign(Error(code),{code})},exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const text=(x,max,min=0)=>typeof x==='string'&&x.length>=min&&x.length<=max&&!x.includes('\0');
export function submissionProject(value){
 if(!exact(value,['title','workspace','manifest'])||!text(value.title,120,1)||!exact(value.manifest,['sourceRoots','includeRoots','testRoots']))fail('ASSESSMENT_BUNDLE_INVALID');
 const workspace=validateProjectWorkspace(value.workspace);for(const roots of Object.values(value.manifest))if(!Array.isArray(roots)||roots.length>64||roots.some(p=>typeof p!=='string'||!p||p.split('/').some(x=>['','..','__proto__','constructor','prototype'].includes(x))||/^[\\/]|[\\\0-\x1f:]/.test(p)))fail('ASSESSMENT_BUNDLE_INVALID');
 return{title:value.title,workspace,manifest:value.manifest};
}
export function validateSubmissionBundle(bundle,{variant,trackId,mode='automatic'}){
 const automatic=mode==='automatic';if(!automatic&&mode!=='expert')fail('ASSESSMENT_BUNDLE_INVALID');
 if(!exact(bundle,['schemaVersion','assessmentId','taskVersion','rubricVersion','variant','answers','practical','project','report',...(automatic?['automatic']:[])])||bundle.schemaVersion!==(automatic?2:1)||bundle.assessmentId!==ASSESSMENT_ID||bundle.taskVersion!==TASK_VERSION||bundle.rubricVersion!==RUBRIC_VERSION||bundle.variant!==variant||!['A','B','C'].includes(variant)||!TRACK_IDS.includes(trackId)||!text(bundle.report,FINAL_LIMITS.reportChars))fail('ASSESSMENT_BUNDLE_INVALID');
 const keys=Object.keys(QUESTION_MAX).filter(id=>!id.startsWith('P'));if(!exact(bundle.answers,keys))fail('ASSESSMENT_BUNDLE_INVALID');let chars=0;
 for(const answer of Object.values(bundle.answers)){
  const reflection=automatic?answer?.reflection:answer;
  if(automatic&&(!exact(answer,['optionId','reflection'])||answer.optionId!==null&&!['o1','o2','o3','o4'].includes(answer.optionId)))fail('ASSESSMENT_BUNDLE_INVALID');
  if(!text(reflection,FINAL_LIMITS.answerChars)||(chars+=reflection.length)>FINAL_LIMITS.totalAnswerChars)fail('ASSESSMENT_BUNDLE_INVALID');
 }
 if(!exact(bundle.practical,['P1','P2','P3','P4'])||!exact(bundle.project,['trackId','source'])||bundle.project.trackId!==trackId)fail('ASSESSMENT_BUNDLE_INVALID');
 for(const p of Object.values(bundle.practical))if(p!==null)submissionProject(p);if(bundle.project.source!==null)submissionProject(bundle.project.source);
 if(automatic){if(!exact(bundle.answers,THEORY_IDS))fail('ASSESSMENT_BUNDLE_INVALID');validateAutomaticEvidence(bundle.automatic,{trackId,validateSource:submissionProject});for(const key of Object.keys(bundle.practical))if(bundle.automatic.practical[key]!==null&&bundle.practical[key]===null)fail('ASSESSMENT_BUNDLE_INVALID');if(bundle.automatic.project!==null&&bundle.project.source===null||bundle.automatic.defense!==null&&bundle.project.source===null)fail('ASSESSMENT_BUNDLE_INVALID')}
 const serialized=JSON.stringify(bundle);if(new TextEncoder().encode(serialized).length>FINAL_LIMITS.bundleBytes)fail('ASSESSMENT_BUNDLE_TOO_LARGE');
 // Не выводим найденное значение. Не допускаем случайную сдачу credentials как source.
 if(/(?:nxs_|nxk_)[A-Za-z0-9_-]{24,256}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(serialized))fail('ASSESSMENT_SENSITIVE_DATA');
 return bundle;
}
function scoreGroup(value,maxima){
 if(!exact(value,Object.keys(maxima)))fail('ASSESSMENT_REVIEW_INVALID');let total=0;
 for(const[key,max]of Object.entries(maxima)){const n=value[key];if(!Number.isFinite(n)||n<0||n>max||!Number.isInteger(n*2))fail('ASSESSMENT_REVIEW_INVALID');total+=n}return total;
}
export function calculateReview(value){
 if(!exact(value,['exam','project','defense','feedback','defenseMode','defenseEvidence','guiObserved','authorshipVerified','controlChangeVerified','blockingReasons'])||!text(value.feedback,12000,20)||!text(value.defenseEvidence,4000,20)||!['live','written'].includes(value.defenseMode)||['guiObserved','authorshipVerified','controlChangeVerified'].some(k=>typeof value[k]!=='boolean')||!Array.isArray(value.blockingReasons)||value.blockingReasons.length>8||value.blockingReasons.some(s=>!text(s,1000,1)))fail('ASSESSMENT_REVIEW_INVALID');
 const exam=scoreGroup(value.exam,QUESTION_MAX),project=scoreGroup(value.project,PROJECT_RUBRIC),defense=scoreGroup(value.defense,DEFENSE_RUBRIC);
 const weighted=Math.round((0.4*exam+0.5*project+0.1*defense)*100)/100;
 const passed=exam>=60&&project>=60&&defense>=60&&value.guiObserved&&value.authorshipVerified&&value.controlChangeVerified&&value.blockingReasons.length===0;
 return{exam,project,defense,weighted,status:passed?'passed':'requires-revision',policyVersion:'pilot-40-50-10-v1',empiricallyValidated:false};
}
