// Узкая поправка UI поверх принятого main. Content, auth и серверный BFF защищены.
import assert from 'node:assert/strict';
import {readFile,access,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {readWorkerConfiguration} from './published-worker-configuration.mjs';
export const FIX_BASE='fa50859d5dcfa04181820fa2938dcb83cd0d3a45';
export const FIX_GENERATION='ui1a-startup-cinematic-launch-20261028';
export const FIX_META='startup-intro-launch-fix.json';
export const FIX_RECEIPT='docs/ru/07-ui/STARTUP_CINEMATIC_INTRO_LAUNCH_FIX_SCOPE.json';
export const FIX_RECEIPT_SHA256='16d310c98f283e80ce761659a1a746f79aa07f8bf4e2c27859b38c23b6d3e561';
export const FIX_ROOTS=['index.html','nexus-shell.html','offline.html','version.json','service-worker.js','BUILD_MANIFEST.json','startup-intro.json'];
export const FIX_PRODUCT=['core/app.js','core/startup-intro.js','core/startup-intro-policy.js','core/startup-intro-launch.js','styles/startup-intro.css','server-access/public/entry.js','server-access/public/startup-intro-loader.js','server-access/image/public/entry.js','tools/build-ui1a-release.mjs','tools/build-startup-intro-launch-fix.mjs'];
const ci=new Set([FIX_META,FIX_RECEIPT,'tools/startup-intro-launch-fix-contract.mjs','tools/prepare-startup-intro-launch-fix.mjs','tools/check-startup-intro-launch-fix-ci.mjs','tools/startup-intro-contract.mjs','tools/check-startup-intro-ci.mjs','tools/build-startup-intro-candidate.mjs','tests/startup-intro-policy.test.mjs','tests/startup-intro-launch-browser-check.mjs','tests/startup-intro-launch-fix.test.mjs']);
export const hash=b=>createHash('sha256').update(b).digest('hex');
export function verifyFixRecord(r,b){assert.ok(typeof r.file==='string'&&!/[:\\?#\u0000]/.test(r.file)&&!r.file.startsWith('/')&&!r.file.split('/').some(x=>!x||x==='.'||x==='..'));assert.equal(b.length,r.bytes,r.file);assert.equal(hash(b),r.sha256,'Изменены bytes: '+r.file)}
export function validateFixMetadata(c){assert.ok(['startup-launch-ui-fix','startup-launch-ui-fix-rollback'].includes(c.kind));assert.deepEqual({...c,kind:'startup-launch-ui-fix'},{schema:1,kind:'startup-launch-ui-fix',baseCommit:FIX_BASE,generation:FIX_GENERATION,officialRelease:false,publicEntryDeploymentRequiresOwnerApproval:true})}
export async function verifyLaunchFix({root,writeEvidence=false}){
 const git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:256*1024*1024});
 const meta=JSON.parse(await readFile(path.join(root,FIX_META)));validateFixMetadata(meta);const rollback=meta.kind==='startup-launch-ui-fix-rollback';git('merge-base','--is-ancestor',FIX_BASE,'HEAD');
 const bytes=await readFile(path.join(root,FIX_RECEIPT));assert.equal(hash(bytes),FIX_RECEIPT_SHA256,'Receipt не расширяет область сам');const r=JSON.parse(bytes);assert.equal(r.baseCommit,FIX_BASE);assert.equal(r.generation,FIX_GENERATION);
 const records=new Map(r.files.map(x=>[x.file,x]));assert.equal(records.size,r.files.length);
 for(const x of r.files){assert.ok(FIX_PRODUCT.includes(x.file)||FIX_ROOTS.includes(x.file)||x.file.startsWith('releases/'+FIX_GENERATION+'/')||x.file.startsWith('entry-assets/'+FIX_GENERATION+'/'),'Чужая область '+x.file);const expected=rollback&&FIX_ROOTS.includes(x.file)?r.rollback.find(y=>y.file===x.file):x;assert.ok(expected);if(expected.absent){await assert.rejects(access(path.join(root,x.file)),{code:'ENOENT'})}else verifyFixRecord(expected,await readFile(path.join(root,x.file)))}
 for(const x of r.rollback.filter(x=>!x.absent))verifyFixRecord(x,git('show','d76d1613a1fbf6726d453e40366c306ea502d4c7:'+x.file));
 for(const f of [...FIX_PRODUCT,...FIX_ROOTS])assert.ok(records.has(f),'Нет обязательного файла '+f);
 const baseRows=git('ls-tree','-rz',FIX_BASE).toString().split('\0').filter(Boolean).map(row=>{const m=row.match(/^\d+ blob ([a-f0-9]+)\t(.+)$/s);assert.ok(m);return{sha:m[1],file:m[2]}}),baseFiles=new Set(baseRows.map(x=>x.file));
 for(const x of baseRows){if(records.has(x.file)||ci.has(x.file))continue;const b=await readFile(path.join(root,x.file)),actual=createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');assert.equal(actual,x.sha,'Защищённый файл изменён '+x.file)}
 const documentation=f=>/^docs\/ru\/07-ui\/STARTUP_CINEMATIC_INTRO_[A-Z_]+\.md$/.test(f);
 const dependency=f=>/^(?:server-access\/node_modules\/|tools\/qa-browser-driver\/node_modules\/|evidence-startup-intro\/)/.test(f);
 for(const file of git('ls-files','-z','--cached','--others','--exclude-standard').toString().split('\0').filter(Boolean))assert.ok(baseFiles.has(file)||records.has(file)||ci.has(file)||documentation(file)||dependency(file),'Неизвестный файл '+file);
 // В entry изменён только независимый вызов публичного UI. Ни одна ветвь
 // Passkey/OAuth/session/navigation, ни их порядок исполнения не изменены.
 const entry=(await readFile(path.join(root,'server-access/public/entry.js'),'utf8')).replaceAll('\r\n','\n').replace("import {startPublicIntro} from './startup-intro-loader.js';\n",'').replace(' startPublicIntro();\n','');
 assert.equal(entry,git('show',FIX_BASE+':server-access/public/entry.js').toString().replaceAll('\r\n','\n'));
 const m=JSON.parse(await readFile(path.join(root,'BUILD_MANIFEST.json'))),config=readWorkerConfiguration(await readFile(path.join(root,'service-worker.js'),'utf8'));
 assert.equal(m.assetGeneration,rollback?'ui1a-cpp-gold-module5-test2-header-20261027':FIX_GENERATION);assert.equal(config.generation,m.assetGeneration);if(!rollback)assert.equal(m.optionalAssets.length,12);
 for(const x of m.files)verifyFixRecord(x,await readFile(path.join(root,x.file)));
 if(!rollback){assert.equal(config.assets.some(x=>x.url.includes('/intro-media/')||x.url==='startup-intro.json'),false);const descriptor=JSON.parse(await readFile(path.join(root,'startup-intro.json')));assert.deepEqual(descriptor,{schema:1,module:'/releases/'+FIX_GENERATION+'/core/startup-intro.js'})}
 const result={status:'PASS',baseCommit:FIX_BASE,generation:m.assetGeneration,rollback,protectedFiles:baseRows.filter(x=>!records.has(x.file)&&!ci.has(x.file)).length,exactRecords:r.files.length,manifestFiles:m.files.length,contentRuntimeIdentityCloudAndBackendUnchanged:true,entryAuthBodyUnchanged:true,publicEntryRequiresSeparateOwnerApproval:true,production:false,officialRelease:false};
 if(writeEvidence){await mkdir(writeEvidence,{recursive:true});await writeFile(path.join(writeEvidence,'LAUNCH_FIX_CONTRACT.json'),JSON.stringify(result,null,2)+'\n')}
 return result;
}
