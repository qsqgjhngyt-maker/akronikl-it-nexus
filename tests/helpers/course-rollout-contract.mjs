// Поручение владельца 22.11.2026: все уроки целиком; ровно 141 новая тема.
// Исторические десять эталонов и контракты хранения не входят в миграцию.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CLARITY_COURSES} from '../../core/clarity-course-registry.mjs';
const root='docs/ru/03-content/reference-courses-20261112/rollout-20261122/';
export const rollout=JSON.parse(readFileSync(root+'CONTENT_MANIFEST.json'));
assert.equal(rollout.baseline,'66ffc31561a821f97644ae8721fe8c57bffa1659');
export const ROLLOUT_IDS=Object.freeze([...new Set(rollout.rows.map(r=>r.id))]);
const rows=new Map(rollout.rows.map(r=>[r.id+'.'+r.locale,r]));
let previous;const previousSources=new Map(),validated=new Map();
function prior(){
 if(previous)return previous;
 previous=new Map();const requests=rollout.rows.map(r=>({...r,key:r.id+'.'+r.locale}));
 for(const row of rollout.rows.filter(r=>r.course==='cpp')){const l=JSON.parse(readFileSync(row.source));requests.push({path:l.sourcePath.replaceAll('\\','/'),goldSource:true});}
 const raw=execFileSync('git',['-c','core.longpaths=true','cat-file','--batch'],{input:requests.map(r=>rollout.baseline+':'+r.path+'\n').join(''),maxBuffer:128e6});let offset=0;
 for(const row of requests){const end=raw.indexOf(10,offset),[oid,type,size]=raw.subarray(offset,end).toString().split(' ');assert.equal(type,'blob',row.path);const parsed=JSON.parse(raw.subarray(end+1,end+1+Number(size)));if(row.goldSource)previousSources.set(row.path,parsed);else previous.set(row.key,parsed);offset=end+Number(size)+2;}
 return previous;
}
export function rolloutPathId(file){
 const gold=String(file).replaceAll('\\','/').match(/^courses\/cpp\/gold\/[^/]+\/([^/]+)\.(ru|en)\.json$/);
 if(gold&&rows.has('cpp.'+gold[1]+'.'+gold[2]))return{id:'cpp.'+gold[1],locale:gold[2],rollout:true};
 const found=String(file).replaceAll('\\','/').match(/^courses\/(?:clarity\/(?:lessons|authoring)|cpp-clarity-r3\/lessons|reference\/authoring)\/(.+)\.(ru|en)\.json$/);
 return found&&rows.has(found[1]+'.'+found[2])?{id:found[1],locale:found[2],rollout:true}:null;
}
export function assertRolloutEdition(id,locale){
 const row=rows.get(id+'.'+locale);assert.ok(row,'Только явный список миграции');
 const bytes=readFileSync(row.path),source=readFileSync(row.source),l=JSON.parse(bytes);
 const dependencies=[bytes,source,...(l.upstreamAuthoringPath?[readFileSync(l.upstreamAuthoringPath)]:[]),...(l.courseId==='cpp'?[readFileSync(l.sourcePath.replaceAll('\\','/'))]:[])];
 const cache=validated.get(id+'.'+locale);if(cache&&cache.length===dependencies.length&&cache.every((b,i)=>b.equals(dependencies[i])))return l;
 const old=prior().get(id+'.'+locale);
 assert.deepEqual(bytes,source,'Единственный редактируемый источник: '+id);
 for(const key of ['id','courseId','moduleId','locale'])assert.equal(l[key],old[key],id+' '+key);
 assert.deepEqual(l.selfcheck.map(q=>[q.id,q.kind,q.options?.length]),old.selfcheck.map(q=>[q.id,q.kind,q.options?.length]),id+' сохранены ID и формы вопросов');
 const gradedQuestions=lesson=>lesson.selfcheck.filter(q=>q.kind!=='free').map(q=>[q.id,q.kind,q.prompt,q.options,q.correct]);
 assert.deepEqual(gradedQuestions(l),gradedQuestions(old),id+' прежние оцениваемые вопросы и ответы');
 const assessmentRevision=CLARITY_COURSES[id].contentRevision||(CLARITY_COURSES[id].pilot?'r3-stage-a-8bccaf5':'clarity-courses-v1');
 assert.equal(l.contentRevision,row.revision);assert.equal(l.contentRevision,assessmentRevision);assert.equal(l.editorialRevision,rollout.revision);
 assert.equal(l.contentRevision,row.priorRevision,id+' проверка прежнего задания не обнуляется');
 assert.equal(l.lessonFormat,'guided-v2');assert.equal(l.authored,true);
 assert.deepEqual(l.practice.files,old.practice.files,id+' отдельная прежняя заготовка');
 assert.deepEqual(l.practice.metadata,old.practice.metadata,id+' прежний runtime');
 assert.equal(l.practice.task,old.practice.task,id+' принятая самостоятельная задача');
 assert.deepEqual(l.practice.cases.map(c=>[c.input,c.output,c.files,c.outputFiles]),old.practice.cases.map(c=>[c.input,c.output,c.files,c.outputFiles]),id+' прежний проверяемый результат');
 assert.deepEqual(l.sections.map(s=>s.id),old.sections.map(s=>s.id),id+' якоря разделов');
 assert.ok(l.sections.length>=5);assert.ok(l.reading.length);
 const anchors=new Set(l.sections.map(s=>s.id));assert.ok(anchors.has(l.practice.returnAnchor));
 for(const q of l.selfcheck){assert.ok(anchors.has(q.recall),id+' '+q.id);if(q.kind!=='free'){assert.equal(new Set(q.options).size,q.options.length);assert.ok(q.correct>=0&&q.correct<q.options.length);}}
 for(const key of ['goal','start','where','knowledge','change','inputs','result','checks','errors','recovery'])assert.ok(typeof l.practice.passport[key]==='string'&&l.practice.passport[key].trim(),id+' '+key);
 assert.ok(l.practice.referenceSolution?.source||l.courseId!=='cpp'&&l.practice.referenceSolution?.paragraphs?.length,id+' доступное полное решение');assert.ok(l.practice.cases.length);
 assert.ok(l.practice.criteria.length>=3);assert.ok(l.practice.steps?.every(s=>s.action&&s.why&&s.expected));
 if(l.courseId==='cpp')assert.notEqual(l.practice.referenceSolution.source,l.practice.files[0].content);
 else{assert.equal(l.practice.runAssessment,undefined);if(l.assessment)assert.equal(l.assessment.contentRevision,l.contentRevision);}
 if(l.upstreamAuthoringPath){const a=JSON.parse(readFileSync(l.upstreamAuthoringPath));assert.equal(a.revision,l.contentRevision);for(const key of ['sections','selfcheck','practice','reading'])assert.deepEqual(a[key],l[key]);}
 if(l.courseId==='cpp'){const p=l.sourcePath.replaceAll('\\','/'),g=JSON.parse(readFileSync(p));for(const key of ['sections','selfcheck','practice','reading'])assert.deepEqual(g.teachingEdition[key],l[key]);const {teachingEdition,...body}=g,{teachingEdition:oldEdition,...oldBody}=previousSources.get(p);assert.deepEqual(body,oldBody,id+' прежний Gold вне учебной редакции сохранён');}
 validated.set(id+'.'+locale,dependencies);return l;
}
