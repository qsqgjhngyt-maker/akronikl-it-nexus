// Аудит реального поиска/контекста, БЕЗ весов и генерации. Sentinel не является ответом.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createKnowledgeIndex} from '../../akronikl/core/index.js';
import {makeCase,blankReview} from './cases.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=path.resolve(process.env.NEXUS_QA_OUT||path.join(root,'evidence-p4q-preflight'));
await mkdir(out,{recursive:true});
const corpus=JSON.parse(await readFile(path.join(root,'tests/fixtures/akronikl-tutor-quality-v1.json'),'utf8'));
assert.equal(corpus.cases.length,32);assert.equal(new Set(corpus.cases.map(c=>c.id)).size,32);
const indexes={};for(const locale of ['ru','en']) indexes[locale]=createKnowledgeIndex(JSON.parse(await readFile(path.join(root,`akronikl/knowledge/core-index.${locale}.json`),'utf8')));
const reports=[];
for(const item of corpus.cases){
  if(item.source){
    const bytes=await readFile(path.join(root,item.source.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),item.source.sha256,item.id+' source digest');
  }
  let packet=null;
  const provider={kind:'local',transport:'in-process',modelId:'qa-intercept-no-model',
    async generate(request){packet={messages:request.messages,allowedCitations:request.allowedCitations};throw Error('QA_CAPTURE_ONLY_NO_GENERATION');},dispose(){}};
  const f=makeCase(item,indexes,provider);
  const result=await f.session.ask(f.request);
  const requestData=packet?JSON.parse(packet.messages.at(-1).content):null;
  const evidence=requestData?.evidence??[];
  const expectedRecords=item.source?indexes[item.locale].getLesson(item.source.lessonId,item.locale):[];
  const evidenceFromExpectedLesson=evidence.filter(s=>s.label.startsWith('S')).some(s=>expectedRecords.some(r=>r.text.startsWith(s.text)||r.text.includes(s.text)));
  const audit={id:item.id,locale:item.locale,kind:item.kind,sourceVerified:!!item.source,
    uiRoute:f.resolved,requestedIntent:f.request.intent,promptPrepared:!!packet,
    outcome:packet?'CAPTURED_NO_INFERENCE':result.status,nonModelText:packet?null:result.text,
    promptChars:packet?JSON.stringify(packet.messages).length:0,evidence,
    expectedLesson:item.source?.lessonId??null,evidenceFromExpectedLesson:item.source?evidenceFromExpectedLesson:null,
    consentReads:f.reads,prompt:packet?.messages??null,realModel:false,generatedAnswer:null,review:blankReview()};
  reports.push(audit);f.session.dispose();
}
const report={schemaVersion:1,source:'1cfdfd527da8fd061815a74ae3b88db1b40e4afe',scope:'prompt-and-source-audit-only',
  modelCalls:0,qualityAcceptance:false,caseCount:reports.length,promptsPrepared:reports.filter(c=>c.promptPrepared).length,
  expectedLessonMissing:reports.filter(c=>c.expectedLesson&&!c.evidenceFromExpectedLesson).map(c=>c.id),cases:reports};
await writeFile(path.join(out,'PREFLIGHT.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({caseCount:report.caseCount,promptsPrepared:report.promptsPrepared,expectedLessonMissing:report.expectedLessonMissing,modelCalls:0,qualityAcceptance:false},null,2));
