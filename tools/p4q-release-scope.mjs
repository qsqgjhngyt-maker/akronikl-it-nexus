// Current owner-approved P4-Q overlay; historical C++ acceptance stays immutable.
import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
const RECEIPT_SHA256='28a8c57f8701d0b93583fe6e66ac5b2e5362a9666d9f7eacf5ce4d458c466edd';
export const P4Q_RELEASE_BASE='75e24e195919e7c3d39659ba804e977d51ef5591',P4Q_RELEASE_RECEIPT='release/P4Q_RELEASE_SCOPE.json';
const self='tools/p4q-release-scope.mjs',git=(...a)=>execFileSync('git',a,{stdio:['ignore','pipe','pipe'],maxBuffer:128*1024*1024}),sha=b=>createHash('sha256').update(b).digest('hex');
export const p4qFileHash=(file,bytes)=>sha(file===self?Buffer.from(bytes.toString().replace(/const RECEIPT_SHA256='[a-f0-9]{64}';/,"const RECEIPT_SHA256='"+'0'.repeat(64)+"';")):bytes);
export function p4qProtected(file){return /^(?:courses\/cpp\/|course-final\/|runtime-packs\/|releases\/|entry-assets\/)/.test(file)||/^docs\/ru\/03-content\/CPP_.*(?:SCOPE|RECEIPT).*\.json$/.test(file);}
let cached;
export async function p4qReleaseScope(){
 if(cached)return cached;let bytes;try{bytes=await readFile(P4Q_RELEASE_RECEIPT)}catch(e){if(e.code==='ENOENT')return null;throw e;}
 assert.equal(sha(bytes),RECEIPT_SHA256,'P4-Q receipt hash');const s=JSON.parse(bytes);assert.equal(s.schema,1);assert.equal(s.stage,'P4Q_TESTER_RELEASE');assert.equal(s.baseCommit,P4Q_RELEASE_BASE);assert.equal(s.ownerAuthorizedMainAndRelease,true);assert.equal(s.historicalReceiptsModified,false);git('merge-base','--is-ancestor',s.baseCommit,'HEAD');
 const branch=process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||git('branch','--show-current').toString().trim();assert.ok(['main','feature/akronikl-p4q-corpus-20261028'].includes(branch),'P4-Q release branch');
 const split=b=>b.toString().split('\0').filter(Boolean),changed=new Set([...split(git('diff','--name-only','-z',s.baseCommit)),...split(git('ls-files','--others','--exclude-standard','-z'))].filter(f=>f!==P4Q_RELEASE_RECEIPT)),rows=new Map(s.paths.map(r=>[r.file,r]));assert.equal(rows.size,s.paths.length);assert.deepEqual([...changed].sort(),[...rows.keys()].sort(),'Unknown or missing P4-Q changes');
 const index=new Map(split(git('ls-files','--stage','-z')).map(line=>{const at=line.indexOf('\t'),parts=line.slice(0,at).split(' ');assert.equal(parts[2],'0','Unmerged index');return[line.slice(at+1),parts[0]];}));
 const base=new Map(split(git('ls-tree','-r','-z',s.baseCommit)).map(line=>{const at=line.indexOf('\t'),parts=line.slice(0,at).split(' ');return[line.slice(at+1),{mode:parts[0],blob:parts[2]}];}));
 for(const r of rows.values()){
  assert.ok(r.file&&!r.file.startsWith('/')&&!r.file.split('/').includes('..')&&!p4qProtected(r.file),'Protected historical source: '+r.file);
  if(r.file.startsWith('sandbox/'))assert.ok(['sandbox/sandbox.js','sandbox/runtime-evidence.js'].includes(r.file),'Runtime compiler unchanged');
  const previous=base.get(r.file);assert.equal(previous?.mode??null,r.beforeMode,r.file+' previous mode');assert.equal(previous?sha(git('cat-file','blob',previous.blob)):null,r.beforeSha256,r.file+' previous bytes');
  const mode=index.get(r.file)??null;assert.equal(mode,r.mode,r.file+' current mode');
  if(r.deleted){assert.equal(mode,null);await assert.rejects(readFile(r.file),{code:'ENOENT'});}else{assert.ok(['100644','100755'].includes(mode));const current=await readFile(r.file);assert.equal(current.length,r.bytes,r.file+' length');assert.equal(p4qFileHash(r.file,current),r.sha256,r.file+' current bytes');}
 }
 cached={...s,admittedPaths:[...rows.keys()],historicalCppReceiptVerifiedSeparately:true,currentP4QScopeVerified:true};return cached;
}
