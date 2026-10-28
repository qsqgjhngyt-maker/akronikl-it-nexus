import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const M6_FIX_RECEIPT='94d1893445c4bd874511af1f0e6500f0ea3b7377fe391017cc4d0318ec939ef9';
const hash=b=>createHash('sha256').update(b).digest('hex'),git=(...args)=>execFileSync('git',args,{maxBuffer:32000000});
export async function m6FixScope(){
 const bytes=await readFile('docs/ru/03-content/CPP_MODULE6_FIX_SCOPE.json');assert.equal(hash(bytes),M6_FIX_RECEIPT);
 const s=JSON.parse(bytes);assert.equal(s.baseCommit,'4d957746b12463a04188a2b774aef6d1b24bec50');assert.equal(s.stage,'M6-05/07-fixes');assert.equal(s.mainWrites,0);assert.equal(s.productionWrites,0);assert.equal(s.deploymentAuthorized,false);assert.equal(s.officialRelease,false);
 assert.equal(process.env.GITHUB_REF_NAME||git('branch','--show-current').toString().trim(),s.branch);git('merge-base','--is-ancestor',s.baseCommit,'HEAD');
 const spec=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE6_AUTHORING.json'));
 const allowed=[...spec.lessons.flatMap(l=>['ru','en'].map(locale=>'courses/cpp/gold/events/'+l.id.slice(4)+'.'+locale+'.json')),'studio-build/preview.mjs'];
 assert.equal(allowed.length,25);assert.deepEqual(s.productPaths.map(p=>p.file).sort(),allowed.sort());
 for(const row of s.productPaths){
  const before=git('show',s.baseCommit+':'+row.file),after=await readFile(row.file);assert.equal(hash(before),row.beforeSha256,row.file+' before');assert.equal(hash(after),row.sha256,row.file+' after');assert.equal(after.length,row.bytes);
  if(!row.file.endsWith('.json'))continue;
  const a=JSON.parse(before),b=JSON.parse(after);
  for(const g of [a,b]){
   for(const task of g.practice){delete task.hint;delete task.criteria;}
   delete g.assessment;delete g.readinessCheck;
   if(g.lessonId==='cpp.application-build-delivery')g.sections[3].paragraphs[0]='[approved accessibility instruction]';
  }
  assert.deepEqual(b,a,row.file+': код, cases, legacyQuiz, задания, ID и остальные поля неизменны');
 }
 return{status:'PASS',stage:s.stage,baseCommit:s.baseCommit,productPaths:s.productPaths,productPatchPaths:allowed,consoleAndQtSourcesUnchanged:true,legacyQuizUnchanged:true,stableIdsUnchanged:true,mainWrites:0,productionWrites:0,officialRelease:false};
}
