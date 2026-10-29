// Private corpus text/IDs never enter evidence or network requests.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),dir=path.resolve('dependencies/phonemizer/package/build'),create=require(path.join(dir,'piper_phonemize.js'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const files=['piper_phonemize.wasm','piper_phonemize.data'];
const binary=fs.readFileSync(path.join(dir,files[0]));
for(const file of files)if(hash(fs.readFileSync(path.join(dir,file)))!==hash(fs.readFileSync(path.join('..','dependencies/piper-runtime-1.1.1',file))))throw Error('PHONEMIZER_DIFFERS_FROM_BROWSER');
const python=path.resolve('private/piper-training-env/Scripts/python.exe');
const native=JSON.parse(execFileSync(python,['piper-wasm-cache.py','read'],{encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024}));
const destination='private/piper4-wasm-phonemes.json';if(fs.existsSync(destination))throw Error('REFUSE_WASM_ROWS_OVERWRITE');
globalThis.fetch=()=>{throw Error('PREPROCESS_NETWORK_DISABLED');};
async function one(text){
 let payload;const module=await create({wasmBinary:binary,locateFile:n=>path.join(dir,n),print:s=>{try{const p=JSON.parse(s);if(p.phoneme_ids)payload=p;}catch{}},printErr:()=>{}});
 module.callMain(['-l','ru','--input',JSON.stringify([{text}]),'--espeak_data','/espeak-ng-data']);
 if(!Array.isArray(payload?.phoneme_ids)||!Array.isArray(payload?.phonemes))throw Error('NO_WASM_PHONEMES');return payload;
}
const rows=[];for(const row of native){const payload=await one(row.text);rows.push({...row,ids:payload.phoneme_ids,phonemes:payload.phonemes,processedText:payload.processed_text});global.gc?.();}
fs.writeFileSync(destination,JSON.stringify(rows),{flag:'wx'});
const report=execFileSync(python,['piper-wasm-cache.py','assemble'],{encoding:'utf8',windowsHide:true,maxBuffer:1024*1024});console.log(report.trim());
