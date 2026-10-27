import test from'node:test';import assert from'node:assert/strict';import{readFile,mkdtemp}from'node:fs/promises';import{tmpdir}from'node:os';import path from'node:path';import{execFileSync}from'node:child_process';
import{m5FeatureFixScope,verifyM5FeatureBytes,verifyM5FeatureQaBuild}from'../tools/academy-gold-module5-feature-fixes.mjs';
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
