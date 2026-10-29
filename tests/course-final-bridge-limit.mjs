// Максимальный6MiB checkpoint: синтетический транспорт, не оценка ученика.
// --with-bff-image добавляет реальные imports/HTTP server образа к памяти теста.
import assert from'node:assert/strict';import{createHash,randomUUID}from'node:crypto';import{writeFile,mkdir}from'node:fs/promises';import path from'node:path';
import{assessmentBridge}from'../server-access/bff/assessment.mjs';import{FINAL_LIMITS,validateSubmissionBundle}from'../course-final/contract.js';import{AUTOMATIC_PROFILE,THEORY_IDS,DEFENSE_CHECKS,DEFENSE_CHALLENGES,emptyChecks,sourceIdentity}from'../course-final/automatic-policy.js';
if(process.argv.includes('--with-bff-image'))await import('../server-access/image/bff/server.mjs');
const hash=b=>createHash('sha256').update(b).digest('hex'),owner='synthetic-max-checkpoint',attemptId=randomUUID(),uploadId=randomUUID();
const source={title:'SYNTHETIC maximum transport',manifest:{sourceRoots:['src'],includeRoots:['include'],testRoots:['tests']},workspace:{entryFile:'src/main.cpp',languageId:'cpp',files:['src/main.cpp','include/a.hpp','include/b.hpp','include/c.hpp'].map(p=>({path:p,content:'//'+('x'.repeat(259997))+'\n',languageId:'cpp'}))}};
const changed=structuredClone(source);changed.workspace.files[0].content='//y'+changed.workspace.files[0].content.slice(3);
const bundle={schemaVersion:2,assessmentId:'cpp.course-final.v1',taskVersion:'1.0.0',rubricVersion:'1.0.0',variant:'A',answers:Object.fromEntries(THEORY_IDS.map(k=>[k,{optionId:null,reflection:''}])),practical:{P1:source,P2:source,P3:source,P4:source},project:{trackId:'taskflow',source},report:'SYNTHETIC transport only; no actual C++ controls and no grade',automatic:{profile:AUTOMATIC_PROFILE,practical:{P1:null,P2:null,P3:null,P4:null},project:null,defense:{source:changed,sourceHash:hash(sourceIdentity(changed)),baselineHash:hash(sourceIdentity(source)),challengeId:DEFENSE_CHALLENGES.taskflow,checks:emptyChecks(DEFENSE_CHECKS)}}};
let gap=FINAL_LIMITS.bundleBytes-Buffer.byteLength(JSON.stringify(bundle));assert.ok(gap>0&&gap<=FINAL_LIMITS.totalAnswerChars);
for(const answer of Object.values(bundle.answers)){const n=Math.min(gap,FINAL_LIMITS.answerChars);answer.reflection='q'.repeat(n);gap-=n;}assert.equal(gap,0);validateSubmissionBundle(bundle,{variant:'A',trackId:'taskflow'});
const bytes=Buffer.from(JSON.stringify(bundle));assert.equal(bytes.length,FINAL_LIMITS.bundleBytes);const parts=Array.from({length:Math.ceil(bytes.length/32768)},(_,index)=>{const b=bytes.subarray(index*32768,(index+1)*32768);return{index,bytes:b.length,sha256:hash(b)}}),upload={id:uploadId,snapshotHash:hash(bytes),totalBytes:bytes.length,chunkCount:parts.length};
const attempt={id:attemptId,accountId:owner,mode:'automatic',variant:'A',trackId:'taskflow',ordinal:1,parentAttemptId:null,status:'draft',reviewerId:null,snapshotHash:null,uploadId:null,latestReviewId:null,createdAt:'2026-10-29T00:00:00Z',submittedAt:null,version:1,result:null,interruptReason:null};
let inflight=0,maxInflight=0,certifies=0,corrupt=false;const start=performance.now();
async function rpc(p){
 if(p.phase==='manifest')return{attempt,upload,parts};
 if(p.phase==='parts'){
  inflight++;maxInflight=Math.max(maxInflight,inflight);await new Promise(r=>setTimeout(r,40));
  try{return{uploadId,offset:p.offset,parts:parts.slice(p.offset,p.offset+5).map(row=>({...row,data:bytes.subarray(row.index*32768,(row.index+1)*32768).toString('base64'),...(corrupt&&row.index===20?{sha256:'0'.repeat(64)}:{})}))}}finally{inflight--}
 }
 assert.equal(p.phase,'certify');assert.equal(p.intent,'checkpoint');assert.equal(p.snapshotHash,upload.snapshotHash);certifies++;return{attempt:{...attempt,version:2,uploadId,snapshotHash:upload.snapshotHash}};
}
const result=await assessmentBridge({phase:'checkpoint',requestId:randomUUID(),attemptId,uploadId},rpc,{expectedAccountId:owner});const ms=Math.round(performance.now()-start);assert.equal(result.attempt.result,null);assert.equal(result.attempt.snapshotHash,upload.snapshotHash);assert.ok(maxInflight>=2&&maxInflight<=4);assert.equal(inflight,0);assert.equal(certifies,1);assert.ok(ms<12000,'Must finish within existing15s BFF timeout');
corrupt=true;await assert.rejects(assessmentBridge({phase:'checkpoint',requestId:randomUUID(),attemptId,uploadId},rpc,{expectedAccountId:owner}),e=>e.code==='ASSESSMENT_PART_INVALID');assert.equal(certifies,1,'Corrupt maximum source never reaches commit');assert.equal(inflight,0);
const proof={status:'PASS',bundleBytes:bytes.length,parts:parts.length,ms,maxInflight,sourceHashVerified:true,corruptSourceNotCommitted:true,gradeCreated:false,maxRssKiB:process.resourceUsage().maxRSS,fullBffImports:process.argv.includes('--with-bff-image'),realLearners:false,productionRequests:0};
if(process.env.NEXUS_COURSE_FINAL_EVIDENCE){await mkdir(process.env.NEXUS_COURSE_FINAL_EVIDENCE,{recursive:true});await writeFile(path.join(process.env.NEXUS_COURSE_FINAL_EVIDENCE,'BFF_MAX_BUNDLE.json'),JSON.stringify(proof,null,2)+'\n')}
console.log(JSON.stringify(proof));if(process.argv.includes('--with-bff-image'))process.exit(0);
