// Сравнение с подтверждённым main; production не вызывается.
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const featureBase=process.env.NEXUS_GOLD_INTEGRATION_BASE;
if(featureBase&&featureBase!=='d9249b2e977483718cd67a151f62552296dd51e4')throw Error('Неподтверждённая integration base');
const main=featureBase||'02369149b465a98c0f3ff780b8c59add36e52e1b';
const out=path.resolve(process.env.NEXUS_GOLD_EVIDENCE||'academy-gold-evidence','integration');
await mkdir(out,{recursive:true});
const publication=!featureBase&&JSON.parse(await readFile(new URL('../release-candidate.json',import.meta.url),'utf8')).publication?.sourceCommit===main;
const checks=[
 publication?['Новая тестовая публикация, точные исходники и сохранённый rollback',process.execPath,['tools/check-academy-gold-publication.mjs']]:['Сохранены опубликованные файлы и кандидаты main','git',['diff','--exit-code',main,'--','index.html','nexus-shell.html','offline.html','version.json','service-worker.js','BUILD_MANIFEST.json','release-candidate.json','project.json','releases','entry-assets']],
 ['Сохранены Identity, Cloud, state; runtime patch ограничен согласованными путями','git',['diff','--exit-code',main,'--','core/storage.js','core/account-storage.js','core/identity.js','core/migrations','sync','sandbox','project-studio','server-access','cloudflare','pwa/local-vault.js','pwa/offline-learning.js','pwa/runtime-manifest.js','pwa/service-worker.js',':(exclude)sandbox/providers/browser-runtime.js',...(featureBase?[':(exclude)sandbox/runtime-router.js']:[])]],
 ['Сохранены ID и базовые учебные объекты main','git',['diff','--exit-code',main,'--','courses/cpp/curriculum.json','courses/cpp/content-package.json','courses/cpp/data','courses/cpp/manifest.json']],
 ['Загрузка, представления, отложенные импорты и media',process.execPath,['--test','tests/platform-startup-load.test.mjs','tests/platform-startup-views.test.mjs','tests/platform-lazy-imports.test.mjs','tests/blog-media-perf-guard.test.mjs']],
 ...['auth-bootstrap','account-control-transport','entry-document-navigation','oauth-link-client','pwa-public-install','blog-layout-security','blog-presentation-security','blog-legacy-compat','ui1a-versioned-build'].map(name=>[name,process.execPath,['tests/'+name+'-check.mjs']])
];
const results=[];
for(const [name,command,args] of checks){
 const started=performance.now();
 const r=spawnSync(command,args,{encoding:'utf8',timeout:120000,maxBuffer:4194304});
 const log=String(results.length+1).padStart(2,'0')+'.txt';
 await writeFile(path.join(out,log),(r.stdout||'')+(r.stderr||'')+(r.error?.message||''));
 results.push({name,status:r.status===0?'PASS':'FAIL',exitCode:r.status,durationMs:Math.round(performance.now()-started),log});
 console.log(results.at(-1).status+' '+name);
}
await writeFile(path.join(out,'RESULT.json'),JSON.stringify({main,results,productionExecution:false,physicalDevice:false},null,2)+'\n');
if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
