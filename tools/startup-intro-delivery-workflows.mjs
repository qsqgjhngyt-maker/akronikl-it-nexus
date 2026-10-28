// M5 сохраняет все настоящие browser/runtime suites. Только исторические
// source receipts выполняются в точной базе, с доказанно тем же Content/Identity.
import assert from 'node:assert/strict';
export const DELIVERY_WORKFLOWS=Object.freeze({
 '.github/workflows/academy-gold-cpp-module-5-preflight.yml':{invariants:'historical',native:'current',browser:'current','gold-regression':'current'},
 '.github/workflows/academy-gold-cpp-m5-acceptance.yml':{acceptance:'source-step','entry-transport':'current'}
});
export function routeDeliveryWorkflow(original,jobs){
 let text=original.replaceAll('\r\n','\n');
 // Новые main checks предварительно запускаются и в PR, до доставки посетителям.
 if(!text.includes('\n  pull_request:'))text=text.replace('\npermissions:',"\n  pull_request:\n    branches: [main]\n    paths:\n      - 'startup-intro-publication.json'\n      - 'tools/startup-intro-*.mjs'\n      - 'tools/check-startup-intro-*.mjs'\n      - 'tools/prepare-startup-intro-delivery.mjs'\n      - '.github/workflows/academy-gold-cpp-module-5-preflight.yml'\n      - '.github/workflows/academy-gold-cpp-m5-acceptance.yml'\npermissions:");
 const lines=text.split('\n'),out=[];let job,inserted=false,count=0;
 for(let i=0;i<lines.length;i++){
  let line=lines[i];const match=line.match(/^  ([a-z0-9-]+):$/);if(match){job=match[1];inserted=false}
  if(jobs[job]&&line==='      - uses: actions/checkout@v4'&&!lines[i+1]?.startsWith('        with:')){out.push(line,'        with:','          fetch-depth: 0');continue}
  if(jobs[job]&&/^      - name:/.test(line)&&!inserted){
   out.push('      - name: Node.js 24 для проверки точной доставки','        uses: actions/setup-node@v4','        with:',"          node-version: '24'",'      - name: Проверить точный Intro и сохранность прежней публикации','        id: startup_delivery','        run: node tools/check-startup-intro-delivery.mjs'+(['historical','source-step'].includes(jobs[job])?' --prepare-legacy':''));
   inserted=true;count++;
  }
  out.push(line);
  if(jobs[job]==='historical'&&inserted&&/^      - name:/.test(line))out.push('        working-directory: ${{ steps.startup_delivery.outputs.legacy_root }}');
  if(jobs[job]==='source-step'&&line==='      - name: Методическая правка, неизменность исполняемых контрактов и бюджет загрузки')out.push('        working-directory: ${{ steps.startup_delivery.outputs.legacy_root }}');
 }
 assert.equal(count,Object.keys(jobs).length);
 return out.join('\n').replaceAll('node tools/build-ui1a-release.mjs --out ', 'node tools/check-startup-intro-delivery.mjs --build ');
}
