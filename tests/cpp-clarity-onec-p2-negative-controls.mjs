import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const repo=process.cwd(),out=process.env.NEXUS_CLARITY_EVIDENCE||'cpp-clarity-evidence';
const source=await readFile('tools/check-cpp-clarity-preservation.mjs','utf8');
const resolved=source.replace("'../core/academy-gold-catalog.js'",JSON.stringify(pathToFileURL(path.join(repo,'core/academy-gold-catalog.js')).href));
const cases=[
 ['new-css','styles/clarity-onec-p2-types.css',/Approved 1C presentation bytes/],
 ['import-css','courses/onec-education/candidate.css',/Approved 1C presentation bytes/],
 ['unapproved-style',null,/Out of scope: styles\/unapproved-p2.css/],
 ['qt-qa','.github/workflows/cpp-clarity-qt03-selected.yml',/Approved QA diagnostic bytes/],
 ['account-storage','core/account-storage.js',/core\/account-storage.js/]
];
const hashes=Object.fromEntries(await Promise.all(cases.filter(c=>c[1]).map(async c=>[c[1],createHash('sha256').update(await readFile(c[1])).digest('hex')])));
const results=[];
for(const[name,file,expected]of cases){
 let code=resolved;
 if(file){const header="import {readFile,mkdir,writeFile} from 'node:fs/promises';";assert.ok(code.includes(header));code=code.replace(header,"import {readFile as actualReadFile,mkdir,writeFile} from 'node:fs/promises';\nconst readFile=async(file,...args)=>{const value=await actualReadFile(file,...args);return String(file)==="+JSON.stringify(file)+"?(typeof value==='string'?value+'\\n/* QA negative control */':Buffer.concat([value,Buffer.from('\\n/* QA negative control */')])):value;};");}
 else{const anchor=".split('\\0').filter(Boolean);";assert.equal(code.split(anchor).length,2);code=code.replace(anchor,".split('\\0').filter(Boolean).concat('styles/unapproved-p2.css');");}
 let failed;try{await import('data:text/javascript;base64,'+Buffer.from(code+'\n// '+name).toString('base64'));}catch(e){failed=e;}
 assert.ok(failed,'Control must reject '+name);assert.match(failed.message,expected,name);results.push({name,expectedRejection:true,reason:failed.message.split('\n')[0],status:'PASS'});
}
for(const[file,before]of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),before,'Original file unchanged');
await mkdir(out,{recursive:true});await writeFile(path.join(out,'P2_PRESENTATION_NEGATIVE_CONTROLS.json'),JSON.stringify({status:'PASS',controls:results,productFilesMutated:false,sourceHashesUnchanged:hashes},null,2)+'\n');console.log('PASS:5 negative controls; actual product files unchanged');
