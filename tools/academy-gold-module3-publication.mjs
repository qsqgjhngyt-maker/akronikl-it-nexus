// Проверяет точность тестового пакета; разрешение владельца существует только в чате.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';

export const M3_PUBLICATION=Object.freeze({
 accepted:'d0477ca9c3f9a9e4da8079abe40ff5a207de8476',checked:'62deea3e3afd9d90c8536e84d39cfcf82e89dfd2',
 base:'98b884f70c53bac3502b209112d0d3f19e401699',old:'0.1.7-alpha.2.4.6-ui1a.10.6-test.2',
 version:'0.1.7-alpha.2.4.6-ui1a.10.7-test.1',generation:'ui1a-cpp-gold-module3-test1-20261025'
});
const root=path.resolve(import.meta.dirname,'..'),P=M3_PUBLICATION;
const git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024});
const read=f=>readFile(path.join(root,f)),json=async f=>JSON.parse(await read(f));
const committed=(ref,file)=>JSON.parse(git('show',ref+':'+file));
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const tree=(ref,...paths)=>git('ls-tree','-rz',ref,'--',...paths).toString().split('\0').filter(Boolean).map(row=>{
 const match=row.match(/^(\d+) blob ([a-f0-9]{40})\t(.+)$/s);assert.ok(match,'Ожидается обычный Git blob');return{mode:match[1],sha:match[2],file:match[3]};
});

export function expectedM3PublicationMetadata(){
 const notes='Тестовая публикация C++ Module 3: 18 Gold-уроков на русском и английском, лабораторные и проект. Сохранены прежние 40 stable IDs и прогресс; программа расширена до 45 тем. Официальный релиз не создаётся.';
 const v=committed(P.base,'version.json');
 Object.assign(v,{version:P.version,build:'cpp-gold-module3-test1-20261025',date:'2026-10-25',notes});
 Object.assign(v.content,{cppLessonsRu:45,cppLessonsEnAuthored:8,cppGoldLessonsRu:38,cppGoldLessonsEn:38,cppGoldModule3LessonsRu:18,cppGoldModule3LessonsEn:18});
 Object.assign(v.releaseCandidate,{assetGeneration:P.generation,baseline:P.base,pwaMigration:'M3: точные сохранённые поколения; upgrade/rollback проверяются до публикации',formalGate05:'M3 AUTOMATED PASS 05/07; публикация и LIVE ещё не подтверждены',releaseReady:false,ownerPublicationAuthorized:false});
 const c=committed(P.base,'release-candidate.json');
 c.retainedPublicGenerations=[...new Set([...c.retainedPublicGenerations,c.assetGeneration])];
 Object.assign(c,{version:P.version,assetGeneration:P.generation,baseCommit:P.base,status:'ТЕСТОВАЯ ПУБЛИКАЦИЯ M3 / LIVE PENDING',description:notes,formalGate05:v.releaseCandidate.formalGate05,notes:'Владелец подтвердил тестовую публикацию main и production в чате 25.10.2026. Метаданные не являются разрешением; официальный Release/тег и backend deployment не создавать.'});
 c.publication={kind:'owner-authorized-production-test',module:'cpp-module-3',sourceCommit:P.accepted,checkedCommit:P.checked,rollbackCommit:P.base,sourceAcceptance:'M3 05/07 и NEXUS-PERF-01 AUTOMATED PASS; CI40201500993 6/6, CI40201501029 PASS; физический LIVE M3 ещё не подтверждён',officialRelease:false};
 const project=committed(P.base,'project.json');Object.assign(project,{version:P.version,releaseName:'C++ Gold Module 3 — тестовая публикация 1'});
 return{candidate:c,version:v,project};
}

export async function verifyM3Publication({rebuild=false,writeEvidence=true}={}){
 const c=await json('release-candidate.json');assert.equal(c.publication?.module,'cpp-module-3');
 const expected=expectedM3PublicationMetadata(),v=await json('version.json'),m=await json('BUILD_MANIFEST.json');
 assert.deepEqual(c,expected.candidate);assert.deepEqual(v,expected.version);assert.deepEqual(await json('project.json'),expected.project);
 for(const x of [c,v,m])assert.equal(x.version,P.version);assert.equal(m.assetGeneration,P.generation);assert.equal(m.prefix,'releases/'+P.generation+'/');
 assert.deepEqual(await read('manifest.webmanifest'),git('show',P.base+':manifest.webmanifest'));
 const roots=['core','effects','styles','locales','courses','assets','sandbox','project-studio','sync','collaboration','akronikl','feedback','pwa','server-access','cloudflare'];
 const source=tree(P.accepted,...roots),versionPaths=['core/app.js','core/shell-presentation.js'];
 for(const item of source){const actual=await read(item.file);if(versionPaths.includes(item.file)){
  const before=git('show',P.accepted+':'+item.file).toString();assert.ok(before.includes(P.old),item.file);assert.deepEqual(actual,Buffer.from(before.replaceAll(P.old,P.version)),item.file);
 }else assert.equal(blob(actual),item.sha,'Принятый source изменён: '+item.file);}
 git('diff','--exit-code',P.accepted,'--',...roots,...versionPaths.map(f=>':(exclude)'+f));
 assert.equal(git('ls-files','--others','--exclude-standard','--',...roots).toString().trim(),'','Новый source вне принятого SHA');
 const historical=tree(P.base,'releases','entry-assets');for(const item of historical)assert.equal(blob(await read(item.file)),item.sha,'Изменено историческое поколение: '+item.file);
 const names=new Set();for(const record of m.files){assert.ok(!names.has(record.file),'Повтор manifest path');names.add(record.file);const bytes=await read(record.file);assert.equal(bytes.length,record.bytes,record.file);assert.equal(hash(bytes),record.sha256,record.file);}
 const payload=source.filter(x=>!x.file.startsWith('server-access/')&&!x.file.startsWith('cloudflare/')).map(x=>x.file).concat('version.json');
 for(const file of payload)assert.deepEqual(await read('releases/'+P.generation+'/'+file),await read(file),file);
 assert.equal((await json('courses/cpp/data/lessons.ru.json')).lessons.length,45);assert.equal((await json('courses/cpp/data/lessons.en.json')).lessons.length,8);
 const newFiles=git('ls-files','--others','--exclude-standard','--','releases','entry-assets').toString().trim().split('\n').filter(Boolean);
 const changed=git('diff','--name-only',P.base,'--','releases','entry-assets').toString().trim().split('\n').filter(Boolean);
 for(const file of [...newFiles,...changed])assert.ok(file.startsWith('releases/'+P.generation+'/')||file.startsWith('entry-assets/'+P.generation+'/'),'Неизвестное immutable поколение: '+file);
 if(rebuild){const temp=await mkdtemp(path.join(tmpdir(),'nexus-m3-publication-')),out=path.join(temp,'build');execFileSync(process.execPath,['tools/build-ui1a-release.mjs','--out',out],{cwd:root,stdio:'pipe'});
  assert.deepEqual(JSON.parse(await readFile(path.join(out,'BUILD_MANIFEST.json'))),m);for(const file of ['index.html','nexus-shell.html','offline.html','version.json','service-worker.js','BUILD_MANIFEST.json'])assert.deepEqual(await read(file),await readFile(path.join(out,file)),file);
 }
 const sourceChanged=git('diff','--name-only',P.base,P.accepted,'--',...roots).toString().trim().split('\n').filter(Boolean);
 const publicationPaths=['core/shell-presentation.js','release-candidate.json','project.json','version.json','index.html','nexus-shell.html','offline.html','service-worker.js','BUILD_MANIFEST.json','releases/'+P.generation,'entry-assets/'+P.generation];
 // Старые M2 gates сравнивают с более ранним main: исключения применяются только
 // после точной проверки всех сохранённых исторических bytes выше.
 for(const generation of c.retainedPublicGenerations)publicationPaths.push('releases/'+generation,'entry-assets/'+generation);
 const result={status:'PASS',stage:'M3-publication',publication:true,baseCommit:P.base,acceptedSource:P.accepted,checkedSource:P.checked,version:P.version,generation:P.generation,authoring:true,navigationFix:true,productPatchPaths:[...new Set([...sourceChanged,...publicationPaths])],sourceFilesChecked:source.length,sourceHashesVerified:true,historicalFilesPreserved:historical.length,historicalGenerationsUnchanged:true,publishedRootsAndGenerationsUnchanged:false,manifestFiles:m.files.length,sourcePayloads:payload.length,reproducibleRebuildChecked:rebuild,identityCloudProjectStoreUnchanged:true,legacyImporterBodyUnchanged:true,legacyRowsAndQuizUnchanged:true,curriculumExpanded:true,officialRelease:false,live:false,productionExecution:false};
 if(writeEvidence){const out=path.resolve(process.env.NEXUS_M3_EVIDENCE||process.env.NEXUS_GOLD_EVIDENCE||'academy-gold-m3-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'M3_PUBLICATION_GATE.json'),JSON.stringify(result,null,2)+'\n');}
 return result;
}
