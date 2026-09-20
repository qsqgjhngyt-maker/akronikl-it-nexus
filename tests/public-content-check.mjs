import fs from 'node:fs';
const ru=JSON.parse(fs.readFileSync(new URL('../courses/cpp/data/lessons.ru.json', import.meta.url),'utf8'));
function assert(v,m){if(!v)throw new Error(m)}
let found=[];
for(const l of ru.lessons){
  for(const [k,v] of Object.entries(l)){
    if(['pdfPages','pdfNotes','provenanceRef'].includes(k)) continue;
    if(/PDF/i.test(JSON.stringify(v))) found.push(`${l.id}.${k}`);
  }
}
assert(found.length===0,`Learner-facing C++ content references PDF: ${found.join(', ')}`);
console.log('PUBLIC_CONTENT_PASS',{lessons:ru.lessons.length,pdfReferences:0});
