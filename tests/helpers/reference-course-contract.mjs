// Явная миграция требований по единому заданию 12.11.2026.
// Только 10 названных ID: остальные исторические проверки сохраняют строгую семантику.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {REFERENCE_IDS} from '../../core/reference-course-routes.mjs';
import {CLARITY_COURSES} from '../../core/clarity-course-registry.mjs';
export function referencePathId(file){const m=String(file).replaceAll('\\','/').match(/^courses\/(clarity|cpp-clarity-r3)\/lessons\/(.+)\.(ru|en)\.json$/);return m&&REFERENCE_IDS.includes(m[2])?{id:m[2],locale:m[3]}:null;}
const validated=new Map();
export function assertReferenceEdition(id,locale){
 assert.ok(REFERENCE_IDS.includes(id));const folder=CLARITY_COURSES[id].pilot?'cpp-clarity-r3':'clarity',file=`courses/${folder}/lessons/${id}.${locale}.json`,source=`courses/reference/authoring/${id}.${locale}.json`;
 const bytes=readFileSync(file),cacheKey=id+'.'+locale;if(validated.get(cacheKey)?.bytes.equals(bytes)&&validated.get(cacheKey)?.source.equals(readFileSync(source)))return validated.get(cacheKey).lesson;const l=JSON.parse(bytes),a=JSON.parse(readFileSync(source));assert.deepEqual(l,a,file+' explicit new authoring source');
 const prior=JSON.parse(execFileSync('git',['-c','core.longpaths=true','show','9a01de88:'+file],{maxBuffer:4e6}));
 assert.equal(l.id,prior.id);assert.equal(l.courseId,prior.courseId);assert.equal(l.moduleId,prior.moduleId);assert.equal(l.locale,locale);
 assert.deepEqual(l.selfcheck.map(q=>q.id),prior.selfcheck.map(q=>q.id));assert.equal(l.contentRevision,CLARITY_COURSES[id].contentRevision);assert.notEqual(l.contentRevision,prior.contentRevision||prior.proposalRevision);
 assert.equal(l.referenceEdition,true);assert.equal(l.authored,true);assert.ok(l.sections.length>=5);assert.ok(l.reading.length>=2);
 for(const q of l.selfcheck){assert.ok(l.sections.some(s=>s.id===q.recall));if(q.kind!=='free'){assert.equal(q.options.length,3);assert.equal(new Set(q.options).size,3);assert.ok(q.correct>=0&&q.correct<3)}}
 for(const key of ['goal','start','where','knowledge','change','inputs','result','checks','errors','recovery'])assert.ok(l.practice.passport[key]);
 assert.ok(l.practice.referenceSolution);if(l.courseId==='cpp'){assert.notEqual(l.practice.files[0].content,l.practice.referenceSolution.source);assert.ok(l.practice.runAssessment.lines.length)}
 else{assert.equal(l.assessment.contentRevision,l.contentRevision);assert.deepEqual(l.assessment.quiz.map(q=>q.correct),l.selfcheck.filter(q=>q.kind!=='free').map(q=>q.correct));}
 validated.set(cacheKey,{bytes,source:readFileSync(source),lesson:l});return l;
}
export function assertPreservedOrReference(file,now,before,message=file){const r=referencePathId(file);if(r){assertReferenceEdition(r.id,r.locale);assert.deepEqual(Buffer.from(now),readFileSync(file));return;}assert.deepEqual(now,before,message);}
export function withoutReferencePaths(files){return files.filter(file=>{const r=referencePathId(file);if(!r)return true;assertReferenceEdition(r.id,r.locale);return false;});}
export function assertHistoricalFiles(base,files){
 const raw=execFileSync('git',['-c','core.longpaths=true','cat-file','--batch'],{input:files.map(f=>base+':'+f+'\n').join(''),maxBuffer:64e6});let offset=0;
 for(const f of files){const end=raw.indexOf(10,offset),header=raw.subarray(offset,end).toString().split(' ');assert.equal(header[1],'blob',f);const size=Number(header[2]),blob=raw.subarray(end+1,end+1+size);assertPreservedOrReference(f,readFileSync(f),blob,f);offset=end+size+2;}
}
