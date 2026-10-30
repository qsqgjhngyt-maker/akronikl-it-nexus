import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {AUTH_ORIGIN,AUTH_METHODS,authEvidenceHash,assertPublicationAuth,withPublicationAuth} from '../tools/publication-auth-gate.mjs';
const now=Date.parse('2026-10-30T12:00:00Z'),at=new Date(now).toISOString(),digest='sha256:'+'a'.repeat(64);
function fixture(){
 const candidate={schema:1,kind:'nexus-publication-candidate',origin:AUTH_ORIGIN,sourceCommit:'b'.repeat(40),imageDigest:digest,frontendManifestSha256:'c'.repeat(64),authArtifactSha256:'d'.repeat(64),baseline:{revisionId:'baseline0001',imageDigest:'sha256:'+'e'.repeat(64)},testTarget:{containerId:'canary0001',revisionId:'revision0001',imageDigest:digest,authArtifactSha256:'d'.repeat(64)}};
 const candidateId=authEvidenceHash(candidate),expected=Object.fromEntries(['sourceCommit','imageDigest','frontendManifestSha256','authArtifactSha256'].map(k=>[k,candidate[k]]));
 return {candidate,expected,now,startup:{schema:1,kind:'exact-image-startup',candidateId,imageDigest:digest,checkedAt:at,status:'STARTUP_PASS_NOT_LOGIN'},live:{schema:1,kind:'live-auth-preparation',candidateId,testTarget:candidate.testTarget,checkedAt:at,status:'LIVE_PREPARATION_PASS_NOT_FULL_LOGIN',checks:[...AUTH_METHODS,'content','anonymous'].map(method=>({method,status:method==='anonymous'?401:200,valid:true}))},logins:{schema:1,kind:'observed-real-browser-logins',candidateId,testTarget:candidate.testTarget,checkedAt:at,checks:AUTH_METHODS.map(method=>({method,status:'LIVE_FULL_LOGIN_PASS',startedAt:at,finishedAt:at,initialAccountStatus:401,verifyStatus:method==='passkey'?200:null,providerVisited:method!=='passkey',callbackStatus:method==='passkey'?null:303,accountStatus:200,reloadAccountStatus:200,logoutAccountStatus:401,accountBinding:'f'.repeat(64),simulated:false}))}};
}
test('exact candidate and all three completed flows qualify',()=>assert.equal(assertPublicationAuth(fixture()).status,'PUBLICATION_AUTH_PASS'));
for(const [name,mutate]of [
 ['missing Google',v=>v.logins.checks.pop()],['duplicate method',v=>v.logins.checks[2].method='yandex'],
 ['start-only smoke',v=>v.logins.kind='live-auth-preparation'],['synthetic assertion',v=>v.logins.checks[0].simulated=true],
 ['OAuth302 is not success303',v=>v.logins.checks[1].callbackStatus=302],['provider not visited',v=>v.logins.checks[2].providerVisited=false],
 ['wrong account',v=>v.logins.checks[1].accountBinding='0'.repeat(64)],['reload unauthenticated',v=>v.logins.checks[0].reloadAccountStatus=401],
 ['session not logged out',v=>v.logins.checks[0].logoutAccountStatus=200],['expired',v=>v.now+=1800001],
 ['future timestamp',v=>v.startup.checkedAt=new Date(now+31000).toISOString()],['wrong image',v=>v.expected.imageDigest='sha256:'+'0'.repeat(64)],
 ['wrong auth artifact',v=>v.expected.authArtifactSha256='0'.repeat(64)],['missing expected readback',v=>delete v.expected],
 ['unbound receipt',v=>v.live.candidateId='0'.repeat(64)],['old production used as canary',v=>v.candidate.testTarget.imageDigest=v.candidate.baseline.imageDigest],
 ['failed preparation',v=>v.live.checks[0].status=502],['inverted flow time',v=>v.logins.checks[0].finishedAt=new Date(now-1000).toISOString()]
])test('publication blocked: '+name,()=>{const value=fixture();mutate(value);assert.throws(()=>assertPublicationAuth(value));});
test('no mutation if receipts absent or cloud target has drifted',async()=>{
 const v=fixture(),dir=await mkdtemp(path.join(tmpdir(),'nexus-auth-gate-'));let calls=0;
 try{
  const files={};for(const [key,name]of [['candidate','candidateFile'],['live','liveFile'],['logins','loginFile'],['startup','startupFile']]){files[name]=path.join(dir,key+'.json');await writeFile(files[name],JSON.stringify(v[key]));}
  const opts={...files,expected:v.expected,now,readTestTarget:async()=>({...v.candidate.testTarget,revisionId:'changed0001'})};
  await assert.rejects(withPublicationAuth(opts,()=>calls++),/AUTH_TEST_DEPLOYMENT_CHANGED/);assert.equal(calls,0);
  await assert.rejects(withPublicationAuth({...opts,loginFile:undefined},()=>calls++),/AUTH_PUBLICATION_RECEIPTS_REQUIRED/);assert.equal(calls,0);
  await assert.rejects(withPublicationAuth({...opts,readTestTarget:undefined},()=>calls++),/AUTH_CLOUD_READBACK_REQUIRED/);assert.equal(calls,0);
  await withPublicationAuth({...opts,readTestTarget:async()=>v.candidate.testTarget},()=>calls++);assert.equal(calls,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('readback cannot extend a nearly expired receipt',async()=>{
 const v=fixture(),dir=await mkdtemp(path.join(tmpdir(),'nexus-auth-expiry-')),original=Date.now;let clock=now,calls=0;
 try{
  Date.now=()=>clock;const files={};for(const [key,name]of [['candidate','candidateFile'],['live','liveFile'],['logins','loginFile'],['startup','startupFile']]){files[name]=path.join(dir,key+'.json');await writeFile(files[name],JSON.stringify(v[key]));}
  await assert.rejects(withPublicationAuth({...files,expected:v.expected,readTestTarget:async()=>{clock+=1800001;return v.candidate.testTarget;}},()=>calls++),/AUTH_EVIDENCE_EXPIRED/);assert.equal(calls,0);
 }finally{Date.now=original;await rm(dir,{recursive:true,force:true});}
});
