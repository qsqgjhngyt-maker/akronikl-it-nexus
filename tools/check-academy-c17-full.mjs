import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {C12_BASE} from './check-academy-expansion.mjs';

const accepted = 'f3cb4ac51443f4b74a88248befb2e537f1ecd178';
const pinsPath = 'docs/ru/03-content/cp-next-01/CP_FULL_PRESENTATION_BYTES.json';
const pinned=[
  'core/academy-catalog.js','core/academy-course-cards.js',
  'tests/shared-presentation-check.mjs','tests/helpers/course-rollout-bytes.mjs',
];
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{maxBuffer:16*1024*1024});
const blob=(rev,file)=>git('show',rev+':'+file);
const data=(rev,file)=>JSON.parse(blob(rev,file));
const digest=(rev,file)=>createHash('sha256').update(blob(rev,file)).digest('hex');

export function verifyFullC17({base,head}){
  assert.equal(base,C12_BASE,'База PR должна соответствовать C12');
  assert.match(head ?? '',/^[a-f0-9]{40}$/);
  git('merge-base','--is-ancestor',base,accepted);
  git('merge-base','--is-ancestor',accepted,head);
  const tree=git('rev-parse','HEAD^{tree}').toString().trim();
  assert.equal(tree,git('rev-parse',head+'^{tree}').toString().trim());
  assert.equal(git('status','--porcelain=v1','-z').length,0);
  const curriculumPath='courses/c/curriculum.json';
  const manifestPath='courses/c/manifest.json';
  const curriculum=data(accepted,curriculumPath);
  const manifest=data(accepted,manifestPath);
  const actualCurriculum=data(head,curriculumPath);
  const actualManifest=data(head,manifestPath);
  const last=curriculum.modules.slice(curriculum.availableModuleCount);
  assert.deepEqual(last.map(module=>module.id),['c.m9','c.m10','c.m11','c.m12']);
  const ids=last.flatMap(module=>module.topics.map(topic=>topic.id));
  assert.equal(ids.length,18);
  for(const module of last){
    assert.equal(module.status,'planned');
    module.status='implemented';
    for(const topic of module.topics)topic.status='implemented';
    if(module.project)module.project.status='implemented';
  }
  assert.deepEqual(actualCurriculum,{...curriculum,availableModuleCount:12,availableTopicCount:59,runtime:actualCurriculum.runtime});
  assert.deepEqual(actualManifest,{
    ...manifest,status:'module-12-candidate',description:actualManifest.description,
    availableModuleIds:[...manifest.availableModuleIds,...last.map(module=>module.id)],
    availableTopicIds:[...manifest.availableTopicIds,...ids],
  });
  const newFiles=[
    ...ids.flatMap(id=>manifest.availableLocales.map(locale=>'courses/c/lessons/'+id+'.'+locale+'.json')),
    'tools/check-academy-c17-full.mjs','tests/helpers/c17-vectors.mjs',
    pinsPath,'docs/ru/03-content/cp-next-01/CP_FULL_REVIEW_RU.md',
  ];
  const changed=[
    ...pinned,curriculumPath,manifestPath,'core/code-hub-presentation.js',
    'core/c-course-workspace.mjs','core/c-course.mjs','locales/en/ui.json','locales/ru/ui.json',
    '.github/workflows/academy-expansion-regression.yml','.github/workflows/cp-next-01-c-course.yml',
    'tests/c-course-browser-check.mjs','tests/c-course-content.test.mjs','tests/c-course-offline-browser-check.mjs',
    'tests/c-course-native-compiler-check.mjs','tests/c-course-runtime-browser-check.mjs','tests/c-course-runtime-matrix-check.mjs',
  ];
  const expected=new Map([...newFiles.map(file=>[file,'A']),...changed.map(file=>[file,'M'])]);
  const parts=git('diff','--no-renames','--name-status','-z',accepted,head).toString().split('\0');
  assert.equal(parts.pop(),'');
  assert.equal(parts.length%2,0);
  const delta=[];
  for(let index=0;index<parts.length;index+=2){
    const [status,file]=[parts[index],parts[index+1]];
    assert.equal(status,expected.get(file),'Путь вне согласованной области или неверная операция: '+file);
    assert.match(git('ls-tree','-z',head,'--',file).toString(),/^100644 blob /);
    expected.delete(file);
    delta.push({status,file});
  }
  assert.equal(expected.size,0,'Нет ожидаемых путей: '+[...expected.keys()].join(', '));
  const pins=data(head,pinsPath);
  assert.equal(pins.baseline,accepted);
  assert.deepEqual(pins.files.map(item=>item.path).sort(),[...pinned].sort());
  for(const pin of pins.files){
    assert.equal(pin.beforeSha256,digest(accepted,pin.path),pin.path+' / M8');
    assert.equal(pin.newSha256,digest(head,pin.path),pin.path+' / CP-C-FULL');
  }
  return {status:'PASS',scope:'CP-C-FULL',base,acceptedBase:accepted,sourceCommit:head,testedTree:tree,
    modules:12,topics:59,editions:118,delta};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const result=verifyFullC17({
    base:process.env.NEXUS_REGRESSION_BASE||C12_BASE,
    head:process.env.NEXUS_REGRESSION_HEAD||git('rev-parse','HEAD').toString().trim(),
  });
  const out=process.env.NEXUS_ACADEMY_EVIDENCE;
  if(out){
    await mkdir(out,{recursive:true});
    await writeFile(path.join(out,'SCOPE.json'),JSON.stringify(result,null,2)+'\n');
  }
  console.log(JSON.stringify(result));
}
