import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const feature=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),training=path.resolve(process.argv[2]??'');
if(!process.argv[2]||!process.argv[3])throw Error('Usage: build-pronunciation-lexicon.mjs training-root new-output.js');
const destination=path.resolve(process.argv[3]);
const words=JSON.parse(fs.readFileSync(path.join(feature,'akronikl/experience/pronunciation-words.json'),'utf8'));
const nativeScript=`import sys,json,os\nsys.stdout.reconfigure(encoding='utf-8')\nsys.path.insert(0,${JSON.stringify(training)})\nfrom piper_training_environment import prepare_native_data\nprepare_native_data()\nfrom piper.phonemize_espeak import EspeakPhonemizer\np=EspeakPhonemizer()\nwords=json.load(open(${JSON.stringify(path.join(feature,'akronikl/experience/pronunciation-words.json'))},encoding='utf-8'))\nprint(json.dumps([p.phonemize('ru',w)[0] for w in words],ensure_ascii=True))\n`;
const to=JSON.parse(execFileSync(path.join(training,'private/piper-training-env/Scripts/python.exe'),['-X','utf8','-c',nativeScript],{encoding:'utf8',windowsHide:true,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},timeout:120000}));
const dir=path.join(training,'dependencies/phonemizer/package/build'),create=createRequire(import.meta.url)(path.join(dir,'piper_phonemize.js')),wasmBinary=fs.readFileSync(path.join(dir,'piper_phonemize.wasm'));
globalThis.fetch=()=>{throw Error('NETWORK_DISABLED');};
const rows=[];
for(let i=0;i<words.length;i++){
 const word=words[i].replaceAll('\u0301','');let payload;
 const module=await create({wasmBinary,locateFile:n=>path.join(dir,n),print:s=>{try{const p=JSON.parse(s);if(p.phoneme_ids)payload=p;}catch{}},printErr:()=>{}});
 module.callMain(['-l','ru','--input',JSON.stringify([{text:word}]),'--espeak_data','/espeak-ng-data']);
 if(!payload?.phonemes||!to[i]?.includes('ˈ'))throw Error('INVALID_LEXICON_ROW '+word);
 rows.push({word,accent:words[i],automatic:words.filter(w=>w.replaceAll('\u0301','')===word).length===1,from:payload.phonemes.join(''),to:to[i].join('')});global.gc?.();
}
const text='// Generated offline from pronunciation-words.json; full vowel/stress phonemes, not text accents.\nexport const PIPER_PRONUNCIATIONS=Object.freeze('+JSON.stringify(rows,null,2)+');\n';
fs.writeFileSync(destination,text,{flag:'wx'});
console.log(JSON.stringify({rows:rows.length,phoneticCorrections:rows.filter(r=>r.from!==r.to).length}));
