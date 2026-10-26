// Проверяет точность тестового пакета; разрешение владельца существует только в чате.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';

export const M4_PUBLICATION=Object.freeze({
 accepted:'8d48f20aaa3cdf7eb099451f3b01d376b65d27d6',checked:'9d62de9b7a95da78733e354bdf2fe77a6ba1d724',
 base:'03c8a7ba1306c59f35b83ea5650ae73b71988272',old:'0.1.7-alpha.2.4.6-ui1a.10.7-test.1',
 version:'0.1.7-alpha.2.4.6-ui1a.10.8-test.1',generation:'ui1a-cpp-gold-module4-test1-20261026'
});
export const M4_UX_PUBLICATION=Object.freeze({
 accepted:'63f3465dbf060ef09a309b822beaef57afb0bde8',checked:'63f3465dbf060ef09a309b822beaef57afb0bde8',
 base:'3005c4319290b845339f03e8777584e8af88c8e8',old:'0.1.7-alpha.2.4.6-ui1a.10.8-test.1',
 version:'0.1.7-alpha.2.4.6-ui1a.10.8-test.2',generation:'ui1a-cpp-gold-module4-test2-20261026',ux:true
});
const root=path.resolve(import.meta.dirname,'..');
const git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024});
const read=f=>readFile(path.join(root,f)),json=async f=>JSON.parse(await read(f));
const committed=(ref,file)=>JSON.parse(git('show',ref+':'+file));
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const tree=(ref,...paths)=>git('ls-tree','-rz',ref,'--',...paths).toString().split('\0').filter(Boolean).map(row=>{
 const match=row.match(/^(\d+) blob ([a-f0-9]{40})\t(.+)$/s);assert.ok(match,'Ожидается обычный Git blob');return{mode:match[1],sha:match[2],file:match[3]};
});

export function expectedM4PublicationMetadata(P=M4_PUBLICATION){
 if(P.ux){
  const notes='Тестовая публикация C++ Module 4: компактные контрольные случаи и рабочее окно с заданием и Code Studio во всех Gold-уроках M1–4. На телефоне доступны вкладки; закрытие возвращает к месту в уроке. Учебные задания и сохранённый прогресс не меняются. Официальный релиз не создаётся.';
  const v=committed(P.base,'version.json');Object.assign(v,{version:P.version,build:'cpp-gold-module4-test2-20261026',date:'2026-10-26',notes});
  Object.assign(v.releaseCandidate,{assetGeneration:P.generation,baseline:P.base,pwaMigration:'M4 test.2: точный upgrade/rollback к опубликованному test.1',formalGate05:'UI patch: автоматическая приёмка; новая публикация и LIVE проверяются отдельно',releaseReady:false,ownerPublicationAuthorized:false});
  const c=committed(P.base,'release-candidate.json');c.retainedPublicGenerations=[...new Set([...c.retainedPublicGenerations,c.assetGeneration])];
  Object.assign(c,{version:P.version,assetGeneration:P.generation,baseCommit:P.base,status:'ТЕСТОВАЯ ПОПРАВКА UX M4 / LIVE PENDING',description:notes,formalGate05:v.releaseCandidate.formalGate05});
  c.publication={kind:'owner-authorized-production-test',module:'cpp-module-4',sourceCommit:P.accepted,checkedCommit:P.checked,rollbackCommit:P.base,sourceAcceptance:'M4 test.1 работает на ПК/телефоне; замечания 07 исправляются. Рабочее окно: 92 RU/EN объекта, 6 ширин, 32 возврата и реальный C++ внутри окна проверены автоматически. Новый личный LIVE ещё не подтверждён.',officialRelease:false};
  const project=committed(P.base,'project.json');Object.assign(project,{version:P.version,releaseName:'C++ Gold Module 4 — тестовая публикация 2, практикумы'});
  return{candidate:c,version:v,project};
 }
 const notes='Тестовая публикация C++ Module 4: 8 Gold-уроков на русском и английском, лабораторные и проект. Сохранены прежние 40 stable IDs и прогресс; программа расширена до 50 тем. Официальный релиз не создаётся.';
 const v=committed(P.base,'version.json');
 Object.assign(v,{version:P.version,build:'cpp-gold-module4-test1-20261026',date:'2026-10-26',notes});
 Object.assign(v.content,{cppLessonsRu:50,cppLessonsEnAuthored:13,cppGoldLessonsRu:46,cppGoldLessonsEn:46,cppGoldModule4LessonsRu:8,cppGoldModule4LessonsEn:8});
 Object.assign(v.releaseCandidate,{assetGeneration:P.generation,baseline:P.base,pwaMigration:'M4: точные сохранённые поколения; upgrade/rollback проверяются до публикации',formalGate05:'M4 AUTOMATED PASS 05/07; публикация и LIVE ещё не подтверждены',releaseReady:false,ownerPublicationAuthorized:false});
 const c=committed(P.base,'release-candidate.json');
 c.retainedPublicGenerations=[...new Set([...c.retainedPublicGenerations,c.assetGeneration])];
 Object.assign(c,{version:P.version,assetGeneration:P.generation,baseCommit:P.base,status:'ТЕСТОВАЯ ПУБЛИКАЦИЯ M4 / LIVE PENDING',description:notes,formalGate05:v.releaseCandidate.formalGate05,notes:'Владелец подтвердил тестовую публикацию main и production в чате 26.10.2026. Метаданные не являются разрешением; официальный Release/тег и backend deployment не создавать.'});
 c.publication={kind:'owner-authorized-production-test',module:'cpp-module-4',sourceCommit:P.accepted,checkedCommit:P.checked,rollbackCommit:P.base,sourceAcceptance:'M4 05/07 и NEXUS-PERF-01 AUTOMATED PASS; CI40248534462 и CI40248534471 PASS; физический LIVE M4 ещё не подтверждён',officialRelease:false};
 const project=committed(P.base,'project.json');Object.assign(project,{version:P.version,releaseName:'C++ Gold Module 4 — тестовая публикация 1'});
 return{candidate:c,version:v,project};
}

export async function verifyM4Publication({rebuild=false,writeEvidence=true}={}){
 const c=await json('release-candidate.json');assert.equal(c.publication?.module,'cpp-module-4');
 const P=c.assetGeneration===M4_UX_PUBLICATION.generation?M4_UX_PUBLICATION:M4_PUBLICATION;
 const expected=expectedM4PublicationMetadata(P),v=await json('version.json'),m=await json('BUILD_MANIFEST.json');
 assert.deepEqual(c,expected.candidate);assert.deepEqual(v,expected.version);assert.deepEqual(await json('project.json'),expected.project);
 for(const x of [c,v,m])assert.equal(x.version,P.version);assert.equal(m.assetGeneration,P.generation);assert.equal(m.prefix,'releases/'+P.generation+'/');
 assert.deepEqual(await read('manifest.webmanifest'),git('show',P.base+':manifest.webmanifest'));
 for(const file of ['index.html','nexus-shell.html','offline.html']){const original=git('show',P.base+':'+file).toString(),oldGeneration=committed(P.base,'release-candidate.json').assetGeneration;assert.equal((await read(file)).toString(),original.replaceAll(P.old,P.version).replaceAll(oldGeneration,P.generation),'Только версия/поколение в root HTML: '+file);}
 const priorCurriculum=committed(P.base,'courses/cpp/curriculum.json'),currentCurriculum=await json('courses/cpp/curriculum.json');assert.deepEqual(currentCurriculum.lessons.slice(0,priorCurriculum.lessons.length),priorCurriculum.lessons);
 for(const locale of ['ru','en']){const f='courses/cpp/data/lessons.'+locale+'.json',old=committed(P.base,f);assert.deepEqual((await json(f)).lessons.slice(0,old.lessons.length),old.lessons);}
 git('diff','--exit-code',P.base,'--','core/storage.js','core/account-storage.js','core/identity.js','core/migrations','sync','sandbox','project-studio','server-access','cloudflare','pwa');
 const roots=['core','effects','styles','locales','courses','assets','sandbox','project-studio','sync','collaboration','akronikl','feedback','pwa','server-access','cloudflare'];
 const source=tree(P.accepted,...roots),versionPaths=['core/app.js','core/shell-presentation.js'],acceptedVersion=committed(P.accepted,'version.json').version;
 const presentationPatchHashes=[];
 if(P.ux){
  const patch=git('diff','--name-only',P.base,P.accepted,'--',...roots,...versionPaths.map(f=>':(exclude)'+f)).toString().trim().split('\n').filter(Boolean);
  assert.deepEqual(patch.sort(),['core/academy-gold-presentation.js','styles/academy-gold.css']);
  assert.ok([P.old,P.version].includes(acceptedVersion));
  for(const file of versionPaths)assert.deepEqual(git('show',P.accepted+':'+file),Buffer.from(git('show',P.base+':'+file).toString().replaceAll(P.old,acceptedVersion)),'Только версия в принятом app/shell: '+file);
  for(const file of patch)presentationPatchHashes.push({file,sha256:hash(git('show',P.accepted+':'+file))});
 }
 for(const item of source){const actual=await read(item.file);if(versionPaths.includes(item.file)){
  const before=git('show',P.accepted+':'+item.file).toString();assert.ok(before.includes(acceptedVersion),item.file);assert.deepEqual(actual,Buffer.from(before.replaceAll(acceptedVersion,P.version)),item.file);
 }else assert.equal(blob(actual),item.sha,'Принятый source изменён: '+item.file);}
 git('diff','--exit-code',P.accepted,'--',...roots,...versionPaths.map(f=>':(exclude)'+f));
 assert.equal(git('ls-files','--others','--exclude-standard','--',...roots).toString().trim(),'','Новый source вне принятого SHA');
 const historical=tree(P.base,'releases','entry-assets');for(const item of historical)assert.equal(blob(await read(item.file)),item.sha,'Изменено историческое поколение: '+item.file);
 const names=new Set();for(const record of m.files){assert.ok(!names.has(record.file),'Повтор manifest path');names.add(record.file);const bytes=await read(record.file);assert.equal(bytes.length,record.bytes,record.file);assert.equal(hash(bytes),record.sha256,record.file);}
 const payload=source.filter(x=>!x.file.startsWith('server-access/')&&!x.file.startsWith('cloudflare/')).map(x=>x.file).concat('version.json');
 for(const file of payload)assert.deepEqual(await read('releases/'+P.generation+'/'+file),await read(file),file);
 assert.equal((await json('courses/cpp/data/lessons.ru.json')).lessons.length,50);assert.equal((await json('courses/cpp/data/lessons.en.json')).lessons.length,13);
 const newFiles=git('ls-files','--others','--exclude-standard','--','releases','entry-assets').toString().trim().split('\n').filter(Boolean);
 const changed=git('diff','--name-only',P.base,'--','releases','entry-assets').toString().trim().split('\n').filter(Boolean);
 // Только точные неизменяемые M5 bytes; старый service-worker authority не расширяется.
 const preservedM5=new Map([...tree('b6c092b5259161ef31824b0786583bbdd9802b52').map(x=>['releases/ui1a-cpp-gold-module5-test1-20261026/'+x.file,x.sha]),...tree('d2fbfb06525a6c6606abc17b15819e2b2e8dd06a').map(x=>['entry-assets/ui1a-cpp-gold-module5-test1-20261026/'+x.file,x.sha])]);
 for(const [file,sha]of preservedM5)assert.equal(blob(await read(file)),sha,'Сохранённые M5 bytes: '+file);
 for(const file of [...newFiles,...changed]){if(file.startsWith('releases/'+P.generation+'/')||file.startsWith('entry-assets/'+P.generation+'/'))continue;assert.equal(blob(await read(file)),preservedM5.get(file),'Только точные сохранённые M5 bytes: '+file);}
 if(rebuild){const temp=await mkdtemp(path.join(tmpdir(),'nexus-m3-publication-')),out=path.join(temp,'build');execFileSync(process.execPath,['tools/build-ui1a-release.mjs','--out',out],{cwd:root,stdio:'pipe'});
  assert.deepEqual(JSON.parse(await readFile(path.join(out,'BUILD_MANIFEST.json'))),m);for(const file of ['index.html','nexus-shell.html','offline.html','version.json','service-worker.js','BUILD_MANIFEST.json'])assert.deepEqual(await read(file),await readFile(path.join(out,file)),file);
 }
 const sourceChanged=git('diff','--name-only','98b884f70c53bac3502b209112d0d3f19e401699',P.accepted,'--',...roots).toString().trim().split('\n').filter(Boolean);
 const publicationPaths=['releases/ui1a-cpp-gold-module5-test1-20261026','entry-assets/ui1a-cpp-gold-module5-test1-20261026','core/shell-presentation.js','release-candidate.json','project.json','version.json','index.html','nexus-shell.html','offline.html','service-worker.js','BUILD_MANIFEST.json','releases/'+P.generation,'entry-assets/'+P.generation];
 // Старые M2 gates сравнивают с более ранним main: исключения применяются только
 // после точной проверки всех сохранённых исторических bytes выше.
 for(const generation of c.retainedPublicGenerations)publicationPaths.push('releases/'+generation,'entry-assets/'+generation);
 const result={status:'PASS',stage:'M4-publication',publication:true,m4Publication:true,m4Authoring:true,m4Base:P.base,currentLessonCount:50,baseCommit:P.base,acceptedSource:P.accepted,checkedSource:P.checked,version:P.version,generation:P.generation,authoring:true,navigationFix:true,productPatchPaths:[...new Set([...sourceChanged,...publicationPaths])],sourceFilesChecked:source.length,sourceHashesVerified:true,historicalFilesPreserved:historical.length,historicalGenerationsUnchanged:true,publishedRootsAndGenerationsUnchanged:false,manifestFiles:m.files.length,sourcePayloads:payload.length,reproducibleRebuildChecked:rebuild,identityCloudProjectStoreUnchanged:true,legacyImporterBodyUnchanged:true,legacyRowsAndQuizUnchanged:true,curriculumExpanded:true,officialRelease:false,live:false,productionExecution:false,...(P.ux?{uiPresentationPatch:true,presentationPatchHashes,executableContractsUnchangedSince:P.base}:{} )};
 if(writeEvidence){const out=path.resolve(process.env.NEXUS_M4_PUBLICATION_EVIDENCE||process.env.NEXUS_GOLD_EVIDENCE||'academy-gold-m3-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'M4_PUBLICATION_GATE.json'),JSON.stringify(result,null,2)+'\n');}
 return result;
}
