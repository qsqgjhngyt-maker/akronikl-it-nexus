import {execFileSync}from'node:child_process';import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const base=process.env.ONEC_BASE_SHA||'d8721e06a2b1ac953aa18694c07559c62d388700';
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const changed=[...new Set([...git(['diff','--name-only','-z',base]).split('\0'),...git(['ls-files','--others','--exclude-standard','-z']).split('\0')].filter(Boolean))];
const allowed=/^(courses\/(onec|1c-enterprise|onec-education)\/|tests\/onec-[a-z.-]+\.mjs$|tools\/(check-onec-[a-z.-]+\.(mjs|ps1)|build-onec-offline\.mjs)$|docs\/ru\/(03-content\/onec\/|00-project\/ONEC_[A-Z0-9_]+\.md$)|\.github\/workflows\/onec-education-candidate\.yml$)/;
assert.ok(changed.length,'Нет изменений кандидата');for(const file of changed)assert.match(file,allowed,'Вне разрешённой области: '+file);
const protectedPaths=['core/app.js','core/storage.js','core/course-registry.js','core/offline-assets.js','courses/catalog.json','courses/programming/languages.json','sandbox/languages.js','sandbox/runtime-router.js','project-studio/project-store.js','pwa/service-worker.js','release-candidate.json','content/schemas/content-package-v1.schema.json'];
const hashes=[];for(const file of protectedPaths){const bytes=fs.readFileSync(file),old=execFileSync('git',['show',base+':'+file],{maxBuffer:5000000});assert.ok(bytes.equals(old),'Защищённый contract изменён: '+file);hashes.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});}
console.log(JSON.stringify({status:'AUTOMATED PASS',base,changedFiles:changed.length,existingContractsByteIdentical:true,protected:hashes},null,2));
