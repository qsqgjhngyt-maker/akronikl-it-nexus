// Закрытый по умолчанию выбор промежуточного BASIC; выпускной gate остаётся FULL.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const policyPath='tools/check-cpp-clarity-basic-policy.json',workflow='.github/workflows/cpp-clarity-01.yml';
const hash=b=>createHash('sha256').update(b).digest('hex');
const registry=b=>JSON.parse(String(b).match(/Object\.freeze\((\{.*\})\);/s)[1]);
const same=(a,b)=>{try{assert.deepEqual(a,b);return true;}catch{return false;}};
const git=(cwd,...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{cwd,maxBuffer:64e6,stdio:['pipe','pipe','pipe']});
export async function snapshot({cwd=process.cwd(),worktree=false}={}){
 const current=async file=>worktree?readFile(path.join(cwd,file)):git(cwd,'show','HEAD:'+file);
 const policy=JSON.parse(await current(policyPath));assert.match(policy.baseline,/^[0-9a-f]{40}$/);git(cwd,'merge-base','--is-ancestor',policy.baseline,'HEAD');
 const changed=git(cwd,'diff','--name-only','-z',policy.baseline,...(worktree?[]:['HEAD'])).toString().split('\0').filter(Boolean);
 if(worktree)changed.push(...git(cwd,'ls-files','--others','--exclude-standard','-z').toString().split('\0').filter(Boolean));
 return {policy,changed:[...new Set(changed)],current,prior:async file=>git(cwd,'show',policy.baseline+':'+file),cwd,worktree};
}
export async function classify(s){
 const full=reason=>({profile:'FULL',reason,baseline:s?.policy?.baseline||null,module:s?.policy?.module||null});
 try{
  const p=s.policy;assert.equal(p.schemaVersion,1);assert.match(p.module,/^(?:onec\.p(?:[89]|1[012])|1c-enterprise\.a[1-8])$/);assert.ok(Array.isArray(p.topicIds)&&p.topicIds.length>=1);assert.equal(p.forceFull,false);assert.equal(p.evidenceRoot,'docs/ru/03-content/cpp-clarity-01/R3_EVIDENCE/'+p.module.replaceAll('.','-')+'-module');assert.ok(p.reportFiles.every(f=>f.startsWith('docs/ru/03-content/cpp-clarity-01/')&&!f.includes('..')));
  const oldRegistry=registry(await s.prior('core/clarity-course-registry.mjs')),newRegistry=registry(await s.current('core/clarity-course-registry.mjs'));
  assert.deepEqual(Object.keys(oldRegistry).sort(),Object.keys(newRegistry).sort());assert.deepEqual(Object.keys(oldRegistry).filter(id=>id.startsWith(p.module+'.')).sort(),[...p.topicIds].sort());
  for(const id of Object.keys(oldRegistry))if(!p.topicIds.includes(id))assert.deepEqual(newRegistry[id],oldRegistry[id]);
  const edition=file=>p.topicIds.some(id=>['ru','en'].some(l=>file==='courses/clarity/authoring/'+id+'.'+l+'.json'||file==='courses/clarity/lessons/'+id+'.'+l+'.json'));
  const additions=p.topicIds.map(id=>",'"+id+"'").join('');
  const normalize=s=>s.replaceAll(additions,'').replaceAll('[...ids]','ids');
  const priorTests=/^tests\/cpp-clarity-(?:onec-p[1-9](?:-(?:types|conditions|module))?|types)-content\.test\.mjs$/;
  const newTests=new Set([p.contentTest,p.browserTest]);assert.ok([...newTests].every(f=>/^tests\/cpp-clarity-(?:onec-p\d+|enterprise-a\d+)-module-(?:content\.test|browser)\.mjs$/.test(f)));
  const media=new Map(JSON.parse(await s.current(p.captureManifest)).images.map(im=>['courses/clarity/'+im.src,im.sha256]));assert.ok([...media.keys()].every(f=>f.startsWith('courses/clarity/media/tutorials/v2/')&&!f.includes('..')));
  if(p.ciMigration){
   assert.equal(p.baseline,'14d8629042aef9b913881c4b340aee11a573cba1');assert.equal(p.module,'onec.p8');assert.equal(p.migrationDecision,'78663428-2975-43fb-a62f-a90f2d6c8fa3');
   const history=git(s.cwd,'log','--format=%H',p.baseline+'..HEAD','--',policyPath).toString().trim().split(/\r?\n/).filter(Boolean);
   if(!s.worktree){assert.equal(history.length,1);const head=git(s.cwd,'rev-parse','HEAD').toString().trim(),parents=git(s.cwd,'show','-s','--format=%P','HEAD').toString().trim().split(' ');assert.ok(history[0]===head||parents.length===2&&history[0]===parents[1]);}
   for(const [file,digest]of Object.entries(p.migrationHashes)){assert.equal(hash(await s.current(file)),digest,file);}
  }else{
   const previous=JSON.parse(await s.prior(policyPath));assert.equal(previous.schemaVersion,1);assert.deepEqual(p.migrationHashes,previous.migrationHashes);
  }
  for(const file of s.changed){
   if(edition(file))continue;
   if(media.has(file)){assert.equal(hash(await s.current(file)),media.get(file));continue;}
   if(file===policyPath)continue;
   if(newTests.has(file))continue;
   if(file.startsWith(p.evidenceRoot+'/')||p.reportFiles.includes(file))continue;
   if(file==='core/clarity-course-registry.mjs')continue;
   if(file==='courses/clarity/editorial-map.json'){
    const clean=b=>{const a=JSON.parse(b);a.topics=a.topics.filter(x=>!p.topicIds.includes(x.id));return a;};assert.deepEqual(clean(await s.current(file)),clean(await s.prior(file)));continue;
   }
   if(file==='tools/build-cpp-clarity-courses.mjs'){
    assert.equal(normalize(String(await s.current(file))),String(await s.prior(file)));continue;
   }
   if(file==='tools/check-cpp-clarity.mjs'){
    assert.equal(String(await s.current(file)).replace(",'"+p.contentTest+"'",''),String(await s.prior(file)));continue;
   }
   if(file==='tools/check-cpp-clarity-preservation.mjs'){
    const block='const '+p.variable+'ModuleSources=new Set(['+p.topicIds.map(id=>"'"+id+"'").join(',')+"].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));\nconst "+p.variable+"ModuleMedia=new Map(JSON.parse(await readFile('"+p.captureManifest+"','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));\nfor(const[file,digest]of "+p.variable+"ModuleMedia)assert.equal(sha(await readFile(file)),digest,'"+p.label+" genuine screenshot: '+file);\n";
    const tail=',...'+p.variable+'ModuleSources,...'+p.variable+'ModuleMedia.keys()';let now=String(await s.current(file)).replace(block,'').replace(tail,'');
    if(p.ciMigration){const entries=['tools/classify-cpp-clarity-ci.mjs','tools/package-cpp-clarity-basic-source.py'].map(f=>" ['"+f+"','"+p.migrationHashes[f]+"']").join(',\n');const ci="// MASTER 00: однократная миграция BASIC, два точных новых инструмента.\nconst ciBasicToolApproved=new Map([\n"+entries+"\n]);\nfor(const[file,digest]of ciBasicToolApproved){assert.equal(sha(await readFile(file)),digest,'Approved BASIC CI bytes: '+file);sourceAllow.add(file);}\n";now=now.replace(ci,'');}
    assert.equal(now,String(await s.prior(file)));continue;
   }
   if(priorTests.test(file)){
    let now=String(await s.current(file));for(const id of p.flowchartIds)now=now.replace(",'"+id+"'].includes(lesson.id)","].includes(lesson.id)");assert.equal(normalize(now),String(await s.prior(file)));continue;
   }
   if(file===workflow){
    if(p.ciMigration&&p.migrationHashes[file])continue;
    const now=String(await s.current(file)).replace(' '+p.contentTest+'\n','\n').replace('      - name: Основные проверки полного модуля '+p.label+' RU и EN\n        run: node '+p.browserTest+'\n','');assert.equal(now,String(await s.prior(file)));continue;
   }
   if(p.ciMigration&&Object.hasOwn(p.migrationHashes,file))continue;
   return full('PROTECTED_OR_UNKNOWN_PATH: '+file);
  }
  for(const id of p.topicIds)for(const locale of ['ru','en']){const f='courses/clarity/authoring/'+id+'.'+locale+'.json';assert.ok(s.changed.includes(f),'expected new module source');const a=JSON.parse(await s.current(f));assert.equal(a.id,id);assert.equal(a.locale,locale);assert.equal(newRegistry[id].contentRevision,a.revision);}
  return {profile:'BASIC',reason:'CONTENT_ONLY_ADDITIVE_REGISTRATION_VERIFIED',baseline:p.baseline,module:p.module,topicIds:p.topicIds,contentTest:p.contentTest,browserTest:p.browserTest,ciMigration:p.ciMigration,changedPaths:s.changed.length};
 }catch(e){return full('FAIL_CLOSED: '+String(e.message).slice(0,300));}
}
async function main(){
 const args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1];let result;
 try{result=await classify(await snapshot({worktree:args.includes('--worktree')}));}catch(e){result={profile:'FULL',reason:'CLASSIFICATION_UNAVAILABLE: '+String(e.message).slice(0,200)};}
 if(args.includes('--record-full'))result={...result,classifierProfile:result.profile,profile:'FULL',reason:'FULL_JOB_EXECUTION: '+result.reason};
 const output=args.includes('--output')?value('--output'):'ci-profile.json';await mkdir(path.dirname(path.resolve(output)),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'profile='+result.profile+'\nmigration='+(result.profile==='BASIC'&&result.ciMigration?'true':'false')+'\n');
 if(args.includes('--expect')&&value('--expect')!==result.profile)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await main();
