import fs from 'node:fs';
const js=fs.readFileSync(new URL('../core/memory-lab.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../core/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/app.css',import.meta.url),'utf8');
function assert(v,m){if(!v)throw new Error(m)}
for(const token of ['memoryLabMarkup','bindMemoryLab','memoryPointerPlus','memoryRefMinus','symbolic'])assert(js.includes(token),`memory-lab missing ${token}`);
assert(app.includes("from './memory-lab.js'"),'app must import memory-lab');
assert(app.includes('memoryLabMarkup(b.interactiveMemory'),'benchmark view must render memory model');
assert(app.includes('bindMemoryLab(l?.benchmark?.interactiveMemory'),'lesson bind must activate memory model');
for(const cls of ['.memory-lab','.memory-stage','.memory-node','.memory-link','.memory-freeplay'])assert(css.includes(cls),`CSS missing ${cls}`);
console.log('MEMORY_LAB_PASS');
