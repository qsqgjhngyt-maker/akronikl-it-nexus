import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const out=path.resolve(process.env.NEXUS_GOLD_EVIDENCE||'academy-gold-evidence');await mkdir(out,{recursive:true});
const checks=[
 ['Контент CP-1.1',['tools/validate-content.mjs']],
 ['Content Quality Gate',['--test','tests/academy-gold-content.test.mjs','tests/content-contract.test.mjs']],
 ['Маршрутизация стандартного C++',['--test','tests/cpp-stream-state-routing.test.mjs']],
 ['Совместимость Browser runtime',['tests/runtime-capability-check.mjs']],
 ['Совместимость маршрутизатора языков',['tests/polyglot-runtime-check.mjs']],
 ...[
 'production-entry-syntax','benchmark-content','lesson-standard-freeze','programming-language-catalog','public-content','shared-learning-views','shared-presentation',
 'module-import-smoke','code-studio-foundation','project-studio-foundation','multi-file-code-studio','workspace-persistence-resume',
 'modern-cpp-compiler-integration','modern-cpp-safety-limits','modern-cpp-abi-alignment',
 'offline-learning','offline-transfer','offline-ui-esm-smoke','pwa-policy','pwa-controller','private-response-transport',
 'cloud-sync-client-transport','cloud-sync-session-first-migration','cloud-sync-ui','cloud-unified-client',
 'account-storage-isolation','identity-session-foundation','first-party-cookie-client','session-only-resume'
 ].map(n=>[n,['tests/'+n+(n==='offline-ui-esm-smoke'?'.mjs':'-check.mjs')]])
];
const results=[];
for(const [name,args] of checks){
 const start=performance.now(),r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:120000,maxBuffer:4194304});
 results.push({name,status:r.status===0?'PASS':'FAIL',exitCode:r.status,durationMs:Math.round(performance.now()-start),error:r.error?.message});
 await writeFile(path.join(out,String(results.length).padStart(2,'0')+'-'+name.replaceAll(/[^a-zA-Z0-9А-Яа-яЁё-]/g,'_')+'.txt'),(r.stdout||'')+(r.stderr||'')+(r.error?.message||''));
 console.log((r.status===0?'PASS ':'FAIL ')+name);
}
await writeFile(path.join(out,'regression-results.json'),JSON.stringify({results,physicalDevice:false,productionExecution:false},null,2)+'\n');
if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
