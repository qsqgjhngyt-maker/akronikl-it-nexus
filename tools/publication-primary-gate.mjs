// Explicit owner-authorized alternative: real logins on the primary address,
// corroborated by issuance receipts. Never relabelled as candidate/browser observation.
import {readFile} from 'node:fs/promises';
import {AUTH_ORIGIN,authEvidenceHash} from './publication-auth-gate.mjs';
import {createHash} from 'node:crypto';
const hash=/^[a-f0-9]{64}$/,digest=/^sha256:[a-f0-9]{64}$/;
const need=(ok,code)=>{if(!ok)throw Error(code);};
export function assertPrimaryPublication({plan,logins,startup,compatibility,registry,expected,current,now=Date.now()}){
 need(plan?.schema===1&&plan.kind==='primary-origin-admin-rollout'&&plan.origin===AUTH_ORIGIN&&plan.noPrivateStand===true,'PRIMARY_PLAN_REQUIRED');
 need(/^[a-f0-9]{40}$/.test(expected?.sourceCommit)&&digest.test(expected.imageDigest)&&hash.test(expected.frontendManifestSha256),'PRIMARY_BINDING_REQUIRED');
 for(const key of ['sourceCommit','imageDigest','frontendManifestSha256'])need(plan.candidate?.[key]===expected[key],'PRIMARY_ARTIFACT_MISMATCH');
 need(logins?.kind==='owner-and-server-primary-logins'&&logins.origin===AUTH_ORIGIN&&logins.ownerReportedAllThree===true&&logins.reloadAndLogoutReportedByOwner===true&&logins.browserAutomationUsed===false,'PRIMARY_REAL_LOGIN_EVIDENCE_REQUIRED');
 const checked=Date.parse(logins.checkedAt);need(Number.isFinite(checked)&&checked<=now+30000&&now-checked<=3600000,'PRIMARY_LOGIN_EVIDENCE_EXPIRED');
 need(Array.isArray(logins.checks)&&logins.checks.length===3,'PRIMARY_ALL_THREE_REQUIRED');let account;
 for(const method of ['passkey','yandex','google']){
  const items=logins.checks.filter(c=>c.method===method);need(items.length===1,'PRIMARY_ALL_THREE_REQUIRED');const c=items[0],stamp=Date.parse(c.createdAt),revoked=Date.parse(c.revokedAt);
  need(c.serverReceiptVerified===true&&c.loggedOut===true&&c.ownerAccount===true&&hash.test(c.accountBinding)&&Number.isFinite(stamp)&&Number.isFinite(revoked)&&revoked>=stamp&&stamp<=now+30000&&now-stamp<=3600000,'PRIMARY_SERVER_LOGIN_REQUIRED');
  account??=c.accountBinding;need(c.accountBinding===account,'PRIMARY_ACCOUNT_MISMATCH');
 }
 need(startup?.status==='EXACT_ADMIN_IMAGE_SMOKE_PASS'&&startup.imageId===plan.candidate.imageId&&startup.frontendManifestSha256===expected.frontendManifestSha256&&startup.authBootstrapUnchanged===true,'PRIMARY_EXACT_IMAGE_REQUIRED');
 need(digest.test(startup.imageConfigDigest)&&startup.imageConfigDigest===plan.candidate.imageConfigDigest&&registry?.configDigest===startup.imageConfigDigest&&registry.manifestDigest===expected.imageDigest,'PRIMARY_REGISTRY_IMAGE_MISMATCH');
 need(compatibility?.status==='ADMIN_TRANSITION_COMPATIBILITY_PASS'&&compatibility.legacyDto===true&&compatibility.signedModernDto===true&&compatibility.deadlineEnforcementRetained===true&&compatibility.rollbackFrontendWithDeadlineWorker===true,'PRIMARY_COMPATIBILITY_REQUIRED');
 need(current&&current.containerId==='bba1ob4dfr7med7i3ntu'&&current.gatewayId==='d5d8d3c2d1uhct6fmvle','PRIMARY_TARGET_REQUIRED');
 for(const key of ['imageDigest','gatewayFingerprint','workerSha256','schemaSha256'])need(Array.isArray(plan.allowed?.[key])&&plan.allowed[key].includes(current[key]),'PRIMARY_SURFACE_DRIFT_'+key.toUpperCase());
 need(current.workerSettingsSha256===plan.workerSettingsSha256&&current.main===plan.main,'PRIMARY_SETTINGS_OR_MAIN_DRIFT');
 return {status:'PRIMARY_ORIGIN_PUBLICATION_PASS',scope:'owner-performed-primary-logins-and-server-receipts; exact candidate local checks',candidateId:authEvidenceHash(plan.candidate),sourceCommit:expected.sourceCommit};
}
export async function withPrimaryPublicationAuth({planFile,expected,readCurrentSurface},operation){
 const plan=JSON.parse(await readFile(planFile,'utf8'));
 const [logins,startup,compatibility]=await Promise.all([plan.loginFile,plan.startupFile,plan.compatibilityFile].map(async p=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,''))));
 const raw=await readFile(plan.registryManifestFile),manifest=JSON.parse(raw),registry={manifestDigest:'sha256:'+createHash('sha256').update(raw).digest('hex'),configDigest:manifest.config?.digest};
 const current=await readCurrentSurface();const proof=assertPrimaryPublication({plan,logins,startup,compatibility,registry,expected,current});
 return operation(proof);
}
