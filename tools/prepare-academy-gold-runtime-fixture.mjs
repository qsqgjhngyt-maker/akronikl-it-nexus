// Только изолированные тесты: настоящие закреплённые runtime bytes и одноразовый TLS.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {RUNTIME_RESOURCES} from '../pwa/runtime-manifest.js';
const cache=path.resolve(process.env.NEXUS_PINNED_RUNTIME_DIR),out=path.resolve(process.env.NEXUS_GOLD_EVIDENCE||'academy-gold-evidence');
await mkdir(cache,{recursive:true});await mkdir(out,{recursive:true});
const rows=[],resources=[...RUNTIME_RESOURCES,{url:'https://felixhao28.github.io/JSCPP/dist/JSCPP.es5.min.js',name:'jscpp.js',bytes:619555,sha256:'e73047b962bd8fa92faf493873b38990b63df876e67dc0a7dfc7c0fc046e7fdd'}];
for(const resource of resources){
 const name=resource.name||(resource.url.endsWith('/+esm')?'runno-entry.js':resource.url.endsWith('/bundle.js')?'clang-bundle.js':new URL(resource.url).pathname.split('/').at(-1)),file=path.join(cache,name);
 let bytes;try{bytes=await readFile(file)}catch(e){if(e.code!=='ENOENT')throw e;}
 if(!bytes){const response=await fetch(resource.url,{signal:AbortSignal.timeout(240000)});if(response.status!==200)throw Error('RUNTIME_DOWNLOAD_HTTP_'+response.status);bytes=Buffer.from(await response.arrayBuffer());}
 const sha256=createHash('sha256').update(bytes).digest('hex');
 if(resource.sha256!==sha256||resource.bytes!==bytes.length)throw Error('RUNTIME_HASH_MISMATCH '+name);
 await writeFile(file,bytes);rows.push({name,url:resource.url,bytes:bytes.length,sha256});
}
try{await access(path.join(cache,'qa-cert.pem'));await access(path.join(cache,'qa-key.pem'));}
catch{execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','2','-subj','/CN=Synthetic Nexus loopback QA','-keyout',path.join(cache,'qa-key.pem'),'-out',path.join(cache,'qa-cert.pem')],{stdio:'ignore'});}
await writeFile(path.join(out,'RUNTIME_BYTES.json'),JSON.stringify({status:'PASS',rows,syntheticTls:'Ephemeral loopback only; no system trust or owner profile changes',method:'Actual pinned Clang/WASI and JSCPP; no mocked compiler'},null,2)+'\n');
console.log('PASS: закреплённые runtime bytes и одноразовый loopback TLS готовы');
