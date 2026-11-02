import fs from'node:fs/promises';import path from'node:path';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
const dir=path.join(import.meta.dirname,'s8-publication-20261101'),file=path.join(dir,'IMAGE_ARCHIVE.json');
try{
 const receipt=JSON.parse(await fs.readFile(file)),archive=path.join(dir,receipt.archive),read=name=>execFileSync('tar.exe',['-xOf',archive,name],{stdio:['ignore','pipe','pipe'],maxBuffer:4000000,windowsHide:true});
 const manifest=JSON.parse(read('manifest.json')),matches=manifest.filter(r=>r.RepoTags?.includes('nexus-onec-candidate:20261101-r1'));if(matches.length!==1)throw Error('ONE_IMAGE_REQUIRED');
 if(!/^(?:blobs\/sha256\/[a-f0-9]{64}|[a-f0-9]{64}\.json)$/.test(matches[0].Config))throw Error('CONFIG_PATH_REJECTED');const raw=read(matches[0].Config),config=JSON.parse(raw);
 if(config.architecture!=='amd64'||config.os!=='linux')throw Error('PLATFORM_MISMATCH');const allowed=new Set(['PATH','NODE_VERSION','YARN_VERSION','NODE_ENV']);if(config.config.Env.some(e=>!allowed.has(e.split('=')[0])))throw Error('ENV_REVIEW_REQUIRED');
 receipt.localImageId=receipt.imageConfigId;delete receipt.imageConfigId;receipt.imageConfigDigest='sha256:'+createHash('sha256').update(raw).digest('hex');receipt.platform='linux/amd64';receipt.registryManifestDigest=null;await fs.writeFile(file,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}catch(error){console.log(JSON.stringify({status:'FAIL',code:/^[A-Z0-9_]+$/.test(error.message)?error.message:'ARCHIVE_METADATA_FAILED_REDACTED'}));process.exitCode=1;}
