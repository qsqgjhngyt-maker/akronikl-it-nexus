// Проверка staging-сборки: точные байты и наличие публичного графа Akronikl.
// Не публикует файлы, не меняет version/release metadata или backend.
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source = fileURLToPath(new URL('../', import.meta.url));
const frontend = process.env.NEXUS_FRONTEND_DIR;
if (!frontend) throw Error('NEXUS_FRONTEND_DIR_REQUIRED');
const out = process.env.NEXUS_AKRONIKL_EVIDENCE;
if (!out) throw Error('NEXUS_AKRONIKL_EVIDENCE_REQUIRED');
await mkdir(out, {recursive:true});
const manifest = JSON.parse(await readFile(path.join(frontend, 'BUILD_MANIFEST.json')));
const sha = data => createHash('sha256').update(data).digest('hex');
const checks = [];
const check = async (name, run) => {await run(); checks.push({name,status:'PASS'}); console.log('PASS '+name);};
let fatal;
try {
  await check('Все файлы сборки совпадают с BUILD_MANIFEST', async () => {
    const seen = new Set();
    for (const record of manifest.files) {
      assert.ok(!seen.has(record.file)); seen.add(record.file);
      const target = path.resolve(frontend, record.file);
      assert.ok(target.startsWith(path.resolve(frontend)+path.sep));
      const bytes = await readFile(target);
      assert.equal(bytes.length,record.bytes,record.file); assert.equal(sha(bytes),record.sha256,record.file);
    }
  });
  await check('UI, Core и оба индекса сохранены без преобразования исходников', async () => {
    const records = manifest.files.filter(r=>r.file.startsWith(manifest.prefix+'akronikl/'));
    assert.ok(records.length>=17);
    for (const record of records) assert.deepEqual(await readFile(path.join(frontend,record.file)),await readFile(path.join(source,record.file.slice(manifest.prefix.length))));
    for (const file of ['ui/bridge.js','ui/panel.js','ui/panel.css','ui/nexus-host.js','ui/knowledge-loader.js','core/index.js','knowledge/manifest.json','knowledge/core-index.ru.json','knowledge/core-index.en.json']) assert.ok(records.some(r=>r.file===manifest.prefix+'akronikl/'+file),file);
  });
  await check('Обе оболочки ссылаются на отдельное staging-поколение', async () => {
    for (const [file,entry] of [['nexus-shell.html','core/bootstrap.js'],['offline.html','pwa/offline-entry.js']]) {
      const html=await readFile(path.join(frontend,file),'utf8');
      assert.ok(html.includes(manifest.prefix+entry));
      const generations = [...html.matchAll(/releases\/(ui1a-[a-z0-9-]+)\//g)].map(m=>m[1]);
      assert.ok(generations.length>0); assert.deepEqual([...new Set(generations)],[manifest.assetGeneration]);
    }
  });
  await check('PWA identity и version bytes не переопределены', async () => {
    for (const file of ['manifest.webmanifest','version.json']) assert.deepEqual(await readFile(path.join(frontend,file)),await readFile(path.join(source,file)));
    assert.equal(manifest.version,JSON.parse(await readFile(path.join(source,'version.json'))).version);
    assert.ok(manifest.verifiedWorkerIncluded);
  });
} catch (error) {fatal={message:error.message}; console.error(error); process.exitCode=1;}
await writeFile(path.join(out,'BUILD_CHECK.json'),JSON.stringify({status:fatal?'FAIL':'PASS',checks,fatal,sourceCommit:process.env.NEXUS_SOURCE_COMMIT||null,generation:manifest.assetGeneration,files:manifest.files.length,buildManifestSha256:sha(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),productionPublication:false},null,2)+'\n');
