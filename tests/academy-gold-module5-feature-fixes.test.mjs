import test from'node:test';import assert from'node:assert/strict';import{readFile,mkdtemp}from'node:fs/promises';import{tmpdir}from'node:os';import path from'node:path';import{execFileSync}from'node:child_process';
import{m5FeatureFixScope,verifyM5FeatureBytes,verifyM5FeatureQaBuild}from'../tools/academy-gold-module5-feature-fixes.mjs';
const meta=JSON.parse(await readFile('release-candidate.json'));
if(['production-test-header','production-test-header-rollback'].includes(meta.publication?.kind)){
 const{verifyM5HeaderPublication,verifyM5HeaderReceipt,verifyM5HeaderRecord}=await import('../tools/academy-gold-module5-header-publication.mjs');
 const receiptBytes=await readFile('docs/ru/03-content/CPP_MODULE5_HEADER_PUBLICATION_SCOPE.json'),receipt=verifyM5HeaderReceipt(receiptBytes);
 test('Новая публикация закрепляет принятый source, BFF и отдельное поколение',async()=>{
  const r=await verifyM5HeaderPublication({writeEvidence:false});assert.equal(r.status,'PASS');assert.equal(r.bffBrowserBundlesMatchLiveFix,true);assert.equal(r.backendServerUnchanged,true);assert.equal(r.historicalGenerationsUnchanged,true);
 });
 test('Прежний build не выдаётся за Test.2',async()=>{
  const actual=JSON.parse(await readFile('BUILD_MANIFEST.json'));assert.equal(actual.assetGeneration,meta.assetGeneration);
  if(meta.publication.kind!=='production-test-header-rollback')await assert.rejects(verifyM5HeaderPublication({writeEvidence:false,readOutput:async f=>f==='BUILD_MANIFEST.json'?execFileSync('git',['show',receipt.previousMain+':'+f]):readFile(f)}));
  else assert.equal(meta.assetGeneration,receipt.previousGeneration);
 });
 test('Изменённые CSS, BFF bundle и private SW policy отклоняются',async()=>{
  for(const target of ['pwa/offline.css','server-access/image/public/entry.js','service-worker.js'])await assert.rejects(verifyM5HeaderPublication({writeEvidence:false,readOutput:async f=>{const b=await readFile(f);return f===target?Buffer.concat([b,Buffer.from(' ')]):b;}}));
 });
 test('Receipt с пересчитанной собственной записью и выход за каталог отклоняются',async()=>{
  const fake=JSON.parse(receiptBytes);fake.files[0].sha256='0'.repeat(64);assert.throws(()=>verifyM5HeaderReceipt(Buffer.from(JSON.stringify(fake))));
  for(const file of ['../outside','C:/outside','/outside'])assert.throws(()=>verifyM5HeaderRecord({file,bytes:0,sha256:'0'.repeat(64)},Buffer.alloc(0)));
 });
}else{
const scope=await m5FeatureFixScope();assert.ok(scope?.unpublished);let build;
const qa=()=>build??=(async()=>{if(process.env.NEXUS_FRONTEND_DIR)return path.resolve(process.env.NEXUS_FRONTEND_DIR);const out=path.join(await mkdtemp(path.join(tmpdir(),'nexus-feature-proof-')),'build');execFileSync(process.execPath,['tools/build-ui1a-release.mjs','--out',out],{stdio:'pipe'});return out;})();
test('Ровно две source правки; повреждённые bytes и пути отклоняются',async()=>{
 assert.deepEqual(scope.productPatchPaths,['pwa/offline.css','pwa/client.js']);for(const r of scope.sourceFiles){const b=await readFile(r.file);verifyM5FeatureBytes(r,b);assert.throws(()=>verifyM5FeatureBytes(r,Buffer.concat([b,Buffer.from(' ')])));assert.throws(()=>verifyM5FeatureBytes({...r,file:'../outside'},b));assert.throws(()=>verifyM5FeatureBytes({...r,file:'C:/outside'},b));}
});
test('Фактическая QA сборка: шесть derived файлов, прежний SW private/cache policy body',async()=>{const r=await verifyM5FeatureQaBuild(await qa(),scope);assert.equal(r.status,'PASS');assert.equal(r.publishable,false);assert.equal(r.changedPublicFiles.length,6);});
test('Старый опубликованный build не выдаётся за проверку нового исправления',async()=>{await assert.rejects(verifyM5FeatureQaBuild(process.cwd(),scope));});
test('Tampering CSS, worker и manifest не проходит даже с пересчитанным самодельным receipt',async()=>{
 const dir=await qa();for(const file of[scope.qaFiles.find(r=>r.file.endsWith('/pwa/offline.css')).file,'service-worker.js','BUILD_MANIFEST.json']){
  await assert.rejects(verifyM5FeatureQaBuild(dir,scope,{readOutput:async f=>{const b=await readFile(path.join(dir,f));return f===file?Buffer.concat([b,Buffer.from(' ')]):b;}}));
 }
 const fake=structuredClone(scope);fake.qaFiles[0].sha256='0'.repeat(64);await assert.rejects(verifyM5FeatureQaBuild(dir,fake),/authority/);
});

}
