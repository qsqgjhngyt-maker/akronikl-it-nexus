// Непубликованный review 12.11.2026. Не выдаёт и не изменяет admission исторического S1/P4-Q.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {REFERENCE_IDS} from '../core/reference-course-routes.mjs';
import {assertReferenceEdition} from '../tests/helpers/reference-course-contract.mjs';
const base='9a01de88dac94729b0bb232fb18bd6de49e7507d';
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{maxBuffer:64e6});
git('merge-base','--is-ancestor',base,'HEAD');assert.equal(REFERENCE_IDS.length,10);
const manifest='docs/ru/03-content/reference-courses-20261112/APPROVED_REFERENCE_BYTES.json',pins=JSON.parse(readFileSync(manifest)).files;
assert.equal(new Set(pins.map(p=>p.path)).size,pins.length,'Unique exact-byte pins');
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const p of pins){assert.equal(hash(readFileSync(p.path)),p.newSha256,'Reference exact bytes: '+p.path);if(p.oldSha256!==null)assert.equal(hash(git('show',base+':'+p.path)),p.oldSha256,'Pinned baseline: '+p.path);}
const protectedRoots=['server-access','cloudflare','sync','project-studio','pwa','runtime-packs','entry-assets','release','releases','core/storage.js','core/account-storage.js','core/cpp-clarity-r3-state.mjs','core/cpp-clarity-r3-session.mjs','courses/onec-education/studio-profile.mjs','courses/onec-education/studio-store.mjs','courses/onec-education/model.mjs','tools/content-publication-route.mjs','tools/classify-cpp-clarity-ci.mjs','tools/check-cpp-clarity-basic-policy.json','docs/ru/03-content/onec/review-0305/CI_ROUTING_SCOPE.json','release-candidate.json','version.json','service-worker.js'];
assert.equal(git('diff','--name-only',base,'--',...protectedRoots).toString().trim(),'','Identity/storage/runtime/admission unchanged since actual baseline');
const names=[...new Set([...git('diff','--name-only','-z',base,'--').toString().split('\0'),...git('ls-files','--others','--exclude-standard','-z').toString().split('\0')].filter(Boolean))];
const approved=new Set(pins.map(p=>p.path));
for(const name of names){assert.ok(existsSync(name),'Deletion is not allowed: '+name);assert.ok(approved.has(name)||name===manifest||name.startsWith('docs/ru/03-content/reference-courses-20261112/'),'Out of reference scope: '+name);}
for(const id of REFERENCE_IDS)for(const locale of ['ru','en'])assertReferenceEdition(id,locale);
console.log(JSON.stringify({status:'AUTOMATED PASS',baseline:base,head:git('rev-parse','HEAD').toString().trim(),pinnedPaths:pins.length,changedPaths:names.length,protectedRoots,publicationAuthorized:false,releaseEligible:false,historicalS1AdmissionReissued:false,cloudWrites:0}));
