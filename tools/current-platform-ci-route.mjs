// CI maintenance не является допуском публикации. Исторический router/guards неизменны.
import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{execFileSync}from'node:child_process';import{fileURLToPath}from'node:url';
import{inspectRoute,hashRouting}from'./content-publication-route.mjs';
export const CI_BASE='0eb4bdcbc05c73ae4f8a312e7bcc0f4279d91b13',PUBLISHED_SOURCE='995baa9daf88c217f39aabeeb16b9c02de5f4336',CI_SCOPE='docs/ru/03-content/onec/review-0305/CI_MAINTENANCE_SCOPE_20261102.json';
export const CI_PATHS=Object.freeze([
 '.github/workflows/academy-gold-cpp-module-1.yml','.github/workflows/academy-gold-cpp-module-2-preflight.yml','.github/workflows/academy-gold-cpp-module-3-publication.yml','.github/workflows/academy-gold-cpp-module-6-preflight.yml','.github/workflows/cpp-course-final.yml','.github/workflows/startup-intro-refresh.yml',
 'tools/current-platform-ci-route.mjs','tools/check-current-platform-course.mjs','tools/check-onec-preservation.mjs','tools/check-onec-regression.mjs',
 'tests/helpers/public-fixture-path.mjs',"tests/academy-gold-module6-fixture.mjs","tests/academy-gold-module6-presentation-browser.mjs",'tests/helpers/native-offline-fixture.mjs','tests/helpers/online-runtime-fixture.mjs','tests/startup-intro-launch-browser-check.mjs','tests/onec-shared-fixture-transport.test.mjs','tests/onec-platform-ci-route.test.mjs','tests/content-publication-route.test.mjs','tests/onec-historical-routing.test.mjs','tests/startup-intro-contract.test.mjs','tests/shared-presentation-check.mjs',
 'docs/ru/03-content/onec/review-0305/CI_ROUTING_SCOPE.json','docs/ru/03-content/onec/pedagogy-v2-20261102/POST_MERGE_CI_ROUTING_RU.md'
]);
export function platformCILoaderBash(){return `set -euo pipefail
if [[ -z "\${NEXUS_CONTENT_ROUTE_BOOTSTRAP_SHA:-}" ]]; then
  export NEXUS_CONTENT_ROUTE_BOOTSTRAP_SHA=$(git show "$NEXUS_ROUTE_HEAD:.github/workflows/academy-gold-cpp-module-3-publication.yml" | tr -d '\\r' | sed -nE "s/^ +NEXUS_CONTENT_ROUTE_BOOTSTRAP_SHA: '([a-f0-9]{40})'$/\\1/p")
fi
if [[ "\${GITHUB_EVENT_NAME:-}" == "push" && "$NEXUS_ROUTE_BRANCH" == "feature/onec-dual-gold-foundation-20261030" ]]; then
  export NEXUS_ROUTE_BASE=$(git rev-parse refs/remotes/origin/main)
fi
[[ "$NEXUS_CONTENT_ROUTE_BOOTSTRAP_SHA" =~ ^[0-9a-f]{40}$ ]]
[[ "$NEXUS_ROUTE_BASE" =~ ^[0-9a-f]{40}$ ]]
[[ "$NEXUS_ROUTE_HEAD" =~ ^[0-9a-f]{40}$ ]]
if git cat-file -e "$NEXUS_ROUTE_BASE:tools/current-platform-ci-route.mjs" 2>/dev/null; then
  export NEXUS_ROUTE_TRUSTED="$NEXUS_ROUTE_BASE"
else
  export NEXUS_ROUTE_TRUSTED="$NEXUS_CONTENT_ROUTE_BOOTSTRAP_SHA"
fi
git show "$NEXUS_ROUTE_TRUSTED:tools/content-publication-route.mjs" > "$RUNNER_TEMP/content-publication-route.mjs"
git show "$NEXUS_ROUTE_TRUSTED:tools/current-platform-ci-route.mjs" > "$RUNNER_TEMP/current-platform-ci-route.mjs"
node "$RUNNER_TEMP/current-platform-ci-route.mjs"`;}
export function verifyCIMaintenance({scope,rows,read,headScopeBytes,trustedScopeBytes}){
 assert.equal(scope.schema,1);assert.equal(scope.base,CI_BASE);assert.equal(scope.publishedSource,PUBLISHED_SOURCE);assert.equal(scope.releaseEligible,false);assert.ok(Buffer.from(headScopeBytes).equals(Buffer.from(trustedScopeBytes)),'IMMUTABLE_CI_MAINTENANCE_SCOPE');
 assert.ok(scope.files.length>0);assert.equal(new Set(scope.files.map(r=>r.path)).size,scope.files.length);const pins=new Map(scope.files.map(r=>[r.path,r]));for(const row of scope.files){assert.ok(CI_PATHS.includes(row.path),'CI_PATH_NOT_AUTHORIZED');assert.equal(row.mode,'100644');const value=read(row.path);assert.equal(value.mode,row.mode);assert.equal(hashRouting(row.path,value.bytes),row.sha256,row.path+' exact reviewed CI bytes');}
 for(const row of rows){assert.ok(['A','M'].includes(row.status),'CI_DELETE_RENAME_REJECTED');assert.equal(row.mode,'100644','CI_MODE_REJECTED');assert.ok(row.path===CI_SCOPE||pins.has(row.path),'NON_CI_CHANGE_REJECTED');}
 return{kind:'content-review',publicationRequested:false,releaseEligible:false,ciMaintenanceApproved:true,scope:'exact owner-authorized CI transport and provenance separation; deployed product unchanged'};
}
export function inspectPlatformCI(args,git){
 for(const s of[args.base,args.head,args.trusted])assert.match(s||'',/^[a-f0-9]{40}$/);git('merge-base','--is-ancestor',args.base,args.head);git('merge-base','--is-ancestor',args.trusted,args.head);
 const has=(ref,p)=>git('ls-tree','--name-only',ref,p).toString().trim()===p,read=(ref,p)=>git('show',ref+':'+p),mode=(ref,p)=>git('ls-tree',ref,'--',p).toString().split(' ')[0];
 if([CI_BASE,PUBLISHED_SOURCE].includes(args.base)&&has(args.trusted,CI_SCOPE)){
  assert.ok(args.event==='push'&&['main','feature/onec-dual-gold-foundation-20261030'].includes(args.branch),'CI_MAINTENANCE_OWNER_FLOW_ONLY');
  assert.equal(git('rev-parse',args.base+'^{tree}').toString(),git('rev-parse',CI_BASE+'^{tree}').toString(),'COMPATIBLE_MERGE_TREE_REQUIRED');
  const raw=read(args.trusted,CI_SCOPE),parts=git('diff','--no-renames','--name-status','-z',args.base,args.head).toString().split('\0').filter(Boolean),rows=[];for(let i=0;i<parts.length;i+=2)rows.push({status:parts[i],path:parts[i+1],mode:mode(args.head,parts[i+1])});
  const result=verifyCIMaintenance({scope:JSON.parse(raw),rows,read:p=>({bytes:read(args.head,p),mode:mode(args.head,p)}),headScopeBytes:read(args.head,CI_SCOPE),trustedScopeBytes:raw});return{...result,...args};
 }
 return inspectRoute({...args,trusted:has(args.base,'tools/content-publication-route.mjs')?args.base:args.trusted},git);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const git=(...a)=>execFileSync('git',a,{maxBuffer:128e6,stdio:['ignore','pipe','pipe']});try{const result=inspectPlatformCI({base:process.env.NEXUS_ROUTE_BASE,head:process.env.NEXUS_ROUTE_HEAD,trusted:process.env.NEXUS_ROUTE_TRUSTED,branch:process.env.NEXUS_ROUTE_BRANCH,pr:process.env.NEXUS_ROUTE_PR,event:process.env.GITHUB_EVENT_NAME},git);fs.writeFileSync('content-publication-scope.json',JSON.stringify(result,null,2)+'\n');if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'kind='+result.kind+'\n');console.log(result.kind==='content-review'?'CURRENT CONTENT/CI REVIEW / NO RELEASE ADMISSION':'HISTORICAL RELEASE / ORIGINAL EXACT GATES REQUIRED');}catch(e){fs.writeFileSync('content-publication-scope.json',JSON.stringify({status:'FAIL',reason:e.message,releaseEligible:false},null,2)+'\n');throw e;}
}
