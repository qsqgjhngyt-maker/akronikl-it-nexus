import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,snapshot} from '../tools/classify-cpp-clarity-ci.mjs';
const read=()=>snapshot({worktree:process.env.NEXUS_CI_PROFILE_WORKTREE==='1'});
test('Чистый согласованный модуль → BASIC',async()=>{const r=await classify(await read());assert.equal(r.profile,'BASIC',r.reason);});
test('Защищённый исходник → FULL',async()=>{const s=await read();s.changed.push('core/storage.js');const r=await classify(s);assert.equal(r.profile,'FULL');assert.match(r.reason,/PROTECTED_OR_UNKNOWN/);});
test('Неизвестное изменение → FULL',async()=>{const s=await read();s.changed.push('unknown/unreviewed.txt');const r=await classify(s);assert.equal(r.profile,'FULL');assert.match(r.reason,/PROTECTED_OR_UNKNOWN/);});
