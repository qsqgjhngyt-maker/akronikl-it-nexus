import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const sha256 = data => createHash('sha256').update(data).digest('hex');
const baseline = JSON.parse(await readFile(new URL('docs/ru/08-assistant/BASELINE_AKRONIKL_0.json', root), 'utf8'));
const failures = [];
for (const [path, expected] of Object.entries(baseline.files)) {
  try {
    const data = await readFile(new URL(path, root));
    const blob = createHash('sha1').update('blob ' + data.length + '\0').update(data).digest('hex');
    if (blob !== expected.gitBlobSha || sha256(data) !== expected.sha256 || data.length !== expected.bytes) failures.push(path);
  } catch { failures.push(path); }
}
const modules = (await readdir(new URL('akronikl/core/', root))).filter(path => path.endsWith('.js')).sort();
const sizes = await Promise.all(modules.map(async path => ({ path: 'akronikl/core/' + path, bytes: (await stat(new URL('akronikl/core/' + path, root))).size })));
const manifest = JSON.parse(await readFile(new URL('akronikl/knowledge/manifest.json', root), 'utf8'));
const output = {
  status: failures.length ? 'FAIL' : 'PASS', baseline: baseline.sourceCommit,
  verifiedBaselineFiles: Object.keys(baseline.files).length, changedBaselineFiles: failures,
  coreModules: sizes, coreSourceBytes: sizes.reduce((sum, item) => sum + item.bytes, 0),
  preparedIndexBytes: manifest.indexes.reduce((sum, item) => sum + item.bytes, 0),
  runtimeWiring: 'not-connected', browserLive: 'not-run', physicalDevices: 'not-run',
  note: 'Проверены точные байты выбранных исходников. Полное сохранение дерева main дополнительно проверяется сравнением GitHub candidate с исходным commit.'
};
console.log(JSON.stringify(output, null, 2));
if (failures.length) process.exitCode = 1;
