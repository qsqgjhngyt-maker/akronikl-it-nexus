// Real private-candidate transport smoke. Options/start are explicitly NOT full login.
import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {AUTH_ORIGIN,validateAuthCandidate,authEvidenceHash} from './publication-auth-gate.mjs';
import {yc,need,readAuthTestTarget} from './publication-auth-cloud.mjs';
export async function checkPublicationAuthLive(plan){
 const candidateId=validateAuthCandidate(plan.candidate);need(authEvidenceHash(await readAuthTestTarget(plan))===authEvidenceHash(plan.candidate.testTarget),'CANDIDATE_CHANGED');
 const token=yc(['iam','create-token'],{raw:true}),checks=[];
 for(const [method,path,body,status]of [
  ['passkey','/api/v2/account/passkey/authenticate/options',{},200],
  ['yandex','/api/v2/account/oauth/yandex/start',{intent:'login'},200],
  ['google','/api/v2/account/oauth/google/start',{intent:'login'},200],
  ['content','/api/v2/content/feed',undefined,200],['anonymous','/api/v2/account',undefined,401]
 ]){
  const start=performance.now(),headers={authorization:'Bearer '+token,origin:AUTH_ORIGIN,accept:'application/json'};
  if(body){headers['content-type']='application/json';headers[method==='passkey'?'x-nexus-passkey-write':'x-nexus-oauth-request']='1';}
  const r=await fetch(plan.url+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(35000)});
  need(r.headers.get('x-nexus-auth-candidate')===plan.candidate.imageDigest,'CANDIDATE_RESPONSE_REQUIRED');const data=await r.json();let valid=r.status===status;
  if(method==='passkey')valid&&=typeof data.options?.challenge==='string'&&data.options.userVerification==='required'&&r.headers.getSetCookie().some(v=>v.startsWith('__Host-nexus_passkey_flow='));
  if(method==='google'||method==='yandex'){let u;try{u=new URL(data.authorizationURL)}catch{}valid&&=u?.hostname===(method==='google'?'accounts.google.com':'oauth.yandex.ru')&&r.headers.getSetCookie().some(v=>v.startsWith('__Host-nexus_oauth_flow='));}
  if(method==='anonymous')valid&&=data.error?.code==='SESSION_REQUIRED';
  checks.push({method,status:r.status,valid:Boolean(valid),ms:Math.round(performance.now()-start)});need(valid,'LIVE_PREPARATION_'+method.toUpperCase()+'_FAILED');
 }
 need(authEvidenceHash(await readAuthTestTarget(plan))===authEvidenceHash(plan.candidate.testTarget),'CANDIDATE_CHANGED');
 // Timing remains separate from the strict receipt schema.
 return {receipt:{schema:1,kind:'live-auth-preparation',candidateId,testTarget:plan.candidate.testTarget,checkedAt:new Date().toISOString(),status:'LIVE_PREPARATION_PASS_NOT_FULL_LOGIN',checks:checks.map(({ms,...c})=>c)},measurements:checks};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const plan=JSON.parse(await readFile(process.argv[2],'utf8')),proof=await checkPublicationAuthLive(plan);await writeFile(process.argv[3],JSON.stringify(proof.receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:proof.receipt.status,measurements:proof.measurements}));}
 catch(e){const code=/^[A-Z0-9_]+$/.test(e.message)?e.message:'LIVE_PREPARATION_FAILED';if(process.argv[3])await writeFile(process.argv[3]+'.FAIL.'+Date.now()+'.json',JSON.stringify({status:'FAIL',code,at:new Date().toISOString()})+'\n',{flag:'wx'}).catch(()=>{});console.error(code);process.exitCode=1;}
}
