// Snapshot exact published-source bytes. Never rebuild an existing immutable generation.
import {readFile,writeFile,mkdir,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const option=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1]};
const sourceOption=option('--source'),outOption=option('--out'),expectedCommit=option('--expected-commit');
if(!sourceOption||!outOption)throw Error('Required: --source <published checkout> --out <new snapshot directory> [--expected-commit <SHA>]');
const source=await realpath(path.resolve(sourceOption)),out=path.resolve(outOption);
if(out===source||out.startsWith(source+path.sep)||source.startsWith(out+path.sep))throw Error('Snapshot must be outside the source checkout');
try{await lstat(out);throw Error('Snapshot directory already exists')}catch(error){if(error.code!=='ENOENT')throw error}
const sourceCommit=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(sourceCommit)||expectedCommit&&sourceCommit!==expectedCommit)throw Error('Published source commit does not match the requested commit');
if(execFileSync('git',['-C',source,'status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim())throw Error('Published source has modified tracked files');
const committedPaths=new Set(execFileSync('git',['-C',source,'ls-tree','-r','-z','--name-only','HEAD'],{encoding:'utf8'}).split('\0').filter(Boolean));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

// esbuild emits a JSON-compatible literal with unquoted property names. Extract it
// with string-aware brace matching, quote only identifier keys, then JSON.parse.
// Do not evaluate a service worker, use eval/vm, or execute literal expressions.
export function readWorkerConfiguration(text){
 const assignments=[...text.matchAll(/\bvar\s+define_NEXUS_PWA_CONFIG_default\s*=\s*/g)];
 if(assignments.length!==1)throw Error('Expected exactly one compiled public manifest');
 const start=assignments[0].index+assignments[0][0].length;
 if(text[start]!=='{')throw Error('Public manifest must be an object literal');
 let depth=0,quoted=false,escaped=false,end=-1;
 for(let i=start;i<text.length;i++){
  const c=text[i];
  if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}
  if(c==='"'){quoted=true;continue}
  if(c==='{')depth++;
  if(c==='}'&&--depth===0){end=i+1;break}
 }
 if(end<0||!/^\s*;/.test(text.slice(end)))throw Error('Public manifest literal is incomplete');
 const literal=text.slice(start,end);let json='';quoted=false;escaped=false;
 for(let i=0;i<literal.length;i++){
  const c=literal[i];
  if(quoted){json+=c;if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}
  if(c==='"'){quoted=true;json+=c;continue}
  if(/[A-Za-z_$]/.test(c)){
   const identifier=/^[A-Za-z_$][A-Za-z0-9_$]*/.exec(literal.slice(i))[0];
   if(/^\s*:/.test(literal.slice(i+identifier.length)))json+=JSON.stringify(identifier);
   else if(['true','false','null'].includes(identifier))json+=identifier;
   else throw Error('Public manifest contains a non-JSON expression');
   i+=identifier.length-1;continue;
  }
  json+=c;
 }
 return JSON.parse(json);
}

const worker=await readFile(path.join(source,'service-worker.js'));
const config=readWorkerConfiguration(worker.toString('utf8'));
if(!/^ui1a-[a-z0-9-]+$/.test(config.generation)||typeof config.version!=='string'||!Array.isArray(config.assets)||!config.assets.length)throw Error('Invalid shipped public manifest');
const version=JSON.parse(await readFile(path.join(source,'version.json'),'utf8'));
if(version.version!==config.version||(version.releaseCandidate?.assetGeneration||version.assetGeneration)!==config.generation)throw Error('Shipped version metadata and worker generation disagree');
const rootFiles=['index.html','nexus-shell.html','version.json','service-worker.js'];
const names=new Set(),buffers=new Map(),records=[];
async function add(file,expected){
 if(typeof file!=='string'||file.includes('\\')||file.split('/').some(p=>!p||p==='.'||p==='..')||/[\u0000-\u001f?#]/.test(file)||names.has(file)||!committedPaths.has(file))throw Error('Invalid, uncommitted or duplicate snapshot path: '+file);
 const target=path.resolve(source,file);
 if(!target.startsWith(source+path.sep)||(await realpath(target))!==target||!(await lstat(target)).isFile())throw Error('Snapshot source must be a regular file within the checkout: '+file);
 const bytes=file==='service-worker.js'?worker:await readFile(target),digest=sha256(bytes);
 if(expected&&(bytes.length!==expected.bytes||digest!==expected.sha256))throw Error('SHIPPED_ASSET_INTEGRITY_MISMATCH: '+file);
 names.add(file);buffers.set(file,bytes);records.push({file,bytes:bytes.length,sha256:digest,source:'Exact published-source checkout bytes'});
}
for(const asset of config.assets){
 if(!asset||!Number.isSafeInteger(asset.bytes)||asset.bytes<0||!/^[a-f0-9]{64}$/.test(asset.sha256)||typeof asset.mime!=='string'||!(asset.url?.startsWith('releases/')||asset.url?.startsWith('entry-assets/')||asset.url?.startsWith('assets/icons/')||['offline.html','manifest.webmanifest'].includes(asset.url)))throw Error('Invalid public asset authority');
 await add(asset.url,asset);
}
for(const file of rootFiles)await add(file);
for(const required of ['offline.html','manifest.webmanifest'])if(!names.has(required))throw Error('Required shipped public asset is missing: '+required);
const manifestIdentity=JSON.parse(buffers.get('manifest.webmanifest').toString('utf8'));
const manifest={version:config.version,assetGeneration:config.generation,prefix:'releases/'+config.generation+'/',files:records.sort((a,b)=>a.file.localeCompare(b.file)),publicAssets:config.assets.length,publicAuthority:'EXACT SHIPPED SERVICE WORKER ASSETS; NO NEW AUTHORITY',legacyWorkerIncluded:false,verifiedWorkerIncluded:true,manifestIdentity,snapshot:{mode:'published-source-byte-exact',sourceCommit,workerSha256:sha256(worker),rebuilt:false,liveDeploymentVerified:false,description:'QA manifest derived from the checked-out shipped worker. Every copied file is byte-exact; no source build or immutable generation rewrite.'}};
// All validation completes before the new destination is created.
await mkdir(path.dirname(out),{recursive:true});await mkdir(out);
for(const [file,bytes] of buffers){const target=path.join(out,file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes,{flag:'wx'})}
await writeFile(path.join(out,'BUILD_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,version:config.version,assetGeneration:config.generation,files:records.length,publicAssets:config.assets.length,sourceCommit,workerSha256:sha256(worker),rebuilt:false}));
