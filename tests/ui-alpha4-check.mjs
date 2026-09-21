import fs from 'node:fs';
const app=fs.readFileSync(new URL('../core/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/app.css',import.meta.url),'utf8');
const storage=fs.readFileSync(new URL('../core/storage.js',import.meta.url),'utf8');
const particles=fs.readFileSync(new URL('../effects/particles.js',import.meta.url),'utf8');
const checks=[
  ['global menu desktop toggle',app.includes('setSidebarCollapsed(!prefs.sidebarCollapsed)')],
  ['mobile menu drawer toggle',app.includes("sidebar?.classList.toggle('open',open)")],
  ['menu aria controls',app.includes('aria-controls="sidebar"')],
  ['right rail preference',storage.includes('rightRailCollapsed:false')],
  ['right rail toggle',app.includes("#rightRailToggle")&&app.includes('setRightRailCollapsed')],
  ['rail collapsed css',css.includes('.lesson-grid.rail-collapsed')],
  ['focus reading keeps rail hidden',css.includes('.focus-reading .lesson-side{display:none}')],
  ['particle depth',particles.includes('const z=.12+')&&particles.includes('pointermove')],
  ['tablet navigation expanded state',css.includes('.app-shell:not(.sidebar-collapsed){grid-template-columns:220px 1fr}')],
  ['visual polish marker',css.includes('v0.1.2-alpha.4 · Visual & Reading Polish')]
];
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)process.exitCode=1}
