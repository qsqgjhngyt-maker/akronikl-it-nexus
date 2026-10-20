import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.resolve(process.argv[2]);await mkdir(out,{recursive:true});
const suites=[
 'server-access/check-cookie-ingress-v3-source-only.mjs','server-access/check-cookie-ingress-v31-security.mjs','server-access/check-cookie-ingress-runtime.mjs',
 'tests/auth-hotfix-flow-check.mjs','tests/auth-esm-bundle-check.mjs','tests/entry-document-navigation-check.mjs','tests/oauth-link-client-check.mjs','tests/entry-galaxy-check.mjs',
 'server-access/check-oauth-bff.mjs','server-access/check-oauth-service.mjs','server-access/check-gateway-cookie-context.mjs','server-access/check-entry-gate.mjs','server-access/check-cloud-session.mjs','server-access/check-feedback-account-expectation.mjs',
 'tests/auth-bootstrap-check.mjs','tests/account-storage-isolation-check.mjs','tests/nexus-account-access-recovery-check.mjs','tests/cloud-unified-client-check.mjs','tests/feedback-account-context-check.mjs','tests/cloud-expired-session-check.mjs','tests/cloud-sync-client-transport-check.mjs','tests/cloud-sync-session-first-migration-check.mjs','tests/session-only-resume-check.mjs','tests/first-party-cookie-client-check.mjs','tests/first-party-cookie-foundation-check.mjs','tests/server-account-origin-check.mjs',
 'tests/production-entry-syntax-check.mjs','tests/release-version-consistency-check.mjs','tests/ui1a-release-isolation-check.mjs','tests/ui1a-versioned-build-check.mjs'
];
const env=Object.fromEntries(['PATH','Path','SYSTEMROOT','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','LOCALAPPDATA'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
async function run(id,args){const start=performance.now();let stdout='',stderr='';const child=spawn(process.execPath,args,{cwd:root,env,windowsHide:true});child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);const code=await new Promise(resolve=>{child.once('error',()=>resolve(-1));child.once('close',resolve)});await writeFile(path.join(out,id.replaceAll(/[\\/]/g,'__')+'.txt'),stdout+stderr);return{id,code,durationMs:Math.round(performance.now()-start),status:code===0?'PASS':'FAIL'}}
const results=[];
// Processes isolate global DOM/storage mocks. Limit concurrency to four.
for(let i=0;i<suites.length;i+=4)results.push(...await Promise.all(suites.slice(i,i+4).map(file=>run(file,[file]))));
const syntax=['server-access/public/entry.js','server-access/public/passkey-client.js','server-access/public/oauth-client.js','server-access/bff/oauth.mjs','server-access/image/bff/server.mjs','tests/auth-browser-local-check.mjs','tests/helpers/auth-fixture.mjs','tools/prepare-alpha8-auth.mjs','tools/check-auth-candidate.mjs'];
for(const file of syntax)results.push(await run('syntax/'+file,['--check',file]));
const summary={status:results.every(r=>r.code===0)?'PASS':'FAIL',passed:results.filter(r=>r.code===0).length,failed:results.filter(r=>r.code!==0).length,results,cloudWrites:0,realProviderLogin:false};
await writeFile(path.join(out,'TEST_RESULTS.json'),JSON.stringify(summary,null,2)+'\n');for(const r of results)console.log(r.status+' '+r.id+' '+r.durationMs+'ms');process.exitCode=summary.failed?1:0;
