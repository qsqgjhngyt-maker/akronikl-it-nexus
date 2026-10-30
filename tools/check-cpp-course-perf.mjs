import{readFile,stat,mkdir,writeFile}from'node:fs/promises';import path from'node:path';import assert from'node:assert/strict';
const visited=new Set();
async function walk(file){if(visited.has(file))return;visited.add(file);const code=await readFile(file,'utf8');for(const match of code.matchAll(/(?:^|;|\n)\s*(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?["']([^"']+)["']/gm))if(match[1].startsWith('.'))await walk(path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1])))}
await walk('core/app.js');let bytes=0;for(const file of visited)bytes+=(await stat(file)).size;
const outlineBytes=(await stat('courses/cpp/manifest.json')).size+(await stat('courses/cpp/curriculum.json')).size;
const labsBytes=Buffer.byteLength(JSON.stringify(JSON.parse(await readFile('courses/cpp/data/gold-laboratories.json')))),m6LabsBytes=(await stat('courses/cpp/data/gold-laboratories-m6.json')).size;
// P4-Q: four small UI modules, measured 79 / 629956 source bytes.
// This static budget does not measure field launch latency.
assert.ok(visited.size<=80&&bytes<=640000,'P4Q startup source budget');assert.ok(outlineBytes<=30000&&labsBytes<=46000&&m6LabsBytes<=12000);
for(const file of ['sandbox/sandbox.js','effects/nexus-graphics-workshop.js','core/administration.js'])assert.ok(!visited.has(file),'Heavy tool must remain lazy: '+file);
assert.equal([...visited].filter(f=>f.startsWith('sandbox/qt/')).length,0,'Qt SDK must remain lazy');
const result={status:'PASS / static P4Q startup source budget',staticModules:visited.size,staticBytes:bytes,capModules:80,capBytes:640000,outlineBytes,capOutlineBytes:30000,labsBytes,capLabsBytes:46000,m6LabsBytes,capM6LabsBytes:12000,qtOnStartup:false,fieldTimingMeasured:false};
if(process.env.NEXUS_QT_EVIDENCE_DIR){await mkdir(process.env.NEXUS_QT_EVIDENCE_DIR,{recursive:true});await writeFile(path.join(process.env.NEXUS_QT_EVIDENCE_DIR,'PERF.json'),JSON.stringify(result,null,2)+'\n')}
console.log(JSON.stringify(result));
