import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
const root=path.dirname(fileURLToPath(import.meta.url)),task=path.dirname(root),feature=path.join(task,'feature');
const {pronunciationText,pronunciationIds}=await import(pathToFileURL(path.join(feature,'akronikl/experience/piper-pronunciation.js')));
const source=JSON.parse(fs.readFileSync(path.join(root,'evidence/TEACHER6_GENERATION.json'),'utf8'));
const dir=path.join(task,'cloud-dialogue-round-20261029/dependencies/phonemizer/package/build'),create=createRequire(import.meta.url)(path.join(dir,'piper_phonemize.js')),wasmBinary=fs.readFileSync(path.join(dir,'piper_phonemize.wasm')),map=JSON.parse(fs.readFileSync(path.join(root,'private/dataset6/voice.onnx.json'),'utf8')).phoneme_id_map;
globalThis.fetch=()=>{throw Error('NETWORK_DISABLED')};const rows=[];
for(const id of ['teacher6-03','teacher6-15']){
 const row=source.rows.find(r=>r.id===id);if(row?.split!=='control')throw Error('CONTROL_LEAK');const text=row.qwenPrompt??row.text;let payload;
 const m=await create({wasmBinary,locateFile:n=>path.join(dir,n),print:s=>{try{const p=JSON.parse(s);if(p.phoneme_ids)payload=p;}catch{}},printErr:()=>{}});m.callMain(['-l','ru','--input',JSON.stringify([{text:pronunciationText(text)}]),'--espeak_data','/espeak-ng-data']);
 rows.push({id,text,reference:row.file,referenceSha256:row.wavSha256,ids:pronunciationIds(text,payload,map)});global.gc?.();
}
fs.writeFileSync(path.join(root,'evidence/PILOT6_HOLDOUT_INPUTS.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({heldOutRows:rows.length,fitUsed:false}));
