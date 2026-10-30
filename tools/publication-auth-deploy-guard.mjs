import {readFile} from 'node:fs/promises';
import {withPublicationAuth,authEvidenceHash} from './publication-auth-gate.mjs';
import {need,readAuthTestTarget} from './publication-auth-cloud.mjs';
// Every production-forward mutation uses this boundary. There is no skip switch.
// Emergency rollback uses a separate, pinned ownership/configuration check.
export async function guardPublicationMutation(expected,operation){
 need(process.env.NEXUS_AUTH_PLAN,'AUTH_PRIVATE_CANARY_PLAN_REQUIRED');
 const plan=JSON.parse(await readFile(process.env.NEXUS_AUTH_PLAN,'utf8'));
 return withPublicationAuth({expected,readTestTarget:async target=>{
  need(authEvidenceHash(plan.candidate.testTarget)===authEvidenceHash(target),'AUTH_PLAN_TARGET_MISMATCH');
  return readAuthTestTarget(plan,target);
 }},operation);
}
