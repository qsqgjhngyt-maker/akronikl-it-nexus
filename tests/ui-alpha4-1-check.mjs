import fs from 'node:fs';
const app=fs.readFileSync(new URL('../core/app.js',import.meta.url),'utf8');
const select=fs.readFileSync(new URL('../core/glass-select.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/app.css',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
const checks=[
  ['no native select markup',!app.includes('<select')&&!app.includes('<option')],
  ['custom selector renderer',app.includes('function glassSelect(')&&app.includes('data-nexus-select')],
  ['custom selector binding',app.includes('bindGlassSelects()')],
  ['language options remain registry driven',app.includes('registry.supported.filter(x=>x.enabled)')],
  ['FX options preserved',app.includes("['ultra','Ultra']")&&app.includes("['off','Off']")],
  ['accessible listbox',app.includes('role=\"listbox\"')&&app.includes('aria-haspopup=\"listbox\"')],
  ['keyboard support',select.includes("ev.key==='ArrowDown'")&&select.includes("ev.key===ESCAPE")],
  ['outside click closes',select.includes("document.addEventListener('pointerdown'")],
  ['glass dropdown styles',css.includes('Nexus Glass Dropdown hotfix')&&css.includes('.nexus-select-menu')],
  ['service worker caches selector module',sw.includes('./core/glass-select.js')&&/v0\.1\.(?:2-alpha\.4\.1|3-alpha\.1|4-alpha\.(?:1|2)|5-alpha\.(?:1|2)|6-alpha\.1)/.test(sw)]
];
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)process.exitCode=1}
