import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {assertRolloutBytes,rolloutDigest,verifyC17EditorialPins} from './helpers/course-rollout-bytes.mjs';

const readJSON=file=>JSON.parse(readFileSync(new URL(file,import.meta.url)));
const receipt=readJSON('../docs/ru/03-content/cp-next-01/C17_EDITORIAL_PRESENTATION_BYTES.json');
const reference=readJSON('../docs/ru/03-content/reference-courses-20261112/APPROVED_REFERENCE_BYTES.json');
const [pin]=receipt.files;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const historicalBytes=(revision,file)=>execFileSync('git',['show',revision+':'+file]);
const previous=new Map(reference.files.map(record=>[record.path,record]));
previous.set(receipt.verifier.path,{newSha256:sha(historicalBytes(receipt.baseline,receipt.verifier.path))});
const helperSha256=sha(readFileSync(receipt.verifier.path));
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
