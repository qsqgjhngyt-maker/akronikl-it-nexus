import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const file='docs/ru/03-content/reference-courses-20261112/rollout-20261122/IMPLEMENTATION_BYTES.json';
const repairFile='docs/ru/03-content/reference-courses-20261112/C12_REPAIR_BYTES.json';
const referenceFile='docs/ru/03-content/reference-courses-20261112/APPROVED_REFERENCE_BYTES.json';
const candidateFile='docs/ru/03-content/cp-next-01/CANDIDATE_PRESENTATION_BYTES.json';
const historicalPins=existsSync(file)?JSON.parse(readFileSync(file)).files:[];
export const releaseRepairPins=existsSync(repairFile)?JSON.parse(readFileSync(repairFile)).files:[];
const activePins=new Map(historicalPins.map(pin=>[pin.path,pin]));
for(const pin of releaseRepairPins){
 const previous=activePins.get(pin.path);
 if(previous)assert.equal(pin.beforeSha256,previous.newSha256,'Previous rollout pin: '+pin.path);
 activePins.set(pin.path,pin);
}
if(existsSync(candidateFile)){
 const candidate=JSON.parse(readFileSync(candidateFile)).files;
 const reference=new Map(JSON.parse(readFileSync(referenceFile)).files.map(pin=>[pin.path,pin]));
 const acceptedBaseline=new Map([
  ['sandbox/providers/wasm-runtime.js',{newSha256:'8161b23afebee8e6f80688c487d16ed5b7f84d91fdc66604c1cb2ef591c876ea'}],
  ['pwa/offline-entry.js',{newSha256:'37277ced6d328bd659e2bbbca089e64113a506d6fbb3014d476393c5e820fae2'}],
 ]);
 for(const pin of candidate){
  const previous=activePins.get(pin.path)||reference.get(pin.path)||acceptedBaseline.get(pin.path);
  assert.ok(previous,'Existing presentation pin: '+pin.path);
  assert.equal(pin.beforeSha256,previous.newSha256,'Previous presentation pin: '+pin.path);
  activePins.set(pin.path,pin);
 }
}
for(const module of ['M2','M3']){
 const pinFile='docs/ru/03-content/cp-next-01/'+module+'_PRESENTATION_BYTES.json';
 if(!existsSync(pinFile))continue;
 for(const pin of JSON.parse(readFileSync(pinFile)).files){
  const previous=activePins.get(pin.path);
  assert.ok(previous,'Existing presentation pin for '+module+': '+pin.path);
  assert.equal(pin.beforeSha256,previous.newSha256,'Previous presentation pin for '+module+': '+pin.path);
  activePins.set(pin.path,pin);
 }
}
export const rolloutPins=[...activePins.values()];
const digests=new Map(rolloutPins.map(p=>[p.path,p.newSha256]));
export const rolloutDigest=(file,previous)=>digests.get(file)||previous;
export function assertRolloutBytes(){for(const p of rolloutPins)assert.equal(createHash('sha256').update(readFileSync(p.path)).digest('hex'),p.newSha256,'Точные bytes распространения: '+p.path);}
