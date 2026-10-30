// Produces a local test package, without publishing or bundling model weights/secrets.
import {readFile,writeFile,mkdir,copyFile,stat} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const feature=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out=path.resolve(process.argv[2]??'');if(!process.argv[2]||out===feature||feature.startsWith(out+path.sep))throw Error('NEW_OUTPUT_DIRECTORY_REQUIRED');
try{await stat(out);throw Error('REFUSE_PACKAGE_OVERWRITE');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(out,{recursive:true});const {build}=createRequire(path.join(feature,'server-access/package.json'))('esbuild');
await build({entryPoints:[path.join(feature,'tools/local-voice/main.mjs')],outfile:path.join(out,'local-voice.mjs'),bundle:true,platform:'node',format:'esm',target:'node22',logLevel:'warning'});
for(const name of ['local-speech-worker.py','qwen-greedy-predictor.py'])await copyFile(path.join(feature,'tools/qa-akronikl',name),path.join(out,name));
await copyFile(path.join(feature,'akronikl/experience/voices/uyut7-narrator.wav'),path.join(out,'uyut7-narrator.wav'));
for(const name of ['START.cmd','README_RU.txt'])await copyFile(path.join(feature,'tools/local-voice',name),path.join(out,name));
const uninstall=await readFile(path.join(feature,'tools/local-voice/Uninstall.ps1'),'utf8');await writeFile(path.join(out,'Uninstall.ps1'),'\uFEFF'+uninstall.replace(/^\uFEFF/u,''));
const ps=await readFile(path.join(feature,'tools/local-voice/Start.ps1'),'utf8');await writeFile(path.join(out,'Start.ps1'),'\uFEFF'+ps.replace(/^\uFEFF/u,''));
const names=['local-voice.mjs','local-speech-worker.py','qwen-greedy-predictor.py','uyut7-narrator.wav','Start.ps1','START.cmd','README_RU.txt','Uninstall.ps1'],files=[];for(const file of names){const b=await readFile(path.join(out,file));files.push({file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
await writeFile(path.join(out,'PACKAGE_MANIFEST.json'),JSON.stringify({kind:'LOCAL_TEST_NOT_OFFICIAL_RELEASE',modelWeightsIncluded:false,apiKeysIncluded:false,automaticDownloads:false,files},null,2)+'\n');console.log(JSON.stringify({out,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0)}));
