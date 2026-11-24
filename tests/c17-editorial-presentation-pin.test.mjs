import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {acceptsC17OnecCssForProtectedDiff,assertRolloutBytes,rolloutDigest,verifyC17ConditionsCIPins,verifyC17EditorialPins,verifyC17ProtectedDiffPins} from './helpers/course-rollout-bytes.mjs';

const readJSON=file=>JSON.parse(readFileSync(new URL(file,import.meta.url)));
const receipt=readJSON('../docs/ru/03-content/cp-next-01/C17_EDITORIAL_PRESENTATION_BYTES.json');
const conditionsCI=readJSON('../docs/ru/03-content/cp-next-01/C17_CONDITIONS_CI_BYTES.json');
const protectedDiffCI=readJSON('../docs/ru/03-content/cp-next-01/C17_PROTECTED_DIFF_CI_BYTES.json');
const reference=readJSON('../docs/ru/03-content/reference-courses-20261112/APPROVED_REFERENCE_BYTES.json');
const [pin]=receipt.files;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const historicalBytes=(revision,file)=>execFileSync('git',['show',revision+':'+file]);
const previous=new Map(reference.files.map(record=>[record.path,record]));
previous.set(receipt.verifier.path,{newSha256:sha(historicalBytes(receipt.baseline,receipt.verifier.path))});
const helperSha256=sha(historicalBytes(conditionsCI.baselineCI,receipt.verifier.path));
const verify=(candidate,prior=previous)=>verifyC17EditorialPins(candidate,prior,helperSha256);

test('Редакторский пин связывает ранее принятые байты и точный продукт C17',()=>{
 const pins=[...receipt.files,...receipt.protected];
 assert.deepEqual(verify(receipt),[...pins,receipt.verifier]);
 for(const record of pins){
  assert.equal(sha(historicalBytes(receipt.baseline,record.path)),record.beforeSha256);
  assert.equal(sha(historicalBytes(receipt.sourceCommit,record.path)),record.newSha256);
  assert.equal(rolloutDigest(record.path,record.beforeSha256),record.newSha256);
 }
 assertRolloutBytes();
});

test('Подмена или расширение списка путей отклоняются',()=>{
 const [approved,...other]=receipt.files;
 assert.throws(()=>verify({...receipt,files:[{...approved,path:'core/app.js'},...other]}),/Exact C17 editorial/);
 assert.throws(()=>verify({...receipt,files:[...receipt.files,{...approved,path:'core/app.js'}]}),/Exact C17 editorial/);
 const [known,...rest]=receipt.protected;
 for(const file of ['pwa/policy.js','server-access/bff/server.mjs']){
  assert.throws(()=>verify({...receipt,protected:[{...known,path:file},...rest]}),/Exact C17 protected/);
 }
});

test('Неверная база, неизвестный SHA и разрыв предыдущего пина отклоняются',()=>{
 const unknown='1'.repeat(40);
 const unknownBytes='1'.repeat(64);
 assert.throws(()=>verify({...receipt,baseline:unknown}),/C17 editorial baseline/);
 assert.throws(()=>verify({...receipt,sourceCommit:unknown}),/C17 editorial source/);
 assert.throws(()=>verify({...receipt,files:[{...pin,newSha256:unknownBytes},...receipt.files.slice(1)]}),/Exact C17 editorial/);
 const [known,...rest]=receipt.protected;
 assert.throws(()=>verify({...receipt,protected:[{...known,newSha256:unknownBytes},...rest]}),/Exact C17 protected/);
 assert.throws(()=>verify(receipt,new Map(previous).set(known.path,{newSha256:unknownBytes})),/Previous protected pin/);
 assert.throws(()=>verify(receipt,new Map(previous).set(pin.path,{newSha256:unknownBytes})),/Previous presentation pin/);
 assert.throws(()=>verify({...receipt,verifier:{...receipt.verifier,newSha256:unknownBytes}}),/Exact C17 test verifier/);
 assert.throws(()=>verify(receipt,new Map(previous).set(receipt.verifier.path,{newSha256:unknownBytes})),/Previous verifier pin/);
});

test('Принятые байты теста условий и точный verifier продолжают прежнюю цепочку',()=>{
 const prior=new Map([
  [conditionsCI.test.path,{newSha256:sha(historicalBytes(conditionsCI.sourceCommit,conditionsCI.test.path))}],
  [conditionsCI.verifier.path,receipt.verifier],
 ]);
 const latestHelper=sha(historicalBytes(protectedDiffCI.baselineCI,conditionsCI.verifier.path));
 const inspect=(value,expected=prior)=>verifyC17ConditionsCIPins(value,expected,latestHelper);
 assert.equal(sha(historicalBytes(conditionsCI.baselineCI,conditionsCI.test.path)),conditionsCI.test.newSha256);
 assert.equal(rolloutDigest(conditionsCI.test.path,conditionsCI.test.beforeSha256),conditionsCI.test.newSha256);
 assert.deepEqual(inspect(conditionsCI),[conditionsCI.test,conditionsCI.verifier]);
 assert.equal(rolloutDigest('courses/onec-education/candidate.css','historical-css'),'historical-css');
 const unknown='1'.repeat(40),unknownBytes='1'.repeat(64);
 assert.throws(()=>inspect({...conditionsCI,baselineCI:unknown}),/C17 conditions CI baseline/);
 assert.throws(()=>inspect({...conditionsCI,sourceCommit:unknown}),/C17 conditions CI product/);
 assert.throws(()=>inspect({...conditionsCI,test:{...conditionsCI.test,path:'courses/onec-education/candidate.css'}}),/Exact C17 conditions test/);
 assert.throws(()=>inspect({...conditionsCI,test:{...conditionsCI.test,newSha256:unknownBytes}}),/Exact C17 conditions test/);
 assert.throws(()=>inspect({...conditionsCI,verifier:{...conditionsCI.verifier,newSha256:unknownBytes}}),/Exact C17 conditions verifier/);
 assert.throws(()=>inspect(conditionsCI,new Map(prior).set(conditionsCI.test.path,{newSha256:unknownBytes})),/Previous C17 CI pin/);
 assert.throws(()=>inspect(conditionsCI,new Map(prior).set(conditionsCI.verifier.path,{newSha256:unknownBytes})),/Previous C17 CI pin/);
});

test('Точный CSS скрывается только в 18 проверках сохранности и виден обеим фазам P2',()=>{
 const {css,verifier,presentationVerifier}=protectedDiffCI;
 const historical=historicalBytes('b170c7f64ab70bb6f0499f10704ac38a1d75e97c',css.path);
 const exact=historicalBytes(protectedDiffCI.sourceCommit,css.path);
 const known=[
  ...Array.from({length:8},(_,i)=>'tests/cpp-clarity-enterprise-a'+(i+1)+'-module-content.test.mjs'),
  ...Array.from({length:10},(_,i)=>'tests/cpp-clarity-onec-p'+(i+3)+'-module-content.test.mjs'),
 ];
 for(const testFile of known)assert.equal(acceptsC17OnecCssForProtectedDiff(testFile,()=>exact),true,testFile);
 for(const testFile of ['tests/cpp-clarity-onec-p2-conditions-content.test.mjs','tests/cpp-clarity-onec-p2-types-content.test.mjs','tests/cpp-clarity-onec-p13-module-content.test.mjs','other/cpp-clarity-enterprise-a1-module-content.test.mjs']){
  assert.equal(acceptsC17OnecCssForProtectedDiff(testFile,()=>assert.fail('Unexpected CSS reader')),false,testFile);
 }
 assert.equal(acceptsC17OnecCssForProtectedDiff(known[0],()=>historical),false);
 const wrongSuffix=Buffer.from(exact);wrongSuffix[historical.length]^=1;
 const wrongPrefix=Buffer.from(exact);wrongPrefix[0]^=1;
 assert.throws(()=>acceptsC17OnecCssForProtectedDiff(known[0],()=>wrongSuffix),/exact suffix/);
 assert.throws(()=>acceptsC17OnecCssForProtectedDiff(known[0],()=>wrongPrefix),/historical prefix/);
 const previous=new Map([verifier,presentationVerifier].map(pin=>[pin.path,{
  newSha256:sha(historicalBytes(protectedDiffCI.baselineCI,pin.path)),
 }]));
 const verifyProtected=value=>verifyC17ProtectedDiffPins(value,previous,sha(readFileSync(verifier.path)),sha(readFileSync(presentationVerifier.path)));
 assert.deepEqual(verifyProtected(protectedDiffCI),[verifier,presentationVerifier]);
 assert.throws(()=>verifyProtected({...protectedDiffCI,sourceCommit:'1'.repeat(40)}),/protected diff product/);
 assert.throws(()=>verifyProtected({...protectedDiffCI,css:{...css,path:'styles/app.css'}}),/stylesheet approval/);
 assert.equal(rolloutDigest(css.path,'historical-css'),'historical-css');
});
