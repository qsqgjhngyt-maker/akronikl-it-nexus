import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {FIXED,projectRevision,deploymentArgs,hashConfig} from './publication-revision-config.mjs';
import {AUTH_ORIGIN,validateAuthCandidate,authEvidenceHash} from './publication-auth-gate.mjs';
export const need=(ok,code)=>{if(!ok)throw Error(code);};
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function yc(args,{raw=false}={}){
 try{const output=execFileSync(process.env.NEXUS_YC_BIN||(process.platform==='win32'?'C:/Users/User/yc-cli/yc.exe':'yc'),[...args,'--retry','0','--no-user-output','--no-browser',...(raw?[]:['--format','json'])],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:16000000,env:{...process.env,YC_CLI_INITIALIZATION_SILENCE:'true'}});return raw?output.trim():JSON.parse(output);}
 catch{throw Error('YC_FAILED_INSPECT_BEFORE_RETRY');}
}
export const activeRevision=()=>{const rows=yc(['serverless','container','revision','list','--container-id',FIXED.container]).filter(r=>r.status==='ACTIVE');need(rows.length===1,'PRODUCTION_ACTIVE_COUNT');return rows[0];};
export const productionSpec=()=>yc(['serverless','api-gateway','get-spec','--id',FIXED.gateway]).openapi_spec;
export async function workerSnapshot(){
 // Use the owner's existing read-only control adapter. Never export OAuth tokens or secret payloads.
 need(process.env.NEXUS_WORKER_READBACK_MODULE,'WORKER_READBACK_MODULE_REQUIRED');
 const {api,query,readWorkerContent}=await import(pathToFileURL(resolve(process.env.NEXUS_WORKER_READBACK_MODULE)).href);
 const prefix='/accounts/59d8152fe41bf5e4bc8cdade5ade6e30/workers/scripts/akronikl-nexus-sync';
 const [settings,response,schema]=await Promise.all([api(prefix+'/settings'),readWorkerContent(),query("SELECT name,type,sql FROM sqlite_schema WHERE type IN('table','index','trigger') ORDER BY name")]);
 const form=await response.formData(),entry=form.get('entry.js');need(entry,'WORKER_ENTRY_MISSING');
 return {source:sha(Buffer.from(await entry.arrayBuffer())),settings:hashConfig(settings),schema:hashConfig(schema.flatMap(r=>r.results??[]))};
}
export async function readPrimaryPublicationSurface(){
 need(process.env.NEXUS_WORKER_READBACK_MODULE,'WORKER_READBACK_MODULE_REQUIRED');
 const {api,query,readWorkerContent}=await import(pathToFileURL(resolve(process.env.NEXUS_WORKER_READBACK_MODULE)).href);
 const prefix='/accounts/59d8152fe41bf5e4bc8cdade5ade6e30/workers/scripts/akronikl-nexus-sync';
 const [settings,response,schema]=await Promise.all([api(prefix+'/settings'),readWorkerContent(),query("SELECT name,type,sql FROM sqlite_schema WHERE type IN('table','index','trigger','view') ORDER BY type,name")]);
 const entry=(await response.formData()).get('entry.js');need(entry,'WORKER_ENTRY_MISSING');
 const current=activeRevision(),main=execFileSync('git',['ls-remote','origin','refs/heads/main'],{cwd:resolve(fileURLToPath(new URL('../',import.meta.url))),encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000}).trim().split(/\s/)[0];
 return {containerId:FIXED.container,gatewayId:FIXED.gateway,imageDigest:current.image.image_digest,gatewayFingerprint:gatewayFingerprint(productionSpec()),workerSha256:sha(Buffer.from(await entry.arrayBuffer())),workerSettingsSha256:hashConfig(settings),schemaSha256:hashConfig(schema.flatMap(r=>r.results??[])),main};
}
const proxyBytes=()=>readFile(new URL('./auth-canary-proxy.cjs',import.meta.url));
export const proxyCommand=bytes=>['-e',"eval(atob('"+bytes.toString('base64')+"'));module.exports.start()"];
function runtimeHash(revision){const p=projectRevision({...revision,container_id:FIXED.container});delete p.description;return hashConfig(p);}
export function gatewayFingerprint(input){
 const spec=typeof input==='string'?createRequire(new URL('../server-access/package.json',import.meta.url))('yaml').parse(input):structuredClone(input);
 for(const ops of Object.values(spec.paths??{}))for(const op of Object.values(ops))if(Array.isArray(op?.parameters))for(const p of op.parameters){p.style??=['query','cookie'].includes(p.in)?'form':'simple';p.explode??=p.style==='form';}
 return hashConfig(spec);
}
export async function surface(imageDigest,runtimeConfigSha256,gatewayStates){
 const current=gatewayFingerprint(productionSpec());gatewayStates??=[current];
 need(Array.isArray(gatewayStates)&&gatewayStates.length>=1&&gatewayStates.length<=2&&gatewayStates.every(v=>/^[a-f0-9]{64}$/.test(v))&&gatewayStates.includes(current),'GATEWAY_NOT_IN_PINNED_TRANSITION');
 return {recipe:2,imageDigest,runtimeConfigSha256,gatewayStates:[...new Set(gatewayStates)].sort(),worker:await workerSnapshot(),qaHarnessSha256:sha(await proxyBytes())};
}
export async function readAuthTestTarget(plan,target=plan.candidate.testTarget){
 validateAuthCandidate(plan.candidate);need(hashConfig(target)===hashConfig(plan.candidate.testTarget),'TARGET_NOT_IN_PLAN');
 need(target.containerId!==FIXED.container,'TEST_TARGET_MUST_BE_PRIVATE');
 const container=yc(['serverless','container','get','--id',target.containerId]);
 need(container.name===plan.name&&container.description===plan.owner&&new URL(container.url).origin===plan.url,'CANARY_OWNERSHIP_CHANGED');
 const iam=yc(['serverless','container','list-access-bindings','--id',target.containerId]);
 need(Array.isArray(iam)&&iam.length===0,'CANARY_MUST_REMAIN_PRIVATE');
 const revision=yc(['serverless','container','revision','get','--id',target.revisionId]);
 need(revision.container_id===target.containerId&&revision.status==='ACTIVE'&&revision.image.image_digest===target.imageDigest,'CANARY_REVISION_CHANGED');
 const bytes=await proxyBytes(),normalized=structuredClone(revision);
 // YC readback wraps repeated command/args fields; deploy CLI accepts flat CSV.
 const command=revision.image.command,args=revision.image.args;
 need(command&&Object.keys(command).join(',')==='command'&&args&&Object.keys(args).join(',')==='args'&&hashConfig(command.command)===hashConfig(['node'])&&hashConfig(args.args)===hashConfig(proxyCommand(bytes))&&revision.image.environment.NEXUS_AUTH_IMAGE_DIGEST===target.imageDigest,'CANARY_HARNESS_CHANGED');
 normalized.image.command=plan.originalCommand;normalized.image.args=plan.originalArgs;delete normalized.image.environment.NEXUS_AUTH_IMAGE_DIGEST;
 need(runtimeHash(normalized)===plan.surface.runtimeConfigSha256,'CANARY_CONFIG_CHANGED');
 const production=activeRevision();need(production.id===plan.candidate.baseline.revisionId&&production.image.image_digest===plan.candidate.baseline.imageDigest&&runtimeHash(production)===plan.surface.runtimeConfigSha256,'PRODUCTION_BASELINE_CHANGED');
 const actualSurface=await surface(target.imageDigest,runtimeHash(normalized),plan.surface.gatewayStates);
 return {...target,authArtifactSha256:hashConfig(actualSurface)};
}
export async function createAuthCanary({imageDigest,sourceCommit,frontendManifestSha256,out,targetGatewaySpecFile}){
 need(/^sha256:[a-f0-9]{64}$/.test(imageDigest)&&/^[a-f0-9]{40}$/.test(sourceCommit)&&/^[a-f0-9]{64}$/.test(frontendManifestSha256),'IMMUTABLE_SOURCE_BINDING_REQUIRED');
 await mkdir(out,{recursive:true});const before=activeRevision(),production=yc(['serverless','container','get','--id',FIXED.container]);
 need(!before.image.command?.length&&!before.image.args?.length,'PRODUCTION_COMMAND_OVERRIDE_UNSUPPORTED');
 // An intentional gateway -> BFF publication pins BOTH complete specifications
 // before the owner logs in. Other gateway changes invalidate the evidence.
 const gatewayStates=[gatewayFingerprint(productionSpec())];if(targetGatewaySpecFile)gatewayStates.push(gatewayFingerprint(await readFile(targetGatewaySpecFile,'utf8')));
 const authSurface=await surface(imageDigest,runtimeHash(before),gatewayStates),bytes=await proxyBytes();
 const name='nexus-auth-qa-'+randomBytes(6).toString('hex'),owner='Owned ephemeral exact-image login check '+name;
 // No IAM grant is added. Creation and deploy markers survive cancellation.
 await writeFile(join(out,'CREATE_INTENT.json'),JSON.stringify({name,owner,baselineRevision:before.id,at:new Date().toISOString()},null,2)+'\n',{flag:'wx'});
 const container=yc(['serverless','container','create','--name',name,'--description',owner,'--folder-id',production.folder_id]);
 await writeFile(join(out,'CREATED.json'),JSON.stringify({containerId:container.id,name,owner},null,2)+'\n',{flag:'wx'});
 const desired=structuredClone(before);desired.description=owner;desired.image.command=['node'];desired.image.args=proxyCommand(bytes);desired.image.environment.NEXUS_AUTH_IMAGE_DIGEST=imageDigest;
 const args=deploymentArgs(desired,FIXED.repository+'@'+imageDigest),index=args.indexOf('--container-id');need(index>=0&&args[index+1]===FIXED.container&&container.id!==FIXED.container,'CANARY_SCOPE');args[index+1]=container.id;
 const revision=yc(args),actualContainer=yc(['serverless','container','get','--id',container.id]);
 const url=new URL(actualContainer.url);need(url.protocol==='https:'&&url.hostname.endsWith('.containers.yandexcloud.net')&&!url.username&&!url.password,'CANARY_URL_INVALID');
 const candidate={schema:1,kind:'nexus-publication-candidate',origin:AUTH_ORIGIN,sourceCommit,imageDigest,frontendManifestSha256,authArtifactSha256:hashConfig(authSurface),baseline:{revisionId:before.id,imageDigest:before.image.image_digest},testTarget:{containerId:container.id,revisionId:revision.id,imageDigest,authArtifactSha256:hashConfig(authSurface)}};
 const plan={schema:1,name,owner,url:url.origin,surface:authSurface,originalCommand:before.image.command,originalArgs:before.image.args,candidate};validateAuthCandidate(candidate);
 await writeFile(join(out,'plan.private.json'),JSON.stringify(plan,null,2)+'\n',{flag:'wx'});await writeFile(join(out,'candidate.json'),JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
 need(authEvidenceHash(await readAuthTestTarget(plan))===authEvidenceHash(candidate.testTarget),'CANARY_INITIAL_READBACK_FAILED');return plan;
}
export async function cleanupAuthCanary(plan){
 // Cleanup must remain possible if the Worker or production baseline has moved.
 const id=plan.candidate.testTarget.containerId;need(id!==FIXED.container,'CLEANUP_PRODUCTION_FORBIDDEN');
 const existing=yc(['serverless','container','list']);if(!existing.some(c=>c.id===id))return {status:'PRIVATE_CANARY_ABSENT_CONFIRMED',containerId:id,at:new Date().toISOString()};
 const owned=yc(['serverless','container','get','--id',id]);need(owned.name===plan.name&&owned.description===plan.owner,'CLEANUP_OWNERSHIP_CHANGED');
 const revisions=yc(['serverless','container','revision','list','--container-id',id]);need(revisions.every(r=>r.id===plan.candidate.testTarget.revisionId),'CLEANUP_REVISION_DRIFT');
 yc(['serverless','container','delete','--id',id],{raw:true});
 need(!yc(['serverless','container','list']).some(c=>c.id===id),'CLEANUP_READBACK_FAILED');
 return {status:'PRIVATE_CANARY_DELETED',containerId:plan.candidate.testTarget.containerId,at:new Date().toISOString()};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const [action,file]=process.argv.slice(2);
  if(action==='create'){const args=JSON.parse(await readFile(file,'utf8'));const p=await createAuthCanary(args);console.log(JSON.stringify({status:'PRIVATE_CANARY_READY_NOT_FULL_LOGIN',containerId:p.candidate.testTarget.containerId}));}
  else if(action==='inspect'){const p=JSON.parse(await readFile(file,'utf8'));console.log(JSON.stringify(await readAuthTestTarget(p)));}
  else if(action==='cleanup'){const p=JSON.parse(await readFile(file,'utf8'));console.log(JSON.stringify(await cleanupAuthCanary(p)));}
  else throw Error('ACTION_REQUIRED');
 }catch(e){console.error(/^[A-Z0-9_]+$/.test(e.message)?e.message:'AUTH_CANARY_FAILED');process.exitCode=1;}
}
