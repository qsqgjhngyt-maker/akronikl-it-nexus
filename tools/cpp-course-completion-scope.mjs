// Точный новый changeset над закрытыми M6 receipts. Старые receipts не меняются.
import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
const RECEIPT_SHA256='9ac9799595cb02eceb17f2c1b6d0dbbc0a386416e1c3002c30f9ce5fa03fc9d6';
export const COMPLETION_BASE='330d29dde2c4a5c8ef136f5b8b40ce7a9179aa49';
export const COMPLETION_RECEIPT='docs/ru/03-content/CPP_COURSE_COMPLETION_SCOPE.json';
const self='tools/cpp-course-completion-scope.mjs',git=(...a)=>execFileSync('git',a,{maxBuffer:128*1024*1024,stdio:['ignore','pipe','pipe']}),list=b=>b.toString().split('\n').filter(Boolean),sha=b=>createHash('sha256').update(b).digest('hex');
const tree=ref=>new Map(git('ls-tree','-r','-z',ref).toString().split('\0').filter(Boolean).map(line=>{const t=line.indexOf('\t');return[line.slice(t+1),line.slice(0,t).split(' ')[2]]}));
function readBlobs(ids){
 const unique=[...new Set(ids)],out=new Map();if(!unique.length)return out;
 const bytes=execFileSync('git',['cat-file','--batch'],{input:unique.join('\n')+'\n',maxBuffer:128*1024*1024,stdio:['pipe','pipe','pipe']});let at=0;
 for(const id of unique){const end=bytes.indexOf(10,at),header=bytes.subarray(at,end).toString().split(' ');assert.equal(header[0],id);assert.equal(header[1],'blob');const size=Number(header[2]);assert.ok(Number.isSafeInteger(size)&&size>=0);at=end+1;out.set(id,bytes.subarray(at,at+size));at+=size+1;}assert.equal(at,bytes.length);return out;
}
const gitBlobHash=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export const completionHash=(file,b)=>sha(file===self?Buffer.from(b.toString().replace(/const RECEIPT_SHA256='[a-f0-9]{64}';/,"const RECEIPT_SHA256='"+'0'.repeat(64)+"';")):b);
let cached;
export async function courseCompletionScope(){
 if(cached)return cached;
 let bytes;try{bytes=await readFile(COMPLETION_RECEIPT)}catch(e){if(e.code==='ENOENT')return null;throw e}
 assert.equal(sha(bytes),RECEIPT_SHA256,'Completion receipt SHA256');const s=JSON.parse(bytes);assert.equal(s.baseCommit,COMPLETION_BASE);assert.equal(s.stage,'CPP-COURSE-COMPLETION');assert.equal(s.ownerAuthorizedPublication,true);assert.equal(s.extraBudgetRub,0);assert.equal(s.studentServerCompilation,false);git('merge-base','--is-ancestor',s.baseCommit,'HEAD');
 assert.ok(['feature/academy-gold-standard-cpp-module-6','main'].includes(process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||git('branch','--show-current').toString().trim()));
 const mergeBase=git('merge-base',s.baseCommit,s.integrationMain).toString().trim(),incoming=list(git('diff','--name-only',mergeBase,s.integrationMain)),rows=new Map(s.paths.map(r=>[r.file,r]));assert.equal(rows.size,s.paths.length);assert.equal(sha(Buffer.from(incoming.join('\n'))),s.incomingPathListSha256);
 const baseTree=tree(s.baseCommit),mainTree=tree(s.integrationMain),beforeBlobs=readBlobs([...rows.keys()].filter(f=>baseTree.has(f)).map(f=>baseTree.get(f)));
 for(const row of rows.values()){
  assert.ok(row.file&&!row.file.startsWith('/')&&!row.file.split('/').includes('..')&&row.file!==COMPLETION_RECEIPT);
  const before=baseTree.has(row.file)?beforeBlobs.get(baseTree.get(row.file)):null;
  assert.equal(before?completionHash(row.file,before):null,row.beforeSha256,row.file+' completion base');
  const current=await readFile(row.file);assert.equal(current.length,row.bytes,row.file+' bytes');assert.equal(completionHash(row.file,current),row.sha256,row.file+' completion source');
 }
 const changed=new Set([...list(git('diff','--name-only',s.baseCommit)),...list(git('ls-files','--others','--exclude-standard'))]);
 for(const file of changed){if(file===COMPLETION_RECEIPT||rows.has(file))continue;assert.ok(incoming.includes(file),'Outside completion scope: '+file);assert.equal(gitBlobHash(await readFile(file)),mainTree.get(file),file+' current main bytes');}
 // Сохраняем C++, cases, ID и legacy quiz. Единственная поправка C++:
 // два Qt-урока RU/EN используют относительный путь того же файла данных.
 for(const row of s.paths.filter(r=>/^courses\/cpp\/gold\/.+\.json$/.test(r.file))){
  const a=JSON.parse(beforeBlobs.get(baseTree.get(row.file))),b=JSON.parse(await readFile(row.file));
  const eraseText=x=>{if(Array.isArray(x))return x.map(eraseText);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,(/(?:Code|Files|Stdout)$/.test(k)||['source','code','files','cases','metadata','expected','stdin','legacyQuiz','lessonId','id','target','languageId'].includes(k))?v:eraseText(v)]));return typeof x==='string'?'[editorial text]':x};
  const portableQt=/^courses\/cpp\/gold\/events\/(qt-graphical-adapter|application-build-delivery)\.(ru|en)\.json$/.test(row.file);
  const relativePaths=x=>typeof x==='string'?x.replaceAll('QFile f("/taskflow.txt")','QFile f("taskflow.txt")'):Array.isArray(x)?x.map(relativePaths):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,relativePaths(v)])):x;
  assert.deepEqual(eraseText(b),eraseText(portableQt?relativePaths(a):a),row.file+' executable/identity contract');
 }
 cached={...s,admittedPaths:[...new Set([...rows.keys(),...incoming])],historicalBytes:file=>rows.has(file)?beforeBlobs.get(baseTree.get(file)):readFile(file)};return cached;
}
