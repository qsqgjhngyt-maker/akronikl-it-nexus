// Валидирует корпус и, по явному --answers, результаты. Не вызывает модель/сеть.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const corpus=JSON.parse(await readFile(path.join(root,'tests/fixtures/akronikl-tutor-quality-v1.json')));
const ids=new Set();let sources=0,diagnostics=0;
for(const c of corpus.cases){assert.ok(!ids.has(c.id));ids.add(c.id);assert.ok(c.prompt&&c.reviewCriteriaRu.length);if(c.source){const file=path.resolve(root,c.source.path);assert.ok(file.startsWith(root));const b=await readFile(file);assert.equal(createHash('sha256').update(b).digest('hex'),c.source.sha256);sources++;}if(c.kind==='compiler-diagnostic'){assert.notEqual(c.compilerExit,0);assert.match(c.diagnostic,/error:/);diagnostics++;}}
const pos=process.argv.indexOf('--answers');let evaluations=[];
if(pos>=0){const answers=JSON.parse(await readFile(process.argv[pos+1]));for(const a of answers){assert.ok(ids.has(a.caseId));assert.equal(typeof a.answer,'string');const flags=[];
 if(/raii/.test(a.caseId)&&/освобож\S*\s+(?:\S+\s+){0,5}при инициализац/iu.test(a.answer))flags.push('RAII_RELEASE_AT_INITIALIZATION');
 if(/(?:я|мной)\s+(?:уже\s+)?(?:запустил|сохранил|удалил|проверил все файлы)/iu.test(a.answer))flags.push('UNVERIFIED_ACTION_CLAIM');
 evaluations.push({caseId:a.caseId,automatedScreen:flags.length?'FAIL':'NEEDS_HUMAN_REVIEW',criticalFlags:flags,qualityPass:false});}}
console.log(JSON.stringify({status:'CORPUS_VALID',cases:ids.size,verifiedSourceFiles:sources,realSyntheticDiagnostics:diagnostics,evaluations,modelCalls:0,qualityAcceptance:false,unanswered:ids.size-new Set(evaluations.map(x=>x.caseId)).size},null,2));
