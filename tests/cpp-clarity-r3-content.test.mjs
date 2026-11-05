import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const root='review/cpp-clarity-r3/',doc='docs/ru/03-content/cpp-clarity-01/';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
test('R3 maps every original fragment, preserves its hash and targets a real lesson stage or section',async()=>{const m=await read(doc+'R3_FRAGMENT_MAP.json');assert.equal(m.sourceFiles.length,6);let leaves=0;for(const f of m.sourceFiles){const bytes=await fs.readFile(f.file);assert.equal(sha(bytes),f.sha256);const walk=(v,p='')=>{if(v&&typeof v==='object')for(const[k,x]of Object.entries(v))walk(x,p+'/'+k.replaceAll('~','~0').replaceAll('/','~1'));else{leaves++;const match=m.fragments.filter(r=>r.sourceFile===f.file&&r.pointer===p);assert.equal(match.length,1,f.file+p);assert.equal(match[0].fragmentSha256,sha(JSON.stringify(v)));}};walk(JSON.parse(bytes));}assert.equal(m.fragments.length,leaves);for(const r of m.fragments){
 assert.ok(['metadata','rewritten','partial','deferred','historical-work'].includes(r.disposition));
 assert.equal(r.sourceLocator,r.sourceFile+'#'+r.pointer);
 assert.ok(r.why.length>15);
 if(['rewritten','partial'].includes(r.disposition))assert.ok(r.targets.length>0);
 else assert.deepEqual(r.targets,[],'No invented destination for metadata/history/deferred');
 if(r.disposition==='partial')assert.ok(r.pending.length>15);
 for(const target of r.targets){const[file,anchor]=target.split('#');const l=await read(root+'lessons/'+file);assert.ok(['practice','selfcheck',...l.sections.map(s=>s.id)].includes(anchor));}
 }
 for(const locale of ['ru','en']){const fragment=p=>m.fragments.find(r=>r.sourceFile===`courses/cpp/gold/algorithms/programming-process.${locale}.json`&&r.pointer===p);
 assert.deepEqual(fragment('/concepts/3/definition').targets,[`cpp.programming-process.${locale}.json#predict-and-diagnose`]);
 assert.equal(fragment('/sections/5/paragraphs/1').disposition,'partial');assert.match(fragment('/sections/5/paragraphs/1').pending,/std::cin/);
 assert.equal(fragment('/sections/6/paragraphs/0').disposition,'deferred');
 }
});
test('R3 external practice provides self-contained questions and an exact query-to-BSL bridge',async()=>{
 const server=await fs.readFile(root+'code/УчебныеСоединенияR3.bsl','utf8');
 for(const locale of ['ru','en']){
 const b=await read(root+`lessons/onec.p2.topic-1.${locale}.json`);const q=b.selfcheck.find(q=>q.id==='bsl-explain');assert.equal(q.code,b.sections.find(s=>s.id==='calculation').code.source);
 const j=await read(root+`lessons/onec.p7.topic-2.${locale}.json`);assert.ok(b.practice.externalRoute.includes('F7'));assert.ok(j.practice.externalRoute.includes('F5'));
 for(const fn of j.practice.transfer.functions)assert.ok(server.includes(fn),'Displayed full function must be native source');
 assert.equal(j.practice.transfer.functions.length,2);assert.match(j.practice.transfer.calls,/Данные.Ключи/);
 const cpp=await read(root+`lessons/cpp.programming-process.${locale}.json`);for(const section of cpp.sections)for(const c of section.clarifications||[])for(const link of c.links||[])assert.ok((link.text||link.label||link.title)?.trim());
 }
});
test('R3 uses three canonical IDs in both languages, matching program cases and real prerequisites/neighbours',async()=>{const c=await read(root+'courses.json'),ids=c.flatMap(c=>c.topics.map(t=>t.id));assert.equal(c.find(c=>c.id==='cpp').topics.length,67);for(const id of ['cpp.programming-process','onec.p2.topic-1','onec.p7.topic-2']){const ru=await read(root+'lessons/'+id+'.ru.json'),en=await read(root+'lessons/'+id+'.en.json');assert.equal(ru.id,id);assert.equal(en.id,id);assert.deepEqual(ru.sections.map(s=>s.id),en.sections.map(s=>s.id));assert.deepEqual(ru.selfcheck.map(q=>({id:q.id,correct:q.correct})),en.selfcheck.map(q=>({id:q.id,correct:q.correct})));for(const d of [ru,en])for(const p of d.prerequisites)if(p.target)assert.ok(ids.includes(p.target));if(ru.programChecks)assert.deepEqual(ru.programChecks,en.programChecks);if(ru.nativePrograms)assert.deepEqual(ru.nativePrograms,en.nativePrograms);}const cpp=c.find(c=>c.id==='cpp');assert.equal(cpp.topics[0].id,'cpp.programming-process');assert.equal(cpp.topics[1].id,'cpp.algorithm-definition-properties');});
test('R3 runtime evidence binds to the presented C++ programs and current BSL files, not historical PASS',async()=>{const cpp=await read(root+'lessons/cpp.programming-process.ru.json'),result=await read(doc+'R3_EVIDENCE/R3_CPP_RESULT.json');assert.equal(result.rows.length,cpp.programChecks.length);for(const p of cpp.programChecks){const r=result.rows.find(r=>r.name===p.name);assert.equal(r.sourceSha256,sha(p.source));assert.equal(r.stdout,p.stdout);assert.equal(r.provider,'wasm-cpp');}const native=await read(doc+'R3_EVIDENCE/R3_NATIVE_RESULT.json');assert.equal(native.training1508Tested,false);assert.equal(native.queryTransferFromDisplayedFunctions,true);assert.equal(native.runnerSha256,sha(await fs.readFile('tools/check-cpp-clarity-r3-native.ps1')));for(const s of native.sources)assert.equal(sha(await fs.readFile(root+'code/'+s.file)),s.sha256);const bsl=await read(root+'lessons/onec.p2.topic-1.ru.json');for(const p of bsl.nativePrograms){const r=native.cases.find(c=>c.name===p.name);assert.equal(Number(r.observed),p.value);}});

test('R3 fingerprint is identical across locales and preserves the accepted asset bytes',async()=>{
 const {execFileSync}=await import('node:child_process');
 const {fingerprintReviewAssets,ASSET_DIGEST_ALGORITHM}=await import('../tools/build-cpp-clarity-r3-manifest.mjs');
 const expected=await read(doc+'R3_ASSET_MANIFEST.json');
 const historical=JSON.parse(execFileSync('git',['-c','core.longpaths=true','show','8bccaf5308b18c6211bb402f6f72943f18d9fac4:'+doc+'R3_ASSET_MANIFEST.json'],{encoding:'utf8'}));
 assert.equal(expected.assetDigestAlgorithm,ASSET_DIGEST_ALGORITHM);
 assert.deepEqual(new Map(expected.files.map(f=>[f.path,f.sha256])),new Map(historical.files.map(f=>[f.path,f.sha256])),'No accepted lesson or screen bytes changed');
 for(const locale of ['ru_RU.UTF-8','en_US.UTF-8','C']){
  const child=JSON.parse(execFileSync(process.execPath,['tools/preview-cpp-clarity-r3.mjs','--fingerprint','yes'],{encoding:'utf8',env:{...process.env,LANG:locale,LC_ALL:locale}}));
  assert.equal(child.assetDigest,expected.assetDigest);assert.equal(child.assetDigestAlgorithm,ASSET_DIGEST_ALGORITHM);
 }
 assert.equal(fingerprintReviewAssets(root).assetDigest,expected.assetDigest);
 const ru=historical.files.slice().sort((a,b)=>a.path.localeCompare(b.path,'ru'));
 const en=historical.files.slice().sort((a,b)=>a.path.localeCompare(b.path,'en'));
 assert.notEqual(sha(JSON.stringify(ru)),sha(JSON.stringify(en)),'Reproduce the original locale-dependent defect');
});
test('R3 fingerprint detects changed file bytes independently of filenames',async()=>{
 const os=await import('node:os'),path=await import('node:path');
 const {fingerprintReviewAssets}=await import('../tools/build-cpp-clarity-r3-manifest.mjs');
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'r3-fingerprint-'));
 const file=path.join(folder,'Урок.json');
 try{await fs.writeFile(file,'accepted');const before=fingerprintReviewAssets(folder);await fs.writeFile(file,'changed');const after=fingerprintReviewAssets(folder);assert.notEqual(before.assetDigest,after.assetDigest);assert.equal(before.files[0].path,after.files[0].path);}
 finally{await fs.unlink(file);await fs.rmdir(folder);}
});
