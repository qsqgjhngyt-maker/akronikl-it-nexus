import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const file='docs/ru/03-content/reference-courses-20261112/rollout-20261122/IMPLEMENTATION_BYTES.json';
export const rolloutPins=existsSync(file)?JSON.parse(readFileSync(file)).files:[];
const digests=new Map(rolloutPins.map(p=>[p.path,p.newSha256]));
export const rolloutDigest=(file,previous)=>digests.get(file)||previous;
export function assertRolloutBytes(){for(const p of rolloutPins)assert.equal(createHash('sha256').update(readFileSync(p.path)).digest('hex'),p.newSha256,'Точные bytes распространения: '+p.path);}
