import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),need=(ok,code)=>{if(!ok)throw Error(code)};
try{
 const frozen=JSON.parse(fs.readFileSync('/proof/FROZEN_SOURCE.json')),raw=fs.readFileSync('/app/frontend/PUBLISHED_FILES.json'),manifest=JSON.parse(raw),prior=JSON.parse(fs.readFileSync('/baseline/PUBLISHED_FILES.json'));
 need(sha(raw)===frozen.frontendManifestSha256,'EXACT_IMAGE_MANIFEST_MISMATCH');
 const current=new Map(manifest.files.map(r=>[r.path,r]));let total=0,retained=0;
 for(const r of manifest.files){const body=fs.readFileSync(path.join('/app/frontend',r.path));need(body.length===r.bytes&&sha(body)===r.sha256,'IMAGE_PUBLIC_FILE_CHANGED');total+=body.length;}
 for(const r of prior.files.filter(r=>r.immutable)){need(current.get(r.path)?.sha256===r.sha256,'OLD_IMMUTABLE_RECORD_CHANGED');retained++;}
 need(sha(fs.readFileSync('/app/bff/server.mjs'))===frozen.baselineBffSha256,'BFF_CODE_CHANGED');need(sha(fs.readFileSync('/app/bff/network-bootstrap.mjs'))===frozen.baselineNetworkBootstrapSha256,'AUTH_BOOTSTRAP_CHANGED');
 const result={status:'EXACT LOCAL IMAGE INTEGRITY PASS',generation:manifest.generation,sourceCommit:frozen.sourceCommit,frontendManifestSha256:sha(raw),files:manifest.files.length,bytes:total,oldImmutableFilesRetained:retained,bffBytesUnchanged:true,networkBootstrapBytesUnchanged:true,productionChanged:false,realAccountTested:false};
 fs.writeFileSync('/result/IMAGE_INTEGRITY.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
}catch(error){console.log(JSON.stringify({status:'FAIL',code:/^[A-Z0-9_]+$/.test(error.message)?error.message:'IMAGE_CHECK_FAILED_REDACTED'}));process.exitCode=1;}
