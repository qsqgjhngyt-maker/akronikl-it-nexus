import fs from 'node:fs';import path from 'node:path';import{createHash}from'node:crypto';
const root='/app/frontend',out='/out/baseline-public',sha=b=>createHash('sha256').update(b).digest('hex');
try{
 if(!fs.existsSync(out))fs.mkdirSync(out,{recursive:false});
 const raw=fs.readFileSync(path.join(root,'PUBLISHED_FILES.json')),manifest=JSON.parse(raw);
 if(manifest.version!==1||manifest.generation!=='ui1a-p4q-production-20261030-v21'||!Array.isArray(manifest.files))throw Error('BASELINE_MANIFEST_MISMATCH');
 const shell=manifest.files.find(r=>r.path==='/nexus-shell.html');
 if(shell&&(shell.bytes!==manifest.shell.bytes||shell.sha256!==manifest.shell.sha256))throw Error('SHELL_RECORD_MISMATCH');
 const rows=shell?manifest.files:[...manifest.files,{path:'/nexus-shell.html',...manifest.shell}];
 const seen=new Set();let bytes=0;
 for(const r of rows){
  if(typeof r.path!=='string'||!/^\/[A-Za-z0-9._/@+-]+(?:\/[A-Za-z0-9._@+-]+)*$/.test(r.path)||r.path.split('/').some(p=>p==='.'||p==='..')||seen.has(r.path))throw Error('BASELINE_PATH_INVALID');seen.add(r.path);
  const body=fs.readFileSync(path.join(root,r.path));if(body.length!==r.bytes||sha(body)!==r.sha256)throw Error('BASELINE_FILE_MISMATCH');
  const target=path.join(out,r.path);fs.mkdirSync(path.dirname(target),{recursive:true});if(fs.existsSync(target)){if(sha(fs.readFileSync(target))!==r.sha256)throw Error('PARTIAL_SNAPSHOT_CHANGED');}else fs.writeFileSync(target,body,{flag:'wx'});bytes+=body.length;
 }
 fs.writeFileSync(path.join(out,'PUBLISHED_FILES.json'),raw,{flag:'wx'});
 const result={status:'LOCAL IMAGE PUBLIC SNAPSHOT PASS',generation:manifest.generation,files:seen.size,bytes,manifestSha256:sha(raw),bffSha256:sha(fs.readFileSync('/app/bff/server.mjs')),networkBootstrapSha256:sha(fs.readFileSync('/app/bff/network-bootstrap.mjs')),productionChanged:false,credentialsRead:false,privateFilesCopied:false};
 fs.writeFileSync('/out/BASELINE_SNAPSHOT.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
}catch(error){console.log(JSON.stringify({status:'FAIL',code:/^[A-Z0-9_]+$/.test(error.message)?error.message:'SNAPSHOT_FAILED_DETAILS_REDACTED'}));process.exitCode=1;}
