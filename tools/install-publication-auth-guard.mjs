// Retrofitting the two currently used local deploy drivers. No cloud mutation.
// Historical JSON evidence is never rewritten. Each script gets a preserved backup.
import {readFile,writeFile} from 'node:fs/promises';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const feature=resolve(dirname(fileURLToPath(import.meta.url)),'..'),task=resolve(feature,'..');
const sha=v=>createHash('sha256').update(v).digest('hex');
const auth="import {guardPublicationMutation} from '../feature/tools/publication-auth-deploy-guard.mjs';\n";
function patch(text,kind){
 // Keep emergency recovery usable after a tooling-only feature commit. It still
 // checks branch, frozen snapshot, exact live revision/digest/config and gateway.
 let recovery=text;
 if(kind==='hotfix')recovery=recovery.replace('\n source();',"\n if(stage==='rollback')need(git(['branch','--show-current'])==='feature/akronikl-p4q-corpus-20261028','FEATURE_ONLY');else source();");
 else recovery=recovery.replace("const d=await frozen(),b=", "const d=stage==='rollback'?(source(),await read('FROZEN_SOURCE.json')):await frozen(),b=");
 if(recovery.includes(auth.trim()))return recovery;
 text=recovery;
 const frozen=kind==='hotfix'?'frozen':'d';
 const binding=`{sourceCommit:${frozen}.commit,imageDigest:registry.manifestDigest,frontendManifestSha256:${frozen}.frontendManifestSha256,authArtifactSha256:${frozen}.authArtifactSha256}`;
 const targets=kind==='hotfix'?[
  ["await save('DEPLOY_STARTED.json'","const deployed=yc(args);","const deployed=await guardPublicationMutation("+binding+",async()=>{", "return yc(args);});"]
 ]:[
  ["await save('GATEWAY_STARTED.json'","yc(['serverless','api-gateway','update','--id','d5d8d3c2d1uhct6fmvle','--spec',path.join(dir,'gateway-target.json')]);", "await guardPublicationMutation("+binding.replace('registry.manifestDigest',"(await read('REGISTRY_RESULT.json')).manifestDigest")+",async()=>{", "return yc(['serverless','api-gateway','update','--id','d5d8d3c2d1uhct6fmvle','--spec',path.join(dir,'gateway-target.json')]);});"],
  ["await save('BFF_STARTED.json'","const deployed=yc(args);","const deployed=await guardPublicationMutation("+binding+",async()=>{","return yc(args);});"]
 ];
 let result=auth+text;
 for(const [start,end,prefix,suffix]of targets){
  if(result.split(start).length!==2)throw Error('DEPLOY_DRIVER_START_DRIFT');const offset=result.indexOf(start),finish=result.indexOf(end,offset);if(finish<offset)throw Error('DEPLOY_DRIVER_END_DRIFT');
  result=result.slice(0,offset)+prefix+result.slice(offset,finish).replace(/const deployed=$/,'')+suffix+result.slice(finish+end.length);
 }
 return result;
}
for(const [relative,kind]of [['auth-incident-20261030/deploy-auth.mjs','hotfix'],['piper-science-20261030/deploy-v20.mjs','frontend']]){
 const file=resolve(task,relative),before=await readFile(file,'utf8'),after=patch(before,kind);if(before===after){console.log(JSON.stringify({script:relative,status:'ALREADY_GUARDED'}));continue;}
 await writeFile(file+'.before-auth-gate-'+sha(before).slice(0,12)+'.bak',before,{flag:'wx'});await writeFile(file,after);
 console.log(JSON.stringify({script:relative,status:'GUARD_INSTALLED',beforeSha256:sha(before),afterSha256:sha(after)}));
}
