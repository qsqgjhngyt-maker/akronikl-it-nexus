// Только согласованный промежуточный профиль; FULL не подменяется.
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {classify,snapshot} from './classify-cpp-clarity-ci.mjs';
const out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE);await mkdir(out,{recursive:true});const profile=await classify(await snapshot());await writeFile(path.join(out,'CI_PROFILE.json'),JSON.stringify(profile,null,2)+'\n');
if(profile.profile!=='BASIC')throw Error('BASIC job cannot run with '+profile.profile+': '+profile.reason);
const results=[];
for(const [name,args]of [['Новый модуль: содержание, native evidence, сохранность',['--test',profile.contentTest]],['16 fixed hashes, 67/40 ID и защищённые области',['tools/check-cpp-clarity-preservation.mjs']],['Собрать непубликованный кандидат',['tools/build-cpp-clarity-candidate.mjs']],['Основной RU/EN, свой код и короткий cold offline',[profile.browserTest]]]){
 const run=spawnSync(process.execPath,args,{encoding:'utf8',env:process.env,maxBuffer:16e6});const log=(run.stdout||'')+(run.stderr||'');process.stdout.write(log);await writeFile(path.join(out,'basic-'+results.length+'.log'),log);results.push({name,status:run.status===0?'PASS':'FAIL',exitCode:run.status});if(run.status!==0)break;
}
await writeFile(path.join(out,'TECHNICAL_BASIC.json'),JSON.stringify({profile:'BASIC',results,scope:'MODULE BASIC ONLY; FULL TECHNICAL AND RELEASE GATE PENDING',native:'Recorded installed-platform evidence; not executed on GitHub Linux',learnerUnderstanding:'NOT MEASURED',publicationAuthorized:false},null,2)+'\n');if(results.length!==4||results.some(r=>r.status!=='PASS'))process.exitCode=1;
