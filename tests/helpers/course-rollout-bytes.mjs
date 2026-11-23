import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const file='docs/ru/03-content/reference-courses-20261112/rollout-20261122/IMPLEMENTATION_BYTES.json';
const repairFile='docs/ru/03-content/reference-courses-20261112/C12_REPAIR_BYTES.json';
const historicalPins=existsSync(file)?JSON.parse(readFileSync(file)).files:[];
export const releaseRepairPins=existsSync(repairFile)?JSON.parse(readFileSync(repairFile)).files:[];
const activePins=new Map(historicalPins.map(pin=>[pin.path,pin]));
for(const pin of releaseRepairPins){
 const previous=activePins.get(pin.path);
 if(previous)assert.equal(pin.beforeSha256,previous.newSha256,'Previous rollout pin: '+pin.path);
 activePins.set(pin.path,pin);
}
export const rolloutPins=[...activePins.values()];
const digests=new Map(rolloutPins.map(p=>[p.path,p.newSha256]));
export const rolloutDigest=(file,previous)=>digests.get(file)||previous;
export function assertRolloutBytes(){for(const p of rolloutPins)assert.equal(createHash('sha256').update(readFileSync(p.path)).digest('hex'),p.newSha256,'Точные bytes распространения: '+p.path);}
