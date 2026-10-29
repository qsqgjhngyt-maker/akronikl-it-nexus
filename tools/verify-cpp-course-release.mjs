// Тег сам по себе не доказывает готовность: проверяем законченный акт LIVE.
import assert from'node:assert/strict';import{readFile,mkdir,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';import path from'node:path';
const tag=process.env.COURSE_RELEASE_TAG;assert.match(tag||'',/^cpp-gold-course-v\d+\.\d+\.\d+$/);const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();execFileSync('git',['merge-base','--is-ancestor',head,'origin/main']);
const proof=JSON.parse(await readFile('docs/ru/05-release/CPP_COURSE_PUBLICATION_EVIDENCE.json'));
assert.equal(proof.status,'FULL LIVE PASS');assert.equal(proof.courseVersion,tag);assert.equal(proof.extraBudgetRub,0);assert.equal(proof.privateAnswerKeysPublished,false);
for(const key of['ci','backend','frontend','qtRuntime','gplSourceDelivery','rollback','accountPreserved','progressPreserved','projectsPreserved','ownerPc','ownerPhone','introRefresh'])assert.equal(proof.gates[key],'PASS',key);
assert.match(proof.acceptedSource,/^[a-f0-9]{40}$/);execFileSync('git',['merge-base','--is-ancestor',proof.acceptedSource,head]);
const manifest=JSON.parse(await readFile('BUILD_MANIFEST.json'));assert.equal(proof.assetGeneration,manifest.assetGeneration);const version=JSON.parse(await readFile('version.json'));assert.equal(proof.version,version.version);assert.equal(version.assetGeneration,manifest.assetGeneration);
assert.equal(proof.ownerRefresh?.version,version.version,'Refresh принят на текущей версии');
for(const device of['pc','phone'])assert.equal(proof.ownerRefresh?.[device],'PASS','Refresh '+device);
for(const row of manifest.files){const b=await readFile(row.file);assert.equal(b.length,row.bytes,row.file);assert.equal(createHash('sha256').update(b).digest('hex'),row.sha256,row.file)}
const out=path.resolve(process.env.COURSE_RELEASE_OUT_DIR||'/tmp/nexus-cpp-release');assert.ok(out!==process.cwd()&&!out.startsWith(process.cwd()+path.sep));await mkdir(out,{recursive:true});
// Реестр SHA и протокол не включают закрытые источники, аккаунты или cookies.
await writeFile(path.join(out,'CPP_COURSE_PUBLICATION_EVIDENCE.json'),JSON.stringify(proof,null,2)+'\n');await writeFile(path.join(out,'BUILD_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(path.join(out,'SHA256SUMS.txt'),manifest.files.map(r=>r.sha256+'  '+r.file).join('\n')+'\n');
assert.match(proof.baselineCommit,/^[a-f0-9]{40}$/);execFileSync(process.env.COURSE_RELEASE_PYTHON||'python3',['tools/package-cpp-course-release.py','--root','.','--baseline',proof.baselineCommit,'--out',out],{stdio:'inherit'});
console.log(JSON.stringify({status:'PASS / official course release gate',tag,head,files:manifest.files.length,physicalPcAndPhone:true}));
