import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'..'),root=path.join(repo,'review/cpp-clarity-r3'),server=path.join(here,'preview-cpp-clarity-r3.mjs'),origin='http://127.0.0.1:47653';
const expected=JSON.parse(execFileSync(process.execPath,[server,'--root',root,'--repo',repo,'--fingerprint','yes'],{encoding:'utf8'}));
const health=async()=>{try{return await(await fetch(origin+'/health',{signal:AbortSignal.timeout(1500)})).json();}catch{return null;}};
const recorded=JSON.parse(fs.readFileSync(path.join(repo,'docs/ru/03-content/cpp-clarity-01/R3_ASSET_MANIFEST.json'),'utf8'));
if(recorded.assetDigestAlgorithm!==expected.assetDigestAlgorithm||recorded.assetDigest!==expected.assetDigest)throw Error('Local R3 assets differ from the reviewed snapshot.');
let result=await health();
if(!result){const child=spawn(process.execPath,[server,'--root',root,'--repo',repo,'--port','47653'],{detached:true,windowsHide:true,stdio:'ignore'});child.unref();for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,200));result=await health();if(result)break;}}
if(!result||result.status!=='review-only'||result.assetDigestAlgorithm!==expected.assetDigestAlgorithm||result.assetDigest!==expected.assetDigest)throw Error('Port 47653 is unavailable or serves different R3 assets. Existing processes were not stopped.');
for(const asset of ['/','/screen.mjs','/screen.css','/courses.json','/lessons/cpp.programming-process.ru.json','/lessons/onec.p2.topic-1.ru.json','/lessons/onec.p7.topic-2.ru.json']){const r=await fetch(origin+asset,{signal:AbortSignal.timeout(5000)});if(r.status!==200||(await r.arrayBuffer()).byteLength===0)throw Error('R3 resource unavailable: '+asset);}
if(!process.argv.includes('--no-open')){const browser=process.env.NEXUS_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';const p=spawn(browser,['--user-data-dir='+path.join(process.env.TEMP||repo,'akronikl-cpp-clarity-r3-review-profile'),'--no-first-run','--no-default-browser-check',origin+'/#topic=cpp.programming-process&stage=explanation&lang=ru'],{detached:true,stdio:'ignore'});p.on('error',e=>{process.stderr.write('Browser could not open: '+e.message+'\n');process.exitCode=1;});p.unref();}
process.stdout.write(`R3 review verified: ${origin}/\nAsset digest: ${result.assetDigest}\nReview only. Execution and durable private saving are pending pilot approval.\n`);
