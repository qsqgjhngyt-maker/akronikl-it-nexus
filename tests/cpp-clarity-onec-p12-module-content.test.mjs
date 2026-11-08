import {approvedPresentationDiff,approvedVisualStylesAddition,assertPreservedOrWrappedFlow} from './helpers/cpp-clarity-approved-presentation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
const ids=[1,2,3,4].map(i=>'onec.p12.topic-'+i),base='cc34c254d7397f8fc83b55daa91092cdd0728b0e';
const docs='docs/ru/03-content/cpp-clarity-01/',native=docs+'R3_EVIDENCE/onec-p12-module/native/';
const json=async p=>JSON.parse(await readFile(p,'utf8')),sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});


test('P12: четыре последовательных урока RU/EN, сильная теория, новые задачи и читаемые результаты',async()=>{
 const edits=await json(docs+'R65_ONEC_P12_THEORY_PRESENTATION_EXCEPTIONS.json');
 for(const id of ids)for(const locale of ['ru','en']){
  const a=await json('courses/clarity/authoring/'+id+'.'+locale+'.json'),d=await json('courses/clarity/lessons/'+id+'.'+locale+'.json'),old=await json(a.source.path);
  assert.equal(old.topicId,id);assert.equal(sha(await readFile(a.source.path)),a.source.sha256);assert.equal(d.authored,true);assert.equal(CLARITY_COURSES[id].contentRevision,a.revision);
  for(const k of ['sections','selfcheck','practice','assessment'])assert.deepEqual(a[k],d[k]);assert.equal(a.sections.length,14);
  for(const[i,s]of old.sections.entries())assert.deepEqual(a.sections.find(s=>s.id==='concept-'+i).paragraphs,s.slice(1).map(p=>edits[locale].reduce((v,[x,y])=>v.replaceAll(x,y),p)));
  for(const[i,q]of old.quiz.entries()){const kept=a.selfcheck.find(x=>x.id==='check-'+i);assert.deepEqual([kept.prompt,kept.options,kept.correct],[q.question,q.options,q.correct]);}
  assert.equal(a.selfcheck.filter(q=>q.kind==='choice').length,5);assert.equal(a.selfcheck.filter(q=>q.kind==='free').length,1);
  const anchors=new Set(a.sections.map(s=>s.id));for(const k of [...Object.values(a.coverage),...a.selfcheck.map(q=>q.recall),a.practice.returnAnchor])assert.ok(anchors.has(k),k);
  const example=a.sections.find(s=>s.id==='example-1').code;assert.ok(example.output.length>80);assert.ok(!example.output.includes('\\n'));assert.ok(!a.practice.cases[0].output.includes('\\n'));assert.ok(a.practice.referenceSolution.source.length>100);assert.notEqual(a.practice.cases[0].output,example.output);
  if(id.endsWith('4')){assert.equal(a.practice.files.length,2);assert.match(a.practice.files[0].content,/TODO/);assert.notEqual(a.practice.files[0].content,a.practice.referenceSolution.files['Данные.bsl']);}
  else assert.deepEqual(a.practice.files,[],'Manual source/database operations are not represented as browser BSL execution');
  assert.equal(a.nativeEvidence.studentAuthorshipVerified,false);
 }
});

test('P12: записанное native evidence различает расширение, Git-сборку, настоящее DT-восстановление и два дефекта запроса',async()=>{
 const a=await json(native+'RESULT.json'),cap=await json(native+'capstone/PEDAGOGY_CAPSTONE_RESULT.json'),g=await json(native+'GIT_RESULT.json'),images=await json(docs+'R65_ONEC_P12_MODULE_NATIVE_CAPTURES.json');
 assert.equal(a.status,'NATIVE BASIC PASS');assert.equal(cap.status,'AUTOMATED PASS');assert.equal(cap.checks.length,10);assert.equal(a.ownerDataUsed,false);assert.equal(a.edtTested,false);assert.equal(a.productionMigrationTested,false);
 assert.equal(a.extension.ownClientModuleObserved,true);assert.equal(a.extension.disabledModuleAbsent,true);assert.equal(a.extension.all12IdentitiesAndFieldsUnchanged,true);for(const key of ['safeModeChanged','dangerousActionProtectionChanged','borrowedFormCommandTested','reenableTested'])assert.equal(a.extension[key],false,key);
 const snapshot=async p=>(await readFile(native+p,'utf8')).trim().split(/\r?\n/),before=await snapshot('capstone/seed-12-440.txt');
 for(const name of ['extension-active-snapshot.txt','extension-disabled-snapshot.txt','original-final440.txt'])assert.deepEqual(await snapshot(name),before);
 const prior=await snapshot('capstone/copy-455.txt'),after=await snapshot('release-independent-475.txt');assert.equal(after.length,12);assert.deepEqual(await snapshot('release-independent-reopen475.txt'),after);
 const changes=[];for(let i=0;i<12;i++){const x=prior[i].split('|'),y=after[i].split('|');assert.equal(x.length,8);assert.equal(y.length,8);for(let j=0;j<8;j++)if(x[j]!==y[j])changes.push([i,j,x[j],y[j]]);}assert.deepEqual(changes,[[0,6,'30','50']]);assert.equal(after.reduce((s,x)=>s+Number(x.split('|')[6]),0),475);
 assert.equal(g.nativeBuild,true);assert.equal(g.clean,true);assert.equal(g.remotes,'');assert.equal(g.dtRestoreClaimedForFreshBuild,false);assert.notEqual(g.workedSha,g.independentSha);assert.notDeepEqual(await snapshot('git-fresh-seed.txt'),before);
 assert.deepEqual(await snapshot('DEFENSE_ACTUAL.txt'),['defense-main|2|3|Да|0|440','defense-independent|1|0|Да|12|440']);
 assert.equal(images.images.length,4);for(const im of images.images){assert.equal(sha(await readFile(docs+im.sourceCapture)),im.sourcePngSha256);assert.equal(sha(await readFile('courses/clarity/'+im.src)),im.sha256);assert.ok(im.width>1000&&im.height>500);}
 const active=await readFile(native+'extension-active-GUI-accessibility.txt','utf8'),disabled=await readFile(native+'extension-disabled-GUI-accessibility.txt','utf8');assert.match(active,/Длительность указывается в минутах/);assert.match(disabled,/Модуль расширения присутствует: Нет/);assert.doesNotMatch(disabled,/Длительность указывается в минутах/);
 assert.match(await readFile(native+'git-main-GUI-accessibility.txt','utf8'),/Версия учебного исходника: 2/);assert.match(await readFile(native+'release-independent-GUI-accessibility.txt','utf8'),/Минут всего в копии: 475/);
});

test('P12: принятые C++, P1–P11 и прочие контракты прежние;два UI-исключения по SHA256; последующие модули отдельно',async()=>{
 for(const area of ['courses/cpp','courses/cpp-clarity-r3','courses/onec','courses/1c-enterprise','courses/onec-education','review/cpp-clarity-r3','core/cpp-clarity-authored.mjs','core/clarity-visuals.mjs','core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-state.mjs','core/storage.js','core/account-storage.js','styles','sandbox','pwa','project-studio','server-access','sync'])assert.equal(approvedPresentationDiff(git('diff','--name-only',base,'--',area)).toString().trim(),'',area);
 const future=Object.keys(CLARITY_COURSES).filter(id=>/^onec\.p1[012]\.|^1c-enterprise\.a[1-8]\./.test(id)),allowed=new Set(future.flatMap(id=>['en','ru'].map(l=>'courses/clarity/lessons/'+id+'.'+l+'.json')));
 for(const f of git('diff','--name-only','-z',base,'--','courses/clarity/lessons').toString().split('\0').filter(Boolean))assert.ok(allowed.has(f),f);
 const old=git('ls-tree','-r','--name-only','-z',base,'--','courses/clarity/authoring').toString().split('\0').filter(Boolean),files=old.flatMap(p=>[p,p.replace('/authoring/','/lessons/')]);
 const raw=execFileSync('git',['-c','core.longpaths=true','cat-file','--batch'],{input:files.map(f=>base+':'+f+'\n').join(''),maxBuffer:64e6});let offset=0;
 for(const f of files){const end=raw.indexOf(10,offset),header=raw.subarray(offset,end).toString().split(' ');assert.equal(header[1],'blob',f);const size=Number(header[2]),blob=raw.subarray(end+1,end+1+size);assert.deepEqual(await readFile(f),blob,f);offset=end+size+2;}

});
