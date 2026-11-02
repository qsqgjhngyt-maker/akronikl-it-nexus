import fs from'node:fs';import fsp from'node:fs/promises';import path from'node:path';import{spawn,execFileSync}from'node:child_process';import{pipeline}from'node:stream/promises';import{createGzip}from'node:zlib';import{createHash}from'node:crypto';
const work=import.meta.dirname,dir=path.join(work,'s8-publication-20261101'),image='nexus-onec-candidate:20261101-r1',out=path.join(dir,'ONEC_CANDIDATE_87944bb_20261101_IMAGE.tar.gz');
try{
 const info=JSON.parse(execFileSync('docker',['image','inspect',image],{encoding:'utf8',stdio:['ignore','pipe','pipe']}))[0],allowed=new Set(['PATH','NODE_VERSION','YARN_VERSION','NODE_ENV']);
 if(info.Config.Env.some(e=>!allowed.has(e.split('=')[0])))throw Error('IMAGE_ENVIRONMENT_REVIEW_REQUIRED');
 const disk=await fsp.statfs(dir);if(disk.bavail*disk.bsize<2_000_000_000)throw Error('INSUFFICIENT_FREE_SPACE');
 const child=spawn('docker',['image','save',image],{stdio:['ignore','pipe','ignore'],windowsHide:true});const finished=new Promise((resolve,reject)=>{child.once('error',()=>reject(Error('DOCKER_EXPORT_START_FAILED')));child.once('exit',code=>code===0?resolve():reject(Error('DOCKER_EXPORT_FAILED')))});
 await Promise.all([pipeline(child.stdout,createGzip({level:1}),fs.createWriteStream(out,{flags:'wx'})),finished]);
 const hash=createHash('sha256');for await(const chunk of fs.createReadStream(out))hash.update(chunk);
 const result={status:'LOCAL CANDIDATE IMAGE ARCHIVE READY / NOT RELEASE',image,imageConfigId:info.Id,archive:path.basename(out),bytes:(await fsp.stat(out)).size,sha256:hash.digest('hex'),inlineCredentialEnvironment:false,productionChanged:false,mainChanged:false};await fsp.writeFile(path.join(dir,'IMAGE_ARCHIVE.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(error){console.log(JSON.stringify({status:'FAIL',code:/^[A-Z0-9_]+$/.test(error.message)?error.message:'IMAGE_EXPORT_FAILURE_REDACTED'}));process.exitCode=1;}
