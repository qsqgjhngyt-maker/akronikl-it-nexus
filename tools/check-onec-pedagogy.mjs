import fs from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';
export const pedagogyLedgerPath='docs/ru/03-content/onec/pedagogy-v2-20261102/LESSON_REWORK_LEDGER.json';
export const pedagogyDigest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function loadPedagogyLedger(root=fileURLToPath(new URL('../',import.meta.url))){return JSON.parse(fs.readFileSync(path.join(root,pedagogyLedgerPath),'utf8'));}
export function approvedPedagogyTopic(topic,ledger){
 const row=ledger?.rows?.find(r=>r.topicId===topic?.topicId);
 return!!row&&row.decision==='IMPLEMENTED'&&row.currentRevision==='2.0.0-pedagogy.1'&&topic.contentRevision===row.currentRevision&&topic.progressPolicy==='current-revision-required'&&['ru','en'].every(locale=>topic.title[locale]===row.currentTitle?.[locale]&&`courses/${row.courseId}/${topic.content[locale]}`===row.locales[locale].file);
}
export function validatePedagogyLessons(courses,lessons,ledger){
 const errors=[],rows=ledger?.rows;if(ledger?.sourceHead!=='a104f89783edd871c4608e8b75a4ebc59cd3c110'||!Array.isArray(rows)||rows.length!==84||new Set(rows.map(r=>r.topicId)).size!==84)return['PEDAGOGY_LEDGER_SCOPE'];
 for(const c of courses)for(const m of c.modules)for(const t of m.topics){const row=rows.find(r=>r.topicId===t.topicId);if(!row||row.courseId!==c.courseId||row.moduleId!==m.moduleId){errors.push('PEDAGOGY_ID '+t.topicId);continue;}
  const rewritten=row.decision==='IMPLEMENTED';if(rewritten&&!approvedPedagogyTopic(t,ledger))errors.push('PEDAGOGY_TOPIC_REVISION '+t.topicId);
  for(const locale of['ru','en']){const l=lessons.find(l=>l.topicId===t.topicId&&l.locale===locale);if(!l){errors.push('PEDAGOGY_LOCALE '+t.topicId);continue;}
   if(rewritten){const expected=row.currentLocalizations?.[locale];if(!expected||l.contentRevision!==row.currentRevision||pedagogyDigest(l)!==expected.semanticSha256)errors.push('PEDAGOGY_CONTENT_PIN '+t.topicId+' '+locale);
    if(l.experience?.route?.kind!=='installed-1c'||l.experience.route.steps.length<4||l.experience.route.steps.some(s=>!['id','title','where','before','action','why','expected','troubleshooting'].every(k=>typeof s[k]==='string'&&s[k].trim())))errors.push('PEDAGOGY_ROUTE '+t.topicId+' '+locale);
    if(!Array.isArray(l.mistakes)||l.mistakes.length<2||l.mistakes.some(x=>!Array.isArray(x)||x.length!==2||x.some(v=>typeof v!=='string'||v.trim().length<12)))errors.push('PEDAGOGY_DIAGNOSTIC_PAIRS '+t.topicId+' '+locale);
    const d=l.experience?.diagram;if(!d||!['ru','en'].every(k=>typeof d.title?.[k]==='string'&&d.title[k].trim())||!Array.isArray(d.nodes)||d.nodes.length<2||d.nodes.some(n=>!['ru','en'].every(k=>typeof n.label?.[k]==='string'&&n.label[k].trim()&&typeof n.detail?.[k]==='string'&&n.detail[k].trim())))errors.push('PEDAGOGY_CURRENT_DIAGRAM '+t.topicId+' '+locale);
    if(l.codeFile&&!(typeof l.experience?.sourceLabel==='string'&&l.experience.sourceLabel.trim()))errors.push('PEDAGOGY_SOURCE_LOCATION '+t.topicId+' '+locale);
   }else if(l.contentRevision!==row.baselineRevision||pedagogyDigest(l)!==row.locales[locale].semanticSha256)errors.push('UNREVIEWED_PEDAGOGY_REVISION '+t.topicId+' '+locale);
  }
 }
 return errors;
}
