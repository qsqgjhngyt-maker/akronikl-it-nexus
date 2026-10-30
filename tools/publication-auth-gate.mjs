import {createHash} from 'node:crypto';import {readFile} from 'node:fs/promises';
export const AUTH_ORIGIN='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
export const AUTH_METHODS=Object.freeze(['passkey','yandex','google']);
export const AUTH_MAX_AGE_MS=30*60*1000;
const hash=/^[a-f0-9]{64}$/,image=/^sha256:[a-f0-9]{64}$/,commit=/^[a-f0-9]{40}$/;
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const authEvidenceHash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function need(value,code){if(!value)throw Object.assign(Error(code),{code});}
function exact(value,keys){need(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(','),'AUTH_EVIDENCE_SHAPE');}
function fresh(value,now){const time=Date.parse(value);need(typeof value==='string'&&Number.isFinite(time)&&time<=now+30000&&now-time<=AUTH_MAX_AGE_MS,'AUTH_EVIDENCE_EXPIRED');return time;}
export function validateAuthCandidate(c){
 exact(c,['schema','kind','origin','sourceCommit','imageDigest','frontendManifestSha256','authArtifactSha256','baseline','testTarget']);
 need(c.schema===1&&c.kind==='nexus-publication-candidate'&&c.origin===AUTH_ORIGIN&&commit.test(c.sourceCommit)&&image.test(c.imageDigest)&&hash.test(c.frontendManifestSha256)&&hash.test(c.authArtifactSha256),'AUTH_CANDIDATE_INVALID');
 exact(c.baseline,['revisionId','imageDigest']);need(typeof c.baseline.revisionId==='string'&&/^[a-z0-9-]{8,80}$/.test(c.baseline.revisionId)&&image.test(c.baseline.imageDigest),'AUTH_BASELINE_INVALID');
 exact(c.testTarget,['containerId','revisionId','imageDigest','authArtifactSha256']);need(/^[a-z0-9-]{8,80}$/.test(c.testTarget.containerId)&&/^[a-z0-9-]{8,80}$/.test(c.testTarget.revisionId),'AUTH_TEST_TARGET_INVALID');
 need(c.testTarget.imageDigest===c.imageDigest&&c.testTarget.authArtifactSha256===c.authArtifactSha256,'AUTH_CANDIDATE_CANARY_REQUIRED');
 return authEvidenceHash(c);
}
export function assertPublicationAuth({candidate,live,logins,startup,expected,now=Date.now()}){
 const candidateId=validateAuthCandidate(candidate);
 need(expected&&commit.test(expected.sourceCommit)&&image.test(expected.imageDigest)&&hash.test(expected.frontendManifestSha256)&&hash.test(expected.authArtifactSha256),'AUTH_PUBLICATION_EXPECTED_BINDING_REQUIRED');
 for(const key of ['sourceCommit','imageDigest','frontendManifestSha256','authArtifactSha256'])need(candidate[key]===expected[key],'AUTH_PUBLICATION_ARTIFACT_MISMATCH');
 exact(startup,['schema','kind','candidateId','imageDigest','checkedAt','status']);need(startup.schema===1&&startup.kind==='exact-image-startup'&&startup.candidateId===candidateId&&startup.imageDigest===candidate.imageDigest&&startup.status==='STARTUP_PASS_NOT_LOGIN','AUTH_STARTUP_REQUIRED');fresh(startup.checkedAt,now);
 exact(live,['schema','kind','candidateId','testTarget','checkedAt','status','checks']);need(live.schema===1&&live.kind==='live-auth-preparation'&&live.candidateId===candidateId&&live.status==='LIVE_PREPARATION_PASS_NOT_FULL_LOGIN'&&authEvidenceHash(live.testTarget)===authEvidenceHash(candidate.testTarget),'AUTH_LIVE_PREPARATION_REQUIRED');fresh(live.checkedAt,now);
 need(Array.isArray(live.checks)&&live.checks.length===5,'AUTH_LIVE_PREPARATION_REQUIRED');
 for(const [method,status]of [['passkey',200],['yandex',200],['google',200],['content',200],['anonymous',401]])need(live.checks.filter(c=>c.method===method&&c.status===status&&c.valid===true).length===1,'AUTH_LIVE_PREPARATION_FAILED');
 exact(logins,['schema','kind','candidateId','testTarget','checkedAt','checks']);need(logins.schema===1&&logins.kind==='observed-real-browser-logins'&&logins.candidateId===candidateId&&authEvidenceHash(logins.testTarget)===authEvidenceHash(candidate.testTarget),'AUTH_FULL_LOGIN_REQUIRED');fresh(logins.checkedAt,now);
 need(Array.isArray(logins.checks)&&logins.checks.length===3,'AUTH_ALL_THREE_LOGINS_REQUIRED');let account;
 for(const method of AUTH_METHODS){
  const selected=logins.checks.filter(c=>c.method===method);need(selected.length===1,'AUTH_ALL_THREE_LOGINS_REQUIRED');const c=selected[0];
  exact(c,['method','status','startedAt','finishedAt','initialAccountStatus','verifyStatus','providerVisited','callbackStatus','accountStatus','reloadAccountStatus','logoutAccountStatus','accountBinding','simulated']);
  need(c.status==='LIVE_FULL_LOGIN_PASS'&&c.simulated===false&&c.initialAccountStatus===401&&c.accountStatus===200&&c.reloadAccountStatus===200&&c.logoutAccountStatus===401&&hash.test(c.accountBinding),'AUTH_FULL_LOGIN_REQUIRED');
  const start=fresh(c.startedAt,now),end=fresh(c.finishedAt,now);need(end>=start,'AUTH_FLOW_TIME_INVALID');
  if(method==='passkey')need(c.verifyStatus===200&&c.providerVisited===false&&c.callbackStatus===null,'AUTH_PASSKEY_ASSERTION_REQUIRED');
  else need(c.verifyStatus===null&&c.providerVisited===true&&c.callbackStatus===303,'AUTH_REAL_PROVIDER_CALLBACK_REQUIRED');
  account??=c.accountBinding;need(c.accountBinding===account,'AUTH_ACCOUNT_MISMATCH');
 }
 return Object.freeze({status:'PUBLICATION_AUTH_PASS',candidateId,sourceCommit:candidate.sourceCommit,imageDigest:candidate.imageDigest,expiresAt:new Date(Math.min(...[live.checkedAt,logins.checkedAt,startup.checkedAt,...logins.checks.map(c=>c.startedAt)].map(Date.parse))+AUTH_MAX_AGE_MS).toISOString(),scope:'exact-candidate-private-canary-with-real-provider-logins'});
}
export async function requirePublicationAuth({expected,readTestTarget,candidateFile=process.env.NEXUS_AUTH_CANDIDATE,liveFile=process.env.NEXUS_AUTH_LIVE_RECEIPT,loginFile=process.env.NEXUS_AUTH_LOGIN_RECEIPT,startupFile=process.env.NEXUS_AUTH_STARTUP_RECEIPT,now}={}){
 need(expected&&commit.test(expected.sourceCommit)&&image.test(expected.imageDigest)&&hash.test(expected.frontendManifestSha256)&&hash.test(expected.authArtifactSha256),'AUTH_PUBLICATION_EXPECTED_BINDING_REQUIRED');
 need(typeof readTestTarget==='function','AUTH_CLOUD_READBACK_REQUIRED');
 need(candidateFile&&liveFile&&loginFile&&startupFile,'AUTH_PUBLICATION_RECEIPTS_REQUIRED');const read=async p=>JSON.parse(await readFile(p,'utf8'));
 const [candidate,live,logins,startup]=await Promise.all([candidateFile,liveFile,loginFile,startupFile].map(read));const proof=assertPublicationAuth({candidate,live,logins,startup,expected,now});
 const actual=await readTestTarget(candidate.testTarget);need(authEvidenceHash(actual)===authEvidenceHash(candidate.testTarget),'AUTH_TEST_DEPLOYMENT_CHANGED');
 // Network readback can consume the remaining lifetime. Re-evaluate at the boundary.
 return assertPublicationAuth({candidate,live,logins,startup,expected,now:now??Date.now()});
}
export async function withPublicationAuth(options,operation){const proof=await requirePublicationAuth(options);return operation(proof);}
