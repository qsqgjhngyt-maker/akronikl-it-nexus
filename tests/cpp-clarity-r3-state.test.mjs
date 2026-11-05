import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {CLARITY_CONTENT_REVISION as revision,CLARITY_LIMITS,CLARITY_QUESTIONS,emptyClarityDraft,validateClarityDraft,prepareClarityDraft,validateInputSnapshot,snapshotJson,snapshotDigests,sha256Utf8,canonicalJson,utf8Bytes,answerIsChecked,resultMatches,validateWorkReferences,editClarityAnswer} from '../core/cpp-clarity-r3-state.mjs';
const cpp='cpp.programming-process',bsl='onec.p2.topic-1',join='onec.p7.topic-2';
const copy=structuredClone,expect=(fn,code)=>assert.throws(fn,e=>e.code===code);
function snapshot(languageId='cpp'){
 const source='int main() {}\n';return {languageId,source,stdin:'',entryFile:'main.cpp',files:[{path:'main.cpp',content:source},{path:'value.h',content:'#define VALUE 1\n'}],metadata:{entryFile:'main.cpp',activeFile:'main.cpp',workspaceRevision:3}};
}
function withResult(id=cpp){
 const v=emptyClarityDraft(id);v.stateRevision=1;
 const s=snapshot(id===cpp?'cpp':id===bsl?'bsl':'1c-query');
 const binding=id===cpp?{kind:'lesson',topicId:cpp,workspaceDigest:'a'.repeat(64)}:{kind:'project',id:'synthetic-project',expectedLocalRevision:7};
 v.workBinding=binding;v.activeFile='main.cpp';
 v.lastResult={kind:id===cpp?'runtime':'external-self-report',runId:'synthetic-run-1',contentRevision:revision,workspaceRevision:3,workBinding:copy(binding),inputSnapshot:s,...snapshotDigests(s),output:{stdout:'40\n',stderr:''},exitCode:id===cpp?0:null,providerId:id===cpp?'wasm-cpp':null};return v;
}
function fillSnapshot(s,bytes){
 const base=utf8Bytes(snapshotJson(s));assert.ok(base<=bytes);s.files[1].content+='x'.repeat(bytes-base);assert.equal(utf8Bytes(snapshotJson(s)),bytes);return s;
}
test('SHA-256 matches the platform reference for standard, Unicode and block-boundary inputs',()=>{
 for(const value of ['', 'abc', 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', 'текст\r\n😀', ...[55,56,63,64,65,127,128,32768].map(n=>'a'.repeat(n)), 'a'.repeat(1000000)])assert.equal(sha256Utf8(value),createHash('sha256').update(value).digest('hex'));
});
test('allowlist and question shapes match both accepted editions exactly',async()=>{
 for(const [id,questions] of Object.entries(CLARITY_QUESTIONS))for(const language of ['ru','en']){
  const l=JSON.parse(await fs.readFile(`review/cpp-clarity-r3/lessons/${id}.${language}.json`,'utf8'));
  assert.deepEqual(Object.fromEntries(l.selfcheck.map(q=>[q.id,q.kind==='free'?'free':q.options.length])),questions);
 }
 expect(()=>emptyClarityDraft('1c-enterprise.p2.topic-1'),'R3_TOPIC_REJECTED');
});
test('one canonical record survives RU/EN; new material revision does not delete old answer text',()=>{
 const a=emptyClarityDraft(cpp);a.answers['cpp-predict']={value:0,checked:true,contentRevision:revision};
 const first=prepareClarityDraft(cpp,a,{expectedStateRevision:0}).value;
 assert.equal(answerIsChecked(first.answers['cpp-predict'],revision),true);
 assert.equal(answerIsChecked(first.answers['cpp-predict'],'r3-stage-b'),false);
 const next=copy(first);next.contentRevision='r3-stage-b';const saved=prepareClarityDraft(cpp,next,{previous:first,expectedStateRevision:1});
 assert.deepEqual(saved.value.answers,first.answers);assert.equal(saved.value.stateRevision,2);assert.equal(first.stateRevision,1);
});
test('unknown fields at every nested level and unknown versions are rejected',()=>{
 const base=withResult();base.cursor={start:0,end:1,direction:'none',scrollTop:0,scrollLeft:0};base.answers['cpp-predict']={value:0,checked:false,contentRevision:revision};
 const paths=[[],['positions'],['positions','explanation'],['cursor'],['workBinding'],['answers','cpp-predict'],['lastResult'],['lastResult','output'],['lastResult','inputSnapshot'],['lastResult','inputSnapshot','metadata'],['lastResult','inputSnapshot','files',0]];
 for(const p of paths){const v=copy(base);let node=v;for(const key of p)node=node[key];node.unexpected=true;expect(()=>validateClarityDraft(cpp,v),'R3_SCHEMA_INVALID');}
 const v=copy(base);v.schemaVersion=2;expect(()=>validateClarityDraft(cpp,v),'R3_SCHEMA_INVALID');
});
test('question IDs, index type/range and ungraded free text are enforced',()=>{
 const v=emptyClarityDraft(cpp);v.stateRevision=1;
 for(const value of [-1,3,'0',NaN,0.5]){v.answers={'cpp-predict':{value,checked:false,contentRevision:revision}};expect(()=>validateClarityDraft(cpp,v),'R3_SCHEMA_INVALID');}
 v.answers={'join-inner':{value:0,checked:false,contentRevision:revision}};expect(()=>validateClarityDraft(cpp,v),'R3_QUESTION_REJECTED');
 v.answers={'cpp-explain':{value:'объяснение',checked:true,contentRevision:revision}};expect(()=>validateClarityDraft(cpp,v),'R3_FREE_ANSWER_UNGRADED');
 v.answers['cpp-explain'].checked=false;validateClarityDraft(cpp,v);assert.equal(answerIsChecked(v.answers['cpp-explain'],revision),false);
});
test('editing a checked answer clears its status without modifying the saved record',()=>{
 const v=emptyClarityDraft(cpp);v.stateRevision=1;v.answers['cpp-predict']={value:0,checked:true,contentRevision:revision};
 const next=editClarityAnswer(cpp,v,'cpp-predict',1);assert.equal(next.answers['cpp-predict'].checked,false);assert.equal(v.answers['cpp-predict'].checked,true);
 const prepared=prepareClarityDraft(cpp,next,{previous:v,expectedStateRevision:1});next.answers['cpp-predict'].value=2;
 assert.equal(prepared.value.answers['cpp-predict'].value,1);assert.equal(JSON.parse(prepared.serialized).answers['cpp-predict'].value,1);
});
test('stale, invalid and exhausted revisions never mutate or silently retry',()=>{
 const old=withResult(),original=canonicalJson(old),next=copy(old);
 expect(()=>prepareClarityDraft(cpp,next,{previous:old,expectedStateRevision:0}),'R3_STATE_CONFLICT');
 for(const n of [NaN,-1,0.5,Number.MAX_SAFE_INTEGER+1])expect(()=>prepareClarityDraft(cpp,next,{previous:old,expectedStateRevision:n}),'R3_SCHEMA_INVALID');
 old.stateRevision=Number.MAX_SAFE_INTEGER;next.stateRevision=old.stateRevision;expect(()=>prepareClarityDraft(cpp,next,{previous:old,expectedStateRevision:old.stateRevision}),'R3_REVISION_EXHAUSTED');
 old.stateRevision=1;assert.equal(canonicalJson(old),original);
});
test('UTF-8 free answer and report limits accept exact size and reject one extra byte',()=>{
 const v=emptyClarityDraft(cpp);v.stateRevision=1;v.answers={'cpp-explain':{value:'я'.repeat(2048),checked:false,contentRevision:revision}};
 validateClarityDraft(cpp,v);v.answers['cpp-explain'].value+='x';expect(()=>validateClarityDraft(cpp,v),'R3_ANSWER_TOO_LARGE');
 v.answers={};v.reportDraft='я'.repeat(8192);validateClarityDraft(cpp,v);v.reportDraft+='x';expect(()=>validateClarityDraft(cpp,v),'R3_REPORT_TOO_LARGE');
});
test('stdout and stderr share one 16384-byte output allowance',()=>{
 const v=withResult();v.lastResult.output={stdout:'я'.repeat(4096),stderr:'x'.repeat(8192)};validateClarityDraft(cpp,v);
 v.lastResult.output.stderr+='x';expect(()=>validateClarityDraft(cpp,v),'R3_OUTPUT_TOO_LARGE');
 v.lastResult.output={stdout:'x'.repeat(16379)+'\ud83d',stderr:'\ude00'};expect(()=>validateClarityDraft(cpp,v),'R3_OUTPUT_TOO_LARGE');
});
test('snapshot counts serialized paths, source, stdin and JSON escapes at exact limit and +1',()=>{
 const s=fillSnapshot(snapshot(),32768);validateInputSnapshot(s);s.files[1].content+='x';expect(()=>validateInputSnapshot(s),'R3_SNAPSHOT_TOO_LARGE');
 const escaped=snapshot();escaped.stdin='"'.repeat(16384);expect(()=>validateInputSnapshot(escaped),'R3_SNAPSHOT_TOO_LARGE');
 const nonAscii=snapshot();nonAscii.files[1].path='Данные.h';assert.ok(utf8Bytes(snapshotJson(nonAscii))>snapshotJson(nonAscii).length);
});
test('combined record limit includes JSON overhead and can fail while each individual field fits',()=>{
 const v=withResult();v.reportDraft='x'.repeat(16384);v.lastResult.output.stdout='x'.repeat(16384);v.lastResult.output.stderr='';v.lastResult.inputSnapshot=fillSnapshot(snapshot(),32768);Object.assign(v.lastResult,snapshotDigests(v.lastResult.inputSnapshot));
 const overhead=utf8Bytes(canonicalJson(v))-65536;assert.ok(overhead>0 && overhead<16384);v.reportDraft=v.reportDraft.slice(overhead);
 assert.equal(utf8Bytes(canonicalJson(v)),65536);validateClarityDraft(cpp,v);
 v.reportDraft+='x';expect(()=>validateClarityDraft(cpp,v),'R3_DRAFT_TOO_LARGE');
});
test('file ordering is deterministic; CRLF, header or stdin edits change the captured evidence',()=>{
 const s=snapshot(),hashes=snapshotDigests(s),reordered=copy(s);reordered.files.reverse();assert.deepEqual(snapshotDigests(reordered),hashes);
 const header=copy(s);header.files[1].content+='\r\n';assert.notEqual(snapshotDigests(header).sourceDigest,hashes.sourceDigest);
 const input=copy(s);input.stdin='\r\n';assert.equal(snapshotDigests(input).sourceDigest,hashes.sourceDigest);assert.notEqual(snapshotDigests(input).stdinDigest,hashes.stdinDigest);
});
test('duplicate/traversing paths, stale digest and mismatched entry source are rejected',()=>{
 const s=snapshot();s.files.push(copy(s.files[0]));expect(()=>validateInputSnapshot(s),'R3_DUPLICATE_FILE');
 for(const p of ['../secret','/absolute','x\\y','a//b','a/./b','C:/file','\ud800.h']){const x=snapshot();x.files[1].path=p;expect(()=>validateInputSnapshot(x),'R3_FILE_REJECTED');}
 const mismatch=snapshot();mismatch.source+='x';expect(()=>validateInputSnapshot(mismatch),'R3_ENTRY_SOURCE_MISMATCH');
 const v=withResult();v.lastResult.inputSnapshot.stdin='other';expect(()=>validateClarityDraft(cpp,v),'R3_DIGEST_MISMATCH');
});
test('late runtime result cannot match another run, topic, revision, second file or stdin',()=>{
 const v=withResult(),r=v.lastResult,context={topicId:cpp,contentRevision:revision,workBinding:r.workBinding,workspaceRevision:3,inputSnapshot:r.inputSnapshot,runId:r.runId};
 assert.equal(resultMatches(r,context),true);
 for(const patch of [{runId:'new-run'},{topicId:bsl},{contentRevision:'new-revision'},{workspaceRevision:4},{workBinding:{...r.workBinding,workspaceDigest:'b'.repeat(64)}}])assert.equal(resultMatches(r,{...context,...patch}),false);
 for(const edit of [s=>s.stdin+='1',s=>s.files[1].content+='2']){const s=copy(r.inputSnapshot);edit(s);assert.equal(resultMatches(r,{...context,inputSnapshot:s}),false);}
});
test('external 1C report does not require or create a Studio work and never matches runtime',()=>{
 const v=emptyClarityDraft(bsl);v.stateRevision=1;v.lastResult={kind:'external-self-report',runId:'external-1',contentRevision:revision,workspaceRevision:0,workBinding:null,inputSnapshot:null,sourceDigest:null,stdinDigest:null,output:{stdout:'40\n',stderr:''},exitCode:null,providerId:null};
 validateClarityDraft(bsl,v);assert.equal(resultMatches(v.lastResult,{}),false);
 v.lastResult.codeVerifiedServer=true;expect(()=>validateClarityDraft(bsl,v),'R3_SCHEMA_INVALID');
});
test('saved ID alone is insufficient: binding, accessible file and fresh cursor bounds are checked',()=>{
 const v=withResult(),accessible={binding:copy(v.workBinding),files:copy(v.lastResult.inputSnapshot.files)};
 v.cursor={start:0,end:2,direction:'forward',scrollTop:4,scrollLeft:0};validateWorkReferences(cpp,v,accessible);
 expect(()=>validateWorkReferences(cpp,v,null),'R3_WORK_REFERENCE_INVALID');
 accessible.binding.workspaceDigest='b'.repeat(64);expect(()=>validateWorkReferences(cpp,v,accessible),'R3_WORK_REFERENCE_INVALID');accessible.binding=copy(v.workBinding);
 v.activeFile='missing.cpp';expect(()=>validateWorkReferences(cpp,v,accessible),'R3_WORK_REFERENCE_INVALID');v.activeFile='main.cpp';v.cursor.end=1000;expect(()=>validateWorkReferences(cpp,v,accessible),'R3_CURSOR_INVALID');
});
test('pure state module has no storage, DOM or network; product integration remains lazy',async()=>{
 const source=await fs.readFile('core/cpp-clarity-r3-state.mjs','utf8');assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage|indexedDB|fetch|document|window)\s*[.(]/);
 for(const path of ['core/app.js','core/storage.js','pwa/offline-entry.js','courses/onec-education/candidate.mjs'])assert.doesNotMatch(await fs.readFile(path,'utf8'),/import\s+[^;\n]*from\s+['"][^'"]*cpp-clarity-r3-state/);
});
