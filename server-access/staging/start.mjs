import {readFile,access,chmod} from 'node:fs/promises';
import {execFileSync,spawn} from 'node:child_process';
import {openSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {validateStage} from './contract.mjs';
const directory=resolve(process.argv[2]),s=validateStage(JSON.parse(await readFile(join(directory,'staging.private.json'),'utf8')));
const docker=process.env.NEXUS_STAGING_DOCKER||'docker';
try{await access(join(directory,'localhost.crt'))}catch{
 const openssl=process.env.NEXUS_STAGING_OPENSSL||(process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl');
 execFileSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(directory,'localhost.key'),'-out',join(directory,'localhost.crt'),'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-days','7'],{stdio:'ignore'});
 await chmod(join(directory,'localhost.key'),0o600);
}
if(process.argv[3]==='native'){
 const node=process.env.NEXUS_STAGING_NODE||process.execPath;
 const version=execFileSync(node,['-p','process.versions.node'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 if(!version.startsWith('22.'))throw Error('PINNED_NODE_22_REQUIRED');
 const bundle=process.env.NEXUS_STAGING_BUNDLE||fileURLToPath(new URL('../../../staging-build/runtime.mjs',import.meta.url));
 const child=spawn(node,[bundle],{detached:true,windowsHide:true,
  env:{...process.env,NEXUS_STAGING_STATE_DIR:directory,NEXUS_STAGING_CONTAINER:'false'},
  stdio:['ignore',openSync(join(directory,'runtime.log'),'a'),openSync(join(directory,'runtime-error.log'),'a')]});
 child.unref();console.log(JSON.stringify({status:'STAGING_NATIVE_STARTED',pid:child.pid,nodeVersion:version,url:'https://localhost:8443/account/password/',mailMode:s.mailMode,productionWrites:0}));
}else{
const id=execFileSync(docker,['run','-d','--name',s.name,'--label','nexus.staging.name='+s.name,
 '--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--pids-limit','128','--memory','384m','--cpus','1',
 '--publish','127.0.0.1:8443:8443','--mount','type=bind,source='+directory+',target=/state','nexus-password-staging:pr64'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
console.log(JSON.stringify({status:'STAGING_CONTAINER_STARTED',name:s.name,containerId:id,url:'https://localhost:8443/account/password/',mailMode:s.mailMode,productionWrites:0}));
}
