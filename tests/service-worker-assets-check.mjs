import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const assert=(v,m)=>{if(!v)throw new Error(m)};
assert(sw.includes("akronikl-it-nexus-v0.1.5-alpha.2.2"),'service worker cache version mismatch');
const match=sw.match(/const CORE=(\[[^;]+\]);/s);assert(match,'CORE asset list not found');
const assets=JSON.parse(match[1]);
for(const asset of assets){
  if(asset==='./')continue;
  const file=path.join(root,asset.replace(/^\.\//,''));
  assert(fs.existsSync(file),`missing service worker asset ${asset}`);
}
for(const required of ['./sandbox/provider-contract.js','./sandbox/languages.js','./sandbox/runtime-assets.js','./sandbox/runtime-router.js','./sandbox/workers/wasm-runtime-worker.js','./courses/programming/languages.json'])assert(assets.includes(required),`new runtime asset not cached: ${required}`);
console.log('SERVICE_WORKER_ASSETS_PASS',assets.length);
