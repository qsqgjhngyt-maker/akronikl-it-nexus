import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {assertPreservedOrReference} from '../tests/helpers/reference-course-contract.mjs';
import {GOLD_ALGORITHM_LESSONS,GOLD_BASICS_LESSONS,GOLD_CLASSIC_LESSONS,GOLD_EVENT_LESSONS,GOLD_OOP_LESSONS,GOLD_STRUCTURED_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
const base='ee2787c0cd92da2ad1d5e79df5e2bfadab2c3dd6',git=(...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{maxBuffer:64e6}),sha=b=>createHash('sha256').update(b).digest('hex');
const fixed=['courses/cpp/curriculum.json','courses/cpp/manifest.json','courses/cpp/content-package.json','courses/cpp/data/lessons.ru.json','courses/cpp/data/lessons.en.json','courses/cpp/data/gold-laboratories-m6.json','core/account-storage.js','pwa/local-vault.js','pwa/offline-learning.js','pwa/local-editor.js','pwa/runtime-manifest.js','tools/check-cpp-course-perf.mjs','release-candidate.json','version.json','index.html','service-worker.js'];
const preserved=[];for(const file of fixed){const a=git('show',base+':'+file),b=await readFile(file);assert.deepEqual(b,a,file);preserved.push({file,sha256:sha(b),bytes:b.length});}
const names=git('diff','--name-only','-z',base,'--').toString().split('\0').filter(Boolean);
const extendedGoldPaths=new Set([...GOLD_STRUCTURED_LESSONS,...GOLD_CLASSIC_LESSONS,...GOLD_OOP_LESSONS,...GOLD_EVENT_LESSONS].flatMap(id=>['ru','en'].map(locale=>goldLessonPath(id,locale))));
const contractApproved=new Set(['core/storage.js','pwa/offline-center.js','sandbox/code-studio.js','sandbox/sandbox.js','courses/onec-education/model.mjs','courses/onec-education/candidate.mjs','courses/onec-education/integration.mjs','core/cpp-clarity-r3-session.mjs','core/cpp-clarity-r3-renderer.mjs']);
const p1Edition=/^courses\/clarity\/authoring\/onec\.p1\.(?:architecture|infobase|lifecycle|tools)\.(?:ru|en)\.json$/;
const p2TypesEdition=/^courses\/clarity\/authoring\/onec\.p2\.topic-2\.(?:ru|en)\.json$/;
const p2ConditionsEdition=/^courses\/clarity\/authoring\/onec\.p2\.topic-3\.(?:ru|en)\.json$/;
const p1Media=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P1_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const [file,digest]of p1Media)assert.equal(sha(await readFile(file)),digest,'P1 original screenshot: '+file);
const p2TypesMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P2_TYPES_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const [file,digest]of p2TypesMedia)assert.equal(sha(await readFile(file)),digest,'P2 original screenshot: '+file);
const p2ConditionsMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P2_CONDITIONS_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of p2ConditionsMedia)assert.equal(sha(await readFile(file)),digest,'P2 conditions native image: '+file);
const presentationOnly=new Set(['courses/onec-education/lesson-media.mjs','core/clarity-course-progress.mjs','courses/onec-education/candidate.css']);
// MASTER00 / 90ffee3a: только согласованные пути и точные bytes визуального исправления.
const approvedOnecUiPaths=new Map([
 ['styles/clarity-onec-p2-types.css','9d96321aeed8c79f7fa7e49d3a6beb1836630045ab1f7f6ae2791440cdcdeb14'],
 ['styles/clarity-onec-code-studio.css','403f23e6146c6737685cb0305f32ed77d3a1a4c6327470d8d69da59209f78a84'],
 ['courses/onec-education/candidate.css','31025ebda96d0bc1d9add3802bb604cbe8c1e8cbff2257752b0bd8944f5f59d1'],
 ['core/cpp-clarity-authored.mjs','223b1493879e47c6182661324ad3edaf295776cb40f2bf5deb9c3ed3b368a6ad'],
 ['core/clarity-visuals.mjs','186f24da2e4cc44de25c6a00285eaf995c3a11074114b7a3a8f6eb958b962ffb'],
]);
for(const[file,digest]of approvedOnecUiPaths)assert.equal(sha(await readFile(file)),digest,'Approved 1C presentation bytes: '+file);
// Модульная поставка P2 по решению владельца и MASTER00 / f636357a.
const p2ModuleSources=new Set(['onec.p2.topic-4','onec.p2.numbers-dates-locales'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const p2ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P2_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of p2ModuleMedia)assert.equal(sha(await readFile(file)),digest,'P2 module genuine image: '+file);
const p3ModuleSources=new Set(['onec.p3.topic-1', 'onec.p3.topic-2', 'onec.p3.topic-3', 'onec.p3.topic-4', 'onec.p3.module-tests'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const p3ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P3_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of p3ModuleMedia)assert.equal(sha(await readFile(file)),digest,'P3 genuine screenshot: '+file);
const p4ModuleSources=new Set(['onec.p4.topic-1','onec.p4.topic-2','onec.p4.topic-3','onec.p4.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const p4ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P4_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of p4ModuleMedia)assert.equal(sha(await readFile(file)),digest,'P4 genuine screenshot: '+file);
const p5ModuleSources=new Set(['onec.p5.topic-1','onec.p5.topic-2','onec.p5.topic-3','onec.p5.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const p5ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P5_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of p5ModuleMedia)assert.equal(sha(await readFile(file)),digest,'P5 genuine screenshot: '+file);
const p6ModuleSources=new Set(['onec.p6.topic-1','onec.p6.topic-2','onec.p6.topic-3','onec.p6.topic-4','onec.p6.reposting'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const p6ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P6_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of p6ModuleMedia)assert.equal(sha(await readFile(file)),digest,'P6 genuine screenshot: '+file);
const p7ModuleSources=new Set(['onec.p7.topic-1','onec.p7.topic-3','onec.p7.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const p7ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P7_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of p7ModuleMedia)assert.equal(sha(await readFile(file)),digest,'P7 genuine screenshot: '+file);
const p8ModuleSources=new Set(['onec.p8.topic-1','onec.p8.topic-2','onec.p8.topic-3','onec.p8.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const p8ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P8_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of p8ModuleMedia)assert.equal(sha(await readFile(file)),digest,'P8 genuine screenshot: '+file);
const p9ModuleSources=new Set(['onec.p9.topic-1','onec.p9.topic-2','onec.p9.topic-3','onec.p9.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const p9ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P9_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of p9ModuleMedia)assert.equal(sha(await readFile(file)),digest,'P9 genuine screenshot: '+file);
const p10ModuleSources=new Set(['onec.p10.topic-1','onec.p10.topic-2','onec.p10.topic-3','onec.p10.topic-4','onec.p10.safe-mode'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const p10ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P10_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of p10ModuleMedia)assert.equal(sha(await readFile(file)),digest,'P10 genuine screenshot: '+file);
const p11ModuleSources=new Set(['onec.p11.topic-1','onec.p11.topic-2','onec.p11.topic-3','onec.p11.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const p11ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P11_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of p11ModuleMedia)assert.equal(sha(await readFile(file)),digest,'P11 genuine screenshot: '+file);
const p12ModuleSources=new Set(['onec.p12.topic-1','onec.p12.topic-2','onec.p12.topic-3','onec.p12.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const p12ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ONEC_P12_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of p12ModuleMedia)assert.equal(sha(await readFile(file)),digest,'P12 genuine screenshot: '+file);
const a1ModuleSources=new Set(['1c-enterprise.a1.orientation','1c-enterprise.a1.modes','1c-enterprise.a1.interface','1c-enterprise.a1.safe-lab'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const a1ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ENTERPRISE_A1_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of a1ModuleMedia)assert.equal(sha(await readFile(file)),digest,'A1 genuine screenshot: '+file);
const a2ModuleSources=new Set(['1c-enterprise.a2.topic-1','1c-enterprise.a2.topic-2','1c-enterprise.a2.topic-3','1c-enterprise.a2.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const a2ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ENTERPRISE_A2_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of a2ModuleMedia)assert.equal(sha(await readFile(file)),digest,'A2 genuine screenshot: '+file);
const a3ModuleSources=new Set(['1c-enterprise.a3.topic-1','1c-enterprise.a3.topic-2','1c-enterprise.a3.topic-3','1c-enterprise.a3.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const a3ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ENTERPRISE_A3_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of a3ModuleMedia)assert.equal(sha(await readFile(file)),digest,'A3 genuine screenshot: '+file);
const a4ModuleSources=new Set(['1c-enterprise.a4.topic-1','1c-enterprise.a4.topic-2','1c-enterprise.a4.topic-3','1c-enterprise.a4.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const a4ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ENTERPRISE_A4_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of a4ModuleMedia)assert.equal(sha(await readFile(file)),digest,'A4 genuine screenshot: '+file);
const a5ModuleSources=new Set(['1c-enterprise.a5.topic-1','1c-enterprise.a5.topic-2','1c-enterprise.a5.topic-3','1c-enterprise.a5.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const a5ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ENTERPRISE_A5_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of a5ModuleMedia)assert.equal(sha(await readFile(file)),digest,'A5 genuine screenshot: '+file);
const a6ModuleSources=new Set(['1c-enterprise.a6.topic-1','1c-enterprise.a6.topic-2','1c-enterprise.a6.topic-3','1c-enterprise.a6.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const a6ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ENTERPRISE_A6_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of a6ModuleMedia)assert.equal(sha(await readFile(file)),digest,'A6 genuine screenshot: '+file);
const a7ModuleSources=new Set(['1c-enterprise.a7.topic-1','1c-enterprise.a7.topic-2','1c-enterprise.a7.topic-3','1c-enterprise.a7.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const a7ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ENTERPRISE_A7_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of a7ModuleMedia)assert.equal(sha(await readFile(file)),digest,'A7 genuine screenshot: '+file);
const a8ModuleSources=new Set(['1c-enterprise.a8.topic-1','1c-enterprise.a8.topic-2','1c-enterprise.a8.topic-3','1c-enterprise.a8.topic-4'].flatMap(id=>['ru','en'].map(locale=>'courses/clarity/authoring/'+id+'.'+locale+'.json')));
const a8ModuleMedia=new Map(JSON.parse(await readFile('docs/ru/03-content/cpp-clarity-01/R65_ENTERPRISE_A8_MODULE_NATIVE_CAPTURES.json','utf8')).images.map(f=>['courses/clarity/'+f.src,f.sha256]));
for(const[file,digest]of a8ModuleMedia)assert.equal(sha(await readFile(file)),digest,'A8 genuine screenshot: '+file);
const sourceAllow=new Set([...presentationOnly,'core/clarity-visuals.mjs',...contractApproved,'tests/helpers/module3-gold-programs.mjs','tests/helpers/module4-gold-programs.mjs','tests/helpers/module5-gold-programs.mjs','tests/helpers/module6-gold-programs.mjs','tests/code-studio-foundation-check.mjs','akronikl/knowledge/core-index.ru.json','akronikl/knowledge/core-index.en.json','akronikl/knowledge/manifest.json','akronikl/ui/knowledge-loader.js','tests/platform-lazy-imports.test.mjs','tests/workspace-persistence-resume-check.mjs','tests/account-storage-isolation-check.mjs','core/cpp-clarity-r3-state.mjs','core/clarity-course-registry.mjs','core/clarity-course-controls.mjs','core/cpp-clarity-authored.mjs','tools/preview-cpp-clarity-r3.mjs','tools/START_CPP_CLARITY_R3.cmd','tools/start-cpp-clarity-r3.mjs','tools/cpp-clarity-r3-pilot-preview.mjs','tools/preview-cpp-clarity.mjs','tools/START_CPP_CLARITY.cmd','core/academy-gold-presentation.js','core/cpp-clarity-presentation.js','core/learning-views.js','core/app.js','core/nexus-learning-discovery.js','styles/academy-gold.css','pwa/offline-entry.js','courses/cpp/data/gold-laboratories.json','tools/build-academy-gold-laboratories.mjs','.github/workflows/cpp-clarity-01.yml']);
for(const file of approvedOnecUiPaths.keys())sourceAllow.add(file);
for(const file of [...p2ModuleSources,...p2ModuleMedia.keys(),...p3ModuleSources,...p3ModuleMedia.keys(),...p4ModuleSources,...p4ModuleMedia.keys(),...p5ModuleSources,...p5ModuleMedia.keys(),...p6ModuleSources,...p6ModuleMedia.keys(),...p7ModuleSources,...p7ModuleMedia.keys(),...p8ModuleSources,...p8ModuleMedia.keys(),...p9ModuleSources,...p9ModuleMedia.keys(),...p10ModuleSources,...p10ModuleMedia.keys(),...p11ModuleSources,...p11ModuleMedia.keys(),...p12ModuleSources,...p12ModuleMedia.keys(),...a1ModuleSources,...a1ModuleMedia.keys(),...a2ModuleSources,...a2ModuleMedia.keys(),...a3ModuleSources,...a3ModuleMedia.keys(),...a4ModuleSources,...a4ModuleMedia.keys(),...a5ModuleSources,...a5ModuleMedia.keys(),...a6ModuleSources,...a6ModuleMedia.keys(),...a7ModuleSources,...a7ModuleMedia.keys(),...a8ModuleSources,...a8ModuleMedia.keys()])sourceAllow.add(file);
// MASTER 00: только три новых QA-only пути с точными bytes; защищённые области не расширяются.
const qaDiagnosticApproved=new Map([
 ['.github/workflows/cpp-clarity-qt03-selected.yml','a29885a26b6d4f80387da7ce354128d701e29b3f65aa1d6f658dbcd44e163d68'],
 ['tools/cpp-clarity-qt03-prepare.mjs','d47cce11cfbfe57fe4e9f1b635ac30ca5b54e6e033093423e5701a8490e20aec'],
 ['tools/cpp-clarity-qt03-preflight.mjs','860a3e6746bdb2b973e5de19f7145c724ba3400374ac44c7ec0edfac23dd06f7'],
]);
for(const[file,digest]of qaDiagnosticApproved)assert.equal(sha(await readFile(file)),digest,'Approved QA diagnostic bytes: '+file);
// Helper уже допущен существующим QA-шаблоном; здесь только дополнительная проверка его неизменности.
assert.equal(sha(await readFile('tests/helpers/cpp-clarity-qt03-selection-diagnostic.mjs')),'0139e8c726ecdcd1517bb1d745b40d9397c9020b1a1dc9d333bdee87446aee29','Unchanged Qt diagnostic helper');
// MASTER 00: однократная миграция BASIC, два точных новых инструмента.
const ciBasicToolApproved=new Map([
 ['tools/classify-cpp-clarity-ci.mjs','fb79b206d9da443dd7af287fffb1a90ad2963cc9284443e17dcc206b9cc9bd0c'],
 ['tools/package-cpp-clarity-basic-source.py','5a229216ff7fc13ba6a27c61da2b0efb49c23fd0e16fd578953f7298a925520e']
]);
for(const[file,digest]of ciBasicToolApproved){assert.equal(sha(await readFile(file)),digest,'Approved BASIC CI bytes: '+file);sourceAllow.add(file);}
const referencePins=JSON.parse(await readFile('docs/ru/03-content/reference-courses-20261112/APPROVED_REFERENCE_BYTES.json','utf8')).files;
for(const pin of referencePins){assert.equal(sha(await readFile(pin.path)),pin.newSha256,'Reference exact bytes: '+pin.path);sourceAllow.add(pin.path);}
const referenceQa=new Set(['tests/helpers/reference-course-contract.mjs','tests/reference-courses-content.test.mjs','tests/reference-courses-browser.mjs','tests/reference-courses-before-browser.mjs','tools/build-reference-courses.mjs','tools/check-reference-courses-native.ps1','tools/check-reference-applied-native.ps1']);
for(const name of names)assert.ok(referenceQa.has(name)||name.startsWith('docs/ru/03-content/reference-courses-20261112/')||sourceAllow.has(name)||qaDiagnosticApproved.has(name)||p1Edition.test(name)||p2TypesEdition.test(name)||p2ConditionsEdition.test(name)||p1Media.has(name)||p2TypesMedia.has(name)||p2ConditionsMedia.has(name)||/^courses\/clarity\/(?:lessons\/|courses\.json$|editorial-map\.json$)/.test(name)||/^courses\/cpp-clarity-r3\/(?:lessons\/|code\/|courses\.json$|setup\.(ru|en)\.json$)/.test(name)||/^review\/cpp-clarity-r3\//.test(name)||/^courses\/cpp\/gold\/(algorithms|basics)\//.test(name)||extendedGoldPaths.has(name)||/^(tests\/(helpers\/)?cpp-clarity-|tools\/(check|build)-cpp-clarity|docs\/ru\/03-content\/cpp-clarity-01\/)/.test(name),'Out of scope: '+name);
const protectedAreas=['courses/1c-enterprise','courses/onec','courses/onec-education','server-access','cloudflare','sync','sandbox','project-studio','core/migrations','releases','entry-assets','runtime-packs'];
for(const area of protectedAreas){const changed=git('diff','--name-only',base,'--',area).toString().trim().split('\n').filter(Boolean);for(const file of changed)assert.ok(contractApproved.has(file)||presentationOnly.has(file)||referencePins.some(p=>p.path===file),'Protected area: '+file);}
// Принятые материалы не редактируются при переносе в доступные offline-builder ресурсы.
for await(const file of (await import('node:fs/promises')).glob('courses/cpp-clarity-r3/**/*')){if((await (await import('node:fs/promises')).stat(file)).isFile())assertPreservedOrReference(file,await readFile(file),await readFile(file.replace(/courses[\\/]cpp-clarity-r3/, 'review/cpp-clarity-r3')),'Accepted R3 resource: '+file);}
const current=JSON.parse(await readFile('courses/cpp/curriculum.json')),old=JSON.parse(git('show',base+':courses/cpp/curriculum.json'));
assert.deepEqual(current,old);assert.equal(current.lessons.length,67);assert.equal(current.lessons.filter(x=>Number.isInteger(x.legacyIndex)).length,40);
const catalog=JSON.parse(await readFile('courses/cpp/data/gold-laboratories.json')),oldCatalog=JSON.parse(git('show',base+':courses/cpp/data/gold-laboratories.json')),revised=new Set([...GOLD_ALGORITHM_LESSONS,...GOLD_BASICS_LESSONS]);
assert.deepEqual(Object.keys(catalog.lessons),Object.keys(oldCatalog.lessons));for(const[id,value]of Object.entries(oldCatalog.lessons))if(!revised.has(id))assert.deepEqual(catalog.lessons[id],value,'Unchanged laboratory metadata: '+id);
const result={status:'PASS',baseline:base,head:git('rev-parse','HEAD').toString().trim(),topicIds:67,legacyIndices:40,protectedAreas,preserved,changedTrackedPaths:names,personalDataAccess:false,productionWrites:false};
const out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE||'cpp-clarity-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'PRESERVATION.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,preserved:preserved.length,changedTrackedPaths:names.length}));
