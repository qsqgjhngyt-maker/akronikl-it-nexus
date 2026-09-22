import fs from 'node:fs';
const app=fs.readFileSync(new URL('../core/app.js', import.meta.url),'utf8');
const studio=fs.readFileSync(new URL('../sandbox/code-studio.js', import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/app.css', import.meta.url),'utf8');
function assert(v,m){if(!v)throw new Error(m)}
for(const token of ['id="runCode"','id="testRuntime"','id="resetCode"','id="clearOutput"','id="stdin"','Nexus Runtime']) assert(app.includes(token),`Sandbox missing ${token}`);
assert(studio.includes('id="editor"'),'Code Studio missing editor input');
assert(studio.includes('id="editorLines"'),'Code Studio missing line-number gutter');
assert(!app.includes('pdfPages'),'Learner UI still renders pdfPages');
assert(!app.includes('pdfNotes'),'Learner UI still renders pdfNotes');
assert(!app.includes('Прочитать спокойно'),'Old theory title is still present');
assert(css.includes('.sandbox-block'),'Sandbox styles missing');
assert(css.includes('font-size:16px'),'Mobile editor anti-zoom rule missing');
assert(css.includes('.code-studio'),'Code Studio styles missing');
console.log('SANDBOX_STRUCTURE_PASS');
