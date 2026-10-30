// Offline image startup proof only. It never certifies a real login.
import {execFileSync} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {AUTH_ORIGIN,validateAuthCandidate} from './publication-auth-gate.mjs';
export async function checkAccessImageStart(image,{candidate,ociArchive,registryManifestFile}={}){
 if(!/^[a-zA-Z0-9][a-zA-Z0-9._/:@-]+$/.test(image))throw Error('INVALID_IMAGE');
 const docker=process.platform==='win32'?'docker.exe':'docker',name='nexus-startup-'+randomBytes(8).toString('hex');
 const run=args=>execFileSync(docker,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:2000000});let owned=false;
 try{
  const info=JSON.parse(run(['image','inspect',image]))[0];
  if(candidate){
   validateAuthCandidate(candidate);let bound=info.RepoDigests?.some(d=>d.endsWith('@'+candidate.imageDigest));
   if(!bound&&registryManifestFile){
    const {readFile}=await import('node:fs/promises'),manifestBytes=await readFile(registryManifestFile),manifest=JSON.parse(manifestBytes);
    const remoteVerified='sha256:'+createHash('sha256').update(manifestBytes).digest('hex')===candidate.imageDigest;
    bound=remoteVerified&&manifest.config?.digest===info.Id;
    if(!bound&&remoteVerified&&ociArchive&&info.Descriptor){
     // Docker's containerd store exposes a manifest/index as Id, not a config Id.
     // Prove the selected local OCI manifest has EXACT config and layer digests
     // of the registry's Docker schema2 manifest (only media-type wrappers differ).
     const selected=JSON.parse(run(['image','inspect','--platform','linux/amd64',image]))[0],localDigest=selected.Descriptor?.digest;
     if(/^sha256:[a-f0-9]{64}$/.test(localDigest)){
      const bytes=execFileSync('tar',['-xOf',ociArchive,'blobs/sha256/'+localDigest.slice(7)],{stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:1048576}),local=JSON.parse(bytes);
      bound='sha256:'+createHash('sha256').update(bytes).digest('hex')===localDigest&&local.config?.digest===manifest.config?.digest&&JSON.stringify(local.layers?.map(l=>l.digest))===JSON.stringify(manifest.layers?.map(l=>l.digest));
     }
    }
   }
   if(!bound&&ociArchive){
    const part='blobs/sha256/'+candidate.imageDigest.slice(7),manifestBytes=execFileSync('tar',['-xOf',ociArchive,part],{stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:1048576});
    const manifest=JSON.parse(manifestBytes);bound='sha256:'+createHash('sha256').update(manifestBytes).digest('hex')===candidate.imageDigest&&manifest.config?.digest===info.Id;
   }
   if(!bound)throw Error('IMAGE_DIGEST_NOT_BOUND');
  }
  const env={PASSKEY_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',ACCOUNT_READ_ENABLED:'true',COOKIE_INGRESS_V3_ENABLED:'true',PASSKEY_ORIGIN:AUTH_ORIGIN,PASSKEY_WORKER_ORIGIN:'https://akronikl-nexus-sync.akronikl.workers.dev',PASSKEY_SERVICE_KEY:'SYNTHETIC_OFFLINE_STARTUP_KEY_0000000000',ACCOUNT_SERVICE_KEY:'SYNTHETIC_OFFLINE_STARTUP_KEY_0000000000'};
  const id=run(['create','--platform','linux/amd64','--name',name,'--network','none',...Object.entries(env).flatMap(([k,v])=>['--env',k+'='+v]),image]).trim();owned=true;run(['start',id]);
  const code=`const fs=await import('node:fs/promises');const http=await import('node:http');async function req(path){return new Promise((ok,no)=>{const r=http.get({host:'127.0.0.1',port:8080,path,headers:{host:${JSON.stringify(new URL(AUTH_ORIGIN).host)},'x-yc-apigateway-operation-context':Buffer.from(JSON.stringify({accountReadContract:'v3'})).toString('base64')}},s=>{s.resume();s.on('end',()=>ok(s.statusCode))});r.on('error',no);r.setTimeout(2000,()=>r.destroy(Error('timeout')));})}let ready=false;for(let n=0;n<50;n++){try{if(await req('/account/access/')===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw Error('ACCESS_NOT_READY');const cmd=await fs.readFile('/proc/1/cmdline','utf8');if(!cmd.includes('bff/network-bootstrap.mjs'))throw Error('BOOTSTRAP_NOT_RUNNING');await fs.access('/app/bff/network-bootstrap.mjs');if(await req('/api/v2/account')!==401)throw Error('ANONYMOUS_ACCOUNT_NOT_401');console.log(JSON.stringify({accessStatus:200,anonymousAccountStatus:401,bootstrapRunning:true,externalNetwork:false}));`;
  const checks=JSON.parse(run(['exec',id,'node','--input-type=module','-e',code]));
  return candidate?{schema:1,kind:'exact-image-startup',candidateId:validateAuthCandidate(candidate),imageDigest:candidate.imageDigest,checkedAt:new Date().toISOString(),status:'STARTUP_PASS_NOT_LOGIN'}:{status:'STARTUP_PASS_NOT_LOGIN',image,checks};
 }finally{if(owned)run(['rm','--force',name]);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const proof=await checkAccessImageStart(process.argv[2]);if(process.argv[3])await writeFile(process.argv[3],JSON.stringify(proof,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(proof));}
 catch{console.error('IMAGE_STARTUP_FAILED');process.exitCode=1;}
}
