// Обычный контент не получает допуск исторического выпуска.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';
export const ROUTE_FILE='tools/content-publication-route.mjs',SCOPE_FILE='docs/ru/03-content/onec/review-0305/CI_ROUTING_SCOPE.json',WORKFLOW='.github/workflows/academy-gold-cpp-module-3-publication.yml',BOOTSTRAP_BASE='d8721e06a2b1ac953aa18694c07559c62d388700';
export const normalizeRouting=(file,bytes)=>file===WORKFLOW?bytes.toString().replace(/NEXUS_CONTENT_ROUTE_BOOTSTRAP_SHA: '[a-f0-9]{40}'/,"NEXUS_CONTENT_ROUTE_BOOTSTRAP_SHA: '"+'0'.repeat(40)+"'"):bytes;
export const hashRouting=(file,bytes)=>createHash('sha256').update(normalizeRouting(file,bytes)).digest('hex');
const protectedPath=p=>/^(?:release\/|releases\/|runtime-packs\/|course-final\/|entry-assets\/|core\/|pwa\/|sandbox\/|project-studio\/|cloudflare\/|server-access\/|sync\/|collaboration\/|content\/schemas\/|\.github\/)/.test(p)||/^courses\/(?:cpp|programming)\//.test(p)||/^courses\/[^/]+$/.test(p)||/^docs\/ru\/03-content\/CPP_.*(?:SCOPE|RECEIPT).*\.json$/.test(p)||/^(?:release-candidate\.json|version\.json|BUILD_MANIFEST\.json)$/.test(p);
export function classifyContentChanges(rows,{bootstrapPaths=[]}={}){
 assert.ok(Array.isArray(rows)&&rows.length,'EMPTY_DIFF');const approved=new Set(bootstrapPaths),ids=new Set(rows.map(r=>/^courses\/([a-z0-9][a-z0-9-]*)\//.exec(r.path)?.[1]).filter(Boolean));
 const decisions=rows.map(row=>{
  const p=row.path;assert.ok(typeof p==='string'&&p&&!p.startsWith('/')&&!p.includes('\\')&&!p.split('/').some(x=>x==='..'||x==='.'||!x),'INVALID_PATH');
  if(!['A','M'].includes(row.status)||!['100644','100755'].includes(row.mode))return{path:p,kind:'release-review-required',reason:'delete/rename/mode'};
  if(approved.has(p))return{path:p,kind:'content-review',reason:'exact-owner-approved-routing-bootstrap'};
  if([ROUTE_FILE,SCOPE_FILE,'tools/check-content-review.mjs','tests/content-publication-route.test.mjs','tests/startup-intro-contract.test.mjs','tools/check-onec-preservation.mjs'].includes(p)||protectedPath(p))return{path:p,kind:'release-review-required',reason:'protected-contract'};
  if(/^courses\/[a-z0-9][a-z0-9-]*\/.+/.test(p)||/^docs\/.+/.test(p))return{path:p,kind:'content-review',reason:'course-or-documentation'};
  for(const id of ids)if(p.startsWith(`tests/${id}-`)&&p.endsWith('.mjs')||p.startsWith(`tools/check-${id}-`)&&/\.(?:mjs|ps1)$/.test(p)||p===`tools/build-${id}-offline.mjs`)return{path:p,kind:'content-review',reason:'course-specific-check'};
  return{path:p,kind:'release-review-required',reason:'unknown-scope'};
 });
 return{kind:decisions.every(d=>d.kind==='content-review')?'content-review':'historical-release',publicationRequested:!decisions.every(d=>d.kind==='content-review'),releaseEligible:false,decisions};
}
export function verifyBootstrap(scope,read){
 assert.equal(scope.schema,1);assert.equal(scope.base,BOOTSTRAP_BASE);assert.equal(scope.releaseEligible,false);assert.ok(scope.files.length>0);assert.equal(new Set(scope.files.map(f=>f.path)).size,scope.files.length);
 for(const row of scope.files){const v=read(row.path);assert.equal(v.mode,row.mode,row.path+' mode');assert.equal(hashRouting(row.path,v.bytes),row.sha256,row.path+' approved bootstrap bytes');}
 return scope.files.map(f=>f.path).concat(SCOPE_FILE);
}
export function routePublicationWorkflow(original,bootstrapSha='0'.repeat(40)){
 assert.match(bootstrapSha,/^[a-f0-9]{40}$/);const source=original.replaceAll('\r\n','\n');assert.ok(source.includes('jobs:\n  publication:\n'));assert.ok(!source.includes('content_scope:'));
 const prefix=`jobs:
  content_scope:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    outputs:
      kind: \${{ steps.scope.outputs.kind }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - name: Определить область по доверенному source, без релизного допуска
        id: scope
        env:
          NEXUS_ROUTE_BASE: \${{ github.event.pull_request.base.sha || github.event.before }}
          NEXUS_ROUTE_HEAD: \${{ github.event.pull_request.head.sha || github.sha }}
          NEXUS_ROUTE_BRANCH: \${{ github.head_ref || github.ref_name }}
          NEXUS_ROUTE_PR: \${{ github.event.pull_request.number }}
          NEXUS_CONTENT_ROUTE_BOOTSTRAP_SHA: '${bootstrapSha}'
        run: |
          set -euo pipefail
          [[ "$NEXUS_ROUTE_BASE" =~ ^[0-9a-f]{40}$ ]]
          [[ "$NEXUS_ROUTE_HEAD" =~ ^[0-9a-f]{40}$ ]]
          if git cat-file -e "$NEXUS_ROUTE_BASE:tools/content-publication-route.mjs" 2>/dev/null; then
            export NEXUS_ROUTE_TRUSTED="$NEXUS_ROUTE_BASE"
          else
            export NEXUS_ROUTE_TRUSTED="$NEXUS_CONTENT_ROUTE_BOOTSTRAP_SHA"
          fi
          git show "$NEXUS_ROUTE_TRUSTED:tools/content-publication-route.mjs" > "$RUNNER_TEMP/nexus-content-route.mjs"
          node "$RUNNER_TEMP/nexus-content-route.mjs"
      - name: Сохранить решение маршрутизации
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: content-publication-scope-\${{ github.sha }}
          path: content-publication-scope.json
  content_review:
    needs: content_scope
    if: needs.content_scope.outputs.kind == 'content-review'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - name: Проверить Content Contract, без publication или deployment
        run: |
          node tools/validate-content.mjs
          node tools/check-content-review.mjs
          node --test tests/content-contract.test.mjs
  publication:
    needs: content_scope
    if: needs.content_scope.outputs.kind == 'historical-release'
`;
 const header=source.slice(0,source.indexOf('on:\n'))+`on:
  push:
    branches: [feature/academy-gold-standard-cpp-module-3, feature/academy-gold-standard-cpp-module-4, main]
  pull_request:
    branches: [main]
`;
 return(header+source.slice(source.indexOf('permissions:\n'))).replace('jobs:\n  publication:\n',prefix);
}
export function inspectRoute({base,head,trusted,branch,pr,event},git){
 for(const s of [base,head,trusted])assert.match(s||'',/^[a-f0-9]{40}$/,'PINNED_SHA_REQUIRED');git('merge-base','--is-ancestor',base,head);git('merge-base','--is-ancestor',trusted,head);
 const hasBase=git('ls-tree','--name-only',base,ROUTE_FILE).toString().trim()===ROUTE_FILE;
 if(hasBase)assert.equal(trusted,base,'TRUST_BASE_ROUTER');else{
  assert.equal(base,BOOTSTRAP_BASE,'BOOTSTRAP_BASE');assert.ok(event==='pull_request'&&String(pr)==='63'&&branch==='feature/onec-dual-gold-foundation-20261030'||event==='push'&&branch==='main','OWNER_APPROVED_BOOTSTRAP_ONLY');
 }
 const bytes=(ref,p)=>git('show',ref+':'+p),mode=(ref,p)=>git('ls-tree',ref,'--',p).toString().split(' ')[0];
 const bootstrapPaths=hasBase?[]:verifyBootstrap(JSON.parse(bytes(trusted,SCOPE_FILE)),p=>({bytes:bytes(head,p),mode:mode(head,p)}));
 if(!hasBase)assert.ok(bytes(head,SCOPE_FILE).equals(bytes(trusted,SCOPE_FILE)),'IMMUTABLE_BOOTSTRAP_SCOPE');
 const parts=git('diff','--no-renames','--name-status','-z',base,head).toString().split('\0').filter(Boolean),rows=[];for(let i=0;i<parts.length;i+=2)rows.push({status:parts[i],path:parts[i+1],mode:mode(head,parts[i+1])});
 const result=classifyContentChanges(rows,{bootstrapPaths});
 return{...result,base,head,trusted,bootstrap:!hasBase,scope:'candidate review only; historical release admission unchanged'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const git=(...args)=>execFileSync('git',args,{maxBuffer:128e6,stdio:['ignore','pipe','pipe']});
 try{const result=inspectRoute({base:process.env.NEXUS_ROUTE_BASE,head:process.env.NEXUS_ROUTE_HEAD,trusted:process.env.NEXUS_ROUTE_TRUSTED,branch:process.env.NEXUS_ROUTE_BRANCH,pr:process.env.NEXUS_ROUTE_PR,event:process.env.GITHUB_EVENT_NAME},git);fs.writeFileSync('content-publication-scope.json',JSON.stringify(result,null,2)+'\n');if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'kind='+result.kind+'\n');console.log(result.kind==='content-review'?'CONTENT REVIEW: historical publication NOT REQUESTED; releaseEligible=false':'HISTORICAL RELEASE: exact receipt/security gates remain required');}catch(e){fs.writeFileSync('content-publication-scope.json',JSON.stringify({status:'FAIL',reason:e.message,releaseEligible:false},null,2)+'\n');throw e;}
}
