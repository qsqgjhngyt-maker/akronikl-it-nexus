// Узкое доказательство M4-05-P2-01; любое другое изменение требует полного runtime gate.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {module4GoldPrograms} from '../tests/helpers/module4-gold-programs.mjs';
export const M4_EDITORIAL_BASE='a3e34881ad67c1d4d35605b1c500441f8e0e9f9a';
export const M4_EDITORIAL_FILE='courses/cpp/gold/classic/associative-containers.en.json';
export const M4_EDITORIAL_BEFORE='counts[word] inserts a missing key with a default-initialized mapped value. For int that is zero';
export const M4_EDITORIAL_AFTER='counts[word] inserts a missing key with a value-initialized mapped value. For int with the standard allocator that is zero';
export const M4_PROGRAM_MANIFEST_SHA256='85597d8e49fd3fc8d18a46d9fcaf999246efa405706a53c136b66aca59723fe7';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function verifyM4EditorialBytes(before,after){
 assert.equal(before.split(M4_EDITORIAL_BEFORE).length,2,'Exactly one known editorial fragment');
 assert.equal(after,before.replace(M4_EDITORIAL_BEFORE,M4_EDITORIAL_AFTER),'Only the exact P2 wording may differ');
}
export async function proveM4EditorialScope(){
 const git=(...a)=>execFileSync('git',a,{maxBuffer:64*1024*1024}).toString();
 assert.equal(process.env.GITHUB_REF_NAME||git('branch','--show-current').trim(),'feature/academy-gold-standard-cpp-module-4');
 const before=git('show',M4_EDITORIAL_BASE+':'+M4_EDITORIAL_FILE),after=await readFile(M4_EDITORIAL_FILE,'utf8');verifyM4EditorialBytes(before,after);
 const roots=['core','courses','pwa','sandbox','project-studio','sync','server-access','cloudflare','releases','entry-assets','styles','effects','locales','assets','collaboration','feedback','akronikl','release-candidate.json','version.json','project.json','index.html','nexus-shell.html','offline.html','manifest.webmanifest','service-worker.js','BUILD_MANIFEST.json'];
 git('diff','--exit-code',M4_EDITORIAL_BASE,'--',...roots,':(exclude)'+M4_EDITORIAL_FILE);
 assert.equal(git('ls-files','--others','--exclude-standard','--',...roots).trim(),'','No untracked product files');
 git('diff','--exit-code',M4_EDITORIAL_BASE,'--','tests/helpers/module4-gold-programs.mjs','tests/helpers/module4-file-properties.mjs');
 const scopeFile='docs/ru/03-content/CPP_MODULE4_AUTHORING_SCOPE.json',oldScope=JSON.parse(git('show',M4_EDITORIAL_BASE+':'+scopeFile)),newScope=JSON.parse(await readFile(scopeFile));
 oldScope.productPaths.find(p=>p.file===M4_EDITORIAL_FILE).sha256=hash(after);assert.deepEqual(newScope,oldScope,'Only corrected EN SHA256 changes in scope');
 const programs=await module4GoldPrograms(),cases=programs.reduce((n,p)=>n+p.cases.length,0),manifestSha256=hash(JSON.stringify(programs));
 assert.equal(programs.length,35);assert.equal(cases,190);assert.equal(manifestSha256,M4_PROGRAM_MANIFEST_SHA256,'Every source/file/metadata/case/alias remains identical');
 return{status:'PASS',defect:'M4-05-P2-01',baselineProductSource:M4_EDITORIAL_BASE,changedProductPaths:[M4_EDITORIAL_FILE],beforeSha256:hash(before),afterSha256:hash(after),programs:35,cases,programManifestSha256:manifestSha256,executableContractsEquivalent:true,runtimeProviderIdentityCloudProgressUnchanged:true,wasmEvidenceSourceCi:40224917193,newWasmExecution:false};
}
