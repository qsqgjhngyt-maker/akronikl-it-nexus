// 05/07: a3e3488 плюс единственная точная редакторская поправка M4-05-P2-01.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,stat,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {m4AuthoringScope} from './academy-gold-module4-scope.mjs';
import {proveM4EditorialScope,M4_EDITORIAL_FILE} from './academy-gold-m4-editorial-scope.mjs';
if(JSON.parse(await readFile('release-candidate.json')).publication?.module==='cpp-module-5'){await import('./check-academy-gold-m5-acceptance.mjs');process.exit(0)}
const source='a3e34881ad67c1d4d35605b1c500441f8e0e9f9a',probe=process.argv.includes('--editorial-probe');
let scope,editorialCorrection;
try{scope=await m4AuthoringScope();if(scope.m4Publication){if(probe)throw Error('Публикация требует отдельного полного runtime gate');editorialCorrection={status:'EXACT_ACCEPTED_PUBLICATION',acceptedSource:scope.acceptedSource,checkedSource:scope.checkedSource,newWasmExecution:false};}else editorialCorrection=await proveM4EditorialScope();}
catch(error){
 if(!probe)throw error;
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'reuse_wasm=false\n');
 console.log(JSON.stringify({status:'NOT_APPLICABLE',reuseWasm:false,reason:'Нет точного доказательства единственной редакторской поправки; нужен полный runtime gate.'}));process.exit(0);
}
const seen=new Set();async function walk(f){if(seen.has(f))return;seen.add(f);const code=await readFile(f,'utf8');for(const m of code.matchAll(/(?:^|;|\n)\s*(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?["']([^"']+)["']/gm))if(m[1].startsWith('.'))await walk(path.posix.normalize(path.posix.join(path.posix.dirname(f),m[1])))}
await walk('core/app.js');let bytes=0;for(const f of seen)bytes+=(await stat(f)).size;
assert.ok(seen.size<=75&&bytes<=600000,'NEXUS-PERF-01 cap unchanged');
const outlineFiles=['courses/cpp/manifest.json','courses/cpp/curriculum.json'];let outlineBytes=0;for(const f of outlineFiles)outlineBytes+=(await stat(f)).size;assert.ok(outlineBytes<=30000);
const historicalHashes=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE4_AUTHORING_SCOPE.json')).productPaths;
// Новый renderer допустим только после exact publication proof двух pinned файлов.
const hashes=historicalHashes.map(p=>scope.presentationPatchHashes?.find(x=>x.file===p.file)||p);
for(const p of scope.presentationPatchHashes||[])if(!hashes.some(x=>x.file===p.file))hashes.push(p);
for(const p of hashes)assert.equal(createHash('sha256').update(await readFile(p.file)).digest('hex'),p.sha256);
const head=execFileSync('git',['rev-parse','HEAD']).toString().trim(),uncommittedProductEdit=!!execFileSync('git',['diff','--name-only','HEAD','--',M4_EDITORIAL_FILE]).toString().trim();
const result={status:'PASS',baselineProductSource:source,checkoutHead:head,uncommittedProductEdit,productEquivalent:false,executableContractsEquivalent:true,editorialCorrection,scopeProductPaths:hashes.length,perf:{status:'PASS',staticModules:seen.size,staticBytes:bytes,capModules:75,capBytes:600000,outlineFiles:2,outlineBytes,capOutlineBytes:30000,fieldTimingMeasured:false},scope:{main:scope.m4Base,branch:'feature/academy-gold-standard-cpp-module-4',identityCloudRuntimeProjectStoreUnchanged:true,mainWrites:0,productionWrites:0,officialRelease:false},productHashes:hashes};
const out=path.resolve(process.env.NEXUS_M4_ACCEPTANCE_EVIDENCE||'academy-gold-m4-acceptance/source');await mkdir(out,{recursive:true});await writeFile(path.join(out,'ACCEPTANCE_SOURCE.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,productHashes:undefined}));
if(probe&&process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'reuse_wasm=true\n');
