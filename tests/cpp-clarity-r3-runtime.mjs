import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const repo=process.env.NEXUS_REPO||path.resolve(dir,'..');
const review=process.env.NEXUS_CLARITY_REVIEW_DIR||path.join(repo,'review/cpp-clarity-r3');
const {clarityLocalFixture}=await import(pathToFileURL(path.join(repo,'tests/helpers/cpp-clarity-local-fixture.mjs')));
const out=path.resolve(process.env.NEXUS_CLARITY_R3_EVIDENCE||'cpp-clarity-r3-runtime-evidence');await fs.mkdir(out,{recursive:true});
const f=await clarityLocalFixture(path.join(out,'fixture')),page=f.page,rows=[];
try{const prefix='/releases/'+f.generation;await page.evaluate(()=>{location.hash='#view=compiler'});await page.locator('#prepareCompiler').click();await page.waitForFunction(()=>/полностью проверен и готов/.test(document.querySelector('#runtimeStatus')?.textContent||''),{},{timeout:300000});
 const ru=JSON.parse(await fs.readFile(path.join(review,'lessons/cpp.programming-process.ru.json'),'utf8')),en=JSON.parse(await fs.readFile(path.join(review,'lessons/cpp.programming-process.en.json'),'utf8'));assert.deepEqual(ru.programChecks,en.programChecks);
 for(const p of ru.programChecks){const r=await page.evaluate(async({prefix,source})=>{const{pickProvider}=await import(prefix+'/sandbox/sandbox.js'),request={languageId:'cpp',source,stdin:''},route=await pickProvider(request),r=await route.provider.run(request);return{provider:route.provider.id,stdout:r.stdout,stderr:r.stderr,exitCode:r.exitCode,sourceUnchanged:request.source===source};},{prefix,source:p.source});assert.equal(r.provider,'wasm-cpp');assert.equal(r.exitCode,0);assert.equal(r.stderr,'');assert.equal(r.stdout,p.stdout,p.name);assert.ok(r.sourceUnchanged);rows.push({name:p.name,sourceSha256:crypto.createHash('sha256').update(p.source).digest('hex'),expected:p.stdout,...r});}
 await fs.writeFile(path.join(out,'R3_CPP_RESULT.json'),JSON.stringify({status:'AUTOMATED PASS',method:'Actual existing Nexus Clang/WASI provider; SHA256-verified pinned compiler bytes; no compiler or stdout mock',publicCdnLive:false,prototypeRuntimeConnected:false,rows},null,2));console.log('AUTOMATED PASS: '+rows.length+' actual C++ Clang/WASI observations');
}finally{await f.close();}
