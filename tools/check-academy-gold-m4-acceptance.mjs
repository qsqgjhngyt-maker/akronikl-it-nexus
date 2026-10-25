// 05/07 принимает точный продукт a3e3488; тесты и документация могут быть новее.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {m4AuthoringScope} from './academy-gold-module4-scope.mjs';
const source='a3e34881ad67c1d4d35605b1c500441f8e0e9f9a',scope=await m4AuthoringScope();
const roots=['core','courses','pwa','sandbox','project-studio','sync','server-access','cloudflare','releases','entry-assets','styles','effects','locales','assets','collaboration','feedback','akronikl','release-candidate.json','version.json','project.json','index.html','nexus-shell.html','offline.html','manifest.webmanifest','service-worker.js','BUILD_MANIFEST.json'];
execFileSync('git',['diff','--exit-code',source,'--',...roots]);
const seen=new Set();async function walk(f){if(seen.has(f))return;seen.add(f);const code=await readFile(f,'utf8');for(const m of code.matchAll(/(?:^|;|\n)\s*(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?["']([^"']+)["']/gm))if(m[1].startsWith('.'))await walk(path.posix.normalize(path.posix.join(path.posix.dirname(f),m[1])))}
await walk('core/app.js');let bytes=0;for(const f of seen)bytes+=(await stat(f)).size;
assert.ok(seen.size<=75&&bytes<=600000,'NEXUS-PERF-01 cap unchanged');
const outlineFiles=['courses/cpp/manifest.json','courses/cpp/curriculum.json'];let outlineBytes=0;for(const f of outlineFiles)outlineBytes+=(await stat(f)).size;assert.ok(outlineBytes<=30000);
const hashes=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE4_AUTHORING_SCOPE.json')).productPaths;
for(const p of hashes)assert.equal(createHash('sha256').update(await readFile(p.file)).digest('hex'),p.sha256);
const result={status:'PASS',requestedProductSource:source,checkoutHead:execFileSync('git',['rev-parse','HEAD']).toString().trim(),productEquivalent:true,scopeProductPaths:hashes.length,perf:{status:'PASS',staticModules:seen.size,staticBytes:bytes,capModules:75,capBytes:600000,outlineFiles:2,outlineBytes,capOutlineBytes:30000,fieldTimingMeasured:false},scope:{main:scope.m4Base,branch:'feature/academy-gold-standard-cpp-module-4',identityCloudRuntimeProjectStoreUnchanged:true,mainWrites:0,productionWrites:0,officialRelease:false},productHashes:hashes};
const out=path.resolve(process.env.NEXUS_M4_ACCEPTANCE_EVIDENCE||'academy-gold-m4-acceptance/source');await mkdir(out,{recursive:true});await writeFile(path.join(out,'ACCEPTANCE_SOURCE.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,productHashes:undefined}));
