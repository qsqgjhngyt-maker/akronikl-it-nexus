import{readFile,stat,mkdir,writeFile}from'node:fs/promises';import path from'node:path';import assert from'node:assert/strict';
const visited=new Set();
async function walk(file){if(visited.has(file))return;visited.add(file);const code=await readFile(file,'utf8');for(const match of code.matchAll(/(?:^|;|\n)\s*(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?["']([^"']+)["']/gm))if(match[1].startsWith('.'))await walk(path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1])))}
await walk('core/app.js');let bytes=0;for(const file of visited)bytes+=(await stat(file)).size;
const outlineBytes=(await stat('courses/cpp/manifest.json')).size+(await stat('courses/cpp/curriculum.json')).size;
const labsBytes=Buffer.byteLength(JSON.stringify(JSON.parse(await readFile('courses/cpp/data/gold-laboratories.json')))),m6LabsBytes=(await stat('courses/cpp/data/gold-laboratories-m6.json')).size;
assert.ok(visited.size<=75&&bytes<=600000,'NEXUS-PERF-01 startup budget');assert.ok(outlineBytes<=30000&&labsBytes<=46000&&m6LabsBytes<=12000);
assert.equal([...visited].filter(f=>f.startsWith('sandbox/qt/')).length,0,'Qt SDK must remain lazy');
const result={status:'PASS / static NEXUS-PERF-01',staticModules:visited.size,staticBytes:bytes,capModules:75,capBytes:600000,outlineBytes,capOutlineBytes:30000,labsBytes,capLabsBytes:46000,m6LabsBytes,capM6LabsBytes:12000,qtOnStartup:false,fieldTimingMeasured:false};
if(process.env.NEXUS_QT_EVIDENCE_DIR){await mkdir(process.env.NEXUS_QT_EVIDENCE_DIR,{recursive:true});await writeFile(path.join(process.env.NEXUS_QT_EVIDENCE_DIR,'PERF.json'),JSON.stringify(result,null,2)+'\n')}
console.log(JSON.stringify(result));
